# ============================================================
#  Register the kiosk-bridge to run at logon and auto-restart on
#  crash, on the KIOSK BOX. Run as Administrator.
#
#  The bridge is a long-lived Node process (node dist/server.js) bound to
#  127.0.0.1:7070. This registers it as a Scheduled Task — same pattern as
#  tool/kiosk/install_autostart.ps1 uses for the Flutter app — so the two
#  autostart entries (bridge + kiosk UI) sit side by side.
#
#  Prereqs on the box: Node.js installed, and a deploy produced by
#  scripts/build_deploy.ps1 copied to $BridgeDir (must contain dist/ and a
#  filled-in .env).
# ============================================================

param(
  [string]$BridgeDir = "C:\Kiosk\bridge",
  [string]$TaskName  = "StadiumKioskBridge",
  [string]$NodeExe   = ""
)

$ErrorActionPreference = 'Stop'

# --- Resolve node.exe -------------------------------------------------------
if (-not $NodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $NodeExe = $cmd.Source }
  elseif (Test-Path "$env:ProgramFiles\nodejs\node.exe") { $NodeExe = "$env:ProgramFiles\nodejs\node.exe" }
}
if (-not $NodeExe -or -not (Test-Path $NodeExe)) {
  Write-Error "node.exe not found. Install Node.js or pass -NodeExe 'C:\Program Files\nodejs\node.exe'."
  exit 1
}

# --- Validate the deploy ----------------------------------------------------
$server = Join-Path $BridgeDir "dist\server.js"
if (-not (Test-Path $server)) {
  Write-Error "No dist\server.js under '$BridgeDir'. Copy a build_deploy.ps1 output there first."
  exit 1
}
if (-not (Test-Path (Join-Path $BridgeDir ".env"))) {
  Write-Warning "No .env in '$BridgeDir' — the bridge will fall back to defaults (mock POS, simulated email). Copy .env.example to .env and edit it for this box."
}

# --- Register the scheduled task -------------------------------------------
$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$server`"" -WorkingDirectory $BridgeDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -RunLevel Highest -Force | Out-Null

Write-Host "Registered '$TaskName' -> $NodeExe `"$server`"  (cwd: $BridgeDir)"
Write-Host "Start it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Verify health:      curl http://127.0.0.1:7070/health"
Write-Host "Verify terminal:    curl http://127.0.0.1:7070/pos/probe   (with POS_DRIVER=verifone)"
