const { EmbedBuilder } = require("discord.js");

// Store processed message IDs to prevent duplicate responses
const processedDonations = new Set();

module.exports = {
  name: "messageUpdate",
  async exec(client, oldMessage, newMessage) {
    // Ensure we process messages only from guilds
    if (!newMessage.guild) return;

    // Only process messages from OwO Bot
    if (newMessage.author.id !== "408785106942164992") return;

    // Only respond in the specific channel
    if (newMessage.channel.id !== "1409830413232377856") return;

    // Check if we've already processed this message
    if (processedDonations.has(newMessage.id)) {
      return;
    }

    // --- OwO Bot Donation Detection ---
    const regex = /\*\*💳 \| (.+?)\*\* sent \*\*(\d+) cowoncy\*\* to \*\*(.+?)\*\*!/i;
    const matches = newMessage.content.match(regex);
    
    if (matches) {
      const donorUsername = matches[1];
      const donationValue = matches[2];

      // Add message ID to processed set to prevent duplicate responses
      processedDonations.add(newMessage.id);
      
      // Limit the size of the set to prevent memory leaks
      if (processedDonations.size > 100) {
        const firstItem = processedDonations.values().next().value;
        processedDonations.delete(firstItem);
      }

      const embed = new EmbedBuilder()
        .setColor("#FFFFFF")
        .setDescription(`<:1000051293:1317392285759180890> **| ${donorUsername}** telah berdonasi sebanyak **<:cowoncy:1409829142140289025> ${donationValue} cowoncy**\n<:blank:1297498366305107970> **|** *Terimakasih banyak atas donasinya!*`);

      try {
        await newMessage.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to send OwO Bot donation embed:", error);
      }
    }
  }
};
