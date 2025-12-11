const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  name: "confess",
  description: "Tampilkan panel confession",

  async exec(client, message, args) {
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