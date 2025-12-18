#!/bin/bash

# Villain Seraphyx Bot - Backup Script
# Usage: ./scripts/backup.sh [name]

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
NAME=${1:-"backup_$DATE"}

echo "💾 Creating backup: $NAME"

mkdir -p $BACKUP_DIR

# Create archive (exclude unnecessary files)
tar -czf "$BACKUP_DIR/${NAME}.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='*.log' \
    .

# Backup .env separately
[ -f ".env" ] && cp .env "$BACKUP_DIR/${NAME}.env"

# Keep only last 5 backups
cd $BACKUP_DIR
ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
ls -t backup_*.env 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "✅ Backup saved: $BACKUP_DIR/${NAME}.tar.gz"
echo "📋 Available backups:"
ls -lh backup_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
