const mongoose = require("mongoose");

const voiceActivitySchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    voiceSeconds: { // durasi voice dalam detik
      type: Number,
      default: 0,
      min: 0,
    },
    lastJoinedAt: { // waktu terakhir join voice, untuk hitung durasi
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // menyimpan createdAt dan updatedAt
  }
);

// Index unik per user per guild
voiceActivitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("VoiceActivity", voiceActivitySchema);