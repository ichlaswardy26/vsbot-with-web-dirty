const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "avatar",
  description: "Display user avatar",
  aliases: ["pfp", "ava"],
  category: "utility",

  async exec(client, message, args) {
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.member;

    const avatarURL = member.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar - ${member.user.tag}`)
      .setImage(avatarURL)
      .setColor(0x00bfff)
      .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    message.channel.send({ embeds: [embed] });
  },
};
