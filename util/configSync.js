/**
 * Enhanced Configuration Synchronization Service
 * Provides unified configuration management between dashboard and bot
 * with real-time synchronization, event-driven updates, and conflict resolution
 */

const EventEmitter = require('events');
const WebConfig = require('../schemas/WebConfig');

class ConfigSyncService extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds for faster sync
    this.subscribers = new Map(); // guildId -> Set of callbacks
    this.configVersions = new Map(); // guildId -> version number
    this.pendingUpdates = new Map(); // guildId -> pending update queue
    this.isInitialized = false;
    this.botClient = null;
    this.webSocketService = null;
    this.validationCache = new Map();
    this.conflictResolver = new Map();
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      averageSyncTime: 0
    };
  }

  /**
   * Initialize the sync service with bot client and websocket integration
   */
  async initialize(botClient = null, webSocketService = null) {
    if (this.isInitialized) return;
    
    console.log('[ConfigSync] Initializing enhanced configuration synchronization service...');
    
    this.botClient = botClient;
    this.webSocketService = webSocketService;
    
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.cacheTimeout);
    
    // Set up pending updates processor
    setInterval(() => this.processPendingUpdates(), 1000);
    
    // Set up validation cache cleanup
    setInterval(() => this.cleanupValidationCache(), 60000); // 1 minute
    
    // Set up bot event listeners if client is available
    if (this.botClient) {
      this.setupBotEventListeners();
    }
    
    this.isInitialized = true;
    console.log('[ConfigSync] Enhanced configuration synchronization service initialized');
    
    // Emit initialization event
    this.emit('service:initialized', {
      timestamp: Date.now(),
      hasBotClient: !!this.botClient,
      hasWebSocket: !!this.webSocketService
    });
  }

  /**
   * Set bot client for real-time validation
   */
  setBotClient(client) {
    this.botClient = client;
    if (client && this.isInitialized) {
      this.setupBotEventListeners();
    }
  }

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(service) {
    this.webSocketService = service;
  }

  /**
   * Setup bot event listeners for automatic config updates
   */
  setupBotEventListeners() {
    if (!this.botClient) return;

    // Listen for guild updates that might affect config
    this.botClient.on('channelDelete', (channel) => {
      this.handleChannelDelete(channel);
    });

    this.botClient.on('roleDelete', (role) => {
      this.handleRoleDelete(role);
    });

    this.botClient.on('guildUpdate', (oldGuild, newGuild) => {
      this.handleGuildUpdate(oldGuild, newGuild);
    });

    console.log('[ConfigSync] Bot event listeners registered');
  }

  /**
   * Get configuration with real-time sync and validation
   * @param {string} guildId - Discord guild ID
   * @param {boolean} forceRefresh - Force refresh from database
   * @param {boolean} validateWithBot - Validate against Discord API
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig(guildId, forceRefresh = false, validateWithBot = false) {
    if (!guildId) {
      throw new Error('Guild ID is required');
    }

    const startTime = Date.now();

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.cache.get(guildId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          if (validateWithBot && this.botClient) {
            await this.validateConfigWithBot(guildId, cached.config);
          }
          return cached.config;
        }
      }

      // Add timeout to database query
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
      });

      const configPromise = WebConfig.findOne({ guildId });
      let config = await Promise.race([configPromise, timeoutPromise]);
      
      if (!config) {
        config = await this.createDefaultConfig(guildId);
      }

      const configObj = config.toObject();
      
      // Validate with bot if requested and available
      if (validateWithBot && this.botClient) {
        try {
          await this.validateConfigWithBot(guildId, configObj);
        } catch (validationError) {
          console.warn('[ConfigSync] Bot validation failed:', validationError.message);
          // Continue without validation rather than failing completely
        }
      }
      
      // Update cache
      const version = this.getNextVersion(guildId);
      this.cache.set(guildId, {
        config: configObj,
        timestamp: Date.now(),
        version: version
      });

      // Update sync stats
      this.updateSyncStats(Date.now() - startTime, true);

      // Emit config loaded event
      this.emit('config:loaded', { 
        guildId, 
        config: configObj, 
        version,
        validated: validateWithBot,
        timestamp: Date.now()
      });
      
      return configObj;
    } catch (error) {
      this.updateSyncStats(Date.now() - startTime, false);
      console.error('[ConfigSync] Error getting config:', error);
      
      // Emit error event
      this.emit('config:error', {
        guildId,
        operation: 'getConfig',
        error: error.message,
        timestamp: Date.now()
      });
      
      // Return default config as fallback
      try {
        return this.getDefaultConfig(guildId);
      } catch (fallbackError) {
        console.error('[ConfigSync] Failed to get default config:', fallbackError);
        throw new Error('Failed to load configuration and fallback failed');
      }
    }
  }
    } catch (error) {
      this.updateSyncStats(Date.now() - startTime, false);
      console.error('[ConfigSync] Error getting config:', error);
      
      // Emit error event
      this.emit('config:error', {
        guildId,
        operation: 'getConfig',
        error: error.message,
        timestamp: Date.now()
      });
      
      // Return default config as fallback
      return this.getDefaultConfig(guildId);
    }
  }

  /**
   * Update configuration with enhanced validation and real-time sync
   * @param {string} guildId - Discord guild ID
   * @param {Object} updates - Configuration updates
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(guildId, updates, options = {}) {
    const {
      userId = null,
      source = 'unknown',
      validateWithBot = true,
      broadcastUpdate = true,
      atomic = true
    } = options;

    const startTime = Date.now();

    try {
      // Validate updates before applying
      if (validateWithBot && this.botClient) {
        const validationResult = await this.validateUpdatesWithBot(guildId, updates);
        if (!validationResult.isValid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Check for conflicts
      const conflicts = await this.detectConflicts(guildId, updates);
      if (conflicts.length > 0 && !options.ignoreConflicts) {
        this.emit('config:conflicts', {
          guildId,
          conflicts,
          updates,
          userId,
          timestamp: Date.now()
        });
      }

      // Perform atomic update
      let updatedConfig;
      if (atomic) {
        updatedConfig = await this.atomicUpdate(guildId, updates, userId);
      } else {
        updatedConfig = await this.standardUpdate(guildId, updates, userId);
      }

      // Update cache
      const version = this.getNextVersion(guildId);
      this.cache.set(guildId, {
        config: updatedConfig,
        timestamp: Date.now(),
        version: version
      });

      // Broadcast update via WebSocket
      if (broadcastUpdate && this.webSocketService) {
        this.webSocketService.broadcastConfigUpdate(guildId, {
          config: updatedConfig,
          updates,
          userId,
          source,
          version,
          timestamp: Date.now()
        });
      }

      // Notify subscribers
      this.notifySubscribers(guildId, updatedConfig, updates, { userId, source });

      // Update sync stats
      this.updateSyncStats(Date.now() - startTime, true);

      // Emit success event
      this.emit('config:updated', {
        guildId,
        config: updatedConfig,
        updates,
        userId,
        source,
        version,
        timestamp: Date.now()
      });

      return updatedConfig;
    } catch (error) {
      this.updateSyncStats(Date.now() - startTime, false);
      console.error('[ConfigSync] Error updating config:', error);
      
      // Emit error event
      this.emit('config:error', {
        guildId,
        operation: 'updateConfig',
        updates,
        userId,
        source,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Validate configuration updates against Discord API
   */
  async validateUpdatesWithBot(guildId, updates) {
    if (!this.botClient) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];
    const guild = this.botClient.guilds.cache.get(guildId);

    if (!guild) {
      errors.push('Guild not found or bot not in guild');
      return { isValid: false, errors, warnings };
    }

    // Validate channels
    if (updates.channels) {
      for (const [key, channelId] of Object.entries(updates.channels)) {
        if (channelId && !guild.channels.cache.has(channelId)) {
          errors.push(`Channel ${key} (${channelId}) not found in guild`);
        }
      }
    }

    // Validate roles
    if (updates.roles) {
      for (const [key, roleId] of Object.entries(updates.roles)) {
        if (roleId && !guild.roles.cache.has(roleId)) {
          errors.push(`Role ${key} (${roleId}) not found in guild`);
        }
      }
    }

    // Validate bot permissions
    const botMember = guild.members.cache.get(this.botClient.user.id);
    if (botMember) {
      const requiredPermissions = ['ManageRoles', 'ManageChannels', 'ManageMessages'];
      for (const perm of requiredPermissions) {
        if (!botMember.permissions.has(perm)) {
          warnings.push(`Bot missing ${perm} permission`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate existing configuration with bot
   */
  async validateConfigWithBot(guildId, config) {
    const cacheKey = `${guildId}:validation`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.result;
    }

    const result = await this.validateUpdatesWithBot(guildId, config);
    this.validationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    if (!result.isValid || result.warnings.length > 0) {
      this.emit('config:validation', {
        guildId,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Detect configuration conflicts
   */
  async detectConflicts(guildId, updates) {
    const conflicts = [];
    const currentConfig = await this.getConfig(guildId);

    // Check for duplicate channel assignments
    if (updates.channels) {
      const allChannels = { ...currentConfig.channels, ...updates.channels };
      const channelIds = Object.values(allChannels).filter(id => id);
      const duplicates = channelIds.filter((id, index) => channelIds.indexOf(id) !== index);
      
      if (duplicates.length > 0) {
        conflicts.push({
          type: 'duplicate_channels',
          message: 'Multiple features assigned to same channel',
          channels: duplicates,
          autoResolvable: false
        });
      }
    }

    // Check for role hierarchy conflicts
    if (updates.roles && this.botClient) {
      const guild = this.botClient.guilds.cache.get(guildId);
      if (guild) {
        const botRole = guild.members.cache.get(this.botClient.user.id)?.roles.highest;
        if (botRole) {
          for (const [key, roleId] of Object.entries(updates.roles)) {
            const role = guild.roles.cache.get(roleId);
            if (role && role.position >= botRole.position) {
              conflicts.push({
                type: 'role_hierarchy',
                message: `Role ${key} is higher than bot's highest role`,
                role: roleId,
                autoResolvable: false
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Perform atomic configuration update
   */
  async atomicUpdate(guildId, updates, userId) {
    const config = await WebConfig.findOneAndUpdate(
      { guildId },
      { 
        ...updates,
        'metadata.lastConfiguredBy': userId,
        'metadata.updatedAt': new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    return config.toObject();
  }

  /**
   * Perform standard configuration update
   */
  async standardUpdate(guildId, updates, userId) {
    const config = await WebConfig.findOneAndUpdate(
      { guildId },
      { 
        ...updates,
        'metadata.lastConfiguredBy': userId,
        'metadata.updatedAt': new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    return config.toObject();
  }

  /**
   * Handle bot events for automatic config cleanup
   */
  async handleChannelDelete(channel) {
    const guildId = channel.guild.id;
    const config = await this.getConfig(guildId);
    const updates = {};
    let hasUpdates = false;

    // Remove deleted channel from config
    for (const [key, channelId] of Object.entries(config.channels || {})) {
      if (channelId === channel.id) {
        updates[`channels.${key}`] = null;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await this.updateConfig(guildId, updates, {
        source: 'bot_event',
        validateWithBot: false,
        broadcastUpdate: true
      });
      
      console.log(`[ConfigSync] Removed deleted channel ${channel.id} from guild ${guildId} config`);
    }
  }

  async handleRoleDelete(role) {
    const guildId = role.guild.id;
    const config = await this.getConfig(guildId);
    const updates = {};
    let hasUpdates = false;

    // Remove deleted role from config
    for (const [key, roleId] of Object.entries(config.roles || {})) {
      if (roleId === role.id) {
        updates[`roles.${key}`] = null;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await this.updateConfig(guildId, updates, {
        source: 'bot_event',
        validateWithBot: false,
        broadcastUpdate: true
      });
      
      console.log(`[ConfigSync] Removed deleted role ${role.id} from guild ${guildId} config`);
    }
  }

  async handleGuildUpdate(oldGuild, newGuild) {
    // Handle guild updates that might affect configuration
    this.emit('guild:updated', {
      guildId: newGuild.id,
      oldGuild: {
        name: oldGuild.name,
        ownerId: oldGuild.ownerId
      },
      newGuild: {
        name: newGuild.name,
        ownerId: newGuild.ownerId
      },
      timestamp: Date.now()
    });
  }

  /**
   * Update synchronization statistics
   */
  updateSyncStats(duration, success) {
    this.syncStats.totalSyncs++;
    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }
    this.syncStats.lastSyncTime = Date.now();
    
    // Calculate rolling average
    if (this.syncStats.averageSyncTime === 0) {
      this.syncStats.averageSyncTime = duration;
    } else {
      this.syncStats.averageSyncTime = (this.syncStats.averageSyncTime * 0.9) + (duration * 0.1);
    }
  }

  /**
   * Get synchronization statistics
   */
  getSyncStats() {
    return {
      ...this.syncStats,
      successRate: this.syncStats.totalSyncs > 0 ? 
        (this.syncStats.successfulSyncs / this.syncStats.totalSyncs * 100).toFixed(2) : 0,
      cacheSize: this.cache.size,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  /**
   * Cleanup validation cache
   */
  cleanupValidationCache() {
    const now = Date.now();
    for (const [key, cached] of this.validationCache.entries()) {
      if (now - cached.timestamp > 60000) { // 1 minute
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Get default configuration for a guild
   */
  getDefaultConfig(guildId) {
    return {
      guildId,
      prefix: '!',
      channels: {},
      categories: {},
      roles: {},
      emojis: {
        souls: '💰',
        dot: '•',
        blank: '⠀',
        check: '✅',
        cross: '❌',
        info: 'ℹ️',
        important: '❗',
        question: '❓',
        ticket: '🎫',
        partner: '🤝',
        levelup: '⬆️',
        rocket: '🚀'
      },
      images: {},
      features: {
        leveling: { enabled: true, xpCooldown: 60000, xpMin: 15, xpMax: 25, voiceXpPerMinute: 10 },
        economy: { enabled: true, dailyReward: 100, collectCooldown: 3600000, customRolePrice: 1000 },
        ticket: { enabled: true, prefix: 'ticket', partnerPrefix: 'partner' },
        games: { enabled: true, wordChainTimeout: 30000 },
        welcome: { enabled: true, message: 'Welcome to the server!' },
        autoResponder: { enabled: true },
        confession: { enabled: true },
        voice: { enabled: true, joinToCreateEnabled: false }
      },
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      language: {
        default: 'id',
        available: ['id']
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Create default configuration in database
   */
  async createDefaultConfig(guildId) {
    const defaultConfig = new WebConfig(this.getDefaultConfig(guildId));
    await defaultConfig.save();
    return defaultConfig;
  }

  /**
   * Get next version number for a guild
   */
  getNextVersion(guildId) {
    const current = this.configVersions.get(guildId) || 0;
    const next = current + 1;
    this.configVersions.set(guildId, next);
    return next;
  }

  /**
   * Notify all subscribers of config changes
   */
  notifySubscribers(guildId, config, updates, metadata) {
    const subscribers = this.subscribers.get(guildId);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(config, updates, metadata);
        } catch (error) {
          console.error('[ConfigSync] Error in subscriber callback:', error);
        }
      }
    }
  }

  /**
   * Subscribe to configuration changes for a guild
   */
  subscribe(guildId, callback) {
    if (!this.subscribers.has(guildId)) {
      this.subscribers.set(guildId, new Set());
    }
    this.subscribers.get(guildId).add(callback);
    
    return () => {
      const subscribers = this.subscribers.get(guildId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(guildId);
        }
      }
    };
  }

  /**
   * Process pending updates queue
   */
  async processPendingUpdates() {
    for (const [guildId, queue] of this.pendingUpdates.entries()) {
      if (queue.length > 0) {
        const update = queue.shift();
        try {
          await this.updateConfig(guildId, update.updates, update.options);
        } catch (error) {
          console.error(`[ConfigSync] Error processing pending update for guild ${guildId}:`, error);
        }
      }
    }
  }

  /**
   * Queue configuration update for processing
   */
  queueUpdate(guildId, updates, options = {}) {
    if (!this.pendingUpdates.has(guildId)) {
      this.pendingUpdates.set(guildId, []);
    }
    this.pendingUpdates.get(guildId).push({ updates, options });
  }

  /**
   * Clear configuration cache
   */
  clearCache(guildId = null) {
    if (guildId) {
      this.cache.delete(guildId);
      this.validationCache.delete(`${guildId}:validation`);
    } else {
      this.cache.clear();
      this.validationCache.clear();
    }
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [guildId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(guildId);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      validationCacheSize: this.validationCache.size,
      timeout: this.cacheTimeout,
      hitRate: this.syncStats.successRate
    };
  }
}

// Create singleton instance
const configSync = new ConfigSyncService();

module.exports = configSync;