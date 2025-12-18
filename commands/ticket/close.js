const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "close",
  description: "Menutup ticket partnership.",
  category: "ticket",
  usage: "close",
  async exec(client, message) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'ticket');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const warningEmoji = config.emojis?.warning || "⚠️";
    const channel = message.channel;

    // Pastikan command digunakan di channel ticket
    if (!channel.name.startsWith("partner-") && !channel.name.startsWith("ticket-")) {
      return message.reply(`${warningEmoji} **|** Command ini hanya dapat digunakan di channel ticket.`);
    }

    await message.reply("🕐 Ticket akan ditutup dalam 5 detik...");

    // Delay sebelum menghapus channel
    setTimeout(async () => {
      try {
        // Kirim log sebelum channel dihapus
        const logChannelId = config.channels?.ticketLogs;
        const logChannel = logChannelId ? message.guild.channels.cache.get(logChannelId) : null;
        
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🗑️ Ticket Ditutup")
            .setColor(config.colors?.error || "Red")
            .addFields(
              { name: "👤 Ditutup oleh", value: `${message.author.tag}`, inline: true },
              { name: "📁 Channel", value: `${channel.name}`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        }

        // Hapus channel
        await channel.delete();
      } catch (err) {
        console.error("[close] Error:", err.message);
      }
    }, 5000);
  },
};
