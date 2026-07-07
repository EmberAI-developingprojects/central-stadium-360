# ============================================================
#  Stadium Kiosk OS hardening - run ONCE on the KIOSK BOX as
#  Administrator. Idempotent; safe to re-run.
#
#  Configures the box for unattended public-kiosk operation:
#    - never sleep / never blank the screen (AC and battery)
#    - disable screensaver + lock screen + sign-in-on-wake
#    - silence toast notifications
#    - constrain Windows Update reboots to off-hours (active hours)
#    - (optional) enable auto-logon so the -AtLogOn kiosk tasks fire
#      on boot with no human at the machine
#
#  Auto-logon stores the password in the registry in clear text
#  (Windows limitation). Only enable it for a dedicated, low-privilege
#  kiosk account on a physically secured machine.
# ============================================================

param(
  [switch]$EnableAutoLogon,
  [string]$AutoLogonUser,
  [string]$AutoLogonPassword,
  [string]$AutoLogonDomain = $env:COMPUTERNAME,
  # Active hours = when Windows Update will NOT auto-reboot. Defaults keep
  # the box reboot-free 07:00-23:00 (covers typical event hours).
  [int]$ActiveHoursStart = 7,
  [int]$ActiveHoursEnd   = 23
)

$ErrorActionPreference = 'Stop'

function Set-Reg {
  param([string]$Path, [string]$Name, $Value, [string]$Type = 'DWord')
  if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
  New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
}

Write-Host "== Power: never sleep, never blank (AC + DC) ==" -ForegroundColor Cyan
foreach ($k in @('monitor-timeout-ac','monitor-timeout-dc','standby-timeout-ac','standby-timeout-dc','disk-timeout-ac','disk-timeout-dc','hibernate-timeout-ac','hibernate-timeout-dc')) {
  & powercfg /change $k 0 | Out-Null
}
# Do nothing when the lid closes / power button pressed is left to site policy.

Write-Host "== Screensaver off (current user) ==" -ForegroundColor Cyan
Set-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaveActive' '0' 'String'
Set-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaveTimeOut' '0' 'String'

Write-Host "== Lock screen + sign-in-on-wake off ==" -ForegroundColor Cyan
Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' 'NoLockScreen' 1
# Do not require a password when the machine wakes.
foreach ($sub in @('ac','dc')) {
  & powercfg /setacvalueindex SCHEME_CURRENT SUB_NONE CONSOLELOCK 0 2>$null | Out-Null
}
& powercfg /setdcvalueindex SCHEME_CURRENT SUB_NONE CONSOLELOCK 0 2>$null | Out-Null

Write-Host "== Toast notifications off (current user) ==" -ForegroundColor Cyan
Set-Reg 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' 0

Write-Host "== Windows Update active hours $ActiveHoursStart:00-$ActiveHoursEnd:00 ==" -ForegroundColor Cyan
$wu = 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings'
Set-Reg $wu 'ActiveHoursStart' $ActiveHoursStart
Set-Reg $wu 'ActiveHoursEnd'   $ActiveHoursEnd
Set-Reg $wu 'SmartActiveHoursState' 0

if ($EnableAutoLogon) {
  if (-not $AutoLogonUser -or -not $AutoLogonPassword) {
    Write-Error "EnableAutoLogon requires -AutoLogonUser and -AutoLogonPassword."
    exit 1
  }
  Write-Host "== Auto-logon for $AutoLogonDomain\$AutoLogonUser ==" -ForegroundColor Yellow
  $wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
  Set-Reg $wl 'AutoAdminLogon'   '1' 'String'
  Set-Reg $wl 'DefaultUserName'  $AutoLogonUser 'String'
  Set-Reg $wl 'DefaultPassword'  $AutoLogonPassword 'String'
  Set-Reg $wl 'DefaultDomainName' $AutoLogonDomain 'String'
  Set-Reg $wl 'ForceAutoLogon'   '1' 'String'
  Write-Warning "Password is stored in clear text under Winlogon. Use a dedicated low-privilege kiosk account."
} else {
  Write-Host "== Auto-logon: SKIPPED ==" -ForegroundColor DarkGray
  Write-Host "   Enable with: .\harden_kiosk.ps1 -EnableAutoLogon -AutoLogonUser kiosk -AutoLogonPassword '****'"
}

Write-Host ""
Write-Host "Hardening complete. Reboot to verify the box comes up straight into the kiosk." -ForegroundColor Green
Write-Host "For the strongest lockdown, also configure Windows Assigned Access (see the runbook)."
