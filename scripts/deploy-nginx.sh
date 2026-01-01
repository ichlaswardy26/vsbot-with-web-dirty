#!/bin/bash

# Villain Seraphyx Bot - Nginx Deployment Script
# Usage: ./scripts/deploy-nginx.sh [dev|prod] [--ssl]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV=${1:-prod}
SSL_FLAG=$2

echo -e "${BLUE}🚀 Deploying Villain Seraphyx Bot with Nginx [${ENV}]${NC}"

# Validate environment
if [[ ! "$ENV" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Use: ./scripts/deploy-nginx.sh [dev|prod] [--ssl]${NC}"
    exit 1
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Run: cp .env.example .env${NC}"
    exit 1
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

# Check SSL configuration
if [ "$SSL_FLAG" = "--ssl" ]; then
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        echo -e "${YELLOW}⚠️  SSL certificates not found!${NC}"
        echo -e "${YELLOW}Please add cert.pem and key.pem to nginx/ssl/ directory${NC}"
        echo -e "${YELLOW}See nginx/ssl/README.md for instructions${NC}"
        read -p "Continue without SSL? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ SSL certificates found${NC}"
        # Enable SSL in nginx config
        sed -i 's/# ssl_certificate/ssl_certificate/g' nginx/nginx.conf
        sed -i 's/# ssl_/ssl_/g' nginx/nginx.conf
        sed -i 's/# add_header Strict-Transport-Security/add_header Strict-Transport-Security/g' nginx/nginx.conf
    fi
fi

# Set compose file
COMPOSE_FILE="docker-compose.nginx.yml"

echo -e "${YELLOW}📦 Building...${NC}"
$DC -f $COMPOSE_FILE build

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DC -f $COMPOSE_FILE down 2>/dev/null || true

echo -e "${YELLOW}🚀 Starting with Nginx...${NC}"
if [ "$ENV" = "prod" ]; then
    $DC -f $COMPOSE_FILE --profile monitoring up -d
else
    $DC -f $COMPOSE_FILE up -d
fi

sleep 5

# Check status
if $DC -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Bot and Nginx are running!${NC}"
    echo ""
    echo -e "${BLUE}Services:${NC}"
    echo -e "  Dashboard: ${YELLOW}http://localhost/dashboard${NC}"
    echo -e "  Webhook:   ${YELLOW}http://localhost/webhook${NC}"
    echo -e "  Health:    ${YELLOW}http://localhost/health${NC}"
    if [ "$ENV" = "prod" ]; then
        echo -e "  Portainer: ${YELLOW}http://localhost:9000${NC}"
    fi
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo -e "  Logs Bot:   ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
    echo -e "  Logs Nginx: ${YELLOW}$DC -f $COMPOSE_FILE logs -f nginx${NC}"
    echo -e "  Stop:       ${YELLOW}$DC -f $COMPOSE_FILE down${NC}"
    echo -e "  Restart:    ${YELLOW}$DC -f $COMPOSE_FILE restart${NC}"
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
if curl -s http://localhost/health > /dev/null; then
    echo -e "${GREEN}✅ Health endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Health endpoint not responding yet (may need more time)${NC}"
fi