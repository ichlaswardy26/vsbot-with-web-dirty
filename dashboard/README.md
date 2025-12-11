# Anna Manager Bot - Dashboard

Dashboard web modern untuk mengontrol dan memonitor Anna Manager Bot dengan fitur lengkap.

## 🌟 Fitur

### 1. **Authentication & Security**
- Login dengan Discord OAuth2
- Role-based access control
- Session management dengan MongoDB
- Rate limiting untuk keamanan

### 2. **Dashboard Overview**
- Statistik real-time bot
- Top users by souls dan level
- Active giveaways counter
- Quick access ke semua fitur

### 3. **User Management**
- Lihat semua user dengan pagination
- Edit souls dan bank balance
- Delete user data
- Search functionality

### 4. **Level Management**
- Monitor level dan XP semua user
- Edit level dan XP
- Progress bar visual
- Sorting dan filtering

### 5. **Configuration Management**
- Edit semua konfigurasi bot via web
- Bot credentials
- Channel IDs
- Role IDs
- Feature settings (XP, economy, dll)
- Save langsung ke .env file

### 6. **Bot Control**
- Monitor bot status (online/offline)
- Lihat uptime dan memory usage
- Restart/stop bot (coming soon)
- Clear cache
- View logs

### 7. **Analytics**
- User growth charts
- Level distribution
- Economy statistics
- Activity heatmap
- Real-time data visualization

## 🚀 Installation

### Prerequisites
- Node.js v16 atau lebih tinggi
- MongoDB database (sama dengan bot)
- Discord Application dengan OAuth2 setup

### Setup Discord OAuth2

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Pilih aplikasi bot Anda
3. Pergi ke **OAuth2** → **General**
4. Tambahkan Redirect URL: `http://localhost:8080/auth/discord/callback`
5. Copy **Client ID** dan **Client Secret**

### Install Dependencies

```bash
cd dashboard
npm install
```

### Configure Environment

1. Copy `.env.example` ke `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` dan isi dengan data Anda:
```env
PORT=8080
NODE_ENV=development

# Discord OAuth2
DISCORD_CLIENT_ID=your_bot_client_id
DISCORD_CLIENT_SECRET=your_bot_client_secret
DISCORD_CALLBACK_URL=http://localhost:8080/auth/discord/callback

# Session Secret (generate random string)
SESSION_SECRET=your_random_session_secret_here

# MongoDB (sama dengan bot)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Admin User IDs (Discord user IDs yang bisa akses dashboard)
ADMIN_IDS=123456789012345678,987654321098765432

DASHBOARD_URL=http://localhost:8080
```

### Generate Session Secret

Gunakan command ini untuk generate random session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🎯 Usage

### Start Dashboard

```bash
npm start
```

Atau untuk development dengan auto-reload:
```bash
npm run dev
```

Dashboard akan berjalan di: `http://localhost:8080`

### Login

1. Buka `http://localhost:8080`
2. Klik **Login with Discord**
3. Authorize aplikasi
4. Anda akan diarahkan ke dashboard

**Note:** Hanya user dengan ID yang ada di `ADMIN_IDS` yang bisa login.

## 📁 Struktur Folder

```
dashboard/
├── server/
│   ├── config/
│   │   └── passport.js          # Discord OAuth2 config
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── index.js             # Home routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── dashboard.js         # Dashboard routes
│   │   └── api.js               # API endpoints
│   └── index.js                 # Main server file
├── views/
│   ├── partials/
│   │   ├── header.ejs           # HTML head & styles
│   │   ├── navbar.ejs           # Navigation bar
│   │   ├── sidebar.ejs          # Dashboard sidebar
│   │   └── footer.ejs           # Footer & scripts
│   ├── dashboard/
│   │   ├── index.ejs            # Dashboard overview
│   │   ├── users.ejs            # User management
│   │   ├── levels.ejs           # Level management
│   │   ├── config.ejs           # Configuration
│   │   ├── control.ejs          # Bot control
│   │   └── analytics.ejs        # Analytics
│   ├── index.ejs                # Landing page
│   ├── 404.ejs                  # 404 page
│   └── error.ejs                # Error page
├── public/                      # Static files (if needed)
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Bot Status
```
GET /api/bot/status
```
Returns bot running status and uptime.

### Update User
```
POST /api/users/:userId
Body: { souls: number, bank: number }
```
Update user's souls and bank balance.

### Update Level
```
POST /api/levels/:userId
Body: { level: number, xp: number }
```
Update user's level and XP.

### Delete User
```
DELETE /api/users/:userId
```
Delete user and all related data.

### Update Configuration
```
POST /api/config
Body: { config: object }
```
Update bot configuration (.env file).

### Get Statistics
```
GET /api/stats
```
Get bot statistics (users, levels, souls).

## 🎨 Customization

### Colors
Edit Tailwind colors di `views/partials/header.ejs`:
```css
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Sidebar Links
Edit sidebar di `views/partials/sidebar.ejs` untuk menambah/mengurangi menu.

### Charts
Edit charts di `views/dashboard/analytics.ejs` menggunakan Chart.js.

## 🔒 Security

- **Authentication**: Discord OAuth2 dengan role-based access
- **Session**: Secure session dengan MongoDB store
- **Rate Limiting**: Mencegah spam requests
- **Helmet**: Security headers
- **Environment Variables**: Sensitive data di .env

## 🐛 Troubleshooting

### Dashboard tidak bisa login
- Pastikan `ADMIN_IDS` berisi Discord user ID Anda
- Check Discord OAuth2 redirect URL sudah benar
- Verify `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET`

### Bot status selalu offline
- Pastikan bot sedang running
- Check MongoDB connection
- Verify bot dan dashboard menggunakan database yang sama

### Configuration tidak tersimpan
- Check file permissions untuk `.env`
- Pastikan path `BOT_ENV_PATH` benar
- Restart bot setelah update config

## 📚 Additional Documentation

- **[QUICK_START_DASHBOARD.md](../QUICK_START_DASHBOARD.md)** - Setup dashboard dalam 5 menit
- **[DASHBOARD_FEATURES.md](../DASHBOARD_FEATURES.md)** - Dokumentasi lengkap semua fitur
- **[CHECKLIST.md](CHECKLIST.md)** - Installation checklist untuk memastikan semua setup benar

## 📝 Development

### Add New Page

1. Buat route di `server/routes/dashboard.js`:
```javascript
router.get('/newpage', ensureAuthenticated, (req, res) => {
  res.render('dashboard/newpage', { title: 'New Page' });
});
```

2. Buat view di `views/dashboard/newpage.ejs`

3. Tambahkan link di sidebar `views/partials/sidebar.ejs`

### Add New API Endpoint

Edit `server/routes/api.js`:
```javascript
router.get('/api/newendpoint', ensureAuthenticated, async (req, res) => {
  // Your logic here
  res.json({ success: true, data: {} });
});
```

## 🚀 Production Deployment

### Environment Variables
Set `NODE_ENV=production` dan update URLs:
```env
NODE_ENV=production
DASHBOARD_URL=https://yourdomain.com
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback
```

### Process Manager
Gunakan PM2 untuk production:
```bash
npm install -g pm2
pm2 start server/index.js --name "anna-dashboard"
pm2 save
pm2 startup
```

### Reverse Proxy
Setup Nginx untuk HTTPS:
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

## 📄 License

Same as Anna Manager Bot - ISC License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

Jika ada masalah atau pertanyaan, silakan buat issue di GitHub repository.

---

Made with ❤️ for Anna Manager Bot
