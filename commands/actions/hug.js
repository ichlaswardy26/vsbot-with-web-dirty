const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "hug",
  description: "Hug someone!",
  category: "action",
  usage: "hug @user",
  async exec(client, message) {
    const importantEmoji = config.emojis?.important || "❗";
    
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(`${importantEmoji} **|** Mention seseorang!`);
    }
    if (target.id === client.user.id) {
      return message.reply(`${importantEmoji} **|** Kamu tidak dapat melakukannya ke bot!`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${importantEmoji} **|** Kamu tidak dapat melakukannya ke diri sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/hug");

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FFC0CB")
        .setDescription(`${message.author.username} hug <@${target.id}>!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[hug] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF dari API.`);
    }
  },
};