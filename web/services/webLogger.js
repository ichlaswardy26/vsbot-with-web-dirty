/**
 * Web Dashboard Logger Service
 * Provides structured logging specifically for web dashboard operations.
 * 
 * Requirements: All error scenarios across requirements
 */

const logger = require('../../util/logger');

/**
 * Log categories for web dashboard
 */
const LogCategories = {
  AUTH: 'WEB_AUTH',
  CONFIG: 'WEB_CONFIG',
  API: 'WEB_API',
  WEBSOCKET: 'WEB_WEBSOCKET',
  VALIDATION: 'WEB_VALIDATION',
  DISCORD: 'WEB_DISCORD',
  TEMPLATE: 'WEB_TEMPLATE',
  IMPORT_EXPORT: 'WEB_IMPORT_EXPORT',
  SECURITY: 'WEB_SECURITY',
  PERFORMANCE: 'WEB_PERFORMANCE'
};

/**
 * Web Logger class with specialized logging methods
 */
class WebLogger {
  constructor() {
    this.requestLogs = new Map(); // requestId -> log entries
    this.maxRequestLogs = 100;
  }

  /**
   * Log authentication events
   */
  async logAuth(event, userId, details = {}) {
    const message = this.formatAuthMessage(event, userId);
    await logger.log('INFO', LogCategories.AUTH, message, {
      event,
      userId,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log authentication failures
   */
  async logAuthFailure(event, reason, details = {}) {
    const message = `Authentication failed: ${event} - ${reason}`;
    await logger.log('WARN', LogCategories.AUTH, message, {
      event,
      reason,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log configuration changes
   */
  async logConfigChange(guildId, userId, section, action, details = {}) {
    const message = `Config ${action}: ${section} in guild ${guildId} by user ${userId}`;
    await logger.log('INFO', LogCategories.CONFIG, message, {
      guildId,
      userId,
      section,
      action,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log configuration errors
   */
  async logConfigError(guildId, section, error, details = {}) {
    const message = `Config error in ${section} for guild ${guildId}: ${error.message || error}`;
    await logger.log('ERROR', LogCategories.CONFIG, message, {
      guildId,
      section,
      error: error.message || error,
      stack: error.stack,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log API requests
   */
  async logApiRequest(requestId, method, path, userId, details = {}) {
    const message = `API ${method} ${path} by user ${userId || 'anonymous'}`;
    await logger.log('DEBUG', LogCategories.API, message, {
      requestId,
      method,
      path,
      userId,
      ...details,
      timestamp: Date.now()
    });

    // Store in request logs for debugging
    this.addRequestLog(requestId, { type: 'request', method, path, userId, timestamp: Date.now() });
  }

  /**
   * Log API responses
   */
  async logApiResponse(requestId, statusCode, duration, details = {}) {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'DEBUG';
    const message = `API response ${statusCode} in ${duration}ms`;
    await logger.log(level, LogCategories.API, message, {
      requestId,
      statusCode,
      duration,
      ...details,
      timestamp: Date.now()
    });

    // Update request log
    this.addRequestLog(requestId, { type: 'response', statusCode, duration, timestamp: Date.now() });
  }

  /**
   * Log WebSocket events
   */
  async logWebSocket(event, socketId, details = {}) {
    const message = `WebSocket ${event}: ${socketId}`;
    await logger.log('DEBUG', LogCategories.WEBSOCKET, message, {
      event,
      socketId,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log WebSocket errors
   */
  async logWebSocketError(event, socketId, error, details = {}) {
    const message = `WebSocket error ${event}: ${error.message || error}`;
    await logger.log('ERROR', LogCategories.WEBSOCKET, message, {
      event,
      socketId,
      error: error.message || error,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log validation events
   */
  async logValidation(type, field, isValid, details = {}) {
    const level = isValid ? 'DEBUG' : 'WARN';
    const status = isValid ? 'passed' : 'failed';
    const message = `Validation ${status}: ${type} - ${field}`;
    await logger.log(level, LogCategories.VALIDATION, message, {
      type,
      field,
      isValid,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log Discord API interactions
   */
  async logDiscordApi(action, guildId, success, details = {}) {
    const level = success ? 'DEBUG' : 'WARN';
    const status = success ? 'success' : 'failed';
    const message = `Discord API ${action} ${status} for guild ${guildId}`;
    await logger.log(level, LogCategories.DISCORD, message, {
      action,
      guildId,
      success,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log template operations
   */
  async logTemplate(action, templateId, userId, details = {}) {
    const message = `Template ${action}: ${templateId} by user ${userId}`;
    await logger.log('INFO', LogCategories.TEMPLATE, message, {
      action,
      templateId,
      userId,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log import/export operations
   */
  async logImportExport(action, guildId, userId, success, details = {}) {
    const level = success ? 'INFO' : 'WARN';
    const status = success ? 'success' : 'failed';
    const message = `${action} ${status} for guild ${guildId} by user ${userId}`;
    await logger.log(level, LogCategories.IMPORT_EXPORT, message, {
      action,
      guildId,
      userId,
      success,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log security events
   */
  async logSecurity(event, severity, details = {}) {
    const level = severity === 'high' ? 'ERROR' : severity === 'medium' ? 'WARN' : 'INFO';
    const message = `Security event: ${event}`;
    await logger.log(level, LogCategories.SECURITY, message, {
      event,
      severity,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log performance metrics
   */
  async logPerformance(metric, value, unit, details = {}) {
    const message = `Performance: ${metric} = ${value}${unit}`;
    await logger.log('DEBUG', LogCategories.PERFORMANCE, message, {
      metric,
      value,
      unit,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Format authentication message
   */
  formatAuthMessage(event, userId) {
    const messages = {
      'login': `User ${userId} logged in`,
      'logout': `User ${userId} logged out`,
      'session_created': `Session created for user ${userId}`,
      'session_expired': `Session expired for user ${userId}`,
      'permission_check': `Permission check for user ${userId}`,
      'guild_access': `Guild access check for user ${userId}`
    };
    return messages[event] || `Auth event ${event} for user ${userId}`;
  }

  /**
   * Add entry to request log
   */
  addRequestLog(requestId, entry) {
    if (!this.requestLogs.has(requestId)) {
      this.requestLogs.set(requestId, []);
    }
    this.requestLogs.get(requestId).push(entry);

    // Cleanup old request logs
    if (this.requestLogs.size > this.maxRequestLogs) {
      const oldestKey = this.requestLogs.keys().next().value;
      this.requestLogs.delete(oldestKey);
    }
  }

  /**
   * Get request log for debugging
   */
  getRequestLog(requestId) {
    return this.requestLogs.get(requestId) || [];
  }

  /**
   * Clear request logs
   */
  clearRequestLogs() {
    this.requestLogs.clear();
  }
}

// Singleton instance
const webLogger = new WebLogger();

/**
 * Express middleware for request/response logging
 */
function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();

  // Log request
  webLogger.logApiRequest(
    req.requestId,
    req.method,
    req.path,
    req.user?.id,
    {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      contentLength: req.headers['content-length'],
      userAgent: req.headers['user-agent']
    }
  );

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    webLogger.logApiResponse(
      req.requestId,
      res.statusCode,
      duration,
      {
        contentLength: res.get('content-length')
      }
    );
  });

  next();
}

module.exports = {
  LogCategories,
  WebLogger,
  webLogger,
  requestLoggingMiddleware
};
