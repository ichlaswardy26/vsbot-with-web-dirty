const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const VoiceChannelModel = require("../../schemas/voiceChannel");
const { getXpRequirement } = require("../../util/levelUtils");
const { getLevelUpReward, addSouls, formatNumber } = require("../../util/economyUtils.js");
const { updateLeaderboardXP } = require("../../util/leaderboardUtils");
const { giveXp } = require("../../util/applyXpWithBoost");

const LOG_CHANNEL_ID = "1322983854398505062";

module.exports = {
  name: 'voiceStateUpdate',
  async exec(client, oldState, newState) {
    const joinToCreateChannelId = '1447235501953122436';
    const voiceCategoryId = '1376956791757209772';

    // ========================================
    // VOICE XP & LEVELING SYSTEM
    // ========================================
    try {
      const member = newState?.member || oldState?.member;
      if (member && !member.user?.bot) {
        const userId = member.user.id;
        const guildId = (newState.guild || oldState.guild).id;

        const VoiceActivity = require("../../schemas/VoiceActivity");
        const VoiceEvent = require("../../schemas/VoiceEvent");
        const Leveling = require("../../schemas/Leveling");

        // Initialize global maps
        if (!global.activeVoiceUsers) global.activeVoiceUsers = new Map();

        // JOIN VC
        if (!oldState.channel && newState.channel) {
          const nowTs = Date.now();
          global.activeVoiceUsers.set(userId, { guildId, joinedAt: nowTs, lastXp: nowTs });

          await VoiceActivity.updateOne(
            { userId, guildId },
            { $set: { lastJoinedAt: new Date(nowTs) } },
            { upsert: true }
          );

          await VoiceEvent.updateOne(
            { userId, guildId },
            { $set: { lastJoinedAt: new Date(nowTs) } },
            { upsert: true }
          );

          await Leveling.updateOne(
            { userId, guildId },
            { $setOnInsert: { userId, guildId, xp: 0, level: 0, lastVoiceXp: 0 } },
            { upsert: true }
          );
        }

        // LEAVE VC - Calculate and save duration
        if (oldState.channel && !newState.channel) {
          const userData = global.activeVoiceUsers.get(userId);
          if (userData && userData.joinedAt) {
            const nowTs = Date.now();
            const durationSeconds = Math.floor((nowTs - userData.joinedAt) / 1000);

            // Update VoiceActivity
            await VoiceActivity.updateOne(
              { userId, guildId },
              { 
                $inc: { voiceSeconds: durationSeconds },
                $set: { lastJoinedAt: null }
              },
              { upsert: true }
            );

            // Update VoiceEvent
            await VoiceEvent.updateOne(
              { userId, guildId },
              { 
                $inc: { voiceSeconds: durationSeconds },
                $set: { lastJoinedAt: null }
              },
              { upsert: true }
            );

            console.log(`[VoiceTracking] ${userId} was in voice for ${durationSeconds} seconds`);
          }

          global.activeVoiceUsers.delete(userId);
        }

        // Setup voice duration tracking interval (runs every 5 minutes)
        if (!global.voiceDurationInterval) {
          global.voiceDurationInterval = setInterval(async () => {
            try {
              const ITEMS = Array.from(global.activeVoiceUsers.entries());
              for (const [uid, data] of ITEMS) {
                try {
                  const { guildId: gId, joinedAt = 0 } = data;
                  if (!joinedAt) continue;

                  const now = Date.now();
                  const durationSeconds = Math.floor((now - joinedAt) / 1000);

                  // Save accumulated duration and reset join time
                  await VoiceActivity.updateOne(
                    { userId: uid, guildId: gId },
                    { 
                      $inc: { voiceSeconds: durationSeconds },
                      $set: { lastJoinedAt: new Date(now) }
                    },
                    { upsert: true }
                  );

                  await VoiceEvent.updateOne(
                    { userId: uid, guildId: gId },
                    { 
                      $inc: { voiceSeconds: durationSeconds },
                      $set: { lastJoinedAt: new Date(now) }
                    },
                    { upsert: true }
                  );

                  // Update join time to now (reset counter)
                  global.activeVoiceUsers.set(uid, { ...data, joinedAt: now });

                  console.log(`[VoiceDuration] Saved ${durationSeconds}s for ${uid} in guild ${gId}`);
                } catch (innerErr) {
                  console.error("Error saving voice duration:", innerErr);
                }
              }
            } catch (err) {
              console.error("Error in voiceDurationInterval loop:", err);
            }
          }, 5 * 60 * 1000); // Every 5 minutes
        }

        // Setup XP interval (runs every 30 seconds, gives XP every 3 minutes)
        if (!global.voiceXpInterval) {
          global.voiceXpInterval = setInterval(async () => {
            try {
              const ITEMS = Array.from(global.activeVoiceUsers.entries());
              for (const [uid, data] of ITEMS) {
                try {
                  const { guildId: gId, lastXp = 0, joinedAt = 0 } = data;
                  const now = Date.now();

                  // Clean up stale entries (older than 24 hours)
                  if (joinedAt && now - joinedAt > 1000 * 60 * 60 * 24) {
                    global.activeVoiceUsers.delete(uid);
                    continue;
                  }

                  // Give XP every 3 minutes (180000 ms)
                  if (!lastXp || (now - lastXp) >= 180000) {
                    const earnedXp = 10;

                    const result = await giveXp(client, uid, gId, earnedXp).catch(err => {
                      console.error("giveXp error for", uid, err);
                      return null;
                    });

                    // Update lastXp timestamp
                    global.activeVoiceUsers.set(uid, { ...data, lastXp: now });

                    await Leveling.updateOne(
                      { userId: uid, guildId: gId },
                      { $set: { lastVoiceXp: new Date(now) } },
                      { upsert: true }
                    ).catch(err => console.error("Failed update Leveling.lastVoiceXp:", err));

                    // Update leaderboard
                    if (result) {
                      const xpAdded = result.xpAdded ?? earnedXp;
                      const username = result.username ?? (client.users.cache.get(uid)?.username || "Unknown");
                      await updateLeaderboardXP(uid, gId, username, xpAdded).catch(err => {
                        console.error("updateLeaderboardXP error:", err);
                      });

                      console.log(`[VoiceXP] given ${xpAdded} XP to ${uid} in guild ${gId} at ${new Date(now).toISOString()}`);

                      // Handle level up
                      if (result.levelUp) {
                        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
                        if (logChannel?.isTextBased()) {
                          const soulsEarned = getLevelUpReward(result.newLevel);
                          await addSouls(uid, gId, soulsEarned).catch(console.error);

                          function getTierName(level) {
                            if (level >= 50) return "Seraphix Ω";
                            if (level >= 40) return "Seraphim";
                            if (level >= 30) return "Eldritch";
                            if (level >= 20) return "Sovereign";
                            if (level >= 11) return "Soulborne";
                            return null;
                          }

                          const milestoneLevels = [11, 20, 30, 40, 50];
                          const tierName = getTierName(result.newLevel);

                          const lines = [
                            `<a:levelup:1373202754708832277> **|** <@${uid}> naik ke level **${result.newLevel}**! \`[${Math.floor(result.totalXp || 0)}/${getXpRequirement(result.newLevel)}]\``,
                            `<:souls:1373202161823121560> **|** Mendapatkan ${formatNumber(soulsEarned)} souls!`,
                            `<:blank:1367401175355359324> **|** Terus aktif dan dapatkan reward menarik lainnya!`
                          ];

                          if (milestoneLevels.includes(result.newLevel) && tierName) {
                            lines.push(`<:tier:1373202620487041076> **|** Kamu telah mencapai tier **${tierName}**!`);
                          }

                          await logChannel.send(lines.join("\n")).catch(console.error);
                        }
                      }
                    }
                  }
                } catch (innerErr) {
                  console.error("Error processing voice user in interval:", innerErr);
                }
              }
            } catch (err) {
              console.error("Error in voiceXpInterval loop:", err);
            }
          }, 30 * 1000);
        }
      }
    } catch (error) {
      console.error("Error in voice XP system:", error);
    }

    // ========================================
    // TEMPORARY VOICE CHANNEL SYSTEM
    // ========================================

    // Handle temporary voice channels
    if ((oldState.channel === null || oldState.channel.id !== joinToCreateChannelId) && newState.channel?.id === joinToCreateChannelId) {
      console.log(`User ${newState.member.user.username} bergabung ke 'join to create'`);
      const guild = newState.guild;
      const member = newState.member;
      const username = member.user.username;

      // Create new voice channel
      const voice = await guild.channels.create({
        name: `💬 ${username}'s ♡`,
        type: ChannelType.GuildVoice,
        parent: voiceCategoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: member.id,
            allow: [PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: client.user.id,
            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels]
          }
        ],
      });

      console.log(`Voice channel baru dibuat: ${voice.name}`);

      // Move member to new voice channel
      await member.voice.setChannel(voice);
      console.log(`User ${member.user.username} dipindahkan ke channel ${voice.name}`);

      // Save voice channel data
      await VoiceChannelModel.create({
        ownerId: member.id,
        channelId: voice.id,
        guildId: guild.id,
        claimed: false,
      });

      // Send instructions via DM
      const controlChannel = await member.createDM();
      if (controlChannel) {
        const embed = new EmbedBuilder()
          .setDescription(`List Command:\n> \`seravoice name -\` **Untuk mengganti nama voice.**\n> \`seravoice bitrate -\` **Mengatur bitrate voice channel.**\n> \`seravoice kick -\` **Mengeluarkan anggota dari voice.**\n> \`seravoice ban -\` **Melarang anggota join ke voice.**\n> \`seravoice unban -\` **Membolehkan kembali anggota yang dibanned untuk join.**\n> \`seravoice lock -\` **Mengunci voice agar tidak bisa join.**\n> \`seravoice unlock -\` **Membuka kembali voice untuk join.**\n> \`seravoice hide -\` **Menyembunyikan voice dari server.**\n> \`seravoice unhide -\` **Menampilkan kembali voice yang disembunyikan.**\n> \`seravoice trust -\` **Menambahkan pengguna ke daftar trusted untuk mengelola voice.**\n> \`seravoice untrust -\` **Menghapus pengguna dari daftar trusted.**\n> \`seravoice limit -\` **Mengatur jumlah maksimal anggota di voice.**\n> \`seravoice region -\` **Mengganti region voice (jika applicable).**\n\n<a:important:1367186288297377834> Hanya **Ownership** yang dapat menggunakan Panel dan Command.\n\n<:seraphyx:1367175101711388783> **|** Gunakan tombol 🔔 - **Untuk Toggle Join/Leave notification.**\n\n<:seraphyx:1367175101711388783> **|** Jika kamu menemukan bug atau error, silahkan laporkan ke staff yang sedang online.`)
          .setColor('White')
          .setFooter({ text: `Villain Seraphyx | ${voice.name}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`vc-notif-toggle-${voice.id}`)
            .setLabel('🔔')
            .setStyle(ButtonStyle.Secondary),
        );

        const textChannel = guild.channels.cache.find(c => c.id === voice.id && c.isTextBased());
        if (textChannel) {
          await textChannel.send({
            content: `<:seraphyx:1367175101711388783> **|** Yow <@${member.id}>, here is your voice!!\n<:blank:1367401175355359324> **|** Ikuti instruksi dibawah ini untuk mengatur channel.`,
            embeds: [embed],
            components: [row],
          });
        }
      }
    }

    // Delete voice if empty - Enhanced logic to handle ghost channels
    if (oldState.channel && oldState.channel.parentId === voiceCategoryId) {
      const leftChannel = oldState.channel;
      const voiceData = await VoiceChannelModel.findOne({ channelId: leftChannel.id });
      
      // Only process temporary channels created by the bot (stored in database)
      if (!voiceData) return;

      // Separate bot and human members
      const bots = leftChannel.members.filter(member => member.user.bot);
      const humans = leftChannel.members.filter(member => !member.user.bot);

      // Notify if owner leaves but members still inside
      if (oldState.member.id === voiceData.ownerId && oldState.channelId && !newState.channelId) {
        const membersLeft = leftChannel?.members.size ?? 0;

        if (membersLeft > 0) {
          const mentionList = leftChannel.members.map(m => `<@${m.id}>`).join(', ');

          const embed = new EmbedBuilder()
            .setTitle('Pemilik Voice Channel Telah Keluar')
            .setDescription(`Pemilik channel telah keluar dari voice.\n\n${mentionList}\nKamu dapat mengambil alih channel ini dengan \`claim\` voicenya.`)
            .setColor('Yellow')
            .setFooter({ text: `Channel: ${leftChannel.name}` });

          const outChannel = leftChannel.guild.channels.cache.find(
            c => c.id === voiceData.channelId && c.isTextBased()
          );

          if (outChannel) {
            await outChannel.send({ embeds: [embed] });
          }
        }
      }

      // Handle channel deletion when no humans remain
      if (humans.size === 0) {
        // If there are bot members present, disconnect them first
        if (bots.size > 0) {
          console.log(`Disconnecting ${bots.size} bot(s) from ${leftChannel.name} before deletion`);
          
          // Disconnect all bots simultaneously using Promise.all for better performance
          await Promise.all(Array.from(bots.values()).map(botMember => 
            botMember.voice.disconnect().catch(err => 
              console.warn(`Gagal mengeluarkan bot ${botMember.user.username}:`, err.message)
            )
          ));

          // Add delay to allow Discord voice states to update and prevent race conditions
          setTimeout(async () => {
            try {
              // Re-fetch channel to get updated member count
              const updatedChannel = await leftChannel.guild.channels.fetch(leftChannel.id).catch(() => null);
              
              // Verify channel still exists and is truly empty
              if (updatedChannel && updatedChannel.members.filter(m => !m.user.bot).size === 0) {
                await updatedChannel.delete();
                await VoiceChannelModel.deleteOne({ channelId: leftChannel.id });
                console.log(`Voice channel ${leftChannel.name} dihapus karena kosong setelah bots disconnect.`);
              } else if (updatedChannel) {
                const humanCount = updatedChannel.members.filter(m => !m.user.bot).size;
                console.log(`Voice channel ${leftChannel.name} masih memiliki ${humanCount} human member(s), tidak dihapus.`);
              }
            } catch (err) {
              console.warn(`Gagal menghapus voice channel ${leftChannel.name} setelah bot disconnect:`, err.message);
              // Clean up database entry if channel was already deleted
              if (err.code === 10003) { // Unknown Channel
                await VoiceChannelModel.deleteOne({ channelId: leftChannel.id }).catch(() => {});
              }
            }
          }, 1500); // 1.5 second delay to allow voice state updates
          
        } else {
          // If truly empty (no bots or humans), delete immediately
          try {
            await leftChannel.delete();
            await VoiceChannelModel.deleteOne({ channelId: leftChannel.id });
            console.log(`Voice channel ${leftChannel.name} dihapus karena kosong total.`);
          } catch (err) {
            console.warn(`Gagal menghapus voice channel ${leftChannel.name}:`, err.message);
            // Clean up database entry if channel was already deleted
            if (err.code === 10003) { // Unknown Channel
              await VoiceChannelModel.deleteOne({ channelId: leftChannel.id }).catch(() => {});
            }
          }
        }
      }
    }

    // Handle join/leave notifications
    if (oldState.channelId !== newState.channelId) {
      // Leave notification
      if (oldState.channel && oldState.channel.parentId === voiceCategoryId) {
        const voiceData = await VoiceChannelModel.findOne({ channelId: oldState.channel.id });
        if (voiceData?.notificationsEnabled) {
          const kluarChannel = oldState.guild.channels.cache.get(oldState.channel.id);
          if (kluarChannel?.isTextBased()) { 
            const kluarembed = new EmbedBuilder()
              .setDescription(`👋 <@${oldState.id}> keluar dari voice.`)
              .setColor('#080808');
            await kluarChannel.send({ embeds: [kluarembed] });
          }
        }
      }

      // Join notification
      if (newState.channel && newState.channel.parentId === voiceCategoryId) {
        const voiceData = await VoiceChannelModel.findOne({ channelId: newState.channel.id });
        if (voiceData?.notificationsEnabled) {
          const masukChannel = newState.guild.channels.cache.get(newState.channel.id);
          if (masukChannel?.isTextBased()) {
            const masukembed = new EmbedBuilder()
              .setDescription(`👋 <@${newState.id}> bergabung ke voice.`)
              .setColor('White');
            await masukChannel.send({ embeds: [masukembed] });
          }
        }
      }
    }

    // Handle dynamic permissions
    // When user joins voice
    if (!oldState.channel && newState.channel?.parentId === voiceCategoryId) {
      const voiceChannel = newState.channel;
      const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);
      const voiceData = await VoiceChannelModel.findOne({ channelId: voiceChannel.id });

      if (voiceData) {
        const isOwner = newState.member.id === voiceData.ownerId;
        const isTrusted = voiceData.allowedControllers.includes(newState.member.id);
        const isAuthorized = isOwner || isTrusted;

        try {
          // Set permissions based on channel state and user authorization
          let voicePermissions = {};
          let textPermissions = {};

          if (voiceData.hidden) {
            // If channel is hidden, only allow view for authorized users
            voicePermissions.ViewChannel = isAuthorized;
            textPermissions.ViewChannel = isAuthorized;
          } else {
            // If not hidden, everyone can view
            voicePermissions.ViewChannel = true;
            textPermissions.ViewChannel = true;
          }

          if (voiceData.locked) {
            // If channel is locked, only allow connect for authorized users
            voicePermissions.Connect = isAuthorized;
          } else {
            // If not locked, everyone can connect
            voicePermissions.Connect = true;
          }

          await voiceChannel.permissionOverwrites.edit(newState.member.id, voicePermissions);

          if (textChannel?.isTextBased()) {
            textPermissions.SendMessages = textPermissions.ViewChannel; // Allow sending messages if they can view
            await textChannel.permissionOverwrites.edit(newState.member.id, textPermissions);
          }
        } catch (err) {
          console.error(`Gagal set permission untuk ${newState.member.user.username}:`, err);
        }
      } else {
        // Fallback for channels without data (shouldn't happen normally)
        try {
          await voiceChannel.permissionOverwrites.edit(newState.member.id, {
            ViewChannel: true,
            Connect: true
          });

          if (textChannel?.isTextBased()) {
            await textChannel.permissionOverwrites.edit(newState.member.id, {
              ViewChannel: true,
              SendMessages: true
            });
          }
        } catch (err) {
          console.error(`Gagal set permission untuk ${newState.member.user.username}:`, err);
        }
      }
    }

    // When user leaves voice
    if (oldState.channel?.parentId === voiceCategoryId && !newState.channel) {
      const voiceChannel = oldState.channel;
      const textChannel = voiceChannel.guild.channels.cache.get(voiceChannel.id);

      try {
        await voiceChannel.permissionOverwrites.delete(oldState.member.id).catch(() => {});
        
        if (textChannel?.isTextBased()) {
          await textChannel.permissionOverwrites.delete(oldState.member.id).catch(() => {});
        }
      } catch (err) {
        console.error(`Gagal hapus permission untuk ${oldState.member.user.username}:`, err);
      }
    }
  }
};
