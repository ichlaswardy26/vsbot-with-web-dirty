const { EmbedBuilder } = require("discord.js");
const { rerollGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway-reroll",
  aliases: ["greroll", "gw-reroll"],
  description: "Reroll pemenang dari giveaway yang sudah berakhir",
  category: "giveaway",
  usage: "giveaway-reroll <messageId>",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const messageId = args[0];
    if (!messageId) {
      const helpEmbed = new EmbedBuilder()
        .setTitle("🔄 Reroll Giveaway")
        .setDescription("Gunakan command ini untuk memilih pemenang baru dari giveaway yang sudah berakhir.")
        .setColor(config.colors?.info || "#5865F2")
        .addFields(
          { name: "📝 Format", value: "`giveaway-reroll <messageId>`", inline: false },
          { name: "💡 Cara Mendapatkan Message ID", value: "Klik kanan pada pesan giveaway → Copy Message ID", inline: false }
        )
        .setFooter({ text: "Pastikan Developer Mode aktif di Discord Settings" });
        
      return message.reply({ embeds: [helpEmbed] });
    }

    try {
      const res = await rerollGiveaway(client, messageId);
      if (!res.ok) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Gagal: ${res.reason}`);
      }
      
      const successEmbed = new EmbedBuilder()
        .setTitle("🔄 Reroll Berhasil")
        .setDescription(`Pemenang baru telah dipilih!`)
        .setColor(config.colors?.success || "#57F287")
        .setFooter({ text: `Direroll oleh ${message.author.username}` })
        .setTimestamp();
        
      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("[giveaway-reroll] Error:", error.message);
      return message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat reroll giveaway.`);
    }
  }
};
