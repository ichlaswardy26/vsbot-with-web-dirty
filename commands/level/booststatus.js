const { EmbedBuilder } = require('discord.js');
const Boost = require('../../schemas/Boost');
const config = require('../../config.js');

module.exports = {
  name: 'booststatus',
  description: 'Cek status XP boost di server',
  category: 'level',
  async exec(client, message) {
    try {
      const boost = await Boost.findOne({ guildId: message.guild.id });

      if (!boost || !boost.isActive()) {
        const noBoostEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`${config.emojis?.info || 'ℹ️'} Status XP Boost`)
          .setDescription('Tidak ada XP Boost aktif di server ini.')
          .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: '💡 Tips', value: `Admin dapat mengaktifkan boost dengan \`${config.prefix}boost <jam> <multiplier>\``, inline: false }
          )
          .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();

        return message.reply({ embeds: [noBoostEmbed] });
      }

      const boostEmbed = new EmbedBuilder()
        .setColor(config.colors?.success || '#57F287')
        .setTitle(`${config.emojis?.rocket || '🚀'} XP Boost Aktif!`)
        .setDescription('Server sedang mendapatkan bonus XP!')
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '✨ Multiplier', value: `**x${boost.multiplier}**`, inline: true },
          { name: '⏰ Berakhir Dalam', value: `<t:${Math.floor(boost.expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: '📅 Berakhir Pada', value: `<t:${Math.floor(boost.expiresAt.getTime() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [boostEmbed] });

    } catch (err) {
      console.error('Error in booststatus command:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mengecek status boost. Coba lagi nanti.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
