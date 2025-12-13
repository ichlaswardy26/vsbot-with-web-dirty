const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Displays a fake ban embed (troll ban) without actually banning the member. Restricted to users with the special role.",
  
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Fetch the target member from mentions
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("<a:important:1367186288297377834> **|** Tolong mention member yang ingin di-ban. Contoh: `seraban @user <reason>`");
    }

    // Check if target is the command issuer (prevent self-troll ban)
    if (target.id === message.author.id) {
      return message.reply("<a:important:1367186288297377834> **|** Kamu tidak bisa ban diri sendiri!");
    }

    // Get the reason from args (everything after the mention)
    const reason = args.slice(1).join(" ") || "Tidak ada alasan diberikan.";

    try {
      // Create an embed for the troll ban message
      const embed = new EmbedBuilder()
        .setTitle("🔨 Member Telah Di-Ban!")
        .setDescription(`**<@${target.user.id}>** telah di-ban dari server ini!`)
        .setColor("#FF0000")
        .addFields(
          { name: "👮 Moderator", value: `${message.author}`, inline: true },
          { name: "🎯 Target", value: `<@${target.user.id}>`, inline: true },
          { name: "📝 Alasan", value: reason, inline: true }
        )
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "© 2025 Villain Seraphyx • Ban System" });

      // Send the embed to the channel
      await message.channel.send({ embeds: [embed] });

      // Optional: Add a reaction to the original message to show command was processed
      try {
        await message.react("🔨");
      } catch (error) { // eslint-disable-line no-unused-vars
        // Ignore reaction errors (might not have permission)
        console.log("Could not add reaction to troll ban message");
      }

    } catch (error) {
      console.error("Error sending troll ban embed:", error);
      message.reply("<a:important:1367186288297377834> **|** Terjadi kesalahan saat menjalankan troll ban command.");
    }
  },
};
