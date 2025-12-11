const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "cry",
  description: "Cry!",
  category: "action",
  async exec(client, message, args) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/cry");

      const embed = new EmbedBuilder()
        .setColor("#FFC0CB")
        .setDescription(`${message.author.username} cry!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("API Rosakkk.");
    }
  },
};