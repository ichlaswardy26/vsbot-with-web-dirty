# 🎯 Bot Features & Commands

Complete feature overview and command reference for Villain Seraphyx Manager Bot.

## 🎭 Action & Fun Commands

Interactive commands for user engagement and entertainment.

### Action Commands
- **`bite @user`** - Bite another user with anime GIF
- **`cringe`** - Show cringe reaction
- **`cry`** - Display crying animation  
- **`cuddle @user`** - Cuddle with someone
- **`dance`** - Show dance animation
- **`hug @user`** - Give someone a hug
- **`kick @user`** - Playfully kick someone
- **`kill @user`** - Playfully eliminate someone
- **`kiss @user`** - Kiss someone
- **`pat @user`** - Pat someone's head
- **`poke @user`** - Poke another user
- **`slap @user`** - Slap someone
- **`wave @user`** - Wave at someone

### Utility Commands
- **`afk [reason]`** - Set AFK status with optional reason
- **`avatar [@user]`** - Display user's avatar (self or mentioned user)
- **`ping`** - Check bot latency and response time
- **`say <message>`** - Make the bot say something
- **`info`** - Display bot information and statistics

## 💰 Economy System

Complete virtual economy with souls currency and shop system.

### Core Economy
- **`balance [@user]`** - Check souls balance
- **`daily`** - Claim daily souls reward
- **`collect`** - Collect periodic souls bonus

### Shop System
- **`shop`** - Browse available items and roles
- **`buy <item_id>`** - Purchase items from shop
- **`purchases [@user]`** - View purchase history

### Shop Management (Admin)
- **`addshop`** - Add new shop item
- **`removeshop <id>`** - Remove shop item
- **`additem`** - Add exclusive limited item
- **`removeitem <id>`** - Remove exclusive item
- **`buyer <item_id>`** - View item buyers
- **`done <purchase_id>`** - Mark purchase as completed

### Economy Admin
- **`resetsouls @user`** - Reset user's souls balance
- **`addbalance @user <amount>`** - Add souls to user

## 📊 Leveling & XP System

Comprehensive leveling system with voice activity tracking.

### User Commands
- **`rank [@user]`** - View user's rank card and stats
- **`leaderboard`** - Server XP leaderboard
- **`booststatus`** - Check current XP boost status
- **`voiceevent`** - View voice activity events

### Admin Commands
- **`addxp @user <amount>`** - Add XP to user
- **`resetxp @user`** - Reset user's XP
- **`boost @user`** - Toggle XP boost for user
- **`resetvoiceevent`** - Reset voice event data

### XP Sources
- **Text Messages** - Gain XP from chatting (cooldown applies)
- **Voice Activity** - Earn XP per minute in voice channels
- **Boost Multipliers** - Enhanced XP rates for boosters/donors

## 🎮 Mini Games & Entertainment

Interactive games and entertainment features.

### Available Games
- **`caklontong`** - Indonesian riddle game with multiple choice
- **`guesstheanimal`** - Animal guessing game with images
- **`tebakgambar`** - Image guessing challenge
- **`wordchain`** - Word association chain game

### Game Features
- **Scoring System** - Earn souls for correct answers
- **Timeout Protection** - Games auto-end after time limit
- **Multiple Players** - Some games support multiple participants
- **Difficulty Levels** - Varying difficulty across games

## 🎁 Giveaway System

Complete giveaway management with winner selection.

### Commands
- **`giveaway`** - Start interactive giveaway creation
- **`giveaway-end <message_id>`** - Manually end giveaway
- **`giveaway-reroll <message_id>`** - Reroll giveaway winner

### Features
- **Interactive Setup** - Step-by-step giveaway creation
- **Automatic Ending** - Giveaways end automatically at set time
- **Winner Selection** - Random winner selection from participants
- **Requirement Checking** - Optional role/level requirements
- **Embed Display** - Beautiful giveaway embeds with reactions

## 🛡️ Moderation & Admin Tools

Comprehensive moderation and administrative features.

### Moderation Commands
- **`warn @user <reason>`** - Issue warning to user
- **`ban @user`** - Troll ban command (fun, not real ban)
- **`snipe`** - Show recently deleted message

### Admin Utilities
- **`reset @user`** - Reset all user data
- **`forceclose`** - Force close tickets or sessions
- **`createembed`** - Create custom embeds

### Auto Moderation
- **Message Filtering** - Automatic content filtering
- **Spam Protection** - Anti-spam measures
- **Auto Responses** - Configurable auto-responder system

## 🎫 Ticket System

Professional support ticket system with categories.

### User Commands
- **`ticket`** - Create support ticket
- **`close`** - Close current ticket

### Ticket Types
- **General Support** - General help and questions
- **Partner Tickets** - Partnership applications
- **Bug Reports** - Technical issue reporting

### Features
- **Category Organization** - Tickets sorted by type
- **Staff Notifications** - Auto-notify support team
- **Transcript Generation** - Save ticket conversations
- **Permission Management** - Role-based access control

## 🔊 Voice Channel Management

Advanced voice channel control and temporary channels.

### Commands
- **`voice <subcommand>`** - Voice channel management
  - `trust @user` - Add trusted user
  - `untrust @user` - Remove trusted user
  - `kick @user` - Kick from voice
  - `ban @user` - Ban from voice
  - `unban @user` - Unban from voice
  - `limit <number>` - Set user limit
  - `name <new_name>` - Change channel name
  - `lock` - Lock channel
  - `unlock` - Unlock channel
  - `hide` - Hide channel
  - `show` - Show channel
- **`claim`** - Claim ownership of voice channel

### Features
- **Temporary Channels** - Auto-created voice channels
- **Owner Controls** - Channel owner permissions
- **Trusted Users** - Delegate control to trusted members
- **Privacy Controls** - Lock, hide, and limit channels

## 💬 Confession System

Anonymous confession system with moderation.

### Commands
- **`confess`** - Send anonymous confession
- **`resetconfess`** - Reset confession state (admin)

### Features
- **Anonymous Posting** - Completely anonymous confessions
- **Moderation Queue** - Staff can review before posting
- **Auto-numbering** - Confessions automatically numbered
- **Spam Protection** - Cooldown and rate limiting

## 📢 Auto Responder

Intelligent auto-response system for common queries.

### Commands
- **`addres`** - Add new auto response
- **`delres <id>`** - Delete auto response
- **`listres`** - List all responses

### Features
- **Keyword Matching** - Respond to specific keywords
- **Multiple Triggers** - Multiple keywords per response
- **Rich Responses** - Support for embeds and mentions
- **Admin Management** - Easy response management

## 📖 Information & Help

Comprehensive information and help system.

### Information Commands
- **`rinfo`** - Detailed role information and hierarchy
- **`book`** - Server information and navigation
- **`rules`** - Server rules and guidelines
- **`support`** - Support and donation information
- **`partner`** - Partnership information
- **`event`** - Current events and activities

### Features
- **Interactive Menus** - Dropdown menus for navigation
- **Rich Embeds** - Beautiful formatted information
- **Up-to-date Info** - Automatically updated information
- **Multi-language** - Support for multiple languages

## 💰 Tako Donation Integration

Seamless integration with Tako.id donation platform.

### Features
- **Webhook Integration** - Real-time donation notifications
- **Secure Processing** - HMAC signature verification
- **Rich Notifications** - Beautiful donation announcements
- **Donor Recognition** - Special recognition for donors

### Webhook Details
- **Endpoint**: `/tako` on port 3000
- **Method**: POST with signature verification
- **Response**: Automatic channel notifications
- **Security**: HMAC-SHA256 signature validation

## 🎨 Custom Roles & Personalization

Advanced custom role system for boosters and donors.

### Commands
- **`cr create`** - Create custom role
- **`cr edit`** - Edit existing role
- **`cr delete`** - Delete custom role
- **`cr add @user`** - Add user to role
- **`cr remove @user`** - Remove user from role
- **`cr info`** - View role information
- **`cr up`** - Move role position up

### Features
- **Boost/Donor Tiers** - Different limits based on tier
- **Color Customization** - Custom hex colors
- **Icon Support** - Custom role icons (server boost required)
- **Member Management** - Add/remove role members
- **Position Control** - Adjust role hierarchy

## 🔧 Configuration & Setup

### Environment Variables
All sensitive configuration through environment variables:
- Bot credentials (TOKEN, CLIENT_ID, GUILD_ID)
- Database connection (MONGO_URI)
- Channel and role IDs
- Feature toggles and limits
- Tako webhook configuration

### Dynamic Configuration
- **Runtime Updates** - Many settings can be updated without restart
- **Database Storage** - Configuration stored in MongoDB
- **Fallback Values** - Safe defaults for all settings
- **Validation** - Input validation for all configuration

### Feature Toggles
- **Modular Design** - Enable/disable features as needed
- **Performance Optimization** - Disable unused features
- **Customization** - Tailor bot to server needs

## 📊 Analytics & Monitoring

### Built-in Analytics
- **Command Usage** - Track command popularity
- **User Activity** - Monitor user engagement
- **Error Tracking** - Automatic error logging
- **Performance Metrics** - Response time monitoring

### Logging System
- **Structured Logging** - JSON formatted logs
- **Log Levels** - Debug, info, warn, error levels
- **File Rotation** - Automatic log file management
- **Error Reporting** - Detailed error information

## 🚀 Performance & Scalability

### Optimization Features
- **Database Indexing** - Optimized MongoDB queries
- **Caching System** - Redis-like caching for frequent data
- **Rate Limiting** - Prevent spam and abuse
- **Memory Management** - Efficient memory usage

### Scalability
- **Sharding Ready** - Prepared for Discord sharding
- **Load Balancing** - Support for multiple instances
- **Database Scaling** - MongoDB cluster support
- **CDN Integration** - External asset hosting

---

*This bot is continuously updated with new features and improvements. Check the changelog for the latest updates.*