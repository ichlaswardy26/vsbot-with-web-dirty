const { Schema, model } = require("mongoose");

const ticketSchema = new Schema({
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
  channelId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  closedAt: {
    type: Date,
    default: null
  },
  status: { 
    type: String, 
    enum: ["open", "closed"], 
    default: "open",
    index: true
  },
}, {
  timestamps: true
});

// Index untuk query tickets per guild dan status
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ userId: 1, guildId: 1 });

module.exports = model("Ticket", ticketSchema);