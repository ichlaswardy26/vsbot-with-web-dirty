# PowerShell script to restart the server with CSP fixes

Write-Host "🔄 Restarting Server with CSP Fixes" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Step 1: Stop existing Node.js processes
Write-Host "`n1️⃣  Stopping existing server processes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor White
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Stopped existing processes" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No existing Node.js processes found" -ForegroundColor White
}

# Step 2: Verify security middleware
Write-Host "`n2️⃣  Verifying CSP configuration..." -ForegroundColor Yellow

$securityFile = "web/middleware/security.js"
if (Test-Path $securityFile) {
    $content = Get-Content $securityFile -Raw
    
    $checks = @{
        "styleSrcElem" = $content -match "styleSrcElem"
        "scriptSrcElem" = $content -match "scriptSrcElem"
        "cdn.jsdelivr.net" = $content -match "cdn\.jsdelivr\.net"
        "cdn.socket.io" = $content -match "cdn\.socket\.io"
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        $status = if ($check.Value) { "✅" } else { "❌" }
        Write-Host "   $status $($check.Key)" -ForegroundColor White
    }
    
    $allPassed = ($checks.Values | Where-Object { $_ -eq $false }).Count -eq 0
    if ($allPassed) {
        Write-Host "✅ CSP configuration looks good" -ForegroundColor Green
    } else {
        Write-Host "⚠️  CSP configuration may need attention" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Security middleware file not found: $securityFile" -ForegroundColor Red
}

# Step 3: Start the server
Write-Host "`n3️⃣  Starting server..." -ForegroundColor Yellow

$startCommands = @("start.js", "index.js", "server.js")
$serverStarted = $false

foreach ($cmd in $startCommands) {
    if (Test-Path $cmd) {
        Write-Host "Starting with: node $cmd" -ForegroundColor Green
        Start-Process -FilePath "node" -ArgumentList $cmd -NoNewWindow
        $serverStarted = $true
        break
    }
}

if (-not $serverStarted) {
    if (Test-Path "package.json") {
        Write-Host "Starting with: npm start" -ForegroundColor Green
        Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
        $serverStarted = $true
    }
}

if ($serverStarted) {
    Write-Host "✅ Server start command executed" -ForegroundColor Green
    Write-Host "`nWaiting for server to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Test if server is responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ Server is responding (HTTP $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Server may still be starting up..." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Could not find a start script. Please start manually:" -ForegroundColor Red
    Write-Host "   node start.js" -ForegroundColor White
    Write-Host "   OR npm start" -ForegroundColor White
}

# Step 4: Instructions
Write-Host "`n4️⃣  Next Steps" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow
Write-Host "1. Wait for server to fully start (check console output)" -ForegroundColor White
Write-Host "2. Clear browser cache: Ctrl+Shift+R" -ForegroundColor White
Write-Host "3. Visit your dashboard" -ForegroundColor White
Write-Host "4. Check browser console for CSP errors" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Dashboard URL: http://localhost:3001/dashboard" -ForegroundColor Cyan
Write-Host "🔍 Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n✨ Server restart complete!" -ForegroundColor Green
Write-Host "If CSP violations persist, the server may need more time to start." -ForegroundColor Yellow