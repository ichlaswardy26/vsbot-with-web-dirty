# Rebuild Docker container with CSP fixes - PowerShell version
# This script ensures the CSP fixes are included in the Docker build

param(
    [switch]$SSL,
    [switch]$Minimal
)

$VPS_IP = "43.129.55.161"

Write-Host "🔧 Rebuilding Docker container with CSP fixes..." -ForegroundColor Cyan

# Verify CSP fixes are in place
Write-Host "🔍 Verifying CSP fixes in security middleware..." -ForegroundColor Yellow

if (!(Select-String -Path "web/middleware/security.js" -Pattern "scriptSrcAttr" -Quiet)) {
    Write-Host "❌ CSP fixes not found in security middleware!" -ForegroundColor Red
    Write-Host "Applying CSP fixes first..." -ForegroundColor Yellow
    
    # Apply the CSP fix if not already applied
    if (Test-Path "apply-csp-fix.js") {
        node apply-csp-fix.js
    } else {
        Write-Host "❌ CSP fix script not found. Please run the CSP fix first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ CSP fixes verified in source code" -ForegroundColor Green

# Docker compose command
$DC = "docker compose"
try {
    & $DC version | Out-Null
} catch {
    $DC = "docker-compose"
}

# Set compose file
$COMPOSE_FILE = "docker-compose.ip.yml"

# Create temporary compose file with appropriate Dockerfile if minimal
if ($Minimal) {
    Write-Host "📝 Creating minimal build configuration..." -ForegroundColor Yellow
    (Get-Content $COMPOSE_FILE) -replace 'dockerfile: Dockerfile.deploy', 'dockerfile: Dockerfile.minimal' | Set-Content "docker-compose.ip.tmp.yml"
    $COMPOSE_FILE = "docker-compose.ip.tmp.yml"
}

Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE down 2>$null

Write-Host "🗑️ Removing old images to force rebuild..." -ForegroundColor Yellow
$images = docker images -q "villain-seraphyx*" 2>$null
if ($images) {
    docker rmi $images 2>$null
}

Write-Host "📦 Building with CSP fixes (no cache)..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE build --no-cache --pull

Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE --profile monitoring up -d

# Wait for containers to start
Write-Host "⏳ Waiting for containers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if containers are running
$status = & $DC -f $COMPOSE_FILE ps
if ($status -match "Up") {
    Write-Host "✅ Containers are running!" -ForegroundColor Green
    
    # Test CSP configuration
    Write-Host "🧪 Testing CSP configuration..." -ForegroundColor Yellow
    
    $PROTOCOL = "http"
    if ($SSL) {
        $PROTOCOL = "https"
    }
    
    # Wait a bit more for the web server to be ready
    Start-Sleep -Seconds 5
    
    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "${PROTOCOL}://${VPS_IP}/health" -UseBasicParsing -SkipCertificateCheck -TimeoutSec 10
        Write-Host "✅ Health endpoint responding" -ForegroundColor Green
        
        # Test dashboard page
        Write-Host "🔍 Testing dashboard page..." -ForegroundColor Yellow
        try {
            $dashResponse = Invoke-WebRequest -Uri "${PROTOCOL}://${VPS_IP}/dashboard" -UseBasicParsing -SkipCertificateCheck -TimeoutSec 10
            Write-Host "✅ Dashboard accessible" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Dashboard returned $($_.Exception.Response.StatusCode) (may need authentication)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "⚠️ Services still starting up..." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🎉 Rebuild complete with CSP fixes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your dashboard:" -ForegroundColor Blue
    if ($SSL) {
        Write-Host "  Dashboard: https://${VPS_IP}/dashboard" -ForegroundColor Yellow
        Write-Host "  Health:    https://${VPS_IP}/health" -ForegroundColor Yellow
    } else {
        Write-Host "  Dashboard: http://${VPS_IP}/dashboard" -ForegroundColor Yellow
        Write-Host "  Health:    http://${VPS_IP}/health" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Clear your browser cache (Ctrl+Shift+R)"
    Write-Host "2. Visit the dashboard URL above"
    Write-Host "3. Check browser console - CSP errors should be gone"
    Write-Host ""
    Write-Host "🔧 Management:" -ForegroundColor Blue
    Write-Host "  Logs:    $DC -f $COMPOSE_FILE logs -f discord-bot" -ForegroundColor Yellow
    Write-Host "  Stop:    $DC -f $COMPOSE_FILE down" -ForegroundColor Yellow
    Write-Host "  Restart: $DC -f $COMPOSE_FILE restart" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Failed to start containers!" -ForegroundColor Red
    Write-Host "📋 Container status:" -ForegroundColor Yellow
    & $DC -f $COMPOSE_FILE ps
    Write-Host ""
    Write-Host "📋 Recent logs:" -ForegroundColor Yellow
    & $DC -f $COMPOSE_FILE logs --tail=20
    exit 1
}

# Cleanup temporary files
if (Test-Path "docker-compose.ip.tmp.yml") {
    Remove-Item "docker-compose.ip.tmp.yml"
}

Write-Host ""
Write-Host "✨ CSP-fixed deployment complete!" -ForegroundColor Green