const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "kill",
  description: "Kill someone!",
  category: "action",
  async exec(client, message) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(`${config.emojis.important} **|** Mention seseorang!`);
    }
    if (target.id === client.user.id) {
      return message.reply(`*${config.emojis.important} **|** Kamu tidak dapat melakukannya ke bot!`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis.important} **|** Kamu tidak dapat melakukannya ke diri sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/kill");

      const embed = new EmbedBuilder()
        .setColor("#FFC0CB")
        .setDescription(`${message.author.username} kill <@${target.id}>!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("API Rosakkk.");
    }
  },
};