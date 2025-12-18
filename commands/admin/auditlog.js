const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const auditLogger = require('../../util/auditLogger');

module.exports = {
    name: 'auditlog',
    aliases: ['audit', 'modlog', 'logs'],
    description: 'View moderation and admin audit logs',
    category: 'admin',
    usage: 'auditlog [user/@user] [action] [limit]',
    examples: [
        'auditlog',
        'auditlog @user',
        'auditlog WARN',
        'auditlog stats'
    ],
    permissions: ['Administrator'],
    
    async exec(client, message, args) {
        // Check permissions
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permission to view audit logs.');
        }
        
        const guildId = message.guild.id;
        const subcommand = args[0]?.toLowerCase();
        
        // Check for stats subcommand
        if (subcommand === 'stats') {
            return this.showStats(message, guildId);
        }
        
        // Check for user mention
        const targetUser = message.mentions.users.first();
        if (targetUser) {
            return this.showUserLogs(message, guildId, targetUser.id);
        }
        
        // Check for action type
        const actionTypes = [
            'WARN', 'MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN', 'TIMEOUT',
            'SOULS_ADD', 'SOULS_REMOVE', 'XP_ADD', 'XP_REMOVE',
            'CONFIG_UPDATE', 'AUTOMOD_TRIGGER'
        ];
        
        if (subcommand && actionTypes.includes(subcommand.toUpperCase())) {
            return this.showActionLogs(message, guildId, subcommand.toUpperCase());
        }
        
        // Default: show recent logs with filter menu
        return this.showRecentLogs(message, guildId);
    },
    
    async showRecentLogs(message, guildId) {
        const logs = await auditLogger.getRecentLogs(guildId, 10);
        
        if (logs.length === 0) {
            return message.reply('📜 No audit logs found.');
        }
        
        const embed = this.createLogsEmbed(logs, 'Recent Audit Logs');
        
        const filterMenu = new StringSelectMenuBuilder()
            .setCustomId('audit_filter')
            .setPlaceholder('Filter by action type')
            .addOptions([
                { label: 'All Actions', value: 'all', emoji: '📋' },
                { label: 'Warnings', value: 'WARN', emoji: '⚠️' },
                { label: 'Mutes', value: 'MUTE', emoji: '🔇' },
                { label: 'Kicks', value: 'KICK', emoji: '👢' },
                { label: 'Bans', value: 'BAN', emoji: '🔨' },
                { label: 'Economy', value: 'SOULS', emoji: '💰' },
                { label: 'XP/Levels', value: 'XP', emoji: '📊' },
                { label: 'Config Changes', value: 'CONFIG_UPDATE', emoji: '⚙️' },
                { label: 'AutoMod', value: 'AUTOMOD_TRIGGER', emoji: '🛡️' }
            ]);
        
        const row1 = new ActionRowBuilder().addComponents(filterMenu);
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('audit_refresh')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId('audit_stats')
                .setLabel('Statistics')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
        );
        
        const reply = await message.reply({ embeds: [embed], components: [row1, row2] });
        
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });
        
        collector.on('collect', async interaction => {
            if (interaction.customId === 'audit_filter') {
                const filter = interaction.values[0];
                let filteredLogs;
                
                if (filter === 'all') {
                    filteredLogs = await auditLogger.getRecentLogs(guildId, 10);
                } else if (filter === 'SOULS') {
                    filteredLogs = await auditLogger.searchLogs(guildId, {
                        action: { $in: ['SOULS_ADD', 'SOULS_REMOVE', 'SOULS_RESET'] },
                        limit: 10
                    });
                } else if (filter === 'XP') {
                    filteredLogs = await auditLogger.searchLogs(guildId, {
                        action: { $in: ['XP_ADD', 'XP_REMOVE', 'XP_RESET', 'LEVEL_SET'] },
                        limit: 10
                    });
                } else {
                    filteredLogs = await auditLogger.getLogsByAction(guildId, filter, 10);
                }
                
                const newEmbed = this.createLogsEmbed(filteredLogs, `Audit Logs - ${filter}`);
                await interaction.update({ embeds: [newEmbed] });
            } else if (interaction.customId === 'audit_refresh') {
                const freshLogs = await auditLogger.getRecentLogs(guildId, 10);
                const newEmbed = this.createLogsEmbed(freshLogs, 'Recent Audit Logs');
                await interaction.update({ embeds: [newEmbed] });
            } else if (interaction.customId === 'audit_stats') {
                const stats = await auditLogger.getStats(guildId, 30);
                const statsEmbed = this.createStatsEmbed(stats);
                await interaction.update({ embeds: [statsEmbed] });
            }
        });
        
        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },
    
    async showUserLogs(message, guildId, userId) {
        const logs = await auditLogger.getLogsByUser(guildId, userId, 15);
        
        if (logs.length === 0) {
            return message.reply('📜 No audit logs found for this user.');
        }
        
        const user = await message.client.users.fetch(userId).catch(() => null);
        const embed = this.createLogsEmbed(logs, `Audit Logs - ${user?.tag || userId}`);
        
        return message.reply({ embeds: [embed] });
    },
    
    async showActionLogs(message, guildId, action) {
        const logs = await auditLogger.getLogsByAction(guildId, action, 15);
        
        if (logs.length === 0) {
            return message.reply(`📜 No ${action} logs found.`);
        }
        
        const embed = this.createLogsEmbed(logs, `Audit Logs - ${action}`);
        
        return message.reply({ embeds: [embed] });
    },
    
    async showStats(message, guildId) {
        const stats = await auditLogger.getStats(guildId, 30);
        const embed = this.createStatsEmbed(stats);
        
        return message.reply({ embeds: [embed] });
    },
    
    createLogsEmbed(logs, title) {
        const embed = new EmbedBuilder()
            .setTitle(`📜 ${title}`)
            .setColor('#5865F2')
            .setTimestamp();
        
        if (logs.length === 0) {
            embed.setDescription('No logs found.');
            return embed;
        }
        
        const description = logs.map(log => {
            const emoji = this.getActionEmoji(log.action);
            const time = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
            const executor = log.executorTag || log.executorId;
            const target = log.targetTag || log.targetId || 'N/A';
            const reason = log.reason ? ` - ${log.reason.substring(0, 50)}` : '';
            
            return `${emoji} **${log.action}** by ${executor}\n└ Target: ${target}${reason} ${time}`;
        }).join('\n\n');
        
        embed.setDescription(description.substring(0, 4000));
        embed.setFooter({ text: `Showing ${logs.length} log(s)` });
        
        return embed;
    },
    
    createStatsEmbed(stats) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Audit Log Statistics (Last 30 Days)')
            .setColor('#5865F2')
            .setTimestamp();
        
        if (stats.length === 0) {
            embed.setDescription('No statistics available.');
            return embed;
        }
        
        const total = stats.reduce((sum, s) => sum + s.count, 0);
        
        const description = stats.slice(0, 15).map(s => {
            const emoji = this.getActionEmoji(s._id);
            const percentage = ((s.count / total) * 100).toFixed(1);
            const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
            return `${emoji} **${s._id}**: ${s.count} (${percentage}%)\n${bar}`;
        }).join('\n\n');
        
        embed.setDescription(description);
        embed.addFields({ name: 'Total Actions', value: `${total}`, inline: true });
        
        return embed;
    },
    
    getActionEmoji(action) {
        const emojis = {
            'WARN': '⚠️',
            'MUTE': '🔇',
            'UNMUTE': '🔊',
            'KICK': '👢',
            'BAN': '🔨',
            'UNBAN': '🔓',
            'TIMEOUT': '⏰',
            'SOULS_ADD': '💰',
            'SOULS_REMOVE': '💸',
            'SOULS_RESET': '🔄',
            'XP_ADD': '📈',
            'XP_REMOVE': '📉',
            'XP_RESET': '🔄',
            'CONFIG_UPDATE': '⚙️',
            'AUTOMOD_TRIGGER': '🛡️',
            'TICKET_CREATE': '🎫',
            'TICKET_CLOSE': '🔒',
            'GIVEAWAY_CREATE': '🎉',
            'GIVEAWAY_END': '🏆',
            'ROLE_ASSIGN': '👤',
            'ROLE_REMOVE': '👥'
        };
        
        return emojis[action] || '📋';
    }
};
