const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "wave",
  category: "action",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/wave");

      const embed = new EmbedBuilder()
        .setColor("#FFC0CB")
        .setDescription(`${message.author.username} wave`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("API Rosakkk.");
    }
  },
};