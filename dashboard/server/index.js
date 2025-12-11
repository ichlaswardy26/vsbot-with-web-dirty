require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Trust proxy for rate limiting (fixes X-Forwarded-For header warning)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting with proper proxy configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true, // Trust proxy headers
});
app.use(limiter);

// MongoDB Connection with optimized settings (matching main bot)
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000, // 5 seconds (same as main bot)
  socketTimeoutMS: 45000, // 45 seconds
})
.then(() => console.log('✅ Dashboard connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 MongoDB disconnected');
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Passport configuration
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Load dashboard settings
const { loadSettings, checkMaintenance } = require('./middleware/settings');
app.use(loadSettings);
app.use(checkMaintenance);

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// Request logger
const { requestLogger } = require('./middleware/logger');
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Simple database ping
    await mongoose.connection.db.admin().ping();
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/dashboard/settings', require('./routes/settings'));
app.use('/dashboard/config', require('./routes/config'));
app.use('/api', require('./routes/api'));
app.use('/api/advanced', require('./routes/api-advanced'));

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to dashboard');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from dashboard');
  });
});

// Make io available to routes
app.set('io', io);

// Initialize Config Sync Service
const ConfigSyncService = require('./services/ConfigSyncService');
ConfigSyncService.start();

// Error handling
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Dashboard error:', err);
  
  // Handle MongoDB timeout errors specifically
  if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
    return res.status(503).render('error', { 
      title: 'Database Timeout',
      error: { message: 'Database connection timeout. Please try again in a moment.' }
    });
  }
  
  res.status(500).render('error', { 
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : { message: 'Internal server error' }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     🌐 DASHBOARD SERVER STARTED       ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Port      : ${String(PORT).padEnd(23)}║`);
  console.log(`║  URL       : http://localhost:${PORT.toString().padEnd(11)}║`);
  console.log('║  Status    : ✅ Ready                  ║');
  console.log('╚════════════════════════════════════════╝\n');
});
