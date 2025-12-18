require("dotenv").config();
const configManager = require('./util/configManager');
const configLoader = require('./util/configLoader');

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

// Cache for dynamic config
let dynamicConfigCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get full configuration (static + dynamic from database)
 * @param {string} guildId - Discord guild ID (optional, uses default from env)
 * @returns {Promise<Object>} Complete configuration object
 */
async function getConfig(guildId = null) {
  const targetGuildId = guildId || staticConfig.guildId;
  
  if (!targetGuildId) {
    console.warn('[Config] No guild ID provided, using static config with defaults');
    return { ...staticConfig, ...defaultDynamicConfig };
  }

  // Check cache
  if (dynamicConfigCache && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return { ...staticConfig, ...dynamicConfigCache };
  }

  try {
    const webConfig = await configManager.getConfig(targetGuildId);
    dynamicConfigCache = webConfig;
    cacheTimestamp = Date.now();
    
    return {
      ...staticConfig,
      ...webConfig,
      // Ensure sensitive data is never overridden
      token: staticConfig.token,
      mongoUri: staticConfig.mongoUri,
      ownerIds: staticConfig.ownerIds,
      apiKeys: staticConfig.apiKeys,
      web: staticConfig.web,
      webhook: staticConfig.webhook,
    };
  } catch (error) {
    console.error('[Config] Error loading web config, using defaults:', error.message);
    return { ...staticConfig, ...defaultDynamicConfig };
  }
}

/**
 * Get static configuration only (synchronous)
 * @returns {Object} Static configuration
 */
function getStaticConfig() {
  return { ...staticConfig };
}

/**
 * Clear configuration cache
 * Call this when config is updated via web dashboard
 */
function clearCache() {
  dynamicConfigCache = null;
  cacheTimestamp = 0;
  configManager.clearAllCache();
}

/**
 * Get specific config section
 * @param {string} section - Section name (channels, roles, features, etc.)
 * @param {string} guildId - Guild ID (optional)
 * @returns {Promise<Object>} Configuration section
 */
async function getSection(section, guildId = null) {
  const config = await getConfig(guildId);
  return config[section] || {};
}

/**
 * Dynamic config getter - returns loaded config or defaults
 * This allows synchronous access after config is loaded
 */
function getDynamicConfig() {
  if (configLoader.isReady()) {
    return configLoader.get();
  }
  return defaultDynamicConfig;
}

// Export for backward compatibility and new usage
// Using getters to always return current loaded config
module.exports = {
  // Static config (direct access for credentials)
  ...staticConfig,
  
  // Dynamic values using getters for live updates
  get prefix() { return getDynamicConfig().prefix; },
  get channels() { return getDynamicConfig().channels; },
  get categories() { return getDynamicConfig().categories; },
  get roles() { return getDynamicConfig().roles; },
  get emojis() { return getDynamicConfig().emojis; },
  get images() { return getDynamicConfig().images; },
  get features() { return getDynamicConfig().features; },
  get colors() { return getDynamicConfig().colors; },
  get language() { return getDynamicConfig().language; },
  get staffUsers() { return getDynamicConfig().staffUsers; },
  
  // Methods for dynamic config
  getConfig,
  getStaticConfig,
  getSection,
  clearCache,
  configManager,
  configLoader,
  
  // Initialize config from database (call at bot startup)
  async initializeConfig(guildId) {
    const targetGuildId = guildId || staticConfig.guildId;
    if (targetGuildId) {
      await configLoader.initialize(targetGuildId);
    }
    return getDynamicConfig();
  },
  
  // Reload config (call when web dashboard updates config)
  async reloadConfig() {
    await configLoader.reload();
    clearCache();
    return getDynamicConfig();
  },
  
  // Check if config is loaded
  isConfigLoaded() {
    return configLoader.isReady();
  },
  
  // Default values (for reference)
  defaults: defaultDynamicConfig,
};
