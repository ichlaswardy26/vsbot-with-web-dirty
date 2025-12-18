const Leveling = require('../../schemas/Leveling');
const { getXpRequirement } = require('../../util/levelUtils');
const { getLevelUpReward, addSouls } = require('../../util/economyUtils');
const { updateLevelRole } = require('../../util/roleUtils');
const rolePermissions = require('../../util/rolePermissions');
const config = require('../../config.js');

module.exports = {
    name: 'addxp',
    description: 'Add XP to a user (Admin only)',
    category: 'admin',
    usage: 'addxp @user <jumlah>',
    async exec(client, message, args) {
        try {
            // Check permission using standardized system
            const permissionError = rolePermissions.checkPermission(message.member, 'economy');
            if (permissionError) {
                return message.reply(permissionError);
            }

            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1]);

            if (!targetUser || isNaN(amount)) {
                return message.reply(`${config.emojis?.cross || "❌"} **|** Format: ..addxp @user <jumlah>`);
            }

            let userData = await Leveling.findOne({
                userId: targetUser.id,
                guildId: message.guild.id
            });

            if (!userData) {
                userData = await Leveling.create({
                    userId: targetUser.id,
                    guildId: message.guild.id,
                    xp: 0,
                    level: 1
                });
            }

            const oldLevel = userData.level;

            userData.xp += amount;

            while (userData.xp >= getXpRequirement(userData.level)) {
                userData.level += 1;
            }

            await userData.save();

            if (userData.level > oldLevel) {
                const targetMember = message.guild.members.cache.get(targetUser.id);
                if (targetMember) {
                    await updateLevelRole(targetMember, userData.level);

                    for (let level = oldLevel + 1; level <= userData.level; level++) {
                        const soulsEarned = getLevelUpReward(level);
                        await addSouls(targetUser.id, message.guild.id, soulsEarned);
                    }
                }
            }

            message.channel.send(`${config.emojis?.check || "✅"} ${targetUser} **|** Ditambahkan ${amount} XP! (Level: ${userData.level}, XP: ${userData.xp}/${getXpRequirement(userData.level)})`);
        } catch (error) {
            console.error('[addxp] Error:', error.message);
            message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat menambahkan XP!`);
        }
    }
};
