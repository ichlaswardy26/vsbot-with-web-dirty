const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const CustomRoleModel = require("../../schemas/customRole");
const { BOOST_ROLE_ID, DONATE_ROLE_ID } = require("../../config");

module.exports = {
  name: "guildMemberUpdate",
  exec: async (client, oldMember, newMember) => {
  const boostAnnounceLogChannel = client.channels.cache.get(
    config.boostLogsChannelId
  );
  const boostAnnounceChannel = client.channels.cache.get(
    config.boostAnnounceChannelId
  );
  const format = {
    0: "No Level",
    1: "Level 1",
    2: "Level 2",
    3: "Level 3",
  };
  const boostLevel = format[newMember.guild.premiumTier];
  if (
    !oldMember.roles.cache.has(
      newMember.guild.roles.premiumSubscriberRole?.id
    ) &&
    newMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole?.id)
  ) {
    const boostAnnounceEmbed = new EmbedBuilder()
      .setAuthor({
        name: `Selamat kami memiliki booster baru!`,
        iconURL: newMember.guild.iconURL({ size: 1024 }),
      })
      .setDescription(
        `Terimakasih ${newMember} sudah boost server ini.`
      )
      .addFields({
        name: "💎 Total Boost:",
        value: `${newMember.guild.premiumSubscriptionCount} Boost | Level (${boostLevel})`,
        inline: false,
      })
      .setColor("F47FFF")
      .setFooter({
        text: `${newMember.guild.name}`,
        iconURL: newMember.user.displayAvatarURL({ size: 1024 }),
      })
      .setTimestamp();
    const msg = await boostAnnounceChannel.send({
      content: `${newMember} \`${newMember}\``,
      embeds: [boostAnnounceEmbed],
    });
    msg.react("🥳");
    // Boost Announce Log System
    const boostLogEmbed = new EmbedBuilder()
      .setAuthor({ name: `Sistem Deteksi Boost`, iconURL: client.user.displayAvatarURL(), })
      .addFields([
        {
          name: "💎 Boost Oleh",
          value: `${newMember.user} (${newMember.user.username})`,
        },
        {
          name: "🎉 Server Boost",
          value: `<t:${Math.round(
            newMember.premiumSinceTimestamp / 1000
          )}:D> (<t:${Math.round(newMember.premiumSinceTimestamp / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "⏰ Akun Dibuat",
          value: `<t:${Math.round(
            newMember.user.createdTimestamp / 1000
          )}:D> (<t:${Math.round(newMember.user.createdTimestamp / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "📆 Join Server",
          value: `<t:${Math.round(
            newMember.joinedTimestamp / 1000
          )}:D> (<t:${Math.round(newMember.joinedTimestamp / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "💜 Total Boost",
          value: `${newMember.guild.premiumSubscriptionCount} Boost | Level (${boostLevel})`,
          inline: false,
        },
        {
          name: "✅ Role Didapatkan",
          value: `${newMember.guild.roles.premiumSubscriberRole} (${newMember.guild.roles.premiumSubscriberRole?.id})`,
          inline: false,
        }
      ])
      .setThumbnail(newMember.user.displayAvatarURL({ size: 1024 }))
      .setColor(newMember.guild.members.me.displayHexColor)
      .setFooter({
        text: `Member ID: ${newMember.user.id}`,
        iconURL: newMember.guild.iconURL({ size: 1024 }),
      })
      .setTimestamp();
    boostAnnounceLogChannel.send({
      embeds: [boostLogEmbed],
    });
  } 
    if (
    oldMember.roles.cache.has(
      newMember.guild.roles.premiumSubscriberRole?.id
    ) &&
    !newMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole?.id)
  ) {
    // Unboost Log System
    const unboostEmbedLog = new EmbedBuilder()
      .setAuthor({
        name: `Sistem Deteksi UnBoost atau Kedaluwarsa Boost`,
        iconURL: client.user.displayAvatarURL(),
      })
      .addFields(
        {
          name: "📌 UnBoost",
          value: `${oldMember.user} (${oldMember.user.username})`,
        },
        {
          name: "⏰ Account Dibuat",
          value: `<t:${Math.round(
            oldMember.user.createdTimestamp / 1000
          )}:D> (<t:${Math.round(oldMember.user.createdTimestamp / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "📆 Join Server",
          value: `<t:${Math.round(
            oldMember.joinedTimestamp / 1000
          )}:D> (<t:${Math.round(oldMember.joinedTimestamp / 1000)}:R>)`,
          inline: true,
        },

        {
          name: "💜 Total Boost",
          value: oldMember.guild.premiumSubscriptionCount
            ? `${oldMember.guild.premiumSubscriptionCount} Boost | Level (${boostLevel})`
            : "Tidak ada Boost server ini.",
          inline: false,
        },

        {
          name: "❌ Role Dihapus",
          value: `${oldMember.guild.roles.premiumSubscriberRole}  (${oldMember.guild.roles.premiumSubscriberRole?.id})`,
          inline: false,
        }
      )
      .setThumbnail(oldMember.user.displayAvatarURL({ size: 1024 }))
      .setColor(oldMember.guild.members.me.displayHexColor)
      .setFooter({
        text: `Member ID: ${oldMember.user.id}`,
        iconURL: oldMember.guild.iconURL({ size: 1024 }),
      })
      .setTimestamp();
    const unboostLogMessage = await boostAnnounceLogChannel.send({
      embeds: [unboostEmbedLog],
      components: oldMember.guild.premiumSubscriptionCount
        ? [totalBoosterRow]
        : [],
    });
    unboostLogMessage.pin();
  }

  // --- Hapus custom role jika user kehilangan Boost atau Donate ---
const lostTypes = [];

if (
  oldMember.roles.cache.has(BOOST_ROLE_ID) &&
  !newMember.roles.cache.has(BOOST_ROLE_ID)
) {
  lostTypes.push("boost");
}

if (
  oldMember.roles.cache.has(DONATE_ROLE_ID) &&
  !newMember.roles.cache.has(DONATE_ROLE_ID)
) {
  lostTypes.push("donate");
}

for (const roleType of lostTypes) {
  const customRole = await CustomRoleModel.findOne({
    guildId: oldMember.guild.id,
    createdBy: oldMember.id,
    roleType,
  });

  if (!customRole) continue;

  const role = oldMember.guild.roles.cache.get(customRole.roleId);
  if (role) {
    try {
      await role.delete(`User lost ${roleType} role`);
    } catch (err) {
      console.warn(`Gagal menghapus role: ${role.name}`, err);
    }
  }

  await CustomRoleModel.deleteOne({ _id: customRole._id });

  // Hapus role dari member lain
  for (const memberId of customRole.members) {
    if (memberId === oldMember.id) continue;
    const member = await oldMember.guild.members.fetch(memberId).catch(() => null);
    if (member && member.roles.cache.has(customRole.roleId)) {
      try {
        await member.roles.remove(customRole.roleId, "Custom role dihapus karena creator kehilangan Boost/Donate");
      } catch (err) {
        console.warn(`Gagal menghapus role dari ${member.user.tag}`, err);
      }
    }
  }

const dmEmbed = new EmbedBuilder()
  .setTitle(`${config.emojis.important} **|** Custom Role Dihapus`)
  .setDescription(
    `${config.emojis.seraphyx} **|** Custom role kamu dengan tipe **${roleType === "boost" ? "Boost" : "Donate"}** telah dihapus karena kamu kehilangan role tersebut.`
  )
  .addFields(
    { name: "Nama Role", value: `${role?.name || "Tidak ditemukan"}`, inline: true },
    { name: "Tipe Role", value: `${roleType.charAt(0).toUpperCase() + roleType.slice(1)}`, inline: true }
  )
  .setColor("White")
  .setTimestamp()
  .setFooter({ text: `${oldMember.guild.name}`, iconURL: oldMember.guild.iconURL() });

   oldMember.send({ embeds: [dmEmbed] }).catch(() => {});

    // Log ke channel admin
  const logChannel = client.channels.cache.get(config.customRoleLogsChannelId);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle(`${config.emojis.seraphyx} **|** Custom Role Dihapus Otomatis`)
      .setDescription(`Custom role user telah dihapus karena kehilangan role Boost/Donate.`)
      .addFields(
        { name: "👤 User", value: `${oldMember.user} (\`${oldMember.id}\`)`, inline: false },
        { name: "🎭 Nama Role", value: `${role?.name || "Tidak ditemukan"}`, inline: true },
        { name: "📦 Tipe Role", value: `${roleType.charAt(0).toUpperCase() + roleType.slice(1)}`, inline: true },
        { name: "🕒 Waktu", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor("White")
      .setFooter({ text: "Sistem Auto-Hapus Custom Role", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    logChannel.send({ embeds: [logEmbed] });
  }
   }
  }
}