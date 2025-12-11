const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  prize: { type: String, required: true },
  winnerCount: { type: Number, required: true, min: 1 },
  hostId: { type: String, required: true },
  endAt: { type: Date, required: true },
  ended: { type: Boolean, default: false, index: true },
}, {
  timestamps: true
});

// Index untuk query giveaway aktif
giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endAt: 1 });

module.exports = mongoose.model("Giveaway", giveawaySchema);