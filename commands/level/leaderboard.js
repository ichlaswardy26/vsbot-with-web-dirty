const {
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const Activity = require("../../schemas/Activity");
const config = require("../../config.js");

module.exports = {
  name: "leaderboard",
  aliases: ["lb", "top", "ranking"],
  description: "Menampilkan member teraktif bulan ini",
  async exec(client, message) {

    // --- Hitung data leaderboard bulan ini (text/characters) ---
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const topMembers = await Activity.find({
      guildId: message.guild.id,
      lastMessageAt: { $gte: startOfMonth },
    })
      .sort({ characters: -1 })
      .limit(10)
      .lean();

    if (!topMembers.length) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle("📊 Leaderboard Kosong")
        .setDescription("Belum ada data aktivitas bulan ini.")
        .setColor(config.colors?.warning || "#FEE75C")
        .setFooter({ text: "Kirim pesan untuk mulai mengumpulkan poin!" });
        
      return message.channel.send({ embeds: [emptyEmbed] });
    }

    // --- Fetch semua user sekaligus ---
    const users = await Promise.all(
      topMembers.map((data) =>
        client.users.fetch(data.userId).catch(() => null)
      )
    );

    // --- Buat teks leaderboard ---
    let rankText = "";
    topMembers.forEach((data, i) => {
      const user = users[i];
      const name = user ? user.username : "Unknown User";
      const xp = data.characters.toLocaleString();

      const medal =
        i === 0
          ? "🥇"
          : i === 1
          ? "🥈"
          : i === 2
          ? "🥉"
          : `**#${i + 1}**`;

      rankText += `${medal} **${name}** — ${xp} Poin\n`;
    });

    const leaderboardText = new TextDisplayBuilder().setContent(
      `## 🏆 Top 10 Member Teraktif\n**Periode:** Bulan Ini\n\n${rankText}`
    );

    // --- Banner media gallery ---
    const banner = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        message.guild.iconURL({ dynamic: true }) || "https://i.pinimg.com/originals/dc/3e/cd/dc3ecdab0fa15f3bd29d1e20718648e6.gif"
      )
    );

    // --- Tombol navigasi baru (Top Voice) ---
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Top Voice")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`leaderboard_voice_${message.author.id}`)
        .setEmoji("🎤")
    );

    // --- Footer ---
    const footer = new TextDisplayBuilder().setContent(
      `### 📊 Informasi
> 📅 Data diperbarui otomatis setiap kali member mengirim pesan.
> 💡 Tekan tombol di atas untuk melihat top member voice.
> 🏆 Poin dihitung berdasarkan jumlah karakter yang dikirim.`
    );

    // --- Gabungkan semua ke container ---
    const container = new ContainerBuilder()
      .addMediaGalleryComponents(banner)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(leaderboardText)
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(actionRow)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(footer);

    // --- Kirim pesan ---
    await message.channel.send({
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
