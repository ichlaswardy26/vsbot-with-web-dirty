const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

// Store processed message IDs to prevent duplicate responses
const processedDonations = new Set();

module.exports = {
  name: "messageUpdate",
  async exec(client, oldMessage, newMessage) {
    // Ensure we process messages only from guilds
    if (!newMessage.guild) return;

    // Only process messages from OwO Bot
    const owoBot = config.botIds?.owoBot || "408785106942164992";
    if (newMessage.author.id !== owoBot) return;

    // Only respond in the specific channel
    if (!config.channels.donation || newMessage.channel.id !== config.channels.donation) return;

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
        .setDescription(`${config.emojis.donation} **| ${donorUsername}** telah berdonasi sebanyak **${config.emojis.cowoncy} ${donationValue} cowoncy**\n${config.emojis.blank} **|** *Terimakasih banyak atas donasinya!*`);

      try {
        await newMessage.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to send OwO Bot donation embed:", error);
      }
    }
  }
};
