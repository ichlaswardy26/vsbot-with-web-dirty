const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  name: "confess",
  description: "Display confession panel",
  category: "utility",

  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    const embed = new EmbedBuilder()
      .setTitle("Confessions Panel")
      .setDescription("📝 Klik tombol dibawah untuk memulai confession.")
      .setColor("White");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_confession")
        .setLabel("📝 Submit Confession")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  },
};
