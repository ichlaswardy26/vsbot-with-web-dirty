const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Bank = require('../../schemas/Bank');
const { getBalance, removeSouls, addSouls, formatNumber } = require('../../util/economyUtils');
const i18n = require('../../util/i18nManager');

module.exports = {
    name: 'bank',
    aliases: ['b'],
    description: 'Manage your bank account',
    category: 'economy',
    usage: 'bank [deposit/withdraw/interest/upgrade] [amount]',
    examples: ['bank', 'bank deposit 1000', 'bank withdraw 500', 'bank interest'],
    
    async exec(client, message, args) {
        const userId = message.author.id;
        const guildId = message.guild.id;
        const subcommand = args[0]?.toLowerCase();
        
        // Get or create bank account
        const bank = await Bank.getOrCreate(userId, guildId);
        const wallet = await getBalance(userId, guildId);
        
        // No subcommand - show bank info
        if (!subcommand) {
            return this.showBankInfo(message, bank, wallet);
        }
        
        switch (subcommand) {
            case 'deposit':
            case 'dep':
            case 'd':
                return this.handleDeposit(message, bank, wallet, args[1]);
                
            case 'withdraw':
            case 'wd':
            case 'w':
                return this.handleWithdraw(message, bank, wallet, args[1]);
                
            case 'interest':
            case 'int':
            case 'i':
                return this.handleInterest(message, bank);
                
            case 'upgrade':
            case 'up':
                return this.handleUpgrade(message, bank, wallet);
                
            case 'history':
            case 'h':
                return this.showHistory(message, bank);
                
            default:
                return this.showBankInfo(message, bank, wallet);
        }
    },
    
    async showBankInfo(message, bank, wallet) {
        const interestReady = this.isInterestReady(bank);
        const interestAmount = Math.floor(bank.balance * bank.interestRate);
        
        const embed = new EmbedBuilder()
            .setTitle('🏦 Bank Account')
            .setColor('#5865F2')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💰 Wallet', value: `${formatNumber(wallet)} souls`, inline: true },
                { name: '🏦 Bank', value: `${formatNumber(bank.balance)} souls`, inline: true },
                { name: '📊 Total', value: `${formatNumber(wallet + bank.balance)} souls`, inline: true },
                { name: '📦 Capacity', value: `${formatNumber(bank.balance)}/${formatNumber(bank.capacity)}`, inline: true },
                { name: '📈 Interest Rate', value: `${(bank.interestRate * 100).toFixed(1)}%/day`, inline: true },
                { name: '💵 Next Interest', value: interestReady ? `✅ ${formatNumber(interestAmount)} souls ready!` : `⏳ ${this.getInterestCooldown(bank)}`, inline: true }
            )
            .setFooter({ text: 'Use: bank deposit/withdraw/interest/upgrade' });
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('bank_deposit_all')
                .setLabel('Deposit All')
                .setStyle(ButtonStyle.Success)
                .setDisabled(wallet <= 0 || bank.balance >= bank.capacity),
            new ButtonBuilder()
                .setCustomId('bank_withdraw_all')
                .setLabel('Withdraw All')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(bank.balance <= 0),
            new ButtonBuilder()
                .setCustomId('bank_interest')
                .setLabel('Collect Interest')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!interestReady || bank.balance <= 0)
        );
        
        const reply = await message.reply({ embeds: [embed], components: [row] });
        
        // Button collector
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });
        
        collector.on('collect', async interaction => {
            const freshBank = await Bank.getOrCreate(message.author.id, message.guild.id);
            const freshWallet = await getBalance(message.author.id, message.guild.id);
            
            if (interaction.customId === 'bank_deposit_all') {
                const maxDeposit = Math.min(freshWallet, freshBank.capacity - freshBank.balance);
                if (maxDeposit > 0) {
                    await removeSouls(message.author.id, message.guild.id, maxDeposit);
                    await freshBank.deposit(maxDeposit);
                    await interaction.reply({ content: `✅ Deposited **${formatNumber(maxDeposit)}** souls to bank!`, ephemeral: true });
                }
            } else if (interaction.customId === 'bank_withdraw_all') {
                if (freshBank.balance > 0) {
                    const amount = freshBank.balance;
                    await freshBank.withdraw(amount);
                    await addSouls(message.author.id, message.guild.id, amount);
                    await interaction.reply({ content: `✅ Withdrew **${formatNumber(amount)}** souls from bank!`, ephemeral: true });
                }
            } else if (interaction.customId === 'bank_interest') {
                const result = await freshBank.collectInterest();
                if (result.success) {
                    await interaction.reply({ content: `✅ Collected **${formatNumber(result.interest)}** souls in interest!`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
                }
            }
        });
        
        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },
    
    async handleDeposit(message, bank, wallet, amountStr) {
        let amount;
        
        if (!amountStr || amountStr.toLowerCase() === 'all') {
            amount = Math.min(wallet, bank.capacity - bank.balance);
        } else {
            amount = parseInt(amountStr);
        }
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Please specify a valid amount.');
        }
        
        if (amount > wallet) {
            return message.reply(`❌ You don't have enough souls. Wallet: **${formatNumber(wallet)}** souls`);
        }
        
        const result = await bank.deposit(amount);
        
        if (!result.success) {
            if (result.reason === 'capacity_exceeded') {
                return message.reply(`❌ Bank capacity exceeded! Max deposit: **${formatNumber(result.maxDeposit)}** souls`);
            }
            return message.reply(`❌ Deposit failed: ${result.reason}`);
        }
        
        await removeSouls(message.author.id, message.guild.id, amount);
        
        const embed = new EmbedBuilder()
            .setTitle('💰 Deposit Successful')
            .setColor('#57F287')
            .setDescription(`Deposited **${formatNumber(amount)}** souls to your bank!`)
            .addFields(
                { name: 'New Bank Balance', value: `${formatNumber(result.newBalance)} souls`, inline: true },
                { name: 'New Wallet Balance', value: `${formatNumber(wallet - amount)} souls`, inline: true }
            );
        
        return message.reply({ embeds: [embed] });
    },
    
    async handleWithdraw(message, bank, wallet, amountStr) {
        let amount;
        
        if (!amountStr || amountStr.toLowerCase() === 'all') {
            amount = bank.balance;
        } else {
            amount = parseInt(amountStr);
        }
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Please specify a valid amount.');
        }
        
        const result = await bank.withdraw(amount);
        
        if (!result.success) {
            if (result.reason === 'insufficient_funds') {
                return message.reply(`❌ Insufficient bank balance. Bank: **${formatNumber(bank.balance)}** souls`);
            }
            return message.reply(`❌ Withdrawal failed: ${result.reason}`);
        }
        
        await addSouls(message.author.id, message.guild.id, amount);
        
        const embed = new EmbedBuilder()
            .setTitle('💸 Withdrawal Successful')
            .setColor('#57F287')
            .setDescription(`Withdrew **${formatNumber(amount)}** souls from your bank!`)
            .addFields(
                { name: 'New Bank Balance', value: `${formatNumber(result.newBalance)} souls`, inline: true },
                { name: 'New Wallet Balance', value: `${formatNumber(wallet + amount)} souls`, inline: true }
            );
        
        return message.reply({ embeds: [embed] });
    },
    
    async handleInterest(message, bank) {
        const result = await bank.collectInterest();
        
        if (!result.success) {
            if (result.reason === 'cooldown') {
                const hours = Math.ceil(result.hoursRemaining);
                return message.reply(`⏳ Interest not ready yet. Come back in **${hours}** hour(s).`);
            }
            if (result.reason === 'no_interest') {
                return message.reply('❌ No interest to collect. Deposit some souls first!');
            }
            return message.reply(`❌ Failed: ${result.reason}`);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📈 Interest Collected!')
            .setColor('#57F287')
            .setDescription(`You collected **${formatNumber(result.interest)}** souls in interest!`)
            .addFields(
                { name: 'New Bank Balance', value: `${formatNumber(result.newBalance)} souls`, inline: true }
            )
            .setFooter({ text: 'Come back in 24 hours for more interest!' });
        
        return message.reply({ embeds: [embed] });
    },
    
    async handleUpgrade(message, bank, wallet) {
        const upgradeInfo = await bank.upgradeCapacity();
        
        if (!upgradeInfo.success) {
            return message.reply('❌ Bank is already at maximum level!');
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Bank Upgrade')
            .setColor('#5865F2')
            .setDescription(`Upgrade your bank capacity!`)
            .addFields(
                { name: 'Current Capacity', value: `${formatNumber(bank.capacity)} souls`, inline: true },
                { name: 'New Capacity', value: `${formatNumber(upgradeInfo.newCapacity)} souls`, inline: true },
                { name: 'Upgrade Cost', value: `${formatNumber(upgradeInfo.cost)} souls`, inline: true },
                { name: 'Your Wallet', value: `${formatNumber(wallet)} souls`, inline: true }
            );
        
        if (wallet < upgradeInfo.cost) {
            embed.setFooter({ text: `❌ You need ${formatNumber(upgradeInfo.cost - wallet)} more souls!` });
            return message.reply({ embeds: [embed] });
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('bank_upgrade_confirm')
                .setLabel(`Upgrade (${formatNumber(upgradeInfo.cost)} souls)`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('bank_upgrade_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const reply = await message.reply({ embeds: [embed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });
        
        collector.on('collect', async interaction => {
            if (interaction.customId === 'bank_upgrade_confirm') {
                const freshWallet = await getBalance(message.author.id, message.guild.id);
                if (freshWallet < upgradeInfo.cost) {
                    return interaction.update({ content: '❌ Insufficient funds!', embeds: [], components: [] });
                }
                
                await removeSouls(message.author.id, message.guild.id, upgradeInfo.cost);
                bank.capacity = upgradeInfo.newCapacity;
                bank.upgrades.capacityLevel = upgradeInfo.nextLevel;
                await bank.save();
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Bank Upgraded!')
                    .setColor('#57F287')
                    .setDescription(`Your bank capacity is now **${formatNumber(upgradeInfo.newCapacity)}** souls!`);
                
                await interaction.update({ embeds: [successEmbed], components: [] });
            } else {
                await interaction.update({ content: 'Upgrade cancelled.', embeds: [], components: [] });
            }
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({ components: [] }).catch(() => {});
            }
        });
    },
    
    async showHistory(message, bank) {
        const transactions = bank.transactions.slice(-10).reverse();
        
        if (transactions.length === 0) {
            return message.reply('📜 No transaction history yet.');
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📜 Transaction History')
            .setColor('#5865F2')
            .setDescription(
                transactions.map(t => {
                    const emoji = t.type === 'DEPOSIT' ? '📥' : t.type === 'WITHDRAW' ? '📤' : '📈';
                    const sign = t.amount >= 0 ? '+' : '';
                    const time = `<t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>`;
                    return `${emoji} **${t.type}** ${sign}${formatNumber(t.amount)} souls ${time}`;
                }).join('\n')
            )
            .setFooter({ text: 'Showing last 10 transactions' });
        
        return message.reply({ embeds: [embed] });
    },
    
    isInterestReady(bank) {
        const now = new Date();
        const lastInterest = new Date(bank.lastInterest);
        const hoursSinceLastInterest = (now - lastInterest) / (1000 * 60 * 60);
        return hoursSinceLastInterest >= 24;
    },
    
    getInterestCooldown(bank) {
        const now = new Date();
        const lastInterest = new Date(bank.lastInterest);
        const hoursSinceLastInterest = (now - lastInterest) / (1000 * 60 * 60);
        const hoursRemaining = Math.ceil(24 - hoursSinceLastInterest);
        return `${hoursRemaining}h remaining`;
    }
};
