/**
 * Discord API Integration Layer
 * Provides validation and verification functions for Discord entities
 * with rate limiting support
 */

const { RateLimiter } = require('../middleware/rateLimiter');

/**
 * Discord API Rate Limiter for external API calls
 */
class DiscordApiRateLimiter {
  constructor() {
    this.requests = new Map();
    this.globalRateLimit = {
      remaining: 50,
      resetAt: Date.now() + 1000
    };
  }

  /**
   * Check if we can make a request
   * @param {string} endpoint - API endpoint
   * @returns {boolean} Whether request is allowed
   */
  canMakeRequest(endpoint) {
    const now = Date.now();
    
    // Check global rate limit
    if (this.globalRateLimit.remaining <= 0 && now < this.globalRateLimit.resetAt) {
      return false;
    }

    // Check endpoint-specific rate limit
    const endpointLimit = this.requests.get(endpoint);
    if (endpointLimit && endpointLimit.remaining <= 0 && now < endpointLimit.resetAt) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   * @param {string} endpoint - API endpoint
   * @param {Object} headers - Response headers with rate limit info
   */
  recordRequest(endpoint, headers = {}) {
    const now = Date.now();

    // Update global rate limit
    if (headers['x-ratelimit-global']) {
      this.globalRateLimit.remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
      this.globalRateLimit.resetAt = now + parseInt(headers['x-ratelimit-reset-after'] || '1') * 1000;
    }

    // Update endpoint-specific rate limit
    if (headers['x-ratelimit-remaining'] !== undefined) {
      this.requests.set(endpoint, {
        remaining: parseInt(headers['x-ratelimit-remaining']),
        resetAt: now + parseInt(headers['x-ratelimit-reset-after'] || '1') * 1000
      });
    }
  }

  /**
   * Get wait time until next request is allowed
   * @param {string} endpoint - API endpoint
   * @returns {number} Milliseconds to wait
   */
  getWaitTime(endpoint) {
    const now = Date.now();
    
    if (this.globalRateLimit.remaining <= 0 && now < this.globalRateLimit.resetAt) {
      return this.globalRateLimit.resetAt - now;
    }

    const endpointLimit = this.requests.get(endpoint);
    if (endpointLimit && endpointLimit.remaining <= 0 && now < endpointLimit.resetAt) {
      return endpointLimit.resetAt - now;
    }

    return 0;
  }

  /**
   * Clear rate limit data
   */
  clear() {
    this.requests.clear();
    this.globalRateLimit = {
      remaining: 50,
      resetAt: Date.now() + 1000
    };
  }
}

/**
 * Discord API Service
 * Handles all Discord API interactions with rate limiting
 */
class DiscordApiService {
  constructor(client = null) {
    this.client = client;
    this.rateLimiter = new DiscordApiRateLimiter();
    this.apiConnected = false;
  }

  /**
   * Set the Discord client
   * @param {Object} client - Discord.js client
   */
  setClient(client) {
    this.client = client;
    this.apiConnected = client && client.isReady();
  }

  /**
   * Check if Discord API is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    // Update connection status
    this.apiConnected = this.client && this.client.isReady && this.client.isReady();
    return this.apiConnected;
  }

  /**
   * Get API connectivity status
   * @returns {Object} Status object with details
   */
  getConnectivityStatus() {
    return {
      connected: this.isConnected(),
      clientReady: this.client ? this.client.isReady() : false,
      apiConnected: this.apiConnected,
      rateLimitStatus: {
        globalRemaining: this.rateLimiter.globalRateLimit.remaining,
        globalResetAt: this.rateLimiter.globalRateLimit.resetAt
      }
    };
  }

  // ==================== GUILD OPERATIONS ====================

  /**
   * Get guild by ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object|null>} Guild object or null
   */
  async getGuild(guildId) {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return null;
      }

      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId
      };
    } catch (error) {
      console.error('Error getting guild:', error);
      return null;
    }
  }

  // ==================== CHANNEL OPERATIONS ====================

  /**
   * Verify channel exists in guild
   * @param {string} guildId - Discord guild ID
   * @param {string} channelId - Discord channel ID
   * @returns {Promise<Object>} Validation result
   */
  async verifyChannel(guildId, channelId) {
    if (!this.isConnected()) {
      return {
        valid: false,
        exists: false,
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          valid: false,
          exists: false,
          error: 'Guild not found'
        };
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return {
          valid: false,
          exists: false,
          error: 'Channel not found in guild'
        };
      }

      return {
        valid: true,
        exists: true,
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          parentId: channel.parentId
        }
      };
    } catch (error) {
      console.error('Error verifying channel:', error);
      return {
        valid: false,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Get all channels in a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Array>} Array of channels
   */
  async getGuildChannels(guildId) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return [];
      }

      return guild.channels.cache.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        position: channel.position
      }));
    } catch (error) {
      console.error('Error getting guild channels:', error);
      return [];
    }
  }

  // ==================== ROLE OPERATIONS ====================

  /**
   * Verify role exists in guild
   * @param {string} guildId - Discord guild ID
   * @param {string} roleId - Discord role ID
   * @returns {Promise<Object>} Validation result
   */
  async verifyRole(guildId, roleId) {
    if (!this.isConnected()) {
      return {
        valid: false,
        exists: false,
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          valid: false,
          exists: false,
          error: 'Guild not found'
        };
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return {
          valid: false,
          exists: false,
          error: 'Role not found in guild'
        };
      }

      return {
        valid: true,
        exists: true,
        role: {
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          managed: role.managed,
          mentionable: role.mentionable
        }
      };
    } catch (error) {
      console.error('Error verifying role:', error);
      return {
        valid: false,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Get all roles in a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Array>} Array of roles
   */
  async getGuildRoles(guildId) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return [];
      }

      return guild.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        managed: role.managed,
        mentionable: role.mentionable
      })).sort((a, b) => b.position - a.position);
    } catch (error) {
      console.error('Error getting guild roles:', error);
      return [];
    }
  }

  /**
   * Validate role hierarchy for level tier assignment
   * @param {string} guildId - Discord guild ID
   * @param {string} roleId - Role to validate
   * @param {number} level - Level tier for the role
   * @returns {Promise<Object>} Validation result
   */
  async validateRoleHierarchy(guildId, roleId, level) {
    if (!this.isConnected()) {
      return {
        valid: false,
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          valid: false,
          error: 'Guild not found'
        };
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return {
          valid: false,
          error: 'Role not found in guild'
        };
      }

      // Get bot's highest role position
      const botMember = guild.members.cache.get(this.client.user.id);
      if (!botMember) {
        return {
          valid: false,
          error: 'Bot not found in guild'
        };
      }

      const botHighestRole = botMember.roles.highest;

      // Check if bot can manage this role (role must be below bot's highest role)
      if (role.position >= botHighestRole.position) {
        return {
          valid: false,
          error: 'Bot cannot manage this role - role is higher than or equal to bot\'s highest role',
          suggestion: 'Move the bot\'s role higher in the role hierarchy or choose a lower role'
        };
      }

      // Check if role is managed (integration roles can't be assigned)
      if (role.managed) {
        return {
          valid: false,
          error: 'Cannot assign managed roles (bot/integration roles)',
          suggestion: 'Choose a regular role that is not managed by an integration'
        };
      }

      return {
        valid: true,
        role: {
          id: role.id,
          name: role.name,
          position: role.position,
          canManage: true
        },
        level
      };
    } catch (error) {
      console.error('Error validating role hierarchy:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify staff role has appropriate permissions
   * @param {string} guildId - Discord guild ID
   * @param {string} roleId - Role to verify
   * @param {Array<string>} requiredPermissions - Required permission flags
   * @returns {Promise<Object>} Verification result
   */
  async verifyStaffRole(guildId, roleId, requiredPermissions = []) {
    if (!this.isConnected()) {
      return {
        valid: false,
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          valid: false,
          error: 'Guild not found'
        };
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return {
          valid: false,
          exists: false,
          error: 'Role not found in guild'
        };
      }

      // Check required permissions
      const missingPermissions = [];
      for (const perm of requiredPermissions) {
        if (!role.permissions.has(perm)) {
          missingPermissions.push(perm);
        }
      }

      if (missingPermissions.length > 0) {
        return {
          valid: false,
          exists: true,
          error: 'Role is missing required permissions',
          missingPermissions,
          suggestion: `Add the following permissions to the role: ${missingPermissions.join(', ')}`
        };
      }

      return {
        valid: true,
        exists: true,
        role: {
          id: role.id,
          name: role.name,
          permissions: role.permissions.toArray()
        }
      };
    } catch (error) {
      console.error('Error verifying staff role:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Detect role conflicts in configuration
   * @param {string} guildId - Discord guild ID
   * @param {Object} roleConfig - Role configuration to check
   * @returns {Promise<Object>} Conflict detection result
   */
  async detectRoleConflicts(guildId, roleConfig) {
    if (!this.isConnected()) {
      return {
        hasConflicts: false,
        conflicts: [],
        warnings: [],
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          hasConflicts: false,
          conflicts: [],
          warnings: [],
          error: 'Guild not found'
        };
      }

      const conflicts = [];
      const warnings = [];
      const usedRoles = new Map(); // Track role usage

      // Check level roles for conflicts
      if (roleConfig.level) {
        for (const [level, roleId] of Object.entries(roleConfig.level)) {
          if (!roleId) continue;

          const role = guild.roles.cache.get(roleId);
          if (!role) {
            conflicts.push({
              type: 'missing_role',
              level,
              roleId,
              message: `Role ${roleId} for level ${level} does not exist`
            });
            continue;
          }

          // Check for duplicate role assignments
          if (usedRoles.has(roleId)) {
            conflicts.push({
              type: 'duplicate_role',
              roleId,
              roleName: role.name,
              levels: [usedRoles.get(roleId), level],
              message: `Role "${role.name}" is assigned to multiple levels`,
              suggestion: 'Each level should have a unique role'
            });
          } else {
            usedRoles.set(roleId, level);
          }

          // Check if role is managed
          if (role.managed) {
            warnings.push({
              type: 'managed_role',
              level,
              roleId,
              roleName: role.name,
              message: `Role "${role.name}" is managed by an integration and may not be assignable`
            });
          }
        }
      }

      // Check staff roles for conflicts with level roles
      if (roleConfig.staff) {
        for (const [staffType, roleId] of Object.entries(roleConfig.staff)) {
          if (!roleId) continue;

          if (usedRoles.has(roleId)) {
            const levelUsage = usedRoles.get(roleId);
            warnings.push({
              type: 'staff_level_overlap',
              staffType,
              roleId,
              level: levelUsage,
              message: `Staff role "${staffType}" uses the same role as level ${levelUsage}`,
              suggestion: 'Consider using separate roles for staff and level rewards'
            });
          }
        }
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings,
        totalIssues: conflicts.length + warnings.length
      };
    } catch (error) {
      console.error('Error detecting role conflicts:', error);
      return {
        hasConflicts: false,
        conflicts: [],
        warnings: [],
        error: error.message
      };
    }
  }

  // ==================== PERMISSION OPERATIONS ====================

  /**
   * Check user permissions in guild
   * @param {string} guildId - Discord guild ID
   * @param {string} userId - Discord user ID
   * @param {Array<string>} permissions - Permissions to check
   * @returns {Promise<Object>} Permission check result
   */
  async checkUserPermissions(guildId, userId, permissions = []) {
    if (!this.isConnected()) {
      return {
        hasPermissions: false,
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          hasPermissions: false,
          error: 'Guild not found'
        };
      }

      const member = guild.members.cache.get(userId);
      if (!member) {
        // Try to fetch the member
        try {
          await guild.members.fetch(userId);
        } catch {
          return {
            hasPermissions: false,
            error: 'User not found in guild'
          };
        }
      }

      const memberPermissions = member ? member.permissions : null;
      if (!memberPermissions) {
        return {
          hasPermissions: false,
          error: 'Could not get user permissions'
        };
      }

      // Check if user is admin (has all permissions)
      if (memberPermissions.has('Administrator')) {
        return {
          hasPermissions: true,
          isAdmin: true,
          permissions: permissions.reduce((acc, p) => ({ ...acc, [p]: true }), {})
        };
      }

      // Check specific permissions
      const permissionResults = {};
      let hasAll = true;
      for (const perm of permissions) {
        const hasPerm = memberPermissions.has(perm);
        permissionResults[perm] = hasPerm;
        if (!hasPerm) hasAll = false;
      }

      return {
        hasPermissions: hasAll,
        isAdmin: false,
        permissions: permissionResults
      };
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return {
        hasPermissions: false,
        error: error.message
      };
    }
  }

  /**
   * Get bot permissions in guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Bot permissions
   */
  async getBotPermissions(guildId) {
    if (!this.isConnected()) {
      return {
        permissions: [],
        error: 'Discord API not connected',
        apiConnected: false
      };
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return {
          permissions: [],
          error: 'Guild not found'
        };
      }

      const botMember = guild.members.cache.get(this.client.user.id);
      if (!botMember) {
        return {
          permissions: [],
          error: 'Bot not found in guild'
        };
      }

      return {
        permissions: botMember.permissions.toArray(),
        isAdmin: botMember.permissions.has('Administrator'),
        highestRole: {
          id: botMember.roles.highest.id,
          name: botMember.roles.highest.name,
          position: botMember.roles.highest.position
        }
      };
    } catch (error) {
      console.error('Error getting bot permissions:', error);
      return {
        permissions: [],
        error: error.message
      };
    }
  }
}

// Create singleton instance
const discordApiService = new DiscordApiService();

module.exports = {
  DiscordApiService,
  DiscordApiRateLimiter,
  discordApiService
};
