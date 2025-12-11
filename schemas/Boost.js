const mongoose = require("mongoose");

const boostSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: [true, "Guild ID is required"],
      trim: true,
    },
    multiplier: {
      type: Number,
      default: 1,
      min: [1, "Multiplier minimal x1"],
      max: [10, "Multiplier terlalu besar (max x10)"], // 🔒 batas aman
    },
    expiresAt: {
      type: Date,
      required: [true, "Waktu expired boost harus ditentukan"],
    },
  },
  {
    timestamps: true, // otomatis buat createdAt dan updatedAt
  }
);

// Index supaya 1 server cuma punya 1 boost aktif
boostSchema.index({ guildId: 1 }, { unique: true });

// Helper method: cek apakah boost masih aktif
boostSchema.methods.isActive = function () {
  // Jika expired, return false
  if (!this.expiresAt) return false;
  return new Date() < this.expiresAt;
};

// Middleware otomatis hapus boost expired
boostSchema.statics.cleanupExpired = async function () {
  const now = new Date();
  await this.deleteMany({ expiresAt: { $lte: now } });
};

// Jalankan pembersihan otomatis setiap kali model di-load
setInterval(async () => {
  try {
    await Boost.cleanupExpired();
  } catch (err) {
    console.error("Boost cleanup error:", err);
  }
}, 1000 * 60 * 30); // setiap 30 menit

const Boost = mongoose.model("Boost", boostSchema);

// Tangkap error model
Boost.on("error", (err) => {
  console.error("Boost Model Error:", err);
});

module.exports = Boost;