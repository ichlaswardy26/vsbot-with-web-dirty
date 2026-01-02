#!/bin/bash

# Fix Nginx configuration and restart
echo "🔧 Fixing Nginx configuration..."

# Stop and restart nginx container with new config
docker compose -f docker-compose.ip.yml restart nginx

echo "⏳ Waiting for nginx to start..."
sleep 5

# Test nginx configuration
echo "🔍 Testing Nginx configuration..."
if docker exec villain-seraphyx-nginx nginx -t; then
    echo "✅ Nginx configuration is now valid!"
else
    echo "❌ Nginx configuration still has issues"
    docker exec villain-seraphyx-nginx nginx -t
    exit 1
fi

# Test health endpoint
echo "🔍 Testing health endpoint..."
if curl -s http://43.129.55.161/health > /dev/null; then
    echo "✅ Health endpoint is responding!"
    echo "🎉 Nginx is now working correctly!"
    echo ""
    echo "🌐 Your bot is accessible at:"
    echo "  Dashboard: http://43.129.55.161/dashboard"
    echo "  Webhook:   http://43.129.55.161/webhook"
    echo "  Health:    http://43.129.55.161/health"
else
    echo "⚠️  Health endpoint not responding yet"
    echo "Checking nginx logs..."
    docker compose -f docker-compose.ip.yml logs nginx --tail=20
fi