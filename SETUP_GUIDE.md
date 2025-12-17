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

### 1.3 Bot Permissions
Aktifkan permissions berikut di tab "Bot":
- [x] Send Messages
- [x] Use Slash Commands
- [x] Read Message History
- [x] Manage Messages
- [x] Manage Roles
- [x] Manage Channels
- [x] Connect (Voice)
- [x] Speak (Voice)

### 1.4 Invite Bot ke Server
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

### 3.1 Edit .env File
File `.env` sudah dibuat. Edit dengan informasi Anda:

```env
# ==================== BOT CREDENTIALS ====================
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here

# ==================== MONGODB ====================
MONGO_URI=your_mongodb_connection_string_here

# ==================== OWNER & ADMIN ====================
OWNER_IDS=your_user_id_here
```

### 3.2 Cara Mendapatkan IDs Discord

**User ID:**
1. Enable Developer Mode di Discord (Settings > Advanced > Developer Mode)
2. Right-click username Anda > Copy ID

**Guild ID (Server ID):**
1. Right-click nama server > Copy ID

**Channel ID:**
1. Right-click channel > Copy ID

**Role ID:**
1. Server Settings > Roles > Right-click role > Copy ID

## 🎯 Step 4: Basic Configuration

### 4.1 Minimal Required Settings
Edit file `.env` dengan minimal settings ini:

```env
# Required
TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
MONGO_URI=your_mongo_connection_string
OWNER_IDS=your_user_id

# Recommended
WELCOME_CHANNEL_ID=your_welcome_channel_id
STAFF_ROLE_ID=your_staff_role_id
```

### 4.2 Test Bot
```bash
# Test bot locally
npm start
```

Jika berhasil, Anda akan melihat:
```
✅ Bot is ready! Logged in as YourBotName#1234
✅ Connected to MongoDB
✅ Loaded X commands
```

## 🚀 Step 5: Deployment Options

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

### Option D: Cloud Platforms
- **Heroku**: Push ke GitHub, connect repository
- **Railway**: Import GitHub repository
- **Replit**: Import project, add secrets

## 🔧 Step 6: Advanced Configuration

### 6.1 Channel Setup
Setelah bot berjalan, setup channel IDs di `.env`:

```env
# Welcome System
WELCOME_CHANNEL_ID=123456789
WELCOME_LOG_CHANNEL_ID=123456789

# Ticket System
TICKET_LOG_CHANNEL_ID=123456789
TICKET_CATEGORY_ID=123456789

# Economy & Levels
CONFESSION_CHANNEL_ID=123456789
DONATION_CHANNEL_ID=123456789
```

### 6.2 Role Setup
Setup role IDs untuk leveling system:

```env
# Staff Roles
STAFF_ROLE_ID=123456789
ADMIN_ROLE_ID=123456789
MODERATOR_ROLE_ID=123456789

# Level Roles
LEVEL_10_ROLE_ID=123456789
LEVEL_20_ROLE_ID=123456789
LEVEL_30_ROLE_ID=123456789
```

### 6.3 Custom Emojis (Optional)
Upload custom emojis ke server dan tambahkan ke `.env`:

```env
EMOJI_SOULS=<:souls:123456789>
EMOJI_CHECK=<a:check:123456789>
EMOJI_CROSS=<:cross:123456789>
```

## ✅ Step 7: Verification

### 7.1 Test Commands
Test beberapa command dasar:
- `/ping` - Check bot latency
- `/info` - Bot information
- `/rank` - User ranking
- `/balance` - Economy system

### 7.2 Check Logs
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
- ✅ Check Node.js version
- ✅ Check console errors

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
- Customize welcome messages
- Setup economy system
- Configure moderation tools
- Add custom emojis
- Setup monitoring

---

**Happy botting!** 🤖✨