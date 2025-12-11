require("dotenv").config();

module.exports = {
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
    
    // Custom Role
    customRoleLogs: process.env.CUSTOM_ROLE_LOGS_CHANNEL_ID || null,
    
    // Introduction
    intro: process.env.INTRO_CHANNEL_ID || null,
    
    // Donation
    donation: process.env.DONATION_CHANNEL_ID || null,
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
    
    // Level Roles (format: level:roleId)
    level: {
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
  },
  
  // ==================== IMAGES & ASSETS ====================
  images: {
    defaultGif: process.env.DEFAULT_GIF_URL || 'https://media.discordapp.net/attachments/1366614812762570842/1426492512150884352/a8a69f5297fe2d3e60ff91610266b677.gif',
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
