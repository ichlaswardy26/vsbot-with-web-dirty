const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../config.js");

/**
 * Action Command Helper
 * Standardized helper for action commands (hug, kiss, slap, etc.)
 */

const API_BASE_URL = "https://api.waifu.pics/sfw";

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

  return {
    name,
    description,
    category: "action",
    usage: requiresTarget ? `${name} @user` : name,
    async exec(client, message) {
      const importantEmoji = config.emojis?.important || "❗";
      const crossEmoji = config.emojis?.cross || "❌";

      let target = null;

      if (requiresTarget) {
        target = message.mentions.users.first();
        
        if (!target) {
          return message.reply(`${importantEmoji} **|** Mention seseorang!`);
        }

        if (!allowBot && target.id === client.user.id) {
          return message.reply(`${importantEmoji} **|** Kamu tidak dapat melakukannya ke bot!`);
        }

        if (!allowSelf && target.id === message.author.id) {
          return message.reply(`${importantEmoji} **|** Kamu tidak dapat melakukannya ke diri sendiri!`);
        }
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/${apiEndpoint}`, {
          timeout: 10000, // 10 second timeout
        });

        const descriptionText = target
          ? `${message.author.username} ${action} <@${target.id}>!`
          : `${message.author.username} ${action}!`;

        const embed = new EmbedBuilder()
          .setColor(config.colors?.primary || "#FFC0CB")
          .setDescription(descriptionText)
          .setImage(response.data.url);

        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error(`[${name}] API error:`, error.message);
        message.reply(`${crossEmoji} **|** Gagal mengambil GIF dari API.`);
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
  
  const importantEmoji = config.emojis?.important || "❗";
  const target = message.mentions.users.first();

  if (!target) {
    return { valid: false, target: null, error: `${importantEmoji} **|** Mention seseorang!` };
  }

  if (!allowBot && target.id === client.user.id) {
    return { valid: false, target: null, error: `${importantEmoji} **|** Kamu tidak dapat melakukannya ke bot!` };
  }

  if (!allowSelf && target.id === message.author.id) {
    return { valid: false, target: null, error: `${importantEmoji} **|** Kamu tidak dapat melakukannya ke diri sendiri!` };
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
 * @returns {EmbedBuilder} Discord embed
 */
function createActionEmbed(params) {
  const { description, imageUrl, color } = params;
  
  return new EmbedBuilder()
    .setColor(color || config.colors?.primary || "#FFC0CB")
    .setDescription(description)
    .setImage(imageUrl);
}

module.exports = {
  createActionCommand,
  validateTarget,
  fetchActionGif,
  createActionEmbed,
  API_BASE_URL,
};
