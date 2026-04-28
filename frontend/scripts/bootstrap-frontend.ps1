$ErrorActionPreference = "Stop"

Write-Host "== Foodtruck Frontend Bootstrap ==" -ForegroundColor Cyan

$nodeVersion = node -v
Write-Host "Detected Node: $nodeVersion"

if ($nodeVersion -match "^v(2[3-9]|[3-9][0-9])\.") {
  Write-Host "Node version is unsupported for Expo in this project." -ForegroundColor Red
  Write-Host "Please switch to Node 20 LTS (recommended)." -ForegroundColor Yellow
  Write-Host "Example (nvm-windows): nvm use 20.18.0"
  exit 1
}

if (Test-Path ".\node_modules") {
  Write-Host "Removing node_modules..."
  Remove-Item -Recurse -Force ".\node_modules"
}

if (Test-Path ".\package-lock.json") {
  Write-Host "Removing package-lock.json..."
  Remove-Item -Force ".\package-lock.json"
}

Write-Host "Installing dependencies..."
npm install

Write-Host "Frontend bootstrap completed successfully." -ForegroundColor Green
Write-Host "Run: npm run start"
