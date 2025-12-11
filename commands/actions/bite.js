const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "bite",
  description: "Bite someone!",
  category: "action",
  async exec(client, message, args) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply("<a:important:1367186288297377834> **|** Mention seseorang!");
    }
    if (target.id === client.user.id) {
      return message.reply("*<a:important:1367186288297377834> **|** Kamu tidak dapat melakukannya ke bot!");
    }
    
    if (target.id === message.author.id) {
      return message.reply("<a:important:1367186288297377834> **|** Kamu tidak dapat melakukannya ke diri sendiri!");
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/bite");

      const embed = new EmbedBuilder()
        .setColor("#FFC0CB")
        .setDescription(`${message.author.username} bite <@${target.id}>!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("API Rosakkk.");
    }
  },
};