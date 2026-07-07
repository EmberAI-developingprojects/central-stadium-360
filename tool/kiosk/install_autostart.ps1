# ============================================================
#  Register the Stadium Kiosk WEB UI to launch full-screen at
#  logon and auto-restart if it crashes. Run on the KIOSK BOX as
#  Administrator.
#
#  This runs the resilient web launcher (run_web_kiosk.ps1), which
#  serves frontend/build/web over http://127.0.0.1:<Port> and opens
#  Chrome/Edge in --kiosk mode, keeping the browser window alive.
#
#  Default paths follow the production layout created by
#  deploy_release.ps1:
#    ops scripts : C:\Kiosk\ops   (this folder, copied once)
#    web build   : C:\Kiosk\current\web  (junction to active release)
#    logs        : C:\Kiosk\logs\ui\kiosk.log
# ============================================================

param(
  [string]$OpsDir   = "C:\Kiosk\ops",
  [string]$WebRoot  = "C:\Kiosk\current\web",
  [int]   $Port     = 8080,
  [string]$LogFile  = "C:\Kiosk\logs\ui\kiosk.log",
  [string]$TaskName = "StadiumKiosk"
)

$ErrorActionPreference = 'Stop'

$launcher = Join-Path $OpsDir "run_web_kiosk.ps1"
if (-not (Test-Path $launcher)) {
  Write-Error "Launcher not found at '$launcher'. Copy tool\kiosk\* to '$OpsDir' first."
  exit 1
}
if (-not (Test-Path (Join-Path $WebRoot "index.html"))) {
  Write-Warning "No index.html under '$WebRoot' yet. Deploy a web release there (deploy_release.ps1) before this task will serve anything."
}

$psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$argStr = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -WebRoot `"$WebRoot`" -Port $Port -LogFile `"$LogFile`""

$action  = New-ScheduledTaskAction -Execute $psExe -Argument $argStr -WorkingDirectory $OpsDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -RunLevel Highest -Force | Out-Null

Write-Host "Registered UI task '$TaskName':"
Write-Host "  $psExe $argStr"
Write-Host ""
Write-Host "Start it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "The kiosk user must be set to AUTO-LOGON so this -AtLogOn task fires on boot."
Write-Host "Run harden_kiosk.ps1 to configure autologon, power, and lock-screen settings."
