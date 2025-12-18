/**
 * Security Middleware
 * Combines all security measures for the web dashboard
 * Requirements: Security aspects of all requirements
 */

const { auditLogger, AuditEventType } = require('../services/auditLogger');

/**
 * Enhanced input sanitization with deep object traversal
 * Prevents XSS, prototype pollution, and injection attacks
 */
function deepSanitize(obj, depth = 0, maxDepth = 10) {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return null;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, depth + 1, maxDepth));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous property names (prototype pollution prevention)
      if (isDangerousKey(key)) {
        continue;
      }
      
      // Sanitize key name
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = deepSanitize(value, depth + 1, maxDepth);
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Check if a key name is potentially dangerous
 */
function isDangerousKey(key) {
  const dangerousKeys = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
  ];
  
  return dangerousKeys.includes(key) || key.startsWith('__');
}

/**
 * Sanitize a string value
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove data: protocol for images (potential XSS vector)
    .replace(/data:text\/html/gi, '')
    // Encode HTML entities for display
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Limit string length to prevent DoS
    .substring(0, 10000);
}

/**
 * Validate Discord snowflake ID format
 */
function isValidSnowflake(id) {
  return /^\d{17,19}$/.test(id);
}

/**
 * Validate hex color code
 */
function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Enhanced input sanitization middleware
 */
function enhancedSanitization(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query);
  }
  
  next();
}

/**
 * Security headers middleware
 * Adds comprehensive security headers to all responses
 */
function securityHeaders(options = {}) {
  const {
    enableHSTS = process.env.NODE_ENV === 'production',
    hstsMaxAge = 31536000,
    enableCSP = true,
    reportUri = null
  } = options;

  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Prevent DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Disable caching for sensitive pages
    if (req.path.includes('/api/') || req.path.includes('/auth/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Content Security Policy
    if (enableCSP) {
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.socket.io https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' ws: wss: https://cdn.jsdelivr.net",
        "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com data:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ];
      
      if (reportUri) {
        cspDirectives.push(`report-uri ${reportUri}`);
      }
      
      res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    }
    
    // HTTP Strict Transport Security
    if (enableHSTS) {
      res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains; preload`);
    }
    
    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
    
    next();
  };
}

/**
 * Request size limiter middleware
 * Prevents DoS attacks via large payloads
 */
function requestSizeLimiter(options = {}) {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB
    maxUrlLength = 2048,
    maxHeaderSize = 8192
  } = options;

  return (req, res, next) => {
    // Check URL length
    if (req.url.length > maxUrlLength) {
      auditLogger.logSecurityEvent(req, AuditEventType.SECURITY_INVALID_INPUT, {
        reason: 'URL too long',
        urlLength: req.url.length
      });
      
      return res.status(414).json({
        success: false,
        error: 'URI Too Long',
        message: 'The request URL exceeds the maximum allowed length'
      });
    }
    
    // Check content length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxBodySize) {
      auditLogger.logSecurityEvent(req, AuditEventType.SECURITY_INVALID_INPUT, {
        reason: 'Request body too large',
        contentLength
      });
      
      return res.status(413).json({
        success: false,
        error: 'Payload Too Large',
        message: 'The request body exceeds the maximum allowed size'
      });
    }
    
    next();
  };
}

/**
 * Suspicious activity detector middleware
 * Detects and logs potentially malicious requests
 */
function suspiciousActivityDetector(req, res, next) {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
    // Path traversal
    /\.\.\//,
    // Command injection
    /[;&|`$]/,
    // Common attack payloads
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i
  ];

  const checkValue = (value, location) => {
    if (typeof value !== 'string') return;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        auditLogger.logSecurityEvent(req, AuditEventType.SECURITY_INVALID_INPUT, {
          reason: 'Suspicious pattern detected',
          location,
          pattern: pattern.toString()
        });
        return true;
      }
    }
    return false;
  };

  // Check URL
  if (checkValue(req.url, 'url')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request',
      message: 'The request contains invalid characters'
    });
  }

  // Check query parameters
  for (const [key, value] of Object.entries(req.query || {})) {
    if (checkValue(key, 'query.key') || checkValue(value, 'query.value')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'The request contains invalid characters'
      });
    }
  }

  next();
}

/**
 * Session security middleware
 * Enhances session security with additional checks
 */
function sessionSecurity(req, res, next) {
  if (!req.session) {
    return next();
  }

  // Regenerate session ID periodically to prevent session fixation
  const now = Date.now();
  const sessionAge = now - (req.session.createdAt || now);
  const regenerateInterval = 30 * 60 * 1000; // 30 minutes

  if (sessionAge > regenerateInterval && req.session.regenerate) {
    const oldSession = { ...req.session };
    
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration failed:', err);
        return next();
      }
      
      // Restore session data
      Object.assign(req.session, oldSession);
      req.session.createdAt = now;
      next();
    });
  } else {
    if (!req.session.createdAt) {
      req.session.createdAt = now;
    }
    next();
  }
}

/**
 * IP-based blocking middleware
 * Blocks requests from known malicious IPs
 */
function ipBlocker(blockedIps = []) {
  const blockedSet = new Set(blockedIps);

  return (req, res, next) => {
    const clientIp = getClientIp(req);
    
    if (blockedSet.has(clientIp)) {
      auditLogger.logSecurityEvent(req, AuditEventType.SECURITY_ACCESS_DENIED, {
        reason: 'Blocked IP address',
        ip: clientIp
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address has been blocked'
      });
    }
    
    next();
  };
}

/**
 * Get client IP address
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress || req.ip;
}

/**
 * Audit logging middleware for all requests
 */
function auditMiddleware(req, res, next) {
  // Store original end function
  const originalEnd = res.end;
  const startTime = Date.now();

  // Override end to capture response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    // Log state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Determine event type based on path
      let eventType = AuditEventType.CONFIG_UPDATE;
      if (req.path.includes('/import')) {
        eventType = AuditEventType.CONFIG_IMPORT;
      } else if (req.path.includes('/export')) {
        eventType = AuditEventType.CONFIG_EXPORT;
      } else if (req.path.includes('/template')) {
        eventType = AuditEventType.TEMPLATE_APPLY;
      } else if (req.path.includes('/auth')) {
        eventType = success ? AuditEventType.AUTH_LOGIN : AuditEventType.AUTH_FAILED;
      }

      auditLogger.log({
        eventType,
        userId: req.user?.userId,
        username: req.user?.username,
        guildId: req.params?.guildId,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        action: `${req.method} ${req.path}`,
        details: {
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length')
        },
        success
      });
    }
  };

  next();
}

module.exports = {
  deepSanitize,
  sanitizeString,
  isDangerousKey,
  isValidSnowflake,
  isValidHexColor,
  isValidUrl,
  enhancedSanitization,
  securityHeaders,
  requestSizeLimiter,
  suspiciousActivityDetector,
  sessionSecurity,
  ipBlocker,
  auditMiddleware,
  getClientIp
};
