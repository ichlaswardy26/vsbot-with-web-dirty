const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
  // ==================== CHANNELS ====================
  channels: {
    // Welcome & Goodbye
    welcome: { type: String, default: null },
    welcome2: { type: String, default: null },
    welcomeLog: { type: String, default: null },
    
    // Boost
    boostAnnounce: { type: String, default: null },
    boostLogs: { type: String, default: null },
    
    // Ticket
    ticketLogs: { type: String, default: null },
    
    // Confession
    confession: { type: String, default: null },
    confessionLog: { type: String, default: null },
    
    // Custom Role
    customRoleLogs: { type: String, default: null },
    
    // Introduction
    intro: { type: String, default: null },
    
    // Donation
    donation: { type: String, default: null },
    
    // Chat Channels
    chat1: { type: String, default: null },
    chat2: { type: String, default: null },
    chat3: { type: String, default: null },
    chat4: { type: String, default: null },
    chat5: { type: String, default: null },
    
    // Rules Channels
    rules1: { type: String, default: null },
    rules2: { type: String, default: null },
    rules3: { type: String, default: null },
    rules4: { type: String, default: null },
    announcement: { type: String, default: null },
    
    // Giveaway Channels
    giveaway1: { type: String, default: null },
    giveaway2: { type: String, default: null },
    giveaway3: { type: String, default: null },
    giveaway4: { type: String, default: null },
    giveawayWinner: { type: String, default: null },
    
    // Premium Channels
    premium1: { type: String, default: null },
    premium2: { type: String, default: null },
    premium3: { type: String, default: null },
    premiumBenefit: { type: String, default: null },
    boosterRequest: { type: String, default: null },
    
    // Support
    support: { type: String, default: null },
    
    // Voice System
    joinToCreate: { type: String, default: null },
    voiceCategory: { type: String, default: null },
    voiceLog: { type: String, default: null },
  },
  
  // ==================== CATEGORIES ====================
  categories: {
    ticket: { type: String, default: null },
    partner: { type: String, default: null },
  },
  
  // ==================== ROLES ====================
  roles: {
    // Staff & Permissions
    staff: { type: String, default: null },
    supportTeam: { type: String, default: null },
    
    // Special Roles
    welcomeBot: { type: String, default: null },
    boost: { type: String, default: null },
    donate: { type: String, default: null },
    
    // Staff Hierarchy
    owner: { type: String, default: null },
    coOwner: { type: String, default: null },
    engineer: { type: String, default: null },
    admin: { type: String, default: null },
    moderator: { type: String, default: null },
    eventOrganizer: { type: String, default: null },
    partnerManager: { type: String, default: null },
    designer: { type: String, default: null },
    helper: { type: String, default: null },
    contentCreator: { type: String, default: null },
    
    // Support Tiers
    supportTier1: { type: String, default: null },
    supportTier2: { type: String, default: null },
    supportTier3: { type: String, default: null },
    supportTier4: { type: String, default: null },
    
    // Special Community Roles
    editor: { type: String, default: null },
    special: { type: String, default: null },
    streamer: { type: String, default: null },
    videoCreator: { type: String, default: null },
    bigGiveawayWinner: { type: String, default: null },
    smallGiveawayWinner: { type: String, default: null },
    bioLink: { type: String, default: null },
    socialFollower: { type: String, default: null },
    activeMember: { type: String, default: null },
    
    // Level Roles
    level: {
      1: { type: String, default: null },
      2: { type: String, default: null },
      7: { type: String, default: null },
      10: { type: String, default: null },
      20: { type: String, default: null },
      30: { type: String, default: null },
      40: { type: String, default: null },
      50: { type: String, default: null },
      60: { type: String, default: null },
      70: { type: String, default: null },
      80: { type: String, default: null },
      90: { type: String, default: null },
      100: { type: String, default: null },
    }
  },
  
  // ==================== EMOJIS ====================
  emojis: {
    souls: { type: String, default: '💰' },
    dot: { type: String, default: '🔵' },
    blank: { type: String, default: '⚪' },
    seraphyx: { type: String, default: '✨' },
    important: { type: String, default: '⚠️' },
    question: { type: String, default: '❓' },
    report: { type: String, default: '📢' },
    ban: { type: String, default: '🔨' },
    partner: { type: String, default: '🤝' },
    ticket: { type: String, default: '🎫' },
    roles: { type: String, default: '👥' },
    info: { type: String, default: 'ℹ️' },
    website: { type: String, default: '🌐' },
    levelup: { type: String, default: '⬆️' },
    tier: { type: String, default: '🏆' },
    rocket: { type: String, default: '🚀' },
    sparkleThumbsup: { type: String, default: '👍' },
    kittyDance: { type: String, default: '💃' },
    cowoncy: { type: String, default: '🪙' },
    donation: { type: String, default: '💝' },
    foryouCommunity: { type: String, default: '🏘️' },
  },
  
  // ==================== IMAGES & ASSETS ====================
  images: {
    defaultGif: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Default+Image' },
    event: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Event+Image' },
    partner: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Partner+Image' },
    support: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Support+Image' },
    books: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Books+Image' },
    rules: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Rules+Image' },
    rinfo: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=Role+Info' },
    qris: { type: String, default: 'https://via.placeholder.com/400x200/5865F2/FFFFFF?text=QRIS+Code' },
  },
  
  // ==================== FEATURES SETTINGS ====================
  features: {
    // Leveling
    xpCooldown: { type: Number, default: 60000 },
    xpMin: { type: Number, default: 15 },
    xpMax: { type: Number, default: 25 },
    voiceXpPerMinute: { type: Number, default: 10 },
    
    // Economy
    dailyReward: { type: Number, default: 100 },
    collectCooldown: { type: Number, default: 3600000 },
    
    // Ticket
    ticketPrefix: { type: String, default: 'ticket' },
    partnerTicketPrefix: { type: String, default: 'partner' },
    
    // Custom Role
    customRolePrice: { type: Number, default: 1000 },
    
    // Word Chain
    wordChainTimeout: { type: Number, default: 30000 },
  },
  
  // ==================== EMBED COLORS ====================
  colors: {
    primary: { type: String, default: '#5865F2' },
    success: { type: String, default: '#57F287' },
    error: { type: String, default: '#ED4245' },
    warning: { type: String, default: '#FEE75C' },
    info: { type: String, default: '#5865F2' },
  },
  
  // ==================== METADATA ====================
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null }, // Discord user ID
  version: { type: Number, default: 1 },
  
}, {
  timestamps: true
});

// Singleton pattern - only one config document
botConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

botConfigSchema.statics.updateConfig = async function(updates, userId = null) {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      ...updates,
      updatedBy: userId,
      version: 1
    });
  } else {
    // Deep merge for nested objects
    const mergeDeep = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          mergeDeep(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    mergeDeep(config, updates);
    config.lastUpdated = new Date();
    config.updatedBy = userId;
    config.version += 1;
    await config.save();
  }
  return config;
};

// Method to export config in the format expected by main bot
botConfigSchema.methods.toMainBotFormat = function() {
  return {
    channels: this.channels,
    categories: this.categories,
    roles: this.roles,
    emojis: this.emojis,
    images: this.images,
    features: this.features,
    colors: this.colors,
  };
};

module.exports = mongoose.model('BotConfig', botConfigSchema);