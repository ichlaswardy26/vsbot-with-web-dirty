# 🌐 Dashboard Features - Anna Manager Bot

Dokumentasi lengkap fitur-fitur dashboard Anna Manager Bot.

## 📊 Dashboard Overview

### Main Dashboard
Halaman utama yang menampilkan ringkasan statistik bot:

- **Total Users** - Jumlah total user yang terdaftar di database
- **Total Levels** - Jumlah user yang memiliki data level
- **Active Giveaways** - Jumlah giveaway yang sedang berjalan
- **Top 10 Users by Souls** - Leaderboard user dengan souls terbanyak
- **Top 10 Users by Level** - Leaderboard user dengan level tertinggi

### Real-time Updates
Dashboard menggunakan Socket.IO untuk update data secara real-time tanpa perlu refresh halaman.

## 👥 User Management

### Features
- **View All Users** - Lihat semua user dengan pagination (20 per halaman)
- **Edit User Data** - Edit souls dan bank balance user
- **Delete User** - Hapus user dan semua data terkait
- **Search User** - Cari user berdasarkan Discord ID

### User Data
Setiap user menampilkan:
- Discord User ID
- Souls (currency)
- Bank balance
- Action buttons (Edit, Delete)

### Edit User
Modal popup untuk edit user data:
- Input souls amount
- Input bank amount
- Save changes langsung ke database

### Delete User
Menghapus user akan menghapus:
- User data (souls, bank)
- Level data (level, XP)
- Voice time data
- Semua data terkait lainnya

## 📈 Level Management

### Features
- **View All Levels** - Lihat semua user dengan data level
- **Edit Level & XP** - Edit level dan XP user
- **Visual Progress** - Progress bar untuk XP ke level berikutnya
- **Sorting** - Otomatis sort by level tertinggi

### Level Data
Setiap entry menampilkan:
- Discord User ID
- Current level (badge)
- Current XP / Required XP
- Progress bar visual
- Edit button

### XP Calculation
- XP required = Level × 100
- Progress bar menunjukkan persentase XP ke level berikutnya

## ⚙️ Configuration Management

### Editable Settings

#### Bot Credentials
- Bot Token (password field)
- Client ID
- Guild ID
- Owner IDs (comma-separated)

#### MongoDB
- MongoDB URI (password field)

#### Channels
- Welcome Channel ID
- Welcome 2 Channel ID
- Welcome Log Channel ID
- Boost Announce Channel ID
- Boost Logs Channel ID
- Ticket Log Channel ID
- Custom Role Logs Channel ID
- Intro Channel ID
- Donation Channel ID

#### Categories
- Ticket Category ID
- Partner Category ID

#### Roles
- Staff Role ID
- Support Team Role ID
- Welcome Bot Role ID
- Boost Role ID
- Donate Role ID
- Level Roles (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)

#### Features Settings
- XP Min (default: 15)
- XP Max (default: 25)
- XP Cooldown (milliseconds)
- Voice XP Per Minute (default: 10)
- Daily Reward (default: 100)
- Collect Cooldown (milliseconds)
- Custom Role Price (default: 1000)
- Word Chain Timeout (milliseconds)

#### Embed Colors
- Primary Color (hex)
- Success Color (hex)
- Error Color (hex)
- Warning Color (hex)
- Info Color (hex)

### Save Configuration
- Saves directly to `.env` file
- Warning: Bot needs restart for changes to take effect
- Validation for required fields

## 🎮 Bot Control

### Bot Status Monitor
Real-time monitoring:
- **Status** - Online/Offline indicator
- **Uptime** - Hours and minutes bot has been running
- **Memory Usage** - RAM usage in MB

### Control Actions

#### Restart Bot
- Gracefully restart bot process
- Maintains database connections
- Reloads configuration

#### Stop Bot
- Safely stop bot process
- Closes all connections
- Saves current state

#### Clear Cache
- Clear bot's internal cache
- Refresh data from database
- Improve performance

#### View Logs
- View bot console logs
- Filter by log level
- Download logs

### Quick Statistics
Real-time stats display:
- Total Users
- Total Levels
- Total Souls in economy
- Commands Used (coming soon)

### Auto-refresh
- Status checks every 5 seconds
- Statistics update every 10 seconds
- Real-time status indicator

## 📊 Analytics

### Statistics Overview
Three main stat cards:
- **Total Users** - With user icon
- **Total Souls** - Total currency in circulation
- **Average Level** - Average level across all users

### Charts

#### User Growth Chart
- Line chart showing user growth over time
- Monthly data points
- Smooth curve animation
- Responsive design

#### Level Distribution Chart
- Doughnut chart showing level ranges
- Categories: 1-10, 11-20, 21-30, 31-40, 41+
- Color-coded segments
- Percentage display

#### Economy Statistics Chart
- Bar chart comparing souls earned vs spent
- Weekly data
- Dual dataset (earned/spent)
- Color-coded bars

### Activity Overview
Four activity cards:
- **Messages Today** - Total messages sent
- **Commands Used** - Total commands executed
- **Voice Minutes** - Total voice activity
- **Active Users** - Currently active users

### Chart Features
- Interactive tooltips
- Responsive design
- Smooth animations
- Export capability (coming soon)

## 🔐 Authentication & Security

### Discord OAuth2
- Secure login with Discord
- No password needed
- Automatic session management

### Authorization
- Role-based access control
- Only admins can access dashboard
- Admin IDs configured in `.env`

### Session Management
- Secure session storage in MongoDB
- 7-day session expiration
- Auto-logout on inactivity

### Security Features
- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- CSRF protection
- XSS prevention
- SQL injection prevention

## 🎨 UI/UX Features

### Design
- Modern gradient design
- Tailwind CSS framework
- Responsive layout (mobile-friendly)
- Dark mode ready (coming soon)

### Animations
- Smooth transitions
- Hover effects on cards
- Loading animations
- Toast notifications

### Navigation
- Sidebar navigation
- Active page indicator
- Breadcrumbs (coming soon)
- Quick search (coming soon)

### Components
- Modal dialogs
- Toast notifications
- Loading spinners
- Progress bars
- Badges and tags

## 🔄 Real-time Features

### Socket.IO Integration
- Real-time data updates
- Live bot status
- Instant notifications
- Multi-user support

### Auto-refresh
- Statistics auto-update
- Status monitoring
- Live charts update
- No manual refresh needed

## 📱 Responsive Design

### Mobile Support
- Responsive tables
- Mobile-friendly navigation
- Touch-optimized controls
- Adaptive layouts

### Tablet Support
- Optimized for iPad
- Touch gestures
- Landscape/portrait modes

### Desktop
- Full-featured interface
- Keyboard shortcuts (coming soon)
- Multi-window support

## 🚀 Performance

### Optimization
- Lazy loading
- Image optimization
- Code splitting
- Caching strategies

### Database
- Connection pooling
- Query optimization
- Index usage
- Pagination

### API
- Rate limiting
- Response caching
- Compression
- Error handling

## 🔮 Coming Soon

### Planned Features
- [ ] Dark mode toggle
- [ ] Export data to CSV/JSON
- [ ] Advanced search and filters
- [ ] Bulk operations
- [ ] Command logs viewer
- [ ] Backup and restore
- [ ] Multi-language support
- [ ] Custom themes
- [ ] Webhook management
- [ ] Plugin system

### Improvements
- [ ] Better mobile experience
- [ ] More chart types
- [ ] Advanced analytics
- [ ] Real-time notifications
- [ ] Activity timeline
- [ ] Audit logs
- [ ] Role management
- [ ] Permission system

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Check [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) untuk setup
2. Lihat [Troubleshooting section](DASHBOARD_SETUP.md#troubleshooting)
3. Buat issue di GitHub
4. Join Discord support server

---

Made with ❤️ for Anna Manager Bot
