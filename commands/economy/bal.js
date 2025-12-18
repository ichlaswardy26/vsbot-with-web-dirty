const { getOrCreateEconomy, formatNumber } = require('../../util/economyUtils');
const config = require('../../config.js');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'souls', 'soul', 'cash'],
    description: 'Check your souls balance',
    category: 'economy',
    usage: 'balance [@user]',
    async exec(client, message) {
        try {
            const targetUser = message.mentions.users.first() || message.author;
            const economy = await getOrCreateEconomy(targetUser.id, message.guild.id);
            
            const soulsEmoji = config.emojis?.souls || "💰";
            message.channel.send(`${soulsEmoji} **|** ${targetUser} Memiliki ${formatNumber(economy.cash)} souls`);
        } catch (error) {
            console.error('[balance] Error:', error.message);
            message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengecek saldo!`);
        }
    }
};
