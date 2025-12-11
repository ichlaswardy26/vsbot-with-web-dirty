const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "guildMemberAdd",
  exec: async (client, member) => {
    // 🧠 Cegah bot dari welcome member role
    if (member.user.bot) {
      return member.roles.add(config.welcomeBotRoleId).catch(() => {});
    }

    const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!welcomeChannel) {
      return console.log("⚠️ Tidak dapat menemukan welcomeChannelId di config.js");
    }

    // 📊 Data dasar
    const totalMembers = member.guild.memberCount.toLocaleString();
    const serverName = member.guild.name;
    const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;

    // 🎨 Buat embed welcome
    const welcomeEmbed = new EmbedBuilder()
      .setColor("White")
      .setAuthor({
        name: `👋 Welcome to ${serverName}!`,
        iconURL: member.user.displayAvatarURL({ size: 1024 }),
      })
      .setDescription(
        `> Hey ${member}, Welcomee! Kami senang kamu di sini <a:rocket_1f680:1437808838140231742>\n\n` +
        `Kami sangat senang kamu bergabung di **${serverName}**, sekarang kita punya **${totalMembers} members!**\n\n` +
        `📢 **Berikut beberapa channel penting yang perlu kamu tahu:**\n\n` +
        `・💬 Ayo ngobrol di: <#1439162519095611485>, <#1422029439885246535>, <#1386682273000063096>, <#1346721194761523225>, <#1384223433788756109>, dan voice channel lainnya!\n\n` +
        `・📜 Baca rules di: <#1434921399419404402>, <#1434921603057061909>, <#1434936563044716625>, <#1377666657178353787> atau cek pengumuman terbaru di <#1417747269008228413>!\n\n` +
        `・🎁 Jangan lupa ikuti giveaway di: <#1354443349930676234>, <#1430233885060366376>, <#1430233946343604244>, <#1430234016547737651> dan lihat bukti pemenangnya di <#1414939199752110140>!\n\n` +
        `・🔥 Buka premium role di: <#1431923407682928650>, <#1431923559604817992>, <#1378821287706890451>, lihat benefit-nya di <#1431923183946043412>, dan request role booster di <#1407221656891555871>!\n\n` +
        `・👑 Kamu adalah orang ke **${totalMembers}** — terima kasih sudah join dan menjadi bagian dari kami!\n\n` +
        `・🎭 Punya pertanyaan/laporan? Langsung ke <#1408045289230569603> atau hubungi:\n` +
        `<@&1415621934703448074>, <@&1427913691478757458>, <@&1379438440868741183>, <@&1418977743596687430>, <@&1410992996874195168>\n\n` +
        `<:1473sparklethumbsup:1376125029267279992> Selamat bersenang-senang di sini, semoga kamu nyaman!`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 1024 }))
      .setFooter({
        text: `Joined`,
        iconURL: member.guild.iconURL({ size: 1024 }),
      })
      .setTimestamp();

    // Kirim ke channel utama
    await welcomeChannel.send({ content: `${member} JOINED THE SERVERS!!!! <a:774805kittydance:1441816360123498607>`, embeds: [welcomeEmbed] });
      
      
      const welcome2Channel = client.channels.cache.get(config.welcome2ChannelId);
    if (!welcome2Channel) {
      return console.log("I can't find the another welcome channel. Set it in config.json.");
    }
      
      welcome2Channel.send({ content: `་༘✧ˏ. ་༘🪽˗ˏ° ★ ˎ˗•. ݁࿐> ✧                                                                                                                                                                                  Kita baru saja kedatangan member baru,say hi to ${member}` })
      
      
    // 📜 Kirim log join
    const welcomeLogChannel = client.channels.cache.get(config.welcomeLogChannelId);
    if (welcomeLogChannel) {
      const logEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Member Joined",
          iconURL: member.user.displayAvatarURL({ size: 1024 }),
        })
        .setDescription(`**${member.user.tag}** (${member}) joined the server.`)
        .addFields(
          {
            name: "ID",
            value: member.id,
            inline: true,
          },
          {
            name: "Account Created",
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: "Joined Server",
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
            inline: true,
          }
        )
        .setColor("#32ff81")
        .setFooter({
          text: `${serverName} • Total: ${totalMembers} members`,
          iconURL: member.guild.iconURL({ size: 1024 }),
        })
        .setTimestamp();

      await welcomeLogChannel.send({ embeds: [logEmbed] });
    }
  },
};
