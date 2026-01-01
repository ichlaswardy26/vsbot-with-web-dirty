#!/bin/bash

# Villain Seraphyx Bot - Auto SSL Setup Script
# Usage: ./scripts/setup-ssl.sh yourdomain.com your@email.com

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Usage: ./scripts/setup-ssl.sh yourdomain.com your@email.com${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Setting up Auto SSL for ${DOMAIN}${NC}"

# Check if domain resolves to this server
echo -e "${YELLOW}🔍 Checking domain resolution...${NC}"
DOMAIN_IP=$(dig +short $DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  Warning: Domain $DOMAIN resolves to $DOMAIN_IP but server IP is $SERVER_IP${NC}"
    echo -e "${YELLOW}Make sure your domain points to this server before continuing${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create SSL environment file
echo -e "${YELLOW}📝 Creating SSL environment...${NC}"
cat > .env.ssl << EOF
# SSL Configuration
DOMAIN=$DOMAIN
SSL_EMAIL=$EMAIL
EOF

echo -e "${GREEN}✅ SSL environment created${NC}"

# Create certbot directories
mkdir -p certbot/conf
mkdir -p certbot/www

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

echo -e "${YELLOW}🚀 Starting initial SSL setup...${NC}"

# Start nginx first (without SSL)
echo -e "${YELLOW}📦 Starting nginx for ACME challenge...${NC}"
$DC -f docker-compose.nginx.yml up -d nginx

sleep 5

# Get initial certificate
echo -e "${YELLOW}🔐 Requesting SSL certificate from Let's Encrypt...${NC}"
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "  - Domain $DOMAIN points to this server"
    echo -e "  - Port 80 is accessible from internet"
    echo -e "  - No firewall blocking HTTP traffic"
    exit 1
fi

# Stop nginx
$DC -f docker-compose.nginx.yml down

echo -e "${YELLOW}🔄 Switching to SSL configuration...${NC}"

# Update nginx config with domain
sed "s/\${DOMAIN}/$DOMAIN/g" nginx/nginx-ssl.conf > nginx/nginx-ssl-configured.conf

# Start full SSL setup
echo -e "${YELLOW}🚀 Starting with SSL enabled...${NC}"
DOMAIN=$DOMAIN SSL_EMAIL=$EMAIL $DC -f docker-compose.ssl.yml up -d

sleep 10

# Test SSL
echo -e "${YELLOW}🔍 Testing SSL configuration...${NC}"
if curl -s -I https://$DOMAIN/health > /dev/null; then
    echo -e "${GREEN}✅ SSL is working correctly!${NC}"
    echo ""
    echo -e "${BLUE}🎉 Auto SSL setup complete!${NC}"
    echo ""
    echo -e "${GREEN}Your bot is now available at:${NC}"
    echo -e "  Dashboard: ${YELLOW}https://$DOMAIN/dashboard${NC}"
    echo -e "  Webhook:   ${YELLOW}https://$DOMAIN/webhook${NC}"
    echo -e "  Health:    ${YELLOW}https://$DOMAIN/health${NC}"
    echo ""
    echo -e "${BLUE}SSL Certificate Info:${NC}"
    echo -e "  Domain: ${YELLOW}$DOMAIN${NC}"
    echo -e "  Email:  ${YELLOW}$EMAIL${NC}"
    echo -e "  Auto-renewal: ${GREEN}Enabled (every 12 hours)${NC}"
    echo ""
    echo -e "${BLUE}Management Commands:${NC}"
    echo -e "  Logs:    ${YELLOW}$DC -f docker-compose.ssl.yml logs -f${NC}"
    echo -e "  Restart: ${YELLOW}$DC -f docker-compose.ssl.yml restart${NC}"
    echo -e "  Stop:    ${YELLOW}$DC -f docker-compose.ssl.yml down${NC}"
else
    echo -e "${RED}❌ SSL test failed${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    $DC -f docker-compose.ssl.yml logs nginx
    exit 1
fi