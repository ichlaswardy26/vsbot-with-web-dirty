#!/bin/bash

# Script backup untuk Discord Bot
# Usage: ./backup.sh [backup_name]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"backup_$DATE"}
BOT_DIR=$(pwd)

echo -e "${BLUE}💾 Starting backup: ${BACKUP_NAME}${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup archive
echo -e "${YELLOW}📦 Creating backup archive...${NC}"
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='*.log' \
    .

# Backup .env file separately (encrypted)
if [ -f ".env" ]; then
    echo -e "${YELLOW}🔐 Backing up .env file (encrypted)...${NC}"
    gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/${BACKUP_NAME}_env.gpg" .env 2>/dev/null || {
        echo -e "${YELLOW}⚠️ GPG not available, copying .env without encryption${NC}"
        cp .env "$BACKUP_DIR/${BACKUP_NAME}_env.backup"
    }
fi

# Create backup info file
echo -e "${YELLOW}📋 Creating backup info...${NC}"
cat > "$BACKUP_DIR/${BACKUP_NAME}_info.txt" <<EOF
Backup Information
==================
Backup Name: $BACKUP_NAME
Date: $(date)
Bot Directory: $BOT_DIR
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "Not a git repository")
Git Branch: $(git branch --show-current 2>/dev/null || echo "Not a git repository")

Files Included:
$(tar -tzf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | head -20)
$([ $(tar -tzf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | wc -l) -gt 20 ] && echo "... and $(( $(tar -tzf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | wc -l) - 20 )) more files")

Backup Size: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
EOF

# Clean old backups (keep last 5)
echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
cd $BACKUP_DIR
ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
ls -t backup_*_env.* 2>/dev/null | tail -n +6 | xargs -r rm -f
ls -t backup_*_info.txt 2>/dev/null | tail -n +6 | xargs -r rm -f
cd - > /dev/null

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${BLUE}📁 Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"
echo -e "${BLUE}📊 Backup size: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)${NC}"

# List all backups
echo -e "${BLUE}📋 Available backups:${NC}"
ls -lh $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'