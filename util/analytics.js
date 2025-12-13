const logger = require('./logger');
const performanceMonitor = require('./performanceMonitor');

const temporaryPermissions = require('./temporaryPermissions');
const permissionInheritance = require('./permissionInheritance');
const contextPermissions = require('./contextPermissions');

/**
 * Advanced Analytics System
 * Comprehensive analytics and reporting for bot usage, performance, and security
 */

class Analytics {
    constructor() {
        // Analytics data storage
        this.commandUsage = new Map(); // commandName -> usage stats
        this.userActivity = new Map(); // userId -> activity stats
        this.guildActivity = new Map(); // guildId -> guild stats
        this.permissionEvents = new Map(); // eventId -> permission event
        this.securityEvents = new Map(); // eventId -> security event
        this.performanceMetrics = new Map(); // timestamp -> performance data
        
        // Time-based analytics
        this.hourlyStats = new Map(); // hour -> stats
        this.dailyStats = new Map(); // date -> stats
        this.weeklyStats = new Map(); // week -> stats
        this.monthlyStats = new Map(); // month -> stats
        
        // Analytics configuration
        this.config = {
            retentionDays: 90, // Keep data for 90 days
            aggregationInterval: 60000, // 1 minute
            reportingInterval: 3600000, // 1 hour
            maxEvents: 10000, // Maximum events to keep in memory
            enableRealTimeAnalytics: true,
            enablePredictiveAnalytics: false
        };
        
        // Start analytics collection
        this.startAnalyticsCollection();
    }

    /**
     * Start analytics collection intervals
     */
    startAnalyticsCollection() {
        // Aggregate data every minute
        setInterval(() => {
            this.aggregateData();
        }, this.config.aggregationInterval);
        
        // Generate reports every hour
        setInterval(() => {
            this.generateHourlyReport();
        }, this.config.reportingInterval);
        
        // Cleanup old data daily
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Record command usage
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {number} executionTime - Execution time in ms
     * @param {boolean} success - Whether command succeeded
     * @param {string} category - Command category
     */
    recordCommandUsage(commandName, userId, guildId, executionTime, success, category = 'general') {
        try {
            const timestamp = Date.now();
            const hour = new Date(timestamp).getHours();
            const date = new Date(timestamp).toDateString();
            
            // Update command usage stats
            const commandStats = this.commandUsage.get(commandName) || {
                totalUses: 0,
                successfulUses: 0,
                failedUses: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                category,
                firstUsed: timestamp,
                lastUsed: timestamp,
                uniqueUsers: new Set(),
                uniqueGuilds: new Set(),
                hourlyUsage: new Map(),
                dailyUsage: new Map()
            };
            
            commandStats.totalUses++;
            if (success) {
                commandStats.successfulUses++;
            } else {
                commandStats.failedUses++;
            }
            commandStats.totalExecutionTime += executionTime;
            commandStats.averageExecutionTime = commandStats.totalExecutionTime / commandStats.totalUses;
            commandStats.lastUsed = timestamp;
            commandStats.uniqueUsers.add(userId);
            commandStats.uniqueGuilds.add(guildId);
            
            // Update hourly usage
            const hourlyCount = commandStats.hourlyUsage.get(hour) || 0;
            commandStats.hourlyUsage.set(hour, hourlyCount + 1);
            
            // Update daily usage
            const dailyCount = commandStats.dailyUsage.get(date) || 0;
            commandStats.dailyUsage.set(date, dailyCount + 1);
            
            this.commandUsage.set(commandName, commandStats);
            
            // Update user activity
            this.updateUserActivity(userId, guildId, commandName, category, success, executionTime);
            
            // Update guild activity
            this.updateGuildActivity(guildId, commandName, category, success, executionTime);
            
            // Update time-based stats
            this.updateTimeBasedStats(timestamp, commandName, category, success, executionTime);
            
        } catch (error) {
            logger.logError(error, 'recording command usage analytics');
        }
    }

    /**
     * Record permission event
     * @param {string} eventType - Type of permission event
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} permission - Permission involved
     * @param {boolean} granted - Whether permission was granted
     * @param {string} source - Source of permission (role, temporary, inherited, context)
     * @param {Object} metadata - Additional metadata
     */
    recordPermissionEvent(eventType, userId, guildId, permission, granted, source, metadata = {}) {
        try {
            const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();
            
            const event = {
                eventId,
                eventType,
                userId,
                guildId,
                permission,
                granted,
                source,
                timestamp,
                metadata
            };
            
            this.permissionEvents.set(eventId, event);
            
            // Cleanup old events if we have too many
            if (this.permissionEvents.size > this.config.maxEvents) {
                const oldestEvent = Array.from(this.permissionEvents.keys())[0];
                this.permissionEvents.delete(oldestEvent);
            }
            
        } catch (error) {
            logger.logError(error, 'recording permission event');
        }
    }

    /**
     * Record security event
     * @param {string} eventType - Type of security event
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} severity - Event severity (low, medium, high, critical)
     * @param {string} description - Event description
     * @param {Object} metadata - Additional metadata
     */
    recordSecurityEvent(eventType, userId, guildId, severity, description, metadata = {}) {
        try {
            const eventId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();
            
            const event = {
                eventId,
                eventType,
                userId,
                guildId,
                severity,
                description,
                timestamp,
                metadata
            };
            
            this.securityEvents.set(eventId, event);
            
            // Log security events
            logger.log('WARN', 'SECURITY_ANALYTICS', 
                `Security event: ${eventType} - ${description}`,
                { eventId, userId, guildId, severity, metadata }
            );
            
            // Cleanup old events if we have too many
            if (this.securityEvents.size > this.config.maxEvents) {
                const oldestEvent = Array.from(this.securityEvents.keys())[0];
                this.securityEvents.delete(oldestEvent);
            }
            
        } catch (error) {
            logger.logError(error, 'recording security event');
        }
    }

    /**
     * Update user activity statistics
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @param {boolean} success - Whether command succeeded
     * @param {number} executionTime - Execution time
     */
    updateUserActivity(userId, guildId, commandName, category, success, executionTime) {
        const userKey = `${userId}-${guildId}`;
        const userStats = this.userActivity.get(userKey) || {
            userId,
            guildId,
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            firstActivity: Date.now(),
            lastActivity: Date.now(),
            commandsByCategory: new Map(),
            favoriteCommands: new Map(),
            activityByHour: new Map(),
            activityByDay: new Map()
        };
        
        userStats.totalCommands++;
        if (success) {
            userStats.successfulCommands++;
        } else {
            userStats.failedCommands++;
        }
        userStats.totalExecutionTime += executionTime;
        userStats.averageExecutionTime = userStats.totalExecutionTime / userStats.totalCommands;
        userStats.lastActivity = Date.now();
        
        // Update category stats
        const categoryCount = userStats.commandsByCategory.get(category) || 0;
        userStats.commandsByCategory.set(category, categoryCount + 1);
        
        // Update favorite commands
        const commandCount = userStats.favoriteCommands.get(commandName) || 0;
        userStats.favoriteCommands.set(commandName, commandCount + 1);
        
        // Update activity by hour
        const hour = new Date().getHours();
        const hourlyCount = userStats.activityByHour.get(hour) || 0;
        userStats.activityByHour.set(hour, hourlyCount + 1);
        
        // Update activity by day
        const day = new Date().getDay();
        const dailyCount = userStats.activityByDay.get(day) || 0;
        userStats.activityByDay.set(day, dailyCount + 1);
        
        this.userActivity.set(userKey, userStats);
    }

    /**
     * Update guild activity statistics
     * @param {string} guildId - Guild ID
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @param {boolean} success - Whether command succeeded
     * @param {number} executionTime - Execution time
     */
    updateGuildActivity(guildId, commandName, category, success, executionTime) {
        const guildStats = this.guildActivity.get(guildId) || {
            guildId,
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            uniqueUsers: new Set(),
            commandsByCategory: new Map(),
            popularCommands: new Map(),
            peakHours: new Map(),
            firstActivity: Date.now(),
            lastActivity: Date.now()
        };
        
        guildStats.totalCommands++;
        if (success) {
            guildStats.successfulCommands++;
        } else {
            guildStats.failedCommands++;
        }
        guildStats.totalExecutionTime += executionTime;
        guildStats.averageExecutionTime = guildStats.totalExecutionTime / guildStats.totalCommands;
        guildStats.lastActivity = Date.now();
        
        // Update category stats
        const categoryCount = guildStats.commandsByCategory.get(category) || 0;
        guildStats.commandsByCategory.set(category, categoryCount + 1);
        
        // Update popular commands
        const commandCount = guildStats.popularCommands.get(commandName) || 0;
        guildStats.popularCommands.set(commandName, commandCount + 1);
        
        // Update peak hours
        const hour = new Date().getHours();
        const hourlyCount = guildStats.peakHours.get(hour) || 0;
        guildStats.peakHours.set(hour, hourlyCount + 1);
        
        this.guildActivity.set(guildId, guildStats);
    }

    /**
     * Update time-based statistics
     * @param {number} timestamp - Timestamp
     * @param {string} commandName - Command name
     * @param {string} category - Command category
     * @param {boolean} success - Whether command succeeded
     * @param {number} executionTime - Execution time
     */
    updateTimeBasedStats(timestamp, commandName, category, success, executionTime) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const dateStr = date.toDateString();
        // const weekStr = this.getWeekString(date);
        // const monthStr = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        // Update hourly stats
        const hourlyStats = this.hourlyStats.get(hour) || {
            hour,
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            commandsByCategory: new Map()
        };
        
        hourlyStats.totalCommands++;
        if (success) hourlyStats.successfulCommands++;
        else hourlyStats.failedCommands++;
        hourlyStats.totalExecutionTime += executionTime;
        hourlyStats.averageExecutionTime = hourlyStats.totalExecutionTime / hourlyStats.totalCommands;
        
        const hourlyCategoryCount = hourlyStats.commandsByCategory.get(category) || 0;
        hourlyStats.commandsByCategory.set(category, hourlyCategoryCount + 1);
        
        this.hourlyStats.set(hour, hourlyStats);
        
        // Update daily stats
        const dailyStats = this.dailyStats.get(dateStr) || {
            date: dateStr,
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            uniqueUsers: new Set(),
            uniqueGuilds: new Set(),
            commandsByCategory: new Map()
        };
        
        dailyStats.totalCommands++;
        if (success) dailyStats.successfulCommands++;
        else dailyStats.failedCommands++;
        dailyStats.totalExecutionTime += executionTime;
        dailyStats.averageExecutionTime = dailyStats.totalExecutionTime / dailyStats.totalCommands;
        
        const dailyCategoryCount = dailyStats.commandsByCategory.get(category) || 0;
        dailyStats.commandsByCategory.set(category, dailyCategoryCount + 1);
        
        this.dailyStats.set(dateStr, dailyStats);
    }

    /**
     * Generate comprehensive analytics report
     * @param {string} guildId - Guild ID (optional)
     * @param {string} timeframe - Timeframe (hour, day, week, month, all)
     * @returns {Object} Analytics report
     */
    generateReport(guildId = null, timeframe = 'day') {
        try {
            const report = {
                generatedAt: Date.now(),
                timeframe,
                guildId,
                summary: {},
                commandAnalytics: {},
                userAnalytics: {},
                guildAnalytics: {},
                permissionAnalytics: {},
                securityAnalytics: {},
                performanceAnalytics: {},
                trends: {},
                recommendations: []
            };
            
            // Generate summary
            report.summary = this.generateSummary(guildId, timeframe);
            
            // Generate command analytics
            report.commandAnalytics = this.generateCommandAnalytics(guildId, timeframe);
            
            // Generate user analytics
            report.userAnalytics = this.generateUserAnalytics(guildId, timeframe);
            
            // Generate guild analytics
            if (!guildId) {
                report.guildAnalytics = this.generateGuildAnalytics(timeframe);
            }
            
            // Generate permission analytics
            report.permissionAnalytics = this.generatePermissionAnalytics(guildId, timeframe);
            
            // Generate security analytics
            report.securityAnalytics = this.generateSecurityAnalytics(guildId, timeframe);
            
            // Generate performance analytics
            report.performanceAnalytics = this.generatePerformanceAnalytics(guildId, timeframe);
            
            // Generate trends
            report.trends = this.generateTrends(guildId, timeframe);
            
            // Generate recommendations
            report.recommendations = this.generateRecommendations(report);
            
            return report;
            
        } catch (error) {
            logger.logError(error, 'generating analytics report');
            return { error: error.message };
        }
    }

    /**
     * Generate summary statistics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Summary statistics
     */
    generateSummary(guildId, timeframe) {
        const summary = {
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            successRate: 0,
            averageExecutionTime: 0,
            uniqueUsers: new Set(),
            uniqueGuilds: new Set(),
            activePermissions: 0,
            securityEvents: 0,
            topCommand: null,
            topCategory: null
        };
        
        // Calculate from command usage
        for (const [, stats] of this.commandUsage.entries()) {
            if (this.isInTimeframe(stats.lastUsed, timeframe)) {
                summary.totalCommands += stats.totalUses;
                summary.successfulCommands += stats.successfulUses;
                summary.failedCommands += stats.failedUses;
                
                stats.uniqueUsers.forEach(userId => summary.uniqueUsers.add(userId));
                stats.uniqueGuilds.forEach(gId => summary.uniqueGuilds.add(gId));
            }
        }
        
        // Calculate success rate
        if (summary.totalCommands > 0) {
            summary.successRate = (summary.successfulCommands / summary.totalCommands) * 100;
        }
        
        // Get permission statistics
        summary.activePermissions = temporaryPermissions.getStatistics().activeGrants;
        
        // Get security events count
        summary.securityEvents = Array.from(this.securityEvents.values())
            .filter(event => this.isInTimeframe(event.timestamp, timeframe)).length;
        
        // Convert Sets to counts
        summary.uniqueUsers = summary.uniqueUsers.size;
        summary.uniqueGuilds = summary.uniqueGuilds.size;
        
        return summary;
    }

    /**
     * Generate command analytics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Command analytics
     */
    generateCommandAnalytics(guildId, timeframe) {
        const analytics = {
            totalCommands: this.commandUsage.size,
            commandsByCategory: new Map(),
            topCommands: [],
            leastUsedCommands: [],
            slowestCommands: [],
            fastestCommands: [],
            mostFailedCommands: []
        };
        
        const commandStats = Array.from(this.commandUsage.entries())
            .filter(([, stats]) => this.isInTimeframe(stats.lastUsed, timeframe))
            .map(([name, stats]) => ({ name, ...stats }));
        
        // Group by category
        commandStats.forEach(cmd => {
            const categoryCount = analytics.commandsByCategory.get(cmd.category) || 0;
            analytics.commandsByCategory.set(cmd.category, categoryCount + cmd.totalUses);
        });
        
        // Sort for top lists
        analytics.topCommands = commandStats
            .sort((a, b) => b.totalUses - a.totalUses)
            .slice(0, 10)
            .map(cmd => ({ name: cmd.name, uses: cmd.totalUses, category: cmd.category }));
        
        analytics.leastUsedCommands = commandStats
            .sort((a, b) => a.totalUses - b.totalUses)
            .slice(0, 10)
            .map(cmd => ({ name: cmd.name, uses: cmd.totalUses, category: cmd.category }));
        
        analytics.slowestCommands = commandStats
            .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
            .slice(0, 10)
            .map(cmd => ({ name: cmd.name, avgTime: cmd.averageExecutionTime, category: cmd.category }));
        
        analytics.fastestCommands = commandStats
            .sort((a, b) => a.averageExecutionTime - b.averageExecutionTime)
            .slice(0, 10)
            .map(cmd => ({ name: cmd.name, avgTime: cmd.averageExecutionTime, category: cmd.category }));
        
        analytics.mostFailedCommands = commandStats
            .filter(cmd => cmd.failedUses > 0)
            .sort((a, b) => b.failedUses - a.failedUses)
            .slice(0, 10)
            .map(cmd => ({ 
                name: cmd.name, 
                failures: cmd.failedUses, 
                failureRate: (cmd.failedUses / cmd.totalUses) * 100,
                category: cmd.category 
            }));
        
        return analytics;
    }

    /**
     * Generate user analytics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} User analytics
     */
    generateUserAnalytics(guildId, timeframe) {
        const analytics = {
            totalUsers: 0,
            activeUsers: 0,
            topUsers: [],
            usersByActivity: new Map(),
            averageCommandsPerUser: 0,
            newUsers: 0
        };
        
        const userStats = Array.from(this.userActivity.entries())
            .filter(([, stats]) => !guildId || stats.guildId === guildId)
            .filter(([, stats]) => this.isInTimeframe(stats.lastActivity, timeframe))
            .map(([, stats]) => stats);
        
        analytics.totalUsers = userStats.length;
        analytics.activeUsers = userStats.filter(user => 
            this.isInTimeframe(user.lastActivity, 'day')).length;
        
        // Calculate average commands per user
        const totalCommands = userStats.reduce((sum, user) => sum + user.totalCommands, 0);
        analytics.averageCommandsPerUser = analytics.totalUsers > 0 ? 
            totalCommands / analytics.totalUsers : 0;
        
        // Top users by command usage
        analytics.topUsers = userStats
            .sort((a, b) => b.totalCommands - a.totalCommands)
            .slice(0, 10)
            .map(user => ({
                userId: user.userId,
                totalCommands: user.totalCommands,
                successRate: (user.successfulCommands / user.totalCommands) * 100,
                averageExecutionTime: user.averageExecutionTime
            }));
        
        return analytics;
    }

    /**
     * Generate guild analytics
     * @param {string} timeframe - Timeframe
     * @returns {Object} Guild analytics
     */
    generateGuildAnalytics(timeframe) {
        const analytics = {
            totalGuilds: this.guildActivity.size,
            activeGuilds: 0,
            topGuilds: [],
            averageCommandsPerGuild: 0
        };
        
        const guildStats = Array.from(this.guildActivity.values())
            .filter(guild => this.isInTimeframe(guild.lastActivity, timeframe));
        
        analytics.activeGuilds = guildStats.filter(guild => 
            this.isInTimeframe(guild.lastActivity, 'day')).length;
        
        // Calculate average commands per guild
        const totalCommands = guildStats.reduce((sum, guild) => sum + guild.totalCommands, 0);
        analytics.averageCommandsPerGuild = analytics.totalGuilds > 0 ? 
            totalCommands / analytics.totalGuilds : 0;
        
        // Top guilds by activity
        analytics.topGuilds = guildStats
            .sort((a, b) => b.totalCommands - a.totalCommands)
            .slice(0, 10)
            .map(guild => ({
                guildId: guild.guildId,
                totalCommands: guild.totalCommands,
                uniqueUsers: guild.uniqueUsers.size,
                successRate: (guild.successfulCommands / guild.totalCommands) * 100
            }));
        
        return analytics;
    }

    /**
     * Generate permission analytics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Permission analytics
     */
    generatePermissionAnalytics(guildId, timeframe) {
        const analytics = {
            temporaryPermissions: temporaryPermissions.getStatistics(),
            permissionInheritance: permissionInheritance.getStatistics(),
            contextPermissions: contextPermissions.getStatistics(),
            permissionEvents: [],
            topPermissions: new Map(),
            permissionSources: new Map()
        };
        
        // Analyze permission events
        const events = Array.from(this.permissionEvents.values())
            .filter(event => !guildId || event.guildId === guildId)
            .filter(event => this.isInTimeframe(event.timestamp, timeframe));
        
        analytics.permissionEvents = events.slice(-100); // Last 100 events
        
        // Count permission usage
        events.forEach(event => {
            const permCount = analytics.topPermissions.get(event.permission) || 0;
            analytics.topPermissions.set(event.permission, permCount + 1);
            
            const sourceCount = analytics.permissionSources.get(event.source) || 0;
            analytics.permissionSources.set(event.source, sourceCount + 1);
        });
        
        return analytics;
    }

    /**
     * Generate security analytics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Security analytics
     */
    generateSecurityAnalytics(guildId, timeframe) {
        const analytics = {
            totalSecurityEvents: 0,
            eventsBySeverity: new Map(),
            eventsByType: new Map(),
            recentEvents: [],
            securityScore: 100,
            threats: []
        };
        
        const events = Array.from(this.securityEvents.values())
            .filter(event => !guildId || event.guildId === guildId)
            .filter(event => this.isInTimeframe(event.timestamp, timeframe));
        
        analytics.totalSecurityEvents = events.length;
        analytics.recentEvents = events.slice(-20); // Last 20 events
        
        // Group by severity and type
        events.forEach(event => {
            const severityCount = analytics.eventsBySeverity.get(event.severity) || 0;
            analytics.eventsBySeverity.set(event.severity, severityCount + 1);
            
            const typeCount = analytics.eventsByType.get(event.eventType) || 0;
            analytics.eventsByType.set(event.eventType, typeCount + 1);
        });
        
        // Calculate security score (simplified)
        const criticalEvents = analytics.eventsBySeverity.get('critical') || 0;
        const highEvents = analytics.eventsBySeverity.get('high') || 0;
        const mediumEvents = analytics.eventsBySeverity.get('medium') || 0;
        
        analytics.securityScore = Math.max(0, 100 - (criticalEvents * 20) - (highEvents * 10) - (mediumEvents * 5));
        
        return analytics;
    }

    /**
     * Generate performance analytics
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Performance analytics
     */
    generatePerformanceAnalytics() {
        const performanceStats = performanceMonitor.getStatistics();
        
        return {
            systemMetrics: performanceStats.systemMetrics,
            commandMetrics: performanceStats.commandMetrics,
            alerts: performanceStats.alerts,
            recommendations: performanceStats.recommendations,
            uptime: performanceStats.uptime,
            memoryUsage: performanceStats.memoryUsage,
            responseTime: performanceStats.averageResponseTime
        };
    }

    /**
     * Generate trends analysis
     * @param {string} guildId - Guild ID
     * @param {string} timeframe - Timeframe
     * @returns {Object} Trends analysis
     */
    generateTrends() {
        const trends = {
            commandUsageTrend: 'stable',
            userActivityTrend: 'stable',
            performanceTrend: 'stable',
            securityTrend: 'stable',
            predictions: {}
        };
        
        // This would implement trend analysis algorithms
        // For now, return basic structure
        
        return trends;
    }

    /**
     * Generate recommendations based on analytics
     * @param {Object} report - Analytics report
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(report) {
        const recommendations = [];
        
        // Performance recommendations
        if (report.performanceAnalytics.responseTime > 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'High Response Time Detected',
                description: 'Average response time is above 1 second. Consider optimizing slow commands.',
                action: 'Review slowest commands and optimize database queries.'
            });
        }
        
        // Security recommendations
        if (report.securityAnalytics.securityScore < 80) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                title: 'Security Score Below Threshold',
                description: 'Multiple security events detected. Review security policies.',
                action: 'Investigate recent security events and strengthen access controls.'
            });
        }
        
        // Usage recommendations
        if (report.commandAnalytics.mostFailedCommands.length > 0) {
            const topFailedCommand = report.commandAnalytics.mostFailedCommands[0];
            if (topFailedCommand.failureRate > 20) {
                recommendations.push({
                    type: 'usage',
                    priority: 'medium',
                    title: 'High Command Failure Rate',
                    description: `Command "${topFailedCommand.name}" has a ${topFailedCommand.failureRate.toFixed(1)}% failure rate.`,
                    action: 'Review command implementation and add better error handling.'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Check if timestamp is within timeframe
     * @param {number} timestamp - Timestamp to check
     * @param {string} timeframe - Timeframe (hour, day, week, month, all)
     * @returns {boolean} Whether timestamp is in timeframe
     */
    isInTimeframe(timestamp, timeframe) {
        const now = Date.now();
        const diff = now - timestamp;
        
        switch (timeframe) {
            case 'hour':
                return diff <= 60 * 60 * 1000; // 1 hour
            case 'day':
                return diff <= 24 * 60 * 60 * 1000; // 1 day
            case 'week':
                return diff <= 7 * 24 * 60 * 60 * 1000; // 1 week
            case 'month':
                return diff <= 30 * 24 * 60 * 60 * 1000; // 30 days
            case 'all':
            default:
                return true;
        }
    }

    /**
     * Get week string for date
     * @param {Date} date - Date object
     * @returns {string} Week string
     */
    getWeekString(date) {
        const year = date.getFullYear();
        const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${year}-W${week}`;
    }

    /**
     * Aggregate data for reporting
     */
    async aggregateData() {
        try {
            // This would implement data aggregation logic
            // For now, just log that aggregation is running
            await logger.log('DEBUG', 'ANALYTICS', 'Data aggregation completed');
        } catch (error) {
            await logger.logError(error, 'aggregating analytics data');
        }
    }

    /**
     * Generate hourly report
     */
    async generateHourlyReport() {
        try {
            const report = this.generateReport(null, 'hour');
            
            // Log summary statistics
            await logger.log('INFO', 'ANALYTICS', 
                `Hourly report: ${report.summary.totalCommands} commands, ${report.summary.uniqueUsers} users, ${report.summary.successRate.toFixed(1)}% success rate`
            );
            
        } catch (error) {
            await logger.logError(error, 'generating hourly report');
        }
    }

    /**
     * Cleanup old data
     */
    async cleanupOldData() {
        try {
            const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
            let cleanedCount = 0;
            
            // Cleanup permission events
            for (const [eventId, event] of this.permissionEvents.entries()) {
                if (event.timestamp < cutoffTime) {
                    this.permissionEvents.delete(eventId);
                    cleanedCount++;
                }
            }
            
            // Cleanup security events
            for (const [eventId, event] of this.securityEvents.entries()) {
                if (event.timestamp < cutoffTime) {
                    this.securityEvents.delete(eventId);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                await logger.log('INFO', 'ANALYTICS', 
                    `Cleaned up ${cleanedCount} old analytics events`
                );
            }
            
        } catch (error) {
            await logger.logError(error, 'cleaning up old analytics data');
        }
    }

    /**
     * Get real-time statistics
     * @returns {Object} Real-time statistics
     */
    getRealTimeStats() {
        return {
            totalCommands: this.commandUsage.size,
            totalUsers: this.userActivity.size,
            totalGuilds: this.guildActivity.size,
            activePermissions: temporaryPermissions.getStatistics().activeGrants,
            securityEvents: this.securityEvents.size,
            lastUpdate: Date.now()
        };
    }
}

// Export singleton instance
module.exports = new Analytics();