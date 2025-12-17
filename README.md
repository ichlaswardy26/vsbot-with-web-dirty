# 🤖 Villain Seraphyx Manager Bot

A comprehensive Discord bot built with Discord.js v14, featuring leveling, economy, voice tracking, moderation tools, and Tako donation integration.

## ✨ Features

- **🎯 Leveling System** - XP tracking with voice activity and boost multipliers
- **💰 Economy System** - Virtual currency (souls) with shop and exclusive items  
- **🎫 Ticket System** - Support and partner ticket management
- **🎮 Mini Games** - Interactive games like word chain, guess the animal, etc.
- **🛡️ Moderation Tools** - Warnings, bans, and admin utilities
- **🎭 Action Commands** - Fun interaction commands (hug, pat, etc.)
- **📢 Auto Responder** - Automated message responses
- **💝 Tako Integration** - Donation webhook for Tako.id platform
- **🎁 Giveaway System** - Create and manage server giveaways

## 📋 Prerequisites

- Node.js v16.9.0 or higher
- MongoDB database
- Discord Bot Token

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)
```bash
git clone <repository-url>
cd villain-seraphyx-bot
npm install
npm run setup
```

### Option 2: Manual Setup
```bash
git clone <repository-url>
cd villain-seraphyx-bot
npm install
cp .env.example .env
```

Edit `.env` with your credentials:
```env
TOKEN=your_discord_bot_token
MONGO_URI=your_mongodb_connection_string
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
OWNER_IDS=your_user_id
```

Then start the bot:
```bash
npm start
```

📖 **Need detailed setup guide?** Check [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 🌐 Web Dashboard

The bot now includes a modern web dashboard for easy configuration management:

- **🎛️ Visual Configuration** - Configure channels, roles, and features through a user-friendly interface
- **🔄 Real-time Updates** - Changes apply instantly without restarting the bot
- **📱 Mobile Responsive** - Manage your bot from any device
- **🔐 Secure Access** - Discord OAuth2 authentication with role-based permissions
- **📊 Analytics Dashboard** - Monitor bot performance and usage statistics

### Quick Dashboard Setup
```bash
# Enable web dashboard in .env
WEB_DASHBOARD_ENABLED=true
WEB_DASHBOARD_PORT=3000

# Start bot with dashboard
npm start
```

Access dashboard at: `http://localhost:3000/dashboard`

📋 **Development Status:** See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) for upcoming features

## 📚 Commands Reference

### 🎭 Action Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `bite` | Bite someone | `sera bite @user` |
| `cringe` | Show cringe reaction | `sera cringe` |
| `cry` | Cry reaction | `sera cry` |
| `cuddle` | Cuddle someone | `sera cuddle @user` |
| `dance` | Dance animation | `sera dance` |
| `hug` | Hug someone | `sera hug @user` |
| `kick` | Kick someone (fun) | `sera kick @user` |
| `kill` | Kill someone (fun) | `sera kill @user` |
| `kiss` | Kiss someone | `sera kiss @user` |
| `pat` | Pat someone | `sera pat @user` |
| `poke` | Poke someone | `sera poke @user` |
| `slap` | Slap someone | `sera slap @user` |
| `wave` | Wave at someone | `sera wave @user` |

### 👑 Admin Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `addxp` | Add XP to user | `sera addxp @user amount` |
| `boost` | Manage boost status | `sera boost @user` |
| `reset` | Reset user data | `sera reset @user` |
| `resetvoiceevent` | Reset voice event | `sera resetvoiceevent` |
| `resetxp` | Reset user XP | `sera resetxp @user` |

### 💰 Economy Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `bal` / `balance` | Check balance | `sera bal [@user]` |
| `collect` | Collect daily souls | `sera collect` |
| `daily` | Daily reward | `sera daily` |
| `resetsouls` | Reset user souls | `sera resetsouls @user` |

### 🏪 Shop Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `shop` | View shop items | `sera shop` |
| `buy` | Buy shop item | `sera buy <item_id>` |
| `addshop` | Add shop item | `sera addshop` |
| `removeshop` | Remove shop item | `sera removeshop <id>` |
| `additem` | Add exclusive item | `sera additem` |
| `removeitem` | Remove item | `sera removeitem <id>` |
| `purchases` | View purchases | `sera purchases [@user]` |
| `buyer` | View item buyers | `sera buyer <item_id>` |
| `done` | Mark purchase done | `sera done <purchase_id>` |

### 📊 Level Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `rank` | View user rank | `sera rank [@user]` |
| `leaderboard` | Server leaderboard | `sera leaderboard` |
| `booststatus` | Check boost status | `sera booststatus` |
| `voiceevent` | Voice event info | `sera voiceevent` |

### 🎮 Mini Games
| Command | Description | Usage |
|---------|-------------|-------|
| `caklontong` | Riddle game | `sera caklontong` |
| `guesstheanimal` | Animal guessing | `sera guesstheanimal` |
| `tebakgambar` | Image guessing | `sera tebakgambar` |
| `wordchain` | Word chain game | `sera wordchain` |

### 🎁 Giveaway Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `giveaway` | Start giveaway | `sera giveaway` |
| `giveaway-end` | End giveaway | `sera giveaway-end <message_id>` |
| `giveaway-reroll` | Reroll winner | `sera giveaway-reroll <message_id>` |

### 🛡️ Moderation Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `warn` | Warn a user | `sera warn @user reason` |
| `ban` | Troll ban (fun) | `sera ban @user` |
| `snipe` | Show deleted message | `sera snipe` |

### 🎫 Ticket Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `ticket` | Create support ticket | `sera ticket` |
| `close` | Close ticket | `sera close` |

### 🔊 Voice Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `voice` | Voice channel control | `sera voice <subcommand>` |
| `claim` | Claim voice channel | `sera claim` |

### 📢 Auto Responder
| Command | Description | Usage |
|---------|-------------|-------|
| `addres` | Add auto response | `sera addres` |
| `delres` | Delete response | `sera delres <id>` |
| `listres` | List responses | `sera listres` |

### 💬 Confession System
| Command | Description | Usage |
|---------|-------------|-------|
| `confess` | Send confession | `sera confess` |
| `resetconfess` | Reset confession state | `sera resetconfess` |

### 🔧 Utility Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `ping` | Bot latency | `sera ping` |
| `info` | Bot information | `sera info` |
| `avatar` | User avatar | `sera avatar [@user]` |
| `afk` | Set AFK status | `sera afk [reason]` |
| `say` | Make bot say something | `sera say <message>` |
| `createembed` | Create custom embed | `sera createembed` |

### 📖 Information Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `rinfo` | Role information | `sera rinfo` |
| `book` | Server information | `sera book` |
| `rules` | Server rules | `sera rules` |
| `support` | Support information | `sera support` |
| `partner` | Partnership info | `sera partner` |
| `event` | Event information | `sera event` |

## 💰 Tako Donation Integration

The bot includes Tako.id webhook integration for handling donations:

- **Webhook Endpoint**: `http://your-server:3000/tako`
- **Automatic Notifications**: Donations are automatically posted to configured channel
- **Secure**: Uses HMAC signature verification
- **Configurable**: Set donation channel in `config.js`

### Tako Setup
1. Configure `WEBHOOK_TOKEN` in `.env`
2. Set `DONATION_CHANNEL_ID` in `.env`
3. Add webhook URL to your Tako.id account

## 📁 Project Structure

```
├── commands/           # Command modules organized by category
│   ├── actions/       # Fun action commands
│   ├── admin/         # Administrative commands
│   ├── economy/       # Economy system commands
│   ├── level/         # Leveling system commands
│   ├── shop/          # Shop and item management
│   ├── minigames/     # Interactive games
│   ├── moderator/     # Moderation tools
│   ├── ticket/        # Support ticket system
│   ├── voice/         # Voice channel management
│   └── test/          # Utility and info commands
├── events/            # Discord event handlers
├── handlers/          # Feature handlers
├── schemas/           # MongoDB data models
├── util/              # Utility functions
├── config.js          # Bot configuration
└── index.js           # Main bot file
```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Bot Credentials
TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id

# Database
MONGO_URI=your_mongodb_connection_string

# Tako Webhook
WEBHOOK_TOKEN=your_tako_webhook_token

# Channel IDs
WELCOME_CHANNEL_ID=channel_id
DONATION_CHANNEL_ID=channel_id
TICKET_LOG_CHANNEL_ID=channel_id
# ... (see .env.example for full list)

# Role IDs
STAFF_ROLE_ID=role_id
BOOST_ROLE_ID=role_id
# ... (see .env.example for full list)
```

### Bot Configuration (config.js)
The `config.js` file contains all bot settings including:
- Channel mappings
- Role configurations  
- Feature settings
- Emoji configurations
- Image URLs
- Economy settings

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production Deployment
1. **Railway/Heroku**: Use provided `Procfile`
2. **VPS**: Use PM2 or similar process manager
3. **Docker**: Create Dockerfile for containerization

See `DEPLOYMENT.md` for detailed deployment instructions.

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **ichlaswardy26** - Main Developer
- **zyflou** - Contributor

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord server
- Check the documentation files

---

**Built with ❤️ using Discord.js v14**