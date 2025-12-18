/**
 * Client-side Error Handler for Web Dashboard
 * Provides user-friendly error display and automatic recovery mechanisms.
 */

class ClientErrorHandler {
  constructor() {
    this.errorContainer = null;
    this.retryQueue = new Map();
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 5000]; // Exponential backoff
    this.lastErrorTime = null;
    this.lastRejectionTime = null;
    
    this.init();
  }

  /**
   * Initialize error handler
   */
  init() {
    // Create error container if it doesn't exist
    this.createErrorContainer();
    
    // Global error handlers
    window.addEventListener('error', (event) => this.handleGlobalError(event));
    window.addEventListener('unhandledrejection', (event) => this.handleUnhandledRejection(event));
  }

  /**
   * Create error display container
   */
  createErrorContainer() {
    if (document.getElementById('error-container')) {
      this.errorContainer = document.getElementById('error-container');
      return;
    }

    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'error-container';
    this.errorContainer.className = 'error-container';
    this.errorContainer.setAttribute('role', 'alert');
    this.errorContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.errorContainer);
  }

  /**
   * Handle API error response
   */
  handleApiError(response, context = {}) {
    const error = response.error || {};
    
    // Display user-friendly message
    this.showError({
      code: error.code,
      message: error.message || 'An error occurred',
      troubleshooting: error.troubleshooting || [],
      recoverable: error.recoverable,
      requestId: error.requestId
    });

    // Attempt automatic recovery if possible
    if (error.recoverable && context.retryFn) {
      this.scheduleRetry(error.requestId || context.operationId, context.retryFn);
    }

    return error;
  }

  /**
   * Show error notification
   */
  showError(error) {
    const errorElement = document.createElement('div');
    errorElement.className = `error-notification error-${this.getSeverity(error.code)}`;
    errorElement.innerHTML = this.createErrorHTML(error);

    // Add to container
    this.errorContainer.appendChild(errorElement);

    // Auto-dismiss after delay (unless it's a critical error)
    if (this.getSeverity(error.code) !== 'critical') {
      setTimeout(() => this.dismissError(errorElement), 10000);
    }

    // Add dismiss handler
    const dismissBtn = errorElement.querySelector('.error-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismissError(errorElement));
    }

    // Add retry handler
    const retryBtn = errorElement.querySelector('.error-retry');
    if (retryBtn && error.recoverable) {
      retryBtn.addEventListener('click', () => {
        this.dismissError(errorElement);
        this.triggerRetry(error.requestId);
      });
    }
  }

  /**
   * Create error HTML content
   */
  createErrorHTML(error) {
    const troubleshootingHTML = error.troubleshooting && error.troubleshooting.length > 0
      ? `<div class="error-troubleshooting">
           <strong>Try these steps:</strong>
           <ul>${error.troubleshooting.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}</ul>
         </div>`
      : '';

    const retryButton = error.recoverable
      ? `<button class="error-retry btn btn-sm btn-outline-light">Retry</button>`
      : '';

    return `
      <div class="error-content">
        <div class="error-icon">${this.getErrorIcon(error.code)}</div>
        <div class="error-body">
          <div class="error-message">${this.escapeHtml(error.message)}</div>
          ${troubleshootingHTML}
          ${error.requestId ? `<div class="error-request-id">Request ID: ${error.requestId}</div>` : ''}
        </div>
        <div class="error-actions">
          ${retryButton}
          <button class="error-dismiss btn btn-sm btn-outline-light">×</button>
        </div>
      </div>
    `;
  }

  /**
   * Dismiss error notification
   */
  dismissError(element) {
    element.classList.add('error-dismissing');
    setTimeout(() => element.remove(), 300);
  }

  /**
   * Get error severity based on code
   */
  getSeverity(code) {
    if (!code) return 'warning';
    
    if (code.startsWith('AUTH_')) return 'warning';
    if (code.startsWith('VAL_')) return 'info';
    if (code.startsWith('SRV_')) return 'critical';
    if (code.startsWith('DB_')) return 'critical';
    if (code.startsWith('DISC_4002')) return 'warning'; // Rate limited
    if (code.startsWith('DISC_')) return 'warning';
    
    return 'warning';
  }

  /**
   * Get error icon based on code
   */
  getErrorIcon(code) {
    const severity = this.getSeverity(code);
    const icons = {
      critical: '⚠️',
      warning: '⚡',
      info: 'ℹ️'
    };
    return icons[severity] || '⚠️';
  }

  /**
   * Schedule automatic retry
   */
  scheduleRetry(operationId, retryFn) {
    if (!operationId || !retryFn) return;

    const attempts = this.retryQueue.get(operationId)?.attempts || 0;
    
    if (attempts >= this.maxRetries) {
      this.retryQueue.delete(operationId);
      this.showError({
        message: 'Maximum retry attempts reached. Please try again later.',
        recoverable: false
      });
      return;
    }

    const delay = this.retryDelays[attempts] || this.retryDelays[this.retryDelays.length - 1];
    
    this.retryQueue.set(operationId, {
      attempts: attempts + 1,
      retryFn,
      timeoutId: setTimeout(() => this.executeRetry(operationId), delay)
    });

    console.log(`Scheduled retry for ${operationId} in ${delay}ms (attempt ${attempts + 1})`);
  }

  /**
   * Execute retry
   */
  async executeRetry(operationId) {
    const retryInfo = this.retryQueue.get(operationId);
    if (!retryInfo) return;

    try {
      await retryInfo.retryFn();
      this.retryQueue.delete(operationId);
      console.log(`Retry successful for ${operationId}`);
    } catch (error) {
      console.error(`Retry failed for ${operationId}:`, error);
      // Will be handled by the API error handler which may schedule another retry
    }
  }

  /**
   * Trigger manual retry
   */
  triggerRetry(operationId) {
    const retryInfo = this.retryQueue.get(operationId);
    if (retryInfo) {
      clearTimeout(retryInfo.timeoutId);
      this.executeRetry(operationId);
    }
  }

  /**
   * Cancel pending retry
   */
  cancelRetry(operationId) {
    const retryInfo = this.retryQueue.get(operationId);
    if (retryInfo) {
      clearTimeout(retryInfo.timeoutId);
      this.retryQueue.delete(operationId);
    }
  }

  /**
   * Handle global JavaScript errors
   */
  handleGlobalError(event) {
    // Prevent default error handling
    event.preventDefault();
    
    console.error('Global error:', event.error);
    
    // Don't show UI errors for common non-critical issues
    if (event.message && (
      event.message.includes('Script error') ||
      event.message.includes('ResizeObserver') ||
      event.message.includes('Loading chunk') ||
      event.message.includes('NetworkError') ||
      event.message.includes('Failed to fetch') ||
      event.message.includes('Load failed') ||
      event.message.includes('socket') ||
      event.message.includes('Socket') ||
      event.message.includes('WebSocket')
    )) {
      return;
    }

    // Debounce to prevent duplicate error messages
    if (this.lastErrorTime && Date.now() - this.lastErrorTime < 5000) {
      return;
    }
    this.lastErrorTime = Date.now();

    // Only show error for actual critical issues
    if (event.error && event.error.stack) {
      console.warn('Suppressed error notification for:', event.message);
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(event) {
    // Prevent default handling
    event.preventDefault();
    
    console.error('Unhandled rejection:', event.reason);
    
    // Debounce to prevent duplicate error messages
    if (this.lastRejectionTime && Date.now() - this.lastRejectionTime < 5000) {
      return;
    }
    this.lastRejectionTime = Date.now();
    
    // Ignore common non-critical rejections
    const reason = event.reason;
    const message = reason?.message || String(reason);
    
    if (
      message.includes('ResizeObserver') ||
      message.includes('AbortError') ||
      message.includes('cancelled') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed') ||
      message.includes('socket') ||
      message.includes('Socket') ||
      message.includes('WebSocket') ||
      message.includes('timeout') ||
      message.includes('ECONNREFUSED') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      console.warn('Suppressed rejection notification for:', message);
      return;
    }
    
    // Don't show generic error for minor issues
    // Only log to console for debugging
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all errors
   */
  clearAll() {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
    }
    
    // Cancel all pending retries
    for (const [operationId] of this.retryQueue) {
      this.cancelRetry(operationId);
    }
  }
}

// Create global instance
window.errorHandler = new ClientErrorHandler();

/**
 * Utility function for API calls with error handling
 */
async function apiCall(url, options = {}) {
  const operationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!data.success) {
      window.errorHandler.handleApiError(data, {
        operationId,
        retryFn: options.retryable ? () => apiCall(url, options) : null
      });
      throw new Error(data.error?.message || 'API call failed');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError') {
      // Network error
      window.errorHandler.showError({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your connection.',
        recoverable: true,
        requestId: operationId
      });
    }
    throw error;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ClientErrorHandler, apiCall };
}
