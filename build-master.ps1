# Build Script for Mastering System (Full Admin Controls)
$env:VITE_APP_MODE="MASTER"
Write-Host "Building MASTER VERSION EXE..." -ForegroundColor Green
npm run electron:build
Write-Host "MASTER BUILD COMPLETE! Look in the 'release' folder." -ForegroundColor Cyan
