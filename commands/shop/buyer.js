const { EmbedBuilder } = require("discord.js");
const ExclusiveItem = require("../../schemas/ExclusiveItem");
const config = require("../../config.js");

module.exports = {
  name: "buyer",
  description: "Lihat daftar pembeli item exclusive",
  category: "shop",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const items = await ExclusiveItem.find({ guildId: message.guild.id });
    if (!items.length) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Tidak Ada Item Exclusive`)
        .setDescription('Belum ada item exclusive di server ini.')
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors?.primary || '#5865F2')
      .setTitle("📜 Daftar Pembeli Item Exclusive")
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({
        text: `Diminta oleh ${message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      });

    let desc = "";

    for (const item of items) {
      if (!item.buyers.length) {
        desc += `**📦 ${item.name}** — _belum ada pembeli_\n\n`;
        continue;
      }

      desc += `**📦 ${item.name}** (${item.buyers.length} pembeli)\n`;

      for (const buyerId of item.buyers) {
        const member = await message.guild.members.fetch(buyerId).catch(() => null);
        const name = member ? member.user.username : `Unknown (${buyerId})`;
        desc += `└ 👤 ${name}\n`;
      }

      desc += "\n";
    }

    embed.setDescription(desc || "Belum ada pembeli terdaftar.");

    message.channel.send({ embeds: [embed] });
  },
};
