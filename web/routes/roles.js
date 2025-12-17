/**
 * Roles Configuration API Routes
 * Provides endpoints for role configuration with Discord API integration
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

const express = require('express');
const router = express.Router();
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId, sanitizeInput } = require('../middleware/validation');
const { discordApiService } = require('../services/discordApi');
const configManager = require('../../util/configManager');

/**
 * Role categories for organization
 * Requirements: 3.1
 */
const ROLE_CATEGORIES = {
  level: {
    name: 'Level Roles',
    description: 'Roles awarded at specific levels',
    roles: [
      { key: 'level.5', name: 'Level 5 Role', level: 5 },
      { key: 'level.10', name: 'Level 10 Role', level: 10 },
      { key: 'level.15', name: 'Level 15 Role', level: 15 },
      { key: 'level.20', name: 'Level 20 Role', level: 20 },
      { key: 'level.25', name: 'Level 25 Role', level: 25 },
      { key: 'level.30', name: 'Level 30 Role', level: 30 },
      { key: 'level.40', name: 'Level 40 Role', level: 40 },
      { key: 'level.50', name: 'Level 50 Role', level: 50 },
      { key: 'level.60', name: 'Level 60 Role', level: 60 },
      { key: 'level.70', name: 'Level 70 Role', level: 70 },
      { key: 'level.80', name: 'Level 80 Role', level: 80 },
      { key: 'level.90', name: 'Level 90 Role', level: 90 },
      { key: 'level.100', name: 'Level 100 Role', level: 100 }
    ]
  },
  staff: {
    name: 'Staff Roles',
    description: 'Roles for server staff and moderators',
    roles: [
      { key: 'staff.admin', name: 'Admin Role', permissions: ['Administrator'] },
      { key: 'staff.moderator', name: 'Moderator Role', permissions: ['ModerateMembers', 'KickMembers', 'BanMembers'] },
      { key: 'staff.helper', name: 'Helper Role', permissions: ['ManageMessages'] },
      { key: 'staff.support', name: 'Support Role', permissions: [] }
    ]
  },
  special: {
    name: 'Special Roles',
    description: 'Special purpose roles',
    roles: [
      { key: 'special.booster', name: 'Server Booster Role' },
      { key: 'special.vip', name: 'VIP Role' },
      { key: 'special.premium', name: 'Premium Role' },
      { key: 'special.muted', name: 'Muted Role' },
      { key: 'special.verified', name: 'Verified Role' }
    ]
  },
  autoRole: {
    name: 'Auto Roles',
    description: 'Roles automatically assigned to new members',
    roles: [
      { key: 'autoRole.member', name: 'Member Role' },
      { key: 'autoRole.unverified', name: 'Unverified Role' }
    ]
  }
};

/**
 * Role display names for UI
 */
const ROLE_DISPLAY_NAMES = {};
Object.values(ROLE_CATEGORIES).forEach(category => {
  category.roles.forEach(role => {
    ROLE_DISPLAY_NAMES[role.key] = role.name;
  });
});


/**
 * GET /api/roles/:guildId
 * Get all guild roles from Discord API
 * Requirements: 3.1
 */
router.get('/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Get roles from Discord API
    const roles = await discordApiService.getGuildRoles(guildId);
    
    if (!roles || roles.length === 0) {
      return res.json({
        success: true,
        data: {
          roles: [],
          apiConnected: discordApiService.isConnected()
        }
      });
    }
    
    // Get bot permissions to determine manageable roles
    const botPermissions = await discordApiService.getBotPermissions(guildId);
    const botHighestPosition = botPermissions.highestRole ? botPermissions.highestRole.position : 0;
    
    // Mark roles that can be managed by the bot
    const rolesWithManageability = roles.map(role => ({
      ...role,
      canManage: role.position < botHighestPosition && !role.managed
    }));
    
    res.json({
      success: true,
      data: {
        roles: rolesWithManageability,
        botHighestRole: botPermissions.highestRole,
        apiConnected: true
      }
    });
  } catch (error) {
    console.error('Error getting guild roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get guild roles',
      apiConnected: discordApiService.isConnected()
    });
  }
});

/**
 * GET /api/roles/:guildId/config
 * Get current role configuration
 * Requirements: 3.1
 */
router.get('/:guildId/config', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configManager.getConfigSection(guildId, 'roles');
    
    res.json({
      success: true,
      data: {
        config: config || {},
        categories: ROLE_CATEGORIES,
        displayNames: ROLE_DISPLAY_NAMES
      }
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
 * POST /api/roles/:guildId/validate
 * Validate a role ID exists in the guild
 * Requirements: 3.2, 3.3
 */
router.post('/:guildId/validate', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { roleId, roleType, level, requiredPermissions } = req.body;
    
    if (!roleId) {
      return res.json({
        success: true,
        data: { valid: true, exists: false, message: 'No role selected' }
      });
    }
    
    // Validate role ID format
    if (!/^[0-9]{17,19}$/.test(roleId)) {
      return res.json({
        success: true,
        data: {
          valid: false,
          exists: false,
          error: 'Invalid role ID format'
        }
      });
    }
    
    // Verify role exists in guild
    const result = await discordApiService.verifyRole(guildId, roleId);
    
    if (!result.valid) {
      return res.json({
        success: true,
        data: result
      });
    }
    
    // Additional validation based on role type
    if (roleType === 'level' && level) {
      const hierarchyResult = await discordApiService.validateRoleHierarchy(guildId, roleId, level);
      if (!hierarchyResult.valid) {
        return res.json({
          success: true,
          data: hierarchyResult
        });
      }
    }
    
    if (roleType === 'staff' && requiredPermissions && requiredPermissions.length > 0) {
      const staffResult = await discordApiService.verifyStaffRole(guildId, roleId, requiredPermissions);
      if (!staffResult.valid) {
        return res.json({
          success: true,
          data: staffResult
        });
      }
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate role'
    });
  }
});

/**
 * POST /api/roles/:guildId/validate-hierarchy
 * Validate role hierarchy for level tier assignment
 * Requirements: 3.2
 */
router.post('/:guildId/validate-hierarchy', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { roleId, level } = req.body;
    
    const result = await discordApiService.validateRoleHierarchy(guildId, roleId, level);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating role hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate role hierarchy'
    });
  }
});

/**
 * POST /api/roles/:guildId/verify-staff
 * Verify staff role has appropriate permissions
 * Requirements: 3.3
 */
router.post('/:guildId/verify-staff', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { roleId, requiredPermissions } = req.body;
    
    const result = await discordApiService.verifyStaffRole(guildId, roleId, requiredPermissions || []);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error verifying staff role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify staff role'
    });
  }
});

/**
 * POST /api/roles/:guildId/detect-conflicts
 * Detect role conflicts in configuration
 * Requirements: 3.5
 */
router.post('/:guildId/detect-conflicts', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const roleConfig = req.body;
    
    const result = await discordApiService.detectRoleConflicts(guildId, roleConfig);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error detecting role conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect role conflicts'
    });
  }
});

/**
 * PUT /api/roles/:guildId/config
 * Update role configuration
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
router.put('/:guildId/config', validateGuildId, sanitizeInput, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    const validationErrors = [];
    const validationWarnings = [];
    
    // Validate all role IDs before saving
    for (const [key, value] of Object.entries(flattenObject(updates))) {
      if (value && typeof value === 'string' && /^[0-9]{17,19}$/.test(value)) {
        const result = await discordApiService.verifyRole(guildId, value);
        if (!result.valid) {
          if (result.apiConnected === false) {
            validationWarnings.push(`Could not verify ${key}: Discord API not connected`);
          } else {
            validationErrors.push(`Invalid role for ${key}: ${result.error}`);
          }
        }
      }
    }
    
    // Detect role conflicts
    const conflictResult = await discordApiService.detectRoleConflicts(guildId, unflattenObject(updates));
    if (conflictResult.hasConflicts) {
      conflictResult.conflicts.forEach(conflict => {
        validationErrors.push(conflict.message);
      });
    }
    if (conflictResult.warnings) {
      conflictResult.warnings.forEach(warning => {
        validationWarnings.push(warning.message);
      });
    }
    
    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Role validation failed',
        details: validationErrors,
        warnings: validationWarnings
      });
    }
    
    // Update configuration
    const config = await configManager.updateConfigSection(guildId, 'roles', updates, userId);
    
    res.json({
      success: true,
      data: config,
      message: 'Role configuration updated successfully',
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined
    });
  } catch (error) {
    console.error('Error updating role config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role configuration'
    });
  }
});

/**
 * DELETE /api/roles/:guildId/config/:roleKey
 * Clear a specific role configuration
 * Requirements: 3.4
 */
router.delete('/:guildId/config/:roleKey', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId, roleKey } = req.params;
    const userId = req.user.id;
    
    // Get current config
    const currentConfig = await configManager.getConfigSection(guildId, 'roles');
    
    // Clear the specified role
    const updates = setNestedValue({ ...currentConfig }, roleKey, null);
    
    // Update configuration
    const config = await configManager.updateConfigSection(guildId, 'roles', updates, userId);
    
    res.json({
      success: true,
      data: config,
      message: `Role ${roleKey} cleared successfully`
    });
  } catch (error) {
    console.error('Error clearing role config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear role configuration'
    });
  }
});

/**
 * GET /api/roles/:guildId/categories
 * Get role category definitions
 * Requirements: 3.1
 */
router.get('/:guildId/categories', validateGuildId, verifyAuth, verifyGuildAccess, (req, res) => {
  res.json({
    success: true,
    data: {
      categories: ROLE_CATEGORIES,
      displayNames: ROLE_DISPLAY_NAMES
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
 * Helper function to unflatten object from dot notation
 */
function unflattenObject(obj) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    setNestedValue(result, key, value);
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
