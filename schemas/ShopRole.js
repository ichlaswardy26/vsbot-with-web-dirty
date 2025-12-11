const mongoose = require("mongoose");

const ShopRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  roleId: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: "" },
  exclusive: { type: Boolean, default: false },
  slots: { type: Number, default: 0 },
  buyers: { type: [String], default: [] },
  expiresAt: { type: Date, default: null },

  // ✴️ Tambahan baru:
  gradient: { type: Boolean, default: false }, // ON / OFF
  rarity: {
    type: String,
    enum: ["Common", "Rare", "Epic", "Legendary", "Transcendent"],
    default: "Common",
  },
});

module.exports = mongoose.model("ShopRole", ShopRoleSchema);