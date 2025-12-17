/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Requirements: Security aspects of all requirements
 */

const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or similar)
const tokenStore = new Map();

// Token configuration
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const COOKIE_NAME = 'csrf_token';
const HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Create CSRF token and store it
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
function createToken(sessionId) {
  const token = generateToken();
  const expiry = Date.now() + TOKEN_EXPIRY;
  
  // Store token with session association
  tokenStore.set(token, {
    sessionId,
    expiry,
    createdAt: Date.now()
  });
  
  return token;
}

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @param {string} sessionId - User session ID
 * @returns {boolean} Whether token is valid
 */
function validateToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }
  
  const tokenData = tokenStore.get(token);
  
  if (!tokenData) {
    return false;
  }
  
  // Check expiry
  if (Date.now() > tokenData.expiry) {
    tokenStore.delete(token);
    return false;
  }
  
  // Check session association
  if (tokenData.sessionId !== sessionId) {
    return false;
  }
  
  return true;
}

/**
 * Invalidate a CSRF token (single use)
 * @param {string} token - Token to invalidate
 */
function invalidateToken(token) {
  tokenStore.delete(token);
}

/**
 * Clean up expired tokens periodically
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiry) {
      tokenStore.delete(token);
    }
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupExpiredTokens, 15 * 60 * 1000);

/**
 * CSRF protection middleware
 * Generates token for GET requests, validates for state-changing requests
 */
function csrfProtection(options = {}) {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths = [],
    cookieOptions = {}
  } = options;
  
  return (req, res, next) => {
    // Get session ID
    const sessionId = req.sessionID || req.user?.userId || req.ip;
    
    // Skip CSRF for ignored methods
    if (ignoreMethods.includes(req.method)) {
      // Generate and set token for GET requests
      const token = createToken(sessionId);
      
      // Set token in cookie
      res.cookie(COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY,
        ...cookieOptions
      });
      
      // Also expose via response header for SPA
      res.setHeader('X-CSRF-Token', token);
      
      // Make token available to templates
      res.locals.csrfToken = token;
      
      return next();
    }
    
    // Skip CSRF for ignored paths
    if (ignorePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Validate CSRF token for state-changing requests
    const tokenFromHeader = req.headers[HEADER_NAME];
    const tokenFromBody = req.body?._csrf;
    const tokenFromCookie = req.cookies?.[COOKIE_NAME];
    
    const submittedToken = tokenFromHeader || tokenFromBody;
    
    if (!submittedToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        message: 'A valid CSRF token is required for this request',
        code: 'CSRF_TOKEN_MISSING'
      });
    }
    
    // Validate token
    if (!validateToken(submittedToken, sessionId)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        message: 'The CSRF token is invalid or has expired',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
    
    // Optionally invalidate token after use (single-use tokens)
    // invalidateToken(submittedToken);
    
    // Generate new token for next request
    const newToken = createToken(sessionId);
    res.cookie(COOKIE_NAME, newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY,
      ...cookieOptions
    });
    res.setHeader('X-CSRF-Token', newToken);
    
    next();
  };
}

/**
 * Get CSRF token endpoint handler
 * For SPAs that need to fetch token via API
 */
function getCsrfToken(req, res) {
  const sessionId = req.sessionID || req.user?.userId || req.ip;
  const token = createToken(sessionId);
  
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY
  });
  
  res.json({
    success: true,
    token
  });
}

/**
 * Get current token stats (for debugging)
 */
function getTokenStats() {
  return {
    totalTokens: tokenStore.size,
    oldestToken: Math.min(...Array.from(tokenStore.values()).map(t => t.createdAt)),
    newestToken: Math.max(...Array.from(tokenStore.values()).map(t => t.createdAt))
  };
}

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateToken,
  createToken,
  validateToken,
  invalidateToken,
  getTokenStats,
  COOKIE_NAME,
  HEADER_NAME
};
