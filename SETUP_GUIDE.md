# 🚀 Setup Guide - Villain Seraphyx Manager Bot

Panduan lengkap untuk setup bot Discord dari awal.

## 📋 Prerequisites

- Node.js v16.9.0 atau lebih tinggi
- Discord Bot Token
- MongoDB Database (Atlas atau local)
- Server Discord dengan permission Administrator

## 🔧 Step 1: Discord Bot Setup

### 1.1 Buat Discord Application
1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik "New Application"
3. Beri nama bot Anda (contoh: "Villain Seraphyx Manager")
4. Klik "Create"

### 1.2 Setup Bot
1. Di sidebar kiri, klik "Bot"
2. Klik "Add Bot"
3. **Copy TOKEN** - simpan untuk nanti
4. **Copy APPLICATION ID** (dari General Information) - ini adalah CLIENT_ID

### 1.3 Setup OAuth2 (untuk Web Dashboard)
1. Di sidebar kiri, klik "OAuth2" > "General"
2. Add Redirect URL: `http://localhost:3001/auth/discord/callback`
3. **Copy CLIENT SECRET** - simpan untuk nanti

### 1.4 Bot Permissions
Aktifkan permissions berikut di tab "Bot":
- [x] Send Messages
- [x] Use Slash Commands
- [x] Read Message History
- [x] Manage Messages
- [x] Manage Roles
- [x] Manage Channels
- [x] Connect (Voice)
- [x] Speak (Voice)

### 1.5 Invite Bot ke Server
1. Di sidebar kiri, klik "OAuth2" > "URL Generator"
2. Pilih scopes:
   - [x] bot
   - [x] applications.commands
3. Pilih bot permissions (Administrator untuk mudah)
4. Copy generated URL dan buka di browser
5. Pilih server dan authorize

## 🗄️ Step 2: Database Setup

### Option A: MongoDB Atlas (Free - Recommended)
1. Buka [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Buat akun gratis
3. Buat cluster baru (pilih free tier)
4. Buat database user:
   - Username: `botuser`
   - Password: `[generate strong password]`
5. Whitelist IP: `0.0.0.0/0` (semua IP)
6. Copy connection string
7. Replace `<password>` dengan password yang dibuat

### Option B: MongoDB Local
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Connection string
mongodb://localhost:27017/villain-seraphyx-bot
```

## ⚙️ Step 3: Configure Environment

### 3.1 Copy dan Edit .env File
```bash
cp .env.example .env
```

Edit `.env` dengan informasi Anda:

```env
# ==================== CORE CREDENTIALS (REQUIRED) ====================
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# ==================== OWNER & ADMIN (REQUIRED) ====================
OWNER_IDS=your_user_id_here

# ==================== WEB DASHBOARD ====================
SESSION_SECRET=generate-random-string-here
WEB_PORT=3001
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# ==================== WEBHOOK SERVER (Optional) ====================
WEBHOOK_PORT=3000
WEBHOOK_TOKEN=your_tako_webhook_token_here
```

### 3.2 Cara Mendapatkan IDs Discord

**User ID:**
1. Enable Developer Mode di Discord (Settings > Advanced > Developer Mode)
2. Right-click username Anda > Copy ID

**Guild ID (Server ID):**
1. Right-click nama server > Copy ID

## 🎯 Step 4: Install & Run

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Start Bot
```bash
npm start
```

Jika berhasil, Anda akan melihat:
```
╔════════════════════════════════════════╗
║   🗄️  DATABASE CONNECTION SUCCESS     ║
╠════════════════════════════════════════╣
║  Status    : ✅ Connected              ║
║  Database  : MongoDB Atlas             ║
╚════════════════════════════════════════╝

╔════════════════════════════════════════╗
║        🤖 BOT IS NOW ONLINE! 🚀       ║
╠════════════════════════════════════════╣
║  Bot Tag   : YourBot#1234             ║
║  Status    : ✅ All Systems Ready      ║
╚════════════════════════════════════════╝

[Dashboard] Web dashboard running on port 3001
```

## 🌐 Step 5: Web Dashboard Configuration

### 5.1 Access Dashboard
1. Buka browser: `http://localhost:3001/dashboard`
2. Login dengan Discord OAuth2
3. Pilih server yang ingin dikonfigurasi

### 5.2 Configure via Dashboard
Semua pengaturan berikut dapat dikelola melalui web dashboard:
- **Channels** - Welcome, ticket, confession, giveaway, dll.
- **Roles** - Staff, level roles, support tiers, dll.
- **Features** - Leveling, economy, ticket system, dll.
- **Appearance** - Colors, emojis, images
- **Language** - Default language settings

## 🚀 Step 6: Deployment Options

### Option A: Local Development
```bash
npm start
```

### Option B: VPS dengan PM2
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name villain-seraphyx-bot

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Option C: Docker
```bash
# Build dan run
docker-compose up -d

# Check logs
docker-compose logs -f discord-bot
```

## 🔧 Server Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Tako Webhook | Donation webhook server |
| 3001 | Web Dashboard | Configuration dashboard |

## ✅ Step 7: Verification

### 7.1 Test Commands
Test beberapa command dasar:
- `/ping` - Check bot latency
- `/info` - Bot information
- `/rank` - User ranking
- `/balance` - Economy system

### 7.2 Test Dashboard
1. Buka `http://localhost:3001/dashboard`
2. Login dengan Discord
3. Coba ubah beberapa settings
4. Verify perubahan tersimpan

### 7.3 Check Logs
```bash
# PM2
pm2 logs villain-seraphyx-bot

# Docker
docker-compose logs -f discord-bot

# Local
Check console output
```

## 🔍 Troubleshooting

### Bot tidak start
- ✅ Check TOKEN di `.env`
- ✅ Check MongoDB connection
- ✅ Check Node.js version (v16.9.0+)
- ✅ Check console errors

### Dashboard tidak bisa login
- ✅ Check DISCORD_CLIENT_SECRET di `.env`
- ✅ Check DISCORD_CALLBACK_URL match dengan Discord Developer Portal
- ✅ Check SESSION_SECRET sudah diset

### Commands tidak bekerja
- ✅ Check bot permissions di server
- ✅ Check GUILD_ID di `.env`
- ✅ Re-invite bot dengan proper permissions

### Database errors
- ✅ Check MONGO_URI format
- ✅ Check database user permissions
- ✅ Check network connectivity

## 📞 Support

Jika mengalami masalah:
1. Check logs untuk error messages
2. Verify semua environment variables
3. Test dengan minimal configuration dulu
4. Buat issue di GitHub repository

## 🎉 Selesai!

Bot Anda sekarang siap digunakan! 

**Next Steps:**
- Configure bot via web dashboard
- Setup welcome messages
- Configure economy system
- Setup moderation tools
- Add custom emojis

---

**Happy botting!** 🤖✨
