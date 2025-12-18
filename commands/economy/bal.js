const { EmbedBuilder } = require('discord.js');
const { getOrCreateEconomy, formatNumber } = require('../../util/economyUtils');
const config = require('../../config.js');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'souls', 'soul', 'cash'],
    description: 'Cek saldo souls kamu',
    category: 'economy',
    usage: 'balance [@user]',
    async exec(client, message) {
        try {
            const targetUser = message.mentions.users.first() || message.author;
            const economy = await getOrCreateEconomy(targetUser.id, message.guild.id);
            
            const soulsEmoji = config.emojis?.souls || "💰";
            const isOwnBalance = targetUser.id === message.author.id;
            
            const embed = new EmbedBuilder()
                .setTitle(`${soulsEmoji} Saldo Souls`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(config.colors?.primary || "#5865F2")
                .addFields(
                    { 
                        name: "👤 Pemilik", 
                        value: `${targetUser}`, 
                        inline: true 
                    },
                    { 
                        name: `${soulsEmoji} Saldo`, 
                        value: `**${formatNumber(economy.cash)}** souls`, 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: isOwnBalance ? "Gunakan 'daily' untuk klaim hadiah harian!" : `Diminta oleh ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[balance] Error:', error.message);
            message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengecek saldo!`);
        }
    }
};
