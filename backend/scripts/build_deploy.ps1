# ============================================================
#  Build a self-contained kiosk-bridge deploy folder.
#  Run on a DEV PC (this one), then copy the output to the kiosk box.
#
#  Produces:  backend/deploy/kiosk-bridge/
#    dist/                compiled JS (node dist/server.js)
#    node_modules/        PRODUCTION deps only, incl. the native serialport
#                         binding prebuilt for win32-x64 (the kiosk box arch)
#    package.json, package-lock.json
#    .env.example         copy to .env on the box and edit
#    scripts/             install_bridge_service.ps1, print_doc.ps1
#  ...and zips it to backend/deploy/kiosk-bridge.zip.
#
#  On the box:  expand the zip to C:\Kiosk\bridge, copy .env.example -> .env,
#  set POS_DRIVER=verifone + POS_SERIAL_PORT, then run
#  scripts/install_bridge_service.ps1 as Administrator.
# ============================================================

param(
  [string]$OutDir = ""
)

$ErrorActionPreference = 'Stop'

# Resolve paths relative to this script (backend/scripts/ -> backend/).
$backend = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $OutDir) { $OutDir = Join-Path $backend "deploy\kiosk-bridge" }

# Ensure node/npm are reachable even when not on PATH.
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  $env:Path = "$env:ProgramFiles\nodejs;" + $env:Path
}

Push-Location $backend
try {
  Write-Host "==> Compiling (npm run build)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build failed" }

  Write-Host "==> Staging deploy at $OutDir" -ForegroundColor Cyan
  if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

  Copy-Item "dist" $OutDir -Recurse
  Copy-Item "scripts" $OutDir -Recurse
  Copy-Item "package.json","package-lock.json",".env.example" $OutDir

  Write-Host "==> Installing PRODUCTION node_modules into the deploy..." -ForegroundColor Cyan
  Push-Location $OutDir
  try {
    npm ci --omit=dev --ignore-scripts=false
    if ($LASTEXITCODE -ne 0) { throw "npm ci (prod) failed" }
  } finally { Pop-Location }

  $zip = "$OutDir.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Write-Host "==> Zipping -> $zip" -ForegroundColor Cyan
  Compress-Archive -Path "$OutDir\*" -DestinationPath $zip

  Write-Host ""
  Write-Host "Done." -ForegroundColor Green
  Write-Host "  Deploy folder : $OutDir"
  Write-Host "  Zip           : $zip"
  Write-Host "  Next: copy to the kiosk box -> C:\Kiosk\bridge, set .env, run scripts\install_bridge_service.ps1 as admin."
} finally {
  Pop-Location
}
