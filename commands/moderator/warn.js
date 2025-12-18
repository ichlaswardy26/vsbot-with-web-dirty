const { EmbedBuilder } = require("discord.js");
const Warn = require("../../schemas/Warn");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");
const auditLogger = require("../../util/auditLogger");

module.exports = {
  name: "warn",
  description: "Memberikan peringatan kepada member.",
  category: "moderator",
  usage: "warn @user [alasan]",

  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const importantEmoji = config.emojis?.important || "❗";
    const banEmoji = config.emojis?.ban || "🔨";

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply(`${importantEmoji} **|** Tolong mention member yang ingin diperingatkan.`);
    }

    const reason = args.slice(1).join(" ") || "Tidak ada alasan diberikan.";

    try {
      await Warn.create({
        guildId: message.guild.id,
        userId: target.id,
        moderatorId: message.author.id,
        reason,
      });

      // Log to audit system
      await auditLogger.logWarn(message.guild, message.author, target.user, reason);

      // Try to DM the user
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("⚠️ Kamu Telah Diperingatkan")
              .setDescription(`Kamu menerima peringatan dari server **${message.guild.name}**.`)
              .addFields(
                { name: "Moderator", value: message.author.tag, inline: true },
                { name: "Alasan", value: reason, inline: false }
              )
              .setColor(config.colors?.warning || 0xffcc00)
              .setTimestamp()
          ],
        });
      } catch {
        message.channel.send(`⚠️ Tidak bisa mengirim DM ke ${target.user.tag}.`);
      }

      const successEmbed = new EmbedBuilder()
        .setDescription(`${banEmoji} **|** <@${target.user.id}> telah diperingatkan.`)
        .setColor("White");

      message.channel.send({ embeds: [successEmbed] });
    } catch (error) {
      console.error("[warn] Error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat memberikan warning!`);
    }
  },
};
