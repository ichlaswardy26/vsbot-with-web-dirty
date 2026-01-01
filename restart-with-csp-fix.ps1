# PowerShell script to restart server with CSP fixes

Write-Host "🔄 Restarting server with CSP fixes..." -ForegroundColor Cyan

# Kill any existing Node.js processes related to the server
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "(server|start|index)" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait for processes to stop
Start-Sleep -Seconds 2

Write-Host "✅ Processes stopped" -ForegroundColor Green

# Clear npm cache if available
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Clearing npm cache..." -ForegroundColor Yellow
    npm cache clean --force 2>$null
}

# Start the server
Write-Host "🚀 Starting server with updated CSP configuration..." -ForegroundColor Cyan

# Check for start scripts and run the appropriate one
if (Test-Path "start.js") {
    Write-Host "Using start.js..." -ForegroundColor Green
    node start.js
} elseif (Test-Path "index.js") {
    Write-Host "Using index.js..." -ForegroundColor Green
    node index.js
} elseif (Test-Path "package.json") {
    Write-Host "Using npm start..." -ForegroundColor Green
    npm start
} else {
    Write-Host "❌ No start script found. Please start the server manually." -ForegroundColor Red
    Write-Host "Try one of these commands:" -ForegroundColor Yellow
    Write-Host "  node start.js" -ForegroundColor White
    Write-Host "  node index.js" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
}