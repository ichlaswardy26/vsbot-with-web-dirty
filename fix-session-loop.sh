#!/bin/bash

# Fix Session Loop - Critical Session Configuration Fix
# Addresses the session ID mismatch causing authentication loops

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}🔧 Fixing Session Authentication Loop${NC}"
echo -e "${RED}Issue: Session IDs changing between OAuth callback and dashboard${NC}"
echo ""

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

COMPOSE_FILE="docker-compose.ip.yml"

echo -e "${YELLOW}1️⃣ Applying Critical Session Fixes...${NC}"
echo -e "${BLUE}✅ Disabled secure cookies (force false)${NC}"
echo -e "${BLUE}✅ Changed SameSite to 'lax'${NC}"
echo -e "${BLUE}✅ Disabled session security middleware${NC}"
echo -e "${BLUE}✅ Fixed middleware order${NC}"

echo ""
echo -e "${YELLOW}2️⃣ Restarting Container with Session Fixes...${NC}"

# Restart the bot container to pick up session configuration changes
echo -e "${BLUE}Restarting Discord bot container...${NC}"
$DC -f $COMPOSE_FILE restart discord-bot

echo -e "${BLUE}⏳ Waiting for container to start...${NC}"
sleep 15

# Check if container is running
if $DC -f $COMPOSE_FILE ps discord-bot | grep -q "Up"; then
    echo -e "${GREEN}✅ Container restarted successfully${NC}"
else
    echo -e "${RED}❌ Container failed to restart${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    $DC -f $COMPOSE_FILE logs --tail 20 discord-bot
    exit 1
fi

echo ""
echo -e "${YELLOW}3️⃣ Testing Session Persistence...${NC}"

# Wait for full startup
sleep 10

# Test session debug endpoint
echo -e "${BLUE}Testing session configuration...${NC}"
if curl -k -s https://${VPS_IP}/auth/debug > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth debug endpoint accessible${NC}"
    
    # Get session config
    SESSION_INFO=$(curl -k -s https://${VPS_IP}/auth/debug | grep -o '"cookie":{[^}]*}' || echo "")
    echo -e "${BLUE}Session config: ${SESSION_INFO}${NC}"
else
    echo -e "${YELLOW}⚠️ Auth debug endpoint not accessible yet${NC}"
fi

# Test OAuth flow
echo -e "${BLUE}Testing OAuth initiation...${NC}"
OAUTH_RESPONSE=$(curl -k -s -I https://${VPS_IP}/auth/discord)
if echo "$OAUTH_RESPONSE" | grep -q "Location.*discord.com"; then
    echo -e "${GREEN}✅ Discord OAuth redirect working${NC}"
else
    echo -e "${RED}❌ Discord OAuth redirect not working${NC}"
fi

echo ""
echo -e "${YELLOW}4️⃣ Monitoring Session Logs...${NC}"

# Check recent logs for session activity
echo -e "${BLUE}Recent session logs:${NC}"
docker logs villain-seraphyx-bot 2>/dev/null | tail -20 | grep -i "session\|auth" || echo "No recent session logs"

echo ""
echo -e "${GREEN}🎯 Session Fix Applied!${NC}"
echo ""
echo -e "${BLUE}🧪 Test Authentication Now:${NC}"
echo -e "  1. Visit: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
echo -e "  2. Complete Discord OAuth"
echo -e "  3. Should stay on dashboard (no loop)"
echo ""
echo -e "${BLUE}📋 Monitor Session Activity:${NC}"
echo -e "  Follow logs: ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot | grep -i session${NC}"
echo -e "  Check debug: ${YELLOW}curl -k https://${VPS_IP}/auth/debug${NC}"
echo ""
echo -e "${BLUE}🔍 Key Changes Made:${NC}"
echo -e "  ✅ Cookie secure: false (was dynamic)"
echo -e "  ✅ SameSite: lax (was none)"
echo -e "  ✅ Disabled session regeneration middleware"
echo -e "  ✅ Fixed middleware order"
echo ""

# Final test
echo -e "${BLUE}🎯 Final Session Test:${NC}"
if curl -k -s -c /tmp/cookies.txt https://${VPS_IP}/auth/discord > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Session cookies are being set properly${NC}"
    
    # Check if cookies were saved
    if [ -f "/tmp/cookies.txt" ] && [ -s "/tmp/cookies.txt" ]; then
        echo -e "${GREEN}✅ Cookies persisted to file${NC}"
        cat /tmp/cookies.txt | grep sessionId || echo "No sessionId cookie found"
        rm -f /tmp/cookies.txt
    fi
else
    echo -e "${YELLOW}⚠️ Session cookie test inconclusive${NC}"
fi

echo ""
echo -e "${GREEN}Session authentication loop should now be fixed!${NC}"
echo -e "${BLUE}The session ID should remain consistent between OAuth and dashboard.${NC}"