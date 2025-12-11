const Leveling = require("../schemas/Leveling");
const Boost = require("../schemas/Boost");
const { getXpRequirement } = require("../util/levelUtils");
const { updateLevelRole } = require("../util/roleUtils");
const { getLevelUpReward, addSouls } = require("./economyUtils.js");

async function giveXp(client, userId, guildId, baseXp) {
    try {
        // Validate input
        if (!userId || !guildId || typeof baseXp !== 'number' || baseXp < 0) {
            console.error('Invalid parameters for giveXp:', { userId, guildId, baseXp });
            return null;
        }

        // Cari data boost di server
        const boost = await Boost.findOne({ guildId }).catch(err => {
            console.error('Error fetching boost:', err);
            return null;
        });
        
        let multiplier = 1;

        // Jika boost aktif, gunakan multiplier
        if (boost && typeof boost.isActive === "function" && boost.isActive()) {
            multiplier = boost.multiplier || 1;
        }

        const finalXp = Math.floor(baseXp * multiplier);

        // Ambil data leveling user
        let userData = await Leveling.findOne({ userId, guildId });
        if (!userData) {
            userData = await Leveling.create({
                userId,
                guildId,
                xp: 0,
                level: 1,
            });
        }

        const oldLevel = userData.level;
        const oldXp = userData.xp;

        // Tambahkan XP hasil boost
        userData.xp += finalXp;

        // Naik level selama XP mencukupi
        let levelUps = 0;
        while (userData.xp >= getXpRequirement(userData.level) && levelUps < 100) { // Prevent infinite loop
            userData.level += 1;
            levelUps++;
        }

        await userData.save();

        const leveledUp = userData.level > oldLevel;

        // Jika naik level
        if (leveledUp) {
            const guild = client.guilds.cache.get(guildId);
            const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;

            if (member) {
                await updateLevelRole(member, userData.level).catch(err => {
                    console.error('Error updating level role:', err);
                });

                // Tambahkan reward untuk setiap level yang dilewati
                for (let lvl = oldLevel + 1; lvl <= userData.level; lvl++) {
                    const soulsEarned = getLevelUpReward(lvl);
                    await addSouls(userId, guildId, soulsEarned).catch(err => {
                        console.error('Error adding souls reward:', err);
                    });
                }
            }
        }

        return {
            xpAdded: finalXp,
            totalXp: userData.xp,
            newLevel: userData.level,
            oldLevel,
            levelUp: leveledUp,
            username: client.users.cache.get(userId)?.username || 'Unknown'
        };
    } catch (error) {
        console.error('Error in giveXp:', error);
        return null;
    }
}

module.exports = { giveXp };