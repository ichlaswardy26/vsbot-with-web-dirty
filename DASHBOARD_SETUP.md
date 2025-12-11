# 🎯 Villain Seraphyx Bot Dashboard - Setup Guide

Panduan lengkap untuk setup dan menjalankan dashboard Villain Seraphyx Manager Bot.

## 📋 Prerequisites

Sebelum memulai, pastikan Anda sudah memiliki:

- ✅ Node.js v16 atau lebih tinggi
- ✅ MongoDB database (sama dengan bot)
- ✅ Discord Bot Application
- ✅ Bot sudah berjalan dengan baik

## 🚀 Quick Start

### 1. Setup Discord OAuth2

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Pilih aplikasi bot Anda
3. Pergi ke **OAuth2** → **General**
4. Di bagian **Redirects**, tambahkan:
   ```
   http://localhost:8080/auth/discord/callback
   ```
5. Klik **Save Changes**
6. Copy **Client ID** dan **Client Secret** (akan digunakan nanti)

### 2. Install Dependencies

```bash
cd dashboard
npm install
```

### 3. Configure Environment

1. Copy file `.env.example` menjadi `.env`:
```bash
copy .env.example .env
```

2. Edit file `.env` dengan text editor favorit Anda:

```env
# Dashboard Configuration
PORT=8080
NODE_ENV=development

# Discord OAuth2 (dari Discord Developer Portal)
DISCORD_CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_bot_client_secret_here
DISCORD_CALLBACK_URL=http://localhost:8080/auth/discord/callback

# Session Secret (generate random string)
SESSION_SECRET=generate_random_string_here

# MongoDB (SAMA dengan bot)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Admin User IDs (Discord user ID Anda)
ADMIN_IDS=123456789012345678,987654321098765432

# Dashboard URL
DASHBOARD_URL=http://localhost:8080
```

### 4. Generate Session Secret

Jalankan command ini untuk generate random session secret:

**Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy hasilnya dan paste ke `SESSION_SECRET` di file `.env`

### 5. Get Your Discord User ID

Untuk mendapatkan Discord User ID Anda:

1. Buka Discord
2. Pergi ke **Settings** → **Advanced**
3. Aktifkan **Developer Mode**
4. Klik kanan nama Anda → **Copy ID**
5. Paste ID tersebut ke `ADMIN_IDS` di file `.env`

**Note:** Anda bisa menambahkan multiple admin dengan memisahkan menggunakan koma:
```env
ADMIN_IDS=123456789012345678,987654321098765432,111222333444555666
```

### 6. Start Dashboard

```bash
npm start
```

Atau untuk development mode dengan auto-reload:
```bash
npm run dev
```

Dashboard akan berjalan di: **http://localhost:8080**

### 7. Login ke Dashboard

1. Buka browser dan akses: `http://localhost:8080`
2. Klik tombol **Login with Discord**
3. Authorize aplikasi
4. Anda akan diarahkan ke dashboard!

## 🎨 Fitur Dashboard

### 1. Dashboard Overview
- Statistik real-time (total users, levels, giveaways)
- Top 10 users by souls
- Top 10 users by level
- Quick navigation

### 2. Users Management
- Lihat semua user dengan pagination
- Edit souls dan bank balance
- Delete user data
- Search user by ID

### 3. Levels Management
- Monitor level dan XP semua user
- Edit level dan XP
- Visual progress bar
- Pagination

### 4. Configuration
- Edit semua konfigurasi bot via web
- Bot credentials (token, client ID, guild ID)
- Channel IDs (welcome, boost, ticket, dll)
- Role IDs (staff, support, level roles)
- Feature settings (XP, economy, cooldowns)
- Save langsung ke .env file

### 5. Bot Control
- Monitor bot status (online/offline)
- Lihat uptime dan memory usage
- Quick statistics
- Control actions (restart, stop, clear cache)

### 6. Analytics
- User growth charts
- Level distribution pie chart
- Economy statistics bar chart
- Activity overview cards

## 🔧 Troubleshooting

### Problem: Dashboard tidak bisa login

**Solution:**
1. Pastikan `ADMIN_IDS` berisi Discord user ID Anda yang benar
2. Check Discord OAuth2 redirect URL sudah ditambahkan
3. Verify `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET` benar
4. Clear browser cookies dan coba lagi

### Problem: Bot status selalu offline

**Solution:**
1. Pastikan bot sedang running
2. Check MongoDB connection (bot dan dashboard harus pakai database yang sama)
3. Verify `MONGO_URI` di dashboard sama dengan bot

### Problem: Configuration tidak tersimpan

**Solution:**
1. Check file permissions untuk `.env` file
2. Pastikan path ke bot `.env` benar
3. Restart bot setelah update configuration

### Problem: Error "Cannot find module"

**Solution:**
```bash
cd dashboard
npm install
```

### Problem: Port 8080 sudah digunakan

**Solution:**
Edit `PORT` di file `.env`:
```env
PORT=3001
```
Dan update `DISCORD_CALLBACK_URL`:
```env
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
```
Jangan lupa update juga di Discord Developer Portal!

## 🔒 Security Tips

1. **Jangan share** file `.env` Anda
2. **Jangan commit** file `.env` ke Git
3. **Gunakan strong session secret** (minimal 32 characters)
4. **Hanya tambahkan trusted users** ke `ADMIN_IDS`
5. **Gunakan HTTPS** untuk production

## 📱 Production Deployment

### Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create villain-seraphyx-bot-dashboard`
4. Set environment variables:
```bash
heroku config:set DISCORD_CLIENT_ID=your_id
heroku config:set DISCORD_CLIENT_SECRET=your_secret
heroku config:set SESSION_SECRET=your_secret
heroku config:set MONGO_URI=your_mongo_uri
heroku config:set ADMIN_IDS=your_ids
heroku config:set NODE_ENV=production
```
5. Deploy: `git push heroku main`

### VPS (Ubuntu)

1. Install Node.js dan PM2:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

2. Clone repository dan install:
```bash
git clone your-repo
cd dashboard
npm install
```

3. Setup environment variables (edit `.env`)

4. Start with PM2:
```bash
pm2 start server/index.js --name "villain-seraphyx-dashboard"
pm2 save
pm2 startup
```

5. Setup Nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. Setup SSL dengan Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🆘 Need Help?

Jika masih ada masalah:

1. Check logs: `npm start` dan lihat error messages
2. Verify semua environment variables sudah benar
3. Pastikan MongoDB connection string valid
4. Test Discord OAuth2 di Developer Portal
5. Buat issue di GitHub repository

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/ichlaswardy26/Villain Seraphyx-Manager/issues)
- Discord: Join support server (if available)

---

**Happy Managing! 🎉**

Made with ❤️ for Villain Seraphyx Manager Bot
