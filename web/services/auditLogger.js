/**
 * Audit Logger Service
 * Provides comprehensive audit logging for configuration changes
 * Requirements: Security aspects of all requirements
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Audit event types
 */
const AuditEventType = {
  // Authentication events
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Configuration events
  CONFIG_VIEW: 'CONFIG_VIEW',
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  CONFIG_IMPORT: 'CONFIG_IMPORT',
  CONFIG_EXPORT: 'CONFIG_EXPORT',
  CONFIG_RESET: 'CONFIG_RESET',
  CONFIG_BACKUP: 'CONFIG_BACKUP',
  CONFIG_RESTORE: 'CONFIG_RESTORE',
  
  // Section-specific events
  CHANNELS_UPDATE: 'CHANNELS_UPDATE',
  ROLES_UPDATE: 'ROLES_UPDATE',
  FEATURES_UPDATE: 'FEATURES_UPDATE',
  APPEARANCE_UPDATE: 'APPEARANCE_UPDATE',
  
  // Template events
  TEMPLATE_APPLY: 'TEMPLATE_APPLY',
  TEMPLATE_CREATE: 'TEMPLATE_CREATE',
  TEMPLATE_DELETE: 'TEMPLATE_DELETE',
  
  // Security events
  SECURITY_CSRF_FAILURE: 'SECURITY_CSRF_FAILURE',
  SECURITY_RATE_LIMIT: 'SECURITY_RATE_LIMIT',
  SECURITY_ACCESS_DENIED: 'SECURITY_ACCESS_DENIED',
  SECURITY_INVALID_INPUT: 'SECURITY_INVALID_INPUT'
};

/**
 * Audit severity levels
 */
const AuditSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

class AuditLogger {
  constructor() {
    this.logDirectory = './logs';
    this.auditLogFile = 'audit.log';
    this.maxLogSize = 50 * 1024 * 1024; // 50MB
    this.maxLogFiles = 10;
    this.inMemoryBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    
    this.initializeLogDirectory();
    this.startFlushInterval();
  }

  /**
   * Initialize log directory
   */
  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  /**
   * Start periodic flush of in-memory buffer
   */
  startFlushInterval() {
    setInterval(() => this.flushBuffer(), this.flushInterval);
  }

  /**
   * Format audit entry
   * @param {Object} entry - Audit entry data
   * @returns {string} Formatted log entry
   */
  formatEntry(entry) {
    return JSON.stringify({
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      severity: entry.severity,
      userId: entry.userId,
      username: entry.username,
      guildId: entry.guildId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestId: entry.requestId,
      action: entry.action,
      details: entry.details,
      changes: entry.changes,
      success: entry.success,
      errorMessage: entry.errorMessage
    });
  }

  /**
   * Log an audit event
   * @param {Object} options - Audit event options
   */
  async log(options) {
    const {
      eventType,
      severity = AuditSeverity.INFO,
      userId,
      username,
      guildId,
      ipAddress,
      userAgent,
      requestId,
      action,
      details = {},
      changes = null,
      success = true,
      errorMessage = null
    } = options;

    const entry = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      userId,
      username,
      guildId,
      ipAddress,
      userAgent,
      requestId,
      action,
      details,
      changes,
      success,
      errorMessage
    };

    // Add to buffer
    this.inMemoryBuffer.push(entry);

    // Flush if buffer is full
    if (this.inMemoryBuffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const color = this.getSeverityColor(severity);
      console.log(`${color}[AUDIT] [${severity}] ${eventType}: ${action}\x1b[0m`);
    }

    return entry;
  }

  /**
   * Get color code for severity level
   */
  getSeverityColor(severity) {
    const colors = {
      INFO: '\x1b[36m',     // Cyan
      WARNING: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m',    // Red
      CRITICAL: '\x1b[35m'  // Magenta
    };
    return colors[severity] || '\x1b[37m';
  }

  /**
   * Flush in-memory buffer to file
   */
  async flushBuffer() {
    if (this.inMemoryBuffer.length === 0) return;

    const entries = [...this.inMemoryBuffer];
    this.inMemoryBuffer = [];

    try {
      const filePath = path.join(this.logDirectory, this.auditLogFile);
      
      // Check file size and rotate if necessary
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > this.maxLogSize) {
          await this.rotateLogFile();
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }

      const logContent = entries.map(e => this.formatEntry(e)).join('\n') + '\n';
      await fs.appendFile(filePath, logContent);
    } catch (error) {
      console.error('Failed to flush audit buffer:', error);
      // Re-add entries to buffer on failure
      this.inMemoryBuffer = [...entries, ...this.inMemoryBuffer];
    }
  }

  /**
   * Rotate log file when it gets too large
   */
  async rotateLogFile() {
    try {
      const baseName = this.auditLogFile.replace('.log', '');
      
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
      const currentFile = path.join(this.logDirectory, this.auditLogFile);
      const rotatedFile = path.join(this.logDirectory, `${baseName}.1.log`);
      
      await fs.rename(currentFile, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate audit log file:', error);
    }
  }

  // ==================== Convenience Methods ====================

  /**
   * Log authentication event
   */
  async logAuth(req, eventType, success, details = {}) {
    return this.log({
      eventType,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: req.user?.userId,
      username: req.user?.username,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: `Authentication: ${eventType}`,
      details,
      success
    });
  }

  /**
   * Log configuration change
   */
  async logConfigChange(req, guildId, section, changes, success = true, errorMessage = null) {
    const eventType = section ? 
      `${section.toUpperCase()}_UPDATE` : 
      AuditEventType.CONFIG_UPDATE;

    return this.log({
      eventType,
      severity: success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      userId: req.user?.userId,
      username: req.user?.username,
      guildId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: `Configuration ${section || 'full'} update`,
      changes,
      success,
      errorMessage
    });
  }

  /**
   * Log configuration import
   */
  async logConfigImport(req, guildId, importedSections, success = true, errorMessage = null) {
    return this.log({
      eventType: AuditEventType.CONFIG_IMPORT,
      severity: success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      userId: req.user?.userId,
      username: req.user?.username,
      guildId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: 'Configuration import',
      details: { importedSections },
      success,
      errorMessage
    });
  }

  /**
   * Log configuration export
   */
  async logConfigExport(req, guildId) {
    return this.log({
      eventType: AuditEventType.CONFIG_EXPORT,
      severity: AuditSeverity.INFO,
      userId: req.user?.userId,
      username: req.user?.username,
      guildId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: 'Configuration export',
      success: true
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(req, eventType, details = {}) {
    return this.log({
      eventType,
      severity: AuditSeverity.WARNING,
      userId: req.user?.userId,
      username: req.user?.username,
      guildId: req.params?.guildId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: `Security event: ${eventType}`,
      details,
      success: false
    });
  }

  /**
   * Log template operation
   */
  async logTemplateOperation(req, guildId, operation, templateName, success = true) {
    const eventTypeMap = {
      apply: AuditEventType.TEMPLATE_APPLY,
      create: AuditEventType.TEMPLATE_CREATE,
      delete: AuditEventType.TEMPLATE_DELETE
    };

    return this.log({
      eventType: eventTypeMap[operation] || 'TEMPLATE_OPERATION',
      severity: AuditSeverity.INFO,
      userId: req.user?.userId,
      username: req.user?.username,
      guildId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      action: `Template ${operation}: ${templateName}`,
      details: { templateName, operation },
      success
    });
  }

  /**
   * Get client IP address
   */
  getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress || req.ip;
  }

  /**
   * Query audit logs (for admin interface)
   */
  async queryLogs(options = {}) {
    const {
      guildId,
      userId,
      eventType,
      startDate,
      endDate,
      limit = 100
    } = options;

    try {
      const filePath = path.join(this.logDirectory, this.auditLogFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      let entries = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null);

      // Apply filters
      if (guildId) {
        entries = entries.filter(e => e.guildId === guildId);
      }
      if (userId) {
        entries = entries.filter(e => e.userId === userId);
      }
      if (eventType) {
        entries = entries.filter(e => e.eventType === eventType);
      }
      if (startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }

      // Sort by timestamp descending and limit
      return entries
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(guildId = null) {
    try {
      const entries = await this.queryLogs({ guildId, limit: 10000 });
      
      const stats = {
        totalEvents: entries.length,
        byEventType: {},
        bySeverity: {},
        byUser: {},
        recentActivity: entries.slice(0, 10)
      };

      entries.forEach(entry => {
        // Count by event type
        stats.byEventType[entry.eventType] = (stats.byEventType[entry.eventType] || 0) + 1;
        
        // Count by severity
        stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
        
        // Count by user
        if (entry.userId) {
          stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const auditLogger = new AuditLogger();

module.exports = {
  auditLogger,
  AuditLogger,
  AuditEventType,
  AuditSeverity
};
