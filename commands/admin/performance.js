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
        const config = require('../../config');
        const stats = performanceMonitor.getSystemStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Statistik Performa Sistem')
            .setColor(config.colors?.primary || '#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // System overview
        embed.addFields({
            name: '🖥️ Ringkasan Sistem',
            value: [
                `**Uptime:** ${stats.uptimeFormatted}`,
                `**Command Dieksekusi:** ${stats.commandsExecuted.toLocaleString()}`,
                `**Tingkat Error:** ${stats.errorRate.toFixed(2)}%`,
                `**Waktu Respons Rata-rata:** ${stats.averageResponseTime.toFixed(2)}ms`,
                `**Command/Menit:** ${stats.commandsPerMinute.toFixed(2)}`
            ].join('\n'),
            inline: true
        });

        // Memory usage
        embed.addFields({
            name: '💾 Penggunaan Memori',
            value: [
                `**Saat Ini:** ${stats.memoryUsageFormatted.current}`,
                `**Puncak:** ${stats.memoryUsageFormatted.peak}`,
                `**Total Heap:** ${stats.memoryUsageFormatted.total}`,
                `**Penggunaan:** ${((stats.currentMemoryUsage / (1024 * 1024 * 1024)) * 100).toFixed(1)}%`
            ].join('\n'),
            inline: true
        });

        // Top commands
        if (stats.topCommands.length > 0) {
            const topCommandsText = stats.topCommands
                .map((cmd, index) => 
                    `${index + 1}. **${cmd.name}** (${cmd.executions}x, ${cmd.averageTime.toFixed(2)}ms rata-rata)`
                )
                .join('\n');

            embed.addFields({
                name: '🏆 Command Teratas',
                value: topCommandsText,
                inline: false
            });
        }

        // Performance indicators
        const indicators = [];
        if (stats.averageResponseTime < 100) {
            indicators.push('🟢 Waktu Respons: Sangat Baik');
        } else if (stats.averageResponseTime < 500) {
            indicators.push('🟡 Waktu Respons: Baik');
        } else {
            indicators.push('🔴 Waktu Respons: Lambat');
        }

        if (stats.errorRate < 1) {
            indicators.push('🟢 Tingkat Error: Sangat Baik');
        } else if (stats.errorRate < 5) {
            indicators.push('🟡 Tingkat Error: Dapat Diterima');
        } else {
            indicators.push('🔴 Tingkat Error: Tinggi');
        }

        const memoryUsagePercent = (stats.currentMemoryUsage / (1024 * 1024 * 1024)) * 100;
        if (memoryUsagePercent < 50) {
            indicators.push('🟢 Penggunaan Memori: Baik');
        } else if (memoryUsagePercent < 80) {
            indicators.push('🟡 Penggunaan Memori: Sedang');
        } else {
            indicators.push('🔴 Penggunaan Memori: Tinggi');
        }

        embed.addFields({
            name: '📈 Indikator Performa',
            value: indicators.join('\n'),
            inline: false
        });

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show command performance statistics
     */
    async showCommandStats(message, commandName) {
        const config = require('../../config');
        const stats = performanceMonitor.getCommandStats(commandName);
        
        if (commandName && !stats) {
            return message.reply(`❌ **|** Command '${commandName}' tidak ditemukan dalam statistik.`);
        }

        const embed = new EmbedBuilder()
            .setTitle(commandName ? `📊 Statistik Command: ${commandName}` : '📊 Statistik Semua Command')
            .setColor(config.colors?.primary || '#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        if (commandName) {
            // Single command stats
            embed.addFields(
                {
                    name: '📈 Statistik Eksekusi',
                    value: [
                        `**Total Eksekusi:** ${stats.totalExecutions.toLocaleString()}`,
                        `**Berhasil:** ${stats.successfulExecutions.toLocaleString()}`,
                        `**Gagal:** ${stats.failedExecutions.toLocaleString()}`,
                        `**Tingkat Sukses:** ${stats.successRate.toFixed(2)}%`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⏱️ Metrik Performa',
                    value: [
                        `**Waktu Rata-rata:** ${stats.averageExecutionTime.toFixed(2)}ms`,
                        `**Waktu Min:** ${stats.minExecutionTime.toFixed(2)}ms`,
                        `**Waktu Maks:** ${stats.maxExecutionTime.toFixed(2)}ms`,
                        `**Memori Rata-rata:** ${this.formatBytes(stats.averageMemoryUsage)}`
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
                    name: '🕐 Eksekusi Terbaru',
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
                        `${index + 1}. **${name}** - ${cmdStats.totalExecutions}x (${cmdStats.successRate.toFixed(1)}% sukses, ${cmdStats.averageExecutionTime.toFixed(2)}ms rata-rata)`
                    )
                    .join('\n');

                embed.addFields({
                    name: '📋 Ringkasan Performa Command',
                    value: commandList,
                    inline: false
                });

                // Summary statistics
                const totalExecutions = allStats.reduce((sum, [,stats]) => sum + stats.totalExecutions, 0);
                const avgSuccessRate = allStats.reduce((sum, [,stats]) => sum + stats.successRate, 0) / allStats.length;
                const avgResponseTime = allStats.reduce((sum, [,stats]) => sum + stats.averageExecutionTime, 0) / allStats.length;

                embed.addFields({
                    name: '📊 Ringkasan',
                    value: [
                        `**Total Command Tercatat:** ${allStats.length}`,
                        `**Total Eksekusi:** ${totalExecutions.toLocaleString()}`,
                        `**Tingkat Sukses Rata-rata:** ${avgSuccessRate.toFixed(2)}%`,
                        `**Waktu Respons Rata-rata:** ${avgResponseTime.toFixed(2)}ms`
                    ].join('\n'),
                    inline: false
                });
            } else {
                embed.setDescription('Belum ada data command yang tercatat.');
            }
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show performance alerts
     */
    async showAlerts(message) {
        const config = require('../../config');
        const alerts = performanceMonitor.getPerformanceAlerts();
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Alert Performa')
            .setColor(alerts.length > 0 ? (config.colors?.warning || '#FEE75C') : (config.colors?.success || '#57F287'))
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        if (alerts.length === 0) {
            embed.setDescription('✅ Tidak ada alert performa saat ini. Semua sistem berjalan normal.');
        } else {
            const alertsByLevel = {
                critical: alerts.filter(a => a.level === 'critical'),
                warning: alerts.filter(a => a.level === 'warning'),
                info: alerts.filter(a => a.level === 'info')
            };

            if (alertsByLevel.critical.length > 0) {
                embed.addFields({
                    name: '🔴 Alert Kritis',
                    value: alertsByLevel.critical.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            if (alertsByLevel.warning.length > 0) {
                embed.addFields({
                    name: '🟡 Alert Peringatan',
                    value: alertsByLevel.warning.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            if (alertsByLevel.info.length > 0) {
                embed.addFields({
                    name: '🔵 Alert Info',
                    value: alertsByLevel.info.map(a => `• ${a.message}`).join('\n'),
                    inline: false
                });
            }

            embed.addFields({
                name: '💡 Rekomendasi',
                value: [
                    '• Pantau penggunaan memori secara berkala',
                    '• Periksa command yang lambat dan optimalkan',
                    '• Tinjau log error untuk masalah berulang',
                    '• Pertimbangkan restart jika penggunaan memori tinggi'
                ].join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show log statistics
     */
    async showLogStats(message) {
        const config = require('../../config');
        const logStats = await logger.getLogStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Statistik Log')
            .setColor(config.colors?.primary || '#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        if (Object.keys(logStats).length === 0) {
            embed.setDescription('Tidak ada file log yang ditemukan.');
        } else {
            const logFiles = Object.entries(logStats)
                .sort(([,a], [,b]) => b.size - a.size)
                .map(([filename, stats]) => 
                    `**${filename}** - ${stats.sizeFormatted} (Diubah: <t:${Math.floor(stats.modified.getTime() / 1000)}:R>)`
                )
                .join('\n');

            embed.addFields({
                name: '📁 File Log',
                value: logFiles,
                inline: false
            });

            const totalSize = Object.values(logStats).reduce((sum, stats) => sum + stats.size, 0);
            embed.addFields({
                name: '📊 Ringkasan',
                value: [
                    `**Total File:** ${Object.keys(logStats).length}`,
                    `**Total Ukuran:** ${logger.formatBytes(totalSize)}`,
                    `**Direktori Log:** ./logs/`
                ].join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Reset performance statistics
     */
    async resetStats(message) {
        const config = require('../../config');
        if (!rolePermissions.isAdmin(message.member)) {
            return message.reply('❌ **|** Hanya admin yang dapat mereset statistik.');
        }

        performanceMonitor.resetMetrics();
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 Statistik Direset')
            .setColor(config.colors?.success || '#57F287')
            .setDescription('✅ Semua statistik performa telah direset.')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Direset oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        await logger.log('INFO', 'ADMIN', `Statistik performa direset oleh ${message.author.tag}`, {
            userId: message.author.id,
            guildId: message.guild.id
        });
    },

    /**
     * Show help for performance command
     */
    async showHelp(message) {
        const config = require('../../config');
        const embed = new EmbedBuilder()
            .setTitle('📊 Bantuan Command Performance')
            .setColor(config.colors?.primary || '#5865F2')
            .setDescription('Pantau performa bot dan statistik')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '📋 Subcommand Tersedia',
                    value: [
                        '`performance system` - Tampilkan statistik performa sistem',
                        '`performance commands [nama]` - Tampilkan statistik performa command',
                        '`performance alerts` - Tampilkan alert performa',
                        '`performance logs` - Tampilkan statistik file log',
                        '`performance reset` - Reset semua statistik (admin saja)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Contoh',
                    value: [
                        '`performance` - Tampilkan statistik sistem (default)',
                        '`performance commands` - Tampilkan semua statistik command',
                        '`performance commands addxp` - Tampilkan statistik untuk command addxp',
                        '`performance alerts` - Periksa masalah performa'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

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