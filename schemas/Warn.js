const mongoose = require("mongoose");

const warnSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    trim: true
  },
  moderatorId: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    default: "No reason provided"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index untuk query warns per user per guild
warnSchema.index({ guildId: 1, userId: 1 });
warnSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Warn", warnSchema);