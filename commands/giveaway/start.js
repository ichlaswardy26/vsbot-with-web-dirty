const { EmbedBuilder } = require("discord.js");
const ms = require("ms");
const Giveaway = require("../../schemas/Giveaway");
const { scheduleGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway",
  aliases: ["gstart"],
  description: "Mulai giveaway baru di channel ini!",
  category: "giveaway",
  usage: "giveaway <durasi> <jumlah_pemenang> <hadiah>",

  async exec(client, message, args) {
    try {
      // Check permission using standardized system
      const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
      if (permissionError) {
        return message.reply(permissionError);
      }

      if (args.length < 3) {
        return message.reply(`${config.emojis?.cross || "❌"} Format salah.\nGunakan: \`sera giveaway <durasi> <jumlah_pemenang> <hadiah>\`\nContoh: \`sera giveaway 1h 2 Nitro Classic\``);
      }

      const durationArg = args[0];
      const winnerCount = parseInt(args[1]);
      const prize = args.slice(2).join(" ");
      const time = ms(durationArg);

      if (!time || isNaN(winnerCount) || winnerCount <= 0) {
        return message.reply(`${config.emojis?.cross || "❌"} Pastikan durasi valid (cth: \`1h\`, \`30m\`) dan jumlah pemenang angka > 0.`);
      }

      const endAt = new Date(Date.now() + time);

      const embed = new EmbedBuilder()
        .setDescription(`🎁 Hadiah: **${prize}**\n👑 Host: ${message.author}`)
        .setColor(config.colors?.success || 0x00ff00)
        .setTimestamp(endAt)
        .setFooter({ text: "Giveaway berakhir pada" });

      const giveawayMessage = await message.channel.send({ content: "🎉 **GIVEAWAY DIMULAI!** 🎉", embeds: [embed] });
      await giveawayMessage.react("🎉").catch(() => console.log("[giveaway] gagal react"));

      // Simpan ke DB
      const newGiveaway = new Giveaway({
        messageId: giveawayMessage.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        prize,
        winnerCount,
        hostId: message.author.id,
        endAt,
        ended: false,
      });

      await newGiveaway.save();

      // Schedule agar auto-end berjalan tanpa harus restart
      scheduleGiveaway(client, newGiveaway);
    } catch (err) {
      console.error("[giveaway] start command error:", err.message);
      return message.reply(`${config.emojis?.cross || "❌"} Terjadi error saat memulai giveaway.`);
    }
  },
};
