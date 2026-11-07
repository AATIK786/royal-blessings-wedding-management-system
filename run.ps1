# Online Wedding Management System Launch Script
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "  ONLINE WEDDING MANAGEMENT SYSTEM (MySQL Workbench)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Database  : wedding_db (localhost:3306)" -ForegroundColor Green
Write-Host "Username  : root" -ForegroundColor Green
Write-Host "Password  : root" -ForegroundColor Green
Write-Host ""

Set-Location -Path $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm.cmd install
}

Write-Host "Starting Web Server at http://localhost:5000 ..." -ForegroundColor Magenta
node server.js

