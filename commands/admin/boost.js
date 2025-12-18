const { EmbedBuilder } = require('discord.js');
const Boost = require('../../schemas/Boost');
const config = require('../../config.js');

module.exports = {
  name: 'boost',
  description: 'Aktifkan XP Boost untuk server ini',
  category: 'admin',
  usage: '<jam> <x1/x2/x3/...>',
  async exec(client, message, args) {
    try {
      const rolePermissions = require("../../util/rolePermissions");
      
      const permissionError = rolePermissions.checkPermission(message.member, 'admin');
      if (permissionError) {
        return message.reply(permissionError);
      }

      const hours = parseInt(args[0]);
      const multiplierArg = args[1];

      if (isNaN(hours) || hours <= 0 || !multiplierArg) {
        const helpEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan XP Boost`)
          .setDescription('Aktifkan XP Boost untuk seluruh server.')
          .addFields(
            { name: '📝 Format', value: `\`${config.prefix}boost <jam> <multiplier>\``, inline: false },
            { name: '📌 Contoh', value: `\`${config.prefix}boost 2 x3\` - Boost x3 selama 2 jam`, inline: false },
            { name: '💡 Multiplier', value: 'Gunakan format x1, x2, x3, dst.', inline: false }
          )
          .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
        return message.reply({ embeds: [helpEmbed] });
      }

      const multiplier = parseInt(multiplierArg.replace('x', ''));
      if (isNaN(multiplier) || multiplier < 1) {
        const errorEmbed = new EmbedBuilder()
          .setColor(config.colors?.error || '#ED4245')
          .setTitle(`${config.emojis?.cross || '❌'} Format Multiplier Salah`)
          .setDescription('Multiplier harus dalam format **x1**, **x2**, **x3**, dst.')
          .setTimestamp();
        return message.reply({ embeds: [errorEmbed] });
      }

      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      const boost = await Boost.findOneAndUpdate(
        { guildId: message.guild.id },
        { multiplier, expiresAt },
        { upsert: true, new: true }
      );

      const successEmbed = new EmbedBuilder()
        .setColor(config.colors?.success || '#57F287')
        .setTitle(`${config.emojis?.rocket || '🚀'} XP Boost Diaktifkan!`)
        .setDescription('Server sekarang mendapatkan bonus XP!')
        .addFields(
          { name: '✨ Multiplier', value: `**x${boost.multiplier}**`, inline: true },
          { name: '⏱️ Durasi', value: `**${hours} jam**`, inline: true },
          { name: '📅 Berakhir Pada', value: `<t:${Math.floor(boost.expiresAt.getTime() / 1000)}:F>`, inline: false }
        )
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Diaktifkan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.channel.send({ embeds: [successEmbed] });
    } catch (err) {
      console.error('Error in boost command:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mengaktifkan boost. Silakan coba lagi.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }
  }
};
