const { EmbedBuilder } = require("discord.js");
const ms = require("ms");
const Giveaway = require("../../schemas/Giveaway");
const { scheduleGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway",
  aliases: ["gstart", "gw"],
  description: "Mulai giveaway baru di channel ini",
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
        const helpEmbed = new EmbedBuilder()
          .setTitle("🎉 Cara Membuat Giveaway")
          .setDescription("Format: `giveaway <durasi> <jumlah_pemenang> <hadiah>`")
          .setColor(config.colors?.info || "#5865F2")
          .addFields(
            { name: "📝 Contoh", value: "`giveaway 1h 2 Nitro Classic`\n`giveaway 30m 1 Discord Nitro`\n`giveaway 1d 3 Steam Gift Card`", inline: false },
            { name: "⏱️ Format Durasi", value: "`s` = detik, `m` = menit, `h` = jam, `d` = hari", inline: false }
          )
          .setFooter({ text: "Gunakan format yang benar untuk memulai giveaway" });
          
        return message.reply({ embeds: [helpEmbed] });
      }

      const durationArg = args[0];
      const winnerCount = parseInt(args[1]);
      const prize = args.slice(2).join(" ");
      const time = ms(durationArg);

      if (!time) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Durasi tidak valid! Gunakan format seperti \`1h\`, \`30m\`, \`1d\``);
      }

      if (isNaN(winnerCount) || winnerCount <= 0 || winnerCount > 20) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Jumlah pemenang harus antara 1-20!`);
      }

      const endAt = new Date(Date.now() + time);
      const endTimestamp = Math.floor(endAt.getTime() / 1000);

      const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(
          `**🎁 Hadiah:** ${prize}\n\n` +
          `**👑 Host:** ${message.author}\n` +
          `**🏆 Pemenang:** ${winnerCount} orang\n` +
          `**⏰ Berakhir:** <t:${endTimestamp}:R>\n\n` +
          `Klik tombol 🎉 di bawah untuk ikut serta!`
        )
        .setColor(config.colors?.success || "#57F287")
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `${winnerCount} Pemenang • Berakhir pada` })
        .setTimestamp(endAt);

      const giveawayMessage = await message.channel.send({ embeds: [embed] });
      await giveawayMessage.react("🎉").catch(() => console.log("[giveaway] Gagal menambahkan reaksi"));

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

      // Hapus pesan command
      message.delete().catch(() => {});
    } catch (err) {
      console.error("[giveaway] start command error:", err.message);
      return message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat memulai giveaway.`);
    }
  },
};
