/**
 * Audit Logger Utility
 * Centralized logging for all moderation and admin actions
 */

const AuditLog = require('../schemas/AuditLog');
const logger = require('./logger');

class AuditLogger {
    constructor() {
        this.buffer = [];
        this.bufferSize = 10;
        this.flushInterval = 5000; // 5 seconds
        
        // Start flush interval
        this.startFlushInterval();
    }

    /**
     * Start automatic buffer flush
     */
    startFlushInterval() {
        setInterval(() => {
            this.flushBuffer();
        }, this.flushInterval);
    }

    /**
     * Flush buffer to database
     */
    async flushBuffer() {
        if (this.buffer.length === 0) return;
        
        const toFlush = [...this.buffer];
        this.buffer = [];
        
        try {
            await AuditLog.insertMany(toFlush);
        } catch (error) {
            logger.logError(error, 'flushing audit buffer');
            // Re-add to buffer on failure
            this.buffer.push(...toFlush);
        }
    }

    /**
     * Log an action
     * @param {Object} data - Log data
     * @returns {Promise<Object>} Created log
     */
    async log(data) {
        const logEntry = {
            guildId: data.guildId,
            action: data.action,
            executorId: data.executorId,
            executorTag: data.executorTag,
            targetId: data.targetId,
            targetTag: data.targetTag,
            targetType: data.targetType || 'OTHER',
            reason: data.reason,
            details: data.details || {},
            changes: data.changes || [],
            metadata: data.metadata || {}
        };

        // Add to buffer
        this.buffer.push(logEntry);
        
        // Flush if buffer is full
        if (this.buffer.length >= this.bufferSize) {
            await this.flushBuffer();
        }

        // Also log to file logger
        await logger.log('INFO', 'AUDIT', 
            `${data.action}: ${data.executorTag || data.executorId} -> ${data.targetTag || data.targetId || 'N/A'}`,
            { guildId: data.guildId, action: data.action, reason: data.reason }
        );

        return logEntry;
    }

    /**
     * Log moderation action
     * @param {Object} params - Parameters
     */
    async logModeration(params) {
        const { guild, executor, target, action, reason, duration } = params;
        
        return this.log({
            guildId: guild.id,
            action,
            executorId: executor.id,
            executorTag: executor.tag || executor.user?.tag,
            targetId: target.id,
            targetTag: target.tag || target.user?.tag,
            targetType: 'USER',
            reason,
            metadata: { duration }
        });
    }

    /**
     * Log warn action
     */
    async logWarn(guild, executor, target, reason) {
        return this.logModeration({
            guild, executor, target,
            action: 'WARN',
            reason
        });
    }

    /**
     * Log mute action
     */
    async logMute(guild, executor, target, reason, duration) {
        return this.logModeration({
            guild, executor, target,
            action: 'MUTE',
            reason,
            duration
        });
    }

    /**
     * Log kick action
     */
    async logKick(guild, executor, target, reason) {
        return this.logModeration({
            guild, executor, target,
            action: 'KICK',
            reason
        });
    }

    /**
     * Log ban action
     */
    async logBan(guild, executor, target, reason) {
        return this.logModeration({
            guild, executor, target,
            action: 'BAN',
            reason
        });
    }

    /**
     * Log economy action
     * @param {Object} params - Parameters
     */
    async logEconomy(params) {
        const { guildId, executor, target, action, amount, reason } = params;
        
        return this.log({
            guildId,
            action,
            executorId: executor.id,
            executorTag: executor.tag,
            targetId: target.id,
            targetTag: target.tag,
            targetType: 'USER',
            reason,
            details: { amount }
        });
    }

    /**
     * Log XP/Level action
     */
    async logLevel(params) {
        const { guildId, executor, target, action, amount, reason } = params;
        
        return this.log({
            guildId,
            action,
            executorId: executor.id,
            executorTag: executor.tag,
            targetId: target.id,
            targetTag: target.tag,
            targetType: 'USER',
            reason,
            details: { amount }
        });
    }

    /**
     * Log config change
     */
    async logConfigChange(guildId, executor, section, changes) {
        return this.log({
            guildId,
            action: 'CONFIG_UPDATE',
            executorId: executor.id,
            executorTag: executor.tag,
            targetType: 'GUILD',
            details: { section },
            changes
        });
    }

    /**
     * Log automod trigger
     */
    async logAutomod(guildId, target, violationType, action, messageContent) {
        return this.log({
            guildId,
            action: 'AUTOMOD_TRIGGER',
            executorId: 'SYSTEM',
            executorTag: 'AutoMod',
            targetId: target.id,
            targetTag: target.tag,
            targetType: 'USER',
            details: {
                violationType,
                actionTaken: action,
                messagePreview: messageContent?.substring(0, 100)
            },
            metadata: { automated: true }
        });
    }

    /**
     * Log ticket action
     */
    async logTicket(guildId, executor, action, ticketId, details = {}) {
        return this.log({
            guildId,
            action,
            executorId: executor.id,
            executorTag: executor.tag,
            targetId: ticketId,
            targetType: 'CHANNEL',
            details
        });
    }

    /**
     * Log giveaway action
     */
    async logGiveaway(guildId, executor, action, giveawayId, details = {}) {
        return this.log({
            guildId,
            action,
            executorId: executor.id,
            executorTag: executor.tag,
            targetId: giveawayId,
            targetType: 'MESSAGE',
            details
        });
    }

    /**
     * Log role action
     */
    async logRole(guildId, executor, target, action, roleId, roleName) {
        return this.log({
            guildId,
            action,
            executorId: executor.id,
            executorTag: executor.tag,
            targetId: target?.id || roleId,
            targetTag: target?.tag || roleName,
            targetType: target ? 'USER' : 'ROLE',
            details: { roleId, roleName }
        });
    }

    /**
     * Get recent logs for guild
     */
    async getRecentLogs(guildId, limit = 50) {
        await this.flushBuffer(); // Ensure all logs are saved
        return AuditLog.getRecentLogs(guildId, limit);
    }

    /**
     * Get logs by user
     */
    async getLogsByUser(guildId, userId, limit = 50) {
        await this.flushBuffer();
        return AuditLog.getLogsByUser(guildId, userId, limit);
    }

    /**
     * Get logs by action type
     */
    async getLogsByAction(guildId, action, limit = 50) {
        await this.flushBuffer();
        return AuditLog.getLogsByAction(guildId, action, limit);
    }

    /**
     * Get statistics
     */
    async getStats(guildId, days = 30) {
        await this.flushBuffer();
        return AuditLog.getStats(guildId, days);
    }

    /**
     * Search logs
     */
    async searchLogs(guildId, query) {
        await this.flushBuffer();
        
        const filter = { guildId };
        
        if (query.action) filter.action = query.action;
        if (query.executorId) filter.executorId = query.executorId;
        if (query.targetId) filter.targetId = query.targetId;
        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
            if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
        }
        
        return AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(query.limit || 100)
            .lean();
    }
}

// Export singleton instance
module.exports = new AuditLogger();
