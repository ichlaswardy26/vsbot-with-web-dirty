const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "close",
  description: "Menutup ticket partnership.",
  async exec(client, message, args) {
    const staffRoleId = config.roles.staff; // 🧑‍💼 Role staff
    const logChannelId = config.channels.ticketLogs; // 🧾 Channel log partnership

    // 🛑 Pastikan user memiliki role staff
    if (!staffRoleId || !message.member.roles.cache.has(staffRoleId)) {
      return message.reply("❌ Hanya **staff** yang dapat menutup ticket ini.");
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
