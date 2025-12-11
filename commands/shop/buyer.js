const { EmbedBuilder } = require("discord.js");
const ExclusiveItem = require("../../schemas/ExclusiveItem");

module.exports = {
  name: "buyer",
  description: "Lihat daftar pembeli item exclusive",
  async exec(client, message) {
    // 🔒 hanya admin
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini!");
    }

    // 📦 ambil semua item exclusive
    const items = await ExclusiveItem.find({ guildId: message.guild.id });
    if (!items.length) {
      return message.reply("⚠️ Tidak ada item exclusive di server ini.");
    }

    // 📜 buat embed daftar pembeli
    const embed = new EmbedBuilder()
      .setTitle("📜 Daftar Pembeli Item Exclusive")
      .setColor(0xffd700)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({
        text: `Diminta oleh ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      });

    let desc = "";

    for (const item of items) {
      if (!item.buyers.length) {
        desc += `**${item.name}** — belum ada pembeli.\n\n`;
        continue;
      }

      desc += `**${item.name}**\n`;

      for (const buyerId of item.buyers) {
        const member = await message.guild.members.fetch(buyerId).catch(() => null);
        const name = member ? member.user.tag : `Unknown (${buyerId})`;
        desc += `• ${name}\n`;
      }

      desc += "\n";
    }

    embed.setDescription(desc || "Belum ada pembeli terdaftar.");

    message.channel.send({ embeds: [embed] });
  },
};
