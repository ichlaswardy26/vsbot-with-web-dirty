/**
 * Guild Configuration Helper
 * Utility untuk mendapatkan konfigurasi guild dengan mudah di commands
 */

const config = require('../config');

/**
 * Get guild configuration with caching
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Full configuration object
 */
async function getGuildConfig(guildId) {
  return await config.getConfig(guildId);
}

/**
 * Get specific config section for a guild
 * @param {string} guildId - Discord guild ID
 * @param {string} section - Section name (channels, roles, features, etc.)
 * @returns {Promise<Object>} Configuration section
 */
async function getGuildSection(guildId, section) {
  return await config.getSection(section, guildId);
}

/**
 * Get channel ID from config
 * @param {string} guildId - Discord guild ID
 * @param {string} channelKey - Channel key (e.g., 'welcome', 'ticketLogs')
 * @returns {Promise<string|null>} Channel ID or null
 */
async function getChannelId(guildId, channelKey) {
  const channels = await config.getSection('channels', guildId);
  return channels?.[channelKey] || null;
}

/**
 * Get role ID from config
 * @param {string} guildId - Discord guild ID
 * @param {string} roleKey - Role key (e.g., 'staff', 'boost')
 * @returns {Promise<string|null>} Role ID or null
 */
async function getRoleId(guildId, roleKey) {
  const roles = await config.getSection('roles', guildId);
  return roles?.[roleKey] || null;
}

/**
 * Get emoji from config
 * @param {string} guildId - Discord guild ID
 * @param {string} emojiKey - Emoji key (e.g., 'check', 'cross')
 * @returns {Promise<string>} Emoji string
 */
async function getEmoji(guildId, emojiKey) {
  const emojis = await config.getSection('emojis', guildId);
  return emojis?.[emojiKey] || config.defaults.emojis[emojiKey] || '❓';
}

/**
 * Get color from config
 * @param {string} guildId - Discord guild ID
 * @param {string} colorKey - Color key (e.g., 'primary', 'success', 'error')
 * @returns {Promise<string>} Hex color string
 */
async function getColor(guildId, colorKey) {
  const colors = await config.getSection('colors', guildId);
  return colors?.[colorKey] || config.defaults.colors[colorKey] || '#5865F2';
}

/**
 * Check if a feature is enabled
 * @param {string} guildId - Discord guild ID
 * @param {string} featureName - Feature name (e.g., 'leveling', 'economy')
 * @returns {Promise<boolean>} Whether feature is enabled
 */
async function isFeatureEnabled(guildId, featureName) {
  const features = await config.getSection('features', guildId);
  return features?.[featureName]?.enabled ?? true;
}

/**
 * Get feature settings
 * @param {string} guildId - Discord guild ID
 * @param {string} featureName - Feature name
 * @returns {Promise<Object>} Feature settings
 */
async function getFeatureSettings(guildId, featureName) {
  const features = await config.getSection('features', guildId);
  return features?.[featureName] || config.defaults.features[featureName] || {};
}

module.exports = {
  getGuildConfig,
  getGuildSection,
  getChannelId,
  getRoleId,
  getEmoji,
  getColor,
  isFeatureEnabled,
  getFeatureSettings,
};
