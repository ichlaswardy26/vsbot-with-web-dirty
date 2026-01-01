#!/bin/bash

# Apply Security Middleware Fix
# Fixes the "Request contains suspicious content" error

set -e

echo "🛡️ Applying security middleware fix..."

# Check if docker-compose is available
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

COMPOSE_FILE="docker-compose.ip.yml"

echo "📋 Current container status:"
$DC -f $COMPOSE_FILE ps

echo ""
echo "🔄 Restarting Discord bot container to apply security fixes..."

# Restart just the bot container to pick up code changes
$DC -f $COMPOSE_FILE restart discord-bot

echo "⏳ Waiting for container to start..."
sleep 10

# Check if container is running
if $DC -f $COMPOSE_FILE ps discord-bot | grep -q "Up"; then
    echo "✅ Container restarted successfully"
    
    echo ""
    echo "🧪 Testing basic navigation..."
    
    # Test health endpoint
    if curl -k -s https://43.129.55.161/health > /dev/null; then
        echo "✅ Health endpoint working"
    else
        echo "⚠️ Health endpoint not responding yet"
    fi
    
    # Test root endpoint
    if curl -k -s https://43.129.55.161/ > /dev/null; then
        echo "✅ Root endpoint working"
    else
        echo "⚠️ Root endpoint not responding yet"
    fi
    
    echo ""
    echo "🎉 Security fix applied successfully!"
    echo ""
    echo "🌐 Try accessing: https://43.129.55.161"
    echo "📊 Dashboard: https://43.129.55.161/dashboard"
    echo "🔍 Health: https://43.129.55.161/health"
    echo ""
    echo "📋 Monitor logs with:"
    echo "  $DC -f $COMPOSE_FILE logs -f discord-bot"
    
else
    echo "❌ Container failed to start properly"
    echo ""
    echo "📋 Check logs:"
    $DC -f $COMPOSE_FILE logs --tail 20 discord-bot
    echo ""
    echo "🔧 Try full rebuild:"
    echo "  $DC -f $COMPOSE_FILE down"
    echo "  $DC -f $COMPOSE_FILE build --no-cache"
    echo "  $DC -f $COMPOSE_FILE up -d"
fi