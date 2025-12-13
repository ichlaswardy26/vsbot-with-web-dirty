const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const wordChainManager = require("../util/wordChainManager");
// const config = require("../config");

async function handleWordChainMessage(client, message) {
  // Skip if message is undefined or from a bot
  if (!message || !message.author || message.author.bot) return false;

  const channelId = message.channel.id;
  const game = wordChainManager.getGame(channelId);
  
  // Skip if no active game in this channel
  if (!game || game.status !== "playing") return false;

  const userId = message.author.id;
  const username = message.author.username;
  
  // Check if the user is part of the game
  const player = game.players.find(p => p.userId === userId);
  if (!player || player.status !== "active") return false;

  // Check if it's the player's turn
  if (!wordChainManager.isPlayerTurn(channelId, userId)) return false;

  // Get the message content as the answer
  const answer = message.content.trim();
  
  // Skip if message is empty or looks like a command
  if (!answer || answer.startsWith('..') || answer.startsWith('/')) return false;

  try {
    // Process the answer (don't delete the player's message)
    const result = await wordChainManager.submitAnswer(channelId, userId, answer);
    
    if (!result.success) {
      // Send error message and return without updating embed
      await message.channel.send(`❌ ${result.message}`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000); // Delete after 5 seconds
      });
      return true;
    }

    // Clear existing timer first
    wordChainManager.clearTurnTimer(channelId);

    // Success - send new embed below the player's message
    if (result.gameEnded) {
      await sendGameEndEmbed(message.channel, game, result.winner);
    } else {
      await sendNewGameplayEmbed(message.channel, game, result.nextWord, result.points, username, answer);
      
      // Check if next player is bot
      const nextPlayer = wordChainManager.getCurrentPlayer(channelId);
      if (nextPlayer && nextPlayer.isBot) {
        // Bot turn - respond within the game's time limit
        // Bot uses 30-70% of the time limit to make it feel more natural
        const botThinkTime = game.timeLimit * 1000 * (0.3 + Math.random() * 0.4);
        console.log(`[WordChain] Bot's turn detected. Will respond in ${Math.round(botThinkTime)}ms`);
        setTimeout(async () => {
          try {
            console.log(`[WordChain] Bot is now processing turn...`);
            const botResult = await wordChainManager.botTurn(channelId);
            console.log(`[WordChain] Bot result:`, botResult);
            
            if (botResult.success) {
              if (botResult.botGaveUp) {
                await message.channel.send(`🤖 ${botResult.message}`);
                if (botResult.gameEnded) {
                  await sendGameEndEmbed(message.channel, game, botResult.winner);
                } else {
                  // Bot gave up, move to next player
                  await sendNewGameplayEmbed(message.channel, game, game.currentWord, 0, "System", "bot_gaveup");
                  // Start timer for human player
                  startTimerForHumanPlayer(channelId, message.channel);
                }
              } else if (botResult.gameEnded) {
                await message.channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
                await sendGameEndEmbed(message.channel, game, botResult.winner);
              } else {
                await message.channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
                await sendNewGameplayEmbed(message.channel, game, botResult.nextWord, botResult.points, "Villain Bot", botResult.botAnswer);
                
                // Start timer for human player's turn
                startTimerForHumanPlayer(channelId, message.channel);
              }
            } else {
              console.error(`[WordChain] Bot turn failed:`, botResult.message);
              await message.channel.send(`❌ Bot encountered an error: ${botResult.message}`);
              // Move to next player
              wordChainManager.nextTurn(channelId);
              const updatedGame = wordChainManager.getGame(channelId);
              if (updatedGame) {
                await sendNewGameplayEmbed(message.channel, updatedGame, updatedGame.currentWord, 0, "System", "bot_error");
                startTimerForHumanPlayer(channelId, message.channel);
              }
            }
          } catch (error) {
            console.error(`[WordChain] Error in bot turn:`, error);
            await message.channel.send(`❌ Bot encountered an error. Moving to next player...`);
            // Move to next player
            wordChainManager.nextTurn(channelId);
            const updatedGame = wordChainManager.getGame(channelId);
            if (updatedGame) {
              await sendNewGameplayEmbed(message.channel, updatedGame, updatedGame.currentWord, 0, "System", "bot_error");
              startTimerForHumanPlayer(channelId, message.channel);
            }
          }
        }, botThinkTime);
      } else {
        // Human player's turn - start timer
        startTimerForHumanPlayer(channelId, message.channel);
      }
    }

    return true;

  } catch (error) {
    console.error("Error handling word chain message:", error);
    return false;
  }
}

function startTimerForHumanPlayer(channelId, channel) {
  wordChainManager.startTurnTimer(channelId, async (timerResult) => {
    const game = wordChainManager.getGame(channelId);
    if (!game) return;

    if (timerResult.gameEnded) {
      await sendGameEndEmbed(channel, game, timerResult.winner);
    } else if (timerResult.nextPlayer) {
      const timedOutPlayer = game.players.find(p => p.status === "gave_up");
      await channel.send(`⏰ Time's up${timedOutPlayer ? ` for ${timedOutPlayer.username}` : ''}! Moving to next player...`);
      
      // Check if next player is bot
      if (timerResult.nextPlayer.isBot) {
        // Bot's turn after timeout - respond within the game's time limit
        // Bot uses 30-70% of the time limit to make it feel more natural
        const botThinkTime = game.timeLimit * 1000 * (0.3 + Math.random() * 0.4);
        console.log(`[WordChain] Bot's turn after timeout. Will respond in ${Math.round(botThinkTime)}ms`);
        setTimeout(async () => {
          try {
            console.log(`[WordChain] Bot is now processing turn after timeout...`);
            const botResult = await wordChainManager.botTurn(channelId);
            console.log(`[WordChain] Bot result after timeout:`, botResult);
            
            if (botResult.success) {
              if (botResult.botGaveUp) {
                await channel.send(`🤖 ${botResult.message}`);
                if (botResult.gameEnded) {
                  await sendGameEndEmbed(channel, game, botResult.winner);
                } else {
                  await sendNewGameplayEmbed(channel, game, game.currentWord, 0, "System", "bot_gaveup");
                  startTimerForHumanPlayer(channelId, channel);
                }
              } else if (botResult.gameEnded) {
                await channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
                await sendGameEndEmbed(channel, game, botResult.winner);
              } else {
                await channel.send(`🤖 Bot answered: **${botResult.botAnswer}** (+${botResult.points} points)`);
                await sendNewGameplayEmbed(channel, game, botResult.nextWord, botResult.points, "Villain Bot", botResult.botAnswer);
                startTimerForHumanPlayer(channelId, channel);
              }
            } else {
              console.error(`[WordChain] Bot turn failed after timeout:`, botResult.message);
              await channel.send(`❌ Bot encountered an error: ${botResult.message}`);
              // Move to next player
              wordChainManager.nextTurn(channelId);
              const updatedGame = wordChainManager.getGame(channelId);
              if (updatedGame) {
                await sendNewGameplayEmbed(channel, updatedGame, updatedGame.currentWord, 0, "System", "bot_error");
                startTimerForHumanPlayer(channelId, channel);
              }
            }
          } catch (error) {
            console.error(`[WordChain] Error in bot turn after timeout:`, error);
            await channel.send(`❌ Bot encountered an error. Moving to next player...`);
            // Move to next player
            wordChainManager.nextTurn(channelId);
            const updatedGame = wordChainManager.getGame(channelId);
            if (updatedGame) {
              await sendNewGameplayEmbed(channel, updatedGame, updatedGame.currentWord, 0, "System", "bot_error");
              startTimerForHumanPlayer(channelId, channel);
            }
          }
        }, botThinkTime);
      } else {
        // Human player's turn
        await sendNewGameplayEmbed(channel, game, game.currentWord, 0, "System", "timeout");
        startTimerForHumanPlayer(channelId, channel);
      }
    }
  });
}

async function sendNewGameplayEmbed(channel, game, newWord) {
  const currentPlayer = wordChainManager.getCurrentPlayer(game.channelId);
  
  // Create player list with scores for Turn | Player | Point section
  let playerScoreText = "";
  game.players.forEach((player) => {
    const isCurrentTurn = player.userId === currentPlayer?.userId;
    const turnIndicator = isCurrentTurn ? "config.emojis.dot" : "config.emojis.blank";
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
      `**${newWord.entry.toUpperCase()} +${newWord.points}**\n\n` +
      `**Turn | Player | Point**\n` +
      `${playerScoreText.trim()}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Lanjutkan kata dengan awalan [ ${newWord.cleanedEntry} ]**\n` +
      `**Acak kata: roll**`
    )
    .setColor(0x2ecc71);

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

  // Delete the previous embed to prevent piling up
  try {
    if (game.messageId) {
      const oldMessage = await channel.messages.fetch(game.messageId);
      await oldMessage.delete();
    }
  } catch (error) {
    console.error("Error deleting old embed:", error);
    // Continue even if deletion fails
  }

  // Send new embed to replace the old one
  const newMessage = await channel.send({
    embeds: [gameplayEmbed],
    components: [gameplayRow]
  });
  
  // Update the game message ID to the new message
  wordChainManager.setGameMessage(game.channelId, newMessage.id);
}

async function sendGameEndEmbed(channel, game, winner) {
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
        `The game has ended.`
      )
      .setColor(0x95a5a6)
      .setFooter({ text: "Sambung Kata" })
      .setTimestamp();
  }

  // Delete the previous embed to prevent piling up
  try {
    if (game.messageId) {
      const oldMessage = await channel.messages.fetch(game.messageId);
      await oldMessage.delete();
    }
  } catch (error) {
    console.error("Error deleting old embed:", error);
    // Continue even if deletion fails
  }

  // Send new end game embed
  await channel.send({
    embeds: [endGameEmbed],
    components: []
  });

  // Clean up the game session
  wordChainManager.exitGame(game.channelId);
}

module.exports = handleWordChainMessage;

