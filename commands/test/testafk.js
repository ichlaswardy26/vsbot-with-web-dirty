const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "testafk",
  description: "Test AFK system with nickname changes",
  
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini.");
    }

    const member = message.member;
    const currentNickname = member.nickname;
    const username = message.author.username;

    const embed = new EmbedBuilder()
      .setTitle("🔧 AFK System Test")
      .setColor(0x00ff00)
      .addFields(
        { 
          name: "Current Nickname", 
          value: currentNickname || "None (using username)", 
          inline: true 
        },
        { 
          name: "Username", 
          value: username, 
          inline: true 
        },
        { 
          name: "Bot Can Manage", 
          value: member.manageable ? "✅ Yes" : "❌ No", 
          inline: true 
        },
        {
          name: "Test Instructions",
          value: "1. Run `sera afk test reason` to set AFK\n2. Send any message to remove AFK\n3. Check if nickname changes work properly",
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};