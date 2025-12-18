const { EmbedBuilder } = require("discord.js");
const Economy = require("../../schemas/UserBalance");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "resetcurrency",
  aliases: ["resetcash", "resetsouls"],
  description: "Reset semua saldo souls atau milik satu user saja",
  category: "economy",
  usage: "resetsouls [@user]",
  async exec(client, message) {
    try {
      const permissionError = rolePermissions.checkPermission(message.member, 'economy');
      if (permissionError) {
        return message.reply(permissionError);
      }

      const targetUser = message.mentions.users.first();

      if (targetUser) {
        const result = await Economy.findOneAndUpdate(
          { userId: targetUser.id, guildId: message.guild.id },
          { cash: 0 },
          { new: true }
        );

        if (result) {
          const successEmbed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle(`${config.emojis?.check || '✅'} Saldo Berhasil Direset`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
              { name: '👤 User', value: `${targetUser}`, inline: true },
              { name: `${config.emojis?.souls || '💰'} Saldo Sekarang`, value: '0', inline: true }
            )
            .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
          return message.reply({ embeds: [successEmbed] });
        } else {
          const errorEmbed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`${config.emojis?.cross || '❌'} Data Tidak Ditemukan`)
            .setDescription(`Tidak ditemukan data ekonomi untuk ${targetUser}.`)
            .setTimestamp();
          return message.reply({ embeds: [errorEmbed] });
        }
      } else {
        await Economy.updateMany({ guildId: message.guild.id }, { $set: { cash: 0 } });
        
        const successEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`💀 Reset Saldo Server`)
          .setDescription('Semua saldo souls di server ini telah direset ke **0**.')
          .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
          .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
        return message.reply({ embeds: [successEmbed] });
      }
    } catch (error) {
      console.error("[resetsouls] Error:", error.message);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mereset saldo. Silakan coba lagi.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
