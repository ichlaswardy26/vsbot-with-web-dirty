const mongoose = require("mongoose");

const ConfessionStateSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  lastMessageId: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("ConfessionState", ConfessionStateSchema);