const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true 
    },
    guildId: { 
        type: String, 
        required: true 
    },
    username: {
        type: String,
        required: true
    },
    // Daily stats (reset every day)
    dailyXP: {
        type: Number,
        default: 0
    },
    lastDailyReset: {
        type: Date,
        default: Date.now
    },
    // Monthly stats (reset every month)
    monthlyXP: {
        type: Number,
        default: 0
    },
    lastMonthlyReset: {
        type: Date,
        default: Date.now
    },
    // Yearly stats (reset every year)
    yearlyXP: {
        type: Number,
        default: 0
    },
    lastYearlyReset: {
        type: Date,
        default: Date.now
    },
    // Lifetime stats (never reset)
    lifetimeXP: {
        type: Number,
        default: 0
    }
});

// Compound index for efficient querying
leaderboardSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);