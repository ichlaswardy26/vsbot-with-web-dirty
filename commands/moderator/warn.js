const Discord = require("discord.js");
const Warn = require("../../schemas/Warn");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "warn",
  description: "Memberikan peringatan kepada member (requires Moderator permissions).",

  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(`${config.emojis.important} **|** ${permissionError}`);
    }    

    const target = message.mentions.members.first();
    if (!target) return message.reply(`${config.emojis.important} **|** Tolong mention member yang ingin diperingatkan.`);

    const reason = args.slice(1).join(" ") || "Tidak ada alasan diberikan.";

    await Warn.create({
      guildId: message.guild.id,
      userId: target.id,
      moderatorId: message.author.id,
      reason,
    });

    try {
      await target.send({
        embeds: [
          new Discord.EmbedBuilder()
            .setTitle("⚠️ Kamu Telah Diperingatkan")
            .setDescription(`Kamu menerima peringatan dari server **${message.guild.name}**.`)
            .addFields(
              { name: "Moderator", value: message.author.tag, inline: true },
              { name: "Alasan", value: reason, inline: false }
            )
            .setColor(0xffcc00)
            .setTimestamp()
        ],
      });
    } catch (err) {
      message.channel.send(`⚠️ Tidak bisa mengirim DM ke ${target.user.tag}.`);
    }
    const sucembed = new Discord.EmbedBuilder()
    .setDescription(`${config.emojis.ban} **|** <@${target.user.id}> telah diperingatkan.`)
    .setColor("White");

    message.channel.send({ embeds: [sucembed] });
  },
};
