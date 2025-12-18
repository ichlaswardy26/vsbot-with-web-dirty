/**
 * Channels Configuration API Routes
 * Provides endpoints for channel configuration with Discord API integration
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

const express = require('express');
const router = express.Router();
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId, sanitizeInput } = require('../middleware/validation');
const { discordApiService } = require('../services/discordApi');
const configManager = require('../../util/configManager');

/**
 * Channel categories for organization
 * Requirements: 2.1
 */
const CHANNEL_CATEGORIES = {
  welcome: {
    name: 'Welcome & Goodbye',
    description: 'Channels for welcome messages and member logs',
    channels: ['welcome', 'welcome2', 'welcomeLog']
  },
  boost: {
    name: 'Server Boost',
    description: 'Channels for boost announcements and logs',
    channels: ['boostAnnounce', 'boostLogs']
  },
  ticket: {
    name: 'Ticket System',
    description: 'Channels for ticket logs',
    channels: ['ticketLogs']
  },
  confession: {
    name: 'Confession System',
    description: 'Channels for confessions and logs',
    channels: ['confession', 'confessionLog']
  },
  customRole: {
    name: 'Custom Roles',
    description: 'Channels for custom role logs',
    channels: ['customRoleLogs']
  },
  general: {
    name: 'General Channels',
    description: 'Introduction, donation, and support channels',
    channels: ['intro', 'donation', 'support']
  },
  chat: {
    name: 'Chat Channels',
    description: 'General chat channels',
    channels: ['chat.channel1', 'chat.channel2', 'chat.channel3', 'chat.channel4', 'chat.channel5']
  },
  rules: {
    name: 'Rules & Announcements',
    description: 'Rules and announcement channels',
    channels: ['rules.channel1', 'rules.channel2', 'rules.channel3', 'rules.channel4', 'rules.announcement']
  },
  giveaway: {
    name: 'Giveaway Channels',
    description: 'Channels for giveaways and winners',
    channels: ['giveaway.channel1', 'giveaway.channel2', 'giveaway.channel3', 'giveaway.channel4', 'giveaway.winner']
  },
  premium: {
    name: 'Premium Channels',
    description: 'Premium member channels',
    channels: ['premium.channel1', 'premium.channel2', 'premium.channel3', 'premium.benefit', 'premium.boosterRequest']
  },
  voice: {
    name: 'Voice System',
    description: 'Voice channel configuration',
    channels: ['voice.joinToCreate', 'voice.logs']
  }
};

/**
 * Channel display names for UI
 */
const CHANNEL_DISPLAY_NAMES = {
  welcome: 'Welcome Channel',
  welcome2: 'Secondary Welcome',
  welcomeLog: 'Welcome Logs',
  boostAnnounce: 'Boost Announcements',
  boostLogs: 'Boost Logs',
  ticketLogs: 'Ticket Logs',
  confession: 'Confession Channel',
  confessionLog: 'Confession Logs',
  customRoleLogs: 'Custom Role Logs',
  intro: 'Introduction Channel',
  donation: 'Donation Channel',
  support: 'Support Channel',
  'chat.channel1': 'Chat Channel 1',
  'chat.channel2': 'Chat Channel 2',
  'chat.channel3': 'Chat Channel 3',
  'chat.channel4': 'Chat Channel 4',
  'chat.channel5': 'Chat Channel 5',
  'rules.channel1': 'Rules Channel 1',
  'rules.channel2': 'Rules Channel 2',
  'rules.channel3': 'Rules Channel 3',
  'rules.channel4': 'Rules Channel 4',
  'rules.announcement': 'Announcements',
  'giveaway.channel1': 'Giveaway Channel 1',
  'giveaway.channel2': 'Giveaway Channel 2',
  'giveaway.channel3': 'Giveaway Channel 3',
  'giveaway.channel4': 'Giveaway Channel 4',
  'giveaway.winner': 'Giveaway Winners',
  'premium.channel1': 'Premium Channel 1',
  'premium.channel2': 'Premium Channel 2',
  'premium.channel3': 'Premium Channel 3',
  'premium.benefit': 'Premium Benefits',
  'premium.boosterRequest': 'Booster Requests',
  'voice.joinToCreate': 'Join to Create',
  'voice.logs': 'Voice Logs'
};

/**
 * GET /api/channels/:guildId
 * Get all guild channels from Discord API
 * Requirements: 2.1
 */
router.get('/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Get channels from Discord API
    const channels = await discordApiService.getGuildChannels(guildId);
    
    // Check if API is connected
    const apiConnected = discordApiService.isConnected();
    console.log(`[Channels API] Guild ${guildId}: apiConnected=${apiConnected}, channels=${channels?.length || 0}`);
    
    if (!channels || channels.length === 0) {
      return res.json({
        success: true,
        data: [],
        apiConnected: apiConnected
      });
    }
    
    // Organize channels by type and category
    const textChannels = channels.filter(c => c.type === 0); // GUILD_TEXT
    const voiceChannels = channels.filter(c => c.type === 2); // GUILD_VOICE
    const categoryChannels = channels.filter(c => c.type === 4); // GUILD_CATEGORY
    
    // Group text channels by their parent category
    const channelsByCategory = {};
    categoryChannels.forEach(cat => {
      channelsByCategory[cat.id] = {
        id: cat.id,
        name: cat.name,
        channels: textChannels.filter(c => c.parentId === cat.id)
          .sort((a, b) => a.position - b.position)
      };
    });
    
    // Channels without category
    const uncategorized = textChannels.filter(c => !c.parentId)
      .sort((a, b) => a.position - b.position);
    
    // Return all channels as flat array (channels-config.js expects this format)
    res.json({
      success: true,
      data: channels,
      apiConnected: true
    });
  } catch (error) {
    console.error('Error getting guild channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get guild channels',
      apiConnected: discordApiService.isConnected()
    });
  }
});

/**
 * GET /api/channels/:guildId/config
 * Get current channel configuration
 * Requirements: 2.1
 */
router.get('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configManager.getConfigSection(guildId, 'channels');
    
    res.json({
      success: true,
      data: {
        config,
        categories: CHANNEL_CATEGORIES,
        displayNames: CHANNEL_DISPLAY_NAMES
      }
    });
  } catch (error) {
    console.error('Error getting channel config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channel configuration'
    });
  }
});

/**
 * POST /api/channels/:guildId/validate
 * Validate a channel ID exists in the guild
 * Requirements: 2.2, 2.5
 */
router.post('/:guildId/validate', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.json({
        success: true,
        data: { valid: true, exists: false, message: 'No channel selected' }
      });
    }
    
    // Validate channel ID format
    if (!/^[0-9]{17,19}$/.test(channelId)) {
      return res.json({
        success: true,
        data: {
          valid: false,
          exists: false,
          error: 'Invalid channel ID format'
        }
      });
    }
    
    // Verify channel exists in guild
    const result = await discordApiService.verifyChannel(guildId, channelId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate channel'
    });
  }
});

/**
 * PUT /api/channels/:guildId/config
 * Update channel configuration
 * Requirements: 2.2, 2.3, 2.4
 */
router.put('/:guildId/config', validateGuildId, sanitizeInput, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    // Validate all channel IDs before saving
    const validationErrors = [];
    const validationWarnings = [];
    
    for (const [key, value] of Object.entries(flattenObject(updates))) {
      if (value && typeof value === 'string' && /^[0-9]{17,19}$/.test(value)) {
        const result = await discordApiService.verifyChannel(guildId, value);
        if (!result.valid) {
          if (result.apiConnected === false) {
            validationWarnings.push(`Could not verify ${key}: Discord API not connected`);
          } else {
            validationErrors.push(`Invalid channel for ${key}: ${result.error}`);
          }
        }
      }
    }
    
    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Channel validation failed',
        details: validationErrors,
        warnings: validationWarnings
      });
    }
    
    // Update configuration
    const config = await configManager.updateConfigSection(guildId, 'channels', updates, userId);
    
    res.json({
      success: true,
      data: config,
      message: 'Channel configuration updated successfully',
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined
    });
  } catch (error) {
    console.error('Error updating channel config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update channel configuration'
    });
  }
});

/**
 * DELETE /api/channels/:guildId/config/:channelKey
 * Clear a specific channel configuration
 * Requirements: 2.4
 */
router.delete('/:guildId/config/:channelKey', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId, channelKey } = req.params;
    const userId = req.user.id;
    
    // Get current config
    const currentConfig = await configManager.getConfigSection(guildId, 'channels');
    
    // Clear the specified channel
    const updates = setNestedValue({ ...currentConfig }, channelKey, null);
    
    // Update configuration
    const config = await configManager.updateConfigSection(guildId, 'channels', updates, userId);
    
    res.json({
      success: true,
      data: config,
      message: `Channel ${channelKey} cleared successfully`
    });
  } catch (error) {
    console.error('Error clearing channel config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear channel configuration'
    });
  }
});

/**
 * GET /api/channels/:guildId/categories
 * Get channel category definitions
 * Requirements: 2.1
 */
router.get('/:guildId/categories', validateGuildId, verifyAuth, verifyGuildAccess, (req, res) => {
  res.json({
    success: true,
    data: {
      categories: CHANNEL_CATEGORIES,
      displayNames: CHANNEL_DISPLAY_NAMES
    }
  });
});

/**
 * Helper function to flatten nested object
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Helper function to set nested value
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

module.exports = router;
