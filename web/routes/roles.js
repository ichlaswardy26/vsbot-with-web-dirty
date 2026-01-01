/**
 * Roles API Routes
 * Manage Discord role configurations with hierarchy validation
 */

const express = require('express');
const router = express.Router();
const configSync = require('../../util/configSync');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId } = require('../middleware/validation');

/**
 * GET /api/roles/:guildId
 * Get available roles for a guild
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
    
    // Get bot's highest role for hierarchy checking
    const botMember = guild.members.cache.get(client.user.id);
    const botHighestRole = botMember?.roles.highest;
    
    // Get all roles
    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id) // Exclude @everyone
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray(),
        manageable: botHighestRole ? role.position < botHighestRole.position : false,
        isAdmin: role.permissions.has('Administrator'),
        memberCount: role.members.size
      }))
      .sort((a, b) => b.position - a.position);
    
    res.json({
      success: true,
      data: {
        roles,
        total: roles.length,
        botHighestRole: botHighestRole ? {
          id: botHighestRole.id,
          name: botHighestRole.name,
          position: botHighestRole.position
        } : null
      }
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get roles'
    });
  }
});

/**
 * GET /api/roles/:guildId/config
 * Get current role configuration
 */
router.get('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configSync.getConfig(guildId);
    
    res.json({
      success: true,
      data: config.roles || {}
    });
  } catch (error) {
    console.error('Error getting role config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get role configuration'
    });
  }
});

/**
 * PUT /api/roles/:guildId/config
 * Update role configuration
 */
router.put('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = { roles: req.body };
    const userId = req.user.id;
    
    const updatedConfig = await configSync.updateConfig(guildId, updates, {
      userId,
      source: 'dashboard_roles',
      validateWithBot: true,
      broadcastUpdate: true
    });
    
    res.json({
      success: true,
      data: updatedConfig.roles,
      message: 'Role configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating role config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update role configuration'
    });
  }
});

/**
 * GET /api/roles/:guildId/hierarchy
 * Get role hierarchy information
 */
router.get('/:guildId/hierarchy', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
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
    
    const botMember = guild.members.cache.get(client.user.id);
    const botHighestRole = botMember?.roles.highest;
    
    const hierarchy = {
      botCanManage: [],
      botCannotManage: [],
      botRole: botHighestRole ? {
        id: botHighestRole.id,
        name: botHighestRole.name,
        position: botHighestRole.position
      } : null
    };
    
    guild.roles.cache
      .filter(role => role.id !== guild.id)
      .forEach(role => {
        const roleData = {
          id: role.id,
          name: role.name,
          position: role.position,
          color: role.hexColor
        };
        
        if (botHighestRole && role.position < botHighestRole.position) {
          hierarchy.botCanManage.push(roleData);
        } else {
          hierarchy.botCannotManage.push(roleData);
        }
      });
    
    // Sort by position (highest first)
    hierarchy.botCanManage.sort((a, b) => b.position - a.position);
    hierarchy.botCannotManage.sort((a, b) => b.position - a.position);
    
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error getting role hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get role hierarchy'
    });
  }
});

module.exports = router;