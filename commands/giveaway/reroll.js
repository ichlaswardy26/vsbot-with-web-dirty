const { rerollGiveaway } = require("../../handlers/giveawayHandler");
const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "giveaway-reroll",
  description: "Reroll winners from a giveaway message. Usage: giveaway-reroll <messageId>",
  async exec(client, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ Kamu tidak punya izin.");
    }
    const messageId = args[0];
    if (!messageId) return message.reply("Berikan messageId giveaway.");

    const res = await rerollGiveaway(client, messageId);
    if (!res.ok) return message.reply(`❌ Gagal: ${res.reason}`);
//    return message.reply(`✅ Reroll selesai. Winners selected.`);
  }
};
