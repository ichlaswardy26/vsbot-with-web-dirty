const logger = require('./logger');

/**
 * Temporary Permissions System
 * Allows granting time-limited permissions to users
 */

class TemporaryPermissions {
    constructor() {
        this.temporaryGrants = new Map(); // userId -> { permissions, expiry, grantedBy }
        this.cleanupInterval = null;
        
        // Start cleanup interval (every 5 minutes)
        this.startCleanupInterval();
    }

    /**
     * Start automatic cleanup of expired permissions
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredPermissions();
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Grant temporary permission to a user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string|Array} permissions - Permission(s) to grant
     * @param {number|string} duration - Duration (ms or string like '1h', '30m')
     * @param {string} grantedBy - User ID who granted the permission
     * @param {string} reason - Reason for granting permission
     * @returns {Object} Grant result
     */
    async grantTemporaryPermission(userId, guildId, permissions, duration, grantedBy, reason = '') {
        try {
            // Parse duration if it's a string
            const durationMs = typeof duration === 'string' ? this.parseDuration(duration) : duration;
            
            if (!durationMs || durationMs <= 0) {
                return { success: false, error: 'Invalid duration specified' };
            }

            // Maximum duration: 7 days
            const maxDuration = 7 * 24 * 60 * 60 * 1000;
            if (durationMs > maxDuration) {
                return { success: false, error: 'Duration cannot exceed 7 days' };
            }

            // Normalize permissions to array
            const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
            
            // Validate permissions
            const validPermissions = ['admin', 'staff', 'moderator', 'economy', 'giveaway', 'ticket', 'shop'];
            const invalidPerms = permissionArray.filter(p => !validPermissions.includes(p));
            
            if (invalidPerms.length > 0) {
                return { success: false, error: `Invalid permissions: ${invalidPerms.join(', ')}` };
            }

            const key = `${userId}-${guildId}`;
            const expiry = Date.now() + durationMs;
            
            // Get existing grants or create new
            const existingGrant = this.temporaryGrants.get(key) || { permissions: [], grants: [] };
            
            // Add new permissions (avoid duplicates)
            const newPermissions = [...new Set([...existingGrant.permissions, ...permissionArray])];
            
            // Create grant record
            const grantRecord = {
                permissions: permissionArray,
                expiry,
                grantedBy,
                grantedAt: Date.now(),
                reason,
                duration: durationMs
            };

            // Update grants
            this.temporaryGrants.set(key, {
                permissions: newPermissions,
                expiry: Math.max(expiry, existingGrant.expiry || 0), // Use latest expiry
                grants: [...(existingGrant.grants || []), grantRecord]
            });

            // Log the grant
            await logger.log('INFO', 'TEMP_PERMISSIONS', 
                `Temporary permission granted: ${permissionArray.join(', ')} to user ${userId} for ${this.formatDuration(durationMs)}`,
                { userId, guildId, permissions: permissionArray, duration: durationMs, grantedBy, reason }
            );

            return {
                success: true,
                permissions: permissionArray,
                expiry,
                expiryFormatted: new Date(expiry).toISOString(),
                duration: durationMs,
                durationFormatted: this.formatDuration(durationMs)
            };

        } catch (error) {
            await logger.logError(error, 'granting temporary permission');
            return { success: false, error: error.message };
        }
    }

    /**
     * Revoke temporary permission from a user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string|Array} permissions - Permission(s) to revoke (optional, revokes all if not specified)
     * @param {string} revokedBy - User ID who revoked the permission
     * @param {string} reason - Reason for revoking permission
     * @returns {Object} Revoke result
     */
    async revokeTemporaryPermission(userId, guildId, permissions = null, revokedBy, reason = '') {
        try {
            const key = `${userId}-${guildId}`;
            const existingGrant = this.temporaryGrants.get(key);

            if (!existingGrant) {
                return { success: false, error: 'No temporary permissions found for this user' };
            }

            let revokedPermissions;

            if (permissions) {
                // Revoke specific permissions
                const permissionsToRevoke = Array.isArray(permissions) ? permissions : [permissions];
                revokedPermissions = permissionsToRevoke.filter(p => existingGrant.permissions.includes(p));
                
                if (revokedPermissions.length === 0) {
                    return { success: false, error: 'User does not have the specified temporary permissions' };
                }

                // Remove revoked permissions
                existingGrant.permissions = existingGrant.permissions.filter(p => !revokedPermissions.includes(p));
                
                // If no permissions left, remove the grant entirely
                if (existingGrant.permissions.length === 0) {
                    this.temporaryGrants.delete(key);
                } else {
                    this.temporaryGrants.set(key, existingGrant);
                }
            } else {
                // Revoke all permissions
                revokedPermissions = [...existingGrant.permissions];
                this.temporaryGrants.delete(key);
            }

            // Log the revocation
            await logger.log('INFO', 'TEMP_PERMISSIONS', 
                `Temporary permission revoked: ${revokedPermissions.join(', ')} from user ${userId}`,
                { userId, guildId, permissions: revokedPermissions, revokedBy, reason }
            );

            return {
                success: true,
                revokedPermissions,
                remainingPermissions: existingGrant.permissions || []
            };

        } catch (error) {
            await logger.logError(error, 'revoking temporary permission');
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user has temporary permission
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} permission - Permission to check
     * @returns {boolean} Whether user has the temporary permission
     */
    hasTemporaryPermission(userId, guildId, permission) {
        const key = `${userId}-${guildId}`;
        const grant = this.temporaryGrants.get(key);
        
        if (!grant) return false;
        
        // Check if expired
        if (Date.now() > grant.expiry) {
            this.temporaryGrants.delete(key);
            return false;
        }
        
        return grant.permissions.includes(permission);
    }

    /**
     * Get user's temporary permissions
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Object|null} Temporary permissions info
     */
    getUserTemporaryPermissions(userId, guildId) {
        const key = `${userId}-${guildId}`;
        const grant = this.temporaryGrants.get(key);
        
        if (!grant) return null;
        
        // Check if expired
        if (Date.now() > grant.expiry) {
            this.temporaryGrants.delete(key);
            return null;
        }
        
        return {
            permissions: grant.permissions,
            expiry: grant.expiry,
            expiryFormatted: new Date(grant.expiry).toISOString(),
            timeRemaining: grant.expiry - Date.now(),
            timeRemainingFormatted: this.formatDuration(grant.expiry - Date.now()),
            grants: grant.grants || []
        };
    }

    /**
     * Get all active temporary permissions
     * @param {string} guildId - Guild ID (optional)
     * @returns {Array} Array of active temporary permissions
     */
    getAllTemporaryPermissions(guildId = null) {
        const results = [];
        
        for (const [key, grant] of this.temporaryGrants.entries()) {
            const [userId, userGuildId] = key.split('-');
            
            // Filter by guild if specified
            if (guildId && userGuildId !== guildId) continue;
            
            // Skip expired grants
            if (Date.now() > grant.expiry) {
                this.temporaryGrants.delete(key);
                continue;
            }
            
            results.push({
                userId,
                guildId: userGuildId,
                permissions: grant.permissions,
                expiry: grant.expiry,
                expiryFormatted: new Date(grant.expiry).toISOString(),
                timeRemaining: grant.expiry - Date.now(),
                timeRemainingFormatted: this.formatDuration(grant.expiry - Date.now()),
                grants: grant.grants || []
            });
        }
        
        return results.sort((a, b) => a.expiry - b.expiry);
    }

    /**
     * Cleanup expired permissions
     */
    async cleanupExpiredPermissions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, grant] of this.temporaryGrants.entries()) {
            if (now > grant.expiry) {
                const [userId, guildId] = key.split('-');
                
                // Log expiration
                await logger.log('INFO', 'TEMP_PERMISSIONS', 
                    `Temporary permissions expired for user ${userId}: ${grant.permissions.join(', ')}`,
                    { userId, guildId, permissions: grant.permissions }
                );
                
                this.temporaryGrants.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            await logger.log('DEBUG', 'TEMP_PERMISSIONS', 
                `Cleaned up ${cleanedCount} expired temporary permissions`
            );
        }
    }

    /**
     * Parse duration string to milliseconds
     * @param {string} duration - Duration string (e.g., '1h', '30m', '2d')
     * @returns {number} Duration in milliseconds
     */
    parseDuration(duration) {
        const regex = /^(\d+)([smhd])$/i;
        const match = duration.match(regex);
        
        if (!match) return 0;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        const multipliers = {
            s: 1000,           // seconds
            m: 60 * 1000,      // minutes
            h: 60 * 60 * 1000, // hours
            d: 24 * 60 * 60 * 1000 // days
        };
        
        return value * (multipliers[unit] || 0);
    }

    /**
     * Format duration from milliseconds to human readable
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get statistics about temporary permissions
     * @returns {Object} Statistics
     */
    getStatistics() {
        const now = Date.now();
        let activeGrants = 0;
        let expiredGrants = 0;
        const permissionCounts = {};
        const guildCounts = {};
        
        for (const [key, grant] of this.temporaryGrants.entries()) {
            const [, guildId] = key.split('-');
            
            if (now > grant.expiry) {
                expiredGrants++;
            } else {
                activeGrants++;
                
                // Count permissions
                grant.permissions.forEach(perm => {
                    permissionCounts[perm] = (permissionCounts[perm] || 0) + 1;
                });
                
                // Count guilds
                guildCounts[guildId] = (guildCounts[guildId] || 0) + 1;
            }
        }
        
        return {
            activeGrants,
            expiredGrants,
            totalGrants: activeGrants + expiredGrants,
            permissionCounts,
            guildCounts,
            mostUsedPermission: Object.keys(permissionCounts).reduce((a, b) => 
                permissionCounts[a] > permissionCounts[b] ? a : b, null
            )
        };
    }

    /**
     * Extend existing temporary permission
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {number|string} additionalDuration - Additional duration to add
     * @param {string} extendedBy - User ID who extended the permission
     * @param {string} reason - Reason for extension
     * @returns {Object} Extension result
     */
    async extendTemporaryPermission(userId, guildId, additionalDuration, extendedBy, reason = '') {
        try {
            const key = `${userId}-${guildId}`;
            const existingGrant = this.temporaryGrants.get(key);

            if (!existingGrant) {
                return { success: false, error: 'No temporary permissions found for this user' };
            }

            // Parse additional duration
            const additionalMs = typeof additionalDuration === 'string' ? 
                this.parseDuration(additionalDuration) : additionalDuration;
            
            if (!additionalMs || additionalMs <= 0) {
                return { success: false, error: 'Invalid additional duration specified' };
            }

            // Calculate new expiry
            const newExpiry = existingGrant.expiry + additionalMs;
            const maxExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days from now
            
            if (newExpiry > maxExpiry) {
                return { success: false, error: 'Extended duration would exceed maximum limit (7 days)' };
            }

            // Update expiry
            existingGrant.expiry = newExpiry;
            this.temporaryGrants.set(key, existingGrant);

            // Log the extension
            await logger.log('INFO', 'TEMP_PERMISSIONS', 
                `Temporary permission extended for user ${userId} by ${this.formatDuration(additionalMs)}`,
                { userId, guildId, additionalDuration: additionalMs, newExpiry, extendedBy, reason }
            );

            return {
                success: true,
                newExpiry,
                newExpiryFormatted: new Date(newExpiry).toISOString(),
                additionalDuration: additionalMs,
                additionalDurationFormatted: this.formatDuration(additionalMs)
            };

        } catch (error) {
            await logger.logError(error, 'extending temporary permission');
            return { success: false, error: error.message };
        }
    }

    /**
     * Destroy the temporary permissions system
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.temporaryGrants.clear();
    }
}

// Export singleton instance
module.exports = new TemporaryPermissions();