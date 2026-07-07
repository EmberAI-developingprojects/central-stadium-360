# ============================================================
#  Stadium Kiosk release deploy / rollback - run on the KIOSK BOX
#  as Administrator.
#
#  Lays out a versioned release and points a stable "current"
#  junction at it, so updates are atomic and rollback is instant:
#
#    C:\Kiosk\
#      ops\                 <- these scripts (stable path, copied once)
#      releases\<version>\
#        web\               <- Flutter web build
#        bridge\            <- kiosk-bridge deploy (from kiosk-bridge.zip)
#      current  --junction--> releases\<version>
#      logs\                <- ui\ and watchdog\
#
#  The scheduled tasks always reference C:\Kiosk\current\... , so a
#  new release or a rollback is just "repoint the junction + restart
#  the tasks". The bridge .env is carried forward from the previous
#  release automatically.
#
#  DEPLOY a new release:
#    .\deploy_release.ps1 -Version 2026-07-07 `
#        -Web  D:\handoff\web `
#        -BridgeZip D:\handoff\kiosk-bridge.zip `
#        -OpsSource D:\handoff\ops -Install
#
#  UPDATE later (tasks already installed): drop -Install.
#  ROLLBACK to a prior release:
#    .\deploy_release.ps1 -Rollback 2026-07-01
# ============================================================

param(
  [string]$KioskRoot    = "C:\Kiosk",
  [string]$Version,
  [string]$Web,
  [string]$BridgeZip,
  [string]$OpsSource,
  [int]   $Port         = 8080,
  [int]   $KeepReleases = 5,
  [switch]$Install,
  [string]$Rollback
)

$ErrorActionPreference = 'Stop'

$releasesDir = Join-Path $KioskRoot "releases"
$current     = Join-Path $KioskRoot "current"
$opsDir      = Join-Path $KioskRoot "ops"
$BridgeTask  = "StadiumKioskBridge"
$UiTask      = "StadiumKiosk"
$WatchTask   = "StadiumKioskWatchdog"

function Point-Current {
  param([string]$Target)
  if (-not (Test-Path $Target)) { throw "Release target '$Target' does not exist." }
  # Remove ONLY the junction (rmdir on a junction never touches the target).
  if (Test-Path $current) { & cmd /c rmdir "$current" | Out-Null }
  New-Item -ItemType Junction -Path $current -Target $Target | Out-Null
  Write-Host "current -> $Target" -ForegroundColor Green
}

function Restart-KioskTasks {
  foreach ($t in @($BridgeTask, $UiTask, $WatchTask)) {
    if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) {
      try { Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue } catch { }
      try { Start-ScheduledTask -TaskName $t -ErrorAction Stop; Write-Host "restarted $t" }
      catch { Write-Warning "could not start $t : $_" }
    } else {
      Write-Warning "task '$t' not registered (run with -Install, or the relevant install_*.ps1)."
    }
  }
}

# --- ROLLBACK ---------------------------------------------------------------
if ($Rollback) {
  $target = Join-Path $releasesDir $Rollback
  Write-Host "== Rolling back to '$Rollback' ==" -ForegroundColor Yellow
  Point-Current $target
  Restart-KioskTasks
  Write-Host "Rollback done. Verify: curl http://127.0.0.1:7070/health" -ForegroundColor Green
  return
}

# --- DEPLOY -----------------------------------------------------------------
if (-not $Version)   { Write-Error "-Version is required to deploy (e.g. -Version 2026-07-07)."; exit 1 }
if (-not $Web)       { Write-Error "-Web (path to the Flutter web build folder) is required."; exit 1 }
if (-not $BridgeZip) { Write-Error "-BridgeZip (path to kiosk-bridge.zip) is required."; exit 1 }
if (-not (Test-Path (Join-Path $Web 'index.html'))) { Write-Error "'$Web' is not a web build (no index.html)."; exit 1 }
if (-not (Test-Path $BridgeZip)) { Write-Error "Bridge zip not found: $BridgeZip"; exit 1 }

$relDir    = Join-Path $releasesDir $Version
$relWeb    = Join-Path $relDir "web"
$relBridge = Join-Path $relDir "bridge"

Write-Host "== Staging release '$Version' at $relDir ==" -ForegroundColor Cyan
if (Test-Path $relDir) { Remove-Item $relDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $relWeb, $relBridge | Out-Null

Write-Host "Copying web build..."
Copy-Item (Join-Path $Web '*') $relWeb -Recurse -Force

Write-Host "Expanding bridge zip..."
Expand-Archive -Path $BridgeZip -DestinationPath $relBridge -Force

# --- bridge .env: carry forward, else seed from a template ------------------
$newEnv = Join-Path $relBridge ".env"
$prevEnv = Join-Path $current  "bridge\.env"
if (Test-Path $prevEnv) {
  Copy-Item $prevEnv $newEnv -Force
  Write-Host "Carried .env forward from the previous release." -ForegroundColor Green
} elseif (-not (Test-Path $newEnv)) {
  $seed = Join-Path $relBridge ".env.kiosk.example"
  if (-not (Test-Path $seed)) { $seed = Join-Path $relBridge ".env.example" }
  if (Test-Path $seed) { Copy-Item $seed $newEnv -Force }
  Write-Warning "No previous .env found. Seeded '$newEnv' from a template - EDIT IT before go-live (GOLOMT_TERMINAL_ID, PRINTER_NAME, RESEND_API_KEY)."
}

# --- ops scripts (stable path) ---------------------------------------------
if ($OpsSource) {
  if (-not (Test-Path $OpsSource)) { Write-Error "OpsSource '$OpsSource' not found."; exit 1 }
  New-Item -ItemType Directory -Force -Path $opsDir | Out-Null
  Copy-Item (Join-Path $OpsSource '*') $opsDir -Recurse -Force
  Write-Host "Ops scripts updated at $opsDir" -ForegroundColor Green
}

# --- point current at the new release --------------------------------------
Point-Current $relDir
New-Item -ItemType Directory -Force -Path (Join-Path $KioskRoot 'logs\ui'), (Join-Path $KioskRoot 'logs\watchdog') | Out-Null

# --- register tasks (first-time) or just restart them ----------------------
if ($Install) {
  Write-Host "== Registering scheduled tasks ==" -ForegroundColor Cyan
  & (Join-Path $opsDir 'install_autostart.ps1')  -OpsDir $opsDir -WebRoot (Join-Path $current 'web') -Port $Port
  & (Join-Path $KioskRoot 'current\bridge\scripts\install_bridge_service.ps1') -BridgeDir (Join-Path $current 'bridge')
  & (Join-Path $opsDir 'install_watchdog.ps1')   -OpsDir $opsDir
}
Restart-KioskTasks

# --- prune old releases -----------------------------------------------------
$all = Get-ChildItem $releasesDir -Directory | Sort-Object Name -Descending
if ($all.Count -gt $KeepReleases) {
  $activeTarget = (Get-Item $current).Target | Select-Object -First 1
  $all | Select-Object -Skip $KeepReleases | ForEach-Object {
    if ($_.FullName -ne $activeTarget) {
      Write-Host "Pruning old release: $($_.Name)" -ForegroundColor DarkGray
      Remove-Item $_.FullName -Recurse -Force
    }
  }
}

Write-Host ""
Write-Host "Release '$Version' is live." -ForegroundColor Green
Write-Host "Verify:  curl http://127.0.0.1:7070/health   and watch the kiosk screen."
Write-Host "Rollback if needed:  .\deploy_release.ps1 -Rollback <previous-version>"
