#!/bin/bash

# Villain Seraphyx Bot - VPS Setup Script
# Usage: ./scripts/setup-vps.sh

set -e

echo "🚀 Setting up VPS for Discord Bot"

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt install -y curl git htop

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 3000  # Webhook
sudo ufw allow 3001  # Dashboard
sudo ufw allow 9000  # Portainer (optional)

# Create bot directory
mkdir -p ~/discord-bot
cd ~/discord-bot

# Setup log rotation
echo "📋 Setting up log rotation..."
sudo tee /etc/logrotate.d/discord-bot > /dev/null <<EOF
$HOME/discord-bot/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Logout and login again (for Docker permissions)"
echo "  2. cd ~/discord-bot"
echo "  3. git clone <your-repo> ."
echo "  4. cp .env.example .env && nano .env"
echo "  5. ./deploy.sh prod"
