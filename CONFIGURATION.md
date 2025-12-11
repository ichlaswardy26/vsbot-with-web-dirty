# Configuration Guide

Complete guide for configuring Anna Manager Bot.

## 📋 Table of Contents

- [Environment Variables](#environment-variables)
- [Config.js Structure](#configjs-structure)
- [Channel Configuration](#channel-configuration)
- [Role Configuration](#role-configuration)
- [Custom Emojis](#custom-emojis)
- [Feature Settings](#feature-settings)
- [Quick Setup](#quick-setup)

---

## 🔐 Environment Variables

All sensitive configuration is stored in `.env` file. Copy `.env.example` to `.env` and fill in your values.

### Required Variables

```env
# Bot Credentials (REQUIRED)
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Optional Variables

```env
# Guild ID (optional, for single-server bots)
GUILD_ID=your_guild_id_here

# Owner IDs (comma-separated)
OWNER_IDS=123456789012345678,987654321098765432
```

---

## 📁 Config.js Structure

The `config.js` file centralizes all bot configuration. It reads from environment variables and provides defaults.

### Structure Overview

```javascript
module.exports = {
  // Bot credentials
  token, clientId, guildId, ownerId,
  
  // Database
  mongoUri,
  
  // Channels (organized by feature)
  channels: { welcome, boost, ticket, intro, donation, ... },
  
  // Categories
  categories: { ticket, partner },
  
  // Roles (organized by type)
  roles: { staff, boost, level: { 10, 20, 30, ... } },
  
  // Custom emojis
  emojis: { souls, dot, blank, important, ... },
  
  // Images & assets
  images: { defaultGif },
  
  // Feature settings
  features: { xpCooldown, dailyReward, ... },
  
  // Embed colors
  colors: { primary, success, error, warning, info }
}
```

---

## 📺 Channel Configuration

Configure channels for various bot features.

### Welcome & Goodbye

```env
WELCOME_CHANNEL_ID=1234567890123456789
WELCOME2_CHANNEL_ID=1234567890123456789
WELCOME_LOG_CHANNEL_ID=1234567890123456789
```

**Usage**: Welcome messages, member join/leave logs

### Boost Channels

```env
BOOST_ANNOUNCE_CHANNEL_ID=1234567890123456789
BOOST_LOGS_CHANNEL_ID=1234567890123456789
```

**Usage**: Server boost announcements and logs

### Ticket System

```env
TICKET_LOG_CHANNEL_ID=1234567890123456789
```

**Usage**: Ticket creation and closure logs

### Other Channels

```env
CUSTOM_ROLE_LOGS_CHANNEL_ID=1234567890123456789
INTRO_CHANNEL_ID=1234567890123456789
DONATION_CHANNEL_ID=1234567890123456789
```

**Usage**: 
- Custom role logs
- Introduction submissions
- Donation notifications

---

## 👥 Role Configuration

### Staff & Permission Roles

```env
STAFF_ROLE_ID=1234567890123456789
SUPPORT_TEAM_ROLE_ID=1234567890123456789
```

**Permissions**:
- `STAFF_ROLE_ID`: Access to admin commands, ticket management
- `SUPPORT_TEAM_ROLE_ID`: Can view and respond to tickets

### Special Roles

```env
WELCOME_BOT_ROLE_ID=1234567890123456789
BOOST_ROLE_ID=1234567890123456789
DONATE_ROLE_ID=1234567890123456789
```

**Usage**:
- `WELCOME_BOT_ROLE_ID`: Given to new members
- `BOOST_ROLE_ID`: Server boosters
- `DONATE_ROLE_ID`: Donators

### Level Roles

Configure roles awarded at specific levels:

```env
LEVEL_10_ROLE_ID=1234567890123456789
LEVEL_20_ROLE_ID=1234567890123456789
LEVEL_30_ROLE_ID=1234567890123456789
LEVEL_40_ROLE_ID=1234567890123456789
LEVEL_50_ROLE_ID=1234567890123456789
LEVEL_60_ROLE_ID=1234567890123456789
LEVEL_70_ROLE_ID=1234567890123456789
LEVEL_80_ROLE_ID=1234567890123456789
LEVEL_90_ROLE_ID=1234567890123456789
LEVEL_100_ROLE_ID=1234567890123456789
```

**How it works**:
- Users automatically receive roles when reaching the level
- Higher level roles don't remove lower ones
- Leave empty to disable specific level rewards

---

## 🎨 Custom Emojis

Configure custom emojis for enhanced bot appearance.

### Format

```env
EMOJI_NAME=<:emoji_name:emoji_id>
# For animated emojis:
EMOJI_NAME=<a:emoji_name:emoji_id>
```

### Available Emoji Configs

```env
EMOJI_SOULS=<:souls:1373202161823121560>
EMOJI_DOT=<:dot:1373230999793696788>
EMOJI_BLANK=<:blank:1297498366305107970>
EMOJI_SERAPHYX=<:seraphyx:1367175101711388783>
EMOJI_IMPORTANT=<a:important:1367186288297377834>
EMOJI_QUESTION=<:question:1368184769724022894>
EMOJI_REPORT=<:report:1368185154366869586>
EMOJI_BAN=<:ban:1368184860924973237>
EMOJI_PARTNER=<:partner:1368185020141011055>
```

### How to Get Emoji IDs

1. Type `\:emoji_name:` in Discord
2. Send the message
3. Copy the ID from the output: `<:name:123456789>`

### Fallback

If emoji is not configured, bot uses Unicode emoji fallbacks:
- `EMOJI_SOULS` → 💰
- `EMOJI_DOT` → 🔵
- `EMOJI_BLANK` → ⚪
- etc.

---

## ⚙️ Feature Settings

### Leveling System

```env
XP_COOLDOWN=60000              # Cooldown between XP gains (ms)
XP_MIN=15                      # Minimum XP per message
XP_MAX=25                      # Maximum XP per message
VOICE_XP_PER_MINUTE=10         # XP earned per minute in voice
```

### Economy System

```env
DAILY_REWARD=100               # Daily reward amount
COLLECT_COOLDOWN=3600000       # Collect cooldown (ms)
```

### Ticket System

```env
TICKET_PREFIX=ticket           # Ticket channel prefix
PARTNER_TICKET_PREFIX=partner  # Partner ticket prefix
```

### Custom Role

```env
CUSTOM_ROLE_PRICE=1000         # Cost to create custom role
```

### Word Chain Game

```env
WORD_CHAIN_TIMEOUT=30000       # Turn timeout (ms)
```

---

## 🎨 Embed Colors

Configure embed colors (hex format with #):

```env
COLOR_PRIMARY=#5865F2
COLOR_SUCCESS=#57F287
COLOR_ERROR=#ED4245
COLOR_WARNING=#FEE75C
COLOR_INFO=#5865F2
```

---

## 🚀 Quick Setup

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Fill Required Fields

```env
TOKEN=your_bot_token
CLIENT_ID=your_client_id
MONGO_URI=your_mongodb_uri
```

### 3. Configure Channels (Recommended)

Get channel IDs by:
1. Enable Developer Mode in Discord
2. Right-click channel → Copy ID
3. Paste into `.env`

```env
WELCOME_CHANNEL_ID=your_channel_id
TICKET_LOG_CHANNEL_ID=your_channel_id
INTRO_CHANNEL_ID=your_channel_id
```

### 4. Configure Roles (Recommended)

Get role IDs by:
1. Enable Developer Mode
2. Right-click role → Copy ID
3. Paste into `.env`

```env
STAFF_ROLE_ID=your_role_id
LEVEL_10_ROLE_ID=your_role_id
LEVEL_20_ROLE_ID=your_role_id
```

### 5. Configure Categories

```env
TICKET_CATEGORY_ID=your_category_id
PARTNER_CATEGORY_ID=your_category_id
```

### 6. Optional: Custom Emojis

Upload emojis to your server, then:

```env
EMOJI_SOULS=<:souls:your_emoji_id>
EMOJI_DOT=<:dot:your_emoji_id>
```

### 7. Start Bot

```bash
npm start
```

---

## 🔍 Troubleshooting

### Bot not responding to commands
- Check `TOKEN` is correct
- Verify bot has proper permissions
- Check `CLIENT_ID` matches your bot

### Features not working
- Verify channel IDs are correct
- Check role IDs exist in your server
- Ensure bot has access to channels

### Emojis not showing
- Verify emoji IDs are correct
- Check bot is in server with emojis
- Emojis must be from servers bot is in

### Database errors
- Check `MONGO_URI` is correct
- Verify MongoDB cluster is running
- Check network connectivity

---

## 📝 Best Practices

1. **Never commit `.env` file** - Keep credentials secret
2. **Use environment variables** - Don't hardcode IDs in code
3. **Document custom configs** - Note any changes you make
4. **Test in development** - Use separate bot for testing
5. **Backup configuration** - Keep `.env` backup securely
6. **Regular updates** - Keep dependencies updated
7. **Monitor logs** - Check for configuration errors

---

## 🔗 Related Documentation

- [README.md](README.md) - General information
- [FEATURES.md](FEATURES.md) - Feature list
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [SUMMARY.md](SUMMARY.md) - Technical overview

---

## 💡 Tips

- Start with minimal configuration (just required fields)
- Add features gradually as needed
- Use descriptive channel/role names
- Keep `.env.example` updated with new variables
- Document any custom configurations

---

For support, open an issue on GitHub!
