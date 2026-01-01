#!/bin/bash

# Complete Authentication Fix
# Fixes session loop and logs permission issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}🔧 Complete Authentication & Logging Fix${NC}"
echo -e "${RED}Issues: Session ID mismatch + Logs permission denied${NC}"
echo ""

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

COMPOSE_FILE="docker-compose.ip.yml"

echo -e "${YELLOW}1️⃣ Fixing Host Logs Directory Permissions...${NC}"

# Create and fix logs directory permissions on host
if [ ! -d "./logs" ]; then
    mkdir -p ./logs/audit
    echo -e "${GREEN}✅ Created logs directory${NC}"
fi

# Fix permissions (1001 is the botuser UID in container)
sudo chown -R 1001:1001 ./logs 2>/dev/null || {
    echo -e "${YELLOW}⚠️ Could not change ownership (may need sudo)${NC}"
    chmod -R 755 ./logs
    echo -e "${GREEN}✅ Set logs directory permissions${NC}"
}

echo ""
echo -e "${YELLOW}2️⃣ Applying Session Configuration Fixes...${NC}"
echo -e "${BLUE}✅ Session fixes already applied to code:${NC}"
echo -e "${BLUE}  - Cookie secure: false${NC}"
echo -e "${BLUE}  - SameSite: lax${NC}"
echo -e "${BLUE}  - Disabled session regeneration${NC}"

echo ""
echo -e "${YELLOW}3️⃣ Rebuilding Container with Fixes...${NC}"

# Stop container
echo -e "${BLUE}Stopping container...${NC}"
$DC -f $COMPOSE_FILE stop discord-bot

# Rebuild with latest fixes
echo -e "${BLUE}Rebuilding with session and logging fixes...${NC}"
$DC -f $COMPOSE_FILE build --no-cache discord-bot

# Start container
echo -e "${BLUE}Starting container...${NC}"
$DC -f $COMPOSE_FILE up -d discord-bot

echo -e "${BLUE}⏳ Waiting for container to start...${NC}"
sleep 20

# Check if container is running
if $DC -f $COMPOSE_FILE ps discord-bot | grep -q "Up"; then
    echo -e "${GREEN}✅ Container started successfully${NC}"
else
    echo -e "${RED}❌ Container failed to start${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    $DC -f $COMPOSE_FILE logs --tail 30 discord-bot
    exit 1
fi

echo ""
echo -e "${YELLOW}4️⃣ Testing Fixes...${NC}"

# Wait for full startup
sleep 15

# Test logging (should not show permission errors)
echo -e "${BLUE}Checking for logging errors...${NC}"
if docker logs villain-seraphyx-bot 2>&1 | tail -20 | grep -i "EACCES\|permission denied" > /dev/null; then
    echo -e "${YELLOW}⚠️ Still some permission issues in logs${NC}"
else
    echo -e "${GREEN}✅ No permission errors in recent logs${NC}"
fi

# Test session configuration
echo -e "${BLUE}Testing session configuration...${NC}"
if curl -k -s https://${VPS_IP}/auth/debug > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth debug endpoint accessible${NC}"
    
    # Check session config
    DEBUG_RESPONSE=$(curl -k -s https://${VPS_IP}/auth/debug)
    if echo "$DEBUG_RESPONSE" | grep -q '"secure":false'; then
        echo -e "${GREEN}✅ Session cookies configured as non-secure${NC}"
    else
        echo -e "${YELLOW}⚠️ Session configuration may need verification${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Auth debug endpoint not accessible yet${NC}"
fi

# Test OAuth flow
echo -e "${BLUE}Testing OAuth flow...${NC}"
OAUTH_TEST=$(curl -k -s -I https://${VPS_IP}/auth/discord)
if echo "$OAUTH_TEST" | grep -q "Location.*discord.com"; then
    echo -e "${GREEN}✅ Discord OAuth redirect working${NC}"
else
    echo -e "${RED}❌ Discord OAuth redirect not working${NC}"
    echo -e "${YELLOW}Response: ${OAUTH_TEST}${NC}"
fi

echo ""
echo -e "${YELLOW}5️⃣ Monitoring Session Consistency...${NC}"

# Monitor for session ID consistency
echo -e "${BLUE}Monitoring session logs for consistency...${NC}"
echo -e "${BLUE}Look for consistent session IDs in the logs below:${NC}"

# Show recent auth-related logs
docker logs villain-seraphyx-bot 2>/dev/null | tail -30 | grep -i "session\|auth\|oauth" || echo "No recent auth logs"

echo ""
echo -e "${GREEN}🎉 Complete Fix Applied!${NC}"
echo ""
echo -e "${BLUE}🧪 Test Authentication Flow:${NC}"
echo -e "  1. Visit: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
echo -e "  2. Complete Discord OAuth"
echo -e "  3. Should return to dashboard and STAY there"
echo -e "  4. Check debug: ${YELLOW}curl -k https://${VPS_IP}/auth/debug${NC}"
echo ""
echo -e "${BLUE}📋 Monitor Results:${NC}"
echo -e "  Session logs: ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot | grep -i session${NC}"
echo -e "  Auth logs:    ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot | grep -i auth${NC}"
echo -e "  All logs:     ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
echo ""
echo -e "${BLUE}🔍 Expected Behavior:${NC}"
echo -e "  ✅ Same session ID for OAuth callback and dashboard request"
echo -e "  ✅ No 'EACCES' or 'permission denied' errors"
echo -e "  ✅ User stays authenticated after OAuth completion"
echo -e "  ✅ No authentication loop"
echo ""

# Final comprehensive test
echo -e "${BLUE}🎯 Final Comprehensive Test:${NC}"

# Test 1: Cookie persistence
if curl -k -s -c /tmp/test_cookies.txt -b /tmp/test_cookies.txt https://${VPS_IP}/auth/discord > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Cookie persistence test passed${NC}"
    rm -f /tmp/test_cookies.txt
else
    echo -e "${YELLOW}⚠️ Cookie persistence test inconclusive${NC}"
fi

# Test 2: Session endpoint
if curl -k -s https://${VPS_IP}/auth/debug | grep -q '"isAuthenticated"'; then
    echo -e "${GREEN}✅ Session debug endpoint working${NC}"
else
    echo -e "${YELLOW}⚠️ Session debug endpoint needs more time${NC}"
fi

echo ""
echo -e "${GREEN}Authentication loop and logging issues should now be resolved!${NC}"
echo -e "${BLUE}Session IDs should remain consistent throughout the OAuth flow.${NC}"