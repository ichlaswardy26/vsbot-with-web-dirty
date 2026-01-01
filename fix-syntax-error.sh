#!/bin/bash

# Fix Syntax Error and Restart Container
echo "🔧 Fixing syntax error and restarting container..."

# Stop the current container
echo "1️⃣ Stopping container..."
docker compose down villain-seraphyx-bot

# Rebuild with the fixed code
echo "2️⃣ Rebuilding container with syntax fix..."
docker compose build --no-cache villain-seraphyx-bot

# Start the container
echo "3️⃣ Starting container..."
docker compose up -d villain-seraphyx-bot

# Wait a moment for startup
echo "4️⃣ Waiting for startup..."
sleep 10

# Check if it's running
echo "5️⃣ Checking container status..."
docker compose ps villain-seraphyx-bot

# Show recent logs
echo "6️⃣ Showing startup logs..."
docker compose logs --tail=20 villain-seraphyx-bot

echo "✅ Syntax error fix complete!"
echo "🌐 Dashboard should be available at: https://43.129.55.161/dashboard"