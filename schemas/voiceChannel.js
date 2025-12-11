const { Schema, model } = require("mongoose");

const voiceChannelSchema = new Schema({
  channelId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  guildId: { type: String, required: true },

  allowedControllers: { type: [String], default: [] }, // user yang bisa setting
  bannedUsers: { type: [String], default: [] }, // user yang diban
  notificationsEnabled: { type: Boolean, default: true }, // notifikasi join/leave

  // New fields for enhanced permission states
  locked: { type: Boolean, default: false }, // channel dikunci, hanya owner dan trusted yang bisa join
  hidden: { type: Boolean, default: false }, // channel disembunyikan, hanya owner dan trusted yang bisa lihat

  createdAt: { type: Date },
});

module.exports = model("VoiceChannel", voiceChannelSchema);