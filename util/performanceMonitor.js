const logger = require('./logger');

/**
 * Performance Monitor Utility
 * Tracks and monitors bot performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.commandMetrics = new Map();
        this.systemMetrics = {
            startTime: Date.now(),
            commandsExecuted: 0,
            errorsCount: 0,
            averageResponseTime: 0,
            peakMemoryUsage: 0,
            totalMemoryUsage: []
        };

        // Start monitoring intervals
        this.startMonitoring();
    }

    /**
     * Start monitoring intervals
     */
    startMonitoring() {
        // Monitor system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Clean old metrics every hour
        setInterval(() => {
            this.cleanOldMetrics();
        }, 3600000);

        // Log performance summary every 5 minutes
        setInterval(() => {
            this.logPerformanceSummary();
        }, 300000);
    }

    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Track memory usage
        this.systemMetrics.totalMemoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        });

        // Keep only last 100 memory readings
        if (this.systemMetrics.totalMemoryUsage.length > 100) {
            this.systemMetrics.totalMemoryUsage.shift();
        }

        // Update peak memory usage
        if (memUsage.heapUsed > this.systemMetrics.peakMemoryUsage) {
            this.systemMetrics.peakMemoryUsage = memUsage.heapUsed;
        }

        // Log performance metrics
        logger.logPerformance('memory_heap_used', memUsage.heapUsed, 'bytes');
        logger.logPerformance('memory_heap_total', memUsage.heapTotal, 'bytes');
        logger.logPerformance('cpu_user', cpuUsage.user, 'microseconds');
        logger.logPerformance('cpu_system', cpuUsage.system, 'microseconds');
    }

    /**
     * Start timing a command execution
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Function} End timing function
     */
    startCommandTiming(commandName, userId, guildId) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage().heapUsed;

        return (success = true, error = null) => {
            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            const memoryDelta = endMemory - startMemory;

            this.recordCommandMetric(commandName, executionTime, success, memoryDelta);
            
            // Log command execution
            logger.logCommandUsage(userId, guildId, commandName, success, executionTime, {
                memoryDelta,
                error: error?.message
            });

            // Update system metrics
            this.systemMetrics.commandsExecuted++;
            if (!success) {
                this.systemMetrics.errorsCount++;
            }

            // Update average response time
            this.updateAverageResponseTime(executionTime);

            return {
                executionTime,
                memoryDelta,
                success
            };
        };
    }

    /**
     * Record command metric
     * @param {string} commandName - Command name
     * @param {number} executionTime - Execution time in ms
     * @param {boolean} success - Whether command succeeded
     * @param {number} memoryDelta - Memory usage change
     */
    recordCommandMetric(commandName, executionTime, success, memoryDelta) {
        if (!this.commandMetrics.has(commandName)) {
            this.commandMetrics.set(commandName, {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                minExecutionTime: Infinity,
                maxExecutionTime: 0,
                totalMemoryUsage: 0,
                averageMemoryUsage: 0,
                lastExecuted: null,
                recentExecutions: []
            });
        }

        const metrics = this.commandMetrics.get(commandName);
        
        // Update basic counters
        metrics.totalExecutions++;
        if (success) {
            metrics.successfulExecutions++;
        } else {
            metrics.failedExecutions++;
        }

        // Update timing metrics
        metrics.totalExecutionTime += executionTime;
        metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
        metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);
        metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);

        // Update memory metrics
        metrics.totalMemoryUsage += memoryDelta;
        metrics.averageMemoryUsage = metrics.totalMemoryUsage / metrics.totalExecutions;

        // Update recent executions
        metrics.recentExecutions.push({
            timestamp: Date.now(),
            executionTime,
            success,
            memoryDelta
        });

        // Keep only last 50 executions
        if (metrics.recentExecutions.length > 50) {
            metrics.recentExecutions.shift();
        }

        metrics.lastExecuted = Date.now();
    }

    /**
     * Update average response time
     * @param {number} executionTime - Execution time in ms
     */
    updateAverageResponseTime(executionTime) {
        const totalCommands = this.systemMetrics.commandsExecuted;
        const currentAverage = this.systemMetrics.averageResponseTime;
        
        // Calculate new average using incremental formula
        this.systemMetrics.averageResponseTime = 
            (currentAverage * (totalCommands - 1) + executionTime) / totalCommands;
    }

    /**
     * Get command performance statistics
     * @param {string} commandName - Command name (optional)
     * @returns {Object} Performance statistics
     */
    getCommandStats(commandName = null) {
        if (commandName) {
            return this.commandMetrics.get(commandName) || null;
        }

        const stats = {};
        for (const [cmd, metrics] of this.commandMetrics.entries()) {
            stats[cmd] = {
                ...metrics,
                successRate: (metrics.successfulExecutions / metrics.totalExecutions) * 100,
                failureRate: (metrics.failedExecutions / metrics.totalExecutions) * 100
            };
        }

        return stats;
    }

    /**
     * Get system performance statistics
     * @returns {Object} System statistics
     */
    getSystemStats() {
        const uptime = Date.now() - this.systemMetrics.startTime;
        const memUsage = process.memoryUsage();
        
        return {
            uptime,
            uptimeFormatted: this.formatUptime(uptime),
            commandsExecuted: this.systemMetrics.commandsExecuted,
            errorsCount: this.systemMetrics.errorsCount,
            errorRate: this.systemMetrics.commandsExecuted > 0 ? 
                (this.systemMetrics.errorsCount / this.systemMetrics.commandsExecuted) * 100 : 0,
            averageResponseTime: this.systemMetrics.averageResponseTime,
            currentMemoryUsage: memUsage.heapUsed,
            peakMemoryUsage: this.systemMetrics.peakMemoryUsage,
            memoryUsageFormatted: {
                current: this.formatBytes(memUsage.heapUsed),
                peak: this.formatBytes(this.systemMetrics.peakMemoryUsage),
                total: this.formatBytes(memUsage.heapTotal)
            },
            commandsPerMinute: this.getCommandsPerMinute(),
            topCommands: this.getTopCommands(5)
        };
    }

    /**
     * Get commands per minute
     * @returns {number} Commands per minute
     */
    getCommandsPerMinute() {
        const uptime = Date.now() - this.systemMetrics.startTime;
        const minutes = uptime / (1000 * 60);
        return minutes > 0 ? this.systemMetrics.commandsExecuted / minutes : 0;
    }

    /**
     * Get top commands by usage
     * @param {number} limit - Number of top commands to return
     * @returns {Array} Top commands
     */
    getTopCommands(limit = 10) {
        const commands = Array.from(this.commandMetrics.entries())
            .map(([name, metrics]) => ({
                name,
                executions: metrics.totalExecutions,
                averageTime: metrics.averageExecutionTime,
                successRate: (metrics.successfulExecutions / metrics.totalExecutions) * 100
            }))
            .sort((a, b) => b.executions - a.executions)
            .slice(0, limit);

        return commands;
    }

    /**
     * Get performance alerts
     * @returns {Array} Array of performance alerts
     */
    getPerformanceAlerts() {
        const alerts = [];
        const memUsage = process.memoryUsage();
        
        // Memory usage alerts
        if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: `High memory usage: ${this.formatBytes(memUsage.heapUsed)}`
            });
        }

        if (memUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
            alerts.push({
                type: 'memory',
                level: 'critical',
                message: `Critical memory usage: ${this.formatBytes(memUsage.heapUsed)}`
            });
        }

        // Response time alerts
        if (this.systemMetrics.averageResponseTime > 1000) { // 1 second
            alerts.push({
                type: 'response_time',
                level: 'warning',
                message: `Slow average response time: ${this.systemMetrics.averageResponseTime.toFixed(2)}ms`
            });
        }

        // Error rate alerts
        const errorRate = this.systemMetrics.commandsExecuted > 0 ? 
            (this.systemMetrics.errorsCount / this.systemMetrics.commandsExecuted) * 100 : 0;
        
        if (errorRate > 5) {
            alerts.push({
                type: 'error_rate',
                level: 'warning',
                message: `High error rate: ${errorRate.toFixed(2)}%`
            });
        }

        return alerts;
    }

    /**
     * Clean old metrics to prevent memory leaks
     */
    cleanOldMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        // Clean old memory usage data
        this.systemMetrics.totalMemoryUsage = this.systemMetrics.totalMemoryUsage
            .filter(entry => entry.timestamp > oneHourAgo);

        // Clean old command execution data
        for (const [, metrics] of this.commandMetrics.entries()) {
            metrics.recentExecutions = metrics.recentExecutions
                .filter(execution => execution.timestamp > oneHourAgo);
        }
    }

    /**
     * Log performance summary
     */
    async logPerformanceSummary() {
        const stats = this.getSystemStats();
        const alerts = this.getPerformanceAlerts();
        
        await logger.log('INFO', 'PERFORMANCE', 
            `Performance Summary: ${stats.commandsExecuted} commands, ${stats.averageResponseTime.toFixed(2)}ms avg response, ${stats.memoryUsageFormatted.current} memory`, 
            { 
                stats,
                alerts: alerts.length,
                topCommands: stats.topCommands.slice(0, 3)
            }
        );

        // Log alerts
        for (const alert of alerts) {
            await logger.log('WARN', 'PERFORMANCE', alert.message, alert);
        }
    }

    /**
     * Format uptime to human readable format
     * @param {number} uptime - Uptime in milliseconds
     * @returns {string} Formatted uptime
     */
    formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.commandMetrics.clear();
        this.systemMetrics = {
            startTime: Date.now(),
            commandsExecuted: 0,
            errorsCount: 0,
            averageResponseTime: 0,
            peakMemoryUsage: 0,
            totalMemoryUsage: []
        };
    }
}

// Export singleton instance
module.exports = new PerformanceMonitor();