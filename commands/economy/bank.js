const { EmbedBuilder } = require('discord.js');
const { getOrCreateEconomy, formatNumber } = require('../../util/economyUtils');
const config = require('../../config.js');

module.exports = {
    name: 'bank',
    aliases: ['deposit', 'withdraw'],
    description: 'Kelola bank souls kamu',
    category: 'economy',
    usage: 'bank <deposit/withdraw> <jumlah/all>',
    async exec(client, message, args) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;
            const economy = await getOrCreateEconomy(userId, guildId);
            
            const soulsEmoji = config.emojis?.souls || "💰";
            const action = args[0]?.toLowerCase();
            
            // Jika tidak ada argumen, tampilkan info bank
            if (!action) {
                const embed = new EmbedBuilder()
                    .setTitle(`🏦 Bank Souls`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setColor(config.colors?.primary || "#5865F2")
                    .addFields(
                        { name: `${soulsEmoji} Dompet`, value: `**${formatNumber(economy.cash)}** souls`, inline: true },
                        { name: "🏦 Bank", value: `**${formatNumber(economy.bank || 0)}** souls`, inline: true },
                        { name: "💎 Total", value: `**${formatNumber((economy.cash || 0) + (economy.bank || 0))}** souls`, inline: true }
                    )
                    .setDescription("Gunakan `bank deposit <jumlah>` atau `bank withdraw <jumlah>`")
                    .setFooter({ 
                        text: `Diminta oleh ${message.author.username}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed] });
            }

            const amountArg = args[1]?.toLowerCase();
            if (!amountArg) {
                return message.reply(`${config.emojis?.warning || "⚠️"} **|** Masukkan jumlah souls! Contoh: \`bank ${action} 1000\` atau \`bank ${action} all\``);
            }

            if (action === 'deposit' || action === 'dep') {
                const amount = amountArg === 'all' ? economy.cash : parseInt(amountArg);
                
                if (isNaN(amount) || amount <= 0) {
                    return message.reply(`${config.emojis?.cross || "❌"} **|** Jumlah tidak valid!`);
                }
                
                if (amount > economy.cash) {
                    return message.reply(`${config.emojis?.cross || "❌"} **|** Saldo dompet tidak cukup! Kamu hanya punya **${formatNumber(economy.cash)}** souls.`);
                }

                economy.cash -= amount;
                economy.bank = (economy.bank || 0) + amount;
                await economy.save();

                const embed = new EmbedBuilder()
                    .setTitle("🏦 Deposit Berhasil")
                    .setColor(config.colors?.success || "#57F287")
                    .setDescription(`Kamu telah menyimpan **${formatNumber(amount)}** souls ke bank!`)
                    .addFields(
                        { name: `${soulsEmoji} Dompet`, value: `**${formatNumber(economy.cash)}** souls`, inline: true },
                        { name: "🏦 Bank", value: `**${formatNumber(economy.bank)}** souls`, inline: true }
                    )
                    .setFooter({ text: `Diminta oleh ${message.author.username}` })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed] });
            }

            if (action === 'withdraw' || action === 'wd') {
                const bankBalance = economy.bank || 0;
                const amount = amountArg === 'all' ? bankBalance : parseInt(amountArg);
                
                if (isNaN(amount) || amount <= 0) {
                    return message.reply(`${config.emojis?.cross || "❌"} **|** Jumlah tidak valid!`);
                }
                
                if (amount > bankBalance) {
                    return message.reply(`${config.emojis?.cross || "❌"} **|** Saldo bank tidak cukup! Kamu hanya punya **${formatNumber(bankBalance)}** souls di bank.`);
                }

                economy.bank -= amount;
                economy.cash += amount;
                await economy.save();

                const embed = new EmbedBuilder()
                    .setTitle("🏦 Withdraw Berhasil")
                    .setColor(config.colors?.success || "#57F287")
                    .setDescription(`Kamu telah mengambil **${formatNumber(amount)}** souls dari bank!`)
                    .addFields(
                        { name: `${soulsEmoji} Dompet`, value: `**${formatNumber(economy.cash)}** souls`, inline: true },
                        { name: "🏦 Bank", value: `**${formatNumber(economy.bank)}** souls`, inline: true }
                    )
                    .setFooter({ text: `Diminta oleh ${message.author.username}` })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed] });
            }

            return message.reply(`${config.emojis?.warning || "⚠️"} **|** Gunakan \`bank deposit <jumlah>\` atau \`bank withdraw <jumlah>\``);

        } catch (error) {
            console.error('[bank] Error:', error.message);
            message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengakses bank!`);
        }
    }
};
