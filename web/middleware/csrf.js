/**
 * CSRF Protection Middleware
 * Cross-Site Request Forgery protection
 */

const crypto = require('crypto');

/**
 * Generate CSRF token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF protection middleware
 */
function csrfProtection(options = {}) {
  const { ignorePaths = [] } = options;
  
  return (req, res, next) => {
    // Skip CSRF for ignored paths
    if (ignorePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get token from header or body
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token'
      });
    }
    
    next();
  };
}

/**
 * Get CSRF token endpoint
 */
function getCsrfToken(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  
  res.json({
    success: true,
    csrfToken: req.session.csrfToken
  });
}

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateCsrfToken
};