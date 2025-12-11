const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  characters: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
});

activitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);