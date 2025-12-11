const {
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require("discord.js");
const VoiceActivity = require("../../schemas/VoiceActivity");

async function leaderboardHandler(client, interaction) {
  if (interaction.customId.startsWith("leaderboard_voice_")) {
    try {
      const guildId = interaction.guild.id;
      const botId = client.user.id;

      // Fetch all voice activity records for this guild
      const records = await VoiceActivity.find({ guildId }).lean();
      if (!records.length) {
        return interaction.reply({
          content: "⚠️ Belum ada data voice activity di server ini.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Remove bots
      const users = await Promise.all(records.map(d => client.users.fetch(d.userId).catch(() => null)));
      const filteredRecords = records.filter((r, i) => {
        const user = users[i];
        return user && !user.bot && user.id !== botId;
      });

      // Calculate real-time voice duration for active users
      const now = Date.now();
      const activeVoiceUsers = global.activeVoiceUsers || new Map();
      
      for (const record of filteredRecords) {
        const activeData = activeVoiceUsers.get(record.userId);
        if (activeData && activeData.guildId === guildId && activeData.joinedAt) {
          const currentSessionSeconds = Math.floor((now - activeData.joinedAt) / 1000);
          record.voiceSeconds = (record.voiceSeconds || 0) + currentSessionSeconds;
        }
      }

      // Sort and take top 10
      const topVoiceMembers = filteredRecords
        .sort((a, b) => (b.voiceSeconds || 0) - (a.voiceSeconds || 0))
        .slice(0, 10);

      let rankText = "";
      if (topVoiceMembers.length > 0) {
        const topUsers = await Promise.all(topVoiceMembers.map(d => client.users.fetch(d.userId).catch(() => null)));
        topVoiceMembers.forEach((data, i) => {
          const user = topUsers[i];
          const name = user ? user.username : "Unknown User";
          const totalSeconds = data.voiceSeconds || 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
          rankText += `${medal} **${name}** — ${hours}h ${minutes}m ${seconds}s\n`;
        });
      } else {
        rankText = "⚠️ Belum ada data member voice.";
      }

      const leaderboardText = new TextDisplayBuilder().setContent(
        `🎙️ **Top 10 Member Voice Terlama**\n\n${rankText}`
      );
      const banner = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(
          "https://i.pinimg.com/originals/dc/3e/cd/dc3ecdab0fa15f3bd29d1e20718648e6.gif"
        )
      );
      const footer = new TextDisplayBuilder().setContent(
        `📅 Data voice activity diperbarui otomatis.`
      );

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(banner)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(leaderboardText)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer);

      await interaction.reply({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in leaderboard_voice button:", error);
      return interaction.reply({
        content: "❌ Terjadi kesalahan saat mengambil data voice leaderboard.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = leaderboardHandler;
