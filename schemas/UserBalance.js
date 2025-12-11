const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    cash: {
        type: Number,
        default: 0,
        min: 0
    },
    lastDaily: {
        type: Date,
        default: null
    },
    lastCollect: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index untuk memastikan satu user hanya memiliki satu data economy per server
economySchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Economy', economySchema);