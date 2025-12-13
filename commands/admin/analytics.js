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
    
    async execute(message, args, client) {
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
                    const helpEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📊 Analytics Help')
                        .setDescription('View comprehensive bot analytics and reports')
                        .addFields(
                            { name: 'Summary', value: '`analytics summary` - Analytics overview', inline: false },
                            { name: 'Commands', value: '`analytics commands [period]` - Command usage analytics', inline: false },
                            { name: 'Users', value: '`analytics users [period]` - User activity analytics', inline: false },
                            { name: 'Permissions', value: '`analytics permissions` - Permission system analytics', inline: false },
                            { name: 'Security', value: '`analytics security [period]` - Security events analysis', inline: false },
                            { name: 'Performance', value: '`analytics performance [period]` - Performance metrics', inline: false },
                            { name: 'Report', value: '`analytics report [format]` - Comprehensive reports', inline: false },
                            { name: 'Realtime', value: '`analytics realtime` - Live statistics', inline: false },
                            { name: 'Trends', value: '`analytics trends [period]` - Usage trends analysis', inline: false }
                        )
                        .addFields({
                            name: 'Period Options',
                            value: '`1h`, `6h`, `24h`, `7d`, `30d` (default: 24h)',
                            inline: false
                        })
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
        const summary = await analytics.getAnalyticsSummary(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Analytics Summary')
            .setDescription(`Analytics overview for ${message.guild.name}`)
            .addFields(
                { name: '📈 Commands (24h)', value: `${summary.commands.total24h} total\n${summary.commands.unique24h} unique`, inline: true },
                { name: '👥 Active Users (24h)', value: `${summary.users.active24h} users\n${summary.users.new24h} new`, inline: true },
                { name: '🔒 Security Events (24h)', value: `${summary.security.events24h} events\n${summary.security.alerts24h} alerts`, inline: true },
                { name: '⚡ Performance (24h)', value: `${summary.performance.avgResponseTime}ms avg\n${summary.performance.errorRate}% errors`, inline: true },
                { name: '🎯 Top Command', value: `${summary.commands.topCommand}\n${summary.commands.topCommandCount} uses`, inline: true },
                { name: '🏆 Most Active User', value: `<@${summary.users.mostActive}>\n${summary.users.mostActiveCount} commands`, inline: true }
            )
            .addFields(
                { name: '📊 System Health', value: this.getHealthStatus(summary.performance), inline: false },
                { name: '🔄 Uptime', value: this.formatUptime(summary.system.uptime), inline: true },
                { name: '💾 Memory Usage', value: `${summary.system.memoryUsage}MB`, inline: true },
                { name: '📡 Guilds', value: `${summary.system.guildCount} servers`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Use specific subcommands for detailed analytics' });

        message.reply({ embeds: [embed] });
    },

    async handleCommands(message, args) {
        const period = args[0] || '24h';
        const commandStats = await analytics.getCommandAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📈 Command Analytics (${period})`)
            .setDescription(`Command usage statistics for ${message.guild.name}`)
            .addFields(
                { name: '📊 Overview', value: `**Total Commands:** ${commandStats.totalCommands}\n**Unique Commands:** ${commandStats.uniqueCommands}\n**Success Rate:** ${commandStats.successRate}%`, inline: false }
            )
            .setTimestamp();

        // Top commands
        if (commandStats.topCommands.length > 0) {
            const topCommandsText = commandStats.topCommands
                .slice(0, 10)
                .map((cmd, index) => `${index + 1}. \`${cmd.name}\` - ${cmd.count} uses (${cmd.percentage}%)`)
                .join('\n');
            embed.addFields({ name: '🏆 Top Commands', value: topCommandsText, inline: false });
        }

        // Commands by category
        if (commandStats.byCategory && Object.keys(commandStats.byCategory).length > 0) {
            const categoryText = Object.entries(commandStats.byCategory)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([category, count]) => `**${category}:** ${count}`)
                .join('\n');
            embed.addFields({ name: '📁 By Category', value: categoryText, inline: true });
        }

        // Commands by hour (for 24h period)
        if (period === '24h' && commandStats.byHour) {
            const hourlyData = Object.entries(commandStats.byHour)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .slice(0, 12)
                .map(([hour, count]) => `${hour}:00 - ${count}`)
                .join('\n');
            embed.addFields({ name: '⏰ Hourly Distribution', value: hourlyData || 'No data', inline: true });
        }

        // Error analysis
        if (commandStats.errors && commandStats.errors.length > 0) {
            const errorText = commandStats.errors
                .slice(0, 5)
                .map(error => `**${error.command}:** ${error.count} errors`)
                .join('\n');
            embed.addFields({ name: '❌ Most Errors', value: errorText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handleUsers(message, args) {
        const period = args[0] || '24h';
        const userStats = await analytics.getUserAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`👥 User Analytics (${period})`)
            .setDescription(`User activity statistics for ${message.guild.name}`)
            .addFields(
                { name: '📊 Overview', value: `**Active Users:** ${userStats.activeUsers}\n**New Users:** ${userStats.newUsers}\n**Returning Users:** ${userStats.returningUsers}`, inline: false }
            )
            .setTimestamp();

        // Most active users
        if (userStats.mostActive.length > 0) {
            const activeUsersText = userStats.mostActive
                .slice(0, 10)
                .map((user, index) => `${index + 1}. <@${user.userId}> - ${user.commandCount} commands`)
                .join('\n');
            embed.addFields({ name: '🏆 Most Active Users', value: activeUsersText, inline: false });
        }

        // User engagement
        if (userStats.engagement) {
            embed.addFields({
                name: '📈 Engagement Metrics',
                value: `**Avg Commands/User:** ${userStats.engagement.avgCommandsPerUser}\n**Daily Active Rate:** ${userStats.engagement.dailyActiveRate}%\n**Retention Rate:** ${userStats.engagement.retentionRate}%`,
                inline: true
            });
        }

        // Activity by time
        if (userStats.activityByHour) {
            const peakHours = Object.entries(userStats.activityByHour)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([hour, count]) => `${hour}:00 (${count} users)`)
                .join('\n');
            embed.addFields({ name: '⏰ Peak Hours', value: peakHours || 'No data', inline: true });
        }

        // User behavior patterns
        if (userStats.patterns) {
            const patternsText = [
                `**Power Users:** ${userStats.patterns.powerUsers} (>50 commands)`,
                `**Regular Users:** ${userStats.patterns.regularUsers} (10-50 commands)`,
                `**Casual Users:** ${userStats.patterns.casualUsers} (<10 commands)`
            ].join('\n');
            embed.addFields({ name: '🎯 User Patterns', value: patternsText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handlePermissions(message) {
        const permStats = await analytics.getPermissionAnalytics(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔒 Permission System Analytics')
            .setDescription(`Permission usage and security statistics for ${message.guild.name}`)
            .setTimestamp();

        // Permission system overview
        embed.addFields({
            name: '📊 System Overview',
            value: `**Total Permission Checks:** ${permStats.totalChecks}\n**Success Rate:** ${permStats.successRate}%\n**Denied Attempts:** ${permStats.deniedAttempts}`,
            inline: false
        });

        // Temporary permissions
        if (permStats.temporaryPermissions) {
            embed.addFields({
                name: '⏰ Temporary Permissions',
                value: `**Active Grants:** ${permStats.temporaryPermissions.activeGrants}\n**Total Granted:** ${permStats.temporaryPermissions.totalGrants}\n**Most Used:** ${permStats.temporaryPermissions.mostUsedPermission || 'None'}`,
                inline: true
            });
        }

        // Permission inheritance
        if (permStats.permissionInheritance) {
            embed.addFields({
                name: '🔗 Permission Inheritance',
                value: `**Total Groups:** ${permStats.permissionInheritance.totalGroups}\n**Users with Groups:** ${permStats.permissionInheritance.usersWithGroups}\n**Most Used Group:** ${permStats.permissionInheritance.mostUsedGroup || 'None'}`,
                inline: true
            });
        }

        // Context permissions
        if (permStats.contextPermissions) {
            embed.addFields({
                name: '📍 Context Permissions',
                value: `**Total Contexts:** ${permStats.contextPermissions.totalContexts}\n**User Overrides:** ${permStats.contextPermissions.totalUserOverrides}\n**Role Permissions:** ${permStats.contextPermissions.totalRolePermissions}`,
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
            embed.addFields({ name: '📈 Usage by Permission Type', value: usageText, inline: false });
        }

        // Recent permission events
        if (permStats.recentEvents && permStats.recentEvents.length > 0) {
            const eventsText = permStats.recentEvents
                .slice(0, 5)
                .map(event => `**${event.type}** - <@${event.userId}> - <t:${Math.floor(event.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Recent Events', value: eventsText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handleSecurity(message, args) {
        const period = args[0] || '24h';
        const securityStats = await analytics.getSecurityAnalytics(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle(`🔒 Security Analytics (${period})`)
            .setDescription(`Security events and threat analysis for ${message.guild.name}`)
            .setTimestamp();

        // Security overview
        embed.addFields({
            name: '🚨 Security Overview',
            value: `**Total Events:** ${securityStats.totalEvents}\n**High Priority:** ${securityStats.highPriorityEvents}\n**Security Score:** ${securityStats.securityScore}/100`,
            inline: false
        });

        // Permission denials
        if (securityStats.permissionDenials) {
            embed.addFields({
                name: '❌ Permission Denials',
                value: `**Total Denials:** ${securityStats.permissionDenials.total}\n**Unique Users:** ${securityStats.permissionDenials.uniqueUsers}\n**Most Denied:** ${securityStats.permissionDenials.mostDenied || 'None'}`,
                inline: true
            });
        }

        // Suspicious activities
        if (securityStats.suspiciousActivities && securityStats.suspiciousActivities.length > 0) {
            const suspiciousText = securityStats.suspiciousActivities
                .slice(0, 5)
                .map(activity => `**${activity.type}** - <@${activity.userId}> (${activity.count} times)`)
                .join('\n');
            embed.addFields({ name: '⚠️ Suspicious Activities', value: suspiciousText, inline: true });
        }

        // Rate limit violations
        if (securityStats.rateLimitViolations) {
            embed.addFields({
                name: '🚫 Rate Limit Violations',
                value: `**Total Violations:** ${securityStats.rateLimitViolations.total}\n**Unique Users:** ${securityStats.rateLimitViolations.uniqueUsers}\n**Most Violations:** <@${securityStats.rateLimitViolations.topViolator || 'None'}>`,
                inline: true
            });
        }

        // Security recommendations
        if (securityStats.recommendations && securityStats.recommendations.length > 0) {
            const recommendationsText = securityStats.recommendations
                .slice(0, 3)
                .map((rec, index) => `${index + 1}. ${rec}`)
                .join('\n');
            embed.addFields({ name: '💡 Security Recommendations', value: recommendationsText, inline: false });
        }

        // Recent security events
        if (securityStats.recentEvents && securityStats.recentEvents.length > 0) {
            const eventsText = securityStats.recentEvents
                .slice(0, 5)
                .map(event => `**${event.type}** - <@${event.userId}> - <t:${Math.floor(event.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Recent Security Events', value: eventsText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handlePerformance(message, args) {
        const period = args[0] || '24h';
        const perfStats = await analytics.getPerformanceAnalytics(period);

        const embed = new EmbedBuilder()
            .setColor('#4ecdc4')
            .setTitle(`⚡ Performance Analytics (${period})`)
            .setDescription('Bot performance metrics and system health')
            .setTimestamp();

        // Performance overview
        embed.addFields({
            name: '📊 Performance Overview',
            value: `**Avg Response Time:** ${perfStats.avgResponseTime}ms\n**Success Rate:** ${perfStats.successRate}%\n**Error Rate:** ${perfStats.errorRate}%`,
            inline: false
        });

        // System metrics
        if (perfStats.systemMetrics) {
            embed.addFields({
                name: '💻 System Metrics',
                value: `**Memory Usage:** ${perfStats.systemMetrics.memoryUsage}MB\n**CPU Usage:** ${perfStats.systemMetrics.cpuUsage}%\n**Uptime:** ${this.formatUptime(perfStats.systemMetrics.uptime)}`,
                inline: true
            });
        }

        // Command performance
        if (perfStats.commandPerformance && perfStats.commandPerformance.length > 0) {
            const slowestCommands = perfStats.commandPerformance
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** ${cmd.avgTime}ms (${cmd.executions} runs)`)
                .join('\n');
            embed.addFields({ name: '🐌 Slowest Commands', value: slowestCommands, inline: true });
        }

        // Database performance
        if (perfStats.databaseMetrics) {
            embed.addFields({
                name: '🗄️ Database Performance',
                value: `**Avg Query Time:** ${perfStats.databaseMetrics.avgQueryTime}ms\n**Total Queries:** ${perfStats.databaseMetrics.totalQueries}\n**Slow Queries:** ${perfStats.databaseMetrics.slowQueries}`,
                inline: true
            });
        }

        // Performance trends
        if (perfStats.trends) {
            const trendsText = [
                `**Response Time Trend:** ${perfStats.trends.responseTime > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.responseTime)}%`,
                `**Error Rate Trend:** ${perfStats.trends.errorRate > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.errorRate)}%`,
                `**Memory Usage Trend:** ${perfStats.trends.memoryUsage > 0 ? '📈' : '📉'} ${Math.abs(perfStats.trends.memoryUsage)}%`
            ].join('\n');
            embed.addFields({ name: '📈 Performance Trends', value: trendsText, inline: false });
        }

        // Performance alerts
        if (perfStats.alerts && perfStats.alerts.length > 0) {
            const alertsText = perfStats.alerts
                .slice(0, 3)
                .map(alert => `⚠️ **${alert.type}:** ${alert.message}`)
                .join('\n');
            embed.addFields({ name: '🚨 Performance Alerts', value: alertsText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handleReport(message, args) {
        const format = args[0] || 'embed';
        const report = await analytics.generateComprehensiveReport(message.guild.id);

        if (format.toLowerCase() === 'json') {
            // Generate JSON report as attachment
            const reportJson = JSON.stringify(report, null, 2);
            const attachment = new AttachmentBuilder(Buffer.from(reportJson), { 
                name: `analytics-report-${message.guild.id}-${Date.now()}.json` 
            });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Comprehensive Analytics Report')
                .setDescription('Complete analytics report exported as JSON file')
                .addFields(
                    { name: 'Report Generated', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Data Period', value: 'Last 30 days', inline: true },
                    { name: 'File Format', value: 'JSON', inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed], files: [attachment] });
        }

        // Generate embed report
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Comprehensive Analytics Report')
            .setDescription(`Complete analytics overview for ${message.guild.name}`)
            .setTimestamp();

        // Executive summary
        embed.addFields({
            name: '📋 Executive Summary',
            value: `**Total Commands:** ${report.summary.totalCommands}\n**Active Users:** ${report.summary.activeUsers}\n**System Health:** ${this.getHealthStatus(report.performance)}\n**Security Score:** ${report.security.securityScore}/100`,
            inline: false
        });

        // Key metrics
        embed.addFields(
            { name: '📈 Commands (30d)', value: `${report.commands.total30d}\n${report.commands.growth30d > 0 ? '📈' : '📉'} ${Math.abs(report.commands.growth30d)}%`, inline: true },
            { name: '👥 Users (30d)', value: `${report.users.active30d}\n${report.users.growth30d > 0 ? '📈' : '📉'} ${Math.abs(report.users.growth30d)}%`, inline: true },
            { name: '⚡ Performance', value: `${report.performance.avgResponseTime}ms\n${report.performance.successRate}%`, inline: true }
        );

        // Top insights
        if (report.insights && report.insights.length > 0) {
            const insightsText = report.insights
                .slice(0, 5)
                .map((insight, index) => `${index + 1}. ${insight}`)
                .join('\n');
            embed.addFields({ name: '💡 Key Insights', value: insightsText, inline: false });
        }

        // Recommendations
        if (report.recommendations && report.recommendations.length > 0) {
            const recommendationsText = report.recommendations
                .slice(0, 3)
                .map((rec, index) => `${index + 1}. ${rec}`)
                .join('\n');
            embed.addFields({ name: '🎯 Recommendations', value: recommendationsText, inline: false });
        }

        embed.setFooter({ text: 'Use "analytics report json" for detailed JSON export' });

        message.reply({ embeds: [embed] });
    },

    async handleRealtime(message) {
        const realtimeStats = await analytics.getRealtimeStatistics();

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('📡 Real-time Statistics')
            .setDescription('Live bot statistics and current activity')
            .setTimestamp();

        // Current activity
        embed.addFields({
            name: '🔴 Current Activity',
            value: `**Commands/min:** ${realtimeStats.commandsPerMinute}\n**Active Users:** ${realtimeStats.activeUsers}\n**Memory Usage:** ${realtimeStats.memoryUsage}MB`,
            inline: false
        });

        // System status
        embed.addFields(
            { name: '💻 System Status', value: `**CPU:** ${realtimeStats.cpuUsage}%\n**Memory:** ${realtimeStats.memoryPercentage}%\n**Uptime:** ${this.formatUptime(realtimeStats.uptime)}`, inline: true },
            { name: '🌐 Network', value: `**Guilds:** ${realtimeStats.guildCount}\n**Users:** ${realtimeStats.userCount}\n**Channels:** ${realtimeStats.channelCount}`, inline: true },
            { name: '📊 Performance', value: `**Avg Response:** ${realtimeStats.avgResponseTime}ms\n**Success Rate:** ${realtimeStats.successRate}%\n**Errors/min:** ${realtimeStats.errorsPerMinute}`, inline: true }
        );

        // Recent activity
        if (realtimeStats.recentCommands && realtimeStats.recentCommands.length > 0) {
            const recentText = realtimeStats.recentCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}** - <@${cmd.userId}> - <t:${Math.floor(cmd.timestamp / 1000)}:R>`)
                .join('\n');
            embed.addFields({ name: '🕒 Recent Commands', value: recentText, inline: false });
        }

        // Active processes
        if (realtimeStats.activeProcesses && realtimeStats.activeProcesses.length > 0) {
            const processesText = realtimeStats.activeProcesses
                .slice(0, 5)
                .map(process => `**${process.name}** - ${process.status} (${process.duration}ms)`)
                .join('\n');
            embed.addFields({ name: '⚙️ Active Processes', value: processesText, inline: false });
        }

        embed.setFooter({ text: 'Statistics update every 30 seconds' });

        message.reply({ embeds: [embed] });
    },

    async handleTrends(message, args) {
        const period = args[0] || '7d';
        const trends = await analytics.getTrendAnalysis(message.guild.id, period);

        const embed = new EmbedBuilder()
            .setColor('#4ecdc4')
            .setTitle(`📈 Trend Analysis (${period})`)
            .setDescription(`Usage trends and patterns for ${message.guild.name}`)
            .setTimestamp();

        // Overall trends
        embed.addFields({
            name: '📊 Overall Trends',
            value: `**Command Usage:** ${trends.commandUsage > 0 ? '📈' : '📉'} ${Math.abs(trends.commandUsage)}%\n**User Activity:** ${trends.userActivity > 0 ? '📈' : '📉'} ${Math.abs(trends.userActivity)}%\n**Error Rate:** ${trends.errorRate > 0 ? '📈' : '📉'} ${Math.abs(trends.errorRate)}%`,
            inline: false
        });

        // Command trends
        if (trends.topGrowingCommands && trends.topGrowingCommands.length > 0) {
            const growingText = trends.topGrowingCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** +${cmd.growth}% (${cmd.currentUsage} uses)`)
                .join('\n');
            embed.addFields({ name: '📈 Growing Commands', value: growingText, inline: true });
        }

        if (trends.decliningCommands && trends.decliningCommands.length > 0) {
            const decliningText = trends.decliningCommands
                .slice(0, 5)
                .map(cmd => `**${cmd.name}:** ${cmd.decline}% (${cmd.currentUsage} uses)`)
                .join('\n');
            embed.addFields({ name: '📉 Declining Commands', value: decliningText, inline: true });
        }

        // User engagement trends
        if (trends.userEngagement) {
            embed.addFields({
                name: '👥 User Engagement',
                value: `**New Users:** ${trends.userEngagement.newUsers > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.newUsers)}%\n**Retention Rate:** ${trends.userEngagement.retention > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.retention)}%\n**Avg Session:** ${trends.userEngagement.avgSession > 0 ? '📈' : '📉'} ${Math.abs(trends.userEngagement.avgSession)}%`,
                inline: false
            });
        }

        // Peak usage patterns
        if (trends.peakPatterns) {
            const patternsText = [
                `**Peak Day:** ${trends.peakPatterns.peakDay}`,
                `**Peak Hour:** ${trends.peakPatterns.peakHour}:00`,
                `**Busiest Period:** ${trends.peakPatterns.busiestPeriod}`
            ].join('\n');
            embed.addFields({ name: '⏰ Peak Patterns', value: patternsText, inline: true });
        }

        // Seasonal trends (for longer periods)
        if (period === '30d' && trends.seasonalTrends) {
            const seasonalText = [
                `**Weekday vs Weekend:** ${trends.seasonalTrends.weekdayWeekend}`,
                `**Morning vs Evening:** ${trends.seasonalTrends.morningEvening}`,
                `**Growth Trajectory:** ${trends.seasonalTrends.trajectory}`
            ].join('\n');
            embed.addFields({ name: '📅 Seasonal Trends', value: seasonalText, inline: true });
        }

        // Predictions
        if (trends.predictions) {
            const predictionsText = [
                `**Next Week Usage:** ${trends.predictions.nextWeekUsage > 0 ? '📈' : '📉'} ${Math.abs(trends.predictions.nextWeekUsage)}%`,
                `**Expected Peak:** ${trends.predictions.expectedPeak}`,
                `**Growth Forecast:** ${trends.predictions.growthForecast}`
            ].join('\n');
            embed.addFields({ name: '🔮 Predictions', value: predictionsText, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    // Helper methods
    getHealthStatus(performance) {
        if (performance.avgResponseTime < 100 && performance.errorRate < 1) {
            return '🟢 Excellent';
        } else if (performance.avgResponseTime < 200 && performance.errorRate < 3) {
            return '🟡 Good';
        } else if (performance.avgResponseTime < 500 && performance.errorRate < 5) {
            return '🟠 Fair';
        } else {
            return '🔴 Poor';
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