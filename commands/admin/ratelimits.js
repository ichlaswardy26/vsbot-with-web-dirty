const { EmbedBuilder } = require('discord.js');
const rateLimiter = require('../../util/rateLimiter');
const rolePermissions = require('../../util/rolePermissions');

module.exports = {
    name: 'ratelimits',
    aliases: ['rl', 'limits', 'cooldowns'],
    description: 'View rate limit and cooldown status',
    category: 'admin',
    usage: 'ratelimits [user] [category]',
    
    async exec(client, message, args) {
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'staff');
        if (permissionError) {
            return message.reply(permissionError);
        }

        const targetUser = message.mentions.users.first() || message.author;
        const category = args[1]?.toLowerCase();

        try {
            const embed = new EmbedBuilder()
                .setTitle('⏰ Rate Limits & Cooldowns')
                .setColor('#5865F2')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            // Add user info
            embed.addFields({
                name: '👤 User',
                value: `${targetUser.tag} (${targetUser.id})`,
                inline: false
            });

            // Check if user is exempt
            const targetMember = message.guild.members.cache.get(targetUser.id);
            const isExempt = targetMember ? rateLimiter.isExempt(targetMember) : false;
            
            if (isExempt) {
                embed.addFields({
                    name: '🛡️ Status',
                    value: '✅ User is exempt from rate limits',
                    inline: false
                });
            }

            // Get rate limit status for all categories
            const categories = ['admin', 'economy', 'shop', 'giveaway', 'moderator', 'customRole'];
            const rateLimitStatus = [];

            for (const cat of categories) {
                const status = rateLimiter.getRateLimitStatus(targetUser.id, cat);
                if (status) {
                    const percentage = status.percentage;
                    const progressBar = createProgressBar(percentage, 10);
                    const resetText = status.resetIn > 0 ? `Reset in ${status.resetIn}s` : 'Ready';
                    
                    rateLimitStatus.push(
                        `**${cat.toUpperCase()}**`,
                        `${progressBar} ${status.uses}/${status.maxUses} (${percentage}%)`,
                        `${resetText}`,
                        ''
                    );
                }
            }

            if (rateLimitStatus.length > 0) {
                embed.addFields({
                    name: '📊 Rate Limit Status',
                    value: rateLimitStatus.join('\n') || 'No active rate limits',
                    inline: false
                });
            }

            // Show specific category details if requested
            if (category && categories.includes(category)) {
                const status = rateLimiter.getRateLimitStatus(targetUser.id, category);
                if (status) {
                    embed.addFields({
                        name: `🔍 ${category.toUpperCase()} Details`,
                        value: [
                            `Uses: ${status.uses}/${status.maxUses}`,
                            `Percentage: ${status.percentage}%`,
                            `Reset: ${status.resetIn > 0 ? `${status.resetIn} seconds` : 'Ready'}`,
                            `Status: ${status.uses >= status.maxUses ? '🔴 Limited' : '🟢 Available'}`
                        ].join('\n'),
                        inline: true
                    });
                }
            }

            // Get system statistics
            const stats = rateLimiter.getStats();
            embed.addFields({
                name: '📈 System Statistics',
                value: [
                    `Active Cooldowns: ${stats.activeCooldowns}`,
                    `Active Rate Limits: ${stats.activeRateLimits}`,
                    `Categories: ${stats.categories.length}`,
                    `Rate Limit Categories: ${stats.rateLimitCategories.length}`
                ].join('\n'),
                inline: true
            });

            // Add cooldown information for common commands
            const commonCommands = ['addxp', 'giveaway', 'cusrole', 'shop', 'warn'];
            const cooldownInfo = [];

            for (const cmd of commonCommands) {
                const remaining = rateLimiter.getRemainingCooldown(targetUser.id, cmd);
                if (remaining > 0) {
                    cooldownInfo.push(`${cmd}: ${remaining}s`);
                }
            }

            if (cooldownInfo.length > 0) {
                embed.addFields({
                    name: '⏳ Active Cooldowns',
                    value: cooldownInfo.join('\n'),
                    inline: true
                });
            }

            // Add management options for admins
            if (rolePermissions.isAdmin(message.member)) {
                embed.addFields({
                    name: '🔧 Admin Actions',
                    value: [
                        '`ratelimits reset <user> <category>` - Reset rate limit',
                        '`ratelimits cooldown <user> <command>` - Reset cooldown',
                        '`ratelimits stats` - Detailed statistics'
                    ].join('\n'),
                    inline: false
                });

                // Handle admin actions
                if (args[0] === 'reset' && args[1] && args[2]) {
                    const resetUser = message.mentions.users.first();
                    const resetCategory = args[2].toLowerCase();
                    
                    if (resetUser && categories.includes(resetCategory)) {
                        rateLimiter.resetRateLimit(resetUser.id, resetCategory);
                        embed.setFooter({ text: `✅ Reset ${resetCategory} rate limit for ${resetUser.tag}` });
                    }
                }

                if (args[0] === 'cooldown' && args[1] && args[2]) {
                    const resetUser = message.mentions.users.first();
                    const resetCommand = args[2].toLowerCase();
                    
                    if (resetUser) {
                        rateLimiter.resetCooldown(resetUser.id, resetCommand);
                        embed.setFooter({ text: `✅ Reset ${resetCommand} cooldown for ${resetUser.tag}` });
                    }
                }
            }

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in ratelimits command:', error);
            message.reply('❌ **|** Terjadi kesalahan saat mengambil data rate limits.');
        }
    }
};

/**
 * Create a progress bar for visual representation
 * @param {number} percentage - Percentage (0-100)
 * @param {number} length - Length of progress bar
 * @returns {string} Progress bar string
 */
function createProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    const fillChar = '█';
    const emptyChar = '░';
    
    return `${fillChar.repeat(filled)}${emptyChar.repeat(empty)}`;
}