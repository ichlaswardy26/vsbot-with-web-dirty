const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "itemid",
  description: "Lihat item exclusive yang sudah kamu beli",
  async exec(client, message) {
    const userId = message.author.id;
    const items = await ExclusiveItem.find({ 
      guildId: message.guild.id,
      buyers: userId
    });

    if (!items.length) {
      return message.reply("⚠️ Kamu belum membeli item exclusive apa pun.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🧾 Daftar Item Exclusive Kamu")
      .setColor(0xffd700)
      .setDescription(
        items
          .map((item, i) => {
            const unix = Math.floor(item.expiresAt.getTime() / 1000);
            return `**${i + 1}. ${item.name}**\n💰 ${item.price} | ⏳ <t:${unix}:R>`;
          })
          .join("\n\n")
      )
      .setFooter({ text: "Hubungi admin untuk claim item kamu!" });

    message.channel.send({ embeds: [embed] });
  },
};
