const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "purchases",
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
        .setTitle(`${config.emojis?.info || 'ℹ️'} Tidak Ada Item`)
        .setDescription('Belum ada item exclusive di shop.')
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors?.primary || '#5865F2')
      .setTitle("🧾 Daftar Pembelian Item Exclusive")
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
      .setDescription(
        items
          .map((item) => {
            const buyersList = item.buyers.length
              ? item.buyers.map((id) => `<@${id}>`).join(", ")
              : "_Belum ada pembeli_";
            return `**📦 ${item.name}**\n${config.emojis?.souls || '💰'} ${item.price.toLocaleString()} | 🎟️ ${item.buyers.length}/${item.slots} slot\n👥 ${buyersList}`;
          })
          .join("\n\n")
      )
      .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
