const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "close",
  description: "Menutup ticket partnership.",
  async exec(client, message, args) {
    const staffRoleId = "1376956790700511352"; // 🧑‍💼 Role staff
    const logChannelId = "1376956791757209773"; // 🧾 Channel log partnership

    // 🛑 Pastikan user memiliki role staff
    if (!message.member.roles.cache.has(staffRoleId)) {
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
        const logChannel = message.guild.channels.cache.get(logChannelId);
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
