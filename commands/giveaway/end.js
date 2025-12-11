const Giveaway = require("../../schemas/Giveaway");
const { endGiveaway } = require("../../handlers/giveawayHandler");
const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "giveaway-end",
  description: "Akhiri giveaway sekarang (admin). Usage: giveaway-end <messageId>",
  async exec(client, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ Kamu tidak punya izin.");
    }
    const messageId = args[0];
    if (!messageId) return message.reply("Berikan messageId giveaway.");

    const g = await Giveaway.findOne({ messageId });
    if (!g) return message.reply("Giveaway tidak ditemukan.");

    if (g.ended) return message.reply("Giveaway sudah berakhir.");

    await endGiveaway(client, g);
//    return message.reply("✅ Giveaway diakhiri.");
  }
};
