#!/bin/bash

# Complete Deployment Fix Script
# Addresses Docker build issues, security middleware problems, and deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}🚀 Complete Deployment Fix for Villain Seraphyx Bot${NC}"
echo -e "${BLUE}IP: ${VPS_IP}${NC}"
echo ""

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

COMPOSE_FILE="docker-compose.ip.yml"

echo -e "${YELLOW}1️⃣ Fixing Package Lock Issues...${NC}"

# Check if package-lock.json exists and is valid
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}📦 package-lock.json not found, generating...${NC}"
    rm -rf node_modules
    npm install
    echo -e "${GREEN}✅ package-lock.json generated${NC}"
elif ! npm ci --dry-run > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 package-lock.json appears corrupted, regenerating...${NC}"
    cp package-lock.json package-lock.json.backup
    rm -f package-lock.json
    rm -rf node_modules
    npm install
    echo -e "${GREEN}✅ package-lock.json regenerated${NC}"
    echo -e "${BLUE}📁 Backup saved as package-lock.json.backup${NC}"
else
    echo -e "${GREEN}✅ package-lock.json is valid${NC}"
fi

echo ""
echo -e "${YELLOW}2️⃣ Stopping Existing Containers...${NC}"

# Stop existing containers
$DC -f $COMPOSE_FILE down 2>/dev/null || true
echo -e "${GREEN}✅ Containers stopped${NC}"

echo ""
echo -e "${YELLOW}3️⃣ Cleaning Docker Environment...${NC}"

# Clean Docker system
docker system prune -f > /dev/null 2>&1 || true

# Remove old images
docker rmi villain-seraphyx-bot 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true

echo -e "${GREEN}✅ Docker environment cleaned${NC}"

echo ""
echo -e "${YELLOW}4️⃣ Building with Enhanced Configuration...${NC}"

# Build with no cache using the robust Dockerfile
echo -e "${BLUE}Using Dockerfile.deploy for robust build...${NC}"
$DC -f $COMPOSE_FILE build --no-cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}📋 Build logs:${NC}"
    $DC -f $COMPOSE_FILE logs --tail 50
    exit 1
fi

echo ""
echo -e "${YELLOW}5️⃣ Starting Services...${NC}"

# Start services
$DC -f $COMPOSE_FILE --profile monitoring up -d

echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 15

# Check if containers are running
if $DC -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services started successfully${NC}"
else
    echo -e "${RED}❌ Services failed to start${NC}"
    echo -e "${YELLOW}📋 Container status:${NC}"
    $DC -f $COMPOSE_FILE ps
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    $DC -f $COMPOSE_FILE logs --tail 30
    exit 1
fi

echo ""
echo -e "${YELLOW}6️⃣ Testing Endpoints...${NC}"

# Wait a bit more for full startup
sleep 10

# Test health endpoint
echo -e "${BLUE}Testing health endpoint...${NC}"
for i in {1..5}; do
    if curl -k -s --connect-timeout 10 https://${VPS_IP}/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HTTPS health endpoint responding${NC}"
        break
    elif curl -s --connect-timeout 10 http://${VPS_IP}/health > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ HTTP health endpoint responding${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Attempt $i/5 - waiting for health endpoint...${NC}"
        sleep 5
    fi
done

# Test root endpoint
echo -e "${BLUE}Testing root endpoint...${NC}"
if curl -k -s --connect-timeout 10 https://${VPS_IP}/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Root endpoint responding${NC}"
elif curl -s --connect-timeout 10 http://${VPS_IP}/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Root endpoint responding (HTTP)${NC}"
else
    echo -e "${RED}❌ Root endpoint not responding${NC}"
fi

# Test dashboard
echo -e "${BLUE}Testing dashboard endpoint...${NC}"
if curl -k -s --connect-timeout 10 https://${VPS_IP}/dashboard > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard endpoint responding${NC}"
elif curl -s --connect-timeout 10 http://${VPS_IP}/dashboard > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Dashboard endpoint responding (HTTP)${NC}"
else
    echo -e "${RED}❌ Dashboard endpoint not responding${NC}"
fi

echo ""
echo -e "${YELLOW}7️⃣ Checking for Security Issues...${NC}"

# Check recent logs for security blocks
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "suspicious.*content" > /dev/null; then
    echo -e "${YELLOW}⚠️ Security middleware still blocking requests${NC}"
    echo -e "${BLUE}Applying security fix...${NC}"
    
    # Restart the bot container to pick up security fixes
    $DC -f $COMPOSE_FILE restart discord-bot
    
    echo -e "${BLUE}⏳ Waiting for restart...${NC}"
    sleep 10
    
    # Test again
    if curl -k -s https://${VPS_IP}/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Security fix applied successfully${NC}"
    else
        echo -e "${YELLOW}⚠️ May need manual security configuration${NC}"
    fi
else
    echo -e "${GREEN}✅ No security blocking issues detected${NC}"
fi

echo ""
echo -e "${YELLOW}8️⃣ Final Status Check...${NC}"

# Container health check
HEALTH_STATUS=$(docker inspect villain-seraphyx-bot --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
echo -e "${BLUE}🏥 Bot Health Status: ${HEALTH_STATUS}${NC}"

# Nginx health check
if docker exec villain-seraphyx-nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx configuration valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration error${NC}"
fi

# Check logs for any remaining errors
if docker logs villain-seraphyx-bot 2>/dev/null | tail -20 | grep -i "error\|fail\|exception" > /dev/null; then
    echo -e "${YELLOW}⚠️ Some errors still present in logs:${NC}"
    docker logs villain-seraphyx-bot 2>/dev/null | tail -10 | grep -i "error\|fail\|exception" || true
else
    echo -e "${GREEN}✅ No errors in recent logs${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Fix Complete!${NC}"
echo ""
echo -e "${BLUE}🌐 Your bot is accessible at:${NC}"
echo -e "  Dashboard: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
echo -e "  Health:    ${YELLOW}https://${VPS_IP}/health${NC}"
echo -e "  Webhook:   ${YELLOW}https://${VPS_IP}/webhook${NC}"
echo -e "  Portainer: ${YELLOW}http://${VPS_IP}:9000${NC}"
echo ""
echo -e "${BLUE}📋 Management Commands:${NC}"
echo -e "  View logs:    ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
echo -e "  Restart bot:  ${YELLOW}$DC -f $COMPOSE_FILE restart discord-bot${NC}"
echo -e "  Stop all:     ${YELLOW}$DC -f $COMPOSE_FILE down${NC}"
echo -e "  Status check: ${YELLOW}./check-deployment-status.sh${NC}"
echo ""
echo -e "${BLUE}🔧 Discord Bot Configuration:${NC}"
echo -e "  Update your Discord app OAuth2 redirect URI to:"
echo -e "  ${YELLOW}https://${VPS_IP}/auth/discord/callback${NC}"
echo ""

# Final endpoint test
echo -e "${BLUE}🧪 Final Test:${NC}"
if curl -k -s https://${VPS_IP}/health | grep -q "ok"; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
else
    echo -e "${YELLOW}⚠️ System may need a few more minutes to fully start${NC}"
    echo -e "${BLUE}Monitor with: $DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
fi