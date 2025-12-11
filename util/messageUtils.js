/**
 * Utility functions for safe message operations
 */

/**
 * Safely reply to a message, falling back to channel.send if reply fails
 * @param {Message} message - The message to reply to
 * @param {string|Object} content - The content to send
 * @returns {Promise<Message>} The sent message
 */
async function safeReply(message, content) {
  try {
    return await message.reply(content);
  } catch (error) {
    // If reply fails (e.g., original message deleted), send to channel instead
    if (error.code === 50035 || error.message.includes('Unknown message')) {
      console.warn('Reply failed, sending to channel instead:', error.message);
      return await message.channel.send(content);
    }
    throw error;
  }
}

/**
 * Safely send a message to a channel with error handling
 * @param {TextChannel} channel - The channel to send to
 * @param {string|Object} content - The content to send
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function safeSend(channel, content) {
  try {
    return await channel.send(content);
  } catch (error) {
    console.error('Failed to send message to channel:', error);
    return null;
  }
}

/**
 * Safely delete a message with error handling
 * @param {Message} message - The message to delete
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
async function safeDelete(message) {
  try {
    await message.delete();
    return true;
  } catch (error) {
    console.error('Failed to delete message:', error);
    return false;
  }
}

/**
 * Safely edit a message with error handling
 * @param {Message} message - The message to edit
 * @param {string|Object} content - The new content
 * @returns {Promise<Message|null>} The edited message or null if failed
 */
async function safeEdit(message, content) {
  try {
    return await message.edit(content);
  } catch (error) {
    console.error('Failed to edit message:', error);
    return null;
  }
}

module.exports = {
  safeReply,
  safeSend,
  safeDelete,
  safeEdit
};