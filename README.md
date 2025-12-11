# Discord Bot - Anna Manager

A feature-rich Discord bot built with Discord.js v14, designed for comprehensive server management with leveling, economy, voice tracking, and interactive features.

## 🚀 Features

### Bot Features
- **Leveling System** - XP tracking with boost multipliers and custom rank cards
- **Economy System** - Virtual currency with shop and exclusive items
- **Voice Activity Tracking** - Monitor and reward voice channel participation
- **Ticket System** - Support ticket management with partner tickets
- **Custom Roles** - User-customizable roles and shop roles
- **Auto Responder** - Automated message responses
- **Confession System** - Anonymous confession feature
- **Giveaway System** - Create and manage giveaways
- **Mini Games** - Word chain and other interactive games
- **Moderation Tools** - Warnings, resets, and admin commands

### 🌐 Web Dashboard (NEW!)
- **Modern UI** - Beautiful and responsive dashboard with Tailwind CSS
- **User Management** - View, edit, and manage user data (souls, bank, levels)
- **Configuration** - Edit all bot settings via web interface
- **Bot Control** - Monitor status, uptime, and control bot operations
- **Analytics** - Real-time statistics with charts and graphs
- **Secure Login** - Discord OAuth2 authentication
- **Real-time Updates** - Socket.IO for live data synchronization

## 📋 Prerequisites

- Node.js v16.9.0 or higher
- MongoDB database
- Discord Bot Token

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/ichlaswardy26/Anna-Manager.git
cd Anna-Manager
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
TOKEN=your_discord_bot_token
MONGO_URI=your_mongodb_connection_string
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
```

4. Configure bot settings in `config.js`

5. Start the bot:
```bash
npm start
```

## 🌐 Dashboard Setup

The bot comes with a modern web dashboard for easy management!

### Quick Start

1. Navigate to dashboard folder:
```bash
cd dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure dashboard:
```bash
copy .env.example .env
```

Edit `dashboard/.env` with your settings (see [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for details)

4. Start dashboard:
```bash
npm start
```

Dashboard will be available at: **http://localhost:8080**

### Start Both Bot and Dashboard

Use the provided batch script (Windows):
```bash
start-all.bat
```

For detailed dashboard setup instructions, see [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md)

## 📁 Project Structure

```
├── commands/          # Command modules
│   ├── actions/       # Action commands
│   ├── admin/         # Admin commands
│   ├── economy/       # Economy commands
│   ├── level/         # Leveling commands
│   ├── moderator/     # Moderation commands
│   ├── shop/          # Shop commands
│   └── ticket/        # Ticket commands
├── events/            # Event handlers
│   ├── client/        # Client events
│   └── guild/         # Guild events
├── handlers/          # Feature handlers
├── schemas/           # MongoDB schemas
├── util/              # Utility functions
├── config.js          # Bot configuration
└── index.js           # Entry point
```

## 📖 Documentation

### Bot Documentation
- [FEATURES.md](FEATURES.md) - Complete feature list and commands
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration guide and environment variables
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide for various platforms
- [SUMMARY.md](SUMMARY.md) - Technical overview and architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

### Dashboard Documentation

#### 🇮🇩 Bahasa Indonesia
- [RINGKASAN_DASHBOARD.md](RINGKASAN_DASHBOARD.md) - 🎯 **MULAI DISINI** - Ringkasan lengkap (Bahasa Indonesia)

#### 🇬🇧 English / Detailed Guides
- [DASHBOARD_SUMMARY.md](DASHBOARD_SUMMARY.md) - ⭐ **START HERE** - Complete overview
- [QUICK_START_DASHBOARD.md](QUICK_START_DASHBOARD.md) - ⚡ 5-minute setup guide
- [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) - 📖 Comprehensive setup with troubleshooting
- [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md) - 🎨 All features documentation
- [DASHBOARD_STRUCTURE.md](DASHBOARD_STRUCTURE.md) - 📁 Folder structure & files
- [DASHBOARD_FLOW.md](DASHBOARD_FLOW.md) - 🔄 Visual flow & user journey
- [DASHBOARD_FAQ.md](DASHBOARD_FAQ.md) - ❓ Frequently Asked Questions
- [WHAT_WAS_CREATED.md](WHAT_WAS_CREATED.md) - 📦 Complete file list
- [dashboard/CHECKLIST.md](dashboard/CHECKLIST.md) - ✅ Installation checklist (100+ items)

## 📸 Screenshots

### Dashboard Overview
![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Overview)

### User Management
![Users](https://via.placeholder.com/800x400?text=User+Management)

### Analytics
![Analytics](https://via.placeholder.com/800x400?text=Analytics+Dashboard)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**zyflou**

- GitHub: [@zyflou](https://github.com/zyflou)

**ichlaswardy26**

- GitHub: [@zyflou](https://github.com/ichlaswardy26)

## 🙏 Acknowledgments

Built with [Discord.js](https://discord.js.org/) v14
