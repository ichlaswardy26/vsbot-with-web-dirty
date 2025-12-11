# 🚀 Deployment Guide - Discord Bot ke VPS

Panduan lengkap untuk deploy Discord Bot ke VPS menggunakan Docker Compose dengan auto-restart ketika file .env berubah.

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Minimal 1GB RAM dan 10GB storage
- Akses SSH ke VPS
- Domain (optional, untuk SSL)

## 🛠️ Setup VPS

### 1. Setup Otomatis
```bash
# Download dan jalankan setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/villain-seraphyx-bot/main/scripts/setup-vps.sh | bash

# Atau manual:
wget https://raw.githubusercontent.com/your-repo/villain-seraphyx-bot/main/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2. Setup Manual
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout dan login kembali
```

## 📦 Deployment

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/your-username/villain-seraphyx-bot.git discord-bot
cd discord-bot
```

### 2. Konfigurasi Environment
```bash
# Copy dan edit .env file
cp .env.example .env
nano .env

# Isi semua environment variables yang diperlukan
```

### 3. Deploy Bot
```bash
# Untuk production
./deploy.sh production

# Untuk development
docker-compose -f docker-compose.dev.yml up -d
```

## 🔄 Auto-Restart ketika .env Berubah

Bot akan otomatis restart ketika file .env berubah menggunakan beberapa metode:

### 1. Watchtower (Recommended)
- Menggunakan container `watchtower` yang memantau perubahan
- Auto-restart setiap 30 detik jika ada perubahan
- Sudah dikonfigurasi di `docker-compose.yml`

### 2. File Watcher (Alternative)
```bash
# Jalankan env watcher secara terpisah
node env-watcher.js

# Atau menggunakan docker-compose.dev.yml yang sudah include watcher
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Manual Restart
```bash
# Restart container setelah mengubah .env
docker-compose restart discord-bot

# Atau rebuild jika ada perubahan besar
docker-compose down
docker-compose up -d --build
```

## 📊 Monitoring & Management

### 1. Melihat Logs
```bash
# Real-time logs
docker-compose logs -f discord-bot

# Logs dengan timestamp
docker-compose logs -f --timestamps discord-bot

# Logs terakhir 100 baris
docker-compose logs --tail=100 discord-bot
```

### 2. Status Container
```bash
# Status semua container
docker-compose ps

# Status detail
docker stats

# Health check
docker-compose exec discord-bot node -e "console.log('Bot is running')"
```

### 3. Portainer (Web UI)
- Akses: `http://your-vps-ip:9000`
- Username/Password: Setup saat pertama kali akses
- Manage containers, images, volumes, networks

### 4. Monitoring Script
```bash
# Jalankan monitoring manual
~/discord-bot/monitor.sh

# Lihat log monitoring
tail -f ~/discord-bot/logs/monitor.log
```

## 🔧 Maintenance

### 1. Update Bot
```bash
cd ~/discord-bot
git pull origin main
./deploy.sh
```

### 2. Backup
```bash
# Backup otomatis
./scripts/backup.sh

# Backup dengan nama custom
./scripts/backup.sh "backup_before_update"

# Lihat semua backup
ls -la backups/
```

### 3. Restore
```bash
# Lihat available backups
./scripts/restore.sh

# Restore backup tertentu
./scripts/restore.sh backup_20231211_143022
```

### 4. Clean Up
```bash
# Clean unused Docker resources
docker system prune -f

# Clean old images
docker image prune -f

# Clean old logs
find logs/ -name "*.log" -mtime +7 -delete
```

## 🚨 Troubleshooting

### Bot tidak start
```bash
# Check logs
docker-compose logs discord-bot

# Check .env file
cat .env | grep -v "^#" | grep -v "^$"

# Restart container
docker-compose restart discord-bot
```

### Auto-restart tidak bekerja
```bash
# Check watchtower logs
docker-compose logs watchtower

# Manual restart watchtower
docker-compose restart watchtower

# Check file permissions
ls -la .env
```

### Memory/CPU tinggi
```bash
# Check resource usage
docker stats

# Restart bot
docker-compose restart discord-bot

# Check system resources
htop
df -h
```

### Container crash loop
```bash
# Check logs untuk error
docker-compose logs --tail=50 discord-bot

# Check health status
docker-compose ps

# Rebuild container
docker-compose down
docker-compose up -d --build
```

## 📁 File Structure

```
discord-bot/
├── docker-compose.yml          # Production compose
├── docker-compose.dev.yml      # Development compose
├── docker-compose.prod.yml     # Production dengan monitoring
├── Dockerfile                  # Bot container image
├── .dockerignore              # Docker ignore file
├── deploy.sh                  # Deployment script
├── env-watcher.js             # File watcher untuk .env
├── scripts/
│   ├── setup-vps.sh          # VPS setup script
│   ├── backup.sh             # Backup script
│   └── restore.sh            # Restore script
├── logs/                     # Log files
├── backups/                  # Backup files
└── .env                      # Environment variables
```

## 🔐 Security Best Practices

1. **Environment Variables**
   - Jangan commit file `.env` ke git
   - Gunakan strong passwords untuk database
   - Rotate tokens secara berkala

2. **VPS Security**
   - Setup firewall (UFW)
   - Disable root login
   - Use SSH keys instead of passwords
   - Keep system updated

3. **Docker Security**
   - Run containers as non-root user
   - Use official base images
   - Regularly update images
   - Limit container resources

## 📞 Support

Jika mengalami masalah:

1. Check logs: `docker-compose logs -f discord-bot`
2. Check status: `docker-compose ps`
3. Restart: `docker-compose restart discord-bot`
4. Rebuild: `docker-compose up -d --build`

Untuk bantuan lebih lanjut, buat issue di repository GitHub.