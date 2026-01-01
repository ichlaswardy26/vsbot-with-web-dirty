/**
 * Rate Limiting Middleware
 * Protect API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * Create rate limiter with custom options
 */
function createLimiter(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  };
  
  return rateLimit({ ...defaults, ...options });
}

/**
 * Rate limiters for different endpoint categories
 */
const limiters = {
  // Authentication endpoints - stricter limits
  auth: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later'
    }
  }),
  
  // Configuration endpoints - moderate limits
  config: createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per 5 minutes
    message: {
      success: false,
      error: 'Too many configuration requests, please slow down'
    }
  }),
  
  // General API endpoints
  api: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
    message: {
      success: false,
      error: 'Rate limit exceeded, please try again later'
    }
  }),
  
  // File upload endpoints - very strict
  upload: createLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
      success: false,
      error: 'Upload limit exceeded, please try again later'
    }
  }),
  
  // Webhook endpoints - moderate limits
  webhook: createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: {
      success: false,
      error: 'Webhook rate limit exceeded'
    }
  })
};

module.exports = {
  createLimiter,
  limiters
};