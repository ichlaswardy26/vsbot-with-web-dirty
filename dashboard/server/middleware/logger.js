const fs = require('fs');
const path = require('path');

// Create logs directory if not exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Format log message
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaStr}\n`;
};

// Write to log file
const writeLog = (filename, content) => {
  const logPath = path.join(logsDir, filename);
  fs.appendFileSync(logPath, content, 'utf8');
};

// Logger functions
const logger = {
  error: (message, meta = {}) => {
    const log = formatLog(LOG_LEVELS.ERROR, message, meta);
    writeLog('error.log', log);
    writeLog('combined.log', log);
    console.error(log.trim());
  },
  
  warn: (message, meta = {}) => {
    const log = formatLog(LOG_LEVELS.WARN, message, meta);
    writeLog('combined.log', log);
    console.warn(log.trim());
  },
  
  info: (message, meta = {}) => {
    const log = formatLog(LOG_LEVELS.INFO, message, meta);
    writeLog('combined.log', log);
    console.log(log.trim());
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const log = formatLog(LOG_LEVELS.DEBUG, message, meta);
      writeLog('debug.log', log);
      console.log(log.trim());
    }
  }
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user ? req.user.id : 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.error(`${req.method} ${req.originalUrl}`, log);
    } else {
      logger.info(`${req.method} ${req.originalUrl}`, log);
    }
  });
  
  next();
};

module.exports = {
  logger,
  requestLogger
};
