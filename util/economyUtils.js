/**
 * Economy Utilities
 * Functions for managing virtual currency (souls)
 */

const Economy = require('../schemas/UserBalance');

/**
 * Calculate level up reward
 * @param {number} level - New level reached
 * @returns {number} Souls reward amount
 */
function getLevelUpReward(level) {
    // Base reward + bonus for higher levels
    const baseReward = 100;
    const levelBonus = Math.floor(level / 10) * 50;
    return (level * baseReward) + levelBonus;
}

/**
 * Get or create user's economy data
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @returns {Promise<Object>} Economy document
 */
async function getOrCreateEconomy(userId, guildId) {
    try {
        let economy = await Economy.findOne({ userId, guildId });
        if (!economy) {
            economy = await Economy.create({
                userId,
                guildId,
                cash: 0
            });
        }
        return economy;
    } catch (error) {
        console.error('Error in getOrCreateEconomy:', error);
        throw error;
    }
}

/**
 * Get user's balance
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @returns {Promise<number>} Balance amount
 */
async function getBalance(userId, guildId) {
    try {
        const economy = await Economy.findOne({ userId, guildId });
        return economy?.cash || 0;
    } catch (error) {
        console.error('Error in getBalance:', error);
        return 0;
    }
}

/**
 * Add souls to user's balance
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {number} amount - Amount to add
 * @returns {Promise<Object|null>} Updated economy or null
 */
async function addSouls(userId, guildId, amount) {
    try {
        if (typeof amount !== 'number') {
            console.error('Invalid amount for addSouls:', amount);
            return null;
        }

        const economy = await Economy.findOneAndUpdate(
            { userId, guildId },
            { $inc: { cash: amount } },
            { upsert: true, new: true }
        );
        return economy;
    } catch (error) {
        console.error('Error in addSouls:', error);
        throw error;
    }
}

/**
 * Remove souls from user's balance
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {number} amount - Amount to remove
 * @returns {Promise<Object|null>} Updated economy or null
 */
async function removeSouls(userId, guildId, amount) {
    try {
        if (typeof amount !== 'number' || amount < 0) {
            console.error('Invalid amount for removeSouls:', amount);
            return null;
        }

        const economy = await Economy.findOneAndUpdate(
            { userId, guildId },
            { $inc: { cash: -amount } },
            { upsert: true, new: true }
        );
        return economy;
    } catch (error) {
        console.error('Error in removeSouls:', error);
        throw error;
    }
}

/**
 * Check if user has enough souls
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {number} amount - Amount to check
 * @returns {Promise<boolean>} True if user has enough
 */
async function hasEnoughSouls(userId, guildId, amount) {
    const balance = await getBalance(userId, guildId);
    return balance >= amount;
}

/**
 * Transfer souls between users
 * @param {string} senderId - Sender user ID
 * @param {string} receiverId - Receiver user ID
 * @param {string} guildId - Guild ID
 * @param {number} amount - Amount to transfer
 * @returns {Promise<Object>} Transfer result
 */
async function transferSouls(senderId, receiverId, guildId, amount) {
    try {
        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return { success: false, reason: 'invalid_amount' };
        }

        // Check self-transfer
        if (senderId === receiverId) {
            return { success: false, reason: 'self_transfer' };
        }

        // Check sender balance
        const senderBalance = await getBalance(senderId, guildId);
        if (senderBalance < amount) {
            return { success: false, reason: 'insufficient_funds' };
        }

        // Perform transfer
        await removeSouls(senderId, guildId, amount);
        await addSouls(receiverId, guildId, amount);

        return {
            success: true,
            amount,
            senderNewBalance: senderBalance - amount,
            receiverNewBalance: await getBalance(receiverId, guildId)
        };
    } catch (error) {
        console.error('Error in transferSouls:', error);
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Reset user's balance
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @returns {Promise<boolean>} Success status
 */
async function resetBalance(userId, guildId) {
    try {
        await Economy.findOneAndUpdate(
            { userId, guildId },
            { $set: { cash: 0 } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Error in resetBalance:', error);
        return false;
    }
}

/**
 * Set user's balance to specific amount
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {number} amount - New balance amount
 * @returns {Promise<Object|null>} Updated economy or null
 */
async function setBalance(userId, guildId, amount) {
    try {
        if (typeof amount !== 'number') {
            return null;
        }

        const economy = await Economy.findOneAndUpdate(
            { userId, guildId },
            { $set: { cash: amount } },
            { upsert: true, new: true }
        );
        return economy;
    } catch (error) {
        console.error('Error in setBalance:', error);
        return null;
    }
}

/**
 * Get top users by balance
 * @param {string} guildId - Guild ID
 * @param {number} limit - Number of users to return
 * @returns {Promise<Array>} Top users
 */
async function getTopBalances(guildId, limit = 10) {
    try {
        const topUsers = await Economy.find({ guildId })
            .sort({ cash: -1 })
            .limit(limit)
            .lean();
        return topUsers;
    } catch (error) {
        console.error('Error in getTopBalances:', error);
        return [];
    }
}

/**
 * Format number to currency string with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted string
 */
function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num) || 0;
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Parse formatted number string back to number
 * @param {string} str - Formatted string
 * @returns {number} Parsed number
 */
function parseFormattedNumber(str) {
    if (typeof str === 'number') return str;
    return parseInt(str.replace(/,/g, '')) || 0;
}

/**
 * Calculate daily reward based on streak
 * @param {number} streak - Current streak
 * @returns {number} Reward amount
 */
function getDailyReward(streak = 0) {
    const baseReward = 100;
    const streakBonus = Math.min(streak * 10, 100); // Max 100 bonus
    return baseReward + streakBonus;
}

/**
 * Calculate collect reward
 * @returns {number} Reward amount
 */
function getCollectReward() {
    // Random between 10-50
    return Math.floor(Math.random() * 41) + 10;
}

module.exports = {
    getLevelUpReward,
    getOrCreateEconomy,
    getBalance,
    addSouls,
    removeSouls,
    hasEnoughSouls,
    transferSouls,
    resetBalance,
    setBalance,
    getTopBalances,
    formatNumber,
    parseFormattedNumber,
    getDailyReward,
    getCollectReward
};