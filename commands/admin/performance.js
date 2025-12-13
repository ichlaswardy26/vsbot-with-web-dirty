const { EmbedBuilder } = require('discord.js');
const performanceMonitor = require('../../util/performanceMonitor');
const logger = require('../../util/logger');
const rolePermissions = require('../../util/rolePermissions');

module.exports = {
    name: 'performance',
    aliases: ['perf', 'stats', 'monitor'],
    description: 'View bot performance statistics and monitoring data',
    category: 'admin',
    usage: 'performance [system|commands|alerts|logs] [command_name]',
    
    async exec(client, message, args) {
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'admin');
        if (permissionError) {
            return message.reply(permissionError);
        }

        const subcommand = args[0]?.toLowerCase() || 'system';
        const commandName = args[1]?.toLowerCase();

        try {
            switch (subcommand) {
                case 'system':
                    await this.showSystemStats(message);
                    break;
                case 'commands':
                    await this.showCommandStats(message, commandName);
                    break;
                case 'alerts':
                    await this.showAlerts(message);
                    break;
                case 'logs':
                    await this.showLogStats(message);
                    break;
                case 'reset':
                    await this.resetStats(message);
                    break;
                default:
                    await this.showHelp(message);
            }
        } catch (error) {
            console.error('Error in performance command:', error);
            await logger.logError(error, 'performance command');
            message.reply('❌ **|** Terjadi kesalahan saat mengambil data performance.');
        }
    },

    /**
     * Show system performance statistics
     */
    async showSystemStats(message) {
        const stats = performanceMonitor.getSystemStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 System Performance Statistics')
            .setColor('#5865F2')
            .setTimestamp();

        // System overview
        embed.addFields({
            name: '🖥️ System Overview',
            value: [
                `**Uptime:** ${stats.uptimeFormatted}`,
                `**Commands Executed:** ${stats.commandsExecuted.toLocaleString()}`,
                `**Error Rate:** ${stats.errorRate.toFixed(2)}%`,
                `**Avg Response Time:** ${stats.averageResponseTime.toFixed(2)}ms`,
                `**Commands/Min:** ${stats.commandsPerMinute.toFixed(2)}`
            ].join('\n'),
            inline: true
        });

        // Memory usage
        embed.addFields({
            name: '💾 Memory Usage',
            value: [
                `**Current:** ${stats.memoryUsageFormatted.current}`,
                `**Peak:** ${stats.memoryUsageFormatted.peak}`,
                `**Total Heap:** ${stats.memoryUsageFormatted.total}`,
                `**Usage:** ${((stats.currentMemoryUsage / (1024 * 1024 * 1024)) * 100).toFixed(1)}%`
            ].join('\n'),
            inline: true
        });

        // Top commands
        if (stats.topCommands.length > 0) {
            const topCommandsText = stats.topCommands
                .map((cmd, index) => 
                    `${index + 1}. **${cmd.name}** (${cmd.executions}x, ${cmd.averageTime.toFixed(2)}ms avg)`
                )
                .join('\n');

            embed.addFields({
                name: '🏆 Top Commands',
                value: topCommandsText,
                inline: false
            });
        }

        // Performance indicators
        const indicators = [];
        if (stats.averageResponseTime < 100) {
            indicators.push('🟢 Response Time: Excellent');
        } else if (stats.averageResponseTime < 500) {
            indicators.push('🟡 Response Time: Good');
        } else {
            indicators.push('🔴 Response Time: Slow');
        }

        if (stats.errorRate < 1) {
            indicators.push('🟢 Error Rate: Excellent');
        } else if (stats.errorRate < 5) {
            indicators.push('🟡 Error Rate: Acceptable');
        } else {
            indicators.push('🔴 Error Rate: High');
        }

        const memoryUsagePercent = (stats.currentMemoryUsage / (1024 * 1024 * 1024)) * 100;
        if (memoryUsagePercent < 50) {
            indicators.push('🟢 Memory Usage: Good');
        } else if (memoryUsagePercent < 80) {
            indicators.push('🟡 Memory Usage: Moderate');
        } else {
            indicators.push('🔴 Memory Usage: High');
        }

        embed.addFields({
            name: '📈 Performance Indicators',
            value: indicators.join('\n'),
            inline: false
        });

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show command performance statistics
     */
    async showCommandStats(message, commandName) {
        const stats = performanceMonitor.getCommandStats(commandName);
        
        if (commandName && !stats) {
            return message.reply(`❌ **|** Command '${commandName}' tidak ditemukan dalam statistik.`);
        }

        const embed = new EmbedBuilder()
            .setTitle(commandName ? `📊 Command Stats: ${commandName}` : '📊 All Command Statistics')
            .setColor('#5865F2')
            .setTimestamp();

        if (commandName) {
            // Single command stats
            embed.addFields(
                {
                    name: '📈 Execution Statistics',
                    value: [
                        `**Total Executions:** ${stats.totalExecutions.toLocaleString()}`,
                        `**Successful:** ${stats.successfulExecutions.toLocaleString()}`,
                        `**Failed:** ${stats.failedExecutions.toLocaleString()}`,
                        `**Success Rate:** ${stats.successRate.toFixed(2)}%`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⏱️ Performance Metrics',
                    value: [
                        `**Average Time:** ${stats.averageExecutionTime.toFixed(2)}ms`,
                        `**Min Time:** ${stats.minExecutionTime.toFixed(2)}ms`,
                        `**Max Time:** ${stats.maxExecutionTime.toFixed(2)}ms`,
                        `**Avg Memory:** ${this.formatBytes(stats.averageMemoryUsage)}`
                    ].join('\n'),
                    inline: true
                }
            );

            // Recent executions
            if (stats.recentExecutions.length > 0) {
                const recentText = stats.recentExecutions
                    .slice(-5)
                    .map(exec => {
                        const status = exec.success ? '✅' : '❌';
                        const time = new Date(exec.timestamp).toLocaleTimeString();
                        return `${status} ${time} (${exec.executionTime.toFixed(2)}ms)`;
                    })
                    .join('\n');

                embed.addFields({
                    name: '🕐 Recent Executions',
                    value: recentText,
                    inline: false
                });
            }
        } else {
            // All commands overview
            const allStats = Object.entries(stats)
                .sort(([,a], [,b]) => b.totalExecutions - a.totalExecutions)
                .slice(0, 10);

            if (allStats.length > 0) {
                const commandList = allStats
                    .map(([name, cmdStats], index) => 
                        `${index + 1}. **${name}** - ${cmdStats.totalExecutions}x (${cmdStats.successRate.toFixed(1)}% success, ${cmdStats.averageExecutionTime.toFixed(2)}ms avg)`
                    )
                    .join('\n');

                embed.addFields({
                    name: '📋 Command Performance Overview',
                    value: commandList,
                    inline: false
                });

                // Summary statistics
                const totalExecutions = allStats.reduce((sum, [,stats]) => sum + stats.totalExecutions, 0);
                const avgSuccessRate = allStats.reduce((sum, [,stats]) => sum + stats.successRate, 0) / allStats.length;
                const avgResponseTime = allStats.reduce((sum, [,stats]) => sum + stats.averageExecutionTime, 0) / allStats.length;

                embed.addFields({
                    name: '📊 Summary',
                    value: [
                        `**Total Commands Tracked:** ${allStats.length}`,
                        `**Total Executions:** ${totalExecutions.toLocaleString()}`,
                        `**Average Success Rate:** ${avgSuccessRate.toFixed(2)}%`,
                        `**Average Response Time:** ${avgResponseTime.toFixed(2)}ms`
                    ].join('\n'),
                    inline: false
                });
            } else {
                embed.setDescription('Belum ada data command yang tercatat.');
            }
        }

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show performance alerts
     */
    async showAlerts(message) {
        const alerts = performanceMonitor.getPerformanceAlerts();
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Performance Alerts')
            .setColor(alerts.length > 0 ? '#FEE75C' : '#57F287')
            .setTimestamp();

        if (alerts.length === 0) {
            embed.setDescription('✅ Tidak ada alert performance saat ini. Semua sistem berjalan normal.');
        } else {
            const alertsByLevel = {
                critical: alerts.filter(a => a.level === 'critical'),
                warning: alerts.filter(a => a.level === 'warning'),
                info: alerts.filter(a => a.level === 'info')
            };

            if (alertsByLevel.critical.length > 0) {
                embed.addFields({
                    name: '🔴 Critical Alerts',
                    value: alertsByLevel.critical.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            if (alertsByLevel.warning.length > 0) {
                embed.addFields({
                    name: '🟡 Warning Alerts',
                    value: alertsByLevel.warning.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            if (alertsByLevel.info.length > 0) {
                embed.addFields({
                    name: '🔵 Info Alerts',
                    value: alertsByLevel.info.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            embed.addFields({
                name: '💡 Recommendations',
                value: [
                    '• Monitor memory usage regularly',
                    '• Check for slow commands and optimize',
                    '• Review error logs for recurring issues',
                    '• Consider restarting if memory usage is high'
                ].join('\n'),
                inline: false
            });
        }

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show log statistics
     */
    async showLogStats(message) {
        const logStats = await logger.getLogStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Log Statistics')
            .setColor('#5865F2')
            .setTimestamp();

        if (Object.keys(logStats).length === 0) {
            embed.setDescription('Tidak ada file log yang ditemukan.');
        } else {
            const logFiles = Object.entries(logStats)
                .sort(([,a], [,b]) => b.size - a.size)
                .map(([filename, stats]) => 
                    `**${filename}** - ${stats.sizeFormatted} (Modified: <t:${Math.floor(stats.modified.getTime() / 1000)}:R>)`
                )
                .join('\n');

            embed.addFields({
                name: '📁 Log Files',
                value: logFiles,
                inline: false
            });

            const totalSize = Object.values(logStats).reduce((sum, stats) => sum + stats.size, 0);
            embed.addFields({
                name: '📊 Summary',
                value: [
                    `**Total Files:** ${Object.keys(logStats).length}`,
                    `**Total Size:** ${logger.formatBytes(totalSize)}`,
                    `**Log Directory:** ./logs/`
                ].join('\n'),
                inline: false
            });
        }

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Reset performance statistics
     */
    async resetStats(message) {
        if (!rolePermissions.isAdmin(message.member)) {
            return message.reply('❌ **|** Hanya admin yang dapat mereset statistik.');
        }

        performanceMonitor.resetMetrics();
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 Statistics Reset')
            .setColor('#57F287')
            .setDescription('✅ Semua statistik performance telah direset.')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        await logger.log('INFO', 'ADMIN', `Performance statistics reset by ${message.author.tag}`, {
            userId: message.author.id,
            guildId: message.guild.id
        });
    },

    /**
     * Show help for performance command
     */
    async showHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Performance Command Help')
            .setColor('#5865F2')
            .setDescription('Monitor bot performance and statistics')
            .addFields(
                {
                    name: '📋 Available Subcommands',
                    value: [
                        '`performance system` - Show system performance stats',
                        '`performance commands [name]` - Show command performance stats',
                        '`performance alerts` - Show performance alerts',
                        '`performance logs` - Show log file statistics',
                        '`performance reset` - Reset all statistics (admin only)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Examples',
                    value: [
                        '`performance` - Show system stats (default)',
                        '`performance commands` - Show all command stats',
                        '`performance commands addxp` - Show stats for addxp command',
                        '`performance alerts` - Check for performance issues'
                    ].join('\n'),
                    inline: false
                }
            );

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};