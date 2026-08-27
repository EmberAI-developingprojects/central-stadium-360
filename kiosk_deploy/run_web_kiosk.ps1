# ============================================================
#  Run the Stadium Kiosk (Flutter WEB build) in browser kiosk mode.
#
#  Serves frontend/build/web over http://127.0.0.1:<Port> using a
#  tiny built-in static server (no Python/Node/admin needed) and
#  launches Chrome (or Edge) full-screen with --kiosk. When the
#  browser closes, the server stops.
#
#  PREREQUISITE: build the web app first, WITH the dart-defines, e.g.
#    C:\dev\flutter\bin\flutter build web --release `
#      --dart-define=KIOSK_API_BASE=https://cs360-backend-190017495951.asia-northeast1.run.app `
#      --dart-define=KIOSK_KEY=<the X-Kiosk-Key> `
#      --dart-define=KIOSK_ID=gate-1
#  (Without the defines the app runs on the bundled MOCK catalog.)
#
#  USAGE (from anywhere):
#    powershell -ExecutionPolicy Bypass -File tool\kiosk\run_web_kiosk.ps1
#    ...optional: -Port 8080  -Edge  -WebRoot "C:\Kiosk\web"
#
#  NOTE: the served origin is http://127.0.0.1:<Port>. If you use the
#  on-box hardware bridge (card/print), set its .env KIOSK_ORIGIN to
#  exactly that value so its CORS check passes.
# ============================================================

param(
  [int]$Port = 8080,
  [string]$WebRoot = (Join-Path $PSScriptRoot '..\..\frontend\build\web'),
  [switch]$Edge,
  [string]$BrowserPath
)

$ErrorActionPreference = 'Stop'

# --- Resolve and validate the web root --------------------------------------
try { $WebRoot = (Resolve-Path -LiteralPath $WebRoot).Path } catch {
  Write-Error "Web build not found at '$WebRoot'. Run 'flutter build web --release' (with the --dart-defines) first."
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $WebRoot 'index.html'))) {
  Write-Error "No index.html in '$WebRoot'. That folder is not a Flutter web build."
  exit 1
}

# --- Locate the browser ------------------------------------------------------
function Find-Browser {
  param([switch]$WantEdge, [string]$Explicit)
  if ($Explicit) { if (Test-Path $Explicit) { return $Explicit } else { throw "Browser not found at '$Explicit'." } }
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $edge = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )
  $order = if ($WantEdge) { $edge + $chrome } else { $chrome + $edge }
  foreach ($p in $order) { if ($p -and (Test-Path $p)) { return $p } }
  throw "Neither Chrome nor Edge was found. Install one, or pass -BrowserPath."
}
$browser = Find-Browser -WantEdge:$Edge -Explicit $BrowserPath

# --- Content types -----------------------------------------------------------
$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8';
  '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.wasm'='application/wasm'; '.map'='application/json';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif';
  '.webp'='image/webp'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.ttf'='font/ttf'; '.otf'='font/otf'; '.woff'='font/woff'; '.woff2'='font/woff2';
  '.txt'='text/plain; charset=utf-8'; '.bin'='application/octet-stream'
}

# --- Start the static server (loopback TCP; no admin/urlacl needed) ----------
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch {
  Write-Error "Could not listen on 127.0.0.1:$Port (port in use?). Pass a different -Port. ($_)"
  exit 1
}
$url = "http://127.0.0.1:$Port/"
Write-Host "Serving '$WebRoot'" -ForegroundColor Cyan
Write-Host "  at $url" -ForegroundColor Cyan
Write-Host "Browser: $browser" -ForegroundColor Cyan

function Send-Response {
  param($Stream, [int]$Status, [string]$Reason, [string]$ContentType, [byte[]]$Body)
  $head = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache, no-store`r`nConnection: close`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
  $Stream.Write($hb, 0, $hb.Length)
  if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

# --- Launch the browser in kiosk mode ---------------------------------------
$profileDir = Join-Path $env:TEMP "kiosk-chrome-profile"
$browserArgs = @(
  '--kiosk', "--app=$url",
  "--user-data-dir=$profileDir",
  '--noerrdialogs', '--disable-pinch', '--overscroll-history-navigation=0',
  '--disable-session-crashed-bubble', '--disable-infobars',
  '--check-for-update-interval=31536000', '--no-first-run', '--fast', '--fast-start'
)
$proc = Start-Process -FilePath $browser -ArgumentList $browserArgs -PassThru
Write-Host "Launched kiosk browser (PID $($proc.Id))." -ForegroundColor Green
Write-Host "Leave this window open. Press Ctrl+C (or close it) to stop the kiosk." -ForegroundColor Green

# --- Serve until interrupted ------------------------------------------------
# Do NOT tie the loop to the launched process: Chrome's initial process often
# exits right after spawning the real browser, which would stop the server
# while the kiosk window is still open (-> ERR_CONNECTION_REFUSED).
try {
  while ($true) {
    if (-not $listener.Pending()) { Start-Sleep -Milliseconds 40; continue }
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $buf = New-Object byte[] 8192
      $n = $stream.Read($buf, 0, $buf.Length)
      if ($n -le 0) { continue }
      $reqLine = ([System.Text.Encoding]::ASCII.GetString($buf, 0, $n) -split "`r`n")[0]
      $target = ($reqLine -split ' ')[1]
      if (-not $target) { $target = '/' }
      $pathOnly = ($target -split '\?')[0]
      $rel = [System.Uri]::UnescapeDataString($pathOnly).TrimStart('/')
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }

      $full = [System.IO.Path]::GetFullPath((Join-Path $WebRoot $rel))
      # Path-traversal guard: must stay under WebRoot.
      if (-not $full.StartsWith($WebRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $stream 403 'Forbidden' 'text/plain' ([System.Text.Encoding]::ASCII.GetBytes('403')); continue
      }
      if ((Test-Path -LiteralPath $full) -and ((Get-Item -LiteralPath $full).PSIsContainer)) {
        $full = Join-Path $full 'index.html'
      }
      if (-not (Test-Path -LiteralPath $full)) {
        # SPA fallback: extensionless route -> index.html; otherwise 404.
        if (-not [System.IO.Path]::GetExtension($full)) {
          $full = Join-Path $WebRoot 'index.html'
        } else {
          Send-Response $stream 404 'Not Found' 'text/plain' ([System.Text.Encoding]::ASCII.GetBytes('404')); continue
        }
      }
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      Send-Response $stream 200 'OK' $ctype $bytes
    } catch {
      # Ignore per-connection errors (browser resets, etc.) and keep serving.
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
  Write-Host "Server stopped." -ForegroundColor Yellow
}
