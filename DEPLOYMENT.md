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

# Deploy (basic)
./deploy.sh prod

# Deploy with Nginx (recommended for production)
./scripts/deploy-nginx.sh prod

# Deploy for IP-based VPS (43.129.55.161)
./scripts/deploy-ip.sh

# Deploy for IP-based VPS with SSL
./scripts/deploy-ip.sh --ssl

# Deploy with Auto SSL (for domain-based)
./scripts/setup-ssl.sh yourdomain.com your@email.com
```

**Commands:**
```bash
# Basic deployment
docker compose -f docker-compose.prod.yml logs -f discord-bot

# Nginx deployment
docker compose -f docker-compose.nginx.yml logs -f discord-bot
docker compose -f docker-compose.nginx.yml logs -f nginx

# IP-based deployment (43.129.55.161)
docker compose -f docker-compose.ip.yml logs -f discord-bot
docker compose -f docker-compose.ip.yml logs -f nginx

# Auto SSL deployment
docker compose -f docker-compose.ssl.yml logs -f discord-bot
docker compose -f docker-compose.ssl.yml logs -f nginx
docker compose -f docker-compose.ssl.yml logs -f ssl-renewer

# Restart
docker compose -f docker-compose.prod.yml restart
# or with nginx
docker compose -f docker-compose.nginx.yml restart
# or IP-based
docker compose -f docker-compose.ip.yml restart
# or with auto SSL
docker compose -f docker-compose.ssl.yml restart

# Stop
docker compose -f docker-compose.prod.yml down
# or with nginx
docker compose -f docker-compose.nginx.yml down
# or IP-based
docker compose -f docker-compose.ip.yml down
# or with auto SSL
docker compose -f docker-compose.ssl.yml down

# With monitoring (Portainer)
docker compose -f docker-compose.prod.yml --profile monitoring up -d
# or with nginx
docker compose -f docker-compose.nginx.yml --profile monitoring up -d
# or IP-based
docker compose -f docker-compose.ip.yml --profile monitoring up -d
# or with auto SSL
docker compose -f docker-compose.ssl.yml --profile monitoring up -d
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
| 80   | Nginx   | HTTP reverse proxy (production) |
| 443  | Nginx   | HTTPS reverse proxy (production) |
| 3000 | Webhook | Tako donation webhook (direct access) |
| 3001 | Dashboard | Web configuration dashboard (direct access) |
| 9000 | Portainer | Container management (optional) |

**Note:** Dalam deployment dengan Nginx, port 3000 dan 3001 hanya dapat diakses melalui Nginx reverse proxy.

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

## Nginx Configuration

### Features
- **Reverse Proxy**: Semua traffic melalui Nginx
- **Rate Limiting**: Proteksi dari spam dan DDoS
- **SSL/TLS Support**: HTTPS dengan sertifikat
- **Static File Caching**: Optimasi performa
- **WebSocket Support**: Real-time features
- **Security Headers**: XSS, CSRF, dan proteksi lainnya
- **Load Balancing**: Siap untuk multiple instances

### SSL Certificate Setup

### Auto SSL Setup (Let's Encrypt)

**Automatic SSL certificate generation dan renewal:**

```bash
# Setup auto SSL (one-time)
./scripts/setup-ssl.sh yourdomain.com your@email.com

# Manual renewal (optional - auto renewal sudah aktif)
./scripts/renew-ssl.sh

# Check certificate status
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt certbot/certbot certificates
```

**Features:**
- ✅ **Automatic certificate generation** dengan Let's Encrypt
- ✅ **Auto-renewal** setiap 12 jam
- ✅ **HTTPS redirect** otomatis dari HTTP
- ✅ **Modern SSL configuration** (TLS 1.2/1.3)
- ✅ **OCSP stapling** untuk performa
- ✅ **HSTS headers** untuk security

**Cloudflare Origin Certificate:**
1. Login ke Cloudflare Dashboard
2. Pilih domain → SSL/TLS → Origin Server
3. Create Certificate
4. Save sebagai `nginx/ssl/cert.pem` dan `nginx/ssl/key.pem`

### Nginx Endpoints

| Endpoint | Target | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/` | Bot Dashboard | 10 req/s | Main application |
| `/api/*` | Bot API | 10 req/s | API endpoints |
| `/auth/*` | Bot Auth | 5 req/s | Discord OAuth |
| `/webhook` | Webhook Server | 20 req/s | Tako donations |
| `/socket.io/*` | WebSocket | No limit | Real-time updates |
| `/health` | Health Check | No limit | Monitoring |

### Monitoring

**Nginx Logs:**
```bash
# Access logs
docker compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/error.log
```

**Performance Testing:**
```bash
# Test rate limiting
ab -n 100 -c 10 http://localhost/api/health

# Test SSL
curl -I https://yourdomain.com/health
```

### Auto SSL Management

**Setup Cron Job untuk Auto Renewal (Optional - sudah ada container ssl-renewer):**
```bash
# Edit crontab
crontab -e

# Add line untuk renewal setiap hari jam 2 pagi
0 2 * * * /path/to/villain-seraphyx-bot/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

**SSL Certificate Monitoring:**
```bash
# Check certificate expiry
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt certbot/certbot certificates

# Check SSL grade
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com" | jq '.endpoints[0].grade'

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

**Troubleshooting SSL:**
```bash
# Check nginx SSL config
docker compose -f docker-compose.ssl.yml exec nginx nginx -t

# Check certificate files
docker compose -f docker-compose.ssl.yml exec nginx ls -la /etc/letsencrypt/live/yourdomain.com/

# Manual certificate renewal
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --dry-run

# Check SSL logs
docker compose -f docker-compose.ssl.yml logs ssl-renewer
```
## IP-based Deployment (VPS: 43.129.55.161)

### Quick Setup untuk VPS Anda

**Deploy tanpa SSL:**
```bash
# Clone dan setup
git clone <repo-url>
cd villain-seraphyx-bot
cp .env.example .env

# Edit .env dengan credentials Anda
nano .env

# Deploy dengan IP
./scripts/deploy-ip.sh
```

**Deploy dengan SSL (self-signed):**
```bash
# Deploy dengan SSL
./scripts/deploy-ip.sh --ssl
```

### Akses Bot Anda

**HTTP (tanpa SSL):**
- Dashboard: `http://43.129.55.161/dashboard`
- Webhook: `http://43.129.55.161/webhook`
- Health: `http://43.129.55.161/health`
- Portainer: `http://43.129.55.161:9000`

**HTTPS (dengan SSL):**
- Dashboard: `https://43.129.55.161/dashboard`
- Webhook: `https://43.129.55.161/webhook`
- Health: `https://43.129.55.161/health`
- Portainer: `http://43.129.55.161:9000`

### Discord OAuth2 Setup

**Update Discord Application:**
1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to OAuth2 → General
4. Add redirect URI:
   - HTTP: `http://43.129.55.161/auth/discord/callback`
   - HTTPS: `https://43.129.55.161/auth/discord/callback`

### Firewall Configuration

**Ubuntu/Debian:**
```bash
# Allow required ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 9000  # Portainer
sudo ufw enable
```

**CentOS/RHEL:**
```bash
# Allow required ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

### SSL Certificate Notes

**Self-signed Certificate:**
- Browser akan menampilkan warning security
- Klik "Advanced" → "Proceed to 43.129.55.161 (unsafe)"
- Certificate valid untuk 365 hari
- Cocok untuk testing dan development

**Production SSL (jika punya domain):**
- Point domain ke IP 43.129.55.161
- Gunakan `./scripts/setup-ssl.sh yourdomain.com your@email.com`
- Let's Encrypt certificate (gratis dan trusted)

### Monitoring dan Troubleshooting

**Check status:**
```bash
# Container status
docker compose -f docker-compose.ip.yml ps

# Logs
docker compose -f docker-compose.ip.yml logs -f nginx
docker compose -f docker-compose.ip.yml logs -f discord-bot

# Test endpoints
curl http://43.129.55.161/health
curl -k https://43.129.55.161/health  # -k untuk self-signed
```

**Common issues:**
- Port 80/443 blocked → Check firewall
- SSL warning → Normal untuk self-signed certificate
- OAuth error → Check Discord redirect URI
- Connection refused → Check if containers are running