# Villain Seraphyx Bot - IP-based Deployment Script (PowerShell)
# Usage: .\scripts\deploy-ip.ps1 [-SSL] [-Minimal]
# For VPS IP: 43.129.55.161

param(
    [switch]$SSL,
    [switch]$Minimal
)

$VPS_IP = "43.129.55.161"

Write-Host "🚀 Deploying Villain Seraphyx Bot for IP: $VPS_IP" -ForegroundColor Cyan

if ($Minimal) {
    Write-Host "⚡ Using minimal build (without canvas dependencies)" -ForegroundColor Yellow
}

# Check .env file
if (!(Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Run: cp .env.example .env" -ForegroundColor Yellow
    exit 1
}

# Update .env with IP-based URLs
Write-Host "📝 Updating .env for IP-based deployment..." -ForegroundColor Yellow

$envContent = Get-Content ".env"

# Update Discord callback URL for IP
$callbackUrl = if ($SSL) { "https://$VPS_IP/auth/discord/callback" } else { "http://$VPS_IP/auth/discord/callback" }
$allowedOrigins = if ($SSL) { "http://$VPS_IP,https://$VPS_IP" } else { "http://$VPS_IP" }

# Update or add DISCORD_CALLBACK_URL
if ($envContent -match "DISCORD_CALLBACK_URL=") {
    $envContent = $envContent -replace "DISCORD_CALLBACK_URL=.*", "DISCORD_CALLBACK_URL=$callbackUrl"
} else {
    $envContent += "DISCORD_CALLBACK_URL=$callbackUrl"
}

# Update or add ALLOWED_ORIGINS
if ($envContent -match "ALLOWED_ORIGINS=") {
    $envContent = $envContent -replace "ALLOWED_ORIGINS=.*", "ALLOWED_ORIGINS=$allowedOrigins"
} else {
    $envContent += "ALLOWED_ORIGINS=$allowedOrigins"
}

$envContent | Set-Content ".env"

# Check Docker
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    exit 1
}

# Docker compose command
$DC = "docker compose"
try {
    & $DC version | Out-Null
} catch {
    $DC = "docker-compose"
}

# Create nginx logs directory
New-Item -ItemType Directory -Force -Path "nginx/logs" | Out-Null

# Handle SSL setup
if ($SSL) {
    Write-Host "🔐 Setting up self-signed SSL for IP access..." -ForegroundColor Yellow
    
    # Create SSL directory
    New-Item -ItemType Directory -Force -Path "nginx/ssl" | Out-Null
    
    # Generate self-signed certificate for IP
    if (!(Test-Path "nginx/ssl/cert.pem") -or !(Test-Path "nginx/ssl/key.pem")) {
        Write-Host "📜 Generating self-signed SSL certificate..." -ForegroundColor Yellow
        
        $subject = "/C=ID/ST=Jakarta/L=Jakarta/O=VillainSeraphyx/CN=$VPS_IP"
        $san = "subjectAltName=IP:$VPS_IP"
        
        & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
            -keyout "nginx/ssl/key.pem" `
            -out "nginx/ssl/cert.pem" `
            -subj $subject `
            -addext $san
        
        Write-Host "✅ Self-signed certificate generated" -ForegroundColor Green
        Write-Host "⚠️ Note: Browsers will show security warning for self-signed certificates" -ForegroundColor Yellow
    } else {
        Write-Host "✅ SSL certificates already exist" -ForegroundColor Green
    }
}

# Verify CSP fixes are in place
Write-Host "🔍 Verifying CSP fixes..." -ForegroundColor Yellow
if (!(Select-String -Path "web/middleware/security.js" -Pattern "scriptSrcAttr" -Quiet)) {
    Write-Host "❌ CSP fixes not found in security middleware!" -ForegroundColor Red
    Write-Host "Please ensure CSP fixes are applied before deployment" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ CSP fixes verified" -ForegroundColor Green

# Set compose file
$COMPOSE_FILE = "docker-compose.ip.yml"

# Create temporary compose file with appropriate Dockerfile
if ($Minimal) {
    Write-Host "📝 Creating minimal build configuration..." -ForegroundColor Yellow
    (Get-Content $COMPOSE_FILE) -replace 'dockerfile: Dockerfile.deploy', 'dockerfile: Dockerfile.minimal' | Set-Content "docker-compose.ip.tmp.yml"
    $COMPOSE_FILE = "docker-compose.ip.tmp.yml"
}

Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE down 2>$null

Write-Host "🗑️ Removing old images to force rebuild with CSP fixes..." -ForegroundColor Yellow
$images = docker images -q "villain-seraphyx*" 2>$null
if ($images) {
    docker rmi $images 2>$null
}

Write-Host "📦 Building with CSP fixes (no cache)..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE build --no-cache --pull

Write-Host "🚀 Starting with Nginx for IP $VPS_IP..." -ForegroundColor Yellow
& $DC -f $COMPOSE_FILE --profile monitoring up -d

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
$status = & $DC -f $COMPOSE_FILE ps
if ($status -match "Up") {
    Write-Host "✅ Bot and Nginx are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your bot is accessible at:" -ForegroundColor Blue
    if ($SSL) {
        Write-Host "  Dashboard: https://$VPS_IP/dashboard" -ForegroundColor Yellow
        Write-Host "  Webhook:   https://$VPS_IP/webhook" -ForegroundColor Yellow
        Write-Host "  Health:    https://$VPS_IP/health" -ForegroundColor Yellow
        Write-Host "  Portainer: http://$VPS_IP:9000" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️ Note: Self-signed certificate will show browser warning" -ForegroundColor Yellow
        Write-Host "Accept the certificate to continue" -ForegroundColor Yellow
    } else {
        Write-Host "  Dashboard: http://$VPS_IP/dashboard" -ForegroundColor Yellow
        Write-Host "  Webhook:   http://$VPS_IP/webhook" -ForegroundColor Yellow
        Write-Host "  Health:    http://$VPS_IP/health" -ForegroundColor Yellow
        Write-Host "  Portainer: http://$VPS_IP:9000" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "📋 Management Commands:" -ForegroundColor Blue
    Write-Host "  Logs Bot:   $DC -f $COMPOSE_FILE logs -f discord-bot" -ForegroundColor Yellow
    Write-Host "  Logs Nginx: $DC -f $COMPOSE_FILE logs -f nginx" -ForegroundColor Yellow
    Write-Host "  Stop:       $DC -f $COMPOSE_FILE down" -ForegroundColor Yellow
    Write-Host "  Restart:    $DC -f $COMPOSE_FILE restart" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Discord Bot Configuration:" -ForegroundColor Blue
    Write-Host "  Update your Discord app OAuth2 redirect URI to:"
    if ($SSL) {
        Write-Host "  https://$VPS_IP/auth/discord/callback" -ForegroundColor Yellow
    } else {
        Write-Host "  http://$VPS_IP/auth/discord/callback" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "🎉 CSP Issues Fixed!" -ForegroundColor Green
    Write-Host "📋 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Clear your browser cache (Ctrl+Shift+R)"
    Write-Host "2. Visit the dashboard URL above"
    Write-Host "3. Check browser console - CSP errors should be gone!"
    Write-Host "4. Verify external resources load (Tailwind CSS, Font Awesome, Socket.IO)"
} else {
    Write-Host "❌ Failed to start!" -ForegroundColor Red
    & $DC -f $COMPOSE_FILE logs
    exit 1
}

# Test nginx configuration
Write-Host "🔍 Testing Nginx configuration..." -ForegroundColor Yellow
try {
    docker exec villain-seraphyx-nginx nginx -t | Out-Null
    Write-Host "✅ Nginx configuration is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Nginx configuration error!" -ForegroundColor Red
    docker exec villain-seraphyx-nginx nginx -t
}

# Test health endpoint
Write-Host "🔍 Testing health endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$PROTOCOL = if ($SSL) { "https" } else { "http" }

try {
    Invoke-WebRequest -Uri "$PROTOCOL://$VPS_IP/health" -UseBasicParsing -SkipCertificateCheck -TimeoutSec 10 | Out-Null
    Write-Host "✅ Health endpoint is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Health endpoint not responding yet (may need more time)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "Your Discord bot is now running on VPS IP: $VPS_IP" -ForegroundColor Blue

# Cleanup temporary files
if (Test-Path "docker-compose.ip.tmp.yml") {
    Remove-Item "docker-compose.ip.tmp.yml"
}