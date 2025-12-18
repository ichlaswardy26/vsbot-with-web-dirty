const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "hug",
  aliases: ["peluk"],
  description: "Peluk seseorang!",
  category: "action",
  usage: "hug @user",
  async exec(client, message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang yang ingin kamu peluk!`);
    }
    
    if (target.id === client.user.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Aww, terima kasih! Tapi aku tidak bisa dipeluk~ 🤖`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak bisa memeluk dirimu sendiri! Coba peluk orang lain~`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/hug", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FFC0CB")
        .setDescription(`🤗 **${message.author.username}** memeluk **${target.username}**!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[hug] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
