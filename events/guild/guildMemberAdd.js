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
        `> Hey ${member}, Welcomee! Kami senang kamu di sini ${config.emojis.rocket}\n\n` +
        `Kami sangat senang kamu bergabung di **${serverName}**, sekarang kita punya **${totalMembers} members!**\n\n` +
        `📢 **Berikut beberapa channel penting yang perlu kamu tahu:**\n\n` +
        `・💬 Ayo ngobrol di: ${config.channels.chat1 ? `<#${config.channels.chat1}>` : 'chat channel'}, ${config.channels.chat2 ? `<#${config.channels.chat2}>` : 'chat channel'}, ${config.channels.chat3 ? `<#${config.channels.chat3}>` : 'chat channel'}, ${config.channels.chat4 ? `<#${config.channels.chat4}>` : 'chat channel'}, ${config.channels.chat5 ? `<#${config.channels.chat5}>` : 'chat channel'}, dan voice channel lainnya!\n\n` +
        `・📜 Baca rules di: ${config.channels.rules1 ? `<#${config.channels.rules1}>` : 'rules channel'}, ${config.channels.rules2 ? `<#${config.channels.rules2}>` : 'rules channel'}, ${config.channels.rules3 ? `<#${config.channels.rules3}>` : 'rules channel'}, ${config.channels.rules4 ? `<#${config.channels.rules4}>` : 'rules channel'} atau cek pengumuman terbaru di ${config.channels.announcement ? `<#${config.channels.announcement}>` : 'announcement channel'}!\n\n` +
        `・🎁 Jangan lupa ikuti giveaway di: ${config.channels.giveaway1 ? `<#${config.channels.giveaway1}>` : 'giveaway channel'}, ${config.channels.giveaway2 ? `<#${config.channels.giveaway2}>` : 'giveaway channel'}, ${config.channels.giveaway3 ? `<#${config.channels.giveaway3}>` : 'giveaway channel'}, ${config.channels.giveaway4 ? `<#${config.channels.giveaway4}>` : 'giveaway channel'} dan lihat bukti pemenangnya di ${config.channels.giveawayWinner ? `<#${config.channels.giveawayWinner}>` : 'winner channel'}!\n\n` +
        `・🔥 Buka premium role di: ${config.channels.premium1 ? `<#${config.channels.premium1}>` : 'premium channel'}, ${config.channels.premium2 ? `<#${config.channels.premium2}>` : 'premium channel'}, ${config.channels.premium3 ? `<#${config.channels.premium3}>` : 'premium channel'}, lihat benefit-nya di ${config.channels.premiumBenefit ? `<#${config.channels.premiumBenefit}>` : 'benefit channel'}, dan request role booster di ${config.channels.boosterRequest ? `<#${config.channels.boosterRequest}>` : 'booster request channel'}!\n\n` +
        `・👑 Kamu adalah orang ke **${totalMembers}** — terima kasih sudah join dan menjadi bagian dari kami!\n\n` +
        `・🎭 Punya pertanyaan/laporan? Langsung ke ${config.channels.support ? `<#${config.channels.support}>` : 'support channel'} atau hubungi:\n` +
        `${config.roles.helper ? `<@&${config.roles.helper}>` : '@Helper'}, ${config.roles.contentCreator ? `<@&${config.roles.contentCreator}>` : '@Content Creator'}, ${config.roles.admin ? `<@&${config.roles.admin}>` : '@Admin'}, ${config.roles.moderator ? `<@&${config.roles.moderator}>` : '@Moderator'}, ${config.roles.engineer ? `<@&${config.roles.engineer}>` : '@Engineer'}\n\n` +
        `${config.emojis.sparkleThumbsup} Selamat bersenang-senang di sini, semoga kamu nyaman!`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 1024 }))
      .setFooter({
        text: `Joined`,
        iconURL: member.guild.iconURL({ size: 1024 }),
      })
      .setTimestamp();

    // Kirim ke channel utama
    await welcomeChannel.send({ content: `${member} JOINED THE SERVERS!!!! ${config.emojis.kittyDance}`, embeds: [welcomeEmbed] });
      
      
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
