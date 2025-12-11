const mongoose = require("mongoose");

const exclusiveItemSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  slots: { type: Number, required: true },
  buyers: { type: [String], default: [] },
  confirmedBuyers: { type: [String], default: [] },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExclusiveItem", exclusiveItemSchema);