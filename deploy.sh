#!/bin/bash

# Villain Seraphyx Bot - Deployment Script
# Usage: ./deploy.sh [dev|prod]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV=${1:-prod}

echo -e "${BLUE}🚀 Deploying Villain Seraphyx Bot [${ENV}]${NC}"

# Validate environment
if [[ ! "$ENV" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Use: ./deploy.sh [dev|prod]${NC}"
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

# Set compose file
if [ "$ENV" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
else
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo -e "${YELLOW}📦 Building...${NC}"
$DC -f $COMPOSE_FILE build

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DC -f $COMPOSE_FILE down 2>/dev/null || true

echo -e "${YELLOW}🚀 Starting...${NC}"
$DC -f $COMPOSE_FILE up -d

sleep 3

# Check status
if $DC -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Bot is running!${NC}"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo -e "  Logs:    ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
    echo -e "  Stop:    ${YELLOW}$DC -f $COMPOSE_FILE down${NC}"
    echo -e "  Restart: ${YELLOW}$DC -f $COMPOSE_FILE restart${NC}"
else
    echo -e "${RED}❌ Failed to start!${NC}"
    $DC -f $COMPOSE_FILE logs discord-bot
    exit 1
fi
