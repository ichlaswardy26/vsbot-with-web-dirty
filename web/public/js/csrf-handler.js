/**
 * CSRF Token Handler
 * Manages CSRF tokens for secure API requests
 * Requirements: Security aspects of all requirements
 */

class CSRFHandler {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.cookieName = 'csrf_token';
    this.headerName = 'X-CSRF-Token';
    this.refreshThreshold = 5 * 60 * 1000; // Refresh 5 minutes before expiry
    
    this.init();
  }

  /**
   * Initialize CSRF handler
   */
  init() {
    // Get token from cookie on load
    this.token = this.getTokenFromCookie();
    
    // If no token exists, fetch one immediately
    if (!this.token) {
      this.refreshToken().catch(err => {
        console.warn('Initial CSRF token fetch failed:', err.message);
      });
    }
    
    // Set up automatic token refresh
    this.setupAutoRefresh();
    
    // Intercept fetch requests to add CSRF token
    this.interceptFetch();
    
    // Intercept XMLHttpRequest to add CSRF token
    this.interceptXHR();
  }

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.cookieName) {
        return value;
      }
    }
    return null;
  }

  /**
   * Get current CSRF token
   */
  getToken() {
    // Try to get from cookie first (most up-to-date)
    const cookieToken = this.getTokenFromCookie();
    if (cookieToken) {
      this.token = cookieToken;
    }
    return this.token;
  }

  /**
   * Fetch a new CSRF token from the server
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          this.token = data.token;
          this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
          return this.token;
        }
      }
      
      // Try to get from response header
      const headerToken = response.headers.get(this.headerName);
      if (headerToken) {
        this.token = headerToken;
        return this.token;
      }
      
      throw new Error('Failed to refresh CSRF token');
    } catch (error) {
      console.error('CSRF token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Set up automatic token refresh
   */
  setupAutoRefresh() {
    // Check token validity every minute
    setInterval(() => {
      if (this.tokenExpiry && Date.now() > this.tokenExpiry - this.refreshThreshold) {
        this.refreshToken().catch(console.error);
      }
    }, 60 * 1000);
  }

  /**
   * Intercept fetch requests to add CSRF token
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = function(url, options = {}) {
      // Only add CSRF token for state-changing requests
      const method = (options.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        options.headers = options.headers || {};
        
        // Add CSRF token header
        const token = self.getToken();
        if (token) {
          if (options.headers instanceof Headers) {
            options.headers.set(self.headerName, token);
          } else {
            options.headers[self.headerName] = token;
          }
        }
        
        // Ensure credentials are included
        options.credentials = options.credentials || 'include';
      }
      
      return originalFetch.call(this, url, options).then(async response => {
        // Update token from response header if present
        const newToken = response.headers.get(self.headerName);
        if (newToken) {
          self.token = newToken;
        }
        
        // Handle CSRF errors with automatic retry
        if (response.status === 403) {
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            if (data.code === 'CSRF_TOKEN_MISSING' || data.code === 'CSRF_TOKEN_INVALID') {
              // Refresh token and retry once
              await self.refreshToken();
              const retryToken = self.getToken();
              if (retryToken) {
                if (options.headers instanceof Headers) {
                  options.headers.set(self.headerName, retryToken);
                } else {
                  options.headers[self.headerName] = retryToken;
                }
                return originalFetch.call(this, url, options);
              }
            }
          } catch (e) {
            // Not a JSON response or not a CSRF error, return original
          }
        }
        
        return response;
      });
    };
  }

  /**
   * Intercept XMLHttpRequest to add CSRF token
   */
  interceptXHR() {
    const self = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._csrfMethod = method.toUpperCase();
      return originalOpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      // Only add CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(this._csrfMethod)) {
        const token = self.getToken();
        if (token) {
          this.setRequestHeader(self.headerName, token);
        }
      }
      
      // Update token from response
      this.addEventListener('load', function() {
        const newToken = this.getResponseHeader(self.headerName);
        if (newToken) {
          self.token = newToken;
        }
      });
      
      return originalSend.call(this, body);
    };
  }

  /**
   * Handle CSRF token errors
   */
  async handleCSRFError(response) {
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      if (data.code === 'CSRF_TOKEN_MISSING' || data.code === 'CSRF_TOKEN_INVALID') {
        // Refresh token and retry
        await this.refreshToken();
        return true; // Indicate retry is possible
      }
    }
    return false;
  }

  /**
   * Make a CSRF-protected request with automatic retry
   */
  async request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    
    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      options.headers = options.headers || {};
      options.headers[this.headerName] = this.getToken();
      options.credentials = 'include';
    }
    
    let response = await fetch(url, options);
    
    // Handle CSRF errors with retry
    if (response.status === 403) {
      const shouldRetry = await this.handleCSRFError(response.clone());
      if (shouldRetry) {
        // Update token and retry
        options.headers[this.headerName] = this.getToken();
        response = await fetch(url, options);
      }
    }
    
    return response;
  }
}

// Create global instance
window.csrfHandler = new CSRFHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSRFHandler;
}
