# 🚀 Deployment Guide

Panduan deployment Discord Bot ke berbagai platform.

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start bot
npm start
```

### Docker (Recommended)
```bash
# Development
./deploy.sh dev

# Production
./deploy.sh prod
```

## Deployment Options

### 1. Docker (Recommended)

**Requirements:**
- Docker & Docker Compose

**Deploy:**
```bash
# Clone repository
git clone <repo-url>
cd villain-seraphyx-bot

# Setup environment
cp .env.example .env
nano .env

# Deploy
./deploy.sh prod
```

**Commands:**
```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f discord-bot

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# With monitoring (Portainer)
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

### 2. VPS (Ubuntu/Debian)

**Setup VPS:**
```bash
# Run setup script
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh

# Logout and login again for Docker permissions
```

**Deploy:**
```bash
cd ~/discord-bot
git clone <repo-url> .
cp .env.example .env
nano .env
./deploy.sh prod
```

### 3. Railway/Render

1. Connect GitHub repository
2. Set environment variables from `.env.example`
3. Deploy automatically

### 4. Heroku

```bash
# Login
heroku login

# Create app
heroku create villain-seraphyx-bot

# Set environment variables
heroku config:set TOKEN=your_token
heroku config:set MONGO_URI=your_mongo_uri
# ... set other variables

# Deploy
git push heroku main
```

### 5. PM2 (Without Docker)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name villain-seraphyx-bot

# Auto-start on reboot
pm2 startup
pm2 save

# Commands
pm2 logs villain-seraphyx-bot
pm2 restart villain-seraphyx-bot
pm2 stop villain-seraphyx-bot
```

## Environment Variables

Required variables in `.env`:

```env
# Required
TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
MONGO_URI=mongodb+srv://...
OWNER_IDS=your_user_id

# Optional - Web Dashboard
WEB_DASHBOARD_ENABLED=true
WEB_PORT=3001
SESSION_SECRET=random_string

# Optional - Webhook
WEBHOOK_PORT=3000
WEBHOOK_TOKEN=your_tako_token
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Webhook | Tako donation webhook |
| 3001 | Dashboard | Web configuration dashboard |
| 9000 | Portainer | Container management (optional) |

## Backup & Restore

```bash
# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh backup_name
```

## Monitoring

**Docker logs:**
```bash
docker compose logs -f discord-bot
```

**Health check:**
```bash
curl http://localhost:3000/health
```

**Portainer (optional):**
```bash
# Enable monitoring profile
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Access at http://your-ip:9000
```

## Troubleshooting

**Bot not starting:**
```bash
# Check logs
docker compose logs discord-bot

# Verify .env
cat .env | grep -v "^#" | grep -v "^$"

# Rebuild
docker compose build --no-cache
```

**Database connection error:**
- Verify MONGO_URI format
- Check network connectivity
- Whitelist IP in MongoDB Atlas

**Permission errors:**
- Verify bot has required Discord permissions
- Check role hierarchy

## Security

- Never commit `.env` file
- Use strong SESSION_SECRET
- Rotate tokens periodically
- Keep dependencies updated
