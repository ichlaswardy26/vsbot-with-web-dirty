const axios = require('axios');

class WordChainManager {
  constructor() {
    this.games = new Map(); // channelId -> gameSession
  }

  createGame(channelId, options = {}) {
    const gameSession = {
      channelId,
      players: [],
      status: "lobby", // "lobby", "playing", "ended"
      currentWord: null,
      turnIndex: 0,
      messageId: null,
      level: options.level || "Intermediate",
      language: options.language || "Indonesian",
      difficulty: options.difficulty || "Medium", // Easy, Medium, Hard
      timeLimit: options.timeLimit || 30, // seconds per turn
      maxRolls: options.maxRolls !== undefined ? options.maxRolls : 1, // Maximum rolls per player (default 1)
      botEnabled: options.botEnabled !== undefined ? options.botEnabled : true, // Enable bot by default
      createdAt: Date.now(),
      usedAnswers: new Set(), // Track used answers
      lobbyMaster: options.lobbyMaster || null,
      playerRolls: new Map(), // Track roll count per player (userId -> rollCount)
      bannedPlayers: new Set(), // Track banned players
      turnTimer: null, // Timer for current turn
      turnStartTime: null // When current turn started
    };

    this.games.set(channelId, gameSession);
    return gameSession;
  }

  getGame(channelId) {
    return this.games.get(channelId);
  }

  setGameMessage(channelId, messageId) {
    const game = this.games.get(channelId);
    if (game) {
      game.messageId = messageId;
    }
  }

  joinGame(channelId, userId, username) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.status !== "lobby") {
      return { success: false, message: "Game has already started!" };
    }

    // Check if player is banned
    if (game.bannedPlayers && game.bannedPlayers.has(userId)) {
      return { success: false, message: "You have been banned from this game!" };
    }

    // Check if player already joined
    const existingPlayer = game.players.find(p => p.userId === userId);
    if (existingPlayer) {
      return { success: false, message: "You have already joined this game!" };
    }

    // Check maximum player limit (10 players)
    if (game.players.length >= 10) {
      return { success: false, message: "Game is full! Maximum 10 players allowed." };
    }

    // If this is the lobby master, add them first
    if (game.lobbyMaster === userId) {
      game.players.unshift({
        userId,
        username,
        points: 0,
        status: "active",
        isLobbyMaster: true
      });
    } else {
      // Add regular player
      game.players.push({
        userId,
        username,
        points: 0,
        status: "active",
        isLobbyMaster: false
      });
    }

    return { success: true, message: "Successfully joined the game!" };
  }

  async startGame(channelId) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.players.length < 1) {
      return { success: false, message: "At least 1 player is required to start the game!" };
    }

    if (game.status !== "lobby") {
      return { success: false, message: "Game has already started!" };
    }

    // Add bot if only 1 player and bot is enabled
    if (game.players.length === 1 && game.botEnabled) {
      game.players.push({
        userId: 'BOT',
        username: 'Villain Bot',
        points: 0,
        status: "active",
        isLobbyMaster: false,
        isBot: true
      });
    }

    try {
      // Get random word from KBBI API to start the game
      const response = await axios.get('https://kbbi-internal-api.vercel.app/kbbi/_random');
      const data = response.data;

      if (data.error || !data.lemma) {
        return { success: false, message: "Failed to get starting word from KBBI API. Please try again." };
      }

      // Clean the word and take last 2-3 characters as starting prefix
      const cleanAnswer = data.lemma.toLowerCase().replace(/[^a-z]/g, '');
      let cleanedEntry;
      
      if (cleanAnswer.length >= 4) {
        cleanedEntry = cleanAnswer.slice(-3); // Last 3 chars
      } else if (cleanAnswer.length >= 2) {
        cleanedEntry = cleanAnswer.slice(-2); // Last 2 chars
      } else {
        cleanedEntry = cleanAnswer;
      }

      const points = Math.max(3, Math.min(10, cleanedEntry.length + Math.floor(Math.random() * 3)));

      const startingWord = {
        entry: cleanedEntry, // Show only the suffix
        cleanedEntry: cleanedEntry,
        points: points
      };

      // Set game status to playing
      game.status = "playing";
      game.turnIndex = 0;
      game.currentWord = startingWord;

      return { success: true, message: "Game started successfully!", word: startingWord };

    } catch (error) {
      console.error("Error fetching starting word from KBBI API:", error);
      return { success: false, message: "Failed to start game. Could not fetch starting word from KBBI API." };
    }
  }

  async submitAnswer(channelId, userId, answer) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.status !== "playing") {
      return { success: false, message: "Game is not currently active!" };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, message: "You are not part of this game!" };
    }

    if (player.status !== "active") {
      return { success: false, message: "You have already given up!" };
    }

    // Check if it's the player's turn
    if (!this.isPlayerTurn(channelId, userId)) {
      const currentPlayer = this.getCurrentPlayer(channelId);
      return { 
        success: false, 
        message: `It's not your turn! It's ${currentPlayer ? currentPlayer.username : 'someone else'}'s turn.`,
        isNotYourTurn: true
      };
    }

    try {
      // Validate answer with KBBI API
      let response;
      let data;
      
      try {
        response = await axios.get(`https://kbbi-internal-api.vercel.app/kbbi/${answer.toLowerCase()}`);
        data = response.data;
      } catch (apiError) {
        // Handle 404 errors (word not found) as invalid words
        if (apiError.response && apiError.response.status === 404) {
          data = apiError.response.data;
        } else {
          throw apiError; // Re-throw other errors
        }
      }

      if (data.error) {
        return { 
          success: false, 
          message: `"${answer}" is not a valid word. Please try again!`,
          isInvalidWord: true 
        };
      }

      // Normalize answer for checking
      const answerLower = answer.toLowerCase().trim();
      const cleanAnswerLower = answerLower.replace(/[^a-z]/g, '');
      
      // Also get the lemma from API response for checking
      const lemmaLower = data.lemma ? data.lemma.toLowerCase().trim() : answerLower;
      const cleanLemmaLower = lemmaLower.replace(/[^a-z]/g, '');
      
      // Check if answer has been used before (check all variations)
      if (game.usedAnswers.has(answerLower) || 
          game.usedAnswers.has(cleanAnswerLower) ||
          game.usedAnswers.has(lemmaLower) ||
          game.usedAnswers.has(cleanLemmaLower)) {
        return { 
          success: false, 
          message: `"${answer}" has already been used. Please try a different word!`,
          isInvalidWord: true 
        };
      }

      // Check if the answer starts with the required prefix
      const requiredPrefix = game.currentWord.cleanedEntry.toLowerCase();
      if (!cleanAnswerLower.startsWith(requiredPrefix)) {
        return { 
          success: false, 
          message: `Your word must start with "${requiredPrefix}". Please try again!`,
          isInvalidWord: true 
        };
      }

      // Add all variations to used answers to prevent reuse
      game.usedAnswers.add(answerLower);
      game.usedAnswers.add(cleanAnswerLower);
      game.usedAnswers.add(lemmaLower);
      game.usedAnswers.add(cleanLemmaLower);
      
      console.log(`[WordChain] Added to used answers: ${answerLower}, ${cleanAnswerLower}, ${lemmaLower}, ${cleanLemmaLower}`);

      // Award points based on the player's answer word (from API response)
      const wordPoints = data.wordPoints || answer.length; // Use API points or fallback to word length
      player.points += wordPoints;

      // Check if player won
      if (player.points >= 100) {
        game.status = "ended";
        return { 
          success: true, 
          message: "Correct answer!", 
          points: wordPoints,
          gameEnded: true,
          winner: player
        };
      }

      // Generate next word based on the API response
      const nextWord = this.generateNextWordFromAPI(data, answer);
      game.currentWord = nextWord;

      // Move to next turn (if turn-based)
      game.turnIndex = (game.turnIndex + 1) % game.players.filter(p => p.status === "active").length;

      return { 
        success: true, 
        message: "Correct answer!", 
        points: wordPoints,
        nextWord: nextWord,
        gameEnded: false
      };

    } catch (error) {
      console.error("Error validating answer:", error);
      return { 
        success: false, 
        message: "Error validating your answer. Please try again later." 
      };
    }
  }

  generateNextWordFromAPI(apiData, previousAnswer) {
    // Clean the previous answer to get only letters
    const cleanAnswer = previousAnswer.toLowerCase().replace(/[^a-z]/g, '');
    
    // Take last 2-3 characters as the prefix for next word
    let cleanedEntry;
    if (cleanAnswer.length >= 4) {
      cleanedEntry = cleanAnswer.slice(-3); // Last 3 chars
    } else if (cleanAnswer.length >= 2) {
      cleanedEntry = cleanAnswer.slice(-2); // Last 2 chars
    } else {
      cleanedEntry = cleanAnswer; // Use whole word if too short
    }

    // Display format: show the suffix only
    const entry = cleanedEntry;

    // Points based on difficulty
    const points = Math.max(3, Math.min(10, cleanedEntry.length + Math.floor(Math.random() * 3)));

    return {
      entry: entry,
      cleanedEntry: cleanedEntry,
      points: points
    };
  }

  generateNextWord(previousAnswer) {
    // Keep this method for backward compatibility and initial word generation
    const cleanAnswer = previousAnswer.toLowerCase().replace(/[^a-z]/g, '');
    
    // Simple logic: take last 2-4 characters as the prefix for next word
    let cleanedEntry;
    if (cleanAnswer.length >= 4) {
      cleanedEntry = cleanAnswer.slice(-3);
    } else if (cleanAnswer.length >= 2) {
      cleanedEntry = cleanAnswer.slice(-2);
    } else {
      cleanedEntry = cleanAnswer;
    }

    // Generate points based on difficulty (length)
    const points = Math.max(3, Math.min(10, cleanedEntry.length + Math.floor(Math.random() * 3)));

    return {
      entry: `${previousAnswer.slice(0, -cleanedEntry.length)}.${cleanedEntry}`,
      cleanedEntry: cleanedEntry,
      points: points
    };
  }

  giveUp(channelId, userId) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, message: "You are not part of this game!" };
    }

    if (player.status !== "active") {
      return { success: false, message: "You have already given up!" };
    }

    // Check if it's the player's turn (only during active gameplay)
    if (game.status === "playing" && !this.isPlayerTurn(channelId, userId)) {
      const currentPlayer = this.getCurrentPlayer(channelId);
      return { 
        success: false, 
        message: `It's not your turn! Only ${currentPlayer ? currentPlayer.username : 'the current player'} can give up.`
      };
    }

    player.status = "gave_up";

    // Check if all players gave up
    const activePlayers = game.players.filter(p => p.status === "active");
    if (activePlayers.length === 0) {
      game.status = "ended";
      return { 
        success: true, 
        message: "You gave up!", 
        gameEnded: true,
        reason: "All players gave up"
      };
    } else if (activePlayers.length === 1) {
      game.status = "ended";
      return { 
        success: true, 
        message: "You gave up!", 
        gameEnded: true,
        winner: activePlayers[0]
      };
    }

    return { success: true, message: "You gave up! Better luck next time." };
  }

  kickPlayer(channelId, lobbyMasterId, targetUserId) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.status !== "lobby") {
      return { success: false, message: "Can only kick players in lobby!" };
    }

    if (game.lobbyMaster !== lobbyMasterId) {
      return { success: false, message: "Only the lobby master can kick players!" };
    }

    if (targetUserId === lobbyMasterId) {
      return { success: false, message: "Lobby master cannot kick themselves!" };
    }

    const targetPlayerIndex = game.players.findIndex(p => p.userId === targetUserId);
    if (targetPlayerIndex === -1) {
      return { success: false, message: "Player not found in game!" };
    }

    const targetPlayer = game.players[targetPlayerIndex];
    game.players.splice(targetPlayerIndex, 1);

    return { success: true, message: `${targetPlayer.username} has been kicked from the game!`, kickedPlayer: targetPlayer };
  }

  banPlayer(channelId, lobbyMasterId, targetUserId) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.status !== "lobby") {
      return { success: false, message: "Can only ban players in lobby!" };
    }

    if (game.lobbyMaster !== lobbyMasterId) {
      return { success: false, message: "Only the lobby master can ban players!" };
    }

    if (targetUserId === lobbyMasterId) {
      return { success: false, message: "Lobby master cannot ban themselves!" };
    }

    const targetPlayerIndex = game.players.findIndex(p => p.userId === targetUserId);
    if (targetPlayerIndex === -1) {
      return { success: false, message: "Player not found in game!" };
    }

    const targetPlayer = game.players[targetPlayerIndex];
    game.players.splice(targetPlayerIndex, 1);

    // Add to banned list
    if (!game.bannedPlayers) {
      game.bannedPlayers = new Set();
    }
    game.bannedPlayers.add(targetUserId);

    return { success: true, message: `${targetPlayer.username} has been banned from the game!`, bannedPlayer: targetPlayer };
  }

  exitGame(channelId) {
    const game = this.games.get(channelId);
    if (game) {
      this.games.delete(channelId);
      return { success: true, message: "Game cancelled successfully!" };
    }
    return { success: false, message: "No active game found!" };
  }

  getPlayerList(channelId) {
    const game = this.games.get(channelId);
    if (!game || game.players.length === 0) {
      return "None";
    }

    return game.players
      .map(p => `${p.username} (${p.points} pts)`)
      .join("\n");
  }

  getCurrentPlayer(channelId) {
    const game = this.games.get(channelId);
    if (!game || game.status !== "playing") {
      return null;
    }

    const activePlayers = game.players.filter(p => p.status === "active");
    if (activePlayers.length === 0) {
      return null;
    }

    return activePlayers[game.turnIndex % activePlayers.length];
  }

  isPlayerTurn(channelId, userId) {
    const currentPlayer = this.getCurrentPlayer(channelId);
    return currentPlayer && currentPlayer.userId === userId;
  }

  nextTurn(channelId) {
    const game = this.games.get(channelId);
    if (!game) return;

    const activePlayers = game.players.filter(p => p.status === "active");
    if (activePlayers.length > 0) {
      game.turnIndex = (game.turnIndex + 1) % activePlayers.length;
    }
  }

  updateSettings(channelId, settings) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: "Game not found!" };
    }

    if (game.status !== "lobby") {
      return { success: false, message: "Cannot change settings after game has started!" };
    }

    if (settings.difficulty) {
      game.difficulty = settings.difficulty;
    }
    if (settings.timeLimit !== undefined) {
      game.timeLimit = settings.timeLimit;
    }
    if (settings.maxRolls !== undefined) {
      game.maxRolls = settings.maxRolls;
    }
    if (settings.botEnabled !== undefined) {
      game.botEnabled = settings.botEnabled;
    }

    return { success: true, message: "Settings updated!", game };
  }

  async botTurn(channelId) {
    const game = this.games.get(channelId);
    if (!game || game.status !== "playing") {
      return { success: false, message: "No active game!" };
    }

    const currentPlayer = this.getCurrentPlayer(channelId);
    if (!currentPlayer || currentPlayer.userId !== 'BOT') {
      return { success: false, message: "Not bot's turn!" };
    }

    try {
      const requiredPrefix = game.currentWord.cleanedEntry.toLowerCase();
      console.log(`[WordChain Bot] Looking for word starting with: ${requiredPrefix}`);
      
      // Strategy 1: Try common word patterns with the prefix
      const commonSuffixes = ['an', 'kan', 'i', 'nya', 'lah', 'kah', 'mu', 'ku', 'ta', 'er', 'ir', 'ur', 'at', 'it', 'ut'];
      let validWord = null;
      
      // Try adding common suffixes to the prefix
      for (const suffix of commonSuffixes) {
        if (validWord) break;
        
        const testWord = requiredPrefix + suffix;
        try {
          const response = await axios.get(`https://kbbi-internal-api.vercel.app/kbbi/${testWord}`);
          const data = response.data;
          
          if (!data.error && data.lemma) {
            const word = data.lemma.toLowerCase();
            const cleanWord = word.replace(/[^a-z]/g, '');
            
            if (!game.usedAnswers.has(cleanWord) && !game.usedAnswers.has(word.toLowerCase())) {
              validWord = {
                word: data.lemma,
                cleanWord: cleanWord,
                data: data
              };
              console.log(`[WordChain Bot] Found word with suffix strategy: ${validWord.word}`);
              break;
            }
          }
        } catch (error) { // eslint-disable-line no-unused-vars
          // Word not found, continue to next suffix
          continue;
        }
      }
      
      // Strategy 2: If suffix strategy fails, try random search (limited attempts)
      if (!validWord) {
        console.log(`[WordChain Bot] Suffix strategy failed, trying random search...`);
        let attempts = 0;
        const maxAttempts = 30; // Increase attempts for random search
        
        while (attempts < maxAttempts && !validWord) {
          try {
            const response = await axios.get('https://kbbi-internal-api.vercel.app/kbbi/_random');
            const data = response.data;
            
            if (!data.error && data.lemma) {
              const word = data.lemma.toLowerCase();
              const cleanWord = word.replace(/[^a-z]/g, '');
              
              if (cleanWord.startsWith(requiredPrefix) && 
                  cleanWord.length > requiredPrefix.length &&
                  !game.usedAnswers.has(cleanWord) &&
                  !game.usedAnswers.has(word.toLowerCase())) {
                validWord = {
                  word: data.lemma,
                  cleanWord: cleanWord,
                  data: data
                };
                console.log(`[WordChain Bot] Found word with random search (attempt ${attempts + 1}): ${validWord.word}`);
              }
            }
          } catch (error) { // eslint-disable-line no-unused-vars
            // Continue searching
          }
          attempts++;
        }
      }

      // If no valid word found, bot gives up
      if (!validWord) {
        console.log(`[WordChain Bot] Could not find any valid word, giving up...`);
        currentPlayer.status = "gave_up";
        const activePlayers = game.players.filter(p => p.status === "active");
        
        if (activePlayers.length === 1) {
          game.status = "ended";
          return {
            success: true,
            botGaveUp: true,
            gameEnded: true,
            winner: activePlayers[0],
            message: "Bot couldn't find a valid word and gave up!"
          };
        }
        
        this.nextTurn(channelId);
        return {
          success: true,
          botGaveUp: true,
          message: "Bot couldn't find a valid word and gave up!"
        };
      }

      // Submit bot's answer - add all variations to prevent reuse
      console.log(`[WordChain Bot] Submitting answer: ${validWord.word}`);
      const botAnswerLower = validWord.word.toLowerCase().trim();
      const botCleanWord = validWord.cleanWord;
      const botLemmaLower = validWord.data.lemma ? validWord.data.lemma.toLowerCase().trim() : botAnswerLower;
      const botCleanLemma = botLemmaLower.replace(/[^a-z]/g, '');
      
      game.usedAnswers.add(botAnswerLower);
      game.usedAnswers.add(botCleanWord);
      game.usedAnswers.add(botLemmaLower);
      game.usedAnswers.add(botCleanLemma);
      
      console.log(`[WordChain Bot] Added to used answers: ${botAnswerLower}, ${botCleanWord}, ${botLemmaLower}, ${botCleanLemma}`);
      
      const wordPoints = validWord.data.wordPoints || validWord.word.length;
      currentPlayer.points += wordPoints;

      // Check if bot won
      if (currentPlayer.points >= 100) {
        game.status = "ended";
        return {
          success: true,
          botAnswer: validWord.word,
          points: wordPoints,
          gameEnded: true,
          winner: currentPlayer
        };
      }

      // Generate next word
      const nextWord = this.generateNextWordFromAPI(validWord.data, validWord.word);
      game.currentWord = nextWord;
      game.turnIndex = (game.turnIndex + 1) % game.players.filter(p => p.status === "active").length;

      return {
        success: true,
        botAnswer: validWord.word,
        points: wordPoints,
        nextWord: nextWord,
        gameEnded: false
      };

    } catch (error) {
      console.error("Error in bot turn:", error);
      return { success: false, message: "Bot error!" };
    }
  }

  startTurnTimer(channelId, callback) {
    const game = this.games.get(channelId);
    if (!game) return;

    // Clear existing timer
    if (game.turnTimer) {
      clearTimeout(game.turnTimer);
    }

    game.turnStartTime = Date.now();
    
    // Set new timer
    game.turnTimer = setTimeout(async () => {
      const currentPlayer = this.getCurrentPlayer(channelId);
      if (currentPlayer && game.status === "playing") {
        // Time's up - player loses turn
        currentPlayer.status = "gave_up";
        
        const activePlayers = game.players.filter(p => p.status === "active");
        if (activePlayers.length === 0) {
          game.status = "ended";
          if (callback) callback({ timeout: true, gameEnded: true, reason: "All players timed out" });
        } else if (activePlayers.length === 1) {
          game.status = "ended";
          if (callback) callback({ timeout: true, gameEnded: true, winner: activePlayers[0] });
        } else {
          this.nextTurn(channelId);
          if (callback) callback({ timeout: true, nextPlayer: this.getCurrentPlayer(channelId) });
        }
      }
    }, game.timeLimit * 1000);
  }

  clearTurnTimer(channelId) {
    const game = this.games.get(channelId);
    if (game && game.turnTimer) {
      clearTimeout(game.turnTimer);
      game.turnTimer = null;
      game.turnStartTime = null;
    }
  }

  async rollNewWord(channelId, userId) {
    const game = this.games.get(channelId);
    if (!game || game.status !== "playing") {
      return { success: false, message: "No active game found!" };
    }

    // Check if it's the player's turn
    if (!this.isPlayerTurn(channelId, userId)) {
      const currentPlayer = this.getCurrentPlayer(channelId);
      return { 
        success: false, 
        message: `It's not your turn! Only ${currentPlayer ? currentPlayer.username : 'the current player'} can roll.`
      };
    }

    // Check roll limit for this player
    const currentRolls = game.playerRolls.get(userId) || 0;
    const maxRolls = game.maxRolls || 1;
    if (currentRolls >= maxRolls) {
      return { success: false, message: `You have reached the maximum of ${maxRolls} rolls!` };
    }

    try {
      // Get random word from KBBI API
      const response = await axios.get('https://kbbi-internal-api.vercel.app/kbbi/_random');
      const data = response.data;

      if (data.error || !data.lemma) {
        return { success: false, message: "Failed to get new word from KBBI API. Please try again." };
      }

      // Clean the word and take last 2-3 characters as prefix
      const cleanAnswer = data.lemma.toLowerCase().replace(/[^a-z]/g, '');
      let cleanedEntry;
      
      if (cleanAnswer.length >= 4) {
        cleanedEntry = cleanAnswer.slice(-3); // Last 3 chars
      } else if (cleanAnswer.length >= 2) {
        cleanedEntry = cleanAnswer.slice(-2); // Last 2 chars
      } else {
        cleanedEntry = cleanAnswer;
      }

      const points = Math.max(3, Math.min(10, cleanedEntry.length + Math.floor(Math.random() * 3)));

      game.currentWord = {
        entry: cleanedEntry, // Show only the suffix
        cleanedEntry: cleanedEntry,
        points: points
      };

      // Increment roll count for this player
      game.playerRolls.set(userId, currentRolls + 1);
      const maxRolls = game.maxRolls || 1;

      return { 
        success: true, 
        message: `New word rolled! (${currentRolls + 1}/${maxRolls} rolls used)`, 
        word: game.currentWord,
        rollsUsed: currentRolls + 1,
        maxRolls: maxRolls
      };

    } catch (error) {
      console.error("Error fetching random word from KBBI API:", error);
      return { success: false, message: "Failed to roll new word. Could not fetch word from KBBI API." };
    }
  }
}

module.exports = new WordChainManager();
