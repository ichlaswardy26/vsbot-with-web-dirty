#!/bin/bash

# Quick Deploy Script - Minimal build for fast deployment
# Usage: ./scripts/quick-deploy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}⚡ Quick Deploy for IP: ${VPS_IP}${NC}"
echo -e "${YELLOW}Using minimal build (no canvas dependencies)${NC}"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Run: cp .env.example .env${NC}"
    exit 1
fi

# Update .env for IP-based deployment
echo -e "${YELLOW}📝 Updating .env for IP-based deployment...${NC}"

# Update Discord callback URL for IP
if grep -q "DISCORD_CALLBACK_URL=" .env; then
    sed -i "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback|" .env
else
    echo "DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback" >> .env
fi

# Update allowed origins
if grep -q "ALLOWED_ORIGINS=" .env; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://${VPS_IP},https://${VPS_IP}|" .env
else
    echo "ALLOWED_ORIGINS=http://${VPS_IP},https://${VPS_IP}" >> .env
fi

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

# Setup SSL
echo -e "${YELLOW}🔐 Setting up self-signed SSL...${NC}"
mkdir -p nginx/ssl

if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo -e "${YELLOW}📜 Generating self-signed SSL certificate...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=VillainSeraphyx/CN=${VPS_IP}" \
        -addext "subjectAltName=IP:${VPS_IP}"
    echo -e "${GREEN}✅ SSL certificate generated${NC}"
else
    echo -e "${GREEN}✅ SSL certificates already exist${NC}"
fi

# Create minimal docker-compose
echo -e "${YELLOW}📝 Creating minimal deployment configuration...${NC}"
cat > docker-compose.minimal.yml << 'EOF'
services:
  discord-bot:
    build:
      context: .
      dockerfile: Dockerfile.minimal
    container_name: villain-seraphyx-bot
    restart: always
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - SERVER_IP=43.129.55.161
    volumes:
      - ./logs:/app/logs
    expose:
      - "3000"
      - "3001"
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - bot-network

  nginx:
    image: nginx:1.25-alpine
    container_name: villain-seraphyx-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-ip.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/logs:/var/log/nginx
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      discord-bot:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "3"
    networks:
      - bot-network

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - bot-network

networks:
  bot-network:
    driver: bridge

volumes:
  portainer_data:
EOF

# Create logs directory
mkdir -p nginx/logs

echo -e "${YELLOW}📦 Building minimal version...${NC}"
$DC -f docker-compose.minimal.yml build

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DC -f docker-compose.minimal.yml down 2>/dev/null || true

echo -e "${YELLOW}🚀 Starting minimal deployment...${NC}"
$DC -f docker-compose.minimal.yml up -d

sleep 10

# Check status
if $DC -f docker-compose.minimal.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Bot and Nginx are running!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Your bot is accessible at:${NC}"
    echo -e "  Dashboard: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
    echo -e "  Webhook:   ${YELLOW}https://${VPS_IP}/webhook${NC}"
    echo -e "  Health:    ${YELLOW}https://${VPS_IP}/health${NC}"
    echo -e "  Portainer: ${YELLOW}http://${VPS_IP}:9000${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Self-signed certificate will show browser warning${NC}"
    echo -e "${YELLOW}Accept the certificate to continue${NC}"
    echo ""
    echo -e "${BLUE}📋 Management Commands:${NC}"
    echo -e "  Logs Bot:   ${YELLOW}$DC -f docker-compose.minimal.yml logs -f discord-bot${NC}"
    echo -e "  Logs Nginx: ${YELLOW}$DC -f docker-compose.minimal.yml logs -f nginx${NC}"
    echo -e "  Stop:       ${YELLOW}$DC -f docker-compose.minimal.yml down${NC}"
    echo -e "  Restart:    ${YELLOW}$DC -f docker-compose.minimal.yml restart${NC}"
    echo ""
    echo -e "${BLUE}🔧 Discord Bot Configuration:${NC}"
    echo -e "  Update your Discord app OAuth2 redirect URI to:"
    echo -e "  ${YELLOW}https://${VPS_IP}/auth/discord/callback${NC}"
    echo ""
    echo -e "${GREEN}🎉 Quick deployment complete!${NC}"
    echo -e "${YELLOW}Note: Canvas-based features (image generation) are disabled in this build${NC}"
else
    echo -e "${RED}❌ Failed to start!${NC}"
    $DC -f docker-compose.minimal.yml logs
    exit 1
fi

# Test health endpoint
echo -e "${YELLOW}🔍 Testing health endpoint...${NC}"
sleep 3
if curl -k -s https://${VPS_IP}/health > /dev/null; then
    echo -e "${GREEN}✅ Health endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Health endpoint not responding yet (may need more time)${NC}"
fi