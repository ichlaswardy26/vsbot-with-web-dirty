#!/bin/bash

# Villain Seraphyx Bot - IP-based Deployment Script
# Usage: ./scripts/deploy-ip.sh [--ssl]
# For VPS IP: 43.129.55.161

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SSL_FLAG=$1
VPS_IP="43.129.55.161"

echo -e "${BLUE}🚀 Deploying Villain Seraphyx Bot for IP: ${VPS_IP}${NC}"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Run: cp .env.example .env${NC}"
    exit 1
fi

# Update .env with IP-based URLs
echo -e "${YELLOW}📝 Updating .env for IP-based deployment...${NC}"

# Update Discord callback URL for IP
if grep -q "DISCORD_CALLBACK_URL=" .env; then
    if [ "$SSL_FLAG" = "--ssl" ]; then
        sed -i "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback|" .env
    else
        sed -i "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=http://${VPS_IP}/auth/discord/callback|" .env
    fi
else
    if [ "$SSL_FLAG" = "--ssl" ]; then
        echo "DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback" >> .env
    else
        echo "DISCORD_CALLBACK_URL=http://${VPS_IP}/auth/discord/callback" >> .env
    fi
fi

# Update allowed origins
if grep -q "ALLOWED_ORIGINS=" .env; then
    if [ "$SSL_FLAG" = "--ssl" ]; then
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://${VPS_IP},https://${VPS_IP}|" .env
    else
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://${VPS_IP}|" .env
    fi
else
    if [ "$SSL_FLAG" = "--ssl" ]; then
        echo "ALLOWED_ORIGINS=http://${VPS_IP},https://${VPS_IP}" >> .env
    else
        echo "ALLOWED_ORIGINS=http://${VPS_IP}" >> .env
    fi
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

# Create nginx logs directory
mkdir -p nginx/logs

# Handle SSL setup
if [ "$SSL_FLAG" = "--ssl" ]; then
    echo -e "${YELLOW}🔐 Setting up self-signed SSL for IP access...${NC}"
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate for IP
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        echo -e "${YELLOW}📜 Generating self-signed SSL certificate...${NC}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=ID/ST=Jakarta/L=Jakarta/O=VillainSeraphyx/CN=${VPS_IP}" \
            -addext "subjectAltName=IP:${VPS_IP}"
        
        echo -e "${GREEN}✅ Self-signed certificate generated${NC}"
        echo -e "${YELLOW}⚠️  Note: Browsers will show security warning for self-signed certificates${NC}"
    else
        echo -e "${GREEN}✅ SSL certificates already exist${NC}"
    fi
fi

# Set compose file
COMPOSE_FILE="docker-compose.ip.yml"

echo -e "${YELLOW}📦 Building...${NC}"
$DC -f $COMPOSE_FILE build

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DC -f $COMPOSE_FILE down 2>/dev/null || true

echo -e "${YELLOW}🚀 Starting with Nginx for IP ${VPS_IP}...${NC}"
$DC -f $COMPOSE_FILE --profile monitoring up -d

sleep 5

# Check status
if $DC -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Bot and Nginx are running!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Your bot is accessible at:${NC}"
    if [ "$SSL_FLAG" = "--ssl" ]; then
        echo -e "  Dashboard: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
        echo -e "  Webhook:   ${YELLOW}https://${VPS_IP}/webhook${NC}"
        echo -e "  Health:    ${YELLOW}https://${VPS_IP}/health${NC}"
        echo -e "  Portainer: ${YELLOW}http://${VPS_IP}:9000${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Note: Self-signed certificate will show browser warning${NC}"
        echo -e "${YELLOW}Accept the certificate to continue${NC}"
    else
        echo -e "  Dashboard: ${YELLOW}http://${VPS_IP}/dashboard${NC}"
        echo -e "  Webhook:   ${YELLOW}http://${VPS_IP}/webhook${NC}"
        echo -e "  Health:    ${YELLOW}http://${VPS_IP}/health${NC}"
        echo -e "  Portainer: ${YELLOW}http://${VPS_IP}:9000${NC}"
    fi
    echo ""
    echo -e "${BLUE}📋 Management Commands:${NC}"
    echo -e "  Logs Bot:   ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
    echo -e "  Logs Nginx: ${YELLOW}$DC -f $COMPOSE_FILE logs -f nginx${NC}"
    echo -e "  Stop:       ${YELLOW}$DC -f $COMPOSE_FILE down${NC}"
    echo -e "  Restart:    ${YELLOW}$DC -f $COMPOSE_FILE restart${NC}"
    echo ""
    echo -e "${BLUE}🔧 Discord Bot Configuration:${NC}"
    echo -e "  Update your Discord app OAuth2 redirect URI to:"
    if [ "$SSL_FLAG" = "--ssl" ]; then
        echo -e "  ${YELLOW}https://${VPS_IP}/auth/discord/callback${NC}"
    else
        echo -e "  ${YELLOW}http://${VPS_IP}/auth/discord/callback${NC}"
    fi
else
    echo -e "${RED}❌ Failed to start!${NC}"
    $DC -f $COMPOSE_FILE logs
    exit 1
fi

# Test nginx configuration
echo -e "${YELLOW}🔍 Testing Nginx configuration...${NC}"
if docker exec villain-seraphyx-nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration error!${NC}"
    docker exec villain-seraphyx-nginx nginx -t
fi

# Test health endpoint
echo -e "${YELLOW}🔍 Testing health endpoint...${NC}"
sleep 2
PROTOCOL="http"
if [ "$SSL_FLAG" = "--ssl" ]; then
    PROTOCOL="https"
fi

if curl -k -s ${PROTOCOL}://${VPS_IP}/health > /dev/null; then
    echo -e "${GREEN}✅ Health endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Health endpoint not responding yet (may need more time)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}Your Discord bot is now running on VPS IP: ${VPS_IP}${NC}"