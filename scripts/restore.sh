#!/bin/bash

# Villain Seraphyx Bot - Restore Script
# Usage: ./scripts/restore.sh <backup_name>

set -e

BACKUP_DIR="./backups"
NAME=$1

if [ -z "$NAME" ]; then
    echo "❌ Usage: ./scripts/restore.sh <backup_name>"
    echo ""
    echo "📋 Available backups:"
    ls -1 $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | sed 's/.*\///;s/.tar.gz$//' | sed 's/^/  /' || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/${NAME}.tar.gz"
ENV_FILE="$BACKUP_DIR/${NAME}.env"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  This will overwrite current files. Continue? (y/N)"
read -r confirm
[[ ! $confirm =~ ^[Yy]$ ]] && echo "Cancelled" && exit 0

echo "🛑 Stopping containers..."
docker compose down 2>/dev/null || true

echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE"

# Restore .env
[ -f "$ENV_FILE" ] && cp "$ENV_FILE" .env

echo "📦 Installing dependencies..."
npm install

echo "✅ Restore complete!"
echo ""
echo "Next: ./deploy.sh prod"
