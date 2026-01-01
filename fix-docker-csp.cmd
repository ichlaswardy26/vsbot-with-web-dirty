@echo off
echo 🔧 Fixing Docker CSP issues...
echo.

echo 🛑 Stopping existing containers...
docker compose -f docker-compose.ip.yml down 2>nul

echo 🗑️ Removing old images...
for /f "tokens=*" %%i in ('docker images -q villain-seraphyx* 2^>nul') do docker rmi %%i 2>nul

echo 📦 Rebuilding with CSP fixes...
docker compose -f docker-compose.ip.yml build --no-cache

echo 🚀 Starting containers...
docker compose -f docker-compose.ip.yml --profile monitoring up -d

echo.
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo 🎉 Docker rebuild complete!
echo.
echo 🌐 Your dashboard: http://43.129.55.161/dashboard
echo 📋 Clear browser cache (Ctrl+Shift+R) and test!
echo.
echo 📊 Check status: docker compose -f docker-compose.ip.yml ps
echo 📋 View logs: docker compose -f docker-compose.ip.yml logs -f discord-bot
echo.
pause