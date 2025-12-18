const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "avatar",
  description: "Menampilkan avatar user",
  aliases: ["pfp", "ava"],
  category: "utility",

  async exec(client, message, args) {
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.member;

    const avatarURL = member.displayAvatarURL({ dynamic: true, size: 1024 });
    const globalAvatarURL = member.user.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Avatar ${member.user.username}`)
      .setDescription(`Avatar dari **${member.user.tag}**`)
      .setImage(avatarURL)
      .setColor(config.colors?.primary || "#5865F2")
      .addFields(
        { name: "👤 User", value: `${member.user}`, inline: true },
        { name: "🆔 ID", value: `\`${member.user.id}\``, inline: true }
      )
      .setFooter({ 
        text: `Diminta oleh ${message.author.username}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTimestamp();

    // Create buttons for different sizes
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("128px")
        .setStyle(ButtonStyle.Link)
        .setURL(member.displayAvatarURL({ size: 128 })),
      new ButtonBuilder()
        .setLabel("256px")
        .setStyle(ButtonStyle.Link)
        .setURL(member.displayAvatarURL({ size: 256 })),
      new ButtonBuilder()
        .setLabel("512px")
        .setStyle(ButtonStyle.Link)
        .setURL(member.displayAvatarURL({ size: 512 })),
      new ButtonBuilder()
        .setLabel("1024px")
        .setStyle(ButtonStyle.Link)
        .setURL(member.displayAvatarURL({ size: 1024 }))
    );

    message.channel.send({ embeds: [embed], components: [row] });
  },
};
