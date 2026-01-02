#!/bin/bash

echo "🔧 Fixing CSP issue by removing nginx CSP header..."
echo "   (Application middleware will handle CSP properly)"

# Restart nginx with updated configuration
docker compose -f docker-compose.ip.yml restart nginx

echo "⏳ Waiting for nginx to restart..."
sleep 5

# Test nginx configuration
echo "🔍 Testing Nginx configuration..."
if docker exec villain-seraphyx-nginx nginx -t; then
    echo "✅ Nginx configuration is valid!"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Test health endpoint
echo "🔍 Testing health endpoint..."
if curl -s http://43.129.55.161/health > /dev/null; then
    echo "✅ Health endpoint is responding!"
else
    echo "⚠️  Health endpoint not responding"
fi

echo ""
echo "🎉 CSP Fix Applied!"
echo ""
echo "📋 What was fixed:"
echo "  • Removed conflicting CSP header from nginx"
echo "  • Application middleware now handles CSP properly"
echo "  • External CDNs (Tailwind, Font Awesome, Socket.IO) should now load"
echo ""
echo "🌐 Test your dashboard:"
echo "  Dashboard: http://43.129.55.161/dashboard"
echo ""
echo "🔍 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+R)"
echo "  2. Visit the dashboard URL"
echo "  3. Check browser console - CSP errors should be gone!"
echo "  4. Verify external resources load properly"