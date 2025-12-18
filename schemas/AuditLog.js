const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * Stores all moderation and admin actions for accountability
 */
const auditLogSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            // Moderation actions
            'WARN', 'MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN', 'TIMEOUT',
            // Message actions
            'MESSAGE_DELETE', 'MESSAGE_BULK_DELETE', 'MESSAGE_EDIT',
            // Channel actions
            'CHANNEL_CREATE', 'CHANNEL_DELETE', 'CHANNEL_UPDATE',
            // Role actions
            'ROLE_CREATE', 'ROLE_DELETE', 'ROLE_UPDATE', 'ROLE_ASSIGN', 'ROLE_REMOVE',
            // Member actions
            'MEMBER_UPDATE', 'NICKNAME_CHANGE',
            // Economy actions
            'SOULS_ADD', 'SOULS_REMOVE', 'SOULS_RESET', 'SOULS_TRANSFER',
            // Level actions
            'XP_ADD', 'XP_REMOVE', 'XP_RESET', 'LEVEL_SET',
            // Config actions
            'CONFIG_UPDATE', 'FEATURE_TOGGLE',
            // Ticket actions
            'TICKET_CREATE', 'TICKET_CLOSE', 'TICKET_CLAIM',
            // Giveaway actions
            'GIVEAWAY_CREATE', 'GIVEAWAY_END', 'GIVEAWAY_REROLL',
            // AutoMod actions
            'AUTOMOD_TRIGGER', 'AUTOMOD_CONFIG',
            // Custom role actions
            'CUSTOM_ROLE_CREATE', 'CUSTOM_ROLE_DELETE', 'CUSTOM_ROLE_UPDATE',
            // Other
            'OTHER'
        ]
    },
    executorId: {
        type: String,
        required: true,
        index: true
    },
    executorTag: {
        type: String
    },
    targetId: {
        type: String,
        index: true
    },
    targetTag: {
        type: String
    },
    targetType: {
        type: String,
        enum: ['USER', 'ROLE', 'CHANNEL', 'MESSAGE', 'GUILD', 'OTHER']
    },
    reason: {
        type: String,
        maxlength: 1000
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    changes: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }],
    metadata: {
        channelId: String,
        messageId: String,
        duration: Number, // For timeouts/mutes in ms
        automated: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ guildId: 1, createdAt: -1 });
auditLogSchema.index({ guildId: 1, action: 1 });
auditLogSchema.index({ guildId: 1, executorId: 1 });
auditLogSchema.index({ guildId: 1, targetId: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

// Static methods
auditLogSchema.statics.logAction = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging audit action:', error);
        return null;
    }
};

auditLogSchema.statics.getRecentLogs = async function(guildId, limit = 50) {
    return this.find({ guildId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

auditLogSchema.statics.getLogsByUser = async function(guildId, userId, limit = 50) {
    return this.find({ 
        guildId,
        $or: [{ executorId: userId }, { targetId: userId }]
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

auditLogSchema.statics.getLogsByAction = async function(guildId, action, limit = 50) {
    return this.find({ guildId, action })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

auditLogSchema.statics.getStats = async function(guildId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await this.aggregate([
        {
            $match: {
                guildId,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
    
    return stats;
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
