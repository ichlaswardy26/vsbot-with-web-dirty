const Leaderboard = require('../schemas/Leaderboard');
const Leveling = require('../schemas/Leveling');

// Update XP across all time periods
async function updateLeaderboardXP(userId, guildId, username, xpGained) {
    try {
        // Validate input
        if (!userId || !guildId || typeof xpGained !== 'number' || xpGained < 0) {
            console.error('Invalid parameters for updateLeaderboardXP:', { userId, guildId, xpGained });
            return null;
        }

        let stats = await Leaderboard.findOne({ userId, guildId });
        
        if (!stats) {
            stats = new Leaderboard({
                userId,
                guildId,
                username: username || 'Unknown'
            });
        } else if (username && stats.username !== username) {
            // Update username if it changed
            stats.username = username;
        }

        // Update all XP counts
        stats.dailyXP = Math.max(0, stats.dailyXP + xpGained);
        stats.monthlyXP = Math.max(0, stats.monthlyXP + xpGained);
        stats.yearlyXP = Math.max(0, stats.yearlyXP + xpGained);
        stats.lifetimeXP = Math.max(0, stats.lifetimeXP + xpGained);

        // Check and perform resets if needed
        await checkAndResetDaily(stats);
        await checkAndResetMonthly(stats);
        await checkAndResetYearly(stats, guildId);

        await stats.save();
        return stats;
    } catch (error) {
        console.error('Error updating leaderboard XP:', error);
        return null;
    }
}

// Reset daily XP if it's a new day
async function checkAndResetDaily(stats) {
    const now = new Date();
    const lastReset = new Date(stats.lastDailyReset);

    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        stats.dailyXP = 0;
        stats.lastDailyReset = now;
    }
}

// Reset monthly XP if it's a new month
async function checkAndResetMonthly(stats) {
    const now = new Date();
    const lastReset = new Date(stats.lastMonthlyReset);

    if (now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        stats.monthlyXP = 0;
        stats.lastMonthlyReset = now;
    }
}

// Reset yearly XP and user level if it's a new year
async function checkAndResetYearly(stats, guildId) {
    const now = new Date();
    const lastReset = new Date(stats.lastYearlyReset);

    if (now.getFullYear() !== lastReset.getFullYear()) {
        // Reset yearly stats
        stats.yearlyXP = 0;
        stats.lastYearlyReset = now;

        // Reset user's level and XP
        await Leveling.updateOne(
            { userId: stats.userId, guildId },
            { $set: { xp: 0, level: 1 } }
        );
    }
}

// Get top 10 users for a specific time period
async function getTop10(guildId, period = 'lifetime') {
    const xpField = period + 'XP';
    return await Leaderboard.find({ guildId })
        .sort({ [xpField]: -1 })
        .limit(10)
        .select(`userId username ${xpField}`);
}

// Format leaderboard data into an embed
function formatLeaderboard(users, period) {
    const xpField = period + 'XP';
    const periodTitle = {
        daily: 'Daily',
        monthly: 'Monthly',
        yearly: 'Yearly',
        lifetime: 'Lifetime'
    }[period];

    let description = users.map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
        return `${medal} **${index + 1}.** ${user.username} • ${user[xpField].toLocaleString()} XP`;
    }).join('\n');

    if (users.length === 0) {
        description = 'No data available yet!';
    }

    return {
        title: `${periodTitle} Leaderboard`,
        description,
        color: 0x2f3136,
        footer: {
            text: `Top ${users.length} Users`
        },
        timestamp: new Date()
    };
}

async function getUserRank(guildId, userId) {
    const leaderboard = await Leaderboard.find({ guildId }).sort({ lifetimeXP: -1 }).select('userId');
    for (let i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i].userId === userId) {
            return i + 1; // rank is index + 1
        }
    }
    return null; // user not found
}

module.exports = {
    updateLeaderboardXP,
    getTop10,
    formatLeaderboard,
    getUserRank
};