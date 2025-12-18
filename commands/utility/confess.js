const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "confess",
  description: "Tampilkan panel confession",
  category: "utility",

  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    const embed = new EmbedBuilder()
      .setColor(config.colors?.primary || '#5865F2')
      .setTitle(`${config.emojis?.ticket || '📝'} Panel Confession`)
      .setDescription('Bagikan perasaan atau ceritamu secara anonim!\n\nKlik tombol di bawah untuk mengirim confession.')
      .addFields(
        { name: '🔒 Privasi', value: 'Identitasmu akan dirahasiakan', inline: true },
        { name: '📜 Aturan', value: 'Jaga sopan santun', inline: true }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_confession")
        .setLabel("📝 Kirim Confession")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  },
};
