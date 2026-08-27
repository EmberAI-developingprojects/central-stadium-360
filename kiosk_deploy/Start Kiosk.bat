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
set "PORT=8080"

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

echo === Starting on-box bridge ^(e-barimt / print / email^) ===
start "kiosk-bridge" /D "%ROOT%backend" cmd /k "node dist\server.js"

:kiosk
echo === Launching web kiosk on http://127.0.0.1:%PORT% ===
powershell -ExecutionPolicy Bypass -File "%ROOT%run_web_kiosk.ps1" -WebRoot "%ROOT%web" -Port %PORT%

endlocal
