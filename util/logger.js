const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced Logger Utility
 * Provides comprehensive logging with different levels and categories
 */

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };

        this.currentLevel = this.logLevels.INFO;
        this.logDirectory = './logs';
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
        
        this.initializeLogDirectory();
    }

    /**
     * Initialize log directory
     */
    async initializeLogDirectory() {
        try {
            await fs.mkdir(this.logDirectory, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     * @returns {string} Formatted log message
     */
    formatMessage(level, category, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const metaString = Object.keys(metadata).length > 0 ? 
            ` | META: ${JSON.stringify(metadata)}` : '';
        
        return `[${timestamp}] [${level}] [${category}] ${message}${metaString}`;
    }

    /**
     * Write log to file
     * @param {string} filename - Log filename
     * @param {string} message - Formatted message
     */
    async writeToFile(filename, message) {
        try {
            const filePath = path.join(this.logDirectory, filename);
            
            // Check file size and rotate if necessary
            try {
                const stats = await fs.stat(filePath);
                if (stats.size > this.maxLogSize) {
                    await this.rotateLogFile(filename);
                }
            } catch (error) {
                // File doesn't exist, which is fine
            }

            await fs.appendFile(filePath, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Rotate log file when it gets too large
     * @param {string} filename - Log filename
     */
    async rotateLogFile(filename) {
        try {
            const baseName = filename.replace('.log', '');
            
            // Shift existing rotated files
            for (let i = this.maxLogFiles - 1; i > 0; i--) {
                const oldFile = path.join(this.logDirectory, `${baseName}.${i}.log`);
                const newFile = path.join(this.logDirectory, `${baseName}.${i + 1}.log`);
                
                try {
                    await fs.rename(oldFile, newFile);
                } catch (error) {
                    // File might not exist, continue
                }
            }

            // Move current file to .1
            const currentFile = path.join(this.logDirectory, filename);
            const rotatedFile = path.join(this.logDirectory, `${baseName}.1.log`);
            
            await fs.rename(currentFile, rotatedFile);
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    /**
     * Generic log method
     * @param {string} level - Log level
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async log(level, category, message, metadata = {}) {
        if (this.logLevels[level] > this.currentLevel) return;

        const formattedMessage = this.formatMessage(level, category, message, metadata);
        
        // Console output with colors
        const colors = {
            ERROR: '\x1b[31m',   // Red
            WARN: '\x1b[33m',    // Yellow
            INFO: '\x1b[36m',    // Cyan
            DEBUG: '\x1b[35m',   // Magenta
            TRACE: '\x1b[37m'    // White
        };
        
        console.log(`${colors[level]}${formattedMessage}\x1b[0m`);

        // Write to appropriate log files
        await this.writeToFile('app.log', formattedMessage);
        await this.writeToFile(`${category.toLowerCase()}.log`, formattedMessage);
        
        if (level === 'ERROR') {
            await this.writeToFile('error.log', formattedMessage);
        }
    }

    /**
     * Log permission denied events
     * @param {string} userId - User ID
     * @param {string} command - Command name
     * @param {string} reason - Denial reason
     * @param {Object} metadata - Additional metadata
     */
    async logPermissionDenied(userId, command, reason, metadata = {}) {
        await this.log('WARN', 'SECURITY', 
            `Permission denied: User ${userId} tried command '${command}' - ${reason}`, 
            { userId, command, reason, ...metadata }
        );
    }

    /**
     * Log role changes
     * @param {string} guildId - Guild ID
     * @param {string} targetUserId - Target user ID
     * @param {string} executorId - Executor user ID
     * @param {string} action - Action performed
     * @param {string} roleId - Role ID
     * @param {Object} metadata - Additional metadata
     */
    async logRoleChange(guildId, targetUserId, executorId, action, roleId, metadata = {}) {
        await this.log('INFO', 'AUDIT', 
            `Role ${action}: User ${targetUserId} by ${executorId} in guild ${guildId}`, 
            { guildId, targetUserId, executorId, action, roleId, ...metadata }
        );
    }

    /**
     * Log command usage
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} command - Command name
     * @param {boolean} success - Whether command succeeded
     * @param {number} executionTime - Execution time in ms
     * @param {Object} metadata - Additional metadata
     */
    async logCommandUsage(userId, guildId, command, success, executionTime = 0, metadata = {}) {
        const level = success ? 'INFO' : 'WARN';
        const status = success ? 'SUCCESS' : 'FAILED';
        
        await this.log(level, 'COMMANDS', 
            `Command ${command} ${status} for user ${userId} in guild ${guildId} (${executionTime}ms)`, 
            { userId, guildId, command, success, executionTime, ...metadata }
        );
    }

    /**
     * Log security events
     * @param {string} event - Event type
     * @param {string} description - Event description
     * @param {Object} metadata - Additional metadata
     */
    async logSecurityEvent(event, description, metadata = {}) {
        await this.log('WARN', 'SECURITY', 
            `Security event: ${event} - ${description}`, 
            { event, ...metadata }
        );
    }

    /**
     * Log rate limit events
     * @param {string} userId - User ID
     * @param {string} command - Command name
     * @param {string} category - Command category
     * @param {string} limitType - Type of limit (cooldown/rateLimit)
     * @param {Object} metadata - Additional metadata
     */
    async logRateLimit(userId, command, category, limitType, metadata = {}) {
        await this.log('INFO', 'RATELIMIT', 
            `Rate limit triggered: User ${userId} hit ${limitType} for ${command} (${category})`, 
            { userId, command, category, limitType, ...metadata }
        );
    }

    /**
     * Log configuration changes
     * @param {string} guildId - Guild ID
     * @param {string} userId - User who made change
     * @param {string} setting - Setting changed
     * @param {any} oldValue - Old value
     * @param {any} newValue - New value
     * @param {Object} metadata - Additional metadata
     */
    async logConfigChange(guildId, userId, setting, oldValue, newValue, metadata = {}) {
        await this.log('INFO', 'CONFIG', 
            `Configuration changed in guild ${guildId} by user ${userId}: ${setting}`, 
            { guildId, userId, setting, oldValue, newValue, ...metadata }
        );
    }

    /**
     * Log database operations
     * @param {string} operation - Database operation
     * @param {string} collection - Collection name
     * @param {boolean} success - Whether operation succeeded
     * @param {number} executionTime - Execution time in ms
     * @param {Object} metadata - Additional metadata
     */
    async logDatabaseOperation(operation, collection, success, executionTime, metadata = {}) {
        const level = success ? 'DEBUG' : 'ERROR';
        const status = success ? 'SUCCESS' : 'FAILED';
        
        await this.log(level, 'DATABASE', 
            `Database ${operation} on ${collection} ${status} (${executionTime}ms)`, 
            { operation, collection, success, executionTime, ...metadata }
        );
    }

    /**
     * Log performance metrics
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     * @param {string} unit - Unit of measurement
     * @param {Object} metadata - Additional metadata
     */
    async logPerformance(metric, value, unit, metadata = {}) {
        await this.log('DEBUG', 'PERFORMANCE', 
            `Performance metric: ${metric} = ${value}${unit}`, 
            { metric, value, unit, ...metadata }
        );
    }

    /**
     * Log error with stack trace
     * @param {Error} error - Error object
     * @param {string} context - Error context
     * @param {Object} metadata - Additional metadata
     */
    async logError(error, context, metadata = {}) {
        await this.log('ERROR', 'ERROR', 
            `Error in ${context}: ${error.message}`, 
            { 
                error: error.message, 
                stack: error.stack, 
                context, 
                ...metadata 
            }
        );
    }

    /**
     * Set log level
     * @param {string} level - Log level
     */
    setLevel(level) {
        if (this.logLevels[level] !== undefined) {
            this.currentLevel = this.logLevels[level];
        }
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    async getLogStats() {
        try {
            const files = await fs.readdir(this.logDirectory);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            const stats = {};
            for (const file of logFiles) {
                const filePath = path.join(this.logDirectory, file);
                const fileStats = await fs.stat(filePath);
                stats[file] = {
                    size: fileStats.size,
                    modified: fileStats.mtime,
                    sizeFormatted: this.formatBytes(fileStats.size)
                };
            }
            
            return stats;
        } catch (error) {
            console.error('Failed to get log stats:', error);
            return {};
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
     * Clean old log files
     * @param {number} daysOld - Days old to clean
     */
    async cleanOldLogs(daysOld = 30) {
        try {
            const files = await fs.readdir(this.logDirectory);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            for (const file of files) {
                if (!file.endsWith('.log')) continue;
                
                const filePath = path.join(this.logDirectory, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    console.log(`Cleaned old log file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Failed to clean old logs:', error);
        }
    }
}

// Export singleton instance
module.exports = new Logger();