const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "debugconfess",
  description: "Debug confession system configuration",
  
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini.");
    }

    const confessionChannelId = "1376956791757209773";
    const logChannelId = "1322999470232961035";
    
    const confessionChannel = message.guild.channels.cache.get(confessionChannelId);
    const logChannel = message.guild.channels.cache.get(logChannelId);

    const embed = new EmbedBuilder()
      .setTitle("🔧 Confession System Debug")
      .setColor(0x00ff00)
      .addFields(
        { 
          name: "Confession Channel", 
          value: confessionChannel ? `✅ Found: ${confessionChannel.name}` : "❌ Not found", 
          inline: true 
        },
        { 
          name: "Log Channel", 
          value: logChannel ? `✅ Found: ${logChannel.name}` : "❌ Not found", 
          inline: true 
        },
        { 
          name: "Channel IDs", 
          value: `Confession: ${confessionChannelId}\nLog: ${logChannelId}`, 
          inline: false 
        },
        {
          name: "Test Instructions",
          value: "1. Run `sera testconfess` to create confession panel\n2. Try submitting a confession\n3. Try replying to a confession\n4. Check console logs for debugging",
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};