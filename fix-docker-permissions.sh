#!/bin/bash

# Fix Docker Container Permissions
echo "🔧 Fixing Docker container permissions..."

# Create logs directories with proper permissions
echo "📁 Creating log directories..."
mkdir -p logs/audit
mkdir -p logs/web
chmod -R 755 logs/

# Fix ownership if running as root
if [ "$EUID" -eq 0 ]; then
    echo "👤 Fixing ownership for non-root user..."
    chown -R node:node logs/ 2>/dev/null || chown -R 1000:1000 logs/
fi

# Create log files with proper permissions
echo "📝 Creating log files..."
touch logs/app.log
touch logs/bot.log
touch logs/web/access.log
touch logs/web/error.log
touch logs/audit/audit.log

# Set proper permissions
chmod 644 logs/*.log
chmod 644 logs/web/*.log
chmod 644 logs/audit/*.log

echo "✅ Permissions fixed successfully!"
echo "📊 Log directory structure:"
ls -la logs/
ls -la logs/web/ 2>/dev/null || echo "  web/ directory not accessible"
ls -la logs/audit/ 2>/dev/null || echo "  audit/ directory not accessible"