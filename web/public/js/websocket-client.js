/**
 * WebSocket Client for Real-time Updates
 * Provides Socket.IO client integration for configuration change broadcasting,
 * bot status monitoring, user presence, and conflict resolution.
 * 
 * Requirements: 9.2, 9.4, 9.5
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.guildId = null;
    this.currentSection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.configVersion = 0;
    this.pendingChanges = [];
    
    // Auto-initialize if Socket.IO is available
    if (typeof io !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize Socket.IO connection
   */
  initialize() {
    if (this.socket) {
      return;
    }

    try {
      this.socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.setupEventHandlers();
      console.log('WebSocket client initialized');
    } catch (error) {
      console.error('Failed to initialize WebSocket client:', error);
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Rejoin guild if we were in one
      if (this.guildId) {
        this.joinGuild(this.guildId);
      }
      
      // Update notification system
      this.updateConnectionStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connected = false;
      this.emit('disconnected', { reason });
      this.updateConnectionStatus('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('error', { error });
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('failed');
      }
    });


    // Bot status events
    // Requirements: 9.5
    this.socket.on('bot:status', (data) => {
      console.log('Bot status update:', data);
      this.emit('bot:status', data);
      this.handleBotStatusUpdate(data);
    });

    // User presence events
    // Requirements: 9.4
    this.socket.on('user:joined', (data) => {
      console.log('User joined:', data);
      this.emit('user:joined', data);
      this.handleUserJoined(data);
    });

    this.socket.on('user:left', (data) => {
      console.log('User left:', data);
      this.emit('user:left', data);
      this.handleUserLeft(data);
    });

    this.socket.on('user:editing', (data) => {
      console.log('User editing:', data);
      this.emit('user:editing', data);
      this.handleUserEditing(data);
    });

    this.socket.on('user:stopped-editing', (data) => {
      console.log('User stopped editing:', data);
      this.emit('user:stopped-editing', data);
      this.handleUserStoppedEditing(data);
    });

    this.socket.on('users:list', (data) => {
      console.log('Users list:', data);
      this.emit('users:list', data);
      this.handleUsersList(data);
    });

    // Configuration events
    // Requirements: 9.2
    this.socket.on('config:updated', (data) => {
      console.log('Config updated:', data);
      this.emit('config:updated', data);
      this.handleConfigUpdated(data);
    });

    this.socket.on('config:saved', (data) => {
      console.log('Config saved:', data);
      this.emit('config:saved', data);
    });

    this.socket.on('config:error', (data) => {
      console.log('Config error:', data);
      this.emit('config:error', data);
      this.handleConfigError(data);
    });

    // Requirements: 9.4
    this.socket.on('config:conflict', (data) => {
      console.log('Config conflict:', data);
      this.emit('config:conflict', data);
      this.handleConfigConflict(data);
    });

    this.socket.on('config:version', (data) => {
      console.log('Config version:', data);
      this.configVersion = data.version;
      this.emit('config:version', data);
    });

    // Error events
    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      this.emit('error', data);
    });
  }

  // ==================== GUILD MANAGEMENT ====================

  /**
   * Join a guild room for real-time updates
   */
  joinGuild(guildId) {
    if (!this.socket || !guildId) return;
    
    this.guildId = guildId;
    this.socket.emit('join:guild', { guildId });
    console.log('Joining guild:', guildId);
  }

  /**
   * Leave current guild room
   */
  leaveGuild() {
    if (!this.socket || !this.guildId) return;
    
    this.socket.emit('leave:guild', { guildId: this.guildId });
    console.log('Leaving guild:', this.guildId);
    this.guildId = null;
  }

  // ==================== EDITING STATUS ====================

  /**
   * Notify that user started editing a section
   * Requirements: 9.4
   */
  startEditing(section) {
    if (!this.socket || !this.guildId) return;
    
    this.currentSection = section;
    this.socket.emit('editing:start', { 
      guildId: this.guildId, 
      section 
    });
  }

  /**
   * Notify that user stopped editing
   */
  stopEditing() {
    if (!this.socket || !this.guildId || !this.currentSection) return;
    
    this.socket.emit('editing:stop', { 
      guildId: this.guildId, 
      section: this.currentSection 
    });
    this.currentSection = null;
  }

  // ==================== CONFIGURATION CHANGES ====================

  /**
   * Notify about configuration change
   * Requirements: 9.2
   */
  notifyConfigChange(section, changes) {
    if (!this.socket || !this.guildId) return;
    
    this.socket.emit('config:change', {
      guildId: this.guildId,
      section,
      changes,
      version: this.configVersion
    });
  }

  /**
   * Request current users in guild
   */
  requestUsers() {
    if (!this.socket || !this.guildId) return;
    
    this.socket.emit('users:request', { guildId: this.guildId });
  }

  /**
   * Request bot status
   */
  requestBotStatus() {
    if (!this.socket) return;
    
    this.socket.emit('bot:status:request');
  }


  // ==================== EVENT HANDLERS ====================

  /**
   * Handle bot status update
   * Requirements: 9.5
   */
  handleBotStatusUpdate(data) {
    if (window.notificationSystem) {
      const status = data.isOnline ? 
        (data.status === 'slow' ? 'warning' : 'online') : 
        'offline';
      window.notificationSystem.updateBotStatus(status, data.message);
    }
  }

  /**
   * Handle user joined event
   * Requirements: 9.4
   */
  handleUserJoined(data) {
    if (window.notificationSystem) {
      window.notificationSystem.showNotification(
        `${data.username} joined the dashboard`,
        'info',
        { duration: 3000 }
      );
    }
    this.requestUsers();
  }

  /**
   * Handle user left event
   */
  handleUserLeft(data) {
    this.requestUsers();
  }

  /**
   * Handle user editing event
   * Requirements: 9.4
   */
  handleUserEditing(data) {
    // Show indicator that another user is editing
    const indicator = document.querySelector(`[data-section="${data.section}"] .editing-indicator`);
    if (indicator) {
      indicator.textContent = `${data.username} is editing...`;
      indicator.style.display = 'block';
    }
    
    // Update users list
    this.requestUsers();
  }

  /**
   * Handle user stopped editing event
   */
  handleUserStoppedEditing(data) {
    const indicator = document.querySelector(`[data-section="${data.section}"] .editing-indicator`);
    if (indicator) {
      indicator.style.display = 'none';
    }
    this.requestUsers();
  }

  /**
   * Handle users list update
   * Requirements: 9.4
   */
  handleUsersList(data) {
    if (window.notificationSystem) {
      window.notificationSystem.updateConcurrentUsers(data.users);
    }
    
    // Update any UI elements showing user count
    const userCountEl = document.getElementById('active-users-count');
    if (userCountEl) {
      userCountEl.textContent = data.users.length;
    }
  }

  /**
   * Handle configuration updated by another user
   * Requirements: 9.2, 9.4
   */
  handleConfigUpdated(data) {
    // Update local config version
    this.configVersion = data.version;
    
    // Show notification about the change
    if (window.notificationSystem) {
      window.notificationSystem.showNotification(
        `${data.updatedBy.username} updated ${data.section} configuration`,
        'info',
        {
          details: 'Click to reload the latest changes',
          actions: [{
            id: 'reload',
            label: 'Reload',
            handler: () => {
              this.emit('reload:section', { section: data.section });
            }
          }]
        }
      );
    }

    // Check for conflicts if user is editing the same section
    if (this.currentSection === data.section) {
      this.handleConfigConflict({
        section: data.section,
        user: data.updatedBy,
        changes: data.changes,
        timestamp: data.timestamp
      });
    }
  }

  /**
   * Handle configuration error
   * Requirements: 9.3
   */
  handleConfigError(data) {
    if (window.notificationSystem) {
      window.notificationSystem.showNotification(
        `Configuration error in ${data.section}`,
        'error',
        {
          details: data.error,
          persistent: true
        }
      );
    }
  }

  /**
   * Handle configuration conflict
   * Requirements: 9.4
   */
  handleConfigConflict(data) {
    if (window.notificationSystem) {
      window.notificationSystem.showConflictNotification(data);
    } else {
      // Fallback alert
      const reload = confirm(
        `${data.user.username} has modified the ${data.section} configuration.\n\n` +
        'Do you want to reload the latest changes? Your unsaved changes will be lost.'
      );
      
      if (reload) {
        this.emit('reload:section', { section: data.section });
      }
    }
  }

  /**
   * Update connection status in UI
   */
  updateConnectionStatus(status, details = null) {
    const statusEl = document.getElementById('websocket-status');
    if (statusEl) {
      statusEl.className = `ws-status ws-${status}`;
      statusEl.title = details || status;
    }

    // Update notification system
    if (window.notificationSystem) {
      if (status === 'disconnected') {
        window.notificationSystem.showNotification(
          'Real-time updates disconnected',
          'warning',
          { details: 'Attempting to reconnect...' }
        );
      } else if (status === 'failed') {
        window.notificationSystem.showNotification(
          'Unable to establish real-time connection',
          'error',
          { 
            details: 'Some features may not work correctly',
            persistent: true 
          }
        );
      }
    }
  }


  // ==================== EVENT EMITTER ====================

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to local listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get current guild ID
   */
  getCurrentGuildId() {
    return this.guildId;
  }

  /**
   * Get current config version
   */
  getConfigVersion() {
    return this.configVersion;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.currentSection) {
      this.stopEditing();
    }
    
    if (this.guildId) {
      this.leaveGuild();
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connected = false;
    this.listeners.clear();
  }
}

// Create global instance
window.websocketClient = new WebSocketClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketClient;
}
