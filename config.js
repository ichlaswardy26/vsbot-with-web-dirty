require("dotenv").config();

// Load dynamic config from database
const ConfigLoader = require('./config-loader');

// Base config dengan data sensitif dan fallback values
const baseConfig = {
  // ==================== BOT CREDENTIALS ====================
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  
  // ==================== OWNER & ADMIN ====================
  ownerId: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],
  
  // ==================== MONGODB ====================
  mongoUri: process.env.MONGO_URI,
  
  // ==================== CHANNELS ====================
  channels: {
    // Welcome & Goodbye
    welcome: process.env.WELCOME_CHANNEL_ID || null,
    welcome2: process.env.WELCOME2_CHANNEL_ID || null,
    welcomeLog: process.env.WELCOME_LOG_CHANNEL_ID || null,
    
    // Boost
    boostAnnounce: process.env.BOOST_ANNOUNCE_CHANNEL_ID || null,
    boostLogs: process.env.BOOST_LOGS_CHANNEL_ID || null,
    
    // Ticket
    ticketLogs: process.env.TICKET_LOG_CHANNEL_ID || null,
    
    // Confession
    confession: process.env.CONFESSION_CHANNEL_ID || null,
    confessionLog: process.env.CONFESSION_LOG_CHANNEL_ID || null,
    
    // Custom Role
    customRoleLogs: process.env.CUSTOM_ROLE_LOGS_CHANNEL_ID || null,
    
    // Introduction
    intro: process.env.INTRO_CHANNEL_ID || null,
    
    // Donation
    donation: process.env.DONATION_CHANNEL_ID || null,
    
    // Chat Channels
    chat1: process.env.CHAT_CHANNEL_1_ID || null,
    chat2: process.env.CHAT_CHANNEL_2_ID || null,
    chat3: process.env.CHAT_CHANNEL_3_ID || null,
    chat4: process.env.CHAT_CHANNEL_4_ID || null,
    chat5: process.env.CHAT_CHANNEL_5_ID || null,
    
    // Rules Channels
    rules1: process.env.RULES_CHANNEL_1_ID || null,
    rules2: process.env.RULES_CHANNEL_2_ID || null,
    rules3: process.env.RULES_CHANNEL_3_ID || null,
    rules4: process.env.RULES_CHANNEL_4_ID || null,
    announcement: process.env.ANNOUNCEMENT_CHANNEL_ID || null,
    
    // Giveaway Channels
    giveaway1: process.env.GIVEAWAY_CHANNEL_1_ID || null,
    giveaway2: process.env.GIVEAWAY_CHANNEL_2_ID || null,
    giveaway3: process.env.GIVEAWAY_CHANNEL_3_ID || null,
    giveaway4: process.env.GIVEAWAY_CHANNEL_4_ID || null,
    giveawayWinner: process.env.GIVEAWAY_WINNER_CHANNEL_ID || null,
    
    // Premium Channels
    premium1: process.env.PREMIUM_CHANNEL_1_ID || null,
    premium2: process.env.PREMIUM_CHANNEL_2_ID || null,
    premium3: process.env.PREMIUM_CHANNEL_3_ID || null,
    premiumBenefit: process.env.PREMIUM_BENEFIT_CHANNEL_ID || null,
    boosterRequest: process.env.BOOSTER_REQUEST_CHANNEL_ID || null,
    
    // Support
    support: process.env.SUPPORT_CHANNEL_ID || null,
    
    // Voice System
    joinToCreate: process.env.JOIN_TO_CREATE_CHANNEL_ID || null,
    voiceCategory: process.env.VOICE_CATEGORY_ID || null,
    voiceLog: process.env.VOICE_LOG_CHANNEL_ID || null,
  },
  
  // ==================== API KEYS ====================
  apiKeys: {
    removeBg: process.env.REMOVE_BG_API_KEY || null,
  },
  
  // ==================== BOT IDs ====================
  botIds: {
    owoBot: process.env.OWO_BOT_ID || "408785106942164992",
  },
  
  // ==================== CATEGORIES ====================
  categories: {
    ticket: process.env.TICKET_CATEGORY_ID || null,
    partner: process.env.PARTNER_CATEGORY_ID || null,
  },
  
  // ==================== ROLES ====================
  roles: {
    // Staff & Permissions
    staff: process.env.STAFF_ROLE_ID || null,
    supportTeam: process.env.SUPPORT_TEAM_ROLE_ID || null,
    
    // Special Roles
    welcomeBot: process.env.WELCOME_BOT_ROLE_ID || null,
    boost: process.env.BOOST_ROLE_ID || null,
    donate: process.env.DONATE_ROLE_ID || null,
    
    // Staff Hierarchy
    owner: process.env.OWNER_ROLE_ID || null,
    coOwner: process.env.CO_OWNER_ROLE_ID || null,
    engineer: process.env.ENGINEER_ROLE_ID || null,
    admin: process.env.ADMIN_ROLE_ID || null,
    moderator: process.env.MODERATOR_ROLE_ID || null,
    eventOrganizer: process.env.EVENT_ORGANIZER_ROLE_ID || null,
    partnerManager: process.env.PARTNER_MANAGER_ROLE_ID || null,
    designer: process.env.DESIGNER_ROLE_ID || null,
    helper: process.env.HELPER_ROLE_ID || null,
    contentCreator: process.env.CONTENT_CREATOR_ROLE_ID || null,
    
    // Support Tiers
    supportTier1: process.env.SUPPORT_TIER_1_ROLE_ID || null,
    supportTier2: process.env.SUPPORT_TIER_2_ROLE_ID || null,
    supportTier3: process.env.SUPPORT_TIER_3_ROLE_ID || null,
    supportTier4: process.env.SUPPORT_TIER_4_ROLE_ID || null,
    
    // Special Community Roles
    editor: process.env.EDITOR_ROLE_ID || null,
    special: process.env.SPECIAL_ROLE_ID || null,
    streamer: process.env.STREAMER_ROLE_ID || null,
    videoCreator: process.env.VIDEO_CREATOR_ROLE_ID || null,
    bigGiveawayWinner: process.env.BIG_GIVEAWAY_WINNER_ROLE_ID || null,
    smallGiveawayWinner: process.env.SMALL_GIVEAWAY_WINNER_ROLE_ID || null,
    bioLink: process.env.BIO_LINK_ROLE_ID || null,
    socialFollower: process.env.SOCIAL_FOLLOWER_ROLE_ID || null,
    activeMember: process.env.ACTIVE_MEMBER_ROLE_ID || null,
    
    // Level Roles (format: level:roleId)
    level: {
      1: process.env.LEVEL_1_ROLE_ID || null,
      2: process.env.LEVEL_2_ROLE_ID || null,
      7: process.env.LEVEL_7_ROLE_ID || null,
      10: process.env.LEVEL_10_ROLE_ID || null,
      20: process.env.LEVEL_20_ROLE_ID || null,
      30: process.env.LEVEL_30_ROLE_ID || null,
      40: process.env.LEVEL_40_ROLE_ID || null,
      50: process.env.LEVEL_50_ROLE_ID || null,
      60: process.env.LEVEL_60_ROLE_ID || null,
      70: process.env.LEVEL_70_ROLE_ID || null,
      80: process.env.LEVEL_80_ROLE_ID || null,
      90: process.env.LEVEL_90_ROLE_ID || null,
      100: process.env.LEVEL_100_ROLE_ID || null,
    }
  },
  
  // ==================== EMOJIS ====================
  emojis: {
    // Custom Emojis (format: <:name:id> or <a:name:id> for animated)
    souls: process.env.EMOJI_SOULS || '💰',
    dot: process.env.EMOJI_DOT || '🔵',
    blank: process.env.EMOJI_BLANK || '⚪',
    seraphyx: process.env.EMOJI_SERAPHYX || '✨',
    important: process.env.EMOJI_IMPORTANT || '⚠️',
    question: process.env.EMOJI_QUESTION || '❓',
    report: process.env.EMOJI_REPORT || '📢',
    ban: process.env.EMOJI_BAN || '🔨',
    partner: process.env.EMOJI_PARTNER || '🤝',
    ticket: process.env.EMOJI_TICKET || '🎫',
    roles: process.env.EMOJI_ROLES || '👥',
    info: process.env.EMOJI_INFO || 'ℹ️',
    website: process.env.EMOJI_WEBSITE || '🌐',
    levelup: process.env.EMOJI_LEVELUP || '⬆️',
    tier: process.env.EMOJI_TIER || '🏆',
    rocket: process.env.EMOJI_ROCKET || '🚀',
    sparkleThumbsup: process.env.EMOJI_SPARKLE_THUMBSUP || '👍',
    kittyDance: process.env.EMOJI_KITTYDANCE || '💃',
    cowoncy: process.env.EMOJI_COWONCY || '🪙',
    donation: process.env.EMOJI_DONATION || '💝',
    foryouCommunity: process.env.EMOJI_FORYOU_COMMUNITY || '🏘️',
  },
  
  // ==================== IMAGES & ASSETS ====================
  images: {
    defaultGif: process.env.DEFAULT_GIF_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Default+Image',
    event: process.env.EVENT_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Event+Image',
    partner: process.env.PARTNER_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Partner+Image',
    support: process.env.SUPPORT_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Support+Image',
    books: process.env.BOOKS_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Books+Image',
    rules: process.env.RULES_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Rules+Image',
    rinfo: process.env.RINFO_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Role+Info',
    qris: process.env.QRIS_IMAGE_URL || 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=QRIS+Code',
  },
  
  // ==================== FEATURES SETTINGS ====================
  features: {
    // Leveling
    xpCooldown: parseInt(process.env.XP_COOLDOWN) || 60000, // milliseconds
    xpMin: parseInt(process.env.XP_MIN) || 15,
    xpMax: parseInt(process.env.XP_MAX) || 25,
    voiceXpPerMinute: parseInt(process.env.VOICE_XP_PER_MINUTE) || 10,
    
    // Economy
    dailyReward: parseInt(process.env.DAILY_REWARD) || 100,
    collectCooldown: parseInt(process.env.COLLECT_COOLDOWN) || 3600000, // milliseconds
    
    // Ticket
    ticketPrefix: process.env.TICKET_PREFIX || 'ticket',
    partnerTicketPrefix: process.env.PARTNER_TICKET_PREFIX || 'partner',
    
    // Custom Role
    customRolePrice: parseInt(process.env.CUSTOM_ROLE_PRICE) || 1000,
    
    // Word Chain
    wordChainTimeout: parseInt(process.env.WORD_CHAIN_TIMEOUT) || 30000, // milliseconds
  },
  
  // ==================== EMBED COLORS ====================
  colors: {
    primary: process.env.COLOR_PRIMARY || '#5865F2',
    success: process.env.COLOR_SUCCESS || '#57F287',
    error: process.env.COLOR_ERROR || '#ED4245',
    warning: process.env.COLOR_WARNING || '#FEE75C',
    info: process.env.COLOR_INFO || '#5865F2',
  },
  
  // ==================== DEPRECATED (for backward compatibility) ====================
  // These will be removed in future versions
  prefix: process.env.PREFIX || 'sera',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,
  welcome2ChannelId: process.env.WELCOME2_CHANNEL_ID || null,
  welcomeLogChannelId: process.env.WELCOME_LOG_CHANNEL_ID || null,
  welcomeBotRoleId: process.env.WELCOME_BOT_ROLE_ID || null,
  boostAnnounceChannelId: process.env.BOOST_ANNOUNCE_CHANNEL_ID || null,
  boostLogsChannelId: process.env.BOOST_LOGS_CHANNEL_ID || null,
  ticket_channel: process.env.TICKET_LOG_CHANNEL_ID || null,
  ticket_category: process.env.TICKET_CATEGORY_ID || null,
  ticket_logs: process.env.TICKET_LOG_CHANNEL_ID || null,
  support_team: process.env.SUPPORT_TEAM_ROLE_ID || null,
  staffRoleId: process.env.STAFF_ROLE_ID || null,
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
  BOOST_ROLE_ID: process.env.BOOST_ROLE_ID || null,
  DONATE_ROLE_ID: process.env.DONATE_ROLE_ID || null,
  customRoleLogsChannelId: process.env.CUSTOM_ROLE_LOGS_CHANNEL_ID || null,
};

// Function untuk merge config dari database
async function loadDynamicConfig() {
  try {
    const dbConfig = await ConfigLoader.getConfig();
    
    if (dbConfig) {
      // Merge database config dengan base config
      return {
        ...baseConfig,
        channels: { ...baseConfig.channels, ...dbConfig.channels },
        roles: { ...baseConfig.roles, ...dbConfig.roles },
        categories: { ...baseConfig.categories, ...dbConfig.categories },
        emojis: { ...baseConfig.emojis, ...dbConfig.emojis },
        images: { ...baseConfig.images, ...dbConfig.images },
        features: { ...baseConfig.features, ...dbConfig.features },
        colors: { ...baseConfig.colors, ...dbConfig.colors },
      };
    }
  } catch (error) {
    console.warn('⚠️ Failed to load dynamic config, using base config:', error.message);
  }
  
  return baseConfig;
}

// Export config dengan dynamic loading
module.exports = new Proxy(baseConfig, {
  get(target, prop) {
    // Untuk properties yang bisa dinamis, load dari database
    if (['channels', 'roles', 'categories', 'emojis', 'images', 'features', 'colors'].includes(prop)) {
      // Return promise untuk async loading
      return loadDynamicConfig().then(config => config[prop]).catch(() => target[prop]);
    }
    
    // Untuk properties lain, return langsung dari base config
    return target[prop];
  }
});

// Export sync version untuk backward compatibility
module.exports.sync = baseConfig;

// Export async version untuk modern usage
module.exports.async = loadDynamicConfig;
