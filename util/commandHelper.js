const config = require("../config.js");

/**
 * Command Helper Utilities
 * Standardized helpers for command development
 */

/**
 * Standard emoji getters with fallbacks
 */
const emojis = {
  get check() { return config.emojis?.check || "✅"; },
  get cross() { return config.emojis?.cross || "❌"; },
  get warning() { return config.emojis?.warning || "⚠️"; },
  get important() { return config.emojis?.important || "❗"; },
  get info() { return config.emojis?.info || "ℹ️"; },
  get souls() { return config.emojis?.souls || "💰"; },
  get blank() { return config.emojis?.blank || "⠀"; },
  get ticket() { return config.emojis?.ticket || "🎫"; },
  get levelup() { return config.emojis?.levelup || "⬆️"; },
};

/**
 * Standard color getters with fallbacks
 */
const colors = {
  get primary() { return config.colors?.primary || "#5865F2"; },
  get success() { return config.colors?.success || "#57F287"; },
  get error() { return config.colors?.error || "#ED4245"; },
  get warning() { return config.colors?.warning || "#FEE75C"; },
  get info() { return config.colors?.info || "#5865F2"; },
};

/**
 * Create standardized success message
 * @param {string} message - Success message
 * @returns {string} Formatted success message
 */
function successMessage(message) {
  return `${emojis.check} **|** ${message}`;
}

/**
 * Create standardized error message
 * @param {string} message - Error message
 * @returns {string} Formatted error message
 */
function errorMessage(message) {
  return `${emojis.cross} **|** ${message}`;
}

/**
 * Create standardized warning message
 * @param {string} message - Warning message
 * @returns {string} Formatted warning message
 */
function warningMessage(message) {
  return `${emojis.warning} **|** ${message}`;
}

/**
 * Create standardized info message
 * @param {string} message - Info message
 * @returns {string} Formatted info message
 */
function infoMessage(message) {
  return `${emojis.info} **|** ${message}`;
}

/**
 * Log command error with standardized format
 * @param {string} commandName - Command name
 * @param {Error} error - Error object
 */
function logError(commandName, error) {
  console.error(`[${commandName}] Error:`, error.message);
}

/**
 * Parse arguments for common patterns
 * @param {Array} args - Command arguments
 * @param {Object} options - Parse options
 * @returns {Object} Parsed arguments
 */
function parseArgs(args, options = {}) {
  const result = {
    mentions: [],
    numbers: [],
    strings: [],
    flags: {},
  };

  for (const arg of args) {
    // Check for flags (--flag or -f)
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result.flags[key] = value || true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      result.flags[arg.slice(1)] = true;
    }
    // Check for mentions
    else if (arg.match(/^<@!?\d+>$/)) {
      result.mentions.push(arg.replace(/[<@!>]/g, ''));
    }
    // Check for numbers
    else if (!isNaN(arg) && arg !== '') {
      result.numbers.push(parseInt(arg));
    }
    // Everything else is a string
    else {
      result.strings.push(arg);
    }
  }

  return result;
}

/**
 * Format duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0) parts.push(`${seconds} detik`);

  return parts.join(' ') || '0 detik';
}

/**
 * Create command module template
 * @param {Object} options - Command options
 * @returns {Object} Command module structure
 */
function createCommandTemplate(options) {
  const {
    name,
    aliases = [],
    description,
    category,
    usage,
    permission = null,
    exec,
  } = options;

  return {
    name,
    ...(aliases.length > 0 && { aliases }),
    description,
    category,
    usage: usage || name,
    ...(permission && { permission }),
    exec,
  };
}

module.exports = {
  emojis,
  colors,
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  logError,
  parseArgs,
  formatDuration,
  createCommandTemplate,
};
