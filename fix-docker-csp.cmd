@echo off
echo 🔧 Deploying with CSP fixes...
echo.

echo 🔍 Verifying CSP fixes...
findstr /C:"scriptSrcAttr" web\middleware\security.js >nul
if errorlevel 1 (
    echo ❌ CSP fixes not found in security middleware!
    echo Please ensure CSP fixes are applied before deployment
    pause
    exit /b 1
)
echo ✅ CSP fixes verified
echo.

echo 🛑 Stopping existing containers...
docker compose -f docker-compose.ip.yml down 2>nul

echo 🗑️ Removing old images to force rebuild...
for /f "tokens=*" %%i in ('docker images -q villain-seraphyx* 2^>nul') do docker rmi %%i 2>nul

echo 📦 Building with CSP fixes (no cache)...
docker compose -f docker-compose.ip.yml build --no-cache --pull

echo 🚀 Starting containers...
docker compose -f docker-compose.ip.yml --profile monitoring up -d

echo.
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo 🎉 Deployment complete with CSP fixes!
echo.
echo 🌐 Your dashboard: http://43.129.55.161/dashboard
echo.
echo 📋 Next Steps:
echo 1. Clear browser cache (Ctrl+Shift+R)
echo 2. Visit the dashboard URL above
echo 3. Check browser console - CSP errors should be gone!
echo 4. Verify external resources load properly
echo.
echo 📊 Check status: docker compose -f docker-compose.ip.yml ps
echo 📋 View logs: docker compose -f docker-compose.ip.yml logs -f discord-bot
echo.
pause