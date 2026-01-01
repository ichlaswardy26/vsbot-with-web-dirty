/**
 * Enhanced Audit Logger Service
 * Comprehensive audit logging with buffering, filtering, and analytics
 */

const fs = require('fs').promises;
const path = require('path');

// Audit event types
const AuditEventType = {
  // Authentication events
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_FAILED: 'AUTH_FAILED',
  
  // Configuration events
  CONFIG_CHANGE: 'CONFIG_CHANGE',
  CONFIG_EXPORT: 'CONFIG_EXPORT',
  CONFIG_IMPORT: 'CONFIG_IMPORT',
  CONFIG_RESET: 'CONFIG_RESET',
  CONFIG_BACKUP: 'CONFIG_BACKUP',
  CONFIG_RESTORE: 'CONFIG_RESTORE',
  
  // Security events
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  
  // System events
  SYSTEM_START: 'SYSTEM_START',
  SYSTEM_STOP: 'SYSTEM_STOP',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

// Severity levels
const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

class AuditLogger {
  constructor() {
    this.buffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.logDirectory = path.join(__dirname, '../../logs/audit');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxFiles = 10;
    this.flushTimer = null;
    
    this.initialize();
  }

  /**
   * Initialize audit logger
   */
  async initialize() {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logDirectory, { recursive: true });
      
      // Start flush timer
      this.startFlushTimer();
      
      console.log('[AuditLogger] Initialized successfully');
    } catch (error) {
      console.error('[AuditLogger] Failed to initialize:', error);
    }
  }

  /**
   * Log an audit event
   */
  async log(eventType, data = {}) {
    const entry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: data.severity || Severity.INFO,
      userId: data.userId || null,
      username: data.username || null,
      guildId: data.guildId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      requestId: data.requestId || null,
      message: data.message || '',
      metadata: data.metadata || {},
      success: data.success !== false // Default to true unless explicitly false
    };

    // Add to buffer
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }

    return entry;
  }

  /**
   * Log configuration change
   */
  async logConfigChange(req, guildId, section, updates, success, errorMessage = null) {
    return await this.log(AuditEventType.CONFIG_CHANGE, {
      userId: req.user?.id,
      username: req.user?.username,
      guildId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      message: success ? 
        `Configuration ${section ? `section ${section}` : 'full config'} updated successfully` :
        `Configuration update failed: ${errorMessage}`,
      severity: success ? Severity.INFO : Severity.ERROR,
      success,
      metadata: {
        section,
        updates,
        errorMessage,
        changedFields: updates ? Object.keys(updates) : []
      }
    });
  }

  /**
   * Log configuration export
   */
  async logConfigExport(req, guildId) {
    return await this.log(AuditEventType.CONFIG_EXPORT, {
      userId: req.user?.id,
      username: req.user?.username,
      guildId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      message: 'Configuration exported',
      severity: Severity.INFO
    });
  }

  /**
   * Log configuration import
   */
  async logConfigImport(req, guildId, appliedSections, success, errorMessage = null) {
    return await this.log(AuditEventType.CONFIG_IMPORT, {
      userId: req.user?.id,
      username: req.user?.username,
      guildId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      message: success ? 
        `Configuration imported successfully (${appliedSections.length} sections)` :
        `Configuration import failed: ${errorMessage}`,
      severity: success ? Severity.INFO : Severity.ERROR,
      success,
      metadata: {
        appliedSections,
        errorMessage
      }
    });
  }

  /**
   * Log authentication event
   */
  async logAuth(eventType, req, success, errorMessage = null) {
    return await this.log(eventType, {
      userId: req.user?.id,
      username: req.user?.username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      message: success ? 
        `Authentication ${eventType.toLowerCase().replace('auth_', '')} successful` :
        `Authentication failed: ${errorMessage}`,
      severity: success ? Severity.INFO : Severity.WARNING,
      success
    });
  }

  /**
   * Log security event
   */
  async logSecurity(eventType, req, message, severity = Severity.WARNING) {
    return await this.log(eventType, {
      userId: req.user?.id,
      username: req.user?.username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      message,
      severity,
      success: false
    });
  }

  /**
   * Log system event
   */
  async logSystem(eventType, message, metadata = {}) {
    return await this.log(eventType, {
      message,
      severity: Severity.INFO,
      metadata
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters = {}) {
    try {
      const logs = [];
      const files = await this.getLogFiles();
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (this.matchesFilters(entry, filters)) {
              logs.push(entry);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      }
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (filters.limit) {
        return logs.slice(0, filters.limit);
      }
      
      return logs;
    } catch (error) {
      console.error('[AuditLogger] Error querying logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(guildId = null) {
    try {
      const logs = await this.queryLogs(guildId ? { guildId } : {});
      
      const stats = {
        totalEvents: logs.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByUser: {},
        recentActivity: logs.slice(0, 10),
        timeRange: {
          oldest: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
          newest: logs.length > 0 ? logs[0].timestamp : null
        }
      };
      
      logs.forEach(log => {
        // Count by type
        stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
        
        // Count by severity
        stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;
        
        // Count by user
        if (log.userId) {
          const userKey = `${log.username || 'Unknown'} (${log.userId})`;
          stats.eventsByUser[userKey] = (stats.eventsByUser[userKey] || 0) + 1;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('[AuditLogger] Error getting stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByUser: {},
        recentActivity: [],
        timeRange: { oldest: null, newest: null }
      };
    }
  }

  /**
   * Check if log entry matches filters
   */
  matchesFilters(entry, filters) {
    if (filters.guildId && entry.guildId !== filters.guildId) return false;
    if (filters.userId && entry.userId !== filters.userId) return false;
    if (filters.eventType && entry.eventType !== filters.eventType) return false;
    if (filters.severity && entry.severity !== filters.severity) return false;
    if (filters.success !== undefined && entry.success !== filters.success) return false;
    
    if (filters.startDate) {
      const entryDate = new Date(entry.timestamp);
      const startDate = new Date(filters.startDate);
      if (entryDate < startDate) return false;
    }
    
    if (filters.endDate) {
      const entryDate = new Date(entry.timestamp);
      const endDate = new Date(filters.endDate);
      if (entryDate > endDate) return false;
    }
    
    return true;
  }

  /**
   * Flush buffer to file
   */
  async flushBuffer() {
    if (this.buffer.length === 0) return;
    
    try {
      const filename = this.getCurrentLogFile();
      const entries = this.buffer.splice(0); // Clear buffer
      
      const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      
      await fs.appendFile(filename, logLines);
      
      // Check file size and rotate if needed
      await this.rotateLogsIfNeeded();
      
    } catch (error) {
      console.error('[AuditLogger] Error flushing buffer:', error);
      // Put entries back in buffer if write failed
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Start flush timer
   */
  startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Get current log file path
   */
  getCurrentLogFile() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDirectory, `audit-${date}.log`);
  }

  /**
   * Get all log files
   */
  async getLogFiles() {
    try {
      const files = await fs.readdir(this.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .map(file => path.join(this.logDirectory, file))
        .sort()
        .reverse(); // Newest first
      
      return logFiles;
    } catch (error) {
      console.error('[AuditLogger] Error getting log files:', error);
      return [];
    }
  }

  /**
   * Rotate logs if needed
   */
  async rotateLogsIfNeeded() {
    try {
      const files = await this.getLogFiles();
      
      // Check current file size
      const currentFile = this.getCurrentLogFile();
      try {
        const stats = await fs.stat(currentFile);
        if (stats.size > this.maxFileSize) {
          // File is too large, it will naturally rotate to next day
          console.log(`[AuditLogger] Log file ${currentFile} is ${stats.size} bytes (max: ${this.maxFileSize})`);
        }
      } catch (statError) {
        // File doesn't exist yet, that's fine
      }
      
      // Remove old files if we have too many
      if (files.length > this.maxFiles) {
        const filesToDelete = files.slice(this.maxFiles);
        for (const file of filesToDelete) {
          await fs.unlink(file);
          console.log(`[AuditLogger] Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('[AuditLogger] Error rotating logs:', error);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Shutdown audit logger
   */
  async shutdown() {
    this.stopFlushTimer();
    await this.flushBuffer();
    console.log('[AuditLogger] Shutdown complete');
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = {
  auditLogger,
  AuditEventType,
  Severity
};