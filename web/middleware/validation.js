/**
 * Request validation middleware
 */

/**
 * Validate request body size and content type
 */
function validateRequest(options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded'],
    requireContentType = true
  } = options;

  return (req, res, next) => {
    // Check content length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request too large',
        message: `Request size exceeds ${maxSize} bytes`
      });
    }

    // Check content type for POST/PUT requests
    if (requireContentType && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      
      if (!contentType) {
        return res.status(400).json({
          success: false,
          error: 'Missing content type',
          message: 'Content-Type header is required'
        });
      }

      const baseContentType = contentType.split(';')[0].trim();
      if (!allowedContentTypes.includes(baseContentType)) {
        return res.status(415).json({
          success: false,
          error: 'Unsupported content type',
          message: `Content type must be one of: ${allowedContentTypes.join(', ')}`
        });
      }
    }

    next();
  };
}

/**
 * Validate guild ID parameter
 */
function validateGuildId(req, res, next) {
  const { guildId } = req.params;
  
  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'Missing guild ID',
      message: 'Guild ID parameter is required'
    });
  }

  // Discord snowflake validation (18-19 digits)
  if (!/^\d{17,19}$/.test(guildId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid guild ID',
      message: 'Guild ID must be a valid Discord snowflake'
    });
  }

  next();
}

/**
 * Validate configuration section parameter
 */
function validateConfigSection(req, res, next) {
  const { section } = req.params;
  
  if (!section) {
    return res.status(400).json({
      success: false,
      error: 'Missing section',
      message: 'Configuration section parameter is required'
    });
  }

  const validSections = [
    'channels', 'roles', 'features', 'appearance', 
    'leveling', 'economy', 'moderation', 'tickets',
    'voice', 'welcome', 'logs'
  ];

  if (!validSections.includes(section)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid section',
      message: `Section must be one of: ${validSections.join(', ')}`
    });
  }

  next();
}

/**
 * Sanitize input data
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip potentially dangerous properties
    if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
      continue;
    }

    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate JSON structure for configuration
 */
function validateConfigStructure(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      message: 'Request body must be a valid JSON object'
    });
  }

  // Check for required fields based on the endpoint
  const path = req.route.path;
  
  if (path.includes('/import')) {
    // Validate import structure
    const requiredFields = ['guildId'];
    const missingFields = requiredFields.filter(field => !(field in req.body));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }
  }

  next();
}

/**
 * Add request ID for tracking
 */
function addRequestId(req, res, next) {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Log requests for debugging
 */
function logRequest(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`[${req.requestId}] ${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

module.exports = {
  validateRequest,
  validateGuildId,
  validateConfigSection,
  sanitizeInput,
  validateConfigStructure,
  addRequestId,
  logRequest
};