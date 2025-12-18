const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const wordChainManager = require("../../util/wordChainManager");
const config = require("../../config.js");

module.exports = {
  name: "wordchain",
  description: "Mulai permainan Word Chain",
  category: "minigames",
  async exec(client, message) {
    try {
      const channelId = message.channel.id;
      
      // Check if there's already an active game in this channel
      if (wordChainManager.getGame(channelId)) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Sudah ada permainan word chain yang aktif di channel ini!`);
      }

      // Create new game session with command runner as lobby master
      wordChainManager.createGame(channelId, {
        level: "Hard",
        language: "ID",
        lobbyMaster: message.author.id
      });

      // Automatically add the command runner as lobby master
      wordChainManager.joinGame(channelId, message.author.id, message.author.username);

      // Create lobby embed matching the example design
      const game = wordChainManager.getGame(channelId);
      const playerCount = game.players.length;
      const lobbyMaster = game.players.find(p => p.isLobbyMaster);
      const playerListText = lobbyMaster ? `@${lobbyMaster.username} 👑` : "Tidak ada";

      const maxRollsText = (game.maxRolls === 999) ? 'Unlimited' : `${game.maxRolls || 1}`;
      const lobbyEmbed = new EmbedBuilder()
        .setTitle("🎮 Word Chain - Lobby")
        .setDescription(
          `**Level:** ${game.difficulty}\n` +
          `**Bahasa:** Indonesia\n` +
          `**Batas Waktu:** ${game.timeLimit} detik per giliran\n` +
          `**Max Rolls:** ${maxRollsText} per pemain\n` +
          `**Bot Lawan:** ${game.botEnabled ? 'Aktif' : 'Nonaktif'}\n\n` +
          `**Daftar Pemain [${playerCount}]**\n` +
          `${playerListText}`
        )
        .setColor(config.colors?.success || "#57F287")
        .setFooter({ text: "Maksimal 10 Pemain | Berdasarkan KBBI" })
        .setTimestamp();

      // Create buttons matching the example
      const joinButton = new ButtonBuilder()
        .setCustomId("wc_join")
        .setLabel("Gabung")
        .setStyle(ButtonStyle.Success);

      const startButton = new ButtonBuilder()
        .setCustomId("wc_start")
        .setLabel("Mulai")
        .setStyle(ButtonStyle.Primary);

      const exitButton = new ButtonBuilder()
        .setCustomId("wc_exit")
        .setLabel("Keluar")
        .setStyle(ButtonStyle.Danger);

      const kickButton = new ButtonBuilder()
        .setCustomId("wc_kick")
        .setLabel("Kick")
        .setStyle(ButtonStyle.Secondary);

      const settingsButton = new ButtonBuilder()
        .setCustomId("wc_settings")
        .setLabel("Pengaturan")
        .setStyle(ButtonStyle.Primary);

      const actionRow1 = new ActionRowBuilder()
        .addComponents(joinButton, startButton, exitButton);

      const actionRow2 = new ActionRowBuilder()
        .addComponents(kickButton, settingsButton);

      // Send the lobby message
      const lobbyMessage = await message.channel.send({
        embeds: [lobbyEmbed],
        components: [actionRow1, actionRow2]
      });

      // Store the message ID for future updates
      wordChainManager.setGameMessage(channelId, lobbyMessage.id);

    } catch (error) {
      console.error("Error creating word chain game:", error);
      message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat membuat permainan. Silakan coba lagi.`);
    }
  }
};
