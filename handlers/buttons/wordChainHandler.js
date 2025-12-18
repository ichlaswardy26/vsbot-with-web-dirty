const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const wordChainManager = require("../../util/wordChainManager");
const config = require("../../config");

async function handleWordChainInteraction(client, interaction) {
  const channelId = interaction.channel.id;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  try {
    // Handle string select menu for settings
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "wc_difficulty_select") {
        return await handleDifficultySelect(interaction, channelId, userId);
      }
      else if (interaction.customId === "wc_time_select") {
        return await handleTimeSelect(interaction, channelId, userId);
      }
      else if (interaction.customId === "wc_rolls_select") {
        return await handleRollsSelect(interaction, channelId, userId);
      }
      else if (interaction.customId === "wc_bot_select") {
        return await handleBotSelect(interaction, channelId, userId);
      }
    }

    // Defer the reply immediately to prevent timeout
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate().catch(() => {});
    }

    // Handle lobby buttons
    if (interaction.customId === "wc_join") {
      await handleJoinGame(interaction, channelId, userId, username);
    }
    else if (interaction.customId === "wc_start") {
      await handleStartGame(interaction, channelId);
    }
    else if (interaction.customId === "wc_exit") {
      await handleExitGame(interaction, channelId);
    }
    else if (interaction.customId === "wc_kick") {
      await handleKickPlayer(interaction, channelId, userId);
    }
    else if (interaction.customId === "wc_settings") {
      await handleSettings(interaction, channelId, userId);
    }
    else if (interaction.customId === "wc_back_to_lobby") {
      await handleBackToLobby(interaction, channelId);
    }
    // Handle gameplay buttons
    else if (interaction.customId === "wc_giveup") {
      await handleGiveUp(interaction, channelId, userId);
    }
    else if (interaction.customId === "wc_roll") {
      await handleRoll(interaction, channelId, userId);
    }

  } catch (error) {
    console.error("Error in word chain handler:", error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ An error occurred while processing your request.",
        ephemeral: true
      }).catch(() => {});
    }
  }
}

function createLobbyEmbed(game) {
  const playerCount = game.players.length;
  
  // Create player list with lobby master having crown
  let playerListText = "";
  game.players.forEach((player) => {
    if (player.isLobbyMaster) {
      playerListText += `@${player.username} 👑\n`;
    } else {
      playerListText += `@${player.username}\n`;
    }
  });
  
  if (playerListText === "") {
    playerListText = "None";
  } else {
    playerListText = playerListText.trim();
  }

  const maxRollsText = (game.maxRolls === 999) ? 'Unlimited' : `${game.maxRolls || 1}`;
  
  return new EmbedBuilder()
    .setDescription(
      `**Level: ${game.difficulty}**\n` +
      `**Language: ID**\n` +
      `**Time Limit: ${game.timeLimit}s per turn**\n` +
      `**Max Rolls: ${maxRollsText} per player**\n` +
      `**Bot Opponent: ${game.botEnabled ? 'Enabled' : 'Disabled'}**\n\n` +
      `**Player List [${playerCount}]**\n` +
      `${playerListText}\n\n` +
      `Premium Max 10 Player | Based on KBBI Edisi IV`
    )
    .setColor(0x2ecc71)
    .setTimestamp();
}

async function handleJoinGame(interaction, channelId, userId, username) {
  const result = wordChainManager.joinGame(channelId, userId, username);
  
  if (!result.success) {
    return await interaction.editReply({
      content: `❌ ${result.message}`
    }).catch(() => {});
  }

  // Update the lobby embed with new player list
  const game = wordChainManager.getGame(channelId);
  const updatedEmbed = createLobbyEmbed(game);

  // Create buttons for lobby
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

  await interaction.editReply({
    embeds: [updatedEmbed],
    components: [actionRow1, actionRow2]
  }).catch(() => {});
}

async function handleStartGame(interaction, channelId) {
  const userId = interaction.user.id;
  const gameSession = wordChainManager.getGame(channelId);
  
  // Check if user is the lobby master
  if (!gameSession || gameSession.lobbyMaster !== userId) {
    return await interaction.editReply({
      content: `❌ Only the lobby master can start the game!`
    }).catch(() => {});
  }
  
  const result = await wordChainManager.startGame(channelId);
  
  if (!result.success) {
    return await interaction.editReply({
      content: `❌ ${result.message}`
    }).catch(() => {});
  }

  // Create gameplay embed matching the example design
  const game = wordChainManager.getGame(channelId);
  const currentWord = result.word;
  const currentPlayer = wordChainManager.getCurrentPlayer(channelId);
  
  // Create player list with scores for Turn | Player | Point section
  let playerScoreText = "";
  game.players.forEach((player) => {
    const isCurrentTurn = player.userId === currentPlayer?.userId;
    const turnIndicator = isCurrentTurn ? config.emojis.dot : config.emojis.blank;
    if (player.isLobbyMaster) {
      playerScoreText += `${turnIndicator} @${player.username} 👑 [${player.points}] 🔥${player.points}\n`;
    } else {
      playerScoreText += `${turnIndicator} @${player.username} [${player.points}] 🔥${player.points}\n`;
    }
  });

  // Top section - keep lobby info
  // const playerCount = game.players.length;
  // let lobbyPlayerList = "";
  // game.players.forEach((player) => {
  //   if (player.isLobbyMaster) {
  //     lobbyPlayerList += `@${player.username} 👑\n`;
  //   } else {
  //     lobbyPlayerList += `@${player.username}\n`;
  //   }
  // });

  const gameplayEmbed = new EmbedBuilder()
    .setDescription(
      `**${currentWord.entry.toUpperCase()} +${currentWord.points}**\n\n` +
      `**Turn | Player | Point**\n` +
      `${playerScoreText.trim()}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Lanjutkan kata dengan awalan [ ${currentWord.cleanedEntry} ]**\n` +
      `**Acak kata: roll**`
    )
    .setColor(0x2ecc71)
    .setTimestamp();

  // Create gameplay buttons
  const giveUpButton = new ButtonBuilder()
    .setCustomId("wc_giveup")
    .setLabel("Give Up")
    .setStyle(ButtonStyle.Danger);

  const rollButton = new ButtonBuilder()
    .setCustomId("wc_roll")
    .setLabel("Roll")
    .setStyle(ButtonStyle.Secondary);

  const gameplayRow = new ActionRowBuilder()
    .addComponents(giveUpButton, rollButton);

  await interaction.editReply({
    embeds: [gameplayEmbed],
    components: [gameplayRow]
  }).catch(() => {});

  // Start turn timer
  wordChainManager.startTurnTimer(channelId, async (timerResult) => {
    if (timerResult.gameEnded) {
      await handleGameEnd(interaction, channelId, timerResult.winner, timerResult.reason);
    } else if (timerResult.nextPlayer) {
      await interaction.channel.send(`⏰ Time's up for ${currentPlayer.username}! Moving to next player...`);
      // Update embed for next player
      const newEmbed = new EmbedBuilder()
        .setDescription(
          `**${game.currentWord.entry.toUpperCase()} +${game.currentWord.points}**\n\n` +
          `**Turn | Player | Point**\n` +
          `${playerScoreText.trim()}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**Lanjutkan kata dengan awalan [ ${game.currentWord.cleanedEntry} ]**\n` +
          `**Acak kata: roll**`
        )
        .setColor(0x2ecc71)
        .setTimestamp();
      
      try {
        const originalMessage = await interaction.channel.messages.fetch(game.messageId);
        await originalMessage.edit({ embeds: [newEmbed], components: [gameplayRow] });
      } catch (error) {
        console.error("Error updating embed after timeout:", error);
      }
    }
  });

  // Check if first player is bot
  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(async () => {
      const botResult = await wordChainManager.botTurn(channelId);
      if (botResult.success) {
        if (botResult.botGaveUp) {
          await interaction.channel.send(`🤖 ${botResult.message}`);
          if (botResult.gameEnded) {
            wordChainManager.clearTurnTimer(channelId);
            await handleGameEnd(interaction, channelId, botResult.winner);
          }
        } else if (botResult.gameEnded) {
          wordChainManager.clearTurnTimer(channelId);
          await interaction.channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
          await handleGameEnd(interaction, channelId, botResult.winner);
        } else {
          await interaction.channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
          // Update embed with new word
          const newGame = wordChainManager.getGame(channelId);
          const newCurrentPlayer = wordChainManager.getCurrentPlayer(channelId);
          
          let newPlayerScoreText = "";
          newGame.players.forEach((player) => {
            const isCurrentTurn = player.userId === newCurrentPlayer?.userId;
            const turnIndicator = isCurrentTurn ? config.emojis.dot : config.emojis.blank;
            if (player.isLobbyMaster) {
              newPlayerScoreText += `${turnIndicator} @${player.username} 👑 [${player.points}] 🔥${player.points}\n`;
            } else {
              newPlayerScoreText += `${turnIndicator} @${player.username} [${player.points}] 🔥${player.points}\n`;
            }
          });

          const newEmbed = new EmbedBuilder()
            .setDescription(
              `**${botResult.nextWord.entry.toUpperCase()} +${botResult.nextWord.points}**\n\n` +
              `**Turn | Player | Point**\n` +
              `${newPlayerScoreText.trim()}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `**Lanjutkan kata dengan awalan [ ${botResult.nextWord.cleanedEntry} ]**\n` +
              `**Acak kata: roll**`
            )
            .setColor(0x2ecc71)
            .setTimestamp();

          try {
            const originalMessage = await interaction.channel.messages.fetch(newGame.messageId);
            await originalMessage.edit({ embeds: [newEmbed], components: [gameplayRow] });
          } catch (error) {
            console.error("Error updating embed after bot turn:", error);
          }
        }
      }
    }, 2000 + Math.random() * 3000);
  }
}

async function handleExitGame(interaction, channelId) {
  const userId = interaction.user.id;
  const gameSession = wordChainManager.getGame(channelId);
  
  // Check if user is the lobby master
  if (!gameSession || gameSession.lobbyMaster !== userId) {
    return await interaction.editReply({
      content: `❌ Only the lobby master can exit the game!`
    }).catch(() => {});
  }
  
  wordChainManager.clearTurnTimer(channelId);
  wordChainManager.exitGame(channelId);
  
  const cancelledEmbed = new EmbedBuilder()
    .setTitle("❌ Game Cancelled")
    .setDescription("The Word Chain Game has been cancelled.")
    .setColor(0xe74c3c)
    .setTimestamp();

  await interaction.editReply({
    embeds: [cancelledEmbed],
    components: []
  }).catch(() => {});
}

async function handleGiveUp(interaction, channelId, userId) {
  const result = wordChainManager.giveUp(channelId, userId);
  
  if (!result.success) {
    return await interaction.editReply({
      content: `❌ ${result.message}`
    }).catch(() => {});
  }

  await interaction.editReply({
    content: `🏳️ ${result.message}`
  }).catch(() => {});

  // Check if game ended
  if (result.gameEnded) {
    await handleGameEnd(interaction, channelId, result.winner, result.reason);
  }
}

async function handleRoll(interaction, channelId, userId) {
  const result = await wordChainManager.rollNewWord(channelId, userId);
  
  if (!result.success) {
    return await interaction.editReply({
      content: `❌ ${result.message}`
    }).catch(() => {});
  }

  // Update the gameplay embed with the new rolled word
  const game = wordChainManager.getGame(channelId);
  const currentWord = result.word;
  const currentPlayer = wordChainManager.getCurrentPlayer(channelId);
  
  // Create player list with scores for Turn | Player | Point section
  let playerScoreText = "";
  game.players.forEach((player) => {
    const isCurrentTurn = player.userId === currentPlayer?.userId;
    const turnIndicator = isCurrentTurn ? config.emojis.dot : config.emojis.blank;
    if (player.isLobbyMaster) {
      playerScoreText += `${turnIndicator} @${player.username} 👑 [${player.points}] 🔥${player.points}\n`;
    } else {
      playerScoreText += `${turnIndicator} @${player.username} [${player.points}] 🔥${player.points}\n`;
    }
  });

  // Top section - keep lobby info
  // const playerCount = game.players.length;
  // let lobbyPlayerList = "";
  // game.players.forEach((player) => {
  //   if (player.isLobbyMaster) {
  //     lobbyPlayerList += `@${player.username} 👑\n`;
  //   } else {
  //     lobbyPlayerList += `@${player.username}\n`;
  //   }
  // });

  const gameplayEmbed = new EmbedBuilder()
    .setDescription(
      `**${currentWord.entry.toUpperCase()} +${currentWord.points}**\n\n` +
      `**Turn | Player | Point**\n` +
      `${playerScoreText.trim()}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Lanjutkan kata dengan awalan [ ${currentWord.cleanedEntry} ]**\n` +
      `**Acak kata: roll**`
    )
    .setColor(0x2ecc71)
    .setTimestamp();

  // Create gameplay buttons
  const giveUpButton = new ButtonBuilder()
    .setCustomId("wc_giveup")
    .setLabel("Give Up")
    .setStyle(ButtonStyle.Danger);

  const rollButton = new ButtonBuilder()
    .setCustomId("wc_roll")
    .setLabel("Roll")
    .setStyle(ButtonStyle.Secondary);

  const gameplayRow = new ActionRowBuilder()
    .addComponents(giveUpButton, rollButton);

  await interaction.editReply({
    embeds: [gameplayEmbed],
    components: [gameplayRow]
  }).catch(() => {});
}

async function handleKickPlayer(interaction, channelId, userId) {
  // For now, we'll implement a simple kick of the last non-lobby-master player
  // In a full implementation, this would show a user selection modal
  const gameSession = wordChainManager.getGame(channelId);
  
  // Check if user is the lobby master
  if (!gameSession || gameSession.lobbyMaster !== userId) {
    return await interaction.editReply({
      content: `❌ Only the lobby master can kick players!`
    }).catch(() => {});
  }

  // Find a player to kick (last non-lobby-master player)
  const playersToKick = gameSession.players.filter(p => !p.isLobbyMaster);
  if (playersToKick.length === 0) {
    return await interaction.editReply({
      content: `❌ No players to kick!`
    }).catch(() => {});
  }

  const targetPlayer = playersToKick[playersToKick.length - 1];
  const result = wordChainManager.kickPlayer(channelId, userId, targetPlayer.userId);

  if (!result.success) {
    return await interaction.editReply({
      content: `❌ ${result.message}`
    }).catch(() => {});
  }

  // Update the lobby embed
  await updateLobbyEmbed(interaction, channelId);
}


async function updateLobbyEmbed(interaction, channelId) {
  const game = wordChainManager.getGame(channelId);
  const updatedEmbed = createLobbyEmbed(game);

  // Create buttons for lobby
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

  const actionRow1 = new ActionRowBuilder()
    .addComponents(joinButton, startButton, exitButton);

  const settingsButton = new ButtonBuilder()
    .setCustomId("wc_settings")
    .setLabel("Settings")
    .setStyle(ButtonStyle.Primary);

  const actionRow2 = new ActionRowBuilder()
    .addComponents(kickButton, settingsButton);

  await interaction.editReply({
    embeds: [updatedEmbed],
    components: [actionRow1, actionRow2]
  });
}

async function handleGameEnd(interaction, channelId, winner, reason) {
  const game = wordChainManager.getGame(channelId);
  
  let endGameEmbed;
  
  if (winner) {
    // Create player list with winner having crown and others having skull
    let finalPlayerList = "";
    game.players
      .sort((a, b) => b.points - a.points)
      .forEach((player) => {
        if (player.userId === winner.userId) {
          finalPlayerList += `@${player.username} [${player.points}] 👑\n`;
        } else {
          finalPlayerList += `@${player.username} [${player.points}] ☠️\n`;
        }
      });

    endGameEmbed = new EmbedBuilder()
      .setDescription(
        `**Game Berakhir**\n\n` +
        `**${game.currentWord.entry.toUpperCase()} +${game.currentWord.points}**\n\n` +
        `**Pemenangnya adalah @${winner.username}**\n\n` +
        `${finalPlayerList.trim()}`
      )
      .setColor(0x3498db)
      .setFooter({ text: "Sambung Kata" })
      .setTimestamp();
  } else {
    endGameEmbed = new EmbedBuilder()
      .setDescription(
        `**Game Berakhir**\n\n` +
        `${reason || "The game has ended."}`
      )
      .setColor(0x95a5a6)
      .setFooter({ text: "Sambung Kata" })
      .setTimestamp();
  }

  // Get the original message and update it
  try {
    const originalMessage = await interaction.channel.messages.fetch(game.messageId);
    await originalMessage.edit({
      embeds: [endGameEmbed],
      components: []
    });
  } catch (error) {
    console.error("Error updating end game embed:", error);
    // If we can't edit the original message, send a new one
    await interaction.channel.send({
      embeds: [endGameEmbed],
      components: []
    });
  }

  // Clean up the game session
  wordChainManager.exitGame(channelId);
}

async function handleSettings(interaction, channelId, userId) {
  const gameSession = wordChainManager.getGame(channelId);
  
  if (!gameSession || gameSession.lobbyMaster !== userId) {
    return await interaction.editReply({
      content: `❌ Only the lobby master can change settings!`
    }).catch(() => {});
  }

  const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

  const settingsEmbed = new EmbedBuilder()
    .setTitle("⚙️ Game Settings")
    .setDescription(
      `**Current Settings:**\n` +
      `Difficulty: ${gameSession.difficulty}\n` +
      `Time Limit: ${gameSession.timeLimit}s per turn\n` +
      `Max Rolls: ${gameSession.maxRolls || 1} per player\n` +
      `Bot Opponent: ${gameSession.botEnabled ? 'Enabled' : 'Disabled'}\n\n` +
      `Use the menus below to adjust settings.`
    )
    .setColor(0x3498db);

  const difficultySelect = new StringSelectMenuBuilder()
    .setCustomId("wc_difficulty_select")
    .setPlaceholder("Select Difficulty")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Easy")
        .setDescription("4-6 letter words")
        .setValue("Easy")
        .setDefault(gameSession.difficulty === "Easy"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Medium")
        .setDescription("6-10 letter words")
        .setValue("Medium")
        .setDefault(gameSession.difficulty === "Medium"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Hard")
        .setDescription("8-15 letter words")
        .setValue("Hard")
        .setDefault(gameSession.difficulty === "Hard")
    );

  const timeSelect = new StringSelectMenuBuilder()
    .setCustomId("wc_time_select")
    .setPlaceholder("Select Time Limit")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("15 seconds")
        .setValue("15")
        .setDefault(gameSession.timeLimit === 15),
      new StringSelectMenuOptionBuilder()
        .setLabel("30 seconds")
        .setValue("30")
        .setDefault(gameSession.timeLimit === 30),
      new StringSelectMenuOptionBuilder()
        .setLabel("45 seconds")
        .setValue("45")
        .setDefault(gameSession.timeLimit === 45),
      new StringSelectMenuOptionBuilder()
        .setLabel("60 seconds")
        .setValue("60")
        .setDefault(gameSession.timeLimit === 60)
    );

  const rollsSelect = new StringSelectMenuBuilder()
    .setCustomId("wc_rolls_select")
    .setPlaceholder("Select Max Rolls")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("1 roll")
        .setValue("1")
        .setDefault((gameSession.maxRolls || 1) === 1),
      new StringSelectMenuOptionBuilder()
        .setLabel("2 rolls")
        .setValue("2")
        .setDefault(gameSession.maxRolls === 2),
      new StringSelectMenuOptionBuilder()
        .setLabel("3 rolls")
        .setValue("3")
        .setDefault(gameSession.maxRolls === 3),
      new StringSelectMenuOptionBuilder()
        .setLabel("5 rolls")
        .setValue("5")
        .setDefault(gameSession.maxRolls === 5),
      new StringSelectMenuOptionBuilder()
        .setLabel("Unlimited")
        .setValue("999")
        .setDefault(gameSession.maxRolls === 999)
    );

  const botSelect = new StringSelectMenuBuilder()
    .setCustomId("wc_bot_select")
    .setPlaceholder("Bot Opponent")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Enabled")
        .setDescription("Bot will join if you play alone")
        .setValue("true")
        .setDefault(gameSession.botEnabled === true),
      new StringSelectMenuOptionBuilder()
        .setLabel("Disabled")
        .setDescription("No bot opponent")
        .setValue("false")
        .setDefault(gameSession.botEnabled === false)
    );

  const backButton = new ButtonBuilder()
    .setCustomId("wc_back_to_lobby")
    .setLabel("Back to Lobby")
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(difficultySelect);
  const row2 = new ActionRowBuilder().addComponents(timeSelect);
  const row3 = new ActionRowBuilder().addComponents(rollsSelect);
  const row4 = new ActionRowBuilder().addComponents(botSelect);
  const row5 = new ActionRowBuilder().addComponents(backButton);

  await interaction.editReply({
    embeds: [settingsEmbed],
    components: [row1, row2, row3, row4, row5]
  }).catch(() => {});
}

async function handleDifficultySelect(interaction, channelId, userId) {
  const difficulty = interaction.values[0];
  const result = wordChainManager.updateSettings(channelId, { difficulty });
  
  if (!result.success) {
    return await interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true
    }).catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});
  await handleSettings(interaction, channelId, userId);
}

async function handleTimeSelect(interaction, channelId, userId) {
  const timeLimit = parseInt(interaction.values[0]);
  const result = wordChainManager.updateSettings(channelId, { timeLimit });
  
  if (!result.success) {
    return await interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true
    }).catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});
  await handleSettings(interaction, channelId, userId);
}

async function handleRollsSelect(interaction, channelId, userId) {
  const maxRolls = parseInt(interaction.values[0]);
  const result = wordChainManager.updateSettings(channelId, { maxRolls });
  
  if (!result.success) {
    return await interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true
    }).catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});
  await handleSettings(interaction, channelId, userId);
}

async function handleBotSelect(interaction, channelId, userId) {
  const botEnabled = interaction.values[0] === "true";
  const result = wordChainManager.updateSettings(channelId, { botEnabled });
  
  if (!result.success) {
    return await interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true
    }).catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});
  await handleSettings(interaction, channelId, userId);
}

async function handleBackToLobby(interaction, channelId) {
  const game = wordChainManager.getGame(channelId);
  if (!game) {
    return await interaction.editReply({
      content: "❌ Game not found!"
    }).catch(() => {});
  }

  await updateLobbyEmbed(interaction, channelId);
}

module.exports = handleWordChainInteraction;

