/**
 * Comprehensive Error Handler for Web Dashboard
 * Provides structured error handling, logging, and recovery mechanisms.
 * 
 * Requirements: All error scenarios across requirements
 */

const logger = require('../../util/logger');

/**
 * Error codes for categorization
 */
const ErrorCodes = {
  // Authentication errors (1xxx)
  AUTH_REQUIRED: 'AUTH_1001',
  AUTH_INVALID_TOKEN: 'AUTH_1002',
  AUTH_SESSION_EXPIRED: 'AUTH_1003',
  AUTH_PERMISSION_DENIED: 'AUTH_1004',
  AUTH_GUILD_ACCESS_DENIED: 'AUTH_1005',
  
  // Validation errors (2xxx)
  VALIDATION_FAILED: 'VAL_2001',
  VALIDATION_INVALID_INPUT: 'VAL_2002',
  VALIDATION_MISSING_FIELD: 'VAL_2003',
  VALIDATION_INVALID_FORMAT: 'VAL_2004',
  VALIDATION_CONFLICT: 'VAL_2005',
  
  // Configuration errors (3xxx)
  CONFIG_NOT_FOUND: 'CFG_3001',
  CONFIG_UPDATE_FAILED: 'CFG_3002',
  CONFIG_IMPORT_FAILED: 'CFG_3003',
  CONFIG_EXPORT_FAILED: 'CFG_3004',
  CONFIG_INVALID_SECTION: 'CFG_3005',
  
  // Discord API errors (4xxx)
  DISCORD_API_ERROR: 'DISC_4001',
  DISCORD_RATE_LIMITED: 'DISC_4002',
  DISCORD_UNAVAILABLE: 'DISC_4003',
  DISCORD_INVALID_CHANNEL: 'DISC_4004',
  DISCORD_INVALID_ROLE: 'DISC_4005',
  
  // Database errors (5xxx)
  DB_CONNECTION_ERROR: 'DB_5001',
  DB_QUERY_ERROR: 'DB_5002',
  DB_TIMEOUT: 'DB_5003',
  DB_DUPLICATE_KEY: 'DB_5004',
  
  // Server errors (6xxx)
  SERVER_INTERNAL_ERROR: 'SRV_6001',
  SERVER_TIMEOUT: 'SRV_6002',
  SERVER_OVERLOADED: 'SRV_6003',
  
  // WebSocket errors (7xxx)
  WS_CONNECTION_ERROR: 'WS_7001',
  WS_BROADCAST_ERROR: 'WS_7002',
  WS_AUTH_ERROR: 'WS_7003'
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  [ErrorCodes.AUTH_REQUIRED]: 'Please log in to access this feature.',
  [ErrorCodes.AUTH_INVALID_TOKEN]: 'Your session is invalid. Please log in again.',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.AUTH_PERMISSION_DENIED]: 'You do not have permission to perform this action.',
  [ErrorCodes.AUTH_GUILD_ACCESS_DENIED]: 'You do not have access to this server\'s configuration.',
  
  [ErrorCodes.VALIDATION_FAILED]: 'The provided data is invalid. Please check your input.',
  [ErrorCodes.VALIDATION_INVALID_INPUT]: 'Invalid input provided. Please check the format.',
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 'Required field is missing.',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'The format of the provided data is incorrect.',
  [ErrorCodes.VALIDATION_CONFLICT]: 'Configuration conflict detected. Please resolve before saving.',
  
  [ErrorCodes.CONFIG_NOT_FOUND]: 'Configuration not found for this server.',
  [ErrorCodes.CONFIG_UPDATE_FAILED]: 'Failed to update configuration. Please try again.',
  [ErrorCodes.CONFIG_IMPORT_FAILED]: 'Failed to import configuration. Please check the file format.',
  [ErrorCodes.CONFIG_EXPORT_FAILED]: 'Failed to export configuration. Please try again.',
  [ErrorCodes.CONFIG_INVALID_SECTION]: 'Invalid configuration section specified.',
  
  [ErrorCodes.DISCORD_API_ERROR]: 'Discord API error occurred. Please try again later.',
  [ErrorCodes.DISCORD_RATE_LIMITED]: 'Too many requests to Discord. Please wait a moment.',
  [ErrorCodes.DISCORD_UNAVAILABLE]: 'Discord API is currently unavailable. Some features may be limited.',
  [ErrorCodes.DISCORD_INVALID_CHANNEL]: 'The specified channel does not exist or is inaccessible.',
  [ErrorCodes.DISCORD_INVALID_ROLE]: 'The specified role does not exist or is inaccessible.',
  
  [ErrorCodes.DB_CONNECTION_ERROR]: 'Database connection error. Please try again later.',
  [ErrorCodes.DB_QUERY_ERROR]: 'Database error occurred. Please try again.',
  [ErrorCodes.DB_TIMEOUT]: 'Database operation timed out. Please try again.',
  [ErrorCodes.DB_DUPLICATE_KEY]: 'This item already exists.',
  
  [ErrorCodes.SERVER_INTERNAL_ERROR]: 'An internal server error occurred. Please try again.',
  [ErrorCodes.SERVER_TIMEOUT]: 'The request timed out. Please try again.',
  [ErrorCodes.SERVER_OVERLOADED]: 'Server is currently busy. Please try again later.',
  
  [ErrorCodes.WS_CONNECTION_ERROR]: 'Real-time connection error. Updates may be delayed.',
  [ErrorCodes.WS_BROADCAST_ERROR]: 'Failed to broadcast update. Please refresh the page.',
  [ErrorCodes.WS_AUTH_ERROR]: 'WebSocket authentication failed. Please refresh the page.'
};


/**
 * Troubleshooting guidance for errors
 */
const TroubleshootingGuide = {
  [ErrorCodes.AUTH_REQUIRED]: [
    'Click the login button to authenticate with Discord',
    'Make sure cookies are enabled in your browser'
  ],
  [ErrorCodes.AUTH_SESSION_EXPIRED]: [
    'Click the login button to re-authenticate',
    'Your session automatically expires after 7 days of inactivity'
  ],
  [ErrorCodes.AUTH_PERMISSION_DENIED]: [
    'Contact a server administrator to request access',
    'You need Administrator or Manage Server permission'
  ],
  [ErrorCodes.AUTH_GUILD_ACCESS_DENIED]: [
    'Make sure you have the required role in the Discord server',
    'Contact the server owner if you believe this is an error'
  ],
  [ErrorCodes.VALIDATION_FAILED]: [
    'Check all required fields are filled in',
    'Ensure values are within allowed ranges',
    'Look for highlighted fields with error messages'
  ],
  [ErrorCodes.CONFIG_IMPORT_FAILED]: [
    'Ensure the file is a valid JSON configuration export',
    'Check that the file was exported from this bot',
    'Try exporting a fresh configuration and comparing formats'
  ],
  [ErrorCodes.DISCORD_UNAVAILABLE]: [
    'Check Discord status at status.discord.com',
    'Wait a few minutes and try again',
    'Some validation features may be temporarily unavailable'
  ],
  [ErrorCodes.DISCORD_RATE_LIMITED]: [
    'Wait 30-60 seconds before trying again',
    'Reduce the frequency of your requests'
  ],
  [ErrorCodes.DB_CONNECTION_ERROR]: [
    'Check your internet connection',
    'Wait a few moments and try again',
    'Contact support if the issue persists'
  ],
  [ErrorCodes.SERVER_TIMEOUT]: [
    'Check your internet connection',
    'Try refreshing the page',
    'If saving, your changes may have been partially applied'
  ]
};

/**
 * Custom error class for web dashboard errors
 */
class WebDashboardError extends Error {
  constructor(code, message, details = {}) {
    super(message || ErrorMessages[code] || 'An unknown error occurred');
    this.name = 'WebDashboardError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.userMessage = ErrorMessages[code] || this.message;
    this.troubleshooting = TroubleshootingGuide[code] || [];
    this.recoverable = this.isRecoverable(code);
  }

  isRecoverable(code) {
    // Errors that can potentially be recovered from
    const recoverableCodes = [
      ErrorCodes.AUTH_SESSION_EXPIRED,
      ErrorCodes.DISCORD_RATE_LIMITED,
      ErrorCodes.DISCORD_UNAVAILABLE,
      ErrorCodes.DB_TIMEOUT,
      ErrorCodes.SERVER_TIMEOUT,
      ErrorCodes.SERVER_OVERLOADED,
      ErrorCodes.WS_CONNECTION_ERROR
    ];
    return recoverableCodes.includes(code);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        details: this.details,
        troubleshooting: this.troubleshooting,
        recoverable: this.recoverable,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Error handler class for centralized error management
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 1000;
    this.retryAttempts = new Map(); // Track retry attempts per request
    this.maxRetries = 3;
  }

  /**
   * Create a standardized error response
   */
  createError(code, customMessage = null, details = {}) {
    return new WebDashboardError(code, customMessage, details);
  }

  /**
   * Handle and log an error
   */
  async handleError(error, context = {}) {
    const errorEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: error instanceof WebDashboardError ? error : this.normalizeError(error),
      context,
      stack: error.stack
    };

    // Add to in-memory log
    this.errorLog.unshift(errorEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    // Log to file system
    await this.logError(errorEntry);

    return errorEntry;
  }

  /**
   * Normalize external errors to WebDashboardError format
   */
  normalizeError(error) {
    // MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        return new WebDashboardError(ErrorCodes.DB_DUPLICATE_KEY, null, { originalError: error.message });
      }
      return new WebDashboardError(ErrorCodes.DB_QUERY_ERROR, null, { originalError: error.message });
    }

    // Mongoose errors
    if (error.name === 'ValidationError') {
      return new WebDashboardError(ErrorCodes.VALIDATION_FAILED, null, { 
        fields: Object.keys(error.errors || {}),
        originalError: error.message 
      });
    }

    // Discord API errors
    if (error.code && error.code >= 10000 && error.code < 100000) {
      if (error.code === 50001) {
        return new WebDashboardError(ErrorCodes.AUTH_PERMISSION_DENIED, null, { discordCode: error.code });
      }
      if (error.code === 50013) {
        return new WebDashboardError(ErrorCodes.DISCORD_INVALID_ROLE, null, { discordCode: error.code });
      }
      return new WebDashboardError(ErrorCodes.DISCORD_API_ERROR, null, { discordCode: error.code });
    }

    // Rate limit errors
    if (error.message && error.message.includes('rate limit')) {
      return new WebDashboardError(ErrorCodes.DISCORD_RATE_LIMITED, null, { originalError: error.message });
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return new WebDashboardError(ErrorCodes.SERVER_TIMEOUT, null, { originalError: error.message });
    }

    // Connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new WebDashboardError(ErrorCodes.DB_CONNECTION_ERROR, null, { originalError: error.message });
    }

    // Default to internal server error
    return new WebDashboardError(ErrorCodes.SERVER_INTERNAL_ERROR, error.message, { 
      originalError: error.message 
    });
  }

  /**
   * Log error to file system
   */
  async logError(errorEntry) {
    const logData = {
      id: errorEntry.id,
      timestamp: new Date(errorEntry.timestamp).toISOString(),
      code: errorEntry.error.code,
      message: errorEntry.error.message,
      context: errorEntry.context,
      stack: errorEntry.stack
    };

    await logger.logError(
      { message: errorEntry.error.message, stack: errorEntry.stack },
      'WEB_DASHBOARD',
      logData
    );
  }

  /**
   * Check if an operation should be retried
   */
  shouldRetry(requestId, error) {
    if (!error.recoverable) return false;

    const attempts = this.retryAttempts.get(requestId) || 0;
    if (attempts >= this.maxRetries) {
      this.retryAttempts.delete(requestId);
      return false;
    }

    this.retryAttempts.set(requestId, attempts + 1);
    return true;
  }

  /**
   * Get retry delay based on attempt number (exponential backoff)
   */
  getRetryDelay(requestId) {
    const attempts = this.retryAttempts.get(requestId) || 1;
    return Math.min(1000 * Math.pow(2, attempts - 1), 10000); // Max 10 seconds
  }

  /**
   * Clear retry attempts for a request
   */
  clearRetryAttempts(requestId) {
    this.retryAttempts.delete(requestId);
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count = 50) {
    return this.errorLog.slice(0, count);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCode: {},
      byHour: {},
      recoverable: 0,
      nonRecoverable: 0
    };

    for (const entry of this.errorLog) {
      // Count by code
      const code = entry.error.code || 'UNKNOWN';
      stats.byCode[code] = (stats.byCode[code] || 0) + 1;

      // Count by hour
      const hour = new Date(entry.timestamp).toISOString().slice(0, 13);
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      // Count recoverable vs non-recoverable
      if (entry.error.recoverable) {
        stats.recoverable++;
      } else {
        stats.nonRecoverable++;
      }
    }

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

// Singleton instance
const errorHandler = new ErrorHandler();

/**
 * Express error handling middleware
 */
function errorMiddleware(err, req, res, next) {
  // Handle the error
  const context = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    guildId: req.params?.guildId,
    ip: req.ip
  };

  errorHandler.handleError(err, context).then(errorEntry => {
    const normalizedError = errorEntry.error;
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Determine HTTP status code
    let statusCode = 500;
    if (normalizedError.code?.startsWith('AUTH_')) statusCode = 401;
    else if (normalizedError.code?.startsWith('VAL_')) statusCode = 400;
    else if (normalizedError.code === ErrorCodes.AUTH_PERMISSION_DENIED) statusCode = 403;
    else if (normalizedError.code === ErrorCodes.CONFIG_NOT_FOUND) statusCode = 404;
    else if (normalizedError.code === ErrorCodes.DISCORD_RATE_LIMITED) statusCode = 429;

    // Build response
    const response = {
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.userMessage,
        troubleshooting: normalizedError.troubleshooting,
        recoverable: normalizedError.recoverable,
        requestId: req.requestId
      }
    };

    // Add debug info in development
    if (isDevelopment) {
      response.error.debug = {
        originalMessage: err.message,
        stack: err.stack,
        details: normalizedError.details
      };
    }

    res.status(statusCode).json(response);
  }).catch(logError => {
    // Fallback if error handling itself fails
    console.error('Error in error handler:', logError);
    res.status(500).json({
      success: false,
      error: {
        code: 'SRV_6001',
        message: 'An internal server error occurred. Please try again.',
        requestId: req.requestId
      }
    });
  });
}

/**
 * Async route wrapper for automatic error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ErrorCodes,
  ErrorMessages,
  TroubleshootingGuide,
  WebDashboardError,
  ErrorHandler,
  errorHandler,
  errorMiddleware,
  asyncHandler
};
