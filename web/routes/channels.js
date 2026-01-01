/**
 * Channels API Routes
 * Manage Discord channel configurations with real-time validation
 */

const express = require('express');
const router = express.Router();
const configSync = require('../../util/configSync');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId } = require('../middleware/validation');

/**
 * GET /api/channels/:guildId
 * Get available channels for a guild
 */
router.get('/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'Bot client not available'
      });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }
    
    // Get all channels
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0 || channel.type === 2) // TEXT or VOICE
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type === 0 ? 'text' : 'voice',
        category: channel.parent?.name || 'No Category',
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);
    
    res.json({
      success: true,
      data: {
        channels,
        total: channels.length
      }
    });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channels'
    });
  }
});

/**
 * GET /api/channels/:guildId/config
 * Get current channel configuration
 */
router.get('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configSync.getConfig(guildId);
    
    res.json({
      success: true,
      data: config.channels || {}
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
 * PUT /api/channels/:guildId/config
 * Update channel configuration
 */
router.put('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = { channels: req.body };
    const userId = req.user.id;
    
    const updatedConfig = await configSync.updateConfig(guildId, updates, {
      userId,
      source: 'dashboard_channels',
      validateWithBot: true,
      broadcastUpdate: true
    });
    
    res.json({
      success: true,
      data: updatedConfig.channels,
      message: 'Channel configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating channel config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update channel configuration'
    });
  }
});

module.exports = router;