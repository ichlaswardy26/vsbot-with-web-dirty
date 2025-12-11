const { EmbedBuilder } = require("discord.js");
const VoiceChannelModel = require("../../schemas/voiceChannel");
const config = require("../../config.js");

module.exports = {
  name: "voice",
  description: "Manage your temporary voice channel.",
  async exec(client, message, args) {
    const availableSubCommands = [
      { name: "trust", desc: "Menambahkan pengguna ke daftar trusted untuk mengelola voice." },
      { name: "untrust", desc: "Menghapus pengguna dari daftar trusted." },
      { name: "claim", desc: "Mengambil alih voice channel jika owner keluar." },
      { name: "limit", desc: "Mengatur jumlah maksimal anggota di voice." },
      { name: "kick", desc: "Mengeluarkan anggota dari voice." },
      { name: "ban", desc: "Melarang anggota join ke voice." },
      { name: "unban", desc: "Membolehkan kembali anggota yang dibanned untuk join." },
      { name: "lock", desc: "Mengunci voice agar tidak bisa join." },
      { name: "unlock", desc: "Membuka kembali voice untuk join." },
      { name: "hide", desc: "Menyembunyikan voice dari server." },
      { name: "unhide", desc: "Menampilkan kembali voice yang disembunyikan." },
      { name: "name", desc: "Mengganti nama voice channel." },
      { name: "region", desc: "Mengganti region voice (jika applicable)." },
      { name: "bitrate", desc: "Mengatur bitrate voice channel." }
    ];

    const subCommand = args[0];
    if (!subCommand) {
      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.important} **|** Subcommand Diperlukan`)
        .setDescription("Silakan pilih salah satu subcommand di bawah ini untuk digunakan:")
        .setColor("Red")
        .addFields(
          availableSubCommands.map(cmd => ({
            name: `${cmd.name}`,
            value: cmd.desc,
            inline: false
          }))
        )
        .setFooter({ text: "Gunakan perintah seperti: <prefix>vc trust @user" });

      return message.reply({ embeds: [embed] });
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply(`${config.emojis.important} **|** Kamu harus berada di dalam voice.`);

    const voiceData = await VoiceChannelModel.findOne({ channelId: voiceChannel.id });
    if (!voiceData) return message.reply(`${config.emojis.important} **|** Voice channel ini tidak terdaftar.`);

    const isOwner = voiceData.ownerId === message.author.id;
    const isTrusted = voiceData.allowedControllers.includes(message.author.id);

    const hasPermission = isOwner || isTrusted;
    if (!hasPermission && !["trust", "untrust"].includes(subCommand.toLowerCase())) {
      return message.reply(`${config.emojis.important} **|** Kamu tidak memiliki izin untuk manjalankan command ini.`);
    }

    switch (subCommand.toLowerCase()) {
        case "kick": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setDescription(`${config.emojis.seraphyx} **|** Silahkan mentions seseorang.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis, Silakan ulangi perintah.`);
          }

          const inputMsg = collected.first();
          if (inputMsg.content.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          const member = inputMsg.mentions.members.first();
          if (!member) {
            return message.channel.send(`${config.emojis.important} **|** Harap tag member yang valid.`);
          }

          await member.voice.disconnect().catch(() => {});
          return message.channel.send(`✅ **|** ${member.user.tag} telah dikeluarkan dari voice channel.`);
        }

        case "ban": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("🚫 Ban Member dari Voice")
            .setDescription("Silakan tag member yang ingin dilarang masuk ke voice channel ini.\nKetik `cancel` untuk membatalkan.");

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const inputMsg = collected.first();
          if (inputMsg.content.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          const member = inputMsg.mentions.members.first();
          if (!member) {
            return message.channel.send(`${config.emojis.important} **|** Harap tag member yang valid.`);
          }
          if (!voiceChannel.members.has(member.id)) {
            return message.channel.send(`${config.emojis.important} **|** Member tersebut tidak ada di voice channel.`);
          }

          if (!voiceData.bannedUsers.includes(member.id)) {
            voiceData.bannedUsers.push(member.id);
            await voiceData.save();
          }
          await voiceChannel.permissionOverwrites.edit(member.id, { Connect: false });
          return message.channel.send(`✅ **|** ${member.user.tag} telah dilarang masuk ke voice channel.`);
        }

        case "unban": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("🔓 Unban Member dari Voice")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan tag member yang ingin diizinkan kembali join ke voice channel ini.\nKetik \`cancel\` untuk membatalkan.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const inputMsg = collected.first();
          if (inputMsg.content.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          const member = inputMsg.mentions.members.first();
          if (!member) {
            return message.channel.send(`${config.emojis.important} **|** Harap tag member yang valid.`);
          }

          if (!voiceData.bannedUsers.includes(member.id)) {
            return message.channel.send(`${config.emojis.important} **|** ${member.user.tag} tidak dibanned dari voice channel ini.`);
          }

          voiceData.bannedUsers = voiceData.bannedUsers.filter(id => id !== member.id);
          await voiceChannel.permissionOverwrites.delete(member.id).catch(() => {});
          await voiceData.save();
          return message.channel.send(`✅ **|** ${member.user.tag} telah di-unban dan dapat join kembali.`);
        }

        case "trust": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("✅ Tambahkan Trusted Member")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan tag member yang ingin diberi akses kontrol voice.\nKetik \`cancel\` untuk membatalkan.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const inputMsg = collected.first();
          if (inputMsg.content.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          const member = inputMsg.mentions.members.first();
          if (!member) return message.channel.send(`${config.emojis.important} **|** Harap tag member yang valid.`);

          if (voiceData.allowedControllers.includes(member.id)) {
            return message.channel.send("⚠️ **|** Member ini sudah menjadi trusted.");
          }

          voiceData.allowedControllers.push(member.id);
          await voiceData.save();

          // Update permissions if channel is locked or hidden
          try {
            if (voiceData.locked) {
              await voiceChannel.permissionOverwrites.edit(member.id, { Connect: true });
            }
            if (voiceData.hidden) {
              await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });
            }
            // Grant text chat access if channel is locked or hidden
            const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
            if (textChannel?.isTextBased() && (voiceData.locked || voiceData.hidden)) {
              await textChannel.permissionOverwrites.edit(member.id, { 
                ViewChannel: true, 
                SendMessages: true 
              });
            }
          } catch (err) {
            console.error("Error updating trusted user permissions:", err);
          }

          return message.channel.send(`✅ **|** ${member.user.tag} kini menjadi trusted dan dapat mengontrol voice.`);
        }

        case "untrust": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("🚫 Hapus Trusted Member")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan tag member yang ingin dicabut akses kontrolnya.\nKetik \`cancel\` untuk membatalkan.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const inputMsg = collected.first();
          if (inputMsg.content.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          const member = inputMsg.mentions.members.first();
          if (!member) return message.channel.send(`${config.emojis.important} **|** Harap tag member yang valid.`);

          if (!voiceData.allowedControllers.includes(member.id)) {
            return message.channel.send("⚠️ **|** Member ini bukan trusted.");
          }

          voiceData.allowedControllers = voiceData.allowedControllers.filter(id => id !== member.id);
          await voiceData.save();

          // Remove special permissions if channel is locked or hidden
          try {
            if (voiceData.locked || voiceData.hidden) {
              // Remove their permission overwrites for voice channel
              await voiceChannel.permissionOverwrites.delete(member.id).catch(() => {});
              
              // Remove text chat permissions
              const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
              if (textChannel?.isTextBased()) {
                await textChannel.permissionOverwrites.edit(member.id, { 
                  ViewChannel: false, 
                  SendMessages: false 
                });
              }
            }
          } catch (err) {
            console.error("Error removing untrusted user permissions:", err);
          }

          return message.channel.send(`✅ **|** ${member.user.tag} tidak lagi memiliki kontrol atas voice.`);
        }

        case "limit": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("👥 Atur Limit Voice Channel")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan ketik jumlah maksimal anggota yang dapat join ke voice channel ini. (1 - 99)\nKetik \`0\` untuk unlimited.\nKetik \`cancel\` untuk membatalkan.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const input = collected.first().content.trim();
          if (input.toLowerCase() === "cancel") return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);

          const limit = parseInt(input);
          if (isNaN(limit) || limit < 0 || limit > 99) {
            return message.channel.send(`${config.emojis.important} **|** Harap masukkan angka antara 0 dan 99.`);
          }

          await voiceChannel.setUserLimit(limit);
          return message.channel.send(`✅ **|** Voice channel dibatasi untuk maksimal ${limit === 0 ? "unlimited" : `${limit}`} anggota.`);
        }

        case "name": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("✏️ Ganti Nama Voice Channel")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan ketik nama baru untuk voice channel ini. (Ketik \`cancel\` untuk membatalkan)`)
            .setFooter({ text: "Maksimal 100 karakter" });

          const sentMsg = await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return sentMsg.edit({ content: `${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`, embeds: [] });
          }

          const response = collected.first().content;
          if (response.toLowerCase() === "cancel") {
            return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
          }

          if (response.length > 100) {
            return message.channel.send(`${config.emojis.important} **|** Nama terlalu panjang. Maksimal 100 karakter.`);
          }

          await voiceChannel.setName(response);
          return message.channel.send(`✅ **|** Nama voice channel berhasil diubah menjadi **${response}**.`);
        }

      case "lock": {
        try {
          // Deny connection for @everyone
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
          
          // Allow connection for the owner
          await voiceChannel.permissionOverwrites.edit(voiceData.ownerId, { Connect: true });
          
          // Allow connection for all trusted users
          for (const trustedUserId of voiceData.allowedControllers) {
            await voiceChannel.permissionOverwrites.edit(trustedUserId, { Connect: true });
          }
          
          // Handle text channel permissions for current members
          const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
          if (textChannel?.isTextBased()) {
            // Remove text chat access for non-trusted members currently in voice
            for (const [memberId, member] of voiceChannel.members) {
              const isOwner = memberId === voiceData.ownerId;
              const isTrusted = voiceData.allowedControllers.includes(memberId);
              
              if (!isOwner && !isTrusted) {
                // Remove text chat permissions but allow them to stay in voice
                await textChannel.permissionOverwrites.edit(memberId, { 
                  ViewChannel: false, 
                  SendMessages: false 
                });
              } else {
                // Ensure trusted users have text access
                await textChannel.permissionOverwrites.edit(memberId, { 
                  ViewChannel: true, 
                  SendMessages: true 
                });
              }
            }
          }
          
          // Update DB record
          voiceData.locked = true;
          await voiceData.save();
          
          const lembed = new EmbedBuilder()
            .setColor("White")
            .setDescription(`${config.emojis.seraphyx} **|** Voice channel **${voiceChannel.name}** telah dikunci. Hanya pemilik dan pengguna tepercaya yang dapat bergabung. Member yang sudah ada dapat tetap di voice tetapi kehilangan akses text chat.`);
          return message.channel.send({ embeds: [lembed] });
        } catch (err) {
          console.error("Error locking channel:", err);
          return message.channel.send(`${config.emojis.important} **|** Terjadi kesalahan saat mengunci voice channel.`);
        }
      }

      case "unlock": {
        try {
          // Allow connection for everyone
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });
          
          // Restore text chat access for all current members
          const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
          if (textChannel?.isTextBased()) {
            for (const [memberId, member] of voiceChannel.members) {
              await textChannel.permissionOverwrites.edit(memberId, { 
                ViewChannel: true, 
                SendMessages: true 
              });
            }
          }
          
          // Update DB record
          voiceData.locked = false;
          await voiceData.save();
          
          const ulembed = new EmbedBuilder()
            .setColor("White")
            .setDescription(`${config.emojis.seraphyx} **|** Voice channel **${voiceChannel.name}** telah dibuka untuk semua pengguna.`);
          return message.channel.send({ embeds: [ulembed] });
        } catch (err) {
          console.error("Error unlocking channel:", err);
          return message.channel.send(`${config.emojis.important} **|** Terjadi kesalahan saat membuka kunci voice channel.`);
        }
      }

      case "hide": {
        try {
          // Deny view for @everyone
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
          
          // Allow view for the owner
          await voiceChannel.permissionOverwrites.edit(voiceData.ownerId, { ViewChannel: true });
          
          // Allow view for trusted users
          for (const trustedUserId of voiceData.allowedControllers) {
            await voiceChannel.permissionOverwrites.edit(trustedUserId, { ViewChannel: true });
          }
          
          // Handle text channel permissions for current members
          const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
          if (textChannel?.isTextBased()) {
            // Remove text chat access for non-trusted members currently in voice
            for (const [memberId, member] of voiceChannel.members) {
              const isOwner = memberId === voiceData.ownerId;
              const isTrusted = voiceData.allowedControllers.includes(memberId);
              
              if (!isOwner && !isTrusted) {
                // Remove text chat permissions but allow them to stay in voice
                await textChannel.permissionOverwrites.edit(memberId, { 
                  ViewChannel: false, 
                  SendMessages: false 
                });
              } else {
                // Ensure trusted users have text access
                await textChannel.permissionOverwrites.edit(memberId, { 
                  ViewChannel: true, 
                  SendMessages: true 
                });
              }
            }
          }
          
          // Update DB record
          voiceData.hidden = true;
          await voiceData.save();
          
          const hembed = new EmbedBuilder()
            .setColor("White")
            .setDescription(`${config.emojis.seraphyx} **|** Voice channel **${voiceChannel.name}** disembunyikan. Hanya pemilik dan pengguna tepercaya yang dapat melihat channel ini. Member yang sudah ada dapat tetap di voice tetapi kehilangan akses text chat.`);
          return message.channel.send({ embeds: [hembed] });
        } catch (err) {
          console.error("Error hiding channel:", err);
          return message.channel.send(`${config.emojis.important} **|** Terjadi kesalahan saat menyembunyikan voice channel.`);
        }
      }

      case "unhide": {
        try {
          // Allow view for everyone
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
          
          // Restore text chat access for all current members
          const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
          if (textChannel?.isTextBased()) {
            for (const [memberId, member] of voiceChannel.members) {
              await textChannel.permissionOverwrites.edit(memberId, { 
                ViewChannel: true, 
                SendMessages: true 
              });
            }
          }
          
          // Update DB record
          voiceData.hidden = false;
          await voiceData.save();
          
          const uhembed = new EmbedBuilder()
            .setColor("White")
            .setDescription(`${config.emojis.seraphyx} **|** Voice channel **${voiceChannel.name}** sekarang dapat dilihat oleh semua pengguna.`);
          return message.channel.send({ embeds: [uhembed] });
        } catch (err) {
          console.error("Error unhiding channel:", err);
          return message.channel.send(`${config.emojis.important} **|** Terjadi kesalahan saat menampilkan voice channel.`);
        }
      }

      case "claim": {
        if (voiceData.ownerId === message.author.id) return message.reply(`${config.emojis.important} **|** Kamu sudah menjadi owner dari channel ini.`);
        if (voiceChannel.members.has(voiceData.ownerId)) return message.reply(`${config.emojis.important} **|** Owner masih berada di dalam voice.`);

        voiceData.ownerId = message.author.id;
        await voiceData.save();
        return message.channel.send(`✅ **|** Kamu sekarang menjadi owner dari voice channel ini.`);
      }

      case "region": {
        const regions = [
          "automatic",
          "us-west", "us-east", "us-south", "us-central",
          "singapore", "sydney",
          "frankfurt", "eu-central", "eu-west",
          "dubai", "hongkong", "brazil"
        ];

        const promptEmbed = new EmbedBuilder()
          .setColor(0x00ffb3)
          .setTitle("⚙️ Ubah Region Voice Channel")
          .setDescription(
            "**Silakan ketik salah satu region berikut:**\n" +
            "`" + regions.join(", ") + "`\n" +
            "Ketik `cancel` untuk membatalkan."
          );

        await message.reply({ embeds: [promptEmbed] });

        const filter = m => m.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 15000,
          errors: ["time"]
        }).catch(() => null);

        if (!collected || collected.size === 0) {
          return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
        }

        const input = collected.first().content.trim().toLowerCase();
        if (input === "cancel") {
          return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);
        }

        if (!regions.includes(input)) {
          return message.channel.send(
            `${config.emojis.important} **|** Region tidak valid. Gunakan salah satu dari:\n\`${regions.join(", ")}\``
          );
        }

        const regionToSet = input === "automatic" ? null : input;

        await voiceChannel.setRTCRegion(regionToSet).catch(() => { });

        return message.channel.send(
          `✅ **|** Region voice channel diatur ke **${input}**.`
        );
      }

        case "bitrate": {
          const promptEmbed = new EmbedBuilder()
            .setColor("White")
            .setTitle("🎚️ Atur Bitrate Voice")
            .setDescription(`${config.emojis.seraphyx} **|** Silakan ketik angka bitrate (dalam satuan **kbps**) antara **8** hingga **96**.\nContoh: \`64\`\nKetik \`cancel\` untuk membatalkan.`);

          await message.reply({ embeds: [promptEmbed] });

          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ["time"]
          }).catch(() => null);

          if (!collected || collected.size === 0) {
            return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Silakan ulangi perintah.`);
          }

          const input = collected.first().content.trim();
          if (input.toLowerCase() === "cancel") return message.channel.send(`${config.emojis.important} **|** Operasi dibatalkan.`);

          const kbps = parseInt(input);
          if (isNaN(kbps) || kbps < 8 || kbps > 96) {
            return message.channel.send(`${config.emojis.important} **|** Harap masukkan angka antara **8** dan **96** kbps.`);
          }

          const bitrate = kbps * 1000; // konversi ke satuan bps
          await voiceChannel.setBitrate(bitrate);
          return message.channel.send(`✅ **|** Bitrate voice channel diatur ke **${kbps}kbps**.`);
        }

      default:
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor("Red")
            .setTitle(`${config.emojis.important} **|** Subcommand Tidak Dikenal`)
            .setDescription("Gunakan `..voice` untuk melihat daftar subcommand yang tersedia.")]
        });
    }
  }
};