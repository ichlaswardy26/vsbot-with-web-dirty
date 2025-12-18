const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const LevelReward = require('../../schemas/LevelReward');
const { formatNumber } = require('../../util/economyUtils');

module.exports = {
    name: 'levelrewards',
    aliases: ['lr', 'levelroles', 'rolerewards'],
    description: 'Manage automatic role rewards for levels',
    category: 'admin',
    usage: 'levelrewards [add/remove/list] [level] [@role] [souls_bonus]',
    examples: [
        'levelrewards list',
        'levelrewards add 10 @Member',
        'levelrewards add 20 @Active 500',
        'levelrewards remove 10'
    ],
    permissions: ['Administrator'],
    
    async exec(client, message, args) {
        // Check permissions
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        const subcommand = args[0]?.toLowerCase();
        const guildId = message.guild.id;
        
        if (!subcommand || subcommand === 'list') {
            return this.listRewards(message, guildId);
        }
        
        switch (subcommand) {
            case 'add':
            case 'set':
                return this.addReward(message, args, guildId);
                
            case 'remove':
            case 'delete':
            case 'del':
                return this.removeReward(message, args, guildId);
                
            case 'test':
                return this.testReward(message, args, guildId);
                
            default:
                return this.listRewards(message, guildId);
        }
    },
    
    async listRewards(message, guildId) {
        const rewards = await LevelReward.getRewardsForGuild(guildId);
        
        if (rewards.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎁 Level Rewards')
                .setColor('#5865F2')
                .setDescription('No level rewards configured yet.\n\nUse `levelrewards add <level> @role [souls_bonus]` to add one!')
                .setFooter({ text: 'Tip: Users automatically get roles when they reach the specified level' });
            
            return message.reply({ embeds: [embed] });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 Level Rewards')
            .setColor('#5865F2')
            .setDescription(
                rewards.map(r => {
                    const role = message.guild.roles.cache.get(r.roleId);
                    const roleName = role ? `<@&${r.roleId}>` : `~~${r.roleName || 'Deleted Role'}~~`;
                    const bonus = r.soulsBonus > 0 ? ` (+${formatNumber(r.soulsBonus)} souls)` : '';
                    const stack = r.removeOnHigher ? ' 📤' : ' 📥';
                    return `**Level ${r.level}** → ${roleName}${bonus}${stack}`;
                }).join('\n')
            )
            .addFields(
                { name: 'Legend', value: '📥 = Stacks with other roles\n📤 = Removed when higher role earned', inline: false }
            )
            .setFooter({ text: `${rewards.length} reward(s) configured` });
        
        return message.reply({ embeds: [embed] });
    },
    
    async addReward(message, args, guildId) {
        const level = parseInt(args[1]);
        const role = message.mentions.roles.first();
        const soulsBonus = parseInt(args[3]) || 0;
        
        if (!level || level < 1 || level > 100) {
            return message.reply('❌ Please specify a valid level (1-100).');
        }
        
        if (!role) {
            return message.reply('❌ Please mention a role to assign.');
        }
        
        // Check if role is manageable
        if (role.managed) {
            return message.reply('❌ This role is managed by an integration and cannot be assigned.');
        }
        
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('❌ I cannot assign this role as it is higher than my highest role.');
        }
        
        // Check for existing reward at this level
        const existing = await LevelReward.getRewardForLevel(guildId, level);
        
        const embed = new EmbedBuilder()
            .setTitle(existing ? '⚠️ Update Level Reward?' : '➕ Add Level Reward')
            .setColor(existing ? '#FEE75C' : '#5865F2')
            .addFields(
                { name: 'Level', value: `${level}`, inline: true },
                { name: 'Role', value: `${role}`, inline: true },
                { name: 'Souls Bonus', value: soulsBonus > 0 ? formatNumber(soulsBonus) : 'None', inline: true }
            );
        
        if (existing) {
            const oldRole = message.guild.roles.cache.get(existing.roleId);
            embed.setDescription(`This will replace the existing reward:\n**Level ${level}** → ${oldRole || existing.roleName}`);
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lr_confirm')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('lr_stack')
                .setLabel('Remove on Higher')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('lr_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );
        
        const reply = await message.reply({ embeds: [embed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000
        });
        
        let removeOnHigher = false;
        
        collector.on('collect', async interaction => {
            if (interaction.customId === 'lr_stack') {
                removeOnHigher = !removeOnHigher;
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lr_confirm')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('lr_stack')
                        .setLabel(removeOnHigher ? '✓ Remove on Higher' : 'Remove on Higher')
                        .setStyle(removeOnHigher ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('lr_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [updatedRow] });
                return;
            }
            
            if (interaction.customId === 'lr_confirm') {
                await LevelReward.addReward(guildId, level, role.id, role.name, {
                    removeOnHigher,
                    soulsBonus,
                    createdBy: message.author.id
                });
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Level Reward Added')
                    .setColor('#57F287')
                    .setDescription(`Users reaching **Level ${level}** will now receive ${role}${soulsBonus > 0 ? ` and **${formatNumber(soulsBonus)}** souls` : ''}!`);
                
                await interaction.update({ embeds: [successEmbed], components: [] });
                collector.stop();
            } else if (interaction.customId === 'lr_cancel') {
                await interaction.update({ content: 'Cancelled.', embeds: [], components: [] });
                collector.stop();
            }
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({ content: 'Timed out.', components: [] }).catch(() => {});
            }
        });
    },
    
    async removeReward(message, args, guildId) {
        const level = parseInt(args[1]);
        
        if (!level || level < 1) {
            return message.reply('❌ Please specify a valid level.');
        }
        
        const existing = await LevelReward.getRewardForLevel(guildId, level);
        
        if (!existing) {
            return message.reply(`❌ No reward configured for level ${level}.`);
        }
        
        await LevelReward.removeReward(guildId, level);
        
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Level Reward Removed')
            .setColor('#ED4245')
            .setDescription(`Removed reward for **Level ${level}** (${existing.roleName || 'Unknown Role'})`);
        
        return message.reply({ embeds: [embed] });
    },
    
    async testReward(message, args, guildId) {
        const level = parseInt(args[1]) || 1;
        const rewards = await LevelReward.getRewardsUpToLevel(guildId, level);
        
        if (rewards.length === 0) {
            return message.reply(`📋 No rewards would be given for level ${level}.`);
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Rewards for Level ${level}`)
            .setColor('#5865F2')
            .setDescription(
                rewards.map(r => {
                    const role = message.guild.roles.cache.get(r.roleId);
                    return `• ${role || r.roleName}${r.soulsBonus > 0 ? ` (+${formatNumber(r.soulsBonus)} souls)` : ''}`;
                }).join('\n')
            );
        
        return message.reply({ embeds: [embed] });
    }
};
