@echo off
setlocal
REM ============================================================
REM  Start Kiosk (packaged bundle)
REM  1) ensures Node.js dependencies are installed
REM  2) starts the on-box bridge  (e-barimt / print / email / card)
REM  3) launches the web UI full-screen in browser kiosk mode
REM
REM  Requires Node.js on the box (for the bridge) and, for barimt,
REM  the E-Barimt PosAPI 3.0 service running on http://localhost:7080.
REM
REM  Usage:  "Start Kiosk.bat"            start bridge + kiosk
REM          "Start Kiosk.bat" /nobridge  kiosk only (no bridge)
REM ============================================================
set "ROOT=%~dp0"

REM Web UI port for the Chrome-served static server. NB: named WEB_PORT (not
REM PORT) so it never leaks into Node.js's env — the bridge reads process.env.PORT
REM for its OWN listener, and colliding with 8080 would EADDRINUSE it.
set "WEB_PORT=8080"

if /I "%~1"=="/nobridge" goto :kiosk

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found on PATH.
  echo   Install from https://nodejs.org/  ^(LTS, x64^) and re-run.
  echo   Or run with /nobridge for UI only.
  pause
  goto :eof
)

REM Copy .env from .env.example on first run so the operator has something to edit.
if not exist "%ROOT%backend\.env" (
  if exist "%ROOT%backend\.env.example" (
    echo No backend\.env found — copying .env.example as a starting point.
    copy /Y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo   Edit backend\.env to set POS_DRIVER, POS_TERMINAL_ID, RESEND_API_KEY etc.
  )
)

REM Install dependencies on first run (or if node_modules was not shipped).
if not exist "%ROOT%backend\node_modules" (
  echo === Installing bridge dependencies ^(first run^) ===
  pushd "%ROOT%backend"
  call npm install --omit=dev
  if errorlevel 1 (
    echo ERROR: npm install failed. Check your network and re-run.
    popd
    pause
    goto :eof
  )
  popd
)

REM Refuse to launch a second bridge on top of an already-running one — the
REM operator sometimes double-clicks Start Kiosk.bat. If TCP 1017 is already
REM listening, we skip spawning a fresh bridge and go straight to the browser.
REM NB: the bridge deliberately listens on 1017 (below 1025) — Windows'
REM WinNAT/Hyper-V dynamic port reservations can never capture ports < 1025,
REM which is what kept breaking the old 7070 with "listen EACCES" after reboots.
netstat -ano | findstr /R /C:"127.0.0.1:1017 .* LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo === Bridge already running on 127.0.0.1:1017 — skipping second launch ===
) else (
  echo === Starting on-box bridge ^(e-barimt / print / email^) ===
  REM Explicitly unset PORT so it never overrides the bridge's default 1017.
  start "kiosk-bridge" /D "%ROOT%backend" cmd /k "set PORT=&& node dist\server.js"
)

:kiosk
echo === Launching web kiosk on http://127.0.0.1:%WEB_PORT% ===
powershell -ExecutionPolicy Bypass -File "%ROOT%run_web_kiosk.ps1" -WebRoot "%ROOT%web" -Port %WEB_PORT%

endlocal
