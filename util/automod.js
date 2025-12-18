/**
 * Auto-Moderation System
 * Provides automated content filtering and spam protection
 */

const logger = require('./logger');

class AutoMod {
    constructor() {
        // Spam tracking
        this.messageCache = new Map(); // userId -> messages[]
        this.mentionCache = new Map(); // userId -> mentionCount
        this.linkCache = new Map(); // userId -> linkCount
        
        // Configuration defaults
        this.config = {
            enabled: true,
            spam: {
                enabled: true,
                maxMessages: 5,
                timeWindow: 5000, // 5 seconds
                action: 'warn' // warn, mute, kick
            },
            mentions: {
                enabled: true,
                maxMentions: 5,
                action: 'delete'
            },
            links: {
                enabled: true,
                whitelist: [],
                blacklist: [],
                allowImages: true,
                action: 'delete'
            },
            caps: {
                enabled: true,
                threshold: 70, // percentage
                minLength: 10,
                action: 'delete'
            },
            badWords: {
                enabled: true,
                words: [],
                action: 'delete'
            },
            invites: {
                enabled: true,
                allowOwn: true,
                action: 'delete'
            },
            zalgo: {
                enabled: true,
                action: 'delete'
            }
        };

        // Exempt roles and channels
        this.exemptRoles = new Set();
        this.exemptChannels = new Set();
        this.exemptUsers = new Set();

        // Cleanup interval
        this.startCleanup();
    }

    /**
     * Start cleanup interval for caches
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            
            // Clean message cache
            for (const [userId, messages] of this.messageCache) {
                const filtered = messages.filter(m => now - m.timestamp < 60000);
                if (filtered.length === 0) {
                    this.messageCache.delete(userId);
                } else {
                    this.messageCache.set(userId, filtered);
                }
            }
            
            // Clean mention cache
            for (const [userId, data] of this.mentionCache) {
                if (now - data.timestamp > 60000) {
                    this.mentionCache.delete(userId);
                }
            }
            
            // Clean link cache
            for (const [userId, data] of this.linkCache) {
                if (now - data.timestamp > 60000) {
                    this.linkCache.delete(userId);
                }
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Check message for violations
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    async checkMessage(message) {
        // Skip if automod disabled
        if (!this.config.enabled) {
            return { violation: false };
        }

        // Skip bots
        if (message.author.bot) {
            return { violation: false };
        }

        // Check exemptions
        if (this.isExempt(message)) {
            return { violation: false };
        }

        const violations = [];

        // Check spam
        if (this.config.spam.enabled) {
            const spamResult = this.checkSpam(message);
            if (spamResult.violation) {
                violations.push(spamResult);
            }
        }

        // Check mentions
        if (this.config.mentions.enabled) {
            const mentionResult = this.checkMentions(message);
            if (mentionResult.violation) {
                violations.push(mentionResult);
            }
        }

        // Check links
        if (this.config.links.enabled) {
            const linkResult = this.checkLinks(message);
            if (linkResult.violation) {
                violations.push(linkResult);
            }
        }

        // Check caps
        if (this.config.caps.enabled) {
            const capsResult = this.checkCaps(message);
            if (capsResult.violation) {
                violations.push(capsResult);
            }
        }

        // Check bad words
        if (this.config.badWords.enabled) {
            const badWordResult = this.checkBadWords(message);
            if (badWordResult.violation) {
                violations.push(badWordResult);
            }
        }

        // Check invites
        if (this.config.invites.enabled) {
            const inviteResult = this.checkInvites(message);
            if (inviteResult.violation) {
                violations.push(inviteResult);
            }
        }

        // Check zalgo
        if (this.config.zalgo.enabled) {
            const zalgoResult = this.checkZalgo(message);
            if (zalgoResult.violation) {
                violations.push(zalgoResult);
            }
        }

        if (violations.length > 0) {
            // Get highest priority violation
            const primaryViolation = this.getPrimaryViolation(violations);
            
            await logger.log('INFO', 'AUTOMOD', 
                `Violation detected: ${primaryViolation.type} by ${message.author.tag}`,
                { userId: message.author.id, guildId: message.guild?.id, type: primaryViolation.type }
            );

            return {
                violation: true,
                violations,
                primary: primaryViolation
            };
        }

        return { violation: false };
    }

    /**
     * Check for spam
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkSpam(message) {
        const userId = message.author.id;
        const now = Date.now();
        
        // Get or create message history
        if (!this.messageCache.has(userId)) {
            this.messageCache.set(userId, []);
        }
        
        const messages = this.messageCache.get(userId);
        
        // Add current message
        messages.push({
            content: message.content,
            timestamp: now,
            channelId: message.channel.id
        });
        
        // Filter to time window
        const recentMessages = messages.filter(
            m => now - m.timestamp < this.config.spam.timeWindow
        );
        
        this.messageCache.set(userId, recentMessages);
        
        // Check if spam
        if (recentMessages.length >= this.config.spam.maxMessages) {
            // Check for duplicate content
            const duplicates = recentMessages.filter(
                m => m.content === message.content
            );
            
            if (duplicates.length >= 3) {
                return {
                    violation: true,
                    type: 'spam',
                    reason: 'Duplicate message spam',
                    action: this.config.spam.action,
                    severity: 'high'
                };
            }
            
            return {
                violation: true,
                type: 'spam',
                reason: 'Message spam detected',
                action: this.config.spam.action,
                severity: 'medium'
            };
        }
        
        return { violation: false };
    }

    /**
     * Check for excessive mentions
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkMentions(message) {
        const mentionCount = message.mentions.users.size + 
                           message.mentions.roles.size +
                           (message.mentions.everyone ? 1 : 0);
        
        if (mentionCount > this.config.mentions.maxMentions) {
            return {
                violation: true,
                type: 'mentions',
                reason: `Too many mentions (${mentionCount})`,
                action: this.config.mentions.action,
                severity: 'medium'
            };
        }
        
        return { violation: false };
    }

    /**
     * Check for prohibited links
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkLinks(message) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const links = message.content.match(urlRegex) || [];
        
        if (links.length === 0) {
            return { violation: false };
        }
        
        for (const link of links) {
            // Check whitelist
            const isWhitelisted = this.config.links.whitelist.some(
                domain => link.includes(domain)
            );
            if (isWhitelisted) continue;
            
            // Check blacklist
            const isBlacklisted = this.config.links.blacklist.some(
                domain => link.includes(domain)
            );
            if (isBlacklisted) {
                return {
                    violation: true,
                    type: 'link',
                    reason: 'Blacklisted link detected',
                    action: this.config.links.action,
                    severity: 'high'
                };
            }
            
            // Check if image link is allowed
            if (this.config.links.allowImages) {
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
                const isImage = imageExtensions.some(ext => link.toLowerCase().includes(ext));
                if (isImage) continue;
            }
        }
        
        return { violation: false };
    }

    /**
     * Check for excessive caps
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkCaps(message) {
        const content = message.content.replace(/[^a-zA-Z]/g, '');
        
        if (content.length < this.config.caps.minLength) {
            return { violation: false };
        }
        
        const upperCount = (content.match(/[A-Z]/g) || []).length;
        const capsPercentage = (upperCount / content.length) * 100;
        
        if (capsPercentage > this.config.caps.threshold) {
            return {
                violation: true,
                type: 'caps',
                reason: `Excessive caps (${Math.round(capsPercentage)}%)`,
                action: this.config.caps.action,
                severity: 'low'
            };
        }
        
        return { violation: false };
    }

    /**
     * Check for bad words
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkBadWords(message) {
        const content = message.content.toLowerCase();
        
        for (const word of this.config.badWords.words) {
            const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
            if (regex.test(content)) {
                return {
                    violation: true,
                    type: 'badword',
                    reason: 'Prohibited word detected',
                    action: this.config.badWords.action,
                    severity: 'high'
                };
            }
        }
        
        return { violation: false };
    }

    /**
     * Check for Discord invites
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkInvites(message) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
        const invites = message.content.match(inviteRegex) || [];
        
        if (invites.length === 0) {
            return { violation: false };
        }
        
        // Allow own server invites if configured
        if (this.config.invites.allowOwn && message.guild) {
            // Would need to check if invite is for current server
            // For now, block all external invites
        }
        
        return {
            violation: true,
            type: 'invite',
            reason: 'Discord invite link detected',
            action: this.config.invites.action,
            severity: 'medium'
        };
    }

    /**
     * Check for zalgo text
     * @param {Message} message - Discord message
     * @returns {Object} Check result
     */
    checkZalgo(message) {
        // Zalgo characters are combining diacritical marks
        const zalgoRegex = /[\u0300-\u036f\u0489]/g;
        const zalgoMatches = message.content.match(zalgoRegex) || [];
        
        // If more than 10 zalgo characters, it's likely intentional
        if (zalgoMatches.length > 10) {
            return {
                violation: true,
                type: 'zalgo',
                reason: 'Zalgo text detected',
                action: this.config.zalgo.action,
                severity: 'low'
            };
        }
        
        return { violation: false };
    }

    /**
     * Check if user/channel is exempt
     * @param {Message} message - Discord message
     * @returns {boolean} Is exempt
     */
    isExempt(message) {
        // Check user exemption
        if (this.exemptUsers.has(message.author.id)) {
            return true;
        }
        
        // Check channel exemption
        if (this.exemptChannels.has(message.channel.id)) {
            return true;
        }
        
        // Check role exemption
        if (message.member) {
            for (const roleId of message.member.roles.cache.keys()) {
                if (this.exemptRoles.has(roleId)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Get primary violation (highest severity)
     * @param {Array} violations - Array of violations
     * @returns {Object} Primary violation
     */
    getPrimaryViolation(violations) {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        
        return violations.sort((a, b) => 
            severityOrder[b.severity] - severityOrder[a.severity]
        )[0];
    }

    /**
     * Execute action for violation
     * @param {Message} message - Discord message
     * @param {Object} violation - Violation object
     * @returns {Promise<Object>} Action result
     */
    async executeAction(message, violation) {
        const actions = {
            delete: async () => {
                try {
                    await message.delete();
                    return { success: true, action: 'deleted' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            warn: async () => {
                try {
                    await message.reply({
                        content: `⚠️ **AutoMod:** ${violation.reason}`,
                        allowedMentions: { repliedUser: true }
                    });
                    return { success: true, action: 'warned' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            mute: async () => {
                // Would need timeout implementation
                return { success: false, action: 'mute_not_implemented' };
            },
            kick: async () => {
                // Would need kick implementation with permission check
                return { success: false, action: 'kick_not_implemented' };
            }
        };
        
        const actionFn = actions[violation.action] || actions.warn;
        return await actionFn();
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Add exempt role
     * @param {string} roleId - Role ID
     */
    addExemptRole(roleId) {
        this.exemptRoles.add(roleId);
    }

    /**
     * Remove exempt role
     * @param {string} roleId - Role ID
     */
    removeExemptRole(roleId) {
        this.exemptRoles.delete(roleId);
    }

    /**
     * Add exempt channel
     * @param {string} channelId - Channel ID
     */
    addExemptChannel(channelId) {
        this.exemptChannels.add(channelId);
    }

    /**
     * Add bad word to filter
     * @param {string} word - Word to add
     */
    addBadWord(word) {
        if (!this.config.badWords.words.includes(word.toLowerCase())) {
            this.config.badWords.words.push(word.toLowerCase());
        }
    }

    /**
     * Remove bad word from filter
     * @param {string} word - Word to remove
     */
    removeBadWord(word) {
        const index = this.config.badWords.words.indexOf(word.toLowerCase());
        if (index > -1) {
            this.config.badWords.words.splice(index, 1);
        }
    }

    /**
     * Escape regex special characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            enabled: this.config.enabled,
            trackedUsers: this.messageCache.size,
            exemptRoles: this.exemptRoles.size,
            exemptChannels: this.exemptChannels.size,
            exemptUsers: this.exemptUsers.size,
            badWordsCount: this.config.badWords.words.length,
            config: {
                spam: this.config.spam.enabled,
                mentions: this.config.mentions.enabled,
                links: this.config.links.enabled,
                caps: this.config.caps.enabled,
                badWords: this.config.badWords.enabled,
                invites: this.config.invites.enabled,
                zalgo: this.config.zalgo.enabled
            }
        };
    }
}

// Export singleton instance
module.exports = new AutoMod();
