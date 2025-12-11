# Project Summary

Technical overview and architecture of Anna Manager Discord Bot.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js v16.9.0+
- **Framework**: Discord.js v14.22.1
- **Database**: MongoDB with Mongoose ODM
- **Canvas**: node-canvas for image generation
- **Scheduling**: node-cron for automated tasks

### Core Dependencies
```json
{
  "discord.js": "^14.22.1",
  "mongoose": "^8.7.1",
  "canvas": "^3.2.0",
  "canvafy": "^7.2.1",
  "express": "^5.1.0",
  "node-cron": "^3.0.2",
  "dotenv": "^16.4.5"
}
```

---

## 📂 Project Structure

```
├── commands/              # Slash command modules
│   ├── actions/          # Social interaction commands (13 files)
│   ├── admin/            # Administrative commands (5 files)
│   ├── autores/          # Auto-responder management (3 files)
│   ├── confess/          # Confession system (1 file)
│   ├── cusrole/          # Custom role management (2 files)
│   ├── economy/          # Economy commands (4 files)
│   ├── giveaway/         # Giveaway system (3 files)
│   ├── level/            # Leveling commands (4 files)
│   ├── minigames/        # Game commands (3 files)
│   ├── moderator/        # Moderation tools (3 files)
│   ├── shop/             # Shop management (13 files)
│   ├── test/             # Utility/test commands (17 files)
│   ├── ticket/           # Ticket system (2 files)
│   └── voice/            # Voice channel management (2 files)
│
├── events/               # Discord event handlers
│   ├── client/          # Client events (ready, messageCreate, etc.)
│   └── guild/           # Guild events (memberAdd, memberRemove, etc.)
│
├── handlers/            # Feature handlers
│   ├── buttons/         # Button interaction handlers
│   ├── giveawayHandler.js
│   ├── vc-bitrate.js
│   ├── vc-notif.js
│   └── vc-rename.js
│
├── schemas/             # MongoDB data models (17 schemas)
│   ├── Activity.js      # Message activity tracking
│   ├── Boost.js         # XP boost multipliers
│   ├── ConfessionState.js
│   ├── customRole.js
│   ├── ExclusiveItem.js
│   ├── Giveaway.js
│   ├── Leaderboard.js   # Leaderboard data
│   ├── Leveling.js      # User levels and XP
│   ├── PartnerTicket.js
│   ├── ShopRole.js
│   ├── Ticket.js
│   ├── UserBalance.js   # Economy data
│   ├── VoiceActivity.js # Voice tracking
│   ├── VoiceEvent.js
│   ├── voiceChannel.js
│   ├── Warn.js
│   └── autoresponder.js
│
├── util/                # Utility functions
│   ├── applyXpWithBoost.js  # XP calculation with boosts
│   ├── economyUtils.js      # Economy helpers
│   ├── leaderboardUtils.js  # Leaderboard management
│   ├── levelUtils.js        # Level calculations
│   └── roleUtils.js         # Role management
│
├── config.js            # Bot configuration
├── errorHandlers.js     # Global error handling
└── index.js            # Application entry point
```

---

## 🗄️ Database Schema

### User Data Models

**Leveling Schema**
- userId, guildId
- xp, level, totalXp
- lastXpTime (cooldown tracking)
- Indexes: userId + guildId

**UserBalance Schema**
- userId, guildId
- balance (souls)
- lastDaily, lastCollect
- Indexes: userId + guildId

**VoiceActivity Schema**
- userId, guildId
- totalMinutes, sessionStart
- daily/weekly/monthly/allTime stats
- Indexes: userId + guildId

**Activity Schema**
- userId, guildId
- messageCount, lastActive
- daily/weekly/monthly/allTime stats

### System Models

**Boost Schema**
- guildId, multiplier
- startTime, endTime
- isActive status

**Leaderboard Schema**
- userId, guildId, period
- xp, rank, lastUpdated
- Compound indexes for efficient queries

**ShopRole Schema**
- guildId, roleId
- price, name, description
- isExclusive flag

**ExclusiveItem Schema**
- guildId, userId, itemId
- itemName, price, status
- purchaseDate, completedDate

### Feature Models

**Ticket Schema**
- guildId, channelId, userId
- ticketNumber, category
- createdAt, closedAt

**Giveaway Schema**
- guildId, channelId, messageId
- prize, winners, endTime
- participants array

**Warn Schema**
- userId, guildId, moderatorId
- reason, timestamp

**autoresponder Schema**
- guildId, trigger, response

**voiceChannel Schema**
- guildId, channelId, ownerId
- settings (name, bitrate, notifications)

---

## 🔄 Core Systems

### 1. Leveling System
- **XP Calculation**: Base XP + random bonus + boost multiplier
- **Cooldown**: 60 seconds between XP gains
- **Level Formula**: Progressive XP requirements
- **Rewards**: Automatic role assignment on level up
- **Leaderboards**: Real-time ranking across multiple time periods

### 2. Economy System
- **Currency**: Souls (virtual currency)
- **Income Sources**: 
  - Daily rewards
  - Level-up bonuses
  - Activity collection
- **Shop System**:
  - Regular roles (instant purchase)
  - Exclusive items (manual fulfillment)
  - Purchase history tracking

### 3. Voice Tracking
- **Session Management**: Join/leave tracking
- **XP Rewards**: Per-minute voice activity
- **Statistics**: Multiple time period tracking
- **Events**: Voice state change logging

### 4. Command Handler
- **Dynamic Loading**: Auto-loads commands from folders
- **Slash Commands**: Full Discord v14 slash command support
- **Permission Checks**: Role-based access control
- **Error Handling**: Graceful error responses

---

## 🔐 Security Features

- Environment variable configuration
- Permission-based command access
- Input validation and sanitization
- Rate limiting on XP gains
- Transaction safety for economy
- Error logging and monitoring

---

## ⚡ Performance Optimizations

- **Database Indexing**: Compound indexes on frequently queried fields
- **Caching**: In-memory cooldown tracking
- **Batch Operations**: Bulk leaderboard updates
- **Lazy Loading**: Commands loaded on demand
- **Connection Pooling**: MongoDB connection optimization

---

## 🔧 Configuration

### Environment Variables (.env)
```env
TOKEN=                 # Discord bot token
MONGO_URI=            # MongoDB connection string
CLIENT_ID=            # Bot application ID
GUILD_ID=             # Primary guild ID (optional)
```

### Bot Configuration (config.js)
- Channel IDs for features
- Role IDs for permissions
- XP rates and cooldowns
- Economy settings
- Embed colors and branding
- Level role rewards

---

## 🚀 Deployment

### Requirements
- Node.js v16.9.0 or higher
- MongoDB 4.4 or higher
- 512MB RAM minimum
- Stable internet connection

### Hosting Options
- VPS (recommended)
- Heroku (Procfile included)
- Railway
- Replit
- Docker (containerization ready)

### Process Management
- PM2 recommended for production
- Auto-restart on crash
- Log rotation
- Memory monitoring

---

## 📊 Monitoring & Logging

- Error tracking via errorHandlers.js
- Console logging with chalk colors
- Database operation logging
- Command usage tracking
- Voice activity monitoring

---

## 🔄 Update & Maintenance

### Regular Tasks
- Database backup (recommended daily)
- Log rotation
- Dependency updates
- Performance monitoring
- User data cleanup (optional)

### Automated Tasks (node-cron)
- Leaderboard updates
- Daily reward resets
- Giveaway checks
- Voice session cleanup

---

## 🤝 Integration Points

### Discord.js Events
- `ready` - Bot initialization
- `interactionCreate` - Command handling
- `messageCreate` - XP tracking, auto-responder
- `voiceStateUpdate` - Voice tracking
- `guildMemberAdd` - Welcome messages
- `guildMemberRemove` - Leave messages

### External APIs
- Discord API (via discord.js)
- MongoDB Atlas (database)
- Canvas API (image generation)

---

## 📈 Scalability

### Current Capacity
- Supports multiple guilds
- Handles 1000+ concurrent users
- Processes 100+ commands/minute

### Scaling Considerations
- Horizontal scaling via sharding
- Database read replicas
- Redis caching layer
- Load balancing
- CDN for static assets

---

## 🐛 Known Limitations

- Single-process architecture (no sharding yet)
- In-memory cooldown tracking (lost on restart)
- Manual exclusive item fulfillment
- No built-in backup system
- Limited to Discord API rate limits

---

## 🔮 Future Enhancements

- Sharding support for large bots
- Redis integration for distributed caching
- Web dashboard for management
- Advanced analytics
- Multi-language support
- Plugin system for extensions

---

## 📚 Resources

- [Discord.js Documentation](https://discord.js.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Node.js Documentation](https://nodejs.org/docs/)

---

For feature list and commands, see [FEATURES.md](FEATURES.md)

For setup instructions, see [README.md](README.md)
