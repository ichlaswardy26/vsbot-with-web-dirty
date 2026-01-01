const express = require('express');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo;
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const cookieParser = require('cookie-parser');

// Import middleware and routes
const { configurePassport, requireAuth, cleanupExpiredSessions } = require('./middleware/auth');
const { limiters } = require('./middleware/rateLimiter');
const { validateRequest, addRequestId } = require('./middleware/validation');
const { csrfProtection, getCsrfToken } = require('./middleware/csrf');
const { 
  enhancedSanitization, 
  securityHeaders, 
  requestSizeLimiter, 
  suspiciousActivityDetector,
  sessionSecurity,
  auditMiddleware 
} = require('./middleware/security');
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const { getWebSocketService } = require('./services/websocket');

// Import error handling and logging services
const { errorMiddleware } = require('./services/errorHandler');
const { webLogger, requestLoggingMiddleware } = require('./services/webLogger');
const { debugMiddleware, createDebugRoutes, isDebugMode } = require('./services/debugTools');
const { auditLogger, AuditEventType } = require('./services/auditLogger');

// Import configuration sync service
const configSync = require('../util/configSync');

class WebServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.server = null;
    this.httpServer = null;
    this.websocketService = null;
    const config = require('../config');
    this.port = config.web?.port || 3001;
    this.sessionMiddleware = null;
    
    // Initialize configuration sync service
    this.initializeConfigSync();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Clean up expired sessions every hour
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  }

  /**
   * Initialize configuration synchronization service with enhanced integration
   */
  async initializeConfigSync() {
    try {
      // Initialize with bot client and websocket service references
      await configSync.initialize(this.client, null);
      
      // Make config sync available globally for routes
      global.configSync = configSync;
      
      console.log('[WebServer] Configuration sync service initialized with bot integration');
    } catch (error) {
      console.error('[WebServer] Error initializing config sync service:', error);
    }
  }

  setupMiddleware() {
    // Trust proxy for secure cookies behind reverse proxy
    this.app.set('trust proxy', 1);

    // Request tracking and logging
    this.app.use(addRequestId);
    this.app.use(requestLoggingMiddleware);
    
    // Debug middleware (only in development)
    if (isDebugMode) {
      this.app.use(debugMiddleware);
    }

    // Security: Request size limiter (DoS prevention)
    this.app.use(requestSizeLimiter());

    // Security: Suspicious activity detection
    this.app.use(suspiciousActivityDetector);

    // Request validation
    this.app.use(validateRequest());

    // Cookie parser (required for CSRF)
    this.app.use(cookieParser());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security: Enhanced input sanitization
    this.app.use(enhancedSanitization);

    // Static files
    this.app.use('/css', express.static(path.join(__dirname, 'public/css')));
    this.app.use('/js', express.static(path.join(__dirname, 'public/js')));
    this.app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

    // Get config
    const config = require('../config');
    
    // Session configuration
    // Detect if using HTTPS (production, Cloudflare Tunnel, or explicit setting)
    const isProduction = config.nodeEnv === 'production';
    const forceSecureCookies = process.env.FORCE_SECURE_COOKIES === 'true';
    const callbackUrl = config.web?.discordCallbackUrl || '';
    const isHttpsCallback = callbackUrl.startsWith('https://');
    const isSecure = isProduction || forceSecureCookies || isHttpsCallback;
    
    const sessionConfig = {
      secret: config.web?.sessionSecret || 'your-secret-key-change-this',
      resave: false,
      saveUninitialized: false,
      name: 'sessionId', // Custom session cookie name
      cookie: {
        secure: isSecure, // Secure if HTTPS (production, tunnel, or forced)
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax' // 'lax' for OAuth compatibility with tunnels
      }
    };
    
    console.log(`[Session] Cookie secure: ${isSecure}, sameSite: lax, env: ${config.nodeEnv}, httpsCallback: ${isHttpsCallback}`);

    // Only add MongoStore if MongoDB URI is provided and not in test environment
    if (config.mongoUri && config.nodeEnv !== 'test') {
      try {
        // Use existing mongoose connection for MongoStore
        sessionConfig.store = MongoStore.create({
          mongoUrl: config.mongoUri,
          touchAfter: 24 * 3600, // lazy session update
          collectionName: 'sessions',
          ttl: 7 * 24 * 60 * 60, // 7 days in seconds
          autoRemove: 'native'
        });
        console.log('[Session] Using MongoDB session store');
      } catch (error) {
        console.warn('[Session] Failed to create MongoStore, using memory store:', error.message);
      }
    } else {
      console.warn('[Session] Using memory store (not recommended for production)');
    }

    // Store session middleware for WebSocket integration
    this.sessionMiddleware = session(sessionConfig);
    this.app.use(this.sessionMiddleware);

    // Security: Session security enhancements
    this.app.use(sessionSecurity);

    // Passport configuration
    configurePassport();
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Security: Comprehensive security headers
    this.app.use(securityHeaders());

    // CORS configuration
    this.app.use((req, res, next) => {
      const config = require('../config');
      const allowedOrigins = config.web?.allowedOrigins || ['http://localhost:3001'];
      const origin = req.headers.origin;
      
      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      
      next();
    });

    // Security: Audit logging for all state-changing requests
    this.app.use(auditMiddleware);
  }


  setupRoutes() {
    // CSRF token endpoint (for SPAs)
    this.app.get('/api/csrf-token', getCsrfToken);

    // Authentication routes (with rate limiting, no CSRF for OAuth flow)
    this.app.use('/auth', limiters.auth, authRoutes);

    // CSRF protection for API routes (state-changing operations)
    const csrfMiddleware = csrfProtection({
      ignorePaths: ['/auth/', '/api/csrf-token', '/health', '/api/health']
    });

    // API routes (with rate limiting and CSRF protection)
    this.app.use('/api/config', limiters.config, csrfMiddleware, configRoutes);
    this.app.use('/api/channels', limiters.api, csrfMiddleware, require('./routes/channels'));
    this.app.use('/api/roles', limiters.api, csrfMiddleware, require('./routes/roles'));
    this.app.use('/api/templates', limiters.api, csrfMiddleware, require('./routes/templates'));

    // Dashboard routes (enhanced with new endpoints)
    this.app.get('/api/dashboard/:guildId/overview', limiters.api, csrfMiddleware, require('./controllers/dashboardController').getDashboardOverview);
    this.app.get('/api/dashboard/:guildId/analytics', limiters.api, csrfMiddleware, require('./controllers/dashboardController').getConfigurationAnalytics);
    this.app.get('/api/dashboard/:guildId/bot-status', limiters.api, csrfMiddleware, require('./controllers/dashboardController').getBotIntegrationStatus);
    this.app.get('/api/dashboard/:guildId/validate', limiters.api, csrfMiddleware, require('./controllers/dashboardController').validateConfiguration);
    this.app.get('/api/dashboard/:guildId/suggestions', limiters.api, csrfMiddleware, require('./controllers/dashboardController').getConfigurationSuggestions);

    // Audit log endpoint (admin only)
    this.app.get('/api/audit-logs', requireAuth, async (req, res) => {
      try {
        const { guildId, userId, eventType, startDate, endDate, limit } = req.query;
        
        const logs = await auditLogger.queryLogs({
          guildId,
          userId,
          eventType,
          startDate,
          endDate,
          limit: parseInt(limit) || 100
        });
        
        res.json({
          success: true,
          data: logs
        });
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch audit logs'
        });
      }
    });

    // Audit stats endpoint
    this.app.get('/api/audit-stats', requireAuth, async (req, res) => {
      try {
        const { guildId } = req.query;
        const stats = await auditLogger.getStats(guildId);
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch audit stats'
        });
      }
    });

    // Debug routes (only in development)
    if (isDebugMode) {
      const debugRouter = require('express').Router();
      this.app.use('/debug', createDebugRoutes(debugRouter));
    }

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
      webLogger.logApiResponse(req.requestId, 404, 0, { path: req.path });
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
          requestId: req.requestId
        }
      });
    });

    // Global error handler using centralized error middleware
    this.app.use(errorMiddleware);
  }

  async start() {
    try {
      const config = require('../config');
      
      // Ensure MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB for web server');
      }

      // Create HTTP server for both Express and Socket.IO
      this.httpServer = http.createServer(this.app);

      // Initialize WebSocket service
      this.websocketService = getWebSocketService(this.httpServer, this.client);
      
      // Share session middleware with Socket.IO
      if (this.websocketService && this.websocketService.io && this.sessionMiddleware) {
        // Wrap session middleware for Socket.IO with proper error handling
        const wrap = middleware => (req, res, next) => {
          // Ensure req exists and has required properties for session middleware
          if (!req || typeof req !== 'object') {
            return next();
          }
          // Create a minimal response object if not provided
          const mockRes = res && typeof res.setHeader === 'function' ? res : {
            setHeader: () => {},
            getHeader: () => null
          };
          try {
            middleware(req, mockRes, next);
          } catch (err) {
            console.error('[WebSocket] Session middleware error:', err.message);
            next();
          }
        };
        this.websocketService.io.engine.use(wrap(this.sessionMiddleware));
      }

      // Make websocket service available to routes
      this.app.set('websocketService', this.websocketService);
      
      // Make Discord client available to routes
      this.app.set('discordClient', this.client);
      
      // Initialize Discord API service with client
      const { discordApiService } = require('./services/discordApi');
      if (this.client) {
        discordApiService.setClient(this.client);
        console.log('[Discord API] Service initialized with client');
      }

      this.server = this.httpServer.listen(this.port, () => {
        console.log(`Web dashboard running on port ${this.port}`);
        console.log(`Dashboard URL: http://localhost:${this.port}/dashboard`);
        console.log('WebSocket server initialized');
        console.log('Security measures enabled: CSRF, Rate Limiting, Audit Logging');
      });

      return this.server;
    } catch (error) {
      console.error('Failed to start web server:', error);
      throw error;
    }
  }

  async stop() {
    // Flush audit logs before shutdown
    if (auditLogger) {
      await auditLogger.flushBuffer();
    }

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
