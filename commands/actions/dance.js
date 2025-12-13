const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "dance",
  description: "Dance!",
  category: "action",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/dance");

      const embed = new EmbedBuilder()
        .setColor("#FFC0CB")
        .setDescription(`${message.author.username} dance!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("API Rosakkk.");
    }
  },
};