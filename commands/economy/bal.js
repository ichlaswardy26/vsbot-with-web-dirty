const { getOrCreateEconomy, formatNumber } = require('../../util/economyUtils');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'souls', 'soul', 'cash'],
    description: 'Check your souls balance',
    async exec(client, message, args) {
        try {
            const targetUser = message.mentions.users.first() || message.author;
            const economy = await getOrCreateEconomy(targetUser.id, message.guild.id);
            
            message.channel.send(`<:souls:1373202161823121560> **|** ${targetUser} Memiliki ${formatNumber(economy.cash)} souls`);
        } catch (error) {
            console.error('Error in balance command:', error);
            message.reply('There was an error checking your balance!');
        }
    }
};
