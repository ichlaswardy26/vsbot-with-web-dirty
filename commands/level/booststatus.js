const { EmbedBuilder } = require('discord.js');
const Boost = require('../../schemas/Boost');

module.exports = {
  name: 'booststatus',
  description: 'Cek status boost di server',
  async exec(client, message) {
    try {
      const boost = await Boost.findOne({ guildId: message.guild.id });

      // Jika tidak ada boost aktif
      if (!boost || !boost.isActive()) {
        const noBoostEmbed = new EmbedBuilder()
          .setColor(0xffcc00)
          .setTitle('⚡ XP Boost')
          .setDescription('ℹ️ **Tidak ada XP Boost aktif di server ini.**')
          .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();

          return message.reply({ embeds: [noBoostEmbed] });
      }

      // Jika ada boost aktif
      const boostEmbed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle('⚡ XP Boost Aktif!')
        .addFields(
          { name: 'Multiplier', value: `x${boost.multiplier}`, inline: true },
          { name: 'Berakhir Dalam', value: `<t:${Math.floor(boost.expiresAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [boostEmbed] });

    } catch (err) {
      console.error('Error in booststatus command:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Terjadi Kesalahan')
        .setDescription('Gagal mengecek status boost. Coba lagi nanti.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
