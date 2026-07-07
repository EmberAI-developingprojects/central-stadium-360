# ============================================================
#  Register + start the Golomt IPPOS REST service (GLMTPOS / PobRestService).
#  RUN AS ADMINISTRATOR on the kiosk box. Idempotent.
#
#  GLMTPOS.msi only copies files; it does NOT register the Windows service.
#  This registers "Golomt POS" via InstallUtil (as the vendor's
#  "GOLOMT SERVICE INITIAL COMMAND.txt" instructs), sets it Automatic, starts
#  it, and verifies it is listening on http://localhost:8500/requestToPos.
#
#  The terminal COM port does NOT need to be edited in the service's
#  DualConnector.xml — the kiosk bridge passes portNo per request (GOLOMT_POS_PORT),
#  which the service applies via SetChannelTerminalParam.
# ============================================================

param(
  [string]$ServiceDir  = "C:\Program Files (x86)\Golomt\Golomt POS API\PobRestService",
  [string]$ServiceName = "Golomt POS"
)

$ErrorActionPreference = 'Stop'

# --- Require elevation ------------------------------------------------------
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Error "Run this in an elevated (Administrator) PowerShell."
  exit 1
}

$exe = Join-Path $ServiceDir 'PobRestService.exe'
if (-not (Test-Path $exe)) { Write-Error "PobRestService.exe not found at '$ServiceDir'. Install GLMTPOS.msi first."; exit 1 }

$installutil = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe"
if (-not (Test-Path $installutil)) { $installutil = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe" }
if (-not (Test-Path $installutil)) { Write-Error "InstallUtil.exe (.NET Framework v4) not found."; exit 1 }

# --- Register (if needed) ---------------------------------------------------
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
  Write-Host "Registering service '$ServiceName' via InstallUtil..."
  & $installutil $exe
  if ($LASTEXITCODE -ne 0) { Write-Error "InstallUtil failed (exit $LASTEXITCODE)."; exit 1 }
} else {
  Write-Host "Service '$ServiceName' already registered (state: $($svc.Status))."
}

# --- Start + verify ---------------------------------------------------------
Set-Service -Name $ServiceName -StartupType Automatic
if ((Get-Service -Name $ServiceName).Status -ne 'Running') { Start-Service -Name $ServiceName }
Get-Service -Name $ServiceName | Select-Object Name, Status, StartType | Format-Table -AutoSize

$listen = $null
foreach ($i in 1..10) {
  $listen = Get-NetTCPConnection -State Listen -LocalPort 8500 -ErrorAction SilentlyContinue
  if ($listen) { break }
  Start-Sleep -Milliseconds 500
}
if ($listen) {
  Write-Host "OK: GLMTPOS listening on http://localhost:8500/requestToPos"
  Write-Host "Next (non-admin): cd kiosk\backend; node scripts\golomt-smoke.mjs"
} else {
  Write-Warning "Service reports started but nothing is listening on :8500 yet."
  Write-Warning "Check the service's own log dir under '$ServiceDir\log'."
}
