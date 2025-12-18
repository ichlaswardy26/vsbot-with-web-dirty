const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const analytics = require('../../util/analytics');
const logger = require('../../util/logger');

module.exports = {
    name: 'analytics',
    aliases: ['stats', 'an'],
    description: 'View comprehensive bot analytics and reports',
    usage: 'analytics <summary|commands|users|permissions|security|performance|report|realtime|trends> [options]',
    category: 'admin',
    
    async exec(client, message, args) {
        try {
            // Check admin permission
            const permissionError = rolePermissions.checkPermission(message.member, 'admin');
            if (permissionError) {
                return message.reply(permissionError);
            }

            const subcommand = args[0]?.toLowerCase();
            
            switch (subcommand) {
                case 'summary':
                    await this.handleSummary(message, args.slice(1), client);
                    break;
                case 'commands':
                    await this.handleCommands(message, args.slice(1), client);
                    break;
                case 'users':
                    await this.handleUsers(message, args.slice(1), client);
                    break;
                case 'permissions':
                    await this.handlePermissions(message, args.slice(1), client);
                    break;
                case 'security':
                    await this.handleSecurity(message, args.slice(1), client);
                    break;
                case 'performance':
                    await this.handlePerformance(message, args.slice(1), client);
                    break;
                case 'report':
                    await this.handleReport(message, args.slice(1), client);
                    break;
                case 'realtime':
                    await this.handleRealtime(message, args.slice(1), client);
                    break;
                case 'trends':
                    await this.handleTrends(message, args.slice(1), client);
                    break;
                default: {
                    const config = require('../../config');
                    const helpEmbed = new EmbedBuilder()
                        .setColor(config.colors?.primary || '#5865F2')
                        .setTitle('📊 Bantuan Analytics')
                        .setDescription('Lihat analitik dan laporan bot secara komprehensif')
                        .setThumbnail(message.guild.iconURL({ dynamic: true }))
                        .addFields(
                            { name: '📈 Ringkasan', value: '`analytics summary` - Ringkasan analitik', inline: false },
                            { name: '⌨️ Command', value: '`analytics commands [periode]` - Analitik penggunaan command', inline: false },
                            { name: '👥 Pengguna', value: '`analytics users [periode]` - Analitik aktivitas pengguna', inline: false },
                            { name: '🔒 Permission', value: '`analytics permissions` - Analitik sistem permission', inline: false },
                            { name: '🛡️ Keamanan', value: '`analytics security [periode]` - Analisis event keamanan', inline: false },
                            { name: '⚡ Performa', value: '`analytics performance [periode]` - Metrik performa', inline: false },
                            { name: '📋 Laporan', value: '`analytics report [format]` - Laporan komprehensif', inline: false },
                            { name: '📡 Realtime', value: '`analytics realtime` - Statistik langsung', inline: false },
                            { name: '📊 Tren', value: '`analytics trends [periode]` - Analisis tren penggunaan', inline: false }
                        )
                        .addFields({
                            name: '⏰ Opsi Periode',
                            value: '`1h`, `6h`, `24h`, `7d`, `30d` (default: 24h)',
                            inline: false
                        })
                        .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [helpEmbed] });
                }
            }

        } catch (error) {
            await logger.logError(error, 'executing analytics command');
            message.reply('❌ **|** Terjadi error saat menjalankan command.');
        }
    },

    async handleSummary(message) {
        const config = require('../../config');
        const summary = await analytics.getAnalyticsSummary(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📊 Ringkasan Analytics')
            .setDescription(`Ringkasan analitik untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '� Command (E24j)', value: `${summary.commands.total24h} total\n${summary.commands.unique24h} unik`, inline: true },
                { name: '👥 Pengguna Aktif (24j)', value: `${summary.users.active24h} pengguna\n${summary.users.new24h} baru`, inline: true },
                { name: '🔒 Event Keamanan (24j)', value: `${summary.security.events24h} event\n${summary.security.alerts24h} alert`, inline: true },
                { name: '⚡ Performa (24j)', value: `${summary.performance.avgResponseTime}ms rata-rata\n${summary.performance.errorRate}% error`, inline: true },
                { name: '🎯 Command Teratas', value: `${summary.commands.topCommand}\n${summary.commands.topCommandCount} penggunaan`, inline: true },
                { name: '🏆 Pengguna Teraktif', value: `<@${summary.users.mostActive}>\n${summary.users.mostActiveCount} command`, inline: true }
            )
            .addFields(
                { name: '� MKesehatan Sistem', value: this.getHealthStatus(summary.performance), inline: false },
                { name: '� Uptime', value: this.formatUptime(summary.system.uptime), inline: true },
                { name: '💾 Penggunaan Memori', value: `${summary.system.memoryUsage}MB`, inline: true },
                { name: '📡 Server', value: `${summary.system.guildCount} server`, inline: true }
            )
            .setFooter({ text: 'Gunakan subcommand spesifik untuk analitik detail', iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleCommands(message, args) {
        const config = require('../../config');
        const period = args[0] || '24h';
        const commandStats = await analytics.getCommandAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`📈 Analitik Command (${period})`)
            .setDescription(`Statistik penggunaan command untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '📊 Ringkasan', value: `**Total Command:** ${commandStats.totalCommands}\n**Command Unik:** ${commandStats.uniqueCommands}\n**Tingkat Sukses:** ${commandStats.successRate}%`, inline: false }
            )
            .setTimestamp();

        // Top commands
        if (commandStats.topCommands.length > 0) {
            const topCommandsText = commandStats.topCommands
                .slice(0, 10)
                .map((cmd, index) => `${index + 1}. \`${cmd.name}\` - ${cmd.count} penggunaan (${cmd.percentage}%)`)
                .join('\n');
            embed.addFields({ name: '🏆 Command Teratas', value: topCommandsText, inline: false });
        }

        // Commands by category
        if (commandStats.byCategory && Object.keys(commandStats.byCategory).length > 0) {
            const categoryText = Object.entries(commandStats.byCategory)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([category, count]) => `**${category}:** ${count}`)
                .join('\n');
            embed.addFields({ name: '📁 Per Kategori', value: categoryText, inline: true });
        }

        // Commands by hour (for 24h period)
        if (period === '24h' && commandStats.byHour) {
            const hourlyData = Object.entries(commandStats.byHour)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .slice(0, 12)
                .map(([hour, count]) => `${hour}:00 - ${count}`)
                .join('\n');
            embed.addFields({ name: '⏰ Distribusi Per Jam', value: hourlyData || 'Tidak ada data', inline: true });
        }

        // Error analysis
        if (commandStats.errors && commandStats.errors.length > 0) {
            const errorText = commandStats.errors
                .slice(0, 5)
                .map(error => `**${error.command}:** ${error.count} error`)
                .join('\n');
            embed.addFields({ name: '❌ Error Terbanyak', value: errorText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handleUsers(message, args) {
        const config = require('../../config');
        const period = args[0] || '24h';
        const userStats = await analytics.getUserAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`👥 Analitik Pengguna (${period})`)
            .setDescription(`Statistik aktivitas pengguna untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '📊 Ringkasan', value: `**Pengguna Aktif:** ${userStats.activeUsers}\n**Pengguna Baru:** ${userStats.newUsers}\n**Pengguna Kembali:** ${userStats.returningUsers}`, inline: false }
            )
            .setTimestamp();

        // Most active users
        if (userStats.mostActive.length > 0) {
            const activeUsersText = userStats.mostActive
                .slice(0, 10)
                .map((user, index) => `${index + 1}. <@${user.userId}> - ${user.commandCount} command`)
                .join('\n');
            embed.addFields({ name: '🏆 Pengguna Teraktif', value: activeUsersText, inline: false });
        }

        // User engagement
        if (userStats.engagement) {
            embed.addFields({
                name: '📈 Metrik Engagement',
                value: `**Rata-rata Command/Pengguna:** ${userStats.engagement.avgCommandsPerUser}\n**Tingkat Aktif Harian:** ${userStats.engagement.dailyActiveRate}%\n**Tingkat Retensi:** ${userStats.engagement.retentionRate}%`,
                inline: true
            });
        }

        // Activity by time
        if (userStats.activityByHour) {
            const peakHours = Object.entries(userStats.activityByHour)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([hour, count]) => `${hour}:00 (${count} pengguna)`)
                .join('\n');
            embed.addFields({ name: '⏰ Jam Puncak', value: peakHours || 'Tidak ada data', inline: true });
        }

        // User behavior patterns
        if (userStats.patterns) {
            const patternsText = [
                `**Power Users:** ${userStats.patterns.powerUsers} (>50 command)`,
                `**Pengguna Reguler:** ${userStats.patterns.regularUsers} (10-50 command)`,
                `**Pengguna Kasual:** ${userStats.patterns.casualUsers} (<10 command)`
            ].join('\n');
            embed.addFields({ name: '🎯 Pola Pengguna', value: patternsText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handlePermissions(message) {
        const config = require('../../config');
        const permStats = await analytics.getPermissionAnalytics(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('🔒 Analitik Sistem Permission')
            .setDescription(`Statistik penggunaan permission dan keamanan untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Permission system overview
        embed.addFields({
            name: '📊 Ringkasan Sistem',
            value: `**Total Pengecekan Permission:** ${permStats.totalChecks}\n**Tingkat Sukses:** ${permStats.successRate}%\n**Percobaan Ditolak:** ${permStats.deniedAttempts}`,
            inline: false
        });

        // Temporary permissions
        if (permStats.temporaryPermissions) {
            embed.addFields({
                name: '⏰ Permission Sementara',
                value: `**Grant Aktif:** ${permStats.temporaryPermissions.activeGrants}\n**Total Diberikan:** ${permStats.temporaryPermissions.totalGrants}\n**Paling Sering:** ${permStats.temporaryPermissions.mostUsedPermission || 'Tidak ada'}`,
                inline: true
            });
        }

        // Permission inheritance
        if (permStats.permissionInheritance) {
            embed.addFields({
                name: '🔗 Inheritance Permission',
                value: `**Total Grup:** ${permStats.permissionInheritance.totalGroups}\n**Pengguna dengan Grup:** ${permStats.permissionInheritance.usersWithGroups}\n**Grup Tersering:** ${permStats.permissionInheritance.mostUsedGroup || 'Tidak ada'}`,
                inline: true
            });
        }

        // Context permissions
        if (permStats.contextPermissions) {
            embed.addFields({
                name: '📍 Context Permission',
                value: `**Total Context:** ${permStats.contextPermissions.totalContexts}\n**Override Pengguna:** ${permStats.contextPermissions.totalUserOverrides}\n**Permission Role:** ${permStats.contextPermissions.totalRolePermissions}`,
                inline: true
            });
        }

        // Permission usage by type
        if (permStats.usageByType) {
            const usageText = Object.entries(permStats.usageByType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([type, count]) => `**${type}:** ${count}`)
                .join('\n');
            embed.addFields({ name: '📈 Penggunaan per Tipe Permission', value: usageText, inline: false });
        }

        // Recent permission events
        if (permStats.recentEvents && permStats.recentEvents.length > 0) {
            const eventsText = permStats.recentEvents
                .slice(0, 5)
                .map(event => `**${event.type}** - <@${event.userId}> - <t:${Math.floor(event.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Event Terbaru', value: eventsText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handleSecurity(message, args) {
        const config = require('../../config');
        const period = args[0] || '24h';
        const securityStats = await analytics.getSecurityAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`🔒 Analitik Keamanan (${period})`)
            .setDescription(`Event keamanan dan analisis ancaman untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Security overview
        embed.addFields({
            name: '🚨 Ringkasan Keamanan',
            value: `**Total Event:** ${securityStats.totalEvents}\n**Prioritas Tinggi:** ${securityStats.highPriorityEvents}\n**Skor Keamanan:** ${securityStats.securityScore}/100`,
            inline: false
        });

        // Permission denials
        if (securityStats.permissionDenials) {
            embed.addFields({
                name: '❌ Penolakan Permission',
                value: `**Total Penolakan:** ${securityStats.permissionDenials.total}\n**Pengguna Unik:** ${securityStats.permissionDenials.uniqueUsers}\n**Paling Sering Ditolak:** ${securityStats.permissionDenials.mostDenied || 'Tidak ada'}`,
                inline: true
            });
        }

        // Suspicious activities
        if (securityStats.suspiciousActivities && securityStats.suspiciousActivities.length > 0) {
            const suspiciousText = securityStats.suspiciousActivities
                .slice(0, 5)
                .map(activity => `**${activity.type}** - <@${activity.userId}> (${activity.count} kali)`)
                .join('\n');
            embed.addFields({ name: '⚠️ Aktivitas Mencurigakan', value: suspiciousText, inline: true });
        }

        // Rate limit violations
        if (securityStats.rateLimitViolations) {
            embed.addFields({
                name: '🚫 Pelanggaran Rate Limit',
                value: `**Total Pelanggaran:** ${securityStats.rateLimitViolations.total}\n**Pengguna Unik:** ${securityStats.rateLimitViolations.uniqueUsers}\n**Pelanggar Terbanyak:** <@${securityStats.rateLimitViolations.topViolator || 'Tidak ada'}>`,
                inline: true
            });
        }

        // Security recommendations
        if (securityStats.recommendations && securityStats.recommendations.length > 0) {
            const recommendationsText = securityStats.recommendations
                .slice(0, 3)
                .map((rec, index) => `${index + 1}. ${rec}`)
                .join('\n');
            embed.addFields({ name: '💡 Rekomendasi Keamanan', value: recommendationsText, inline: false });
        }

        // Recent security events
        if (securityStats.recentEvents && securityStats.recentEvents.length > 0) {
            const eventsText = securityStats.recentEvents
                .slice(0, 5)
                .map(event => `**${event.type}** - <@${event.userId}> - <t:${Math.floor(event.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Event Keamanan Terbaru', value: eventsText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handlePerformance(message, args) {
        const config = require('../../config');
        const period = args[0] || '24h';
        const perfStats = await analytics.getPerformanceAnalytics(period);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.info || '#5865F2')
            .setTitle(`⚡ Analitik Performa (${period})`)
            .setDescription('Metrik performa bot dan kesehatan sistem')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Performance overview
        embed.addFields({
            name: '📊 Ringkasan Performa',
            value: `**Waktu Respons Rata-rata:** ${perfStats.avgResponseTime}ms\n**Tingkat Sukses:** ${perfStats.successRate}%\n**Tingkat Error:** ${perfStats.errorRate}%`,
            inline: false
        });

        // System metrics
        if (perfStats.systemMetrics) {
            embed.addFields({
                name: '💻 Metrik Sistem',
                value: `**Penggunaan Memori:** ${perfStats.systemMetrics.memoryUsage}MB\n**Penggunaan CPU:** ${perfStats.systemMetrics.cpuUsage}%\n**Uptime:** ${this.formatUptime(perfStats.systemMetrics.uptime)}`,
                inline: true
            });
        }

        // Command performance
        if (perfStats.commandPerformance && perfStats.commandPerformance.length > 0) {
            const slowestCommands = perfStats.commandPerformance
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** ${cmd.avgTime}ms (${cmd.executions} eksekusi)`)
                .join('\n');
            embed.addFields({ name: '🐌 Command Terlambat', value: slowestCommands, inline: true });
        }

        // Database performance
        if (perfStats.databaseMetrics) {
            embed.addFields({
                name: '🗄️ Performa Database',
                value: `**Waktu Query Rata-rata:** ${perfStats.databaseMetrics.avgQueryTime}ms\n**Total Query:** ${perfStats.databaseMetrics.totalQueries}\n**Query Lambat:** ${perfStats.databaseMetrics.slowQueries}`,
                inline: true
            });
        }

        // Performance trends
        if (perfStats.trends) {
            const trendsText = [
                `**Tren Waktu Respons:** ${perfStats.trends.responseTime > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.responseTime)}%`,
                `**Tren Tingkat Error:** ${perfStats.trends.errorRate > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.errorRate)}%`,
                `**Tren Penggunaan Memori:** ${perfStats.trends.memoryUsage > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.memoryUsage)}%`
            ].join('\n');
            embed.addFields({ name: '📈 Tren Performa', value: trendsText, inline: false });
        }

        // Performance alerts
        if (perfStats.alerts && perfStats.alerts.length > 0) {
            const alertsText = perfStats.alerts
                .slice(0, 3)
                .map(alert => `⚠️ **${alert.type}:** ${alert.message}`)
                .join('\n');
            embed.addFields({ name: '🚨 Alert Performa', value: alertsText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handleReport(message, args) {
        const config = require('../../config');
        const format = args[0] || 'embed';
        const report = await analytics.generateComprehensiveReport(message.guild.id);

        if (format.toLowerCase() === 'json') {
            // Generate JSON report as attachment
            const reportJson = JSON.stringify(report, null, 2);
            const attachment = new AttachmentBuilder(Buffer.from(reportJson), { 
                name: `laporan-analytics-${message.guild.id}-${Date.now()}.json` 
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors?.primary || '#5865F2')
                .setTitle('📊 Laporan Analytics Komprehensif')
                .setDescription('Laporan analytics lengkap diekspor sebagai file JSON')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Laporan Dibuat', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Periode Data', value: '30 hari terakhir', inline: true },
                    { name: 'Format File', value: 'JSON', inline: true }
                )
                .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            return message.reply({ embeds: [embed], files: [attachment] });
        }

        // Generate embed report
        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📊 Laporan Analytics Komprehensif')
            .setDescription(`Ringkasan analytics lengkap untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Executive summary
        embed.addFields({
            name: '📋 Ringkasan Eksekutif',
            value: `**Total Command:** ${report.summary.totalCommands}\n**Pengguna Aktif:** ${report.summary.activeUsers}\n**Kesehatan Sistem:** ${this.getHealthStatus(report.performance)}\n**Skor Keamanan:** ${report.security.securityScore}/100`,
            inline: false
        });

        // Key metrics
        embed.addFields(
            { name: '📈 Command (30h)', value: `${report.commands.total30d}\n${report.commands.growth30d > 0 ? '📈' : '📉'} ${Math.abs(report.commands.growth30d)}%`, inline: true },
            { name: '👥 Pengguna (30h)', value: `${report.users.active30d}\n${report.users.growth30d > 0 ? '📈' : '📉'} ${Math.abs(report.users.growth30d)}%`, inline: true },
            { name: '⚡ Performa', value: `${report.performance.avgResponseTime}ms\n${report.performance.successRate}%`, inline: true }
        );

        // Top insights
        if (report.insights && report.insights.length > 0) {
            const insightsText = report.insights
                .slice(0, 5)
                .map((insight, index) => `${index + 1}. ${insight}`)
                .join('\n');
            embed.addFields({ name: '💡 Insight Utama', value: insightsText, inline: false });
        }

        // Recommendations
        if (report.recommendations && report.recommendations.length > 0) {
            const recommendationsText = report.recommendations
                .slice(0, 3)
                .map((rec, index) => `${index + 1}. ${rec}`)
                .join('\n');
            embed.addFields({ name: '🎯 Rekomendasi', value: recommendationsText, inline: false });
        }

        embed.setFooter({ text: 'Gunakan "analytics report json" untuk ekspor JSON detail', iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    },

    async handleRealtime(message) {
        const config = require('../../config');
        const realtimeStats = await analytics.getRealtimeStatistics();

        const embed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle('📡 Statistik Real-time')
            .setDescription('Statistik bot langsung dan aktivitas saat ini')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Current activity
        embed.addFields({
            name: '🔴 Aktivitas Saat Ini',
            value: `**Command/menit:** ${realtimeStats.commandsPerMinute}\n**Pengguna Aktif:** ${realtimeStats.activeUsers}\n**Penggunaan Memori:** ${realtimeStats.memoryUsage}MB`,
            inline: false
        });

        // System status
        embed.addFields(
            { name: '💻 Status Sistem', value: `**CPU:** ${realtimeStats.cpuUsage}%\n**Memori:** ${realtimeStats.memoryPercentage}%\n**Uptime:** ${this.formatUptime(realtimeStats.uptime)}`, inline: true },
            { name: '🌐 Jaringan', value: `**Server:** ${realtimeStats.guildCount}\n**Pengguna:** ${realtimeStats.userCount}\n**Channel:** ${realtimeStats.channelCount}`, inline: true },
            { name: '📊 Performa', value: `**Respons Rata-rata:** ${realtimeStats.avgResponseTime}ms\n**Tingkat Sukses:** ${realtimeStats.successRate}%\n**Error/menit:** ${realtimeStats.errorsPerMinute}`, inline: true }
        );

        // Recent activity
        if (realtimeStats.recentCommands && realtimeStats.recentCommands.length > 0) {
            const recentText = realtimeStats.recentCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}** - <@${cmd.userId}> - <t:${Math.floor(cmd.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Command Terbaru', value: recentText, inline: false });
        }

        // Active processes
        if (realtimeStats.activeProcesses && realtimeStats.activeProcesses.length > 0) {
            const processesText = realtimeStats.activeProcesses
                .slice(0, 5)
                .map(process => `**${process.name}** - ${process.status} (${process.duration}ms)`)
                .join('\n');
            embed.addFields({ name: '⚙️ Proses Aktif', value: processesText, inline: false });
        }

        embed.setFooter({ text: 'Statistik diperbarui setiap 30 detik', iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    },

    async handleTrends(message, args) {
        const config = require('../../config');
        const period = args[0] || '7d';
        const trends = await analytics.getTrendAnalysis(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.info || '#5865F2')
            .setTitle(`📈 Analisis Tren (${period})`)
            .setDescription(`Tren penggunaan dan pola untuk ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        // Overall trends
        embed.addFields({
            name: '📊 Tren Keseluruhan',
            value: `**Penggunaan Command:** ${trends.commandUsage > 0 ? '📈' : '📉'} ${Math.abs(trends.commandUsage)}%\n**Aktivitas Pengguna:** ${trends.userActivity > 0 ? '📈' : '📉'} ${Math.abs(trends.userActivity)}%\n**Tingkat Error:** ${trends.errorRate > 0 ? '📈' : '📉'} ${Math.abs(trends.errorRate)}%`,
            inline: false
        });

        // Command trends
        if (trends.topGrowingCommands && trends.topGrowingCommands.length > 0) {
            const growingText = trends.topGrowingCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** +${cmd.growth}% (${cmd.currentUsage} penggunaan)`)
                .join('\n');
            embed.addFields({ name: '📈 Command Meningkat', value: growingText, inline: true });
        }

        if (trends.decliningCommands && trends.decliningCommands.length > 0) {
            const decliningText = trends.decliningCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** ${cmd.decline}% (${cmd.currentUsage} penggunaan)`)
                .join('\n');
            embed.addFields({ name: '📉 Command Menurun', value: decliningText, inline: true });
        }

        // User engagement trends
        if (trends.userEngagement) {
            embed.addFields({
                name: '👥 Engagement Pengguna',
                value: `**Pengguna Baru:** ${trends.userEngagement.newUsers > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.newUsers)}%\n**Tingkat Retensi:** ${trends.userEngagement.retention > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.retention)}%\n**Sesi Rata-rata:** ${trends.userEngagement.avgSession > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.avgSession)}%`,
                inline: false
            });
        }

        // Peak usage patterns
        if (trends.peakPatterns) {
            const patternsText = [
                `**Hari Puncak:** ${trends.peakPatterns.peakDay}`,
                `**Jam Puncak:** ${trends.peakPatterns.peakHour}:00`,
                `**Periode Tersibuk:** ${trends.peakPatterns.busiestPeriod}`
            ].join('\n');
            embed.addFields({ name: '⏰ Pola Puncak', value: patternsText, inline: true });
        }

        // Seasonal trends (for longer periods)
        if (period === '30d' && trends.seasonalTrends) {
            const seasonalText = [
                `**Hari Kerja vs Akhir Pekan:** ${trends.seasonalTrends.weekdayWeekend}`,
                `**Pagi vs Malam:** ${trends.seasonalTrends.morningEvening}`,
                `**Trajektori Pertumbuhan:** ${trends.seasonalTrends.trajectory}`
            ].join('\n');
            embed.addFields({ name: '📅 Tren Musiman', value: seasonalText, inline: true });
        }

        // Predictions
        if (trends.predictions) {
            const predictionsText = [
                `**Penggunaan Minggu Depan:** ${trends.predictions.nextWeekUsage > 0 ? '📈' : '📉'} ${Math.abs(trends.predictions.nextWeekUsage)}%`,
                `**Puncak Diharapkan:** ${trends.predictions.expectedPeak}`,
                `**Perkiraan Pertumbuhan:** ${trends.predictions.growthForecast}`
            ].join('\n');
            embed.addFields({ name: '🔮 Prediksi', value: predictionsText, inline: false });
        }

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    // Helper methods
    getHealthStatus(performance) {
        if (performance.avgResponseTime < 100 && performance.errorRate < 1) {
            return '🟢 Sangat Baik';
        } else if (performance.avgResponseTime < 200 && performance.errorRate < 3) {
            return '🟡 Baik';
        } else if (performance.avgResponseTime < 500 && performance.errorRate < 5) {
            return '🟠 Cukup';
        } else {
            return '🔴 Buruk';
        }
    },

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m ${seconds % 60}s`;
        }
    }
};