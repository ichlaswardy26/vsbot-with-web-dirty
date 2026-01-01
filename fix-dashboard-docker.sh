#!/bin/bash

# Complete Dashboard Docker Fix
echo "🔧 Fixing Dashboard Docker Issues..."

# 1. Fix permissions in the container
echo "1️⃣ Fixing file permissions..."
docker compose exec villain-seraphyx-bot bash -c "
    mkdir -p /app/logs/audit /app/logs/web
    touch /app/logs/app.log /app/logs/bot.log /app/logs/audit/audit.log /app/logs/web/access.log /app/logs/web/error.log
    chmod -R 755 /app/logs
    chmod 644 /app/logs/*.log /app/logs/audit/*.log /app/logs/web/*.log 2>/dev/null || true
    ls -la /app/logs/
"

# 2. Restart the container with fixed permissions
echo "2️⃣ Rebuilding container with fixes..."
docker compose down
docker compose build --no-cache villain-seraphyx-bot
docker compose up -d villain-seraphyx-bot

# 3. Wait for startup
echo "3️⃣ Waiting for services to start..."
sleep 10

# 4. Check dashboard health
echo "4️⃣ Testing dashboard health..."
curl -s -o /dev/null -w "%{http_code}" http://43.129.55.161:3001/health || echo "Health check failed"

# 5. Show logs
echo "5️⃣ Showing recent logs..."
docker compose logs --tail=20 villain-seraphyx-bot

echo "✅ Dashboard Docker fix complete!"
echo "🌐 Dashboard should be available at: https://43.129.55.161/dashboard"