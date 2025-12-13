const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "close",
  description: "Menutup ticket partnership.",
  async exec(client, message) {
    const logChannelId = config.channels.ticketLogs; // 🧾 Channel log partnership

    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'ticket');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const channel = message.channel;

    // ⚠️ Pastikan command digunakan di channel partner
    if (!channel.name.startsWith("partner-")) {
      return message.reply("⚠️ Command ini hanya dapat digunakan di channel ticket partnership.");
    }

    await message.reply("🕐 Ticket akan ditutup dalam 5 detik...");

    // ⏳ Delay sebelum menghapus channel
    setTimeout(async () => {
      try {
        // 📋 Kirim log sebelum channel dihapus
        const logChannel = logChannelId ? message.guild.channels.cache.get(logChannelId) : null;
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🗑️ Ticket Partnership Ditutup")
            .setColor("Red")
            .addFields(
              { name: "👤 Ditutup oleh", value: `${message.author.tag}`, inline: true },
              { name: "📁 Channel", value: `${channel.name}`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        }

        // 🧹 Hapus channel
        await channel.delete();
      } catch (err) {
        console.error("Gagal menghapus channel:", err);
      }
    }, 5000);
  },
};
