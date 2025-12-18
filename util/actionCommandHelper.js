const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../config.js");

/**
 * Action Command Helper
 * Helper standar untuk action commands (hug, kiss, slap, dll.)
 */

const API_BASE_URL = "https://api.waifu.pics/sfw";

// Mapping action ke teks Indonesia
const ACTION_TEXTS = {
  hug: { verb: "memeluk", emoji: "🤗" },
  kiss: { verb: "mencium", emoji: "💋" },
  slap: { verb: "menampar", emoji: "👋" },
  pat: { verb: "menepuk kepala", emoji: "👋" },
  cuddle: { verb: "bermanja dengan", emoji: "🥰" },
  poke: { verb: "mencolek", emoji: "👉" },
  bite: { verb: "menggigit", emoji: "😬" },
  kick: { verb: "menendang", emoji: "🦵" },
  kill: { verb: "membunuh", emoji: "💀" },
  wave: { verb: "melambaikan tangan ke", emoji: "👋" },
  cry: { verb: "menangis", emoji: "😢", noTarget: true },
  dance: { verb: "menari", emoji: "💃", noTarget: true },
  cringe: { verb: "cringe", emoji: "😬", noTarget: true },
};

/**
 * Create a standard action command module
 * @param {Object} options - Command options
 * @param {string} options.name - Command name
 * @param {string} options.description - Command description
 * @param {string} options.action - Action verb (e.g., "hug", "kiss")
 * @param {string} options.apiEndpoint - API endpoint name
 * @param {boolean} options.requiresTarget - Whether command requires a target user
 * @param {boolean} options.allowSelf - Whether user can target themselves
 * @param {boolean} options.allowBot - Whether user can target the bot
 * @returns {Object} Command module
 */
function createActionCommand(options) {
  const {
    name,
    description,
    action,
    apiEndpoint,
    requiresTarget = true,
    allowSelf = false,
    allowBot = false,
  } = options;

  const actionText = ACTION_TEXTS[action] || { verb: action, emoji: "✨" };

  return {
    name,
    description,
    category: "action",
    usage: requiresTarget ? `${name} @user` : name,
    async exec(client, message) {
      let target = null;

      if (requiresTarget) {
        target = message.mentions.users.first();
        
        if (!target) {
          return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang!`);
        }

        if (!allowBot && target.id === client.user.id) {
          return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak dapat melakukannya ke bot!`);
        }

        if (!allowSelf && target.id === message.author.id) {
          return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak dapat melakukannya ke diri sendiri!`);
        }
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/${apiEndpoint}`, {
          timeout: 10000,
        });

        const descriptionText = target
          ? `${actionText.emoji} **${message.author.username}** ${actionText.verb} **${target.username}**!`
          : `${actionText.emoji} **${message.author.username}** ${actionText.verb}!`;

        const embed = new EmbedBuilder()
          .setColor(config.colors?.primary || "#FFC0CB")
          .setDescription(descriptionText)
          .setImage(response.data.url)
          .setFooter({ 
            text: `Diminta oleh ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();

        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error(`[${name}] API error:`, error.message);
        message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
      }
    },
  };
}

/**
 * Validate action command target
 * @param {Object} params - Validation parameters
 * @param {Message} params.message - Discord message
 * @param {Client} params.client - Discord client
 * @param {Object} params.options - Validation options
 * @returns {Object} Validation result { valid: boolean, target: User|null, error: string|null }
 */
function validateTarget(params) {
  const { message, client, options = {} } = params;
  const { allowSelf = false, allowBot = false } = options;
  
  const target = message.mentions.users.first();

  if (!target) {
    return { valid: false, target: null, error: `${config.emojis?.important || "❗"} **|** Mention seseorang!` };
  }

  if (!allowBot && target.id === client.user.id) {
    return { valid: false, target: null, error: `${config.emojis?.important || "❗"} **|** Kamu tidak dapat melakukannya ke bot!` };
  }

  if (!allowSelf && target.id === message.author.id) {
    return { valid: false, target: null, error: `${config.emojis?.important || "❗"} **|** Kamu tidak dapat melakukannya ke diri sendiri!` };
  }

  return { valid: true, target, error: null };
}

/**
 * Fetch GIF from waifu.pics API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<string|null>} GIF URL or null on error
 */
async function fetchActionGif(endpoint) {
  try {
    const response = await axios.get(`${API_BASE_URL}/${endpoint}`, {
      timeout: 10000,
    });
    return response.data.url;
  } catch (error) {
    console.error(`[actionHelper] API error for ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * Create action embed
 * @param {Object} params - Embed parameters
 * @param {string} params.description - Embed description
 * @param {string} params.imageUrl - Image URL
 * @param {string} params.color - Embed color (optional)
 * @param {User} params.author - Author user for footer
 * @returns {EmbedBuilder} Discord embed
 */
function createActionEmbed(params) {
  const { description, imageUrl, color, author } = params;
  
  const embed = new EmbedBuilder()
    .setColor(color || config.colors?.primary || "#FFC0CB")
    .setDescription(description)
    .setImage(imageUrl)
    .setTimestamp();

  if (author) {
    embed.setFooter({ 
      text: `Diminta oleh ${author.username}`,
      iconURL: author.displayAvatarURL({ dynamic: true })
    });
  }

  return embed;
}

module.exports = {
  createActionCommand,
  validateTarget,
  fetchActionGif,
  createActionEmbed,
  ACTION_TEXTS,
  API_BASE_URL,
};
