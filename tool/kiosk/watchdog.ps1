# ============================================================
#  Stadium Kiosk watchdog - single-shot health check.
#  Registered by install_watchdog.ps1 to run every 1 minute.
#
#  Each run:
#    1. GET the bridge /health; if it does not answer 200, restart
#       the bridge task.
#    2. Ensure the bridge task is in the Running state.
#    3. Ensure the UI task is Running (it owns browser resurrection
#       in-process); if not, start it.
#    4. Optionally probe the card terminal (/pos/probe) for logging.
#
#  All events are appended to a rotating log so an unattended box
#  leaves a trail of what recovered and when.
# ============================================================

param(
  [string]$BridgeHealthUrl = "http://127.0.0.1:7070/health",
  [string]$PosProbeUrl     = "http://127.0.0.1:7070/pos/probe",
  [string]$BridgeTask      = "StadiumKioskBridge",
  [string]$UiTask          = "StadiumKiosk",
  [string]$LogFile         = "C:\Kiosk\logs\watchdog\watchdog.log",
  [int]   $TimeoutSec      = 5,
  [switch]$ProbePos
)

$ErrorActionPreference = 'Continue'

function Write-Log {
  param([string]$Level, [string]$Message)
  $line = "[{0}] {1,-5} {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  try {
    $dir = Split-Path -Parent $LogFile
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    # Rotate at ~1 MB so the log never grows unbounded.
    if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt 1MB)) {
      Move-Item -LiteralPath $LogFile -Destination "$LogFile.1" -Force
    }
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
  } catch { }
}

function Test-HttpOk {
  param([string]$Url)
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300)
  } catch { return $false }
}

function Get-TaskState {
  param([string]$Name)
  try { return (Get-ScheduledTask -TaskName $Name -ErrorAction Stop).State } catch { return $null }
}

# --- 1 + 2: bridge health + task -------------------------------------------
$bridgeState = Get-TaskState $BridgeTask
if ($null -eq $bridgeState) {
  Write-Log 'ERROR' "Bridge task '$BridgeTask' is not registered."
} elseif (Test-HttpOk $BridgeHealthUrl) {
  # healthy - stay quiet (no log spam on the happy path)
} else {
  Write-Log 'WARN' "Bridge /health not responding (task state=$bridgeState). Restarting '$BridgeTask'."
  try { Stop-ScheduledTask  -TaskName $BridgeTask -ErrorAction SilentlyContinue } catch { }
  try { Start-ScheduledTask -TaskName $BridgeTask -ErrorAction Stop; Write-Log 'INFO' "Bridge task restarted." }
  catch { Write-Log 'ERROR' "Failed to restart bridge task: $_" }
}

# --- 3: UI task -------------------------------------------------------------
$uiState = Get-TaskState $UiTask
if ($null -eq $uiState) {
  Write-Log 'ERROR' "UI task '$UiTask' is not registered."
} elseif ($uiState -ne 'Running') {
  Write-Log 'WARN' "UI task '$UiTask' state=$uiState (not Running). Starting it."
  try { Start-ScheduledTask -TaskName $UiTask -ErrorAction Stop; Write-Log 'INFO' "UI task started." }
  catch { Write-Log 'ERROR' "Failed to start UI task: $_" }
}

# --- 4: optional terminal probe (logging only) -----------------------------
if ($ProbePos) {
  if (Test-HttpOk $PosProbeUrl) { Write-Log 'INFO' "POS probe OK." }
  else { Write-Log 'WARN' "POS probe did not answer (terminal/service may be down)." }
}
