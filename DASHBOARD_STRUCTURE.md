# 📁 Dashboard Structure - Anna Manager Bot

Dokumentasi lengkap struktur folder dan file dashboard.

## 🗂️ Complete Structure

```
dashboard/
│
├── 📄 .env                          # Environment variables (create from .env.example)
├── 📄 .env.example                  # Environment template
├── 📄 .gitignore                    # Git ignore rules
├── 📄 package.json                  # Dependencies and scripts
├── 📄 README.md                     # Dashboard documentation
├── 📄 CHECKLIST.md                  # Installation checklist
│
├── 📁 server/                       # Backend server
│   │
│   ├── 📁 config/                   # Configuration files
│   │   └── 📄 passport.js           # Discord OAuth2 strategy
│   │
│   ├── 📁 middleware/               # Express middleware
│   │   └── 📄 auth.js               # Authentication middleware
│   │
│   ├── 📁 routes/                   # Route handlers
│   │   ├── 📄 index.js              # Home/landing page routes
│   │   ├── 📄 auth.js               # Authentication routes (login/logout)
│   │   ├── 📄 dashboard.js          # Dashboard page routes
│   │   └── 📄 api.js                # API endpoints
│   │
│   └── 📄 index.js                  # Main server entry point
│
├── 📁 views/                        # EJS templates
│   │
│   ├── 📁 partials/                 # Reusable components
│   │   ├── 📄 header.ejs            # HTML head, styles, meta tags
│   │   ├── 📄 navbar.ejs            # Top navigation bar
│   │   ├── 📄 sidebar.ejs           # Dashboard sidebar menu
│   │   └── 📄 footer.ejs            # Footer and scripts
│   │
│   ├── 📁 dashboard/                # Dashboard pages
│   │   ├── 📄 index.ejs             # Dashboard overview
│   │   ├── 📄 users.ejs             # User management page
│   │   ├── 📄 levels.ejs            # Level management page
│   │   ├── 📄 config.ejs            # Configuration page
│   │   ├── 📄 control.ejs           # Bot control page
│   │   └── 📄 analytics.ejs         # Analytics page
│   │
│   ├── 📄 index.ejs                 # Landing page
│   ├── 📄 404.ejs                   # 404 error page
│   └── 📄 error.ejs                 # General error page
│
└── 📁 public/                       # Static files
    ├── 📁 css/                      # Stylesheets
    │   └── 📄 custom.css            # Custom styles
    │
    ├── 📁 js/                       # JavaScript files
    │   └── 📄 main.js               # Main client-side JS
    │
    └── 📄 favicon.ico               # Favicon
```

## 📄 File Descriptions

### Root Files

#### `.env`
Environment variables untuk konfigurasi dashboard:
- Discord OAuth2 credentials
- MongoDB connection
- Session secret
- Admin user IDs
- Port configuration

#### `.env.example`
Template untuk `.env` file dengan contoh values.

#### `.gitignore`
Mencegah file sensitive (`.env`, `node_modules`) masuk ke Git.

#### `package.json`
Dependencies dan scripts:
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

#### `README.md`
Dokumentasi lengkap dashboard dengan:
- Installation guide
- Configuration
- API endpoints
- Deployment guide

#### `CHECKLIST.md`
Checklist untuk memastikan instalasi berhasil.

---

### Server Files

#### `server/index.js`
Main server file yang:
- Setup Express app
- Configure middleware (helmet, rate limiting)
- Setup session management
- Initialize Socket.IO
- Connect to MongoDB
- Load routes
- Start HTTP server

#### `server/config/passport.js`
Passport.js configuration untuk:
- Discord OAuth2 strategy
- User serialization/deserialization
- Admin authorization check

#### `server/middleware/auth.js`
Authentication middleware:
- `ensureAuthenticated` - Check if user logged in
- `ensureAdmin` - Check if user is admin

---

### Routes

#### `server/routes/index.js`
Landing page routes:
- `GET /` - Home page

#### `server/routes/auth.js`
Authentication routes:
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `GET /auth/logout` - Logout user

#### `server/routes/dashboard.js`
Dashboard page routes:
- `GET /dashboard` - Dashboard overview
- `GET /dashboard/users` - User management
- `GET /dashboard/levels` - Level management
- `GET /dashboard/config` - Configuration
- `GET /dashboard/control` - Bot control
- `GET /dashboard/analytics` - Analytics

#### `server/routes/api.js`
API endpoints:
- `GET /api/bot/status` - Get bot status
- `POST /api/users/:userId` - Update user
- `POST /api/levels/:userId` - Update level
- `DELETE /api/users/:userId` - Delete user
- `POST /api/config` - Update configuration
- `GET /api/stats` - Get statistics
- `GET /api/users/search` - Search users

---

### Views

#### Partials

**`header.ejs`**
- HTML head section
- Meta tags
- Tailwind CSS CDN
- Font Awesome icons
- Chart.js library
- Socket.IO client
- Custom styles

**`navbar.ejs`**
- Top navigation bar
- Logo and title
- User info display
- Login/logout button

**`sidebar.ejs`**
- Dashboard navigation menu
- Active page indicator
- Icon-based menu items
- Links to all pages

**`footer.ejs`**
- Footer content
- Socket.IO initialization
- Real-time update handlers
- Closing HTML tags

#### Dashboard Pages

**`dashboard/index.ejs`**
- Statistics cards (users, levels, giveaways)
- Top 10 users by souls
- Top 10 users by level
- Quick overview

**`dashboard/users.ejs`**
- User list table
- Edit user modal
- Delete user functionality
- Pagination
- Search bar

**`dashboard/levels.ejs`**
- Level list table
- Edit level modal
- Progress bars
- Pagination

**`dashboard/config.ejs`**
- Configuration form
- Grouped settings
- Save functionality
- Warning messages

**`dashboard/control.ejs`**
- Bot status display
- Control buttons
- Quick statistics
- Auto-refresh

**`dashboard/analytics.ejs`**
- Statistics cards
- User growth chart
- Level distribution chart
- Economy chart
- Activity cards

#### Other Pages

**`index.ejs`**
- Landing page
- Hero section
- Feature showcase
- Login button

**`404.ejs`**
- 404 error page
- Back to home button

**`error.ejs`**
- General error page
- Error details
- Stack trace (dev mode)

---

### Public Files

#### `public/css/custom.css`
Custom CSS:
- Smooth scrolling
- Custom scrollbar
- Loading animations
- Fade in effects
- Toast notifications
- Modal styles
- Responsive design

#### `public/js/main.js`
Client-side JavaScript:
- Toast notifications
- Number formatting
- Date formatting
- Copy to clipboard
- Confirm dialogs
- Export to CSV

---

## 🔗 File Dependencies

### Server Dependencies
```
server/index.js
├── config/passport.js
├── middleware/auth.js
└── routes/
    ├── index.js
    ├── auth.js
    ├── dashboard.js
    └── api.js
```

### View Dependencies
```
All dashboard pages include:
├── partials/header.ejs
├── partials/navbar.ejs
├── partials/sidebar.ejs (dashboard pages only)
└── partials/footer.ejs
```

### Route → View Mapping
```
/                           → views/index.ejs
/dashboard                  → views/dashboard/index.ejs
/dashboard/users            → views/dashboard/users.ejs
/dashboard/levels           → views/dashboard/levels.ejs
/dashboard/config           → views/dashboard/config.ejs
/dashboard/control          → views/dashboard/control.ejs
/dashboard/analytics        → views/dashboard/analytics.ejs
/auth/discord               → Discord OAuth (redirect)
/auth/discord/callback      → Dashboard (redirect)
/auth/logout                → Home (redirect)
```

---

## 📦 NPM Packages Used

### Production Dependencies
- **express** - Web framework
- **express-session** - Session management
- **ejs** - Template engine
- **passport** - Authentication
- **passport-discord** - Discord OAuth2
- **mongoose** - MongoDB ODM
- **dotenv** - Environment variables
- **axios** - HTTP client
- **body-parser** - Request body parsing
- **connect-mongo** - MongoDB session store
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **socket.io** - Real-time communication
- **moment** - Date formatting

### Development Dependencies
- **nodemon** - Auto-restart on file changes

---

## 🎨 Frontend Libraries (CDN)

- **Tailwind CSS** - Utility-first CSS framework
- **Font Awesome** - Icon library
- **Chart.js** - Chart library
- **Socket.IO Client** - Real-time client

---

## 🔐 Security Files

### Protected Files (Never Commit)
- `.env` - Contains sensitive credentials
- `node_modules/` - Dependencies
- `*.log` - Log files

### Public Files (Safe to Commit)
- `.env.example` - Template without real values
- All source code files
- Documentation files

---

## 📊 File Statistics

- **Total Files**: 30+
- **Server Files**: 8
- **View Files**: 13
- **Public Files**: 3
- **Config Files**: 6
- **Documentation**: 4+

---

## 🚀 Quick Navigation

### For Developers
- Start here: `server/index.js`
- Add routes: `server/routes/`
- Add pages: `views/dashboard/`
- Add styles: `public/css/custom.css`
- Add scripts: `public/js/main.js`

### For Designers
- Templates: `views/`
- Styles: `public/css/`
- Partials: `views/partials/`

### For Admins
- Configuration: `.env`
- Documentation: `README.md`
- Checklist: `CHECKLIST.md`

---

Made with ❤️ for Anna Manager Bot
