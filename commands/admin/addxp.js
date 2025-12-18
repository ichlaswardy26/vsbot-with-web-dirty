const { EmbedBuilder } = require('discord.js');
const Leveling = require('../../schemas/Leveling');
const { getXpRequirement } = require('../../util/levelUtils');
const { getLevelUpReward, addSouls } = require('../../util/economyUtils');
const { updateLevelRole } = require('../../util/roleUtils');
const rolePermissions = require('../../util/rolePermissions');
const config = require('../../config.js');

module.exports = {
    name: 'addxp',
    description: 'Tambahkan XP ke user (Admin only)',
    category: 'admin',
    usage: 'addxp @user <jumlah>',
    async exec(client, message, args) {
        try {
            const permissionError = rolePermissions.checkPermission(message.member, 'economy');
            if (permissionError) {
                return message.reply(permissionError);
            }

            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1]);

            if (!targetUser || isNaN(amount)) {
                const helpEmbed = new EmbedBuilder()
                    .setColor(config.colors?.warning || '#FEE75C')
                    .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
                    .setDescription('Tambahkan XP ke user yang ditentukan.')
                    .addFields(
                        { name: '📝 Format', value: `\`${config.prefix}addxp @user <jumlah>\``, inline: false },
                        { name: '📌 Contoh', value: `\`${config.prefix}addxp @User 500\``, inline: false }
                    )
                    .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                return message.reply({ embeds: [helpEmbed] });
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
            const oldXp = userData.xp;
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

            const leveledUp = userData.level > oldLevel;
            const embed = new EmbedBuilder()
                .setColor(config.colors?.success || '#57F287')
                .setTitle(`${config.emojis?.check || '✅'} XP Berhasil Ditambahkan`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 User', value: `${targetUser}`, inline: true },
                    { name: '✨ XP Ditambahkan', value: `+${amount.toLocaleString()}`, inline: true },
                    { name: '📊 XP Sekarang', value: `${userData.xp.toLocaleString()}/${getXpRequirement(userData.level).toLocaleString()}`, inline: true },
                    { name: '📈 Level', value: leveledUp ? `${oldLevel} → ${userData.level} 🎉` : `${userData.level}`, inline: true }
                )
                .setFooter({ text: `Ditambahkan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            if (leveledUp) {
                embed.setDescription(`🎉 **${targetUser.username}** naik level dari **${oldLevel}** ke **${userData.level}**!`);
            }

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[addxp] Error:', error.message);
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors?.error || '#ED4245')
                .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
                .setDescription('Gagal menambahkan XP. Silakan coba lagi.')
                .setTimestamp();
            message.reply({ embeds: [errorEmbed] });
        }
    }
};
