# 🚀 Setup Dynamic Configuration System

Panduan lengkap untuk mengaktifkan sistem konfigurasi dinamis dengan dashboard web.

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB database
- Discord Bot Token
- Discord Application dengan OAuth2 setup

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
# Install bot dependencies
npm install

# Install dashboard dependencies
npm run setup
```

### 2. Environment Configuration

#### Bot Environment (.env)
```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi Anda:
```env
# Bot Credentials (REQUIRED)
TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id

# Database (REQUIRED)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Admin Access (REQUIRED)
OWNER_IDS=123456789012345678,987654321098765432
ADMIN_IDS=123456789012345678,987654321098765432
```

#### Dashboard Environment (dashboard/.env)
```bash
cd dashboard
cp .env.example .env
```

Edit `dashboard/.env`:
```env
# Dashboard Settings
PORT=8080
NODE_ENV=development

# Discord OAuth2 (REQUIRED untuk dashboard access)
DISCORD_CLIENT_ID=your_bot_client_id
DISCORD_CLIENT_SECRET=your_bot_client_secret
DISCORD_CALLBACK_URL=http://localhost:8080/auth/discord/callback

# Session Secret (REQUIRED)
SESSION_SECRET=your_random_session_secret_here

# Database (same as bot)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Admin Access (same as bot)
ADMIN_IDS=123456789012345678,987654321098765432
```

### 3. Discord OAuth2 Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** → **General**
4. Add redirect URL: `http://localhost:8080/auth/discord/callback`
5. Copy **Client Secret** ke dashboard `.env`

### 4. Migrate Existing Config

```bash
# Migrate current config.js to database
npm run config:migrate
```

### 5. Start Services

#### Option A: Start Both (Recommended)
```bash
npm run start:all
```

#### Option B: Start Separately
```bash
# Terminal 1: Start bot
npm start

# Terminal 2: Start dashboard
npm run dashboard
```

## 🎛️ Dashboard Access

1. Open browser: `http://localhost:8080`
2. Click **Login with Discord**
3. Authorize application
4. Access dashboard (pastikan user ID Anda di `ADMIN_IDS`)

## 🔧 Configuration

### Channel Configuration
1. Go to **Configuration** → **Channels**
2. Select channels dari dropdown interaktif
3. Channels dikelompokkan berdasarkan category
4. Save changes

### Role Configuration  
1. Go to **Configuration** → **Roles**
2. Select roles dengan preview warna
3. Support untuk nested roles (level roles, etc.)
4. Save changes

### Feature Configuration
1. Go to **Configuration** → **Features**
2. Adjust XP settings, economy, cooldowns
3. Set embed colors
4. Save changes

## 💻 Code Integration

### Update Commands untuk Dynamic Config

#### Before (Static):
```javascript
const config = require('./config');
const welcomeChannelId = config.channels.welcome;
```

#### After (Dynamic):
```javascript
const ConfigManager = require('./util/ConfigManager');
const welcomeChannelId = await ConfigManager.getChannelId('welcome');
```

### Example Command Update:
```javascript
// commands/welcome.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ConfigManager = require('../util/ConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Send welcome message'),
    
  async execute(interaction) {
    // Get dynamic config
    const [welcomeChannelId, primaryColor, welcomeEmoji] = await Promise.all([
      ConfigManager.getChannelId('welcome'),
      ConfigManager.getColor('primary'),
      ConfigManager.getEmoji('seraphyx')
    ]);
    
    if (!welcomeChannelId) {
      return interaction.reply('❌ Welcome channel not configured!');
    }
    
    const welcomeChannel = interaction.guild.channels.cache.get(welcomeChannelId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${welcomeEmoji} Welcome!`)
      .setColor(primaryColor)
      .setDescription('Welcome to our server!');
      
    await welcomeChannel.send({ embeds: [embed] });
    await interaction.reply('✅ Welcome message sent!');
  }
};
```

## 🔄 Backup & Restore

### Create Backup
```bash
npm run config:backup
```

### List Backups
```bash
npm run config:list
```

### Restore from Backup
```bash
npm run config:restore backups/config-backup-2025-01-01T12-00-00-000Z.json
```

## 🛠️ Troubleshooting

### Dashboard Won't Start
```bash
# Check dashboard dependencies
cd dashboard && npm install

# Check environment variables
cat dashboard/.env

# Check MongoDB connection
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('✅ DB OK')).catch(e => console.log('❌ DB Error:', e.message))"
```

### Can't Access Dashboard
1. Verify `ADMIN_IDS` contains your Discord user ID
2. Check Discord OAuth2 redirect URL
3. Ensure `DISCORD_CLIENT_SECRET` is correct
4. Clear browser cookies and try again

### Config Not Loading in Bot
```bash
# Test config loading
node -e "
const ConfigManager = require('./util/ConfigManager');
ConfigManager.getChannelId('welcome').then(id => 
  console.log('Welcome Channel:', id || 'Not configured')
);
"
```

### Database Connection Issues
1. Check MongoDB URI format
2. Verify database permissions
3. Test connection:
```bash
node -e "
require('mongoose').connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(e => console.log('❌ MongoDB error:', e.message))
"
```

## 🔒 Security Notes

### Sensitive Data
- `TOKEN`, `CLIENT_SECRET`, `MONGO_URI` tetap di `.env`
- Jangan commit file `.env` ke git
- Use strong `SESSION_SECRET` untuk dashboard

### Access Control
- Hanya user di `ADMIN_IDS` yang bisa akses dashboard
- `OWNER_IDS` memiliki akses penuh
- Regular users tidak bisa mengubah konfigurasi

## 🚀 Production Deployment

### Environment Variables
```bash
# Production settings
NODE_ENV=production
DASHBOARD_URL=https://yourdomain.com
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback
```

### Process Management
```bash
# Using PM2
pm2 start ecosystem.config.js

# Or Docker
docker-compose up -d
```

### Reverse Proxy (Nginx)
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

## 📚 Advanced Usage

### Custom Config Sections
```javascript
// Extend BotConfig model
const customSchema = {
  myCustomSection: {
    setting1: { type: String, default: 'value1' },
    setting2: { type: Number, default: 100 }
  }
};

// Use in code
const customValue = await ConfigManager.get('myCustomSection.setting1');
```

### Validation Rules
```javascript
// Add validation in dashboard
const validation = await ConfigManager.validateConfig();
if (!validation.valid) {
  console.log('Config issues:', validation.issues);
}
```

### Real-time Updates
```javascript
// Listen for config changes
socket.on('configUpdated', (data) => {
  console.log(`Config updated by ${data.updatedBy}`);
  ConfigManager.clearCache(); // Force refresh
});
```

## 🎉 Success!

Setelah setup selesai, Anda akan memiliki:

- ✅ Dashboard web untuk konfigurasi bot
- ✅ Real-time sync antara dashboard dan bot  
- ✅ Interactive Discord data fetching
- ✅ Backup/restore functionality
- ✅ Validation dan error handling
- ✅ Secure access control

Bot Anda sekarang bisa dikonfigurasi tanpa restart dan tanpa edit code! 🚀

---

**Need Help?** Check [DYNAMIC_CONFIG_GUIDE.md](./DYNAMIC_CONFIG_GUIDE.md) untuk dokumentasi lengkap.