#!/bin/bash

# Script untuk deployment ke VPS
# Usage: ./deploy.sh [environment]

set -e

# Colors untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (default: production)
ENV=${1:-production}

echo -e "${BLUE}🚀 Starting deployment for environment: ${ENV}${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}💡 Please copy .env.example to .env and configure it${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker Compose is not installed!${NC}"
    exit 1
fi

# Function to use docker-compose or docker compose
docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker_compose_cmd build --no-cache

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker_compose_cmd down

echo -e "${YELLOW}🧹 Cleaning up unused Docker resources...${NC}"
docker system prune -f

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker_compose_cmd up -d

echo -e "${YELLOW}📊 Checking container status...${NC}"
sleep 5
docker_compose_cmd ps

# Check if bot container is running
if docker_compose_cmd ps | grep -q "villain-seraphyx-bot.*Up"; then
    echo -e "${GREEN}✅ Bot container is running successfully!${NC}"
else
    echo -e "${RED}❌ Bot container failed to start!${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    docker_compose_cmd logs discord-bot
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "  View logs: ${YELLOW}docker-compose logs -f discord-bot${NC}"
echo -e "  Restart bot: ${YELLOW}docker-compose restart discord-bot${NC}"
echo -e "  Stop all: ${YELLOW}docker-compose down${NC}"
echo -e "  Update and restart: ${YELLOW}./deploy.sh${NC}"