/**
 * Configuration Loader
 * Loads configuration from database at startup and provides synchronous access
 * Also handles cache invalidation when config is updated via web dashboard
 */

const WebConfig = require('../schemas/WebConfig');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.isLoaded = false;
    this.guildId = null;
    this.loadPromise = null;
  }

  /**
   * Initialize and load configuration from database
   * Should be called once at bot startup after MongoDB connection
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Loaded configuration
   */
  async initialize(guildId) {
    if (!guildId) {
      console.warn('[ConfigLoader] No guild ID provided');
      return this.getDefaults();
    }

    this.guildId = guildId;
    
    // Prevent multiple simultaneous loads
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadFromDatabase();
    return this.loadPromise;
  }

  /**
   * Internal method to load config from database
   */
  async _loadFromDatabase() {
    try {
      console.log(`[ConfigLoader] Loading configuration for guild ${this.guildId}...`);
      
      let dbConfig = await WebConfig.findOne({ guildId: this.guildId });
      
      if (!dbConfig) {
        console.log('[ConfigLoader] No config found, creating default...');
        dbConfig = await this._createDefaultConfig();
      }

      // Transform database config to flat structure for backward compatibility
      this.config = this._transformConfig(dbConfig.toObject());
      this.isLoaded = true;
      this.loadPromise = null;
      
      console.log('[ConfigLoader] Configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('[ConfigLoader] Error loading config:', error);
      this.config = this.getDefaults();
      this.isLoaded = true;
      this.loadPromise = null;
      return this.config;
    }
  }

  /**
   * Create default configuration in database
   */
  async _createDefaultConfig() {
    const defaultConfig = new WebConfig({
      guildId: this.guildId,
      metadata: {
        createdAt: new Date(),
        version: '1.0.0'
      }
    });
    await defaultConfig.save();
    return defaultConfig;
  }

  /**
   * Transform nested database config to flat structure for backward compatibility
   * @param {Object} dbConfig - Raw database configuration
   * @returns {Object} Transformed configuration
   */
  _transformConfig(dbConfig) {
    const config = {
      guildId: dbConfig.guildId,
      prefix: dbConfig.prefix || '!',
      
      // Flatten channels
      channels: this._flattenChannels(dbConfig.channels || {}),
      
      // Flatten categories
      categories: dbConfig.categories || {},
      
      // Flatten roles
      roles: this._flattenRoles(dbConfig.roles || {}),
      
      // Emojis (already flat)
      emojis: dbConfig.emojis || this.getDefaults().emojis,
      
      // Images
      images: dbConfig.images || {},
      
      // Features
      features: dbConfig.features || this.getDefaults().features,
      
      // Colors
      colors: dbConfig.colors || this.getDefaults().colors,
      
      // Language (Indonesian only)
      language: { default: 'id', available: ['id'] },
      
      // Staff users (for backward compatibility)
      staffUsers: dbConfig.staffUsers || {}
    };

    return config;
  }

  /**
   * Flatten nested channels structure
   */
  _flattenChannels(channels) {
    const flat = {};
    
    // Direct channel mappings
    const directKeys = ['welcome', 'welcome2', 'welcomeLog', 'boostAnnounce', 'boostLogs', 
                        'ticketLogs', 'confession', 'confessionLog', 'customRoleLogs',
                        'intro', 'donation', 'support'];
    
    directKeys.forEach(key => {
      if (channels[key]) flat[key] = channels[key];
    });

    // Flatten nested chat channels
    if (channels.chat) {
      flat.chat1 = channels.chat.channel1;
      flat.chat2 = channels.chat.channel2;
      flat.chat3 = channels.chat.channel3;
      flat.chat4 = channels.chat.channel4;
      flat.chat5 = channels.chat.channel5;
    }

    // Flatten nested rules channels
    if (channels.rules) {
      flat.rules1 = channels.rules.channel1;
      flat.rules2 = channels.rules.channel2;
      flat.rules3 = channels.rules.channel3;
      flat.rules4 = channels.rules.channel4;
      flat.announcement = channels.rules.announcement;
    }

    // Flatten nested giveaway channels
    if (channels.giveaway) {
      flat.giveaway1 = channels.giveaway.channel1;
      flat.giveaway2 = channels.giveaway.channel2;
      flat.giveaway3 = channels.giveaway.channel3;
      flat.giveaway4 = channels.giveaway.channel4;
      flat.giveawayWinner = channels.giveaway.winner;
    }

    // Flatten nested premium channels
    if (channels.premium) {
      flat.premium1 = channels.premium.channel1;
      flat.premium2 = channels.premium.channel2;
      flat.premium3 = channels.premium.channel3;
      flat.premiumBenefit = channels.premium.benefit;
      flat.boosterRequest = channels.premium.boosterRequest;
    }

    // Flatten voice channels
    if (channels.voice) {
      flat.joinToCreate = channels.voice.joinToCreate;
      flat.voiceLogs = channels.voice.logs;
    }

    return flat;
  }

  /**
   * Flatten nested roles structure
   */
  _flattenRoles(roles) {
    const flat = {};
    
    // Direct role mappings
    const directKeys = ['staff', 'supportTeam', 'welcomeBot', 'boost', 'donate', 'mention'];
    directKeys.forEach(key => {
      if (roles[key]) flat[key] = roles[key];
    });

    // Flatten level roles - create a 'level' object for roleUtils.js compatibility
    if (roles.levels) {
      flat.level = {};
      Object.entries(roles.levels).forEach(([key, value]) => {
        if (value) {
          // Extract level number from key (e.g., 'level1' -> '1')
          const levelNum = key.replace('level', '');
          flat.level[levelNum] = value;
        }
      });
    }

    // Flatten hierarchy roles
    if (roles.hierarchy) {
      flat.owner = roles.hierarchy.owner;
      flat.coOwner = roles.hierarchy.coOwner;
      flat.engineer = roles.hierarchy.engineer;
      flat.admin = roles.hierarchy.admin;
      flat.moderator = roles.hierarchy.moderator;
      flat.eventOrganizer = roles.hierarchy.eventOrganizer;
      flat.partnerManager = roles.hierarchy.partnerManager;
      flat.designer = roles.hierarchy.designer;
      flat.helper = roles.hierarchy.helper;
      flat.contentCreator = roles.hierarchy.contentCreator;
    }

    // Flatten support tiers
    if (roles.supportTiers) {
      flat.cavernDread = roles.supportTiers.tier1 || roles.supportPackages?.cavernDread;
      flat.midnightCovenant = roles.supportTiers.tier2 || roles.supportPackages?.midnightCovenant;
      flat.dreadLegion = roles.supportTiers.tier3 || roles.supportPackages?.dreadLegion;
      flat.abyssalBlade = roles.supportTiers.tier4 || roles.supportPackages?.abyssalBlade;
    }

    // Flatten support packages (alternative location)
    if (roles.supportPackages) {
      if (!flat.cavernDread) flat.cavernDread = roles.supportPackages.cavernDread;
      if (!flat.midnightCovenant) flat.midnightCovenant = roles.supportPackages.midnightCovenant;
      if (!flat.dreadLegion) flat.dreadLegion = roles.supportPackages.dreadLegion;
      if (!flat.abyssalBlade) flat.abyssalBlade = roles.supportPackages.abyssalBlade;
      flat.valkyrie = roles.supportPackages.valkyrie;
    }

    // Flatten community roles
    if (roles.community) {
      Object.entries(roles.community).forEach(([key, value]) => {
        if (value) flat[key] = value;
      });
    }

    // Add customRolePosition for cusrole.js
    flat.customRolePosition = roles.customRolePosition;

    return flat;
  }

  /**
   * Get current configuration (synchronous)
   * @returns {Object} Current configuration
   */
  get() {
    if (!this.isLoaded) {
      console.warn('[ConfigLoader] Config not loaded yet, returning defaults');
      return this.getDefaults();
    }
    return this.config;
  }

  /**
   * Reload configuration from database
   * Call this when config is updated via web dashboard
   * @returns {Promise<Object>} Reloaded configuration
   */
  async reload() {
    console.log('[ConfigLoader] Reloading configuration...');
    this.isLoaded = false;
    this.loadPromise = null;
    return this._loadFromDatabase();
  }

  /**
   * Get default configuration values
   * @returns {Object} Default configuration
   */
  getDefaults() {
    return {
      prefix: '!',
      channels: {},
      categories: {},
      roles: {},
      emojis: {
        souls: '💰',
        dot: '•',
        blank: '⠀',
        seraphyx: '🤖',
        important: '❗',
        question: '❓',
        check: '✅',
        cross: '❌',
        info: 'ℹ️',
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
      staffUsers: {}
    };
  }

  /**
   * Check if configuration is loaded
   * @returns {boolean}
   */
  isReady() {
    return this.isLoaded;
  }
}

// Export singleton instance
module.exports = new ConfigLoader();
