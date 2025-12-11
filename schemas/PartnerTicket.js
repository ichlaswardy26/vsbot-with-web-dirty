const { Schema, model } = require("mongoose");

const partnerTicketSchema = new Schema({
  guildId: String,
  userId: String,
  channelId: String,
  serverName: String,
  serverLink: String,
  confirmReq: String,
  status: { type: String, default: "open" },
  createdAt: Date,
  closedAt: Date,
});

module.exports = model("PartnerTicket", partnerTicketSchema);
