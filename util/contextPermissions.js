const logger = require('./logger');
const rolePermissions = require('./rolePermissions');

/**
 * Context-Based Permissions System
 * Allows setting permissions based on channel, category, or other contexts
 */

class ContextPermissions {
    constructor() {
        // Context permissions storage
        this.contextPermissions = new Map(); // contextId -> permissions config
        this.userOverrides = new Map(); // userId-contextId -> override config
        this.rolePermissions = new Map(); // roleId-contextId -> permissions array
        
        // Context types
        this.contextTypes = {
            'channel': 'Text/Voice Channel',
            'category': 'Channel Category',
            'thread': 'Thread',
            'voice': 'Voice Channel',
            'stage': 'Stage Channel'
        };
        
        // Cleanup interval for expired overrides
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredOverrides();
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Set context permissions for a channel/category
     * @param {string} contextId - Context ID (channel/category ID)
     * @param {string} contextType - Type of context
     * @param {Object} permissions - Permissions configuration
     * @param {string} setBy - User ID who set the permissions
     * @param {string} reason - Reason for setting permissions
     * @returns {Object} Result object
     */
    async setContextPermissions(contextId, contextType, permissions, setBy, reason = '') {
        try {
            // Validate permissions configuration
            const validation = this.validatePermissionsConfig(permissions);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const contextConfig = {
                contextId,
                contextType,
                permissions: permissions.permissions || {},
                restrictions: permissions.restrictions || {},
                settings: permissions.settings || {},
                setBy,
                setAt: Date.now(),
                reason
            };

            this.contextPermissions.set(contextId, contextConfig);

            // Log the change
            await logger.log('INFO', 'CONTEXT_PERMISSIONS', 
                `Context permissions set for ${contextType} ${contextId}`,
                { contextId, contextType, setBy, reason, permissions }
            );

            return { success: true, contextConfig };

        } catch (error) {
            await logger.logError(error, 'setting context permissions');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get context permissions for a context
     * @param {string} contextId - Context ID
     * @returns {Object|null} Context permissions or null
     */
    getContextPermissions(contextId) {
        return this.contextPermissions.get(contextId) || null;
    }

    /**
     * Remove context permissions
     * @param {string} contextId - Context ID
     * @param {string} removedBy - User ID who removed the permissions
     * @param {string} reason - Reason for removal
     * @returns {Object} Result object
     */
    async removeContextPermissions(contextId, removedBy, reason = '') {
        try {
            const existing = this.contextPermissions.get(contextId);
            if (!existing) {
                return { success: false, error: 'No context permissions found' };
            }

            this.contextPermissions.delete(contextId);

            // Also remove related user overrides and role permissions
            for (const [key] of this.userOverrides.entries()) {
                if (key.endsWith(`-${contextId}`)) {
                    this.userOverrides.delete(key);
                }
            }

            for (const [key] of this.rolePermissions.entries()) {
                if (key.endsWith(`-${contextId}`)) {
                    this.rolePermissions.delete(key);
                }
            }

            // Log the change
            await logger.log('INFO', 'CONTEXT_PERMISSIONS', 
                `Context permissions removed from ${contextId}`,
                { contextId, removedBy, reason }
            );

            return { success: true };

        } catch (error) {
            await logger.logError(error, 'removing context permissions');
            return { success: false, error: error.message };
        }
    }

    /**
     * Set user-specific context override
     * @param {string} userId - User ID
     * @param {string} contextId - Context ID
     * @param {Array} permissions - Permissions to grant
     * @param {Array} restrictions - Permissions to restrict
     * @param {number} expiry - Expiry timestamp (optional)
     * @param {string} setBy - User ID who set the override
     * @param {string} reason - Reason for override
     * @returns {Object} Result object
     */
    async setUserContextOverride(userId, contextId, permissions = [], restrictions = [], expiry = null, setBy, reason = '') {
        try {
            const key = `${userId}-${contextId}`;
            
            const override = {
                userId,
                contextId,
                permissions,
                restrictions,
                expiry,
                setBy,
                setAt: Date.now(),
                reason
            };

            this.userOverrides.set(key, override);

            // Log the change
            await logger.log('INFO', 'CONTEXT_PERMISSIONS', 
                `User context override set for ${userId} in ${contextId}`,
                { userId, contextId, permissions, restrictions, expiry, setBy, reason }
            );

            return { success: true, override };

        } catch (error) {
            await logger.logError(error, 'setting user context override');
            return { success: false, error: error.message };
        }
    }

    /**
     * Set role-based context permissions
     * @param {string} roleId - Role ID
     * @param {string} contextId - Context ID
     * @param {Array} permissions - Permissions to grant
     * @param {string} setBy - User ID who set the permissions
     * @param {string} reason - Reason for setting permissions
     * @returns {Object} Result object
     */
    async setRoleContextPermissions(roleId, contextId, permissions, setBy, reason = '') {
        try {
            const key = `${roleId}-${contextId}`;
            
            const rolePerms = {
                roleId,
                contextId,
                permissions,
                setBy,
                setAt: Date.now(),
                reason
            };

            this.rolePermissions.set(key, rolePerms);

            // Log the change
            await logger.log('INFO', 'CONTEXT_PERMISSIONS', 
                `Role context permissions set for ${roleId} in ${contextId}`,
                { roleId, contextId, permissions, setBy, reason }
            );

            return { success: true, rolePerms };

        } catch (error) {
            await logger.logError(error, 'setting role context permissions');
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user has permission in specific context
     * @param {GuildMember} member - Discord guild member
     * @param {string} permission - Permission to check
     * @param {string} contextId - Context ID
     * @param {string} contextType - Context type
     * @returns {boolean} Whether user has permission
     */
    hasContextPermission(member, permission, contextId, contextType) {
        if (!member) return false;

        try {
            // First check if user has global permission (bypass context)
            const globalPermission = rolePermissions.checkPermission(member, permission);
            if (!globalPermission) return true; // No error means has permission

            // Check user-specific overrides first
            const userOverride = this.getUserContextOverride(member.user.id, contextId);
            if (userOverride) {
                // Check if permission is explicitly granted
                if (userOverride.permissions.includes(permission)) {
                    return true;
                }
                // Check if permission is explicitly restricted
                if (userOverride.restrictions.includes(permission)) {
                    return false;
                }
            }

            // Check role-based context permissions
            for (const role of member.roles.cache.values()) {
                const rolePerms = this.getRoleContextPermissions(role.id, contextId);
                if (rolePerms && rolePerms.permissions.includes(permission)) {
                    return true;
                }
            }

            // Check context-specific permissions
            const contextPerms = this.getContextPermissions(contextId);
            if (contextPerms) {
                const permissionRule = contextPerms.permissions[permission];
                if (permissionRule !== undefined) {
                    return this.evaluatePermissionRule(member, permissionRule);
                }

                // Check restrictions
                const restrictionRule = contextPerms.restrictions[permission];
                if (restrictionRule !== undefined) {
                    const isRestricted = this.evaluatePermissionRule(member, restrictionRule);
                    if (isRestricted) return false;
                }

                // Check if should inherit from parent
                if (contextPerms.settings.inheritFromParent && contextType === 'channel') {
                    // Try to get parent category permissions
                    // This would require channel object to get parent
                    // For now, skip inheritance
                }
            }

            // Default to global permission check
            return !globalPermission; // Invert because checkPermission returns error message if denied

        } catch (error) {
            logger.logError(error, 'checking context permission');
            return false;
        }
    }

    /**
     * Evaluate permission rule
     * @param {GuildMember} member - Discord guild member
     * @param {*} rule - Permission rule
     * @returns {boolean} Whether rule grants permission
     */
    evaluatePermissionRule(member, rule) {
        if (typeof rule === 'boolean') {
            return rule;
        }

        if (typeof rule === 'string') {
            // Single role ID
            return member.roles.cache.has(rule);
        }

        if (Array.isArray(rule)) {
            // Array of role IDs - user needs any of these roles
            return rule.some(roleId => member.roles.cache.has(roleId));
        }

        if (typeof rule === 'object' && rule !== null) {
            // Complex rule object
            if (rule.roles) {
                const hasRole = Array.isArray(rule.roles) ? 
                    rule.roles.some(roleId => member.roles.cache.has(roleId)) :
                    member.roles.cache.has(rule.roles);
                
                if (!hasRole) return false;
            }

            if (rule.permissions) {
                const hasPermission = Array.isArray(rule.permissions) ?
                    rule.permissions.some(perm => !rolePermissions.checkPermission(member, perm)) :
                    !rolePermissions.checkPermission(member, rule.permissions);
                
                if (!hasPermission) return false;
            }

            if (rule.timeRestrictions) {
                const now = new Date();
                
                if (rule.timeRestrictions.hours) {
                    const currentHour = now.getHours();
                    const [startHour, endHour] = rule.timeRestrictions.hours;
                    if (currentHour < startHour || currentHour > endHour) {
                        return false;
                    }
                }

                if (rule.timeRestrictions.days) {
                    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    if (!rule.timeRestrictions.days.includes(currentDay)) {
                        return false;
                    }
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Get user context override
     * @param {string} userId - User ID
     * @param {string} contextId - Context ID
     * @returns {Object|null} User override or null
     */
    getUserContextOverride(userId, contextId) {
        const key = `${userId}-${contextId}`;
        const override = this.userOverrides.get(key);
        
        if (!override) return null;
        
        // Check if expired
        if (override.expiry && Date.now() > override.expiry) {
            this.userOverrides.delete(key);
            return null;
        }
        
        return override;
    }

    /**
     * Get user context overrides for a context
     * @param {string} userId - User ID
     * @param {string} contextId - Context ID
     * @returns {Array} Array of overrides
     */
    getUserContextOverrides(userId, contextId) {
        const results = [];
        
        for (const [key, override] of this.userOverrides.entries()) {
            if (key.startsWith(`${userId}-`) && (contextId ? key.endsWith(`-${contextId}`) : true)) {
                // Check if expired
                if (override.expiry && Date.now() > override.expiry) {
                    this.userOverrides.delete(key);
                    continue;
                }
                
                results.push(override);
            }
        }
        
        return results;
    }

    /**
     * Get role context permissions
     * @param {string} roleId - Role ID
     * @param {string} contextId - Context ID
     * @returns {Object|null} Role permissions or null
     */
    getRoleContextPermissions(roleId, contextId) {
        const key = `${roleId}-${contextId}`;
        return this.rolePermissions.get(key) || null;
    }

    /**
     * Get all context permissions for a guild
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of context permissions
     */
    getGuildContextPermissions() {
        // This would require storing guild information with context permissions
        // For now, return all context permissions
        return Array.from(this.contextPermissions.values());
    }

    /**
     * Validate permissions configuration
     * @param {Object} config - Permissions configuration
     * @returns {Object} Validation result
     */
    validatePermissionsConfig(config) {
        try {
            if (!config || typeof config !== 'object') {
                return { valid: false, error: 'Configuration must be an object' };
            }

            // Validate permissions section
            if (config.permissions && typeof config.permissions !== 'object') {
                return { valid: false, error: 'Permissions must be an object' };
            }

            // Validate restrictions section
            if (config.restrictions && typeof config.restrictions !== 'object') {
                return { valid: false, error: 'Restrictions must be an object' };
            }

            // Validate settings section
            if (config.settings && typeof config.settings !== 'object') {
                return { valid: false, error: 'Settings must be an object' };
            }

            // Validate permission keys
            const validPermissions = ['admin', 'staff', 'moderator', 'economy', 'giveaway', 'ticket', 'shop', 'customRole'];
            
            if (config.permissions) {
                for (const permission of Object.keys(config.permissions)) {
                    if (!validPermissions.includes(permission)) {
                        return { valid: false, error: `Invalid permission: ${permission}` };
                    }
                }
            }

            if (config.restrictions) {
                for (const permission of Object.keys(config.restrictions)) {
                    if (!validPermissions.includes(permission)) {
                        return { valid: false, error: `Invalid restriction: ${permission}` };
                    }
                }
            }

            return { valid: true };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Cleanup expired user overrides
     */
    async cleanupExpiredOverrides() {
        try {
            const now = Date.now();
            let cleanedCount = 0;

            for (const [key, override] of this.userOverrides.entries()) {
                if (override.expiry && now > override.expiry) {
                    this.userOverrides.delete(key);
                    cleanedCount++;

                    // Log expiration
                    await logger.log('INFO', 'CONTEXT_PERMISSIONS', 
                        `User context override expired: ${override.userId} in ${override.contextId}`,
                        { userId: override.userId, contextId: override.contextId }
                    );
                }
            }

            if (cleanedCount > 0) {
                await logger.log('DEBUG', 'CONTEXT_PERMISSIONS', 
                    `Cleaned up ${cleanedCount} expired context overrides`
                );
            }

        } catch (error) {
            await logger.logError(error, 'cleaning up expired context overrides');
        }
    }

    /**
     * Get statistics about context permissions
     * @returns {Object} Statistics
     */
    getStatistics() {
        const stats = {
            totalContexts: this.contextPermissions.size,
            totalUserOverrides: this.userOverrides.size,
            totalRolePermissions: this.rolePermissions.size,
            contextsByType: new Map(),
            mostUsedContextType: null,
            activeOverrides: 0
        };

        // Count contexts by type
        for (const context of this.contextPermissions.values()) {
            const count = stats.contextsByType.get(context.contextType) || 0;
            stats.contextsByType.set(context.contextType, count + 1);
        }

        // Find most used context type
        let maxCount = 0;
        for (const [type, count] of stats.contextsByType.entries()) {
            if (count > maxCount) {
                maxCount = count;
                stats.mostUsedContextType = type;
            }
        }

        // Count active overrides (non-expired)
        const now = Date.now();
        for (const override of this.userOverrides.values()) {
            if (!override.expiry || override.expiry > now) {
                stats.activeOverrides++;
            }
        }

        return stats;
    }

    /**
     * Destroy the context permissions system
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.contextPermissions.clear();
        this.userOverrides.clear();
        this.rolePermissions.clear();
    }
}

// Export singleton instance
module.exports = new ContextPermissions();