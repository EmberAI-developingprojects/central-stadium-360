# ============================================================
#  Register the Stadium Kiosk to launch full-screen at logon,
#  and auto-restart if it ever crashes. Run on the KIOSK BOX
#  as Administrator (right-click > Run with PowerShell, or from
#  an elevated terminal).
#
#  Edit $ExePath below to wherever you copied the Release build.
# ============================================================

param(
  [string]$ExePath = "C:\Kiosk\stadium_kiosk.exe",
  [string]$TaskName = "StadiumKiosk"
)

if (-not (Test-Path $ExePath)) {
  Write-Error "Executable not found at '$ExePath'. Copy the Release folder there, or pass -ExePath."
  exit 1
}

$action  = New-ScheduledTaskAction -Execute $ExePath -WorkingDirectory (Split-Path $ExePath)
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -RunLevel Highest -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' -> $ExePath"
Write-Host "It will launch at logon. Test now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "Recommended kiosk hardening (run as admin):"
Write-Host "  powercfg /change monitor-timeout-ac 0    # never blank the screen"
Write-Host "  powercfg /change standby-timeout-ac 0    # never sleep"
Write-Host "  Set the display to Portrait + enable auto-login for the kiosk user."
