const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "itemid",
  description: "Lihat item exclusive yang sudah kamu beli",
  category: "shop",
  async exec(client, message) {
    const userId = message.author.id;
    const items = await ExclusiveItem.find({ 
      guildId: message.guild.id,
      buyers: userId
    });

    if (!items.length) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Belum Ada Item`)
        .setDescription('Kamu belum membeli item exclusive apa pun.')
        .addFields({ name: '💡 Tips', value: `Gunakan \`${config.prefix}shop\` untuk melihat item yang tersedia.` })
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors?.primary || '#5865F2')
      .setTitle("🧾 Item Exclusive Kamu")
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        items
          .map((item, i) => {
            const unix = Math.floor(item.expiresAt.getTime() / 1000);
            return `**${i + 1}. ${item.name}**\n${config.emojis?.souls || '💰'} ${item.price.toLocaleString()} | ⏳ Berakhir <t:${unix}:R>`;
          })
          .join("\n\n")
      )
      .setFooter({ text: "Hubungi admin untuk claim item kamu!", iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
