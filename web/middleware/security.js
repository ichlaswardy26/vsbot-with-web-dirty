/**
 * Security Middleware
 * Comprehensive security measures for the web application
 */

const helmet = require('helmet');
const DOMPurify = require('isomorphic-dompurify');
const { auditLogger, AuditEventType, Severity } = require('../services/auditLogger');

/**
 * Enhanced input sanitization middleware
 */
function enhancedSanitization(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query);
  }
  
  next();
}

/**
 * Deep sanitization of objects
 */
function sanitizeDeep(obj) {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      }).trim();
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDeep(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key as well
    const cleanKey = DOMPurify.sanitize(key, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    sanitized[cleanKey] = sanitizeDeep(value);
  }
  
  return sanitized;
}

/**
 * Security headers middleware
 */
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Disable for Socket.IO compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
}

/**
 * Request size limiter middleware
 */
function requestSizeLimiter(maxSize = '10mb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize
      });
    }
    
    next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  if (typeof size === 'number') return size;
  
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Suspicious activity detection middleware
 */
function suspiciousActivityDetector(req, res, next) {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal
    /\.\.[\/\\]/g,
    // Command injection
    /[;&|`$(){}[\]]/g
  ];
  
  const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      // Log suspicious activity
      auditLogger.logSecurity(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        req,
        `Suspicious pattern detected: ${pattern.source}`,
        Severity.WARNING
      );
      
      return res.status(400).json({
        success: false,
        error: 'Request contains suspicious content'
      });
    }
  }
  
  next();
}

/**
 * Session security enhancements
 */
function sessionSecurity(req, res, next) {
  if (req.session) {
    // Regenerate session ID periodically
    const now = Date.now();
    const lastRegeneration = req.session.lastRegeneration || 0;
    const regenerationInterval = 30 * 60 * 1000; // 30 minutes
    
    if (now - lastRegeneration > regenerationInterval) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Security] Session regeneration failed:', err);
        } else {
          req.session.lastRegeneration = now;
        }
        next();
      });
      return;
    }
    
    // Check for session hijacking indicators
    const currentFingerprint = generateFingerprint(req);
    const storedFingerprint = req.session.fingerprint;
    
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      // Potential session hijacking
      auditLogger.logSecurity(
        AuditEventType.SECURITY_VIOLATION,
        req,
        'Potential session hijacking detected - fingerprint mismatch',
        Severity.CRITICAL
      );
      
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'Session security violation detected'
      });
    }
    
    if (!storedFingerprint) {
      req.session.fingerprint = currentFingerprint;
    }
  }
  
  next();
}

/**
 * Generate browser fingerprint for session security
 */
function generateFingerprint(req) {
  const crypto = require('crypto');
  
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.connection.remoteAddress || req.ip || ''
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

/**
 * Audit middleware for logging requests
 */
function auditMiddleware(req, res, next) {
  // Only audit state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the request after response is sent
      setImmediate(() => {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        
        auditLogger.log(AuditEventType.CONFIG_CHANGE, {
          userId: req.user?.id,
          username: req.user?.username,
          guildId: req.params?.guildId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId,
          message: `${req.method} ${req.path} - ${res.statusCode}`,
          severity: isSuccess ? Severity.INFO : Severity.WARNING,
          success: isSuccess,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            body: req.body,
            query: req.query
          }
        });
      });
      
      originalSend.call(this, data);
    };
  }
  
  next();
}

module.exports = {
  enhancedSanitization,
  securityHeaders,
  requestSizeLimiter,
  suspiciousActivityDetector,
  sessionSecurity,
  auditMiddleware
};