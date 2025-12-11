const {
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require("discord.js");
const VoiceEvent = require("../../schemas/VoiceEvent");

module.exports = {
  name: "voiceevent",
  description: "Menampilkan leaderboard durasi voice member di server ini",
  async exec(client, message) {
    const guildId = message.guild.id;
    const botId = client.user.id;

    // Fetch all voice event records for this guild
    const records = await VoiceEvent.find({ guildId }).lean();
    if (!records.length) {
      return message.channel.send("⚠️ Belum ada data voice event member di server ini.");
    }

    // Remove bots and the bot itself
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
      rankText = "⚠️ Belum ada data member voice event.";
    }

    const leaderboardText = new TextDisplayBuilder().setContent(
      `🎙️ **Top 10 Member Voice Event Terlama**\n\n${rankText}`
    );
    const banner = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        "https://i.pinimg.com/originals/dc/3e/cd/dc3ecdab0fa15f3bd29d1e20718648e6.gif"
      )
    );
    const footer = new TextDisplayBuilder().setContent(
      `📅 Data voice event diperbarui otomatis.`
    );

    const container = new ContainerBuilder()
      .addMediaGalleryComponents(banner)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(leaderboardText)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(footer);

    await message.channel.send({
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
