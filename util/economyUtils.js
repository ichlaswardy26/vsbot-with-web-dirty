const Economy = require('../schemas/UserBalance');

// Calculate level up reward
function getLevelUpReward(level) {
    return level * 100; // 100 souls per level
}

// Get or create user's economy data
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

// Add souls to cash
async function addSouls(userId, guildId, amount) {
    try {
        if (typeof amount !== 'number' || amount < 0) {
            console.error('Invalid amount for addSouls:', amount);
            return null;
        }

        const economy = await getOrCreateEconomy(userId, guildId);
        economy.cash = Math.max(0, economy.cash + amount); // Ensure non-negative
        await economy.save();
        return economy;
    } catch (error) {
        console.error('Error in addSouls:', error);
        throw error;
    }
}

// Format number to currency string
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {
    getLevelUpReward,
    getOrCreateEconomy,
    addSouls,
    formatNumber
};