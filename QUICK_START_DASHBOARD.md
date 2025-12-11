# 🚀 Quick Start - Dashboard Villain Seraphyx Bot

Panduan cepat untuk menjalankan dashboard dalam 5 menit!

## ⚡ Super Quick Start

### 1. Install Dependencies (1 menit)
```bash
cd dashboard
npm install
```

### 2. Setup Discord OAuth2 (2 menit)

1. Buka https://discord.com/developers/applications
2. Pilih bot Anda → **OAuth2** → **General**
3. Tambahkan redirect: `http://localhost:8080/auth/discord/callback`
4. Copy **Client ID** dan **Client Secret**

### 3. Configure Environment (1 menit)

```bash
copy .env.example .env
```

Edit `.env`:
```env
DISCORD_CLIENT_ID=paste_client_id_disini
DISCORD_CLIENT_SECRET=paste_client_secret_disini
MONGO_URI=paste_mongo_uri_dari_bot
ADMIN_IDS=paste_discord_user_id_anda
SESSION_SECRET=paste_random_string_32_karakter
```

**Generate Session Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Get Discord User ID:**
- Discord → Settings → Advanced → Developer Mode (ON)
- Klik kanan nama Anda → Copy ID

### 4. Start Dashboard (30 detik)
```bash
npm start
```

### 5. Login (30 detik)
1. Buka http://localhost:8080
2. Klik **Login with Discord**
3. Authorize
4. Done! 🎉

## 🎯 Apa yang Bisa Dilakukan?

### ✅ User Management
- Edit souls dan bank user
- Delete user data
- Search user

### ✅ Level Management
- Edit level dan XP
- Lihat progress bar
- Sort by level

### ✅ Configuration
- Edit semua setting bot
- Channel IDs
- Role IDs
- Feature settings

### ✅ Bot Control
- Monitor status bot
- Lihat uptime
- Quick statistics

### ✅ Analytics
- User growth chart
- Level distribution
- Economy stats

## 🔥 Pro Tips

### Tip 1: Start Bot & Dashboard Bersamaan
```bash
# Di root folder project
start-all.bat
```

### Tip 2: Development Mode (Auto-reload)
```bash
cd dashboard
npm run dev
```

### Tip 3: Multiple Admins
```env
ADMIN_IDS=123456789,987654321,111222333
```

### Tip 4: Custom Port
```env
PORT=3001
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
```
Jangan lupa update di Discord Developer Portal!

## ❌ Common Errors & Fixes

### Error: "Cannot find module"
```bash
cd dashboard
npm install
```

### Error: "Unauthorized"
- Check `ADMIN_IDS` berisi Discord user ID Anda
- Pastikan tidak ada spasi di antara IDs

### Error: "Invalid redirect_uri"
- Check `DISCORD_CALLBACK_URL` di `.env`
- Pastikan sama dengan di Discord Developer Portal

### Error: "MongoDB connection failed"
- Check `MONGO_URI` sama dengan bot
- Test connection dengan MongoDB Compass

### Error: "Port already in use"
- Ganti `PORT` di `.env`
- Update `DISCORD_CALLBACK_URL`
- Update di Discord Developer Portal

## 📱 Access Dashboard

### Local
```
http://localhost:8080
```

### Network (dari device lain)
```
http://YOUR_LOCAL_IP:8080
```

Get your local IP:
```bash
ipconfig
```
Cari "IPv4 Address"

## 🎨 Customize

### Change Colors
Edit `dashboard/views/partials/header.ejs`:
```css
.gradient-bg {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Add Menu
Edit `dashboard/views/partials/sidebar.ejs`:
```html
<a href="/dashboard/newpage" class="sidebar-link ...">
  <i class="fas fa-icon"></i>
  <span>New Page</span>
</a>
```

## 🚀 Next Steps

1. ✅ Dashboard running
2. 📖 Read [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md) untuk fitur lengkap
3. 🔧 Customize sesuai kebutuhan
4. 🌐 Deploy ke production (optional)

## 📞 Need Help?

- 📖 Full Guide: [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md)
- 🐛 Issues: GitHub Issues
- 💬 Discord: Support Server

---

**Selamat! Dashboard Anda sudah siap! 🎉**

Made with ❤️ for Villain Seraphyx Manager Bot
