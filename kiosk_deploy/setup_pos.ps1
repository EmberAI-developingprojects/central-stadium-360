# ============================================================
#  Prepare the kiosk box for real Golomt IPPOS card payments.
#
#  Run on the Windows kiosk box, ELEVATED (Run as Administrator):
#      powershell -ExecutionPolicy Bypass -File setup_pos.ps1
#
#  What it does:
#    1) Verifies the vendor bundle is present at "IPPOS хэрэгцээт бүгд (1)\"
#       and extracts the required .rar archives if you haven't already.
#    2) Installs the Verifone Unified IPPOS driver (silent).
#    3) Installs GLMTPOS.msi (Golomt PobRestService) — silent, unless it's
#       already installed.
#    4) Runs the initial `installutil.exe` command that registers
#       PobRestService.exe as a Windows service (idempotent).
#    5) Starts the "PobRestService" service and verifies port 8500 is
#       listening.
#    6) Pings http://localhost:8500/requestToPos/ to confirm reachability.
#    7) Reminds the operator to edit `backend\.env`:
#         POS_DRIVER=golomt
#         POS_TERMINAL_ID=<from Golomt>
#         POS_MERCHANT_ID=<from Golomt>
#         POS_DEBUG=on             (for first field test)
#
#  What it does NOT do:
#    - Physical setup: plug the Verifone terminal into COM10 @ 115200 baud
#      per DualConnector.xml before running.
#    - Talk to Golomt: the terminal ID + merchant ID must be provisioned
#      through Golomt's integration desk.
# ============================================================

[CmdletBinding()]
param(
  [string]$Root = $PSScriptRoot,
  [string]$VendorFolder = "IPPOS хэрэгцээт бүгд (1)"
)

$ErrorActionPreference = 'Stop'
function Info($m)  { Write-Host "  $m" -ForegroundColor Cyan }
function Ok($m)    { Write-Host "  ✓ $m" -ForegroundColor Green }
function Warn($m)  { Write-Host "  ! $m" -ForegroundColor Yellow }
function Fail($m)  { Write-Host "  ✗ $m" -ForegroundColor Red; throw $m }

# --- 0. Admin check --------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Fail "Run this script as Administrator (Start > 'powershell' > right-click Run as administrator)."
}

$vendor = Join-Path $Root $VendorFolder
if (-not (Test-Path $vendor)) {
  Fail "Vendor bundle not found at '$vendor'. Copy 'IPPOS хэрэгцээт бүгд (1)\' from the Golomt handoff onto this box first."
}
Write-Host "`n=== Central Stadium 360 · Kiosk POS setup ===" -ForegroundColor Magenta
Write-Host "Vendor bundle: $vendor`n" -ForegroundColor DarkGray

# --- 1. Extract .rar archives if the unpacked folders are missing ----------
$rarTargets = @(
  @{ Rar = "WEB SERVICE GLMTPOS (1).rar";      Dir = "WEB SERVICE GLMTPOS (1)" },
  @{ Rar = "Verinfone Unified IPPOS Driver.rar"; Dir = "Verinfone Unified IPPOS Driver" },
  @{ Rar = "Golomt IPPOS dll files (1).rar";   Dir = "Golomt IPPOS dll files (1)" },
  @{ Rar = "Debug.rar";                         Dir = "Debug" }
)
foreach ($t in $rarTargets) {
  $dir = Join-Path $vendor $t.Dir
  $rar = Join-Path $vendor $t.Rar
  if (Test-Path $dir) { Ok "$($t.Dir) already extracted"; continue }
  if (-not (Test-Path $rar)) { Warn "$($t.Rar) not found; skipping"; continue }
  Info "Extracting $($t.Rar)..."
  # 7z is the most reliable extractor for .rar on Windows.
  $sevenz = @(
    "$env:ProgramFiles\7-Zip\7z.exe",
    "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $sevenz) {
    Warn "7-Zip not found. Install from https://www.7-zip.org/ and re-run, OR extract these .rar files manually into '$vendor'."
    continue
  }
  & $sevenz x -o"$vendor" "$rar" -y | Out-Null
  if (-not (Test-Path $dir)) { Fail "Extraction of $($t.Rar) did not produce '$($t.Dir)'." }
  Ok "Extracted $($t.Dir)"
}

# --- 2. Verifone Unified IPPOS Driver -------------------------------------
$verifoneRoot = Join-Path $vendor "Verinfone Unified IPPOS Driver\VerifoneUnifiedDriverInstaller-5.0.5.2-B3"
$arch = if ([Environment]::Is64BitOperatingSystem) { "64" } else { "32" }
$verifoneDir = Join-Path $verifoneRoot $arch
if (Test-Path $verifoneDir) {
  $installer = Get-ChildItem -LiteralPath $verifoneDir -Filter *.exe -File `
    | Select-Object -First 1
  if ($installer) {
    Info "Installing Verifone driver ($arch-bit): $($installer.Name)"
    Start-Process -FilePath $installer.FullName -ArgumentList '/S' -Wait
    Ok "Verifone driver installer finished (silent /S)"
  } else {
    Warn "No installer .exe under $verifoneDir — you may need to run it by hand."
  }
} else {
  Warn "Verifone driver folder not found. Terminal will not enumerate on COM10 until this driver is installed."
}

# --- 3. GLMTPOS.msi (PobRestService) --------------------------------------
$msi = Join-Path $vendor "WEB SERVICE GLMTPOS (1)\GLMTPOS.msi"
if (-not (Test-Path $msi)) { Fail "GLMTPOS.msi not found at '$msi'." }
$installedDir = "$env:ProgramFiles (x86)\Golomt\Golomt POS API\PobRestService"
if (Test-Path (Join-Path $installedDir "PobRestService.exe")) {
  Ok "GLMTPOS already installed at $installedDir"
} else {
  Info "Installing GLMTPOS.msi (silent)..."
  Start-Process -FilePath 'msiexec.exe' `
    -ArgumentList '/i', "`"$msi`"", '/qn', '/norestart' -Wait
  if (-not (Test-Path (Join-Path $installedDir "PobRestService.exe"))) {
    Fail "GLMTPOS install failed — PobRestService.exe not found at $installedDir."
  }
  Ok "GLMTPOS installed"
}

# --- 4. installutil.exe — register PobRestService as a Windows service ----
$installutil = "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\installutil.exe"
if (-not (Test-Path $installutil)) {
  Fail ".NET Framework 4 not found at $installutil. Install .NET Framework 4.5.2+."
}
$svc = Get-Service -Name 'PobRestService' -ErrorAction SilentlyContinue
if ($svc) {
  Ok "PobRestService already registered"
} else {
  Info "Registering PobRestService with installutil.exe..."
  Start-Process -FilePath $installutil `
    -ArgumentList "`"$installedDir\PobRestService.exe`"" -Wait -NoNewWindow
  $svc = Get-Service -Name 'PobRestService' -ErrorAction SilentlyContinue
  if (-not $svc) { Fail "installutil registration did not produce a 'PobRestService' service." }
  Ok "PobRestService registered"
}

# --- 5. Start the service and confirm port 8500 is listening --------------
if ($svc.Status -ne 'Running') {
  Info "Starting PobRestService..."
  Start-Service -Name 'PobRestService'
  Start-Sleep -Seconds 2
  $svc = Get-Service -Name 'PobRestService'
}
if ($svc.Status -ne 'Running') { Fail "Service failed to start. Check Event Viewer > Application log for 'PobRestService'." }
Ok "PobRestService is Running"

# Configure it to auto-start with Windows (matches the kiosk unattended model).
Set-Service -Name 'PobRestService' -StartupType Automatic
Ok "Startup type set to Automatic"

# TCP listener check on 8500 (localhost only).
$listen = Get-NetTCPConnection -State Listen -LocalPort 8500 -ErrorAction SilentlyContinue
if ($listen) {
  Ok "Port 8500 is listening"
} else {
  Warn "Port 8500 is NOT listening yet. Wait ~5 s after service start and retry, or check firewall rules."
}

# --- 6. Reachability probe -------------------------------------------------
try {
  $resp = Invoke-WebRequest -Uri 'http://localhost:8500/requestToPos/' `
    -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
  Ok "PobRestService responded with HTTP $($resp.StatusCode)"
} catch {
  # WCF endpoints often reply with 400/405/415 to an empty GET — treat any HTTP
  # status as a success, only pure connection errors as a failure.
  if ($_.Exception.Response) {
    Ok "PobRestService responded with HTTP $([int]$_.Exception.Response.StatusCode) (expected for a bare GET)"
  } else {
    Warn "Could not reach http://localhost:8500/requestToPos/ — $($_.Exception.Message)"
  }
}

# --- 7. Configure the bridge ----------------------------------------------
$envPath = Join-Path $Root "backend\.env"
if (-not (Test-Path $envPath)) {
  $example = Join-Path $Root "backend\.env.example"
  if (Test-Path $example) {
    Copy-Item -LiteralPath $example -Destination $envPath
    Ok "Copied .env.example → backend\.env"
  } else {
    Warn "backend\.env not found. Create it from .env.example before starting the bridge."
  }
}
Write-Host ""
Write-Host "=== Next steps (manual) ===" -ForegroundColor Magenta
Write-Host "  1. Plug the Verifone terminal into COM10 @ 115200 baud (DualConnector.xml)." -ForegroundColor White
Write-Host "  2. Edit backend\.env and set:" -ForegroundColor White
Write-Host "       POS_DRIVER=golomt" -ForegroundColor Gray
Write-Host "       POS_TERMINAL_ID=<from Golomt>" -ForegroundColor Gray
Write-Host "       POS_MERCHANT_ID=<from Golomt>" -ForegroundColor Gray
Write-Host "       POS_DEBUG=on       (leave on for the first live test)" -ForegroundColor Gray
Write-Host "  3. Restart the kiosk (or the kiosk-bridge window)." -ForegroundColor White
Write-Host "  4. From the kiosk box, run:" -ForegroundColor White
Write-Host "       curl http://127.0.0.1:7070/pos/status" -ForegroundColor Gray
Write-Host "     — should report reachable:true and no MISSING fields." -ForegroundColor DarkGray
Write-Host "  5. First live test: buy a ticket, watch the bridge console for" -ForegroundColor White
Write-Host "     [pos.golomt] → / ← lines to see the exact request/response." -ForegroundColor White
Write-Host "     If Golomt returns a code you don't recognise, use the probe:" -ForegroundColor White
Write-Host "       curl -X POST http://127.0.0.1:7070/pos/probe \" -ForegroundColor Gray
Write-Host "            -H 'Content-Type: application/json' \" -ForegroundColor Gray
Write-Host "            -d '{\"OperationCode\":200,\"Amount\":100}'" -ForegroundColor Gray
Write-Host ""
Write-Host "Done." -ForegroundColor Green
