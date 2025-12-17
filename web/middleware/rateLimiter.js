/**
 * Rate limiting middleware for web dashboard
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanup();
  }

  /**
   * Create rate limiting middleware
   */
  createLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 100,
      message = 'Too many requests, please try again later',
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return (req, res, next) => {
      const key = this.getKey(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create request log for this key
      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const requestLog = this.requests.get(key);

      // Remove old requests outside the window
      const validRequests = requestLog.filter(timestamp => timestamp > windowStart);
      this.requests.set(key, validRequests);

      // Check if limit exceeded
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: message,
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      validRequests.push(now);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - validRequests.length),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      // Handle response to potentially skip counting
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        
        // Remove request from log if we should skip it
        if ((skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)) {
          const currentLog = rateLimiter.requests.get(key) || [];
          currentLog.pop(); // Remove the last added request
          rateLimiter.requests.set(key, currentLog);
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Get rate limiting key for request
   */
  getKey(req) {
    // Use user ID if authenticated, otherwise IP address
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    
    // Get IP address, considering proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
    return `ip:${ip}`;
  }

  /**
   * Clean up old entries periodically
   */
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const [key, requests] of this.requests.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > now - maxAge);
        
        if (validRequests.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, validRequests);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Clear all rate limit data
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      totalKeys: this.requests.size,
      totalRequests: Array.from(this.requests.values())
        .reduce((sum, requests) => sum + requests.length, 0)
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Predefined limiters for different endpoints
const limiters = {
  // General API rate limit
  api: rateLimiter.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests'
  }),

  // Authentication rate limit (stricter)
  auth: rateLimiter.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts'
  }),

  // Configuration updates (moderate)
  config: rateLimiter.createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    message: 'Too many configuration updates'
  }),

  // File operations (stricter)
  files: rateLimiter.createLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,
    message: 'Too many file operations'
  })
};

module.exports = {
  RateLimiter,
  rateLimiter,
  limiters
};