#!/bin/bash

# Script untuk setup VPS untuk deployment Discord Bot
# Usage: ./setup-vps.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up VPS for Discord Bot deployment${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    htop \
    nano \
    unzip

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Install Node.js (untuk development tools)
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed successfully${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed${NC}"
fi

# Setup firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 9000  # Portainer
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create bot directory
echo -e "${YELLOW}📁 Creating bot directory...${NC}"
mkdir -p ~/discord-bot
cd ~/discord-bot

# Setup log rotation
echo -e "${YELLOW}📋 Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/discord-bot > /dev/null <<EOF
/home/$USER/discord-bot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create systemd service untuk auto-start
echo -e "${YELLOW}⚙️ Creating systemd service...${NC}"
sudo tee /etc/systemd/system/discord-bot.service > /dev/null <<EOF
[Unit]
Description=Discord Bot Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/discord-bot
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable discord-bot.service

# Setup monitoring script
echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
tee ~/discord-bot/monitor.sh > /dev/null <<'EOF'
#!/bin/bash

# Simple monitoring script untuk Discord Bot
LOG_FILE="~/discord-bot/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if container is running
if docker ps | grep -q "villain-seraphyx-bot"; then
    echo "[$DATE] ✅ Bot is running" >> $LOG_FILE
else
    echo "[$DATE] ❌ Bot is not running, attempting restart..." >> $LOG_FILE
    cd ~/discord-bot
    docker-compose restart discord-bot
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] ⚠️ Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "[$DATE] ⚠️ Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x ~/discord-bot/monitor.sh

# Setup cron job untuk monitoring
echo -e "${YELLOW}⏰ Setting up monitoring cron job...${NC}"
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/discord-bot/monitor.sh") | crontab -

echo -e "${GREEN}🎉 VPS setup completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "  1. ${YELLOW}Logout and login again${NC} (untuk Docker group permissions)"
echo -e "  2. ${YELLOW}Clone your bot repository${NC} ke ~/discord-bot/"
echo -e "  3. ${YELLOW}Copy .env.example to .env${NC} dan configure"
echo -e "  4. ${YELLOW}Run ./deploy.sh${NC} untuk start bot"
echo -e "  5. ${YELLOW}Access Portainer${NC} di http://your-vps-ip:9000"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "  Monitor bot: ${YELLOW}docker-compose logs -f discord-bot${NC}"
echo -e "  Check status: ${YELLOW}docker-compose ps${NC}"
echo -e "  View monitoring: ${YELLOW}tail -f ~/discord-bot/logs/monitor.log${NC}"