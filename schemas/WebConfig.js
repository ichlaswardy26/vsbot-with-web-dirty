const mongoose = require('mongoose');

const webConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  
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
    
    // Other Channels
    intro: { type: String, default: null },
    donation: { type: String, default: null },
    support: { type: String, default: null },
    
    // Chat Channels
    chat: {
      channel1: { type: String, default: null },
      channel2: { type: String, default: null },
      channel3: { type: String, default: null },
      channel4: { type: String, default: null },
      channel5: { type: String, default: null }
    },
    
    // Rules Channels
    rules: {
      channel1: { type: String, default: null },
      channel2: { type: String, default: null },
      channel3: { type: String, default: null },
      channel4: { type: String, default: null },
      announcement: { type: String, default: null }
    },
    
    // Giveaway Channels
    giveaway: {
      channel1: { type: String, default: null },
      channel2: { type: String, default: null },
      channel3: { type: String, default: null },
      channel4: { type: String, default: null },
      winner: { type: String, default: null }
    },
    
    // Premium Channels
    premium: {
      channel1: { type: String, default: null },
      channel2: { type: String, default: null },
      channel3: { type: String, default: null },
      benefit: { type: String, default: null },
      boosterRequest: { type: String, default: null }
    },
    
    // Voice System
    voice: {
      joinToCreate: { type: String, default: null },
      logs: { type: String, default: null }
    }
  },
  
  // ==================== CATEGORIES ====================
  categories: {
    ticket: { type: String, default: null },
    partner: { type: String, default: null },
    voice: { type: String, default: null }
  },
  
  // ==================== ROLES ====================
  roles: {
    // Staff & Permission Roles
    staff: { type: String, default: null },
    supportTeam: { type: String, default: null },
    
    // Special Roles
    welcomeBot: { type: String, default: null },
    boost: { type: String, default: null },
    donate: { type: String, default: null },
    
    // Level Roles
    levels: {
      level1: { type: String, default: null },
      level2: { type: String, default: null },
      level7: { type: String, default: null },
      level10: { type: String, default: null },
      level20: { type: String, default: null },
      level30: { type: String, default: null },
      level40: { type: String, default: null },
      level50: { type: String, default: null },
      level60: { type: String, default: null },
      level70: { type: String, default: null },
      level80: { type: String, default: null },
      level90: { type: String, default: null },
      level100: { type: String, default: null }
    },
    
    // Staff Hierarchy
    hierarchy: {
      owner: { type: String, default: null },
      coOwner: { type: String, default: null },
      engineer: { type: String, default: null },
      admin: { type: String, default: null },
      moderator: { type: String, default: null },
      eventOrganizer: { type: String, default: null },
      partnerManager: { type: String, default: null },
      designer: { type: String, default: null },
      helper: { type: String, default: null },
      contentCreator: { type: String, default: null }
    },
    
    // Support Tiers
    supportTiers: {
      tier1: { type: String, default: null },
      tier2: { type: String, default: null },
      tier3: { type: String, default: null },
      tier4: { type: String, default: null }
    },
    
    // Special Community Roles
    community: {
      editor: { type: String, default: null },
      special: { type: String, default: null },
      streamer: { type: String, default: null },
      videoCreator: { type: String, default: null },
      bigGiveawayWinner: { type: String, default: null },
      smallGiveawayWinner: { type: String, default: null },
      bioLink: { type: String, default: null },
      socialFollower: { type: String, default: null },
      activeMember: { type: String, default: null }
    },
    
    // Support Packages
    supportPackages: {
      cavernDread: { type: String, default: null },
      midnightCovenant: { type: String, default: null },
      dreadLegion: { type: String, default: null },
      abyssalBlade: { type: String, default: null },
      valkyrie: { type: String, default: null }
    },
    
    // Mention Role
    mention: { type: String, default: null }
  },
  
  // ==================== CUSTOM EMOJIS ====================
  emojis: {
    souls: { type: String, default: '💰' },
    dot: { type: String, default: '•' },
    blank: { type: String, default: '⠀' },
    seraphyx: { type: String, default: '🤖' },
    important: { type: String, default: '❗' },
    question: { type: String, default: '❓' },
    report: { type: String, default: '📝' },
    ban: { type: String, default: '🔨' },
    partner: { type: String, default: '🤝' },
    ticket: { type: String, default: '🎫' },
    roles: { type: String, default: '🎭' },
    info: { type: String, default: 'ℹ️' },
    website: { type: String, default: '🌐' },
    levelup: { type: String, default: '⬆️' },
    tier: { type: String, default: '🏆' },
    rocket: { type: String, default: '🚀' },
    sparkleThumbsup: { type: String, default: '👍' },
    kittyDance: { type: String, default: '💃' },
    cowoncy: { type: String, default: '🪙' },
    donation: { type: String, default: '💝' },
    foryouCommunity: { type: String, default: '👥' },
    check: { type: String, default: '✅' },
    clouds: { type: String, default: '☁️' },
    blackBoost: { type: String, default: '⚡' },
    cross: { type: String, default: '❌' },
    owoCash: { type: String, default: '💵' },
    blackBat: { type: String, default: '🦇' },
    cards: { type: String, default: '🃏' },
    spider: { type: String, default: '🕷️' },
    darkWyvern: { type: String, default: '🐉' },
    tako: { type: String, default: '🐙' },
    paimonPrimogems: { type: String, default: '💎' },
    witch: { type: String, default: '🧙' }
  },
  
  // ==================== IMAGES & ASSETS ====================
  images: {
    defaultGif: { type: String, default: 'https://cdn.discordapp.com/attachments/default.gif' },
    event: { type: String, default: null },
    partner: { type: String, default: null },
    support: { type: String, default: null },
    books: { type: String, default: null },
    rules: { type: String, default: null },
    rinfo: { type: String, default: null },
    qris: { type: String, default: null }
  },
  
  // ==================== FEATURES SETTINGS ====================
  features: {
    // Leveling System
    leveling: {
      enabled: { type: Boolean, default: true },
      xpCooldown: { type: Number, default: 60000 },
      xpMin: { type: Number, default: 15 },
      xpMax: { type: Number, default: 25 },
      voiceXpPerMinute: { type: Number, default: 10 }
    },
    
    // Economy System
    economy: {
      enabled: { type: Boolean, default: true },
      dailyReward: { type: Number, default: 100 },
      collectCooldown: { type: Number, default: 3600000 },
      customRolePrice: { type: Number, default: 1000 }
    },
    
    // Ticket System
    ticket: {
      enabled: { type: Boolean, default: true },
      prefix: { type: String, default: 'ticket' },
      partnerPrefix: { type: String, default: 'partner' }
    },
    
    // Mini Games
    games: {
      enabled: { type: Boolean, default: true },
      wordChainTimeout: { type: Number, default: 30000 }
    },
    
    // Welcome System
    welcome: {
      enabled: { type: Boolean, default: true },
      message: { type: String, default: 'Welcome to the server!' },
      embedColor: { type: String, default: '#5865F2' }
    },
    
    // Auto Responder
    autoResponder: {
      enabled: { type: Boolean, default: true }
    },
    
    // Confession System
    confession: {
      enabled: { type: Boolean, default: true }
    },
    
    // Voice System
    voice: {
      enabled: { type: Boolean, default: true },
      joinToCreateEnabled: { type: Boolean, default: false }
    }
  },
  
  // ==================== EMBED COLORS ====================
  colors: {
    primary: { type: String, default: '#5865F2' },
    success: { type: String, default: '#57F287' },
    error: { type: String, default: '#ED4245' },
    warning: { type: String, default: '#FEE75C' },
    info: { type: String, default: '#5865F2' }
  },
  
  // ==================== LANGUAGE SETTINGS ====================
  language: {
    default: { type: String, default: 'en' },
    available: [{ type: String }]
  },
  
  // ==================== METADATA ====================
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: String, default: '1.0.0' },
    lastConfiguredBy: { type: String, default: null }
  }
});

// Update timestamp on save
webConfigSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WebConfig', webConfigSchema);