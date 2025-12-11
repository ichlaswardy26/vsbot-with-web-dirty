# Features & Commands

Complete list of features and commands available in Anna Manager Discord Bot.

## 📊 Leveling System

Track user activity and reward engagement with XP and levels.

### Commands
- `/rank` - View your current rank, level, and XP progress with custom card
- `/leaderboard` - Display server leaderboard with pagination
- `/booststatus` - Check active XP boost status
- `/voiceevent` - View voice activity events and statistics

### Admin Commands
- `/addxp <user> <amount>` - Add XP to a user
- `/resetxp <user>` - Reset user's XP and level
- `/boost <multiplier> <duration>` - Apply XP boost multiplier
- `/reset` - Reset activity statistics

### Features
- Automatic XP gain from messages and voice activity
- Custom rank cards with Canvas
- XP boost multipliers
- Role rewards on level up
- Daily, weekly, monthly, and all-time leaderboards
- Voice channel activity tracking

---

## 💰 Economy System

Virtual currency system with shop and exclusive items.

### Commands
- `/bal [user]` - Check balance (souls)
- `/daily` - Claim daily reward
- `/collect` - Collect souls from activities
- `/shop` - Browse available items and roles
- `/buy <item>` - Purchase items or roles
- `/purchases` - View your purchase history

### Admin Commands
- `/addbalance <user> <amount>` - Add souls to user
- `/resetsouls <user>` - Reset user's balance
- `/addshop <role> <price>` - Add role to shop
- `/removeshop <role>` - Remove role from shop
- `/additem <name> <price> <description>` - Add exclusive item
- `/removeitem <item>` - Remove item from shop
- `/addexclusive <role>` - Mark role as exclusive
- `/removeexclusiveitem <item>` - Remove exclusive item
- `/itemid` - View item IDs
- `/buyer <item>` - View item buyers
- `/done <user> <item>` - Mark purchase as completed

### Features
- Virtual currency (souls)
- Shop system with roles and items
- Exclusive items with manual fulfillment
- Purchase tracking and history
- Daily rewards
- Level-up rewards

---

## 🎤 Voice Activity Tracking

Monitor and reward voice channel participation.

### Commands
- `/voiceevent` - View voice activity statistics
- `/voice` - Manage voice channel settings
- `/claim` - Claim temporary voice channel

### Admin Commands
- `/resetvoiceevent` - Reset voice event statistics

### Features
- Automatic voice activity tracking
- XP rewards for voice participation
- Voice event logging
- Temporary voice channels
- Voice channel customization (rename, bitrate, notifications)

---

## 🎫 Ticket System

Support ticket management with categories.

### Commands
- `/ticket` - Create a support ticket
- `/close [reason]` - Close current ticket
- `/partner` - Create partner ticket

### Features
- Multiple ticket categories
- Ticket transcripts
- Partner ticket system
- Auto-close functionality
- Ticket logging

---

## 🎭 Custom Roles

User-customizable roles and appearance.

### Commands
- `/cusrole <name> <color>` - Create custom role
- `/removebg` - Remove custom role background

### Features
- Personal custom roles
- Color customization
- Role management

---

## 🤖 Auto Responder

Automated message responses based on triggers.

### Commands
- `/addres <trigger> <response>` - Add auto response
- `/delres <trigger>` - Delete auto response
- `/listres` - List all auto responses

### Features
- Keyword-based triggers
- Custom responses
- Multiple auto responders

---

## 💬 Confession System

Anonymous confession feature.

### Commands
- `/confes` - Submit anonymous confession
- `/reset` - Reset confession state (admin)

### Features
- Anonymous submissions
- Confession approval system
- State management

---

## 🎁 Giveaway System

Create and manage server giveaways.

### Commands
- `/start <duration> <winners> <prize>` - Start giveaway
- `/end <message_id>` - End giveaway early
- `/reroll <message_id>` - Reroll giveaway winners

### Features
- Timed giveaways
- Multiple winners
- Automatic winner selection
- Reroll functionality
- Participant tracking

---

## 🎮 Mini Games

Interactive games for server entertainment.

### Commands
- `/wordchain` - Start word chain game
- `/caklontong` - Indonesian riddle game
- `/guesstheanimal` - Animal guessing game
- `/tebakgambar` - Image guessing game

### Features
- Word chain with scoring
- Timed challenges
- Leaderboards
- Multiple game modes

---

## 🛡️ Moderation Tools

Server moderation and management commands.

### Commands
- `/warn <user> <reason>` - Warn a user
- `/snipe` - View recently deleted messages
- `/trollban <user>` - Fake ban command (joke)

### Features
- Warning system
- Message snipe
- Moderation logging

---

## 🎨 Action Commands

Fun interaction commands with anime GIFs.

### Commands
- `/bite <user>` - Bite someone
- `/cringe` - Show cringe reaction
- `/cry` - Cry reaction
- `/cuddle <user>` - Cuddle someone
- `/dance` - Dance animation
- `/hug <user>` - Hug someone
- `/kick <user>` - Kick someone (fun)
- `/kill <user>` - Kill someone (fun)
- `/kiss <user>` - Kiss someone
- `/pat <user>` - Pat someone
- `/poke <user>` - Poke someone
- `/slap <user>` - Slap someone
- `/wave <user>` - Wave at someone

### Features
- Anime GIF reactions
- User interactions
- Fun social commands

---

## 🔧 Utility Commands

General utility and information commands.

### Commands
- `/ping` - Check bot latency
- `/info` - Bot information
- `/avatar [user]` - View user avatar
- `/rinfo` - Role information
- `/createembed` - Create custom embed
- `/say <message>` - Make bot say something
- `/afk [reason]` - Set AFK status
- `/welcome` - Setup welcome message
- `/rules` - Display server rules
- `/support` - Get support information
- `/intro` - Introduction command
- `/event` - Event information
- `/books` - Book recommendations
- `/desk` - Desk setup showcase
- `/components` - UI components demo

### Features
- Custom embeds
- AFK system
- Welcome messages
- Server information
- Utility tools

---

## ⚙️ Configuration

Bot behavior can be configured through `config.js`:

- Level roles and rewards
- XP rates and cooldowns
- Economy settings
- Channel IDs for features
- Role IDs for permissions
- Embed colors and styling

---

## 🔐 Permissions

Most commands require specific permissions:

- **Admin Commands**: Administrator permission
- **Moderator Commands**: Manage Messages, Kick Members, Ban Members
- **Ticket Commands**: Manage Channels
- **Shop Management**: Administrator permission

---

## 📝 Notes

- All commands use Discord's slash command system
- XP cooldown: 60 seconds per message
- Voice XP: Earned per minute in voice channels
- Daily rewards reset at midnight UTC
- Leaderboards update in real-time
- All data stored in MongoDB

---

For setup instructions, see [README.md](README.md)

For technical details, see [SUMMARY.md](SUMMARY.md)
