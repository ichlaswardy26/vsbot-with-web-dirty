const { PermissionsBitField } = require('discord.js');
const Leveling = require('../../schemas/Leveling');
const { updateLevelRole } = require('../../util/roleUtils');

module.exports = {
    name: 'resetxp',
    description: 'Reset a user\'s XP (Admin only)',
    async exec(client, message, args) {
        try {
            const rolePermissions = require("../../util/rolePermissions");
            
            // Check permission using standardized system
            const permissionError = rolePermissions.checkPermission(message.member, 'economy');
            if (permissionError) {
                return message.reply(permissionError);
            }

            // Get target user
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ **|** Mention user yang ingin di reset XP nya!');
            }

            // Find user data
            const userData = await Leveling.findOne({
                userId: targetUser.id,
                guildId: message.guild.id
            });

            if (!userData) {
                return message.reply('❌ **|** User tidak memiliki data XP!');
            }

            // Reset XP and level
            userData.xp = 0;
            userData.level = 1;
            await userData.save();

            // Update roles
            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (targetMember) {
                await updateLevelRole(targetMember, 1);
            }

            message.channel.send(`✅ ${targetUser} **|** XP telah di reset ke 0!`);
        } catch (error) {
            console.error('Error in resetxp command:', error);
            message.reply('❌ **|** Terjadi kesalahan saat mereset XP!');
        }
    }
};
