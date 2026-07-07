# ============================================================
#  Register the Stadium Kiosk watchdog to run every minute on the
#  KIOSK BOX. Run as Administrator.
#
#  The watchdog (watchdog.ps1) restarts the bridge if /health stops
#  answering and restarts the UI task if it stopped. It runs whether
#  or not a user is logged on (SYSTEM), so recovery does not depend
#  on the interactive session.
# ============================================================

param(
  [string]$OpsDir           = "C:\Kiosk\ops",
  [string]$LogFile          = "C:\Kiosk\logs\watchdog\watchdog.log",
  [int]   $EveryMinutes     = 1,
  [string]$TaskName         = "StadiumKioskWatchdog",
  [switch]$ProbePos
)

$ErrorActionPreference = 'Stop'

$script = Join-Path $OpsDir "watchdog.ps1"
if (-not (Test-Path $script)) {
  Write-Error "watchdog.ps1 not found at '$script'. Copy tool\kiosk\* to '$OpsDir' first."
  exit 1
}

$psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$argStr = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -LogFile `"$LogFile`""
if ($ProbePos) { $argStr += " -ProbePos" }

$action = New-ScheduledTaskAction -Execute $psExe -Argument $argStr -WorkingDirectory $OpsDir

# Fire at startup, then repeat forever every N minutes.
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration ([TimeSpan]::MaxValue)).Repetition

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Run as SYSTEM so recovery works even at the logon screen.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Registered watchdog task '$TaskName' (every $EveryMinutes min, as SYSTEM)."
Write-Host "Start it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Log: $LogFile"
