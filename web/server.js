const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

// Import middleware and routes
const { configurePassport, requireAuth, cleanupExpiredSessions } = require('./middleware/auth');
const { limiters } = require('./middleware/rateLimiter');
const { validateRequest, addRequestId, logRequest } = require('./middleware/validation');
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const { getWebSocketService } = require('./services/websocket');

class WebServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.server = null;
    this.httpServer = null;
    this.websocketService = null;
    this.port = process.env.WEB_PORT || 3000;
    this.sessionMiddleware = null;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Clean up expired sessions every hour
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  }

  setupMiddleware() {
    // Trust proxy for secure cookies behind reverse proxy
    this.app.set('trust proxy', 1);

    // Request tracking and logging
    this.app.use(addRequestId);
    if (process.env.NODE_ENV !== 'production') {
      this.app.use(logRequest);
    }

    // Request validation
    this.app.use(validateRequest());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use('/css', express.static(path.join(__dirname, 'public/css')));
    this.app.use('/js', express.static(path.join(__dirname, 'public/js')));
    this.app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

    // Session configuration
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };

    // Only add MongoStore if MongoDB URI is provided and not in test environment
    if (process.env.MONGODB_URI && process.env.NODE_ENV !== 'test') {
      try {
        sessionConfig.store = MongoStore.create({
          mongoUrl: process.env.MONGODB_URI,
          touchAfter: 24 * 3600 // lazy session update
        });
      } catch (error) {
        console.warn('Failed to create MongoStore, using memory store:', error.message);
      }
    }

    // Store session middleware for WebSocket integration
    this.sessionMiddleware = session(sessionConfig);
    this.app.use(this.sessionMiddleware);

    // Passport configuration
    configurePassport();
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Security headers
    this.app.use((req, res, next) => {
      // Basic security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Content Security Policy
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "img-src 'self' data: https://cdn.discordapp.com",
        "connect-src 'self' ws: wss:",
        "font-src 'self' https://cdn.jsdelivr.net",
        "frame-ancestors 'none'"
      ].join('; ');
      res.setHeader('Content-Security-Policy', csp);
      
      // HSTS for production
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      next();
    });

    // CORS configuration
    this.app.use((req, res, next) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      const origin = req.headers.origin;
      
      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      
      next();
    });
  }

  setupRoutes() {
    // Authentication routes (with rate limiting)
    this.app.use('/auth', limiters.auth, authRoutes);

    // API routes (with rate limiting)
    this.app.use('/api/config', limiters.config, configRoutes);
    this.app.use('/api/channels', limiters.api, require('./routes/channels'));
    this.app.use('/api/roles', limiters.api, require('./routes/roles'));
    this.app.use('/api/templates', limiters.api, require('./routes/templates'));

    // Dashboard route (protected)
    this.app.get('/dashboard', requireAuth, (req, res) => {
      res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    });

    // Root redirect
    this.app.get('/', (req, res) => {
      if (req.user) {
        res.redirect('/dashboard');
      } else {
        res.redirect('/auth/discord');
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const wsService = this.app.get('websocketService');
      const wsStats = wsService ? wsService.getStats() : null;
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: {
          status: this.client?.isReady() ? 'ready' : 'not ready',
          guilds: this.client?.guilds?.cache?.size || 0
        },
        websocket: wsStats ? {
          connections: wsStats.totalConnections,
          activeGuilds: wsStats.activeGuilds,
          botStatus: wsStats.botStatus
        } : null
      });
    });

    // Discord API health check endpoint
    // Requirements: 7.4
    this.app.get('/api/health/discord', requireAuth, async (req, res) => {
      try {
        const isConnected = this.client?.isReady() || false;
        const lastPing = this.client?.ws?.ping || -1;
        
        let status = 'connected';
        let warning = null;
        let validationLimitations = [];
        
        if (!isConnected) {
          status = 'disconnected';
          warning = 'Discord API is currently unavailable';
          validationLimitations = [
            'Channel existence cannot be verified',
            'Role hierarchy cannot be validated',
            'Guild permissions cannot be checked'
          ];
        } else if (lastPing > 500) {
          status = 'slow';
          warning = 'Discord API response is slow - validation may be delayed';
          validationLimitations = [
            'Real-time validation may be delayed'
          ];
        }
        
        res.json({
          success: true,
          data: {
            status,
            isConnected,
            warning,
            validationLimitations,
            lastChecked: Date.now(),
            ping: lastPing
          }
        });
      } catch (error) {
        console.error('Error checking Discord API health:', error);
        res.json({
          success: true,
          data: {
            status: 'error',
            isConnected: false,
            warning: 'Discord API returned an error',
            validationLimitations: [
              'Channel existence cannot be verified',
              'Role hierarchy cannot be validated',
              'Guild permissions cannot be checked'
            ],
            lastChecked: Date.now()
          }
        });
      }
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found'
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('Web server error:', err);
      
      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      res.status(err.status || 500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
      });
    });
  }

  async start() {
    try {
      // Ensure MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for web server');
      }

      // Create HTTP server for both Express and Socket.IO
      this.httpServer = http.createServer(this.app);

      // Initialize WebSocket service
      this.websocketService = getWebSocketService(this.httpServer, this.client);
      
      // Share session middleware with Socket.IO
      if (this.websocketService && this.websocketService.io && this.sessionMiddleware) {
        this.websocketService.io.engine.use(this.sessionMiddleware);
      }

      // Make websocket service available to routes
      this.app.set('websocketService', this.websocketService);

      this.server = this.httpServer.listen(this.port, () => {
        console.log(`Web dashboard running on port ${this.port}`);
        console.log(`Dashboard URL: http://localhost:${this.port}/dashboard`);
        console.log('WebSocket server initialized');
      });

      return this.server;
    } catch (error) {
      console.error('Failed to start web server:', error);
      throw error;
    }
  }

  async stop() {
    // Shutdown WebSocket service first
    if (this.websocketService) {
      this.websocketService.shutdown();
      this.websocketService = null;
    }

    if (this.server || this.httpServer) {
      return new Promise((resolve) => {
        const serverToClose = this.httpServer || this.server;
        serverToClose.close(() => {
          console.log('Web server stopped');
          this.server = null;
          this.httpServer = null;
          resolve();
        });
      });
    }
  }

  /**
   * Get WebSocket service instance
   */
  getWebSocketService() {
    return this.websocketService;
  }
}

module.exports = WebServer;