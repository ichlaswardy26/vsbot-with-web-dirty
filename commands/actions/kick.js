const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "kick",
  aliases: ["tendang"],
  description: "Tendang seseorang! (fun)",
  category: "action",
  usage: "kick @user",
  async exec(client, message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang yang ingin kamu tendang!`);
    }
    
    if (target.id === client.user.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Jangan tendang aku! 😭`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak bisa menendang dirimu sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/kick", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.error || "#ED4245")
        .setDescription(`🦵 **${message.author.username}** menendang **${target.username}**!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[kick] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
