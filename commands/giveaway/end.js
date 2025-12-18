const { EmbedBuilder } = require("discord.js");
const Giveaway = require("../../schemas/Giveaway");
const { endGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway-end",
  aliases: ["gend", "gw-end"],
  description: "Akhiri giveaway sekarang",
  category: "giveaway",
  usage: "giveaway-end <messageId>",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const messageId = args[0];
    if (!messageId) {
      const helpEmbed = new EmbedBuilder()
        .setTitle("🛑 Akhiri Giveaway")
        .setDescription("Gunakan command ini untuk mengakhiri giveaway lebih awal.")
        .setColor(config.colors?.info || "#5865F2")
        .addFields(
          { name: "📝 Format", value: "`giveaway-end <messageId>`", inline: false },
          { name: "💡 Cara Mendapatkan Message ID", value: "Klik kanan pada pesan giveaway → Copy Message ID", inline: false }
        )
        .setFooter({ text: "Pastikan Developer Mode aktif di Discord Settings" });
        
      return message.reply({ embeds: [helpEmbed] });
    }

    try {
      const g = await Giveaway.findOne({ messageId });
      if (!g) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Giveaway dengan ID tersebut tidak ditemukan.`);
      }

      if (g.ended) {
        return message.reply(`${config.emojis?.warning || "⚠️"} **|** Giveaway ini sudah berakhir sebelumnya.`);
      }

      await endGiveaway(client, g);
      
      const successEmbed = new EmbedBuilder()
        .setTitle("🛑 Giveaway Diakhiri")
        .setDescription(`Giveaway **${g.prize}** telah diakhiri!`)
        .setColor(config.colors?.success || "#57F287")
        .setFooter({ text: `Diakhiri oleh ${message.author.username}` })
        .setTimestamp();
        
      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("[giveaway-end] Error:", error.message);
      return message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengakhiri giveaway.`);
    }
  }
};
