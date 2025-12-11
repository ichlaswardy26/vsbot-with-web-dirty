# Dynamic Configuration System Guide

Sistem konfigurasi dinamis memungkinkan Anda mengatur bot melalui dashboard web dengan sinkronisasi real-time ke database MongoDB.

## 🎯 Fitur Utama

### ✅ Yang Bisa Dikonfigurasi via Dashboard:
- **Channel IDs** - Semua channel untuk welcome, logs, giveaway, dll
- **Role IDs** - Staff roles, level roles, special roles
- **Category IDs** - Ticket categories, voice categories
- **Emojis** - Custom dan Unicode emojis
- **Images** - URLs untuk embed images, GIFs, assets
- **Features** - XP settings, economy, cooldowns, prices
- **Colors** - Embed colors untuk berbagai keperluan

### 🔒 Yang Tetap di .env (Sensitif):
- `TOKEN` - Bot token
- `CLIENT_SECRET` - Discord OAuth secret
- `MONGO_URI` - Database connection
- `API_KEYS` - External API keys
- `OWNER_IDS` - Bot owner user IDs

## 🚀 Cara Menggunakan

### 1. Setup Dashboard
```bash
cd dashboard
npm install
cp .env.example .env
# Edit .env dengan konfigurasi Anda
npm start
```

### 2. Akses Dashboard
- Buka `http://localhost:8080`
- Login dengan Discord
- Pastikan user ID Anda ada di `ADMIN_IDS` atau `OWNER_IDS`

### 3. Konfigurasi via Dashboard
1. **Channels**: Pilih channel dari dropdown interaktif
2. **Roles**: Pilih role dengan preview warna
3. **Features**: Atur angka dan setting dengan form
4. **Emojis**: Pilih dari server emojis atau input manual
5. **Images**: Input URL gambar dengan preview

## 💻 Penggunaan di Code Bot

### Cara Lama (Sync - Backward Compatible):
```javascript
const config = require('./config');

// Masih bisa digunakan untuk data sensitif
const token = config.token;
const ownerId = config.ownerId;
```

### Cara Baru (Async - Recommended):
```javascript
const ConfigManager = require('./util/ConfigManager');

// Get single value
const welcomeChannel = await ConfigManager.getChannelId('welcome');
const staffRole = await ConfigManager.getRoleId('staff');
const xpMin = await ConfigManager.getFeature('xpMin', 15);

// Get dengan fallback
const emoji = await ConfigManager.getEmoji('souls', '💰');
const color = await ConfigManager.getColor('primary', '#5865F2');

// Batch get multiple values
const channels = await ConfigManager.getBatch({
  welcome: 'channels.welcome',
  logs: 'channels.ticketLogs',
  boost: 'channels.boostAnnounce'
});
```

### Contoh Implementasi di Command:
```javascript
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ConfigManager = require('../util/ConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Send welcome message'),
    
  async execute(interaction) {
    // Get config values
    const [welcomeChannelId, primaryColor, welcomeEmoji] = await Promise.all([
      ConfigManager.getChannelId('welcome'),
      ConfigManager.getColor('primary'),
      ConfigManager.getEmoji('seraphyx')
    ]);
    
    if (!welcomeChannelId) {
      return interaction.reply('Welcome channel not configured!');
    }
    
    const welcomeChannel = interaction.guild.channels.cache.get(welcomeChannelId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${welcomeEmoji} Welcome!`)
      .setColor(primaryColor)
      .setDescription('Welcome to our server!');
      
    await welcomeChannel.send({ embeds: [embed] });
    await interaction.reply('Welcome message sent!');
  }
};
```

## 🔄 Real-time Sync

### Automatic Sync:
- Dashboard otomatis sync ke database setiap 30 detik
- Bot cache config selama 30 detik untuk performa
- Perubahan di dashboard langsung tersedia di bot

### Manual Sync:
```javascript
// Clear cache untuk force refresh
ConfigManager.clearCache();

// Atau clear specific entry
ConfigManager.clearCacheEntry('channels.welcome');
```

## 🎛️ Dashboard Features

### Discord Data Fetching:
- **Auto-fetch** channels, roles, categories dari Discord
- **Interactive dropdowns** dengan search dan filter
- **Real-time validation** untuk memastikan ID masih valid
- **Category grouping** untuk channels yang lebih organized

### Import/Export:
```javascript
// Export config
const config = await ConfigManager.getAllChannels();
// Save to file or backup

// Import config (via dashboard)
// Upload JSON file dengan format yang sama
```

### Validation:
```javascript
// Validate current config
const validation = await ConfigManager.validateConfig();
if (!validation.valid) {
  console.log('Config issues:', validation.issues);
}
```

## 🔧 Advanced Usage

### Custom Config Sections:
```javascript
// Tambah section baru di BotConfig model
const customSettings = await ConfigManager.get('customSection.mySetting');

// Atau extend ConfigManager
class MyConfigManager extends ConfigManager {
  async getMyCustomSetting(key, fallback) {
    return await this.get(`myCustomSection.${key}`, fallback);
  }
}
```

### Environment-specific Config:
```javascript
// Development vs Production
const isDev = process.env.NODE_ENV === 'development';
const logLevel = await ConfigManager.getFeature(
  isDev ? 'devLogLevel' : 'prodLogLevel', 
  'info'
);
```

## 🛠️ Troubleshooting

### Config Not Loading:
1. Check MongoDB connection
2. Verify dashboard is running
3. Check console for sync errors
4. Use sync fallback: `config.sync.channels.welcome`

### Dashboard Access Issues:
1. Verify `ADMIN_IDS` in .env
2. Check Discord OAuth setup
3. Ensure bot has proper permissions

### Performance Issues:
1. Adjust cache TTL in ConfigManager
2. Use batch operations untuk multiple values
3. Monitor database connection pool

## 📝 Migration dari Hardcoded Config

### Step 1: Identify Configurable Values
```javascript
// Before (hardcoded)
const WELCOME_CHANNEL = '123456789';
const STAFF_ROLE = '987654321';

// After (dynamic)
const welcomeChannel = await ConfigManager.getChannelId('welcome');
const staffRole = await ConfigManager.getRoleId('staff');
```

### Step 2: Update Commands
```javascript
// Replace semua hardcoded IDs dengan ConfigManager calls
// Gunakan fallback values untuk backward compatibility
```

### Step 3: Configure via Dashboard
1. Login ke dashboard
2. Set semua channel/role IDs
3. Test functionality
4. Remove hardcoded values

## 🎉 Benefits

- **User-friendly**: Non-technical users bisa konfigurasi bot
- **Real-time**: Perubahan langsung apply tanpa restart
- **Backup/Restore**: Easy export/import configuration
- **Validation**: Auto-check Discord IDs masih valid
- **Scalable**: Easy tambah config options baru
- **Secure**: Sensitive data tetap di environment variables

## 🔮 Future Enhancements

- **Role-based permissions** untuk dashboard access
- **Config versioning** dan rollback
- **Scheduled config changes**
- **Multi-server support**
- **Config templates** untuk quick setup
- **Audit logs** untuk track perubahan

---

Dengan sistem ini, bot Anda menjadi lebih fleksibel dan mudah dikelola tanpa perlu restart atau edit code! 🚀