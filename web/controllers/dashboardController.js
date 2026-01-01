/**
 * Enhanced Dashboard Controller
 * Unified controller for dashboard operations with real-time bot synchronization,
 * comprehensive analytics, and advanced configuration management
 */

const configSync = require('../../util/configSync');
const { auditLogger } = require('../services/auditLogger');
const { cacheService } = require('../services/cacheService');

/**
 * Get comprehensive dashboard overview data
 * Requirements: Task 18 - Configuration progress indicators
 */
async function getDashboardOverview(req, res) {
  try {
    const { guildId } = req.params;
    
    // Get configuration with bot validation
    const config = await configSync.getConfig(guildId, false, true);
    
    // Calculate progress for each section
    const progress = {
      channels: calculateSectionProgress(config.channels, [
        'welcome', 'welcomeLog', 'boostAnnounce', 'boostLogs', 'ticketLogs',
        'confession', 'confessionLog', 'customRoleLogs', 'intro', 'donation', 'support'
      ]),
      roles: calculateSectionProgress(config.roles, [
        'admin', 'moderator', 'muted', 'booster', 'donor', 'vip', 'premium'
      ]),
      features: calculateFeaturesProgress(config.features),
      appearance: calculateSectionProgress(config.appearance || config.colors, [
        'primary', 'success', 'error', 'warning', 'info'
      ])
    };
    
    // Calculate overall progress
    const overallProgress = Math.round(
      (progress.channels.percentage + progress.roles.percentage + 
       progress.features.percentage + progress.appearance.percentage) / 4
    );
    
    // Get recent activity
    const recentActivity = await auditLogger.queryLogs({
      guildId,
      limit: 10
    });
    
    // Get bot status and guild info
    const botStatus = await getBotStatus(req.app.get('discordClient'), guildId);
    
    // Get sync statistics
    const syncStats = configSync.getSyncStats();
    
    // Get cache statistics
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        progress: {
          ...progress,
          overall: overallProgress
        },
        recentActivity,
        botStatus,
        syncStats,
        cacheStats,
        configVersion: configSync.configVersions.get(guildId) || 1,
        lastUpdated: Date.now(),
        guild: botStatus.guild
      }
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard overview'
    });
  }
}

/**
 * Get real-time configuration analytics
 */
async function getConfigurationAnalytics(req, res) {
  try {
    const { guildId } = req.params;
    const { timeRange = '7d' } = req.query;
    
    // Get configuration change history
    const changeHistory = await auditLogger.queryLogs({
      guildId,
      eventType: 'CONFIG_CHANGE',
      startDate: getTimeRangeStart(timeRange),
      limit: 100
    });
    
    // Analyze change patterns
    const analytics = {
      totalChanges: changeHistory.length,
      changesBySection: analyzeChangesBySection(changeHistory),
      changesByUser: analyzeChangesByUser(changeHistory),
      changesByTime: analyzeChangesByTime(changeHistory, timeRange),
      mostActiveFeatures: analyzeMostActiveFeatures(changeHistory),
      configurationHealth: await analyzeConfigurationHealth(guildId)
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting configuration analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration analytics'
    });
  }
}

/**
 * Get bot integration status and capabilities
 */
async function getBotIntegrationStatus(req, res) {
  try {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    
    if (!client) {
      return res.json({
        success: true,
        data: {
          status: 'disconnected',
          message: 'Bot client not available',
          capabilities: []
        }
      });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.json({
        success: true,
        data: {
          status: 'not_in_guild',
          message: 'Bot is not in this guild',
          capabilities: []
        }
      });
    }
    
    const botMember = guild.members.cache.get(client.user.id);
    const capabilities = analyzeBotCapabilities(botMember, guild);
    
    res.json({
      success: true,
      data: {
        status: 'connected',
        message: 'Bot is online and ready',
        guild: {
          id: guild.id,
          name: guild.name,
          memberCount: guild.memberCount,
          channelCount: guild.channels.cache.size,
          roleCount: guild.roles.cache.size
        },
        bot: {
          id: client.user.id,
          username: client.user.username,
          avatar: client.user.displayAvatarURL(),
          permissions: botMember?.permissions.toArray() || [],
          highestRole: botMember?.roles.highest?.name || 'None'
        },
        capabilities,
        ping: client.ws.ping,
        uptime: client.uptime
      }
    });
  } catch (error) {
    console.error('Error getting bot integration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bot integration status'
    });
  }
}

/**
 * Validate configuration in real-time
 */
async function validateConfiguration(req, res) {
  try {
    const { guildId } = req.params;
    const { section = null } = req.query;
    
    const config = await configSync.getConfig(guildId);
    const client = req.app.get('discordClient');
    
    let validationResult;
    if (section) {
      validationResult = await validateConfigSection(client, guildId, section, config[section]);
    } else {
      validationResult = await validateFullConfig(client, guildId, config);
    }
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate configuration'
    });
  }
}

/**
 * Get configuration suggestions based on guild analysis
 */
async function getConfigurationSuggestions(req, res) {
  try {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    
    if (!client) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }
    
    const config = await configSync.getConfig(guildId);
    const suggestions = await generateConfigSuggestions(guild, config);
    
    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Error getting configuration suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration suggestions'
    });
  }
}

/**
 * Calculate progress for a configuration section
 */
function calculateSectionProgress(section, fields) {
  if (!section) return { percentage: 0, configured: 0, total: fields.length };
  
  let configured = 0;
  fields.forEach(field => {
    const value = section[field];
    if (value !== null && value !== undefined && value !== '' && 
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && Object.keys(value).length === 0)) {
      configured++;
    }
  });
  
  return {
    percentage: Math.round((configured / fields.length) * 100),
    configured,
    total: fields.length,
    fields: fields.map(field => ({
      name: field,
      configured: section[field] !== null && section[field] !== undefined && section[field] !== ''
    }))
  };
}

/**
 * Calculate features progress
 */
function calculateFeaturesProgress(features) {
  if (!features) return { percentage: 0, enabled: 0, total: 8 };
  
  const featureKeys = ['leveling', 'economy', 'welcome', 'ticket', 'games', 'autoResponder', 'confession', 'voice'];
  let enabled = 0;
  
  const featureStatus = featureKeys.map(key => {
    const isEnabled = features[key]?.enabled === true;
    if (isEnabled) enabled++;
    return {
      name: key,
      enabled: isEnabled,
      configured: !!features[key]
    };
  });
  
  return {
    percentage: Math.round((enabled / featureKeys.length) * 100),
    enabled,
    total: featureKeys.length,
    features: featureStatus
  };
}

/**
 * Get bot status for a specific guild
 */
async function getBotStatus(client, guildId) {
  if (!client) {
    return {
      status: 'offline',
      isOnline: false,
      message: 'Bot client not available'
    };
  }

  const isReady = client.isReady?.() || false;
  const ping = client.ws?.ping || -1;
  const guild = client.guilds.cache.get(guildId);

  let status = 'offline';
  let message = 'Bot is offline';

  if (isReady) {
    if (!guild) {
      status = 'not_in_guild';
      message = 'Bot is not in this guild';
    } else if (ping > 500) {
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
    guild: guild ? {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL()
    } : null,
    guilds: client.guilds?.cache?.size || 0,
    uptime: client.uptime,
    timestamp: Date.now()
  };
}

/**
 * Analyze bot capabilities in a guild
 */
function analyzeBotCapabilities(botMember, guild) {
  if (!botMember) return [];
  
  const capabilities = [];
  const permissions = botMember.permissions;
  
  // Check essential permissions
  const essentialPerms = [
    { name: 'ManageRoles', required: true, description: 'Manage user roles and level roles' },
    { name: 'ManageChannels', required: true, description: 'Create voice channels and manage tickets' },
    { name: 'ManageMessages', required: true, description: 'Delete messages and manage chat' },
    { name: 'SendMessages', required: true, description: 'Send bot responses and notifications' },
    { name: 'EmbedLinks', required: true, description: 'Send rich embed messages' },
    { name: 'AttachFiles', required: true, description: 'Send images and files' },
    { name: 'ReadMessageHistory', required: true, description: 'Read message history for commands' },
    { name: 'UseExternalEmojis', required: false, description: 'Use custom emojis from other servers' },
    { name: 'AddReactions', required: false, description: 'Add reactions to messages' },
    { name: 'ManageNicknames', required: false, description: 'Change user nicknames' }
  ];
  
  essentialPerms.forEach(perm => {
    capabilities.push({
      name: perm.name,
      description: perm.description,
      hasPermission: permissions.has(perm.name),
      required: perm.required,
      status: permissions.has(perm.name) ? 'available' : (perm.required ? 'missing' : 'optional')
    });
  });
  
  // Check role hierarchy
  const botRole = botMember.roles.highest;
  const adminRoles = guild.roles.cache.filter(role => role.permissions.has('Administrator'));
  const canManageAdminRoles = adminRoles.every(role => botRole.position > role.position);
  
  capabilities.push({
    name: 'RoleHierarchy',
    description: 'Bot role position allows managing other roles',
    hasPermission: canManageAdminRoles,
    required: true,
    status: canManageAdminRoles ? 'available' : 'hierarchy_issue',
    details: {
      botRolePosition: botRole.position,
      botRoleName: botRole.name,
      highestManageableRole: guild.roles.cache
        .filter(role => botRole.position > role.position)
        .sort((a, b) => b.position - a.position)
        .first()?.name || 'None'
    }
  });
  
  return capabilities;
}

/**
 * Generate configuration suggestions based on guild analysis
 */
async function generateConfigSuggestions(guild, config) {
  const suggestions = [];
  
  // Analyze channels
  const textChannels = guild.channels.cache.filter(c => c.type === 0); // TEXT
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2); // VOICE
  
  // Suggest welcome channel if not configured
  if (!config.channels?.welcome && textChannels.size > 0) {
    const generalChannel = textChannels.find(c => 
      c.name.includes('general') || c.name.includes('welcome') || c.name.includes('lobby')
    );
    if (generalChannel) {
      suggestions.push({
        type: 'channel',
        priority: 'high',
        title: 'Configure Welcome Channel',
        description: 'Set up a welcome channel to greet new members',
        suggestion: `Use #${generalChannel.name} as your welcome channel`,
        action: {
          type: 'set_channel',
          field: 'channels.welcome',
          value: generalChannel.id,
          channelName: generalChannel.name
        }
      });
    }
  }
  
  // Suggest voice create channel if voice feature enabled but not configured
  if (config.features?.voice?.enabled && !config.channels?.voiceCreate && voiceChannels.size > 0) {
    suggestions.push({
      type: 'channel',
      priority: 'medium',
      title: 'Configure Voice Create Channel',
      description: 'Set up join-to-create voice functionality',
      suggestion: 'Create a "Join to Create" voice channel',
      action: {
        type: 'create_channel',
        channelType: 'voice',
        channelName: 'Join to Create',
        field: 'channels.voiceCreate'
      }
    });
  }
  
  // Analyze roles
  const roles = guild.roles.cache;
  
  // Suggest admin role if not configured
  if (!config.roles?.admin) {
    const adminRole = roles.find(r => 
      r.name.toLowerCase().includes('admin') || 
      r.name.toLowerCase().includes('owner') ||
      r.permissions.has('Administrator')
    );
    if (adminRole) {
      suggestions.push({
        type: 'role',
        priority: 'high',
        title: 'Configure Admin Role',
        description: 'Set up the administrator role for bot management',
        suggestion: `Use @${adminRole.name} as your admin role`,
        action: {
          type: 'set_role',
          field: 'roles.admin',
          value: adminRole.id,
          roleName: adminRole.name
        }
      });
    }
  }
  
  // Suggest moderator role if not configured
  if (!config.roles?.moderator) {
    const modRole = roles.find(r => 
      r.name.toLowerCase().includes('mod') || 
      r.name.toLowerCase().includes('staff') ||
      (r.permissions.has('ManageMessages') && !r.permissions.has('Administrator'))
    );
    if (modRole) {
      suggestions.push({
        type: 'role',
        priority: 'medium',
        title: 'Configure Moderator Role',
        description: 'Set up the moderator role for content management',
        suggestion: `Use @${modRole.name} as your moderator role`,
        action: {
          type: 'set_role',
          field: 'roles.moderator',
          value: modRole.id,
          roleName: modRole.name
        }
      });
    }
  }
  
  // Feature suggestions
  if (!config.features?.leveling?.enabled) {
    suggestions.push({
      type: 'feature',
      priority: 'medium',
      title: 'Enable Leveling System',
      description: 'Engage your community with XP and levels',
      suggestion: 'Enable the leveling system to reward active members',
      action: {
        type: 'enable_feature',
        feature: 'leveling'
      }
    });
  }
  
  if (!config.features?.economy?.enabled) {
    suggestions.push({
      type: 'feature',
      priority: 'low',
      title: 'Enable Economy System',
      description: 'Add virtual currency and rewards',
      suggestion: 'Enable the economy system for daily rewards and activities',
      action: {
        type: 'enable_feature',
        feature: 'economy'
      }
    });
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Validate full configuration
 */
async function validateFullConfig(client, guildId, config) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    sections: {}
  };
  
  if (!client) {
    validation.warnings.push('Bot client not available - cannot validate against Discord API');
    return validation;
  }
  
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    validation.errors.push('Guild not found or bot not in guild');
    validation.isValid = false;
    return validation;
  }
  
  // Validate each section
  const sections = ['channels', 'roles', 'features'];
  for (const section of sections) {
    validation.sections[section] = await validateConfigSection(client, guildId, section, config[section]);
    if (!validation.sections[section].isValid) {
      validation.isValid = false;
      validation.errors.push(...validation.sections[section].errors);
    }
    validation.warnings.push(...validation.sections[section].warnings);
  }
  
  return validation;
}

/**
 * Validate specific configuration section
 */
async function validateConfigSection(client, guildId, section, sectionConfig) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!client || !sectionConfig) {
    return validation;
  }
  
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    validation.errors.push('Guild not found');
    validation.isValid = false;
    return validation;
  }
  
  switch (section) {
    case 'channels':
      for (const [key, channelId] of Object.entries(sectionConfig)) {
        if (channelId && !guild.channels.cache.has(channelId)) {
          validation.errors.push(`Channel ${key} (${channelId}) not found in guild`);
          validation.isValid = false;
        }
      }
      break;
      
    case 'roles':
      for (const [key, roleId] of Object.entries(sectionConfig)) {
        if (roleId && !guild.roles.cache.has(roleId)) {
          validation.errors.push(`Role ${key} (${roleId}) not found in guild`);
          validation.isValid = false;
        }
      }
      break;
      
    case 'features':
      // Validate feature dependencies
      if (sectionConfig.leveling?.enabled && !sectionConfig.economy?.enabled) {
        validation.warnings.push('Leveling system works better with economy system enabled');
      }
      break;
  }
  
  return validation;
}

/**
 * Analyze changes by section
 */
function analyzeChangesBySection(changeHistory) {
  const sections = {};
  changeHistory.forEach(change => {
    const section = change.metadata?.section || 'unknown';
    sections[section] = (sections[section] || 0) + 1;
  });
  return sections;
}

/**
 * Analyze changes by user
 */
function analyzeChangesByUser(changeHistory) {
  const users = {};
  changeHistory.forEach(change => {
    const userId = change.userId || 'unknown';
    users[userId] = (users[userId] || 0) + 1;
  });
  return users;
}

/**
 * Analyze changes by time
 */
function analyzeChangesByTime(changeHistory, timeRange) {
  const timeSlots = {};
  const now = Date.now();
  const slotSize = getTimeSlotSize(timeRange);
  
  changeHistory.forEach(change => {
    const changeTime = new Date(change.timestamp).getTime();
    const slot = Math.floor((now - changeTime) / slotSize);
    timeSlots[slot] = (timeSlots[slot] || 0) + 1;
  });
  
  return timeSlots;
}

/**
 * Analyze most active features
 */
function analyzeMostActiveFeatures(changeHistory) {
  const features = {};
  changeHistory.forEach(change => {
    if (change.metadata?.updates) {
      Object.keys(change.metadata.updates).forEach(key => {
        if (key.startsWith('features.')) {
          const feature = key.split('.')[1];
          features[feature] = (features[feature] || 0) + 1;
        }
      });
    }
  });
  return features;
}

/**
 * Analyze configuration health
 */
async function analyzeConfigurationHealth(guildId) {
  const config = await configSync.getConfig(guildId);
  
  const health = {
    score: 0,
    maxScore: 100,
    issues: [],
    recommendations: []
  };
  
  // Check essential configurations (40 points)
  let essentialScore = 0;
  const essentialConfigs = [
    { key: 'channels.welcome', points: 10, name: 'Welcome Channel' },
    { key: 'roles.admin', points: 10, name: 'Admin Role' },
    { key: 'roles.moderator', points: 10, name: 'Moderator Role' },
    { key: 'features.leveling.enabled', points: 10, name: 'Leveling System' }
  ];
  
  essentialConfigs.forEach(item => {
    const value = getNestedValue(config, item.key);
    if (value) {
      essentialScore += item.points;
    } else {
      health.issues.push(`Missing ${item.name}`);
      health.recommendations.push(`Configure ${item.name} for better functionality`);
    }
  });
  
  // Check feature completeness (30 points)
  let featureScore = 0;
  const features = config.features || {};
  const totalFeatures = Object.keys(features).length;
  const enabledFeatures = Object.values(features).filter(f => f.enabled).length;
  
  if (totalFeatures > 0) {
    featureScore = Math.round((enabledFeatures / totalFeatures) * 30);
  }
  
  // Check customization (30 points)
  let customizationScore = 0;
  const customizations = [
    { key: 'colors.primary', points: 5, name: 'Primary Color' },
    { key: 'emojis', points: 5, name: 'Custom Emojis' },
    { key: 'images', points: 5, name: 'Custom Images' },
    { key: 'language.default', points: 5, name: 'Language Setting' },
    { key: 'prefix', points: 10, name: 'Custom Prefix' }
  ];
  
  customizations.forEach(item => {
    const value = getNestedValue(config, item.key);
    if (value && (typeof value !== 'object' || Object.keys(value).length > 0)) {
      customizationScore += item.points;
    }
  });
  
  health.score = essentialScore + featureScore + customizationScore;
  
  // Add performance recommendations
  if (health.score < 50) {
    health.recommendations.push('Complete basic configuration to improve bot functionality');
  }
  if (enabledFeatures < 3) {
    health.recommendations.push('Enable more features to engage your community');
  }
  if (customizationScore < 15) {
    health.recommendations.push('Customize colors and emojis to match your server theme');
  }
  
  return health;
}

/**
 * Get nested object value by dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get time range start timestamp
 */
function getTimeRangeStart(timeRange) {
  const now = Date.now();
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return new Date(now - (ranges[timeRange] || ranges['7d']));
}

/**
 * Get time slot size for analytics
 */
function getTimeSlotSize(timeRange) {
  const slots = {
    '1h': 5 * 60 * 1000, // 5 minutes
    '24h': 60 * 60 * 1000, // 1 hour
    '7d': 24 * 60 * 60 * 1000, // 1 day
    '30d': 7 * 24 * 60 * 60 * 1000 // 1 week
  };
  return slots[timeRange] || slots['7d'];
}

module.exports = {
  getDashboardOverview,
  getConfigurationAnalytics,
  getBotIntegrationStatus,
  validateConfiguration,
  getConfigurationSuggestions
};