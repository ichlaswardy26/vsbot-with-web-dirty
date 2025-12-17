/**
 * WebSocket Service for Real-time Updates
 * Provides Socket.IO integration for configuration change broadcasting,
 * bot status monitoring, user presence, and conflict resolution.
 * 
 * Requirements: 9.2, 9.4, 9.5
 */

const { Server } = require('socket.io');

class WebSocketService {
  constructor(httpServer, client) {
    this.client = client;
    this.io = null;
    this.connectedUsers = new Map(); // socketId -> { userId, username, guildId, section }
    this.guildRooms = new Map(); // guildId -> Set of socketIds
    this.configVersions = new Map(); // guildId -> version number
    this.botStatusCheckInterval = null;
    this.lastBotStatus = 'unknown';
    
    if (httpServer) {
      this.initialize(httpServer);
    }
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startBotStatusMonitoring();

    console.log('WebSocket service initialized');
    return this.io;
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const session = socket.request.session;
      
      // Allow connection but mark as unauthenticated if no session
      if (!session || !session.passport || !session.passport.user) {
        socket.authenticated = false;
        socket.userId = null;
        socket.username = 'Anonymous';
      } else {
        socket.authenticated = true;
        socket.userId = session.passport.user.id;
        socket.username = session.passport.user.username || 'User';
      }
      
      next();
    });
  }


  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id} (${socket.username})`);

      // Handle joining a guild room for real-time updates
      socket.on('join:guild', (data) => {
        this.handleJoinGuild(socket, data);
      });

      // Handle leaving a guild room
      socket.on('leave:guild', (data) => {
        this.handleLeaveGuild(socket, data);
      });

      // Handle user starting to edit a section
      socket.on('editing:start', (data) => {
        this.handleEditingStart(socket, data);
      });

      // Handle user stopping editing
      socket.on('editing:stop', (data) => {
        this.handleEditingStop(socket, data);
      });

      // Handle configuration change from client
      socket.on('config:change', (data) => {
        this.handleConfigChange(socket, data);
      });

      // Handle request for current users in guild
      socket.on('users:request', (data) => {
        this.handleUsersRequest(socket, data);
      });

      // Handle bot status request
      socket.on('bot:status:request', () => {
        this.handleBotStatusRequest(socket);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Send initial bot status
      this.sendBotStatus(socket);
    });
  }

  /**
   * Handle user joining a guild room
   * Requirements: 9.4
   */
  handleJoinGuild(socket, data) {
    const { guildId } = data;
    
    if (!guildId) {
      socket.emit('error', { message: 'Guild ID required' });
      return;
    }

    // Join the guild room
    socket.join(`guild:${guildId}`);
    
    // Track user in guild
    if (!this.guildRooms.has(guildId)) {
      this.guildRooms.set(guildId, new Set());
    }
    this.guildRooms.get(guildId).add(socket.id);

    // Store user info
    this.connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      guildId,
      section: null,
      joinedAt: Date.now()
    });

    // Notify others in the guild
    socket.to(`guild:${guildId}`).emit('user:joined', {
      userId: socket.userId,
      username: socket.username,
      timestamp: Date.now()
    });

    // Send current users list to the joining user
    this.sendGuildUsers(socket, guildId);

    // Send current config version
    const version = this.configVersions.get(guildId) || 0;
    socket.emit('config:version', { guildId, version });

    console.log(`User ${socket.username} joined guild ${guildId}`);
  }

  /**
   * Handle user leaving a guild room
   */
  handleLeaveGuild(socket, data) {
    const { guildId } = data;
    
    if (!guildId) return;

    socket.leave(`guild:${guildId}`);
    
    // Remove from tracking
    if (this.guildRooms.has(guildId)) {
      this.guildRooms.get(guildId).delete(socket.id);
      if (this.guildRooms.get(guildId).size === 0) {
        this.guildRooms.delete(guildId);
      }
    }

    // Notify others
    socket.to(`guild:${guildId}`).emit('user:left', {
      userId: socket.userId,
      username: socket.username,
      timestamp: Date.now()
    });

    // Update user info
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.guildId = null;
      userInfo.section = null;
    }
  }

  /**
   * Handle user starting to edit a section
   * Requirements: 9.4
   */
  handleEditingStart(socket, data) {
    const { guildId, section } = data;
    
    if (!guildId || !section) return;

    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.section = section;
    }

    // Notify others in the guild about who is editing what
    socket.to(`guild:${guildId}`).emit('user:editing', {
      userId: socket.userId,
      username: socket.username,
      section,
      timestamp: Date.now()
    });
  }

  /**
   * Handle user stopping editing
   */
  handleEditingStop(socket, data) {
    const { guildId, section } = data;
    
    if (!guildId) return;

    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.section = null;
    }

    socket.to(`guild:${guildId}`).emit('user:stopped-editing', {
      userId: socket.userId,
      username: socket.username,
      section,
      timestamp: Date.now()
    });
  }


  /**
   * Handle configuration change notification
   * Requirements: 9.2, 9.4
   */
  handleConfigChange(socket, data) {
    const { guildId, section, changes, version } = data;
    
    if (!guildId || !section) return;

    // Update config version
    const currentVersion = this.configVersions.get(guildId) || 0;
    const newVersion = currentVersion + 1;
    this.configVersions.set(guildId, newVersion);

    // Broadcast to all users in the guild except sender
    socket.to(`guild:${guildId}`).emit('config:updated', {
      guildId,
      section,
      changes,
      version: newVersion,
      updatedBy: {
        userId: socket.userId,
        username: socket.username
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle request for users in guild
   */
  handleUsersRequest(socket, data) {
    const { guildId } = data;
    if (guildId) {
      this.sendGuildUsers(socket, guildId);
    }
  }

  /**
   * Handle bot status request
   * Requirements: 9.5
   */
  handleBotStatusRequest(socket) {
    this.sendBotStatus(socket);
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(socket, reason) {
    console.log(`WebSocket client disconnected: ${socket.id} (${reason})`);

    const userInfo = this.connectedUsers.get(socket.id);
    
    if (userInfo && userInfo.guildId) {
      // Notify others in the guild
      socket.to(`guild:${userInfo.guildId}`).emit('user:left', {
        userId: socket.userId,
        username: socket.username,
        timestamp: Date.now()
      });

      // Remove from guild room tracking
      if (this.guildRooms.has(userInfo.guildId)) {
        this.guildRooms.get(userInfo.guildId).delete(socket.id);
        if (this.guildRooms.get(userInfo.guildId).size === 0) {
          this.guildRooms.delete(userInfo.guildId);
        }
      }
    }

    // Remove from connected users
    this.connectedUsers.delete(socket.id);
  }

  /**
   * Send list of users in a guild to a socket
   * Requirements: 9.4
   */
  sendGuildUsers(socket, guildId) {
    const socketIds = this.guildRooms.get(guildId);
    if (!socketIds) {
      socket.emit('users:list', { guildId, users: [] });
      return;
    }

    const users = [];
    for (const socketId of socketIds) {
      const userInfo = this.connectedUsers.get(socketId);
      if (userInfo) {
        users.push({
          id: userInfo.userId,
          username: userInfo.username,
          section: userInfo.section,
          joinedAt: userInfo.joinedAt
        });
      }
    }

    socket.emit('users:list', { guildId, users });
  }

  /**
   * Send bot status to a socket
   * Requirements: 9.5
   */
  sendBotStatus(socket) {
    const status = this.getBotStatus();
    socket.emit('bot:status', status);
  }

  /**
   * Get current bot status
   * Requirements: 9.5
   */
  getBotStatus() {
    if (!this.client) {
      return {
        status: 'unknown',
        isOnline: false,
        message: 'Bot client not available',
        timestamp: Date.now()
      };
    }

    const isReady = this.client.isReady?.() || false;
    const ping = this.client.ws?.ping || -1;

    let status = 'offline';
    let message = 'Bot is offline - changes will apply when reconnected';

    if (isReady) {
      if (ping > 500) {
        status = 'slow';
        message = 'Bot connection is slow';
      } else {
        status = 'online';
        message = 'Bot is online and ready';
      }
    }

    return {
      status,
      isOnline: isReady,
      ping,
      message,
      guilds: this.client.guilds?.cache?.size || 0,
      timestamp: Date.now()
    };
  }

  /**
   * Start bot status monitoring
   * Requirements: 9.5
   */
  startBotStatusMonitoring() {
    // Check bot status every 30 seconds
    this.botStatusCheckInterval = setInterval(() => {
      const status = this.getBotStatus();
      
      // Only broadcast if status changed
      if (status.status !== this.lastBotStatus) {
        this.lastBotStatus = status.status;
        this.broadcastBotStatus(status);
      }
    }, 30000);
  }

  /**
   * Broadcast bot status to all connected clients
   * Requirements: 9.5
   */
  broadcastBotStatus(status) {
    if (this.io) {
      this.io.emit('bot:status', status);
    }
  }


  // ==================== PUBLIC API METHODS ====================

  /**
   * Broadcast configuration change to all users in a guild
   * Called from API routes when config is updated
   * Requirements: 9.2
   */
  broadcastConfigChange(guildId, section, changes, updatedBy) {
    if (!this.io) return;

    // Update config version
    const currentVersion = this.configVersions.get(guildId) || 0;
    const newVersion = currentVersion + 1;
    this.configVersions.set(guildId, newVersion);

    this.io.to(`guild:${guildId}`).emit('config:updated', {
      guildId,
      section,
      changes,
      version: newVersion,
      updatedBy,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast configuration saved confirmation
   * Requirements: 9.2
   */
  broadcastConfigSaved(guildId, section, data) {
    if (!this.io) return;

    this.io.to(`guild:${guildId}`).emit('config:saved', {
      guildId,
      section,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast configuration error
   * Requirements: 9.3
   */
  broadcastConfigError(guildId, section, error) {
    if (!this.io) return;

    this.io.to(`guild:${guildId}`).emit('config:error', {
      guildId,
      section,
      error: error.message || error,
      timestamp: Date.now()
    });
  }

  /**
   * Send conflict notification to specific users
   * Requirements: 9.4
   */
  notifyConflict(guildId, conflict) {
    if (!this.io) return;

    this.io.to(`guild:${guildId}`).emit('config:conflict', {
      guildId,
      ...conflict,
      timestamp: Date.now()
    });
  }

  /**
   * Get users currently editing a specific section
   * Requirements: 9.4
   */
  getUsersEditingSection(guildId, section) {
    const socketIds = this.guildRooms.get(guildId);
    if (!socketIds) return [];

    const users = [];
    for (const socketId of socketIds) {
      const userInfo = this.connectedUsers.get(socketId);
      if (userInfo && userInfo.section === section) {
        users.push({
          id: userInfo.userId,
          username: userInfo.username
        });
      }
    }
    return users;
  }

  /**
   * Get all users in a guild
   */
  getGuildUsers(guildId) {
    const socketIds = this.guildRooms.get(guildId);
    if (!socketIds) return [];

    const users = [];
    for (const socketId of socketIds) {
      const userInfo = this.connectedUsers.get(socketId);
      if (userInfo) {
        users.push({
          id: userInfo.userId,
          username: userInfo.username,
          section: userInfo.section
        });
      }
    }
    return users;
  }

  /**
   * Get current config version for a guild
   */
  getConfigVersion(guildId) {
    return this.configVersions.get(guildId) || 0;
  }

  /**
   * Set config version for a guild
   */
  setConfigVersion(guildId, version) {
    this.configVersions.set(guildId, version);
  }

  /**
   * Check if any users are connected to a guild
   */
  hasConnectedUsers(guildId) {
    const socketIds = this.guildRooms.get(guildId);
    return socketIds && socketIds.size > 0;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connectedUsers.size,
      activeGuilds: this.guildRooms.size,
      botStatus: this.lastBotStatus
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    if (this.botStatusCheckInterval) {
      clearInterval(this.botStatusCheckInterval);
      this.botStatusCheckInterval = null;
    }

    if (this.io) {
      this.io.disconnectSockets(true);
      this.io.close();
      this.io = null;
    }

    this.connectedUsers.clear();
    this.guildRooms.clear();
    this.configVersions.clear();

    console.log('WebSocket service shut down');
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create WebSocket service instance
 */
function getWebSocketService(httpServer = null, client = null) {
  if (!instance && httpServer) {
    instance = new WebSocketService(httpServer, client);
  }
  return instance;
}

/**
 * Reset instance (for testing)
 */
function resetWebSocketService() {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}

module.exports = {
  WebSocketService,
  getWebSocketService,
  resetWebSocketService
};
