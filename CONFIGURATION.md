# ⚙️ Configuration Guide

## Overview

Bot ini menggunakan sistem konfigurasi hybrid:
- **Static Config** (`.env`) - Kredensial sensitif yang tidak boleh diubah via web
- **Dynamic Config** (MongoDB) - Pengaturan yang bisa diubah via web dashboard

## Quick Start

1. Copy `.env.example` ke `.env`
2. Isi kredensial yang diperlukan
3. Jalankan bot: `node index.js`
4. Akses dashboard: `http://localhost:3001/dashboard`

## Environment Variables (.env)

### Required Credentials
```env
# Bot credentials (dari Discord Developer Portal)
TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_main_guild_id

# Database
MONGO_URI=mongodb+srv://...

# Bot owners (comma-separated user IDs)
OWNER_IDS=123456789,987654321
```

### Web Dashboard
```env
# Session & Security
SESSION_SECRET=random-secure-string
WEB_PORT=3001
ALLOWED_ORIGINS=http://localhost:3001

# Discord OAuth2
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
```

### Webhook Server
```env
WEBHOOK_PORT=3000
WEBHOOK_TOKEN=your_tako_webhook_token
```

### Optional
```env
REMOVE_BG_API_KEY=your_api_key
NODE_ENV=development
LOG_LEVEL=INFO
```

## Dynamic Configuration (Web Dashboard)

Semua pengaturan berikut dapat dikelola melalui web dashboard:

### Channels
- Welcome channels
- Boost channels
- Ticket channels
- Confession channels
- Giveaway channels
- Voice channels
- dll.

### Roles
- Staff roles
- Level roles
- Support tier roles
- Community roles
- dll.

### Features
- Leveling system (XP settings)
- Economy system (daily rewards, cooldowns)
- Ticket system
- Mini games
- Welcome messages
- Auto responder
- Voice system

### Appearance
- Embed colors
- Custom emojis
- Images/GIFs

### Language
- Default language
- Available languages

## Using Config in Code

### Async (Recommended)
```javascript
const config = require('./config');

// Get full config (static + dynamic)
const fullConfig = await config.getConfig();

// Get specific section
const channels = await config.getSection('channels');
const features = await config.getSection('features');
```

### Sync (Static only)
```javascript
const config = require('./config');

// Direct access to static config
const token = config.token;
const ownerIds = config.ownerIds;
```

### In Commands
```javascript
module.exports = {
  name: 'example',
  async execute(interaction) {
    const config = require('../../config');
    const fullConfig = await config.getConfig(interaction.guildId);
    
    // Use dynamic config
    const welcomeChannel = fullConfig.channels?.welcome;
    const primaryColor = fullConfig.colors?.primary;
  }
};
```

## Database Schema

Configuration disimpan di collection `webconfigs` dengan struktur:

```javascript
{
  guildId: String,
  channels: {
    welcome: String,
    boostAnnounce: String,
    // ...
  },
  roles: {
    staff: String,
    levels: { level1: String, level10: String, ... },
    // ...
  },
  features: {
    leveling: { enabled: Boolean, xpMin: Number, ... },
    economy: { enabled: Boolean, dailyReward: Number, ... },
    // ...
  },
  colors: {
    primary: String,
    success: String,
    // ...
  },
  emojis: { ... },
  images: { ... },
  language: { default: String, available: [String] },
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    lastConfiguredBy: String
  }
}
```

## Server Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Tako Webhook | Donation webhook server |
| 3001 | Web Dashboard | Configuration dashboard |

## Security Notes

1. **Never commit `.env`** - Sudah ada di `.gitignore`
2. **Use strong SESSION_SECRET** - Generate random string
3. **Restrict ALLOWED_ORIGINS** - Hanya domain yang dipercaya
4. **Owner IDs** - Hanya user yang dipercaya penuh

## Troubleshooting

### Config not loading
- Pastikan MongoDB connected
- Check `MONGO_URI` di `.env`
- Lihat logs untuk error

### Dashboard not accessible
- Check `WEB_PORT` tidak conflict
- Pastikan `DISCORD_CLIENT_SECRET` benar
- Verify OAuth2 callback URL di Discord Developer Portal

### Changes not applying
- Clear config cache: `config.clearCache()`
- Restart bot jika perlu
- Check WebSocket connection di dashboard
