const { EmbedBuilder } = require('discord.js');
const Leveling = require('../../schemas/Leveling');
const { updateLevelRole } = require('../../util/roleUtils');
const config = require('../../config.js');

module.exports = {
    name: 'resetxp',
    description: 'Reset XP user (Admin only)',
    category: 'admin',
    usage: 'resetxp @user',
    async exec(client, message) {
        try {
            const rolePermissions = require("../../util/rolePermissions");
            
            const permissionError = rolePermissions.checkPermission(message.member, 'economy');
            if (permissionError) {
                return message.reply(permissionError);
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                const helpEmbed = new EmbedBuilder()
                    .setColor(config.colors?.warning || '#FEE75C')
                    .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
                    .setDescription('Reset XP dan level user ke awal.')
                    .addFields(
                        { name: '📝 Format', value: `\`${config.prefix}resetxp @user\``, inline: false },
                        { name: '📌 Contoh', value: `\`${config.prefix}resetxp @User\``, inline: false }
                    )
                    .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                return message.reply({ embeds: [helpEmbed] });
            }

            const userData = await Leveling.findOne({
                userId: targetUser.id,
                guildId: message.guild.id
            });

            if (!userData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.colors?.error || '#ED4245')
                    .setTitle(`${config.emojis?.cross || '❌'} Data Tidak Ditemukan`)
                    .setDescription(`${targetUser} tidak memiliki data XP.`)
                    .setTimestamp();
                return message.reply({ embeds: [errorEmbed] });
            }

            const oldLevel = userData.level;
            const oldXp = userData.xp;

            userData.xp = 0;
            userData.level = 1;
            await userData.save();

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (targetMember) {
                await updateLevelRole(targetMember, 1);
            }

            const successEmbed = new EmbedBuilder()
                .setColor(config.colors?.success || '#57F287')
                .setTitle(`${config.emojis?.check || '✅'} XP Berhasil Direset`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 User', value: `${targetUser}`, inline: true },
                    { name: '📉 Level Sebelumnya', value: `${oldLevel}`, inline: true },
                    { name: '✨ XP Sebelumnya', value: `${oldXp.toLocaleString()}`, inline: true },
                    { name: '📊 Status Sekarang', value: 'Level 1 | XP 0', inline: false }
                )
                .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            message.channel.send({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error in resetxp command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors?.error || '#ED4245')
                .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
                .setDescription('Gagal mereset XP. Silakan coba lagi.')
                .setTimestamp();
            message.reply({ embeds: [errorEmbed] });
        }
    }
};
