#!/bin/bash

# Script restore untuk Discord Bot
# Usage: ./restore.sh <backup_name>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
BACKUP_NAME=$1

if [ -z "$BACKUP_NAME" ]; then
    echo -e "${RED}❌ Error: Please specify backup name${NC}"
    echo -e "${BLUE}📋 Available backups:${NC}"
    ls -1 $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | sed 's/.*\///;s/.tar.gz$//' | sed 's/^/  /'
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
ENV_BACKUP_GPG="$BACKUP_DIR/${BACKUP_NAME}_env.gpg"
ENV_BACKUP_PLAIN="$BACKUP_DIR/${BACKUP_NAME}_env.backup"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Starting restore: ${BACKUP_NAME}${NC}"

# Confirm restore
echo -e "${YELLOW}⚠️ This will overwrite current files. Continue? (y/N)${NC}"
read -r confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}👋 Restore cancelled${NC}"
    exit 0
fi

# Stop containers if running
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
docker-compose down 2>/dev/null || true

# Backup current state before restore
echo -e "${YELLOW}💾 Creating safety backup of current state...${NC}"
SAFETY_BACKUP="safety_backup_$(date +%Y%m%d_%H%M%S)"
./scripts/backup.sh "$SAFETY_BACKUP" || echo -e "${YELLOW}⚠️ Could not create safety backup${NC}"

# Extract backup
echo -e "${YELLOW}📦 Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE"

# Restore .env file
if [ -f "$ENV_BACKUP_GPG" ]; then
    echo -e "${YELLOW}🔐 Restoring .env file (encrypted)...${NC}"
    gpg --decrypt "$ENV_BACKUP_GPG" > .env 2>/dev/null || {
        echo -e "${RED}❌ Failed to decrypt .env file${NC}"
        echo -e "${YELLOW}💡 Please decrypt manually: gpg --decrypt $ENV_BACKUP_GPG > .env${NC}"
    }
elif [ -f "$ENV_BACKUP_PLAIN" ]; then
    echo -e "${YELLOW}📄 Restoring .env file (plain)...${NC}"
    cp "$ENV_BACKUP_PLAIN" .env
else
    echo -e "${YELLOW}⚠️ No .env backup found${NC}"
fi

# Restore file permissions
echo -e "${YELLOW}🔧 Restoring file permissions...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x deploy.sh 2>/dev/null || true

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Show restore info
if [ -f "$BACKUP_DIR/${BACKUP_NAME}_info.txt" ]; then
    echo -e "${BLUE}📋 Backup Information:${NC}"
    cat "$BACKUP_DIR/${BACKUP_NAME}_info.txt"
fi

echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "  1. ${YELLOW}Check .env configuration${NC}"
echo -e "  2. ${YELLOW}Run ./deploy.sh${NC} to start the bot"
echo -e "  3. ${YELLOW}Check logs${NC}: docker-compose logs -f discord-bot"

# Ask if user wants to start the bot
echo -e "${YELLOW}🚀 Start the bot now? (y/N)${NC}"
read -r start_bot
if [[ $start_bot =~ ^[Yy]$ ]]; then
    ./deploy.sh
fi