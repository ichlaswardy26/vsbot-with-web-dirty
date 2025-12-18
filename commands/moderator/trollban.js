const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "ban",
  description: "Menampilkan embed ban palsu (troll) tanpa benar-benar mem-ban member",
  category: "moderator",
  usage: "ban @user [alasan]",
  
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const target = message.mentions.members.first();
    if (!target) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Tampilkan embed ban palsu untuk member.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}ban @user [alasan]\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}ban @User Melanggar aturan\``, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    if (target.id === message.author.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Tidak Bisa Ban Diri Sendiri`)
        .setDescription('Kamu tidak bisa ban diri sendiri!')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    const reason = args.slice(1).join(" ") || "Tidak ada alasan diberikan.";

    try {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle("🔨 Member Telah Di-Ban!")
        .setDescription(`**${target}** telah di-ban dari server ini!`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: "👮 Moderator", value: `${message.author}`, inline: true },
          { name: "🎯 Target", value: `${target}`, inline: true },
          { name: "📝 Alasan", value: reason, inline: false }
        )
        .setImage('https://media.giphy.com/media/fe4dDMD2cAU5RfEaCU/giphy.gif')
        .setFooter({ text: `${message.guild.name} • Ban System`, iconURL: message.guild.iconURL() })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      try {
        await message.react("🔨");
      } catch (error) {
        // Ignore reaction errors
      }

    } catch (error) {
      console.error("Error sending troll ban embed:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal menjalankan perintah. Silakan coba lagi.')
        .setTimestamp();
      message.reply({ embeds: [errorEmbed] });
    }
  },
};
