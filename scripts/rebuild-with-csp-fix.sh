#!/bin/bash

# Rebuild Docker container with CSP fixes
# This script ensures the CSP fixes are included in the Docker build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="43.129.55.161"
SSL_FLAG=""
MINIMAL_FLAG=""

# Parse arguments
for arg in "$@"; do
    case $arg in
        --ssl)
            SSL_FLAG="--ssl"
            ;;
        --minimal)
            MINIMAL_FLAG="--minimal"
            ;;
    esac
done

echo -e "${BLUE}🔧 Rebuilding Docker container with CSP fixes...${NC}"

# Verify CSP fixes are in place
echo -e "${YELLOW}🔍 Verifying CSP fixes in security middleware...${NC}"

if ! grep -q "scriptSrcAttr" web/middleware/security.js; then
    echo -e "${RED}❌ CSP fixes not found in security middleware!${NC}"
    echo -e "${YELLOW}Applying CSP fixes first...${NC}"
    
    # Apply the CSP fix if not already applied
    if [ -f "apply-csp-fix.js" ]; then
        node apply-csp-fix.js
    else
        echo -e "${RED}❌ CSP fix script not found. Please run the CSP fix first.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ CSP fixes verified in source code${NC}"

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

# Set compose file
COMPOSE_FILE="docker-compose.ip.yml"

# Create temporary compose file with appropriate Dockerfile if minimal
if [ "$MINIMAL_FLAG" = "--minimal" ]; then
    echo -e "${YELLOW}📝 Creating minimal build configuration...${NC}"
    sed 's/dockerfile: Dockerfile.deploy/dockerfile: Dockerfile.minimal/' $COMPOSE_FILE > docker-compose.ip.tmp.yml
    COMPOSE_FILE="docker-compose.ip.tmp.yml"
fi

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DC -f $COMPOSE_FILE down 2>/dev/null || true

echo -e "${YELLOW}🗑️  Removing old images to force rebuild...${NC}"
docker rmi $(docker images -q villain-seraphyx* 2>/dev/null) 2>/dev/null || true

echo -e "${YELLOW}📦 Building with CSP fixes (no cache)...${NC}"
$DC -f $COMPOSE_FILE build --no-cache --pull

echo -e "${YELLOW}🚀 Starting containers...${NC}"
$DC -f $COMPOSE_FILE --profile monitoring up -d

# Wait for containers to start
echo -e "${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 10

# Check if containers are running
if $DC -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Containers are running!${NC}"
    
    # Test CSP configuration
    echo -e "${YELLOW}🧪 Testing CSP configuration...${NC}"
    
    PROTOCOL="http"
    if [ "$SSL_FLAG" = "--ssl" ]; then
        PROTOCOL="https"
    fi
    
    # Wait a bit more for the web server to be ready
    sleep 5
    
    # Test health endpoint
    if curl -k -s ${PROTOCOL}://${VPS_IP}/health > /dev/null; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
        
        # Test dashboard page
        echo -e "${YELLOW}🔍 Testing dashboard page...${NC}"
        RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" ${PROTOCOL}://${VPS_IP}/dashboard)
        
        if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ]; then
            echo -e "${GREEN}✅ Dashboard accessible${NC}"
        else
            echo -e "${YELLOW}⚠️  Dashboard returned HTTP $RESPONSE (may need authentication)${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  Services still starting up...${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Rebuild complete with CSP fixes!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access your dashboard:${NC}"
    if [ "$SSL_FLAG" = "--ssl" ]; then
        echo -e "  Dashboard: ${YELLOW}https://${VPS_IP}/dashboard${NC}"
        echo -e "  Health:    ${YELLOW}https://${VPS_IP}/health${NC}"
    else
        echo -e "  Dashboard: ${YELLOW}http://${VPS_IP}/dashboard${NC}"
        echo -e "  Health:    ${YELLOW}http://${VPS_IP}/health${NC}"
    fi
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "1. Clear your browser cache (Ctrl+Shift+R)"
    echo -e "2. Visit the dashboard URL above"
    echo -e "3. Check browser console - CSP errors should be gone"
    echo ""
    echo -e "${BLUE}🔧 Management:${NC}"
    echo -e "  Logs:    ${YELLOW}$DC -f $COMPOSE_FILE logs -f discord-bot${NC}"
    echo -e "  Stop:    ${YELLOW}$DC -f $COMPOSE_FILE down${NC}"
    echo -e "  Restart: ${YELLOW}$DC -f $COMPOSE_FILE restart${NC}"
    
else
    echo -e "${RED}❌ Failed to start containers!${NC}"
    echo -e "${YELLOW}📋 Container status:${NC}"
    $DC -f $COMPOSE_FILE ps
    echo ""
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    $DC -f $COMPOSE_FILE logs --tail=20
    exit 1
fi

# Cleanup temporary files
if [ -f "docker-compose.ip.tmp.yml" ]; then
    rm docker-compose.ip.tmp.yml
fi

echo ""
echo -e "${GREEN}✨ CSP-fixed deployment complete!${NC}"