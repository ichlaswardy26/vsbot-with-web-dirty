const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const wordChainManager = require("../util/wordChainManager");

module.exports = {
  name: "wordchain",
  description: "Start a Mini Word Chain Game",
  category: "games",
  async exec(client, message, args) {
    try {
      const channelId = message.channel.id;
      
      // Check if there's already an active game in this channel
      if (wordChainManager.getGame(channelId)) {
        return message.reply("❌ There's already an active word chain game in this channel!");
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
      const playerListText = lobbyMaster ? `@${lobbyMaster.username} 👑` : "None";

      const maxRollsText = (game.maxRolls === 999) ? 'Unlimited' : `${game.maxRolls || 1}`;
      const lobbyEmbed = new EmbedBuilder()
        .setDescription(
          `**Level: ${game.difficulty}**\n` +
          `**Language: ID**\n` +
          `**Time Limit: ${game.timeLimit}s per turn**\n` +
          `**Max Rolls: ${maxRollsText} per player**\n` +
          `**Bot Opponent: ${game.botEnabled ? 'Enabled' : 'Disabled'}**\n\n` +
          `**Player List [${playerCount}]**\n` +
          `${playerListText}`
        )
        .setColor(0x2ecc71)
        .setFooter({ text: "Max 10 Player | Based on KBBI" })

      // Create buttons matching the example
      const joinButton = new ButtonBuilder()
        .setCustomId("wc_join")
        .setLabel("Join")
        .setStyle(ButtonStyle.Success);

      const startButton = new ButtonBuilder()
        .setCustomId("wc_start")
        .setLabel("Start")
        .setStyle(ButtonStyle.Primary);

      const exitButton = new ButtonBuilder()
        .setCustomId("wc_exit")
        .setLabel("Exit")
        .setStyle(ButtonStyle.Danger);

      const kickButton = new ButtonBuilder()
        .setCustomId("wc_kick")
        .setLabel("Kick")
        .setStyle(ButtonStyle.Secondary);

      const settingsButton = new ButtonBuilder()
        .setCustomId("wc_settings")
        .setLabel("Settings")
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
      message.reply("❌ An error occurred while creating the game. Please try again.");
    }
  }
};
