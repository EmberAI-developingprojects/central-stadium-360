@echo off
REM ============================================================
REM  Build the Stadium Kiosk as a native Windows release .exe.
REM  Run this on your DEV PC (the one with Flutter + Visual Studio).
REM
REM  Prerequisites (one-time, see README / tool/kiosk):
REM    1) Windows Developer Mode ON   (start ms-settings:developers)
REM    2) Visual Studio with the "Desktop development with C++" workload
REM ============================================================
setlocal
REM Flutter project now lives under frontend/ (monorepo: frontend + backend).
cd /d "%~dp0..\..\frontend"

set FLUTTER=C:\dev\flutter\bin\flutter.bat

echo Fetching packages...
call "%FLUTTER%" pub get || goto :err

echo Building Windows release...
call "%FLUTTER%" build windows --release || goto :err

echo.
echo ============================================================
echo  Done. Your kiosk app is here:
echo    frontend\build\windows\x64\runner\Release\
echo.
echo  Copy that ENTIRE Release folder to the kiosk box (e.g. C:\Kiosk),
echo  then run install_autostart.ps1 there as Administrator.
echo ============================================================
pause
exit /b 0

:err
echo.
echo BUILD FAILED. Check the messages above (usually a missing prerequisite).
pause
exit /b 1
