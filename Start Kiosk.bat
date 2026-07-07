@echo off
setlocal enableextensions
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
REM
REM  Auto-detects Node and Flutter even when they are not on PATH.
REM ============================================================

set "ROOT=%~dp0"
set "PORT=8080"
set "WEBINDEX=%ROOT%frontend\build\web\index.html"

REM --- Live backend dart-defines (the served origin must match the
REM     bridge's KIOSK_ORIGIN in backend\.env = http://127.0.0.1:%PORT%) ---
set "KIOSK_API_BASE=https://cs360-backend-190017495951.asia-northeast1.run.app"
set "KIOSK_ID=gate-1"
set "KIOSK_KEY=5fff38aab83249981271e43ba2f35342b65e2a1d2daebef916842df350b34ba0"

REM ============================================================
REM  Locate Node/npm (needed to run the bridge). Prepend to PATH
REM  if it is installed but not exposed on this shell.
REM ============================================================
set "PFX86=%ProgramFiles(x86)%"
where npm >nul 2>&1
if errorlevel 1 (
  for %%D in (
    "%ProgramFiles%\nodejs"
    "%PFX86%\nodejs"
    "%LOCALAPPDATA%\Programs\nodejs"
  ) do if exist "%%~D\npm.cmd" set "PATH=%%~D;%PATH%"
)
where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Node.js / npm not found. Install Node.js from https://nodejs.org
  echo        ^(or add it to PATH^), then run this again.
  pause
  exit /b 1
)

REM ============================================================
REM  Locate Flutter (needed only to BUILD the web app).
REM ============================================================
set "FLUTTER="
if exist "C:\dev\flutter\bin\flutter.bat" set "FLUTTER=C:\dev\flutter\bin\flutter.bat"
if not defined FLUTTER for %%F in (flutter.bat) do if not defined FLUTTER set "FLUTTER=%%~$PATH:F"
if not defined FLUTTER (
  for %%D in (
    "C:\flutter\bin"
    "C:\src\flutter\bin"
    "%LOCALAPPDATA%\flutter\bin"
    "%USERPROFILE%\flutter\bin"
    "C:\tools\flutter\bin"
  ) do if exist "%%~D\flutter.bat" if not defined FLUTTER set "FLUTTER=%%~D\flutter.bat"
)

if /I "%~1"=="/nobuild" goto :start

REM --- No Flutter? Fall back to a prebuilt web app if present. ---
if not defined FLUTTER (
  echo.
  echo Flutter SDK not found ^(looked in C:\dev\flutter and common locations^).
  if exist "%WEBINDEX%" (
    echo A prebuilt web app exists - starting it without rebuilding.
    goto :start
  )
  echo No prebuilt web app either ^(frontend\build\web is missing^).
  echo.
  echo   Fix: install the Flutter SDK, then run this again to build; OR
  echo        build once on a dev PC and copy frontend\build\web here, then
  echo        run "Start Kiosk.bat" /nobuild.
  pause
  exit /b 1
)

echo.
echo === Building kiosk web (release, live backend) ===
echo     using Flutter: %FLUTTER%
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
REM --- Guard: never try to serve a build that is not there. ---
if not exist "%WEBINDEX%" (
  echo.
  echo ERROR: No web build at frontend\build\web.
  echo        Run "Start Kiosk.bat" without /nobuild to build it ^(needs Flutter^).
  pause
  exit /b 1
)

echo.
echo === Starting on-box bridge (email/card/print) ===
start "kiosk-bridge" /D "%ROOT%backend" cmd /k "npm run dev"

echo.
echo === Launching web kiosk on http://127.0.0.1:%PORT% ===
powershell -ExecutionPolicy Bypass -File "%ROOT%tool\kiosk\run_web_kiosk.ps1" -Port %PORT%

endlocal
