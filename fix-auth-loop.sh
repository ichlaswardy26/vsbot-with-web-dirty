#!/bin/bash

# Fix Discord Authentication Loop
# Comprehensive fix for OAuth authentication issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"

echo -e "${BLUE}🔧 Fixing Discord Authentication Loop${NC}"
echo -e "${BLUE}IP: ${VPS_IP}${NC}"
echo ""

# Check Docker
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

COMPOSE_FILE="docker-compose.ip.yml"

echo -e "${YELLOW}1️⃣ Checking Current Authentication Status...${NC}"

# Test current auth endpoints
echo -e "${BLUE}Testing authentication endpoints...${NC}"

# Test auth debug endpoint
if curl -k -s https://${VPS_IP}/auth/debug > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth debug endpoint accessible${NC}"
    AUTH_DEBUG=$(curl -k -s https://${VPS_IP}/auth/debug)
    echo -e "${BLUE}Current auth status: ${AUTH_DEBUG}${NC}"
else
    echo -e "${YELLOW}⚠️ Auth debug endpoint not accessible${NC}"
fi

# Test Discord OAuth initiation
if curl -k -s -I https://${VPS_IP}/auth/discord | grep -q "302\|Location"; then
    echo -e "${GREEN}✅ Discord OAuth initiation working${NC}"
else
    echo -e "${RED}❌ Discord OAuth initiation failing${NC}"
fi

echo ""
echo -e "${YELLOW}2️⃣ Checking Environment Configuration...${NC}"

# Check if .env has required variables
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Check critical variables
    if grep -q "DISCORD_CLIENT_SECRET=" .env; then
        echo -e "${GREEN}✅ DISCORD_CLIENT_SECRET is set${NC}"
    else
        echo -e "${RED}❌ DISCORD_CLIENT_SECRET missing${NC}"
    fi
    
    if grep -q "SESSION_SECRET=" .env; then
        echo -e "${GREEN}✅ SESSION_SECRET is set${NC}"
    else
        echo -e "${RED}❌ SESSION_SECRET missing${NC}"
    fi
    
    # Check callback URL
    CALLBACK_URL=$(grep "DISCORD_CALLBACK_URL=" .env | cut -d'=' -f2 || echo "")
    if [ -n "$CALLBACK_URL" ]; then
        echo -e "${GREEN}✅ DISCORD_CALLBACK_URL: ${CALLBACK_URL}${NC}"
        
        if [[ "$CALLBACK_URL" == *"$VPS_IP"* ]]; then
            echo -e "${GREEN}✅ Callback URL matches server IP${NC}"
        else
            echo -e "${YELLOW}⚠️ Callback URL doesn't match server IP${NC}"
        fi
    else
        echo -e "${RED}❌ DISCORD_CALLBACK_URL missing${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
fi

echo ""
echo -e "${YELLOW}3️⃣ Applying Authentication Fixes...${NC}"

# Generate session secret if missing
if ! grep -q "SESSION_SECRET=" .env 2>/dev/null || grep -q "SESSION_SECRET=change-this-secret" .env 2>/dev/null; then
    echo -e "${BLUE}Generating new session secret...${NC}"
    NEW_SECRET=$(openssl rand -hex 32)
    
    if grep -q "SESSION_SECRET=" .env 2>/dev/null; then
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=${NEW_SECRET}/" .env
    else
        echo "SESSION_SECRET=${NEW_SECRET}" >> .env
    fi
    echo -e "${GREEN}✅ New session secret generated${NC}"
fi

# Fix callback URL if needed
if ! grep -q "DISCORD_CALLBACK_URL=.*${VPS_IP}" .env 2>/dev/null; then
    echo -e "${BLUE}Fixing callback URL...${NC}"
    
    if grep -q "DISCORD_CALLBACK_URL=" .env 2>/dev/null; then
        sed -i "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback|" .env
    else
        echo "DISCORD_CALLBACK_URL=https://${VPS_IP}/auth/discord/callback" >> .env
    fi
    echo -e "${GREEN}✅ Callback URL fixed${NC}"
fi

# Fix allowed origins
if ! grep -q "ALLOWED_ORIGINS=" .env 2>/dev/null; then
    echo -e "${BLUE}Setting allowed origins...${NC}"
    echo "ALLOWED_ORIGINS=http://${VPS_IP},https://${VPS_IP}" >> .env
    echo -e "${GREEN}✅ Allowed origins set${NC}"
fi

# Enable auth debug temporarily
if ! grep -q "ENABLE_AUTH_DEBUG=" .env 2>/dev/null; then
    echo "ENABLE_AUTH_DEBUG=true" >> .env
    echo -e "${GREEN}✅ Auth debug enabled${NC}"
fi

echo ""
echo -e "${YELLOW}4️⃣ Restarting Services with Fixes...${NC}"

# Restart the bot container to pick up new environment and code changes
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
echo -e "${YELLOW}5️⃣ Testing Fixed Authentication...${NC}"

# Wait a bit more for full startup
sleep 10

# Test auth debug endpoint again
echo -e "${BLUE}Testing auth debug endpoint...${NC}"
if curl -k -s https://${VPS_IP}/auth/debug > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth debug endpoint working${NC}"
    
    # Get debug info
    DEBUG_INFO=$(curl -k -s https://${VPS_IP}/auth/debug)
    echo -e "${BLUE}Debug info: ${DEBUG_INFO}${NC}"
else
    echo -e "${RED}❌ Auth debug endpoint not working${NC}"
fi

# Test Discord OAuth flow
echo -e "${BLUE}Testing Discord OAuth flow...${NC}"
OAUTH_RESPONSE=$(curl -k -s -I https://${VPS_IP}/auth/discord)
if echo "$OAUTH_RESPONSE" | grep -q "Location.*discord.com"; then
    echo -e "${GREEN}✅ Discord OAuth redirect working${NC}"
    DISCORD_URL=$(echo "$OAUTH_RESPONSE" | grep "Location:" | cut -d' ' -f2 | tr -d '\r')
    echo -e "${BLUE}Discord OAuth URL: ${DISCORD_URL}${NC}"
else
    echo -e "${RED}❌ Discord OAuth redirect not working${NC}"
    echo -e "${YELLOW}Response: ${OAUTH_RESPONSE}${NC}"
fi

# Test dashboard access
echo -e "${BLUE}Testing dashboard access...${NC}"
DASHBOARD_RESPONSE=$(curl -k -s -I https://${VPS_IP}/dashboard)
if echo "$DASHBOARD_RESPONSE" | grep -q "302\|Location"; then
    echo -e "${GREEN}✅ Dashboard redirecting properly${NC}"
else
    echo -e "${YELLOW}⚠️ Dashboard response: ${DASHBOARD_RESPONSE}${NC}"
fi

echo ""
echo -e "${YELLOW}6️⃣ Checking Logs for Issues...${NC}"

# Check for authentication-related errors
if docker logs villain-seraphyx-bot 2>/dev/null | tail -50 | grep -i "auth\|session\|passport\|oauth" | grep -i "error\|fail" > /dev/null; then
    echo -e "${YELLOW}⚠️ Authentication errors found in logs:${NC}"
    docker logs villain-seraphyx-bot 2>/dev/null | tail -20 | grep -i "auth\|session\|passport\|oauth" | grep -i "error\|fail" || true
else
    echo -e "${GREEN}✅ No authentication errors in recent logs${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Authentication Fix Complete!${NC}"
echo ""
echo -e "${BLUE}🔧 Discord Application Configuration:${NC}"
echo -e "  Update your Discord app settings at: ${YELLOW}https://discord.com/developers/applications${NC}"
echo -e "  OAuth2 Redirect URI: ${YELLOW}https://${VPS_IP}/auth/discord/callback${NC}"
echo -e "  Required Scopes: ${YELLOW}identify, guilds${NC}"
echo ""
echo -e "${BLUE}🧪 Test Authentication:${NC}"
echo -e "  1. Visit: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
echo -e "  2. Should redirect to Discord OAuth"
echo -e "  3. After Discord auth, should return to dashboard"
echo -e "  4. Debug info: ${YELLOW}https://${VPS_IP}/auth/debug${NC}"
echo ""
echo -e "${BLUE}📋 Monitor Authentication:${NC}"
echo -e "  View logs: ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot | grep -i auth${NC}"
echo -e "  Check debug: ${YELLOW}curl -k https://${VPS_IP}/auth/debug${NC}"
echo ""

# Final test
echo -e "${BLUE}🎯 Final Authentication Test:${NC}"
if curl -k -s https://${VPS_IP}/auth/discord | grep -q "discord.com"; then
    echo -e "${GREEN}✅ Authentication flow is working!${NC}"
    echo -e "${GREEN}The authentication loop should now be fixed.${NC}"
else
    echo -e "${YELLOW}⚠️ Authentication may need additional configuration${NC}"
    echo -e "${BLUE}Check the Discord application settings and ensure:${NC}"
    echo -e "  - Client ID and Secret are correct"
    echo -e "  - Redirect URI matches exactly: https://${VPS_IP}/auth/discord/callback"
    echo -e "  - Bot has required permissions in your Discord server"
fi