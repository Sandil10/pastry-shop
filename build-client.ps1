# Build Script for Client Terminals (POS Only, No Admin Controls)
$env:VITE_APP_MODE="CLIENT"
Write-Host "Building CLIENT VERSION EXE (Clean Distribution)..." -ForegroundColor Yellow
npm run electron:build
Write-Host "CLIENT BUILD COMPLETE! Look in the 'release' folder." -ForegroundColor Cyan
