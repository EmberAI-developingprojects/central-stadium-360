@echo off
setlocal
REM ============================================================
REM  Start Kiosk
REM  Builds the Flutter web app against the LIVE cs360 backend,
REM  starts the on-box bridge (email / card / print), then opens
REM  the browser in full-screen kiosk mode.
REM
REM  Usage (double-click, or from a terminal):
REM    "Start Kiosk.bat"            build + start everything
REM    "Start Kiosk.bat" /buildonly only (re)build the web app
REM    "Start Kiosk.bat" /nobuild   skip build, just start
REM ============================================================

set "ROOT=%~dp0"
set "FLUTTER=C:\dev\flutter\bin\flutter.bat"
set "PORT=8080"

REM --- Live backend dart-defines (the served origin must match the
REM     bridge's KIOSK_ORIGIN in backend\.env = http://127.0.0.1:%PORT%) ---
set "KIOSK_API_BASE=https://cs360-backend-190017495951.asia-northeast1.run.app"
set "KIOSK_ID=gate-1"
set "KIOSK_KEY=5fff38aab83249981271e43ba2f35342b65e2a1d2daebef916842df350b34ba0"

if /I "%~1"=="/nobuild" goto :start

echo.
echo === Building kiosk web (release, live backend) ===
pushd "%ROOT%frontend"
call "%FLUTTER%" build web --release ^
  --dart-define=KIOSK_API_BASE=%KIOSK_API_BASE% ^
  --dart-define=KIOSK_KEY=%KIOSK_KEY% ^
  --dart-define=KIOSK_ID=%KIOSK_ID%
set "ERR=%ERRORLEVEL%"
popd
if not "%ERR%"=="0" (
  echo.
  echo BUILD FAILED ^(exit %ERR%^). Not launching.
  pause
  exit /b %ERR%
)
echo Build OK.

if /I "%~1"=="/buildonly" (
  echo Build-only mode - done.
  exit /b 0
)

:start
echo.
echo === Starting on-box bridge (email/card/print) ===
start "kiosk-bridge" /D "%ROOT%backend" cmd /k "npm run dev"

echo.
echo === Launching web kiosk on http://127.0.0.1:%PORT% ===
powershell -ExecutionPolicy Bypass -File "%ROOT%tool\kiosk\run_web_kiosk.ps1" -Port %PORT%

endlocal
