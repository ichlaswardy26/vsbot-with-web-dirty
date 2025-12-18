const { EmbedBuilder } = require("discord.js");
const Warn = require("../../schemas/Warn");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");
const auditLogger = require("../../util/auditLogger");

module.exports = {
  name: "warn",
  description: "Memberikan peringatan kepada member",
  category: "moderator",
  usage: "warn @user [alasan]",

  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention member yang ingin diperingatkan!`);
    }

    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.cross || "❌"} **|** Kamu tidak dapat memperingatkan dirimu sendiri!`);
    }

    if (target.user.bot) {
      return message.reply(`${config.emojis?.cross || "❌"} **|** Kamu tidak dapat memperingatkan bot!`);
    }

    const reason = args.slice(1).join(" ") || "Tidak ada alasan diberikan";

    try {
      // Save warning to database
      await Warn.create({
        guildId: message.guild.id,
        userId: target.id,
        moderatorId: message.author.id,
        reason,
      });

      // Get total warnings
      const totalWarnings = await Warn.countDocuments({
        guildId: message.guild.id,
        userId: target.id
      });

      // Log to audit system
      await auditLogger.logWarn(message.guild, message.author, target.user, reason);

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ Kamu Mendapat Peringatan")
          .setDescription(`Kamu menerima peringatan dari server **${message.guild.name}**`)
          .setColor(config.colors?.warning || "#FEE75C")
          .addFields(
            { name: "👮 Moderator", value: `${message.author.tag}`, inline: true },
            { name: "📝 Alasan", value: reason, inline: false },
            { name: "⚠️ Total Peringatan", value: `${totalWarnings}`, inline: true }
          )
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
          .setFooter({ text: "Harap patuhi peraturan server!" })
          .setTimestamp();

        await target.send({ embeds: [dmEmbed] });
      } catch {
        // User has DMs disabled
      }

      // Send confirmation embed
      const successEmbed = new EmbedBuilder()
        .setTitle("⚠️ Peringatan Diberikan")
        .setDescription(`${target} telah diberikan peringatan.`)
        .setColor(config.colors?.warning || "#FEE75C")
        .addFields(
          { name: "👤 Member", value: `${target.user.tag}`, inline: true },
          { name: "👮 Moderator", value: `${message.author.tag}`, inline: true },
          { name: "📝 Alasan", value: reason, inline: false },
          { name: "⚠️ Total Peringatan", value: `${totalWarnings}`, inline: true }
        )
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
          text: `ID: ${target.id}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [successEmbed] });
    } catch (error) {
      console.error("[warn] Error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat memberikan peringatan!`);
    }
  },
};
