#!/bin/bash

# Check Deployment Status and Apply Fixes
# Comprehensive status check and troubleshooting

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}🔍 Checking Deployment Status for IP: ${VPS_IP}${NC}"
echo ""

# Check Docker
echo -e "${YELLOW}1️⃣ Checking Docker Environment...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Docker is running${NC}"
fi

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
    echo -e "${YELLOW}Using docker-compose (legacy)${NC}"
else
    echo -e "${GREEN}Using docker compose (modern)${NC}"
fi

COMPOSE_FILE="docker-compose.ip.yml"

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Compose file found${NC}"
fi

echo ""
echo -e "${YELLOW}2️⃣ Checking Container Status...${NC}"

# Check container status
if $DC -f $COMPOSE_FILE ps | grep -q "villain-seraphyx-bot"; then
    echo -e "${GREEN}✅ Bot container exists${NC}"
    
    if $DC -f $COMPOSE_FILE ps villain-seraphyx-bot | grep -q "Up"; then
        echo -e "${GREEN}✅ Bot container is running${NC}"
        
        # Check container health
        HEALTH_STATUS=$(docker inspect villain-seraphyx-bot --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        echo -e "${BLUE}🏥 Health Status: ${HEALTH_STATUS}${NC}"
        
    else
        echo -e "${RED}❌ Bot container is not running${NC}"
        echo -e "${YELLOW}📋 Container status:${NC}"
        $DC -f $COMPOSE_FILE ps villain-seraphyx-bot
        
        echo -e "${YELLOW}📋 Recent logs:${NC}"
        docker logs --tail 20 villain-seraphyx-bot 2>/dev/null || echo "No logs available"
    fi
else
    echo -e "${RED}❌ Bot container does not exist${NC}"
    echo -e "${YELLOW}Available containers:${NC}"
    $DC -f $COMPOSE_FILE ps
fi

# Check nginx container
if $DC -f $COMPOSE_FILE ps | grep -q "villain-seraphyx-nginx"; then
    echo -e "${GREEN}✅ Nginx container exists${NC}"
    
    if $DC -f $COMPOSE_FILE ps villain-seraphyx-nginx | grep -q "Up"; then
        echo -e "${GREEN}✅ Nginx container is running${NC}"
    else
        echo -e "${RED}❌ Nginx container is not running${NC}"
    fi
else
    echo -e "${RED}❌ Nginx container does not exist${NC}"
fi

echo ""
echo -e "${YELLOW}3️⃣ Testing Endpoints...${NC}"

# Test health endpoint
echo -e "${BLUE}Testing health endpoint...${NC}"
if curl -k -s --connect-timeout 10 https://${VPS_IP}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS health endpoint responding${NC}"
    HEALTH_RESPONSE=$(curl -k -s https://${VPS_IP}/health)
    echo -e "${BLUE}Response: ${HEALTH_RESPONSE}${NC}"
elif curl -s --connect-timeout 10 http://${VPS_IP}/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ HTTP health endpoint responding (HTTPS may not be configured)${NC}"
else
    echo -e "${RED}❌ Health endpoint not responding${NC}"
fi

# Test root endpoint
echo -e "${BLUE}Testing root endpoint...${NC}"
if curl -k -s --connect-timeout 10 https://${VPS_IP}/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS root endpoint responding${NC}"
elif curl -s --connect-timeout 10 http://${VPS_IP}/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ HTTP root endpoint responding${NC}"
else
    echo -e "${RED}❌ Root endpoint not responding${NC}"
fi

# Test dashboard endpoint
echo -e "${BLUE}Testing dashboard endpoint...${NC}"
if curl -k -s --connect-timeout 10 https://${VPS_IP}/dashboard > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS dashboard endpoint responding${NC}"
elif curl -s --connect-timeout 10 http://${VPS_IP}/dashboard > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ HTTP dashboard endpoint responding${NC}"
else
    echo -e "${RED}❌ Dashboard endpoint not responding${NC}"
fi

echo ""
echo -e "${YELLOW}4️⃣ Checking Logs for Issues...${NC}"

# Check for common error patterns in logs
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "error\|fail\|exception" > /dev/null; then
    echo -e "${RED}⚠️ Errors found in bot logs:${NC}"
    docker logs villain-seraphyx-bot 2>/dev/null | tail -20 | grep -i "error\|fail\|exception" || true
else
    echo -e "${GREEN}✅ No obvious errors in recent bot logs${NC}"
fi

# Check for security-related issues
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "suspicious\|security\|blocked" > /dev/null; then
    echo -e "${YELLOW}⚠️ Security-related messages found:${NC}"
    docker logs villain-seraphyx-bot 2>/dev/null | tail -20 | grep -i "suspicious\|security\|blocked" || true
else
    echo -e "${GREEN}✅ No security issues in recent logs${NC}"
fi

echo ""
echo -e "${YELLOW}5️⃣ System Resources...${NC}"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}⚠️ Disk usage high: ${DISK_USAGE}%${NC}"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️ Disk usage: ${DISK_USAGE}%${NC}"
else
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}%${NC}"
fi

# Check memory usage
if command -v free > /dev/null; then
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEM_USAGE" -gt 90 ]; then
        echo -e "${RED}⚠️ Memory usage high: ${MEM_USAGE}%${NC}"
    elif [ "$MEM_USAGE" -gt 80 ]; then
        echo -e "${YELLOW}⚠️ Memory usage: ${MEM_USAGE}%${NC}"
    else
        echo -e "${GREEN}✅ Memory usage: ${MEM_USAGE}%${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}6️⃣ Recommended Actions...${NC}"

# Determine what actions to recommend
NEEDS_RESTART=false
NEEDS_REBUILD=false
NEEDS_SECURITY_FIX=false

# Check if containers are not running
if ! $DC -f $COMPOSE_FILE ps villain-seraphyx-bot | grep -q "Up"; then
    NEEDS_RESTART=true
fi

# Check if there are build-related errors
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "npm\|package\|module.*not.*found" > /dev/null; then
    NEEDS_REBUILD=true
fi

# Check if there are security-related blocks
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "suspicious.*content\|security.*violation" > /dev/null; then
    NEEDS_SECURITY_FIX=true
fi

if [ "$NEEDS_REBUILD" = true ]; then
    echo -e "${RED}🔧 REBUILD NEEDED${NC}"
    echo "  Detected build/dependency issues. Run:"
    echo "  ./fix-package-lock.sh"
    echo "  $DC -f $COMPOSE_FILE down"
    echo "  $DC -f $COMPOSE_FILE build --no-cache"
    echo "  $DC -f $COMPOSE_FILE up -d"
elif [ "$NEEDS_SECURITY_FIX" = true ]; then
    echo -e "${YELLOW}🛡️ SECURITY FIX NEEDED${NC}"
    echo "  Security middleware blocking legitimate requests. Run:"
    echo "  $DC -f $COMPOSE_FILE restart discord-bot"
elif [ "$NEEDS_RESTART" = true ]; then
    echo -e "${YELLOW}🔄 RESTART NEEDED${NC}"
    echo "  Container not running. Run:"
    echo "  $DC -f $COMPOSE_FILE up -d"
else
    echo -e "${GREEN}✅ SYSTEM APPEARS HEALTHY${NC}"
    echo "  All containers running and endpoints responding"
fi

echo ""
echo -e "${BLUE}📋 Quick Commands:${NC}"
echo -e "  View logs:    ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
echo -e "  Restart bot:  ${YELLOW}$DC -f $COMPOSE_FILE restart discord-bot${NC}"
echo -e "  Full restart: ${YELLOW}$DC -f $COMPOSE_FILE down && $DC -f $COMPOSE_FILE up -d${NC}"
echo -e "  Rebuild:      ${YELLOW}$DC -f $COMPOSE_FILE build --no-cache${NC}"

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "  Dashboard: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
echo -e "  Health:    ${YELLOW}https://${VPS_IP}/health${NC}"
echo -e "  Portainer: ${YELLOW}http://${VPS_IP}:9000${NC}"

echo ""
echo -e "${GREEN}🎉 Status check complete!${NC}"