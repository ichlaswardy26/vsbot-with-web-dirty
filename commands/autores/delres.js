const { EmbedBuilder } = require('discord.js');
const Responder = require('../../schemas/autoresponder');
const config = require('../../config.js');

module.exports = {
  name: 'deleteresponder',
  aliases: ["delres"],
  description: 'Hapus autoresponder berdasarkan trigger atau nomor index',
  category: 'autores',
  usage: 'delres <trigger/index>',
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    const input = args[0];
    if (!input) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Hapus autoresponder berdasarkan trigger atau nomor index.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}delres <trigger>\` atau \`${config.prefix}delres <nomor>\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}delres welcome\` atau \`${config.prefix}delres 1\``, inline: false }
        )
        .setFooter({ text: `Gunakan ${config.prefix}listres untuk melihat semua autoresponder` })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    try {
      const index = parseInt(input);
      
      if (!isNaN(index) && index > 0) {
        const responders = await Responder.find();
        
        if (index > responders.length) {
          const errorEmbed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`${config.emojis?.cross || '❌'} Index Tidak Valid`)
            .setDescription(`Hanya ada ${responders.length} autoresponder. Gunakan \`${config.prefix}listres\` untuk melihat daftar.`)
            .setTimestamp();
          return message.reply({ embeds: [errorEmbed] });
        }
        
        const responderToDelete = responders[index - 1];
        const result = await Responder.findByIdAndDelete(responderToDelete._id);
        
        if (!result) {
          const errorEmbed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`${config.emojis?.cross || '❌'} Gagal Menghapus`)
            .setDescription('Gagal menghapus autoresponder.')
            .setTimestamp();
          return message.reply({ embeds: [errorEmbed] });
        }
        
        const successEmbed = new EmbedBuilder()
          .setColor(config.colors?.success || '#57F287')
          .setTitle(`${config.emojis?.check || '✅'} Autoresponder Dihapus`)
          .addFields(
            { name: '🔢 Nomor', value: `#${index}`, inline: true },
            { name: '🎯 Trigger', value: `\`${responderToDelete.trigger}\``, inline: true },
            { name: '💬 Response', value: responderToDelete.response.substring(0, 100), inline: false }
          )
          .setFooter({ text: `Dihapus oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
        message.reply({ embeds: [successEmbed] });
        
      } else {
        const result = await Responder.findOneAndDelete({ trigger: input });
        
        if (!result) {
          const errorEmbed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`${config.emojis?.cross || '❌'} Tidak Ditemukan`)
            .setDescription(`Autoresponder dengan trigger \`${input}\` tidak ditemukan.`)
            .setFooter({ text: `Gunakan ${config.prefix}listres untuk melihat daftar` })
            .setTimestamp();
          return message.reply({ embeds: [errorEmbed] });
        }
        
        const successEmbed = new EmbedBuilder()
          .setColor(config.colors?.success || '#57F287')
          .setTitle(`${config.emojis?.check || '✅'} Autoresponder Dihapus`)
          .addFields(
            { name: '🎯 Trigger', value: `\`${input}\``, inline: true },
            { name: '💬 Response', value: result.response.substring(0, 100), inline: false }
          )
          .setFooter({ text: `Dihapus oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
        message.reply({ embeds: [successEmbed] });
      }
      
    } catch (err) {
      console.error('Error in deleteresponder command:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal menghapus autoresponder. Silakan coba lagi.')
        .setTimestamp();
      message.reply({ embeds: [errorEmbed] });
    }
  },
};
