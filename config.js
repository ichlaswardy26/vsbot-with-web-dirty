require("dotenv").config();
const configManager = require('./util/configManager');
const configLoader = require('./util/configLoader');
const configSync = require('./util/configSync');

/**
 * Static Configuration
 * Contains sensitive data and core settings that MUST come from environment variables
 * These values cannot be changed via web dashboard for security reasons
 */
const staticConfig = {
  // ==================== BOT CREDENTIALS ====================
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  
  // ==================== DATABASE ====================
  mongoUri: process.env.MONGO_URI,
  
  // ==================== OWNER & ADMIN ====================
  ownerIds: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',').map(id => id.trim()) : [],
  
  // ==================== WEB DASHBOARD ====================
  web: {
    port: parseInt(process.env.WEB_PORT) || 3001,
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret',
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3001'],
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    discordCallbackUrl: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3001/auth/discord/callback',
  },
  
  // ==================== WEBHOOK SERVER ====================
  webhook: {
    port: parseInt(process.env.WEBHOOK_PORT) || 3000,
    token: process.env.WEBHOOK_TOKEN,
  },
  
  // ==================== API KEYS ====================
  apiKeys: {
    removeBg: process.env.REMOVE_BG_API_KEY || null,
  },
  
  // ==================== ENVIRONMENT ====================
  nodeEnv: process.env.NODE_ENV || 'development',
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
    maxFiles: parseInt(process.env.MAX_LOG_FILES) || 5,
    maxSize: parseInt(process.env.MAX_LOG_SIZE) || 10485760,
  },
  
  // ==================== BOOST/DONATE ROLE IDS (for backward compatibility) ====================
  BOOST_ROLE_ID: process.env.BOOST_ROLE_ID || null,
  DONATE_ROLE_ID: process.env.DONATE_ROLE_ID || null,
};

/**
 * Default dynamic configuration
 * These are fallback values when database config is not available
 */
const defaultDynamicConfig = {
  prefix: process.env.PREFIX || '!',
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
    rocket: '🚀',
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
    voice: { enabled: true, joinToCreateEnabled: false },
  },
  colors: {
    primary: '#5865F2',
    success: '#57F287',
    error: '#ED4245',
    warning: '#FEE75C',
    info: '#5865F2',
  },
  language: {
    default: 'id',
    available: ['id'],
  },
};

/**
 * Enhanced Configuration Module
 * Provides unified access to both static and dynamic configuration
 * with real-time synchronization between dashboard and bot
 */
class Config {
  constructor() {
    this.staticConfig = staticConfig;
    this.dynamicConfig = null;
    this.isInitialized = false;
    this.guildId = staticConfig.guildId;
    this.botClient = null;
    this.webSocketService = null;
    
    // Initialize config sync service
    this.initializeSync();
  }

  /**
   * Initialize configuration synchronization with bot integration
   */
  async initializeSync() {
    try {
      await configSync.initialize(this.botClient, this.webSocketService);
      
      // Subscribe to config changes for main guild
      if (this.guildId) {
        configSync.subscribe(this.guildId, (config, updates, metadata) => {
          this.dynamicConfig = config;
          console.log(`[Config] Configuration updated via sync service (source: ${metadata.source})`);
          
          // Emit config change event for bot components
          if (this.botClient) {
            this.botClient.emit('configUpdated', {
              guildId: this.guildId,
              config,
              updates,
              metadata
            });
          }
        });
      }
    } catch (error) {
      console.error('[Config] Error initializing sync service:', error);
    }
  }

  /**
   * Set bot client for enhanced integration
   */
  setBotClient(client) {
    this.botClient = client;
    configSync.setBotClient(client);
    
    // Setup bot event listeners for config updates
    if (client) {
      client.on('configUpdated', (data) => {
        console.log(`[Config] Bot received config update for guild ${data.guildId}`);
      });
    }
  }

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(service) {
    this.webSocketService = service;
    configSync.setWebSocketService(service);
  }

  /**
   * Initialize configuration (called at bot startup)
   */
  async initialize() {
    if (this.isInitialized) return this.getConfig();
    
    try {
      // Initialize config loader for backward compatibility
      if (this.guildId) {
        await configLoader.initialize(this.guildId);
        this.dynamicConfig = await configSync.getConfig(this.guildId, false, true); // Validate with bot
      } else {
        this.dynamicConfig = defaultDynamicConfig;
      }
      
      this.isInitialized = true;
      console.log('[Config] Configuration initialized successfully with bot validation');
      return this.getConfig();
    } catch (error) {
      console.error('[Config] Error initializing configuration:', error);
      this.dynamicConfig = defaultDynamicConfig;
      this.isInitialized = true;
      return this.getConfig();
    }
  }

  /**
   * Get complete configuration (static + dynamic)
   */
  getConfig() {
    return {
      ...this.staticConfig,
      ...(this.dynamicConfig || defaultDynamicConfig)
    };
  }

  /**
   * Get static configuration only
   */
  getStaticConfig() {
    return { ...this.staticConfig };
  }

  /**
   * Get dynamic configuration only
   */
  getDynamicConfig() {
    return { ...(this.dynamicConfig || defaultDynamicConfig) };
  }

  /**
   * Reload configuration from database
   */
  async reloadConfig(guildId = null) {
    const targetGuildId = guildId || this.guildId;
    if (!targetGuildId) return this.getConfig();
    
    try {
      this.dynamicConfig = await configSync.getConfig(targetGuildId, true);
      console.log(`[Config] Configuration reloaded for guild ${targetGuildId}`);
      return this.getConfig();
    } catch (error) {
      console.error('[Config] Error reloading configuration:', error);
      return this.getConfig();
    }
  }

  /**
   * Update configuration via sync service
   */
  async updateConfig(guildId, updates, options = {}) {
    try {
      const updatedConfig = await configSync.updateConfig(guildId, updates, {
        ...options,
        source: 'bot'
      });
      
      if (guildId === this.guildId) {
        this.dynamicConfig = updatedConfig;
      }
      
      return updatedConfig;
    } catch (error) {
      console.error('[Config] Error updating configuration:', error);
      throw error;
    }
  }

  /**
   * Get guild-specific configuration
   */
  async getGuildConfig(guildId) {
    if (guildId === this.guildId && this.dynamicConfig) {
      return this.getConfig();
    }
    
    try {
      const guildDynamicConfig = await configSync.getConfig(guildId);
      return {
        ...this.staticConfig,
        ...guildDynamicConfig
      };
    } catch (error) {
      console.error(`[Config] Error getting guild config for ${guildId}:`, error);
      return {
        ...this.staticConfig,
        ...defaultDynamicConfig
      };
    }
  }

  // Backward compatibility methods
  getChannelId(channelKey, guildId = null) {
    const config = guildId ? this.getGuildConfig(guildId) : this.getConfig();
    return this._getNestedValue(config.channels, channelKey);
  }

  getRoleId(roleKey, guildId = null) {
    const config = guildId ? this.getGuildConfig(guildId) : this.getConfig();
    return this._getNestedValue(config.roles, roleKey);
  }

  getEmoji(emojiKey, guildId = null) {
    const config = guildId ? this.getGuildConfig(guildId) : this.getConfig();
    return config.emojis?.[emojiKey] || '❓';
  }

  getColor(colorKey, guildId = null) {
    const config = guildId ? this.getGuildConfig(guildId) : this.getConfig();
    return config.colors?.[colorKey] || '#5865F2';
  }

  getFeature(featureKey, guildId = null) {
    const config = guildId ? this.getGuildConfig(guildId) : this.getConfig();
    return config.features?.[featureKey] || { enabled: false };
  }

  /**
   * Helper method to get nested values
   */
  _getNestedValue(obj, key) {
    if (!obj || !key) return null;
    
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Clear configuration cache
   */
  clearCache(guildId = null) {
    configSync.clearCache(guildId);
    if (!guildId || guildId === this.guildId) {
      this.dynamicConfig = null;
    }
  }

  /**
   * Get configuration sync statistics
   */
  getSyncStats() {
    return configSync.getCacheStats();
  }
}

// Create singleton instance
const configInstance = new Config();

// Export for backward compatibility and new usage
module.exports = {
  // Static config (direct access for credentials)
  ...staticConfig,
  
  // Dynamic values using getters for live updates
  get prefix() { return configInstance.getDynamicConfig().prefix; },
  get channels() { return configInstance.getDynamicConfig().channels; },
  get categories() { return configInstance.getDynamicConfig().categories; },
  get roles() { return configInstance.getDynamicConfig().roles; },
  get emojis() { return configInstance.getDynamicConfig().emojis; },
  get images() { return configInstance.getDynamicConfig().images; },
  get features() { return configInstance.getDynamicConfig().features; },
  get colors() { return configInstance.getDynamicConfig().colors; },
  get language() { return configInstance.getDynamicConfig().language; },
  get staffUsers() { return configInstance.getDynamicConfig().staffUsers; },
  
  // Methods for dynamic config
  getConfig: (guildId) => configInstance.getGuildConfig(guildId),
  getStaticConfig: () => configInstance.getStaticConfig(),
  getSection: async (section, guildId) => {
    const config = await configInstance.getGuildConfig(guildId);
    return config[section] || {};
  },
  clearCache: (guildId) => configInstance.clearCache(guildId),
  configManager,
  configLoader,
  configSync,
  
  // Initialize config from database (call at bot startup)
  async initializeConfig(guildId) {
    return await configInstance.initialize();
  },
  
  // Set bot client for enhanced integration
  setBotClient(client) {
    return configInstance.setBotClient(client);
  },
  
  // Set WebSocket service for real-time updates
  setWebSocketService(service) {
    return configInstance.setWebSocketService(service);
  },
  
  // Reload config (call when web dashboard updates config)
  async reloadConfig(guildId) {
    return await configInstance.reloadConfig(guildId);
  },
  
  // Update config via sync service
  async updateConfig(guildId, updates, options) {
    return await configInstance.updateConfig(guildId, updates, options);
  },
  
  // Check if config is loaded
  isConfigLoaded() {
    return configInstance.isInitialized;
  },
  
  // Get sync statistics
  getSyncStats() {
    return configInstance.getSyncStats();
  },
  
  // Convenience methods
  getChannelId: (channelKey, guildId) => configInstance.getChannelId(channelKey, guildId),
  getRoleId: (roleKey, guildId) => configInstance.getRoleId(roleKey, guildId),
  getEmoji: (emojiKey, guildId) => configInstance.getEmoji(emojiKey, guildId),
  getColor: (colorKey, guildId) => configInstance.getColor(colorKey, guildId),
  getFeature: (featureKey, guildId) => configInstance.getFeature(featureKey, guildId),
  
  // Default values (for reference)
  defaults: defaultDynamicConfig,
};
