/**
 * Rate Limiter Utility
 * Provides cooldown and rate limiting functionality for commands
 */

const config = require('../config');

class RateLimiter {
    constructor() {
        this.cooldowns = new Map();
        this.rateLimits = new Map();
        
        // Default cooldowns for different command categories (in milliseconds)
        this.defaultCooldowns = {
            admin: 5000,      // 5 seconds
            economy: 3000,    // 3 seconds
            shop: 2000,       // 2 seconds
            giveaway: 10000,  // 10 seconds
            moderator: 1000,  // 1 second
            customRole: 30000, // 30 seconds
            general: 1000     // 1 second
        };

        // Rate limits (max uses per time window)
        this.rateLimitConfig = {
            admin: { maxUses: 10, window: 60000 },      // 10 uses per minute
            economy: { maxUses: 20, window: 60000 },    // 20 uses per minute
            shop: { maxUses: 15, window: 60000 },       // 15 uses per minute
            giveaway: { maxUses: 5, window: 300000 },   // 5 uses per 5 minutes
            moderator: { maxUses: 30, window: 60000 },  // 30 uses per minute
            customRole: { maxUses: 3, window: 3600000 } // 3 uses per hour
        };
    }

    /**
     * Check if user is on cooldown for a command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @param {number} customCooldown - Custom cooldown time (optional)
     * @returns {Object} Cooldown status
     */
    checkCooldown(userId, commandName, category = 'general', customCooldown = null) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();
        const cooldownTime = customCooldown || this.defaultCooldowns[category] || this.defaultCooldowns.general;

        if (this.cooldowns.has(key)) {
            const expirationTime = this.cooldowns.get(key) + cooldownTime;
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { 
                    onCooldown: true, 
                    timeLeft,
                    message: `⏰ Command sedang cooldown. Coba lagi dalam ${timeLeft} detik.`
                };
            }
        }

        this.cooldowns.set(key, now);
        
        // Clean up old cooldowns periodically
        this.cleanupCooldowns();
        
        return { onCooldown: false };
    }

    /**
     * Check rate limit for user in a category
     * @param {string} userId - User ID
     * @param {string} category - Command category
     * @returns {Object} Rate limit status
     */
    checkRateLimit(userId, category) {
        const config = this.rateLimitConfig[category];
        if (!config) return { limited: false };

        const key = `${userId}-${category}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, { uses: 1, resetTime: now + config.window });
            return { limited: false };
        }

        const userLimit = this.rateLimits.get(key);
        
        // Reset if window expired
        if (now > userLimit.resetTime) {
            this.rateLimits.set(key, { uses: 1, resetTime: now + config.window });
            return { limited: false };
        }

        // Check if limit exceeded
        if (userLimit.uses >= config.maxUses) {
            const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);
            return {
                limited: true,
                resetIn,
                message: `🚫 Rate limit tercapai untuk kategori ${category}. Reset dalam ${resetIn} detik.`
            };
        }

        // Increment usage
        userLimit.uses++;
        return { limited: false };
    }

    /**
     * Check both cooldown and rate limit
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @param {number} customCooldown - Custom cooldown (optional)
     * @returns {Object} Combined check result
     */
    checkLimits(userId, commandName, category = 'general', customCooldown = null) {
        // Check cooldown first
        const cooldownCheck = this.checkCooldown(userId, commandName, category, customCooldown);
        if (cooldownCheck.onCooldown) {
            return { blocked: true, reason: 'cooldown', ...cooldownCheck };
        }

        // Check rate limit
        const rateLimitCheck = this.checkRateLimit(userId, category);
        if (rateLimitCheck.limited) {
            return { blocked: true, reason: 'rateLimit', ...rateLimitCheck };
        }

        return { blocked: false };
    }

    /**
     * Get remaining cooldown time for a command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @returns {number} Remaining time in seconds (0 if no cooldown)
     */
    getRemainingCooldown(userId, commandName, category = 'general') {
        const key = `${userId}-${commandName}`;
        const cooldownTime = this.defaultCooldowns[category] || this.defaultCooldowns.general;
        
        if (!this.cooldowns.has(key)) return 0;
        
        const now = Date.now();
        const expirationTime = this.cooldowns.get(key) + cooldownTime;
        
        if (now >= expirationTime) return 0;
        
        return Math.ceil((expirationTime - now) / 1000);
    }

    /**
     * Reset cooldown for a user command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     */
    resetCooldown(userId, commandName) {
        const key = `${userId}-${commandName}`;
        this.cooldowns.delete(key);
    }

    /**
     * Reset rate limit for a user category
     * @param {string} userId - User ID
     * @param {string} category - Command category
     */
    resetRateLimit(userId, category) {
        const key = `${userId}-${category}`;
        this.rateLimits.delete(key);
    }

    /**
     * Set custom cooldown for specific command
     * @param {string} commandName - Command name
     * @param {number} cooldownMs - Cooldown in milliseconds
     */
    setCustomCooldown(commandName, cooldownMs) {
        this.defaultCooldowns[commandName] = cooldownMs;
    }

    /**
     * Get user's current rate limit status
     * @param {string} userId - User ID
     * @param {string} category - Command category
     * @returns {Object} Rate limit status
     */
    getRateLimitStatus(userId, category) {
        const config = this.rateLimitConfig[category];
        if (!config) return null;

        const key = `${userId}-${category}`;
        const userLimit = this.rateLimits.get(key);
        
        if (!userLimit) {
            return {
                uses: 0,
                maxUses: config.maxUses,
                resetIn: 0,
                percentage: 0
            };
        }

        const now = Date.now();
        const resetIn = Math.max(0, Math.ceil((userLimit.resetTime - now) / 1000));
        
        return {
            uses: userLimit.uses,
            maxUses: config.maxUses,
            resetIn,
            percentage: Math.round((userLimit.uses / config.maxUses) * 100)
        };
    }

    /**
     * Clean up expired cooldowns and rate limits
     */
    cleanupCooldowns() {
        const now = Date.now();
        
        // Clean cooldowns (run every 100 operations)
        if (Math.random() < 0.01) {
            for (const [key, timestamp] of this.cooldowns.entries()) {
                if (now - timestamp > 300000) { // 5 minutes old
                    this.cooldowns.delete(key);
                }
            }
        }

        // Clean rate limits
        if (Math.random() < 0.01) {
            for (const [key, data] of this.rateLimits.entries()) {
                if (now > data.resetTime) {
                    this.rateLimits.delete(key);
                }
            }
        }
    }

    /**
     * Get statistics about rate limiter usage
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            activeCooldowns: this.cooldowns.size,
            activeRateLimits: this.rateLimits.size,
            categories: Object.keys(this.defaultCooldowns),
            rateLimitCategories: Object.keys(this.rateLimitConfig)
        };
    }

    /**
     * Check if user is exempt from rate limits (owners, admins)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean} Whether user is exempt
     */
    isExempt(member) {
        const rolePermissions = require('./rolePermissions');
        
        // Bot owners are exempt
        if (config.ownerIds?.includes(member.user.id)) return true;
        
        // Admins are exempt from most rate limits
        if (rolePermissions.isAdmin(member)) return true;
        
        return false;
    }
}

// Export singleton instance
module.exports = new RateLimiter();