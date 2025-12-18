const mongoose = require('mongoose');

/**
 * Level Reward Schema
 * Stores automatic role rewards for reaching certain levels
 */
const levelRewardSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    level: {
        type: Number,
        required: true,
        min: 1
    },
    roleId: {
        type: String,
        required: true
    },
    roleName: {
        type: String
    },
    removeOnHigher: {
        type: Boolean,
        default: false // Remove this role when user gets higher level role
    },
    soulsBonus: {
        type: Number,
        default: 0 // Bonus souls when reaching this level
    },
    announcement: {
        enabled: { type: Boolean, default: true },
        message: { type: String, default: '🎉 {user} has reached level {level} and earned the {role} role!' }
    },
    createdBy: {
        type: String
    }
}, {
    timestamps: true
});

// Compound index for unique level rewards per guild
levelRewardSchema.index({ guildId: 1, level: 1 }, { unique: true });

// Statics
levelRewardSchema.statics.getRewardsForGuild = async function(guildId) {
    return this.find({ guildId }).sort({ level: 1 }).lean();
};

levelRewardSchema.statics.getRewardForLevel = async function(guildId, level) {
    return this.findOne({ guildId, level }).lean();
};

levelRewardSchema.statics.getRewardsUpToLevel = async function(guildId, level) {
    return this.find({ guildId, level: { $lte: level } }).sort({ level: 1 }).lean();
};

levelRewardSchema.statics.addReward = async function(guildId, level, roleId, roleName, options = {}) {
    return this.findOneAndUpdate(
        { guildId, level },
        {
            roleId,
            roleName,
            removeOnHigher: options.removeOnHigher || false,
            soulsBonus: options.soulsBonus || 0,
            announcement: options.announcement || { enabled: true },
            createdBy: options.createdBy
        },
        { upsert: true, new: true }
    );
};

levelRewardSchema.statics.removeReward = async function(guildId, level) {
    return this.findOneAndDelete({ guildId, level });
};

module.exports = mongoose.model('LevelReward', levelRewardSchema);
