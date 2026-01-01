#!/bin/bash

# Villain Seraphyx Bot - SSL Renewal Script
# Usage: ./scripts/renew-ssl.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Renewing SSL certificates...${NC}"

# Check if SSL environment exists
if [ ! -f ".env.ssl" ]; then
    echo -e "${RED}❌ SSL not configured. Run ./scripts/setup-ssl.sh first${NC}"
    exit 1
fi

# Load SSL environment
source .env.ssl

# Docker compose command
DC="docker compose"
if ! $DC version > /dev/null 2>&1; then
    DC="docker-compose"
fi

# Check if SSL containers are running
if ! $DC -f docker-compose.ssl.yml ps | grep -q "Up"; then
    echo -e "${RED}❌ SSL containers not running${NC}"
    exit 1
fi

# Renew certificates
echo -e "${YELLOW}🔐 Renewing certificates...${NC}"
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificate renewal successful${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
    $DC -f docker-compose.ssl.yml exec nginx nginx -s reload
    
    echo -e "${GREEN}✅ SSL renewal complete!${NC}"
else
    echo -e "${RED}❌ Certificate renewal failed${NC}"
    exit 1
fi

# Check certificate expiry
echo -e "${YELLOW}📅 Certificate expiry info:${NC}"
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    certbot/certbot certificates