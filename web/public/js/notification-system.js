/**
 * Notification and Feedback System
 * Provides comprehensive notification, status indicators, progress tracking,
 * and concurrent user conflict handling for the web dashboard.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.statusIndicators = new Map();
    this.progressIndicators = new Map();
    this.notificationCounter = 0;
    this.maxNotifications = 5;
    this.defaultDuration = 5000;
    this.errorDuration = 8000;
    this.listeners = new Map();
    this.botStatus = 'unknown';
    this.lastConfigVersion = null;
    this.concurrentUsers = new Map();
    
    this.init();
  }

  /**
   * Initialize the notification system
   */
  init() {
    this.createNotificationContainer();
    this.createStatusBar();
    this.setupEventListeners();
  }

  /**
   * Create notification container if it doesn't exist
   */
  createNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      container.setAttribute('role', 'alert');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    this.container = container;
  }

  /**
   * Create status bar for real-time indicators
   * Requirements: 9.2
   */
  createStatusBar() {
    let statusBar = document.getElementById('status-bar');
    if (!statusBar) {
      statusBar = document.createElement('div');
      statusBar.id = 'status-bar';
      statusBar.className = 'status-bar';
      statusBar.innerHTML = `
        <div class="status-bar-content">
          <div class="status-item bot-status" id="bot-status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">Bot Status: Checking...</span>
          </div>
          <div class="status-item sync-status" id="sync-status-indicator" style="display: none;">
            <span class="status-icon"><i class="fas fa-sync-alt fa-spin"></i></span>
            <span class="status-text">Syncing...</span>
          </div>
          <div class="status-item users-status" id="users-status-indicator" style="display: none;">
            <span class="status-icon"><i class="fas fa-users"></i></span>
            <span class="status-text">1 user editing</span>
          </div>
        </div>
      `;
      
      // Insert after navbar
      const navbar = document.querySelector('.navbar');
      if (navbar && navbar.nextSibling) {
        navbar.parentNode.insertBefore(statusBar, navbar.nextSibling);
      } else {
        document.body.insertBefore(statusBar, document.body.firstChild);
      }
    }
    this.statusBar = statusBar;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for visibility changes to pause/resume status checks
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseStatusChecks();
      } else {
        this.resumeStatusChecks();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.showNotification('Connection restored', 'success', {
        details: 'You are back online'
      });
      this.updateBotStatus('checking');
    });

    window.addEventListener('offline', () => {
      this.showNotification('Connection lost', 'error', {
        details: 'Please check your internet connection',
        persistent: true
      });
      this.updateBotStatus('offline');
    });
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * Show a notification
   * Requirements: 9.1, 9.3
   * @param {string} message - Main notification message
   * @param {string} type - Notification type: success, error, warning, info
   * @param {Object} options - Additional options
   * @returns {string} Notification ID
   */
  showNotification(message, type = 'info', options = {}) {
    const {
      details = null,
      duration = type === 'error' ? this.errorDuration : this.defaultDuration,
      persistent = false,
      actions = [],
      icon = null,
      onClose = null
    } = options;

    const id = `notification-${++this.notificationCounter}`;
    
    // Remove oldest notification if at max
    if (this.notifications.size >= this.maxNotifications) {
      const oldestId = this.notifications.keys().next().value;
      this.removeNotification(oldestId);
    }

    const notification = this.createNotificationElement(id, message, type, {
      details,
      actions,
      icon
    });

    this.container.appendChild(notification);
    this.notifications.set(id, { element: notification, onClose });

    // Trigger show animation
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    // Auto-remove unless persistent
    if (!persistent) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }

    // Emit event
    this.emit('notification:show', { id, message, type, options });

    return id;
  }

  /**
   * Create notification DOM element
   */
  createNotificationElement(id, message, type, options) {
    const { details, actions, icon } = options;
    
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');

    const iconHtml = icon || this.getDefaultIcon(type);
    
    let detailsHtml = '';
    if (details) {
      if (Array.isArray(details)) {
        detailsHtml = `<ul class="notification-details-list">${details.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}</ul>`;
      } else {
        detailsHtml = `<p class="notification-details">${this.escapeHtml(details)}</p>`;
      }
    }

    let actionsHtml = '';
    if (actions && actions.length > 0) {
      actionsHtml = `<div class="notification-actions">${actions.map(action => 
        `<button class="notification-action-btn" data-action="${action.id}">${this.escapeHtml(action.label)}</button>`
      ).join('')}</div>`;
    }

    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${iconHtml}</span>
        <div class="notification-body">
          <span class="notification-message">${this.escapeHtml(message)}</span>
          ${detailsHtml}
          ${actionsHtml}
        </div>
        <button class="notification-close" aria-label="Close notification">&times;</button>
      </div>
      <div class="notification-progress"></div>
    `;

    // Add event listeners
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(id);
    });

    // Action button listeners
    notification.querySelectorAll('.notification-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionId = e.target.dataset.action;
        const action = actions.find(a => a.id === actionId);
        if (action && action.handler) {
          action.handler();
        }
        if (action && action.closeOnClick !== false) {
          this.removeNotification(id);
        }
      });
    });

    return notification;
  }

  /**
   * Get default icon for notification type
   */
  getDefaultIcon(type) {
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || icons.info;
  }

  /**
   * Remove a notification
   */
  removeNotification(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    const { element, onClose } = notificationData;
    
    element.classList.remove('notification-show');
    element.classList.add('notification-hide');

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
      
      if (onClose) {
        onClose();
      }
      
      this.emit('notification:remove', { id });
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.notifications.forEach((_, id) => {
      this.removeNotification(id);
    });
  }

  // ==================== STATUS INDICATOR METHODS ====================

  /**
   * Update bot status indicator
   * Requirements: 9.2, 9.5
   */
  updateBotStatus(status, details = null) {
    this.botStatus = status;
    const indicator = document.getElementById('bot-status-indicator');
    if (!indicator) return;

    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');

    // Remove all status classes
    indicator.classList.remove('status-online', 'status-offline', 'status-checking', 'status-warning');

    switch (status) {
      case 'online':
        indicator.classList.add('status-online');
        dot.style.backgroundColor = 'var(--success-color)';
        text.textContent = 'Bot: Online';
        break;
      case 'offline':
        indicator.classList.add('status-offline');
        dot.style.backgroundColor = 'var(--error-color)';
        text.textContent = details || 'Bot: Offline - Changes will apply when reconnected';
        // Show warning notification
        this.showNotification(
          'Bot is currently offline',
          'warning',
          {
            details: 'Configuration changes will be applied when the bot reconnects',
            persistent: true,
            actions: [{
              id: 'retry',
              label: 'Retry Connection',
              handler: () => this.emit('bot:retry-connection')
            }]
          }
        );
        break;
      case 'checking':
        indicator.classList.add('status-checking');
        dot.style.backgroundColor = 'var(--warning-color)';
        text.textContent = 'Bot: Checking...';
        break;
      case 'warning':
        indicator.classList.add('status-warning');
        dot.style.backgroundColor = 'var(--warning-color)';
        text.textContent = details || 'Bot: Connection Issues';
        break;
      default:
        dot.style.backgroundColor = 'var(--text-muted)';
        text.textContent = 'Bot: Unknown';
    }

    this.emit('bot:status-change', { status, details });
  }

  /**
   * Show sync status indicator
   * Requirements: 9.2
   */
  showSyncStatus(message = 'Syncing...') {
    const indicator = document.getElementById('sync-status-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
      indicator.querySelector('.status-text').textContent = message;
    }
  }

  /**
   * Hide sync status indicator
   */
  hideSyncStatus() {
    const indicator = document.getElementById('sync-status-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Update configuration status
   * Requirements: 9.1, 9.2
   */
  updateConfigStatus(section, status, message = null) {
    const statusInfo = {
      saving: { class: 'status-saving', text: message || 'Saving...', icon: 'fa-spinner fa-spin' },
      saved: { class: 'status-saved', text: message || 'Saved', icon: 'fa-check' },
      error: { class: 'status-error', text: message || 'Error', icon: 'fa-times' },
      syncing: { class: 'status-syncing', text: message || 'Syncing...', icon: 'fa-sync-alt fa-spin' },
      pending: { class: 'status-pending', text: message || 'Pending', icon: 'fa-clock' }
    };

    const info = statusInfo[status] || statusInfo.saved;
    
    // Update section-specific status if element exists
    const sectionStatus = document.getElementById(`${section}-config-status`);
    if (sectionStatus) {
      sectionStatus.className = `config-status ${info.class}`;
      sectionStatus.innerHTML = `<i class="fas ${info.icon}"></i> ${info.text}`;
    }

    // Show notification for important status changes
    if (status === 'saved') {
      this.showNotification(`${this.formatSectionName(section)} configuration saved`, 'success', {
        duration: 3000
      });
    } else if (status === 'error') {
      this.showNotification(`Failed to save ${this.formatSectionName(section)} configuration`, 'error', {
        details: message
      });
    }

    this.emit('config:status-change', { section, status, message });
  }

  // ==================== PROGRESS INDICATOR METHODS ====================

  /**
   * Show progress indicator for long operations
   * Requirements: 9.2
   */
  showProgress(id, options = {}) {
    const {
      message = 'Processing...',
      progress = 0,
      indeterminate = false,
      cancellable = false,
      onCancel = null
    } = options;

    let progressElement = document.getElementById(`progress-${id}`);
    
    if (!progressElement) {
      progressElement = document.createElement('div');
      progressElement.id = `progress-${id}`;
      progressElement.className = 'progress-indicator';
      progressElement.innerHTML = `
        <div class="progress-content">
          <div class="progress-header">
            <span class="progress-message">${this.escapeHtml(message)}</span>
            ${cancellable ? '<button class="progress-cancel" aria-label="Cancel">&times;</button>' : ''}
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar ${indeterminate ? 'indeterminate' : ''}" style="width: ${progress}%"></div>
          </div>
          <span class="progress-percentage">${indeterminate ? '' : `${Math.round(progress)}%`}</span>
        </div>
      `;

      if (cancellable) {
        progressElement.querySelector('.progress-cancel').addEventListener('click', () => {
          if (onCancel) onCancel();
          this.hideProgress(id);
        });
      }

      this.container.appendChild(progressElement);
      this.progressIndicators.set(id, progressElement);

      requestAnimationFrame(() => {
        progressElement.classList.add('progress-show');
      });
    } else {
      // Update existing progress
      const bar = progressElement.querySelector('.progress-bar');
      const percentage = progressElement.querySelector('.progress-percentage');
      const messageEl = progressElement.querySelector('.progress-message');
      
      if (bar) {
        bar.style.width = `${progress}%`;
        bar.classList.toggle('indeterminate', indeterminate);
      }
      if (percentage) {
        percentage.textContent = indeterminate ? '' : `${Math.round(progress)}%`;
      }
      if (messageEl) {
        messageEl.textContent = message;
      }
    }

    return id;
  }

  /**
   * Update progress indicator
   */
  updateProgress(id, progress, message = null) {
    const progressElement = document.getElementById(`progress-${id}`);
    if (!progressElement) return;

    const bar = progressElement.querySelector('.progress-bar');
    const percentage = progressElement.querySelector('.progress-percentage');
    
    if (bar) {
      bar.style.width = `${progress}%`;
      bar.classList.remove('indeterminate');
    }
    if (percentage) {
      percentage.textContent = `${Math.round(progress)}%`;
    }
    if (message) {
      const messageEl = progressElement.querySelector('.progress-message');
      if (messageEl) messageEl.textContent = message;
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgress(id) {
    const progressElement = document.getElementById(`progress-${id}`);
    if (!progressElement) return;

    progressElement.classList.remove('progress-show');
    progressElement.classList.add('progress-hide');

    setTimeout(() => {
      if (progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      this.progressIndicators.delete(id);
    }, 300);
  }

  // ==================== CONCURRENT USER HANDLING ====================

  /**
   * Update concurrent users indicator
   * Requirements: 9.4
   */
  updateConcurrentUsers(users) {
    this.concurrentUsers = new Map(users.map(u => [u.id, u]));
    const indicator = document.getElementById('users-status-indicator');
    
    if (!indicator) return;

    const count = this.concurrentUsers.size;
    
    if (count > 1) {
      indicator.style.display = 'flex';
      indicator.querySelector('.status-text').textContent = `${count} users editing`;
      indicator.title = Array.from(this.concurrentUsers.values())
        .map(u => u.username)
        .join(', ');
    } else {
      indicator.style.display = 'none';
    }
  }

  /**
   * Show concurrent edit conflict notification
   * Requirements: 9.4
   */
  showConflictNotification(conflict) {
    const { section, user, timestamp, changes } = conflict;
    
    return this.showNotification(
      `Configuration conflict detected`,
      'warning',
      {
        details: `${user.username} modified ${section} at ${new Date(timestamp).toLocaleTimeString()}`,
        persistent: true,
        actions: [
          {
            id: 'reload',
            label: 'Reload Latest',
            handler: () => this.emit('conflict:reload', { section })
          },
          {
            id: 'keep',
            label: 'Keep My Changes',
            handler: () => this.emit('conflict:keep', { section })
          },
          {
            id: 'merge',
            label: 'View Differences',
            handler: () => this.emit('conflict:merge', { section, changes })
          }
        ]
      }
    );
  }

  /**
   * Show conflict resolution dialog
   * Requirements: 9.4
   */
  showConflictDialog(conflicts) {
    let dialog = document.getElementById('conflict-dialog');
    
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'conflict-dialog';
      dialog.className = 'conflict-dialog';
      document.body.appendChild(dialog);
    }

    const conflictItems = conflicts.map((conflict, index) => `
      <div class="conflict-item" data-index="${index}">
        <div class="conflict-header">
          <span class="conflict-section">${this.formatSectionName(conflict.section)}</span>
          <span class="conflict-user">by ${this.escapeHtml(conflict.user.username)}</span>
          <span class="conflict-time">${new Date(conflict.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="conflict-changes">
          ${conflict.changes.map(change => `
            <div class="change-item change-${change.type}">
              <span class="change-field">${this.escapeHtml(change.field)}</span>
              <span class="change-arrow">→</span>
              <span class="change-value">${this.escapeHtml(String(change.newValue))}</span>
            </div>
          `).join('')}
        </div>
        <div class="conflict-actions">
          <button class="btn btn-sm btn-outline-primary" data-action="accept" data-index="${index}">
            Accept Their Changes
          </button>
          <button class="btn btn-sm btn-outline-secondary" data-action="reject" data-index="${index}">
            Keep My Changes
          </button>
        </div>
      </div>
    `).join('');

    dialog.innerHTML = `
      <div class="conflict-dialog-content">
        <div class="conflict-dialog-header">
          <h5><i class="fas fa-exclamation-triangle me-2"></i>Configuration Conflicts</h5>
          <button class="conflict-dialog-close">&times;</button>
        </div>
        <div class="conflict-dialog-body">
          <p class="conflict-description">
            Other users have made changes to the configuration. Please resolve the conflicts below.
          </p>
          ${conflictItems}
        </div>
        <div class="conflict-dialog-footer">
          <button class="btn btn-secondary" data-action="dismiss">Dismiss</button>
          <button class="btn btn-primary" data-action="accept-all">Accept All Their Changes</button>
        </div>
      </div>
    `;

    // Add event listeners
    dialog.querySelector('.conflict-dialog-close').addEventListener('click', () => {
      dialog.style.display = 'none';
    });

    dialog.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const index = e.target.dataset.index;
        
        if (action === 'dismiss') {
          dialog.style.display = 'none';
        } else if (action === 'accept-all') {
          this.emit('conflict:accept-all', { conflicts });
          dialog.style.display = 'none';
        } else if (action === 'accept' && index !== undefined) {
          this.emit('conflict:accept', { conflict: conflicts[index] });
        } else if (action === 'reject' && index !== undefined) {
          this.emit('conflict:reject', { conflict: conflicts[index] });
        }
      });
    });

    dialog.style.display = 'flex';
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format section name for display
   */
  formatSectionName(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
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
   * Pause status checks (when tab is hidden)
   */
  pauseStatusChecks() {
    this.statusChecksPaused = true;
  }

  /**
   * Resume status checks (when tab is visible)
   */
  resumeStatusChecks() {
    this.statusChecksPaused = false;
  }

  // ==================== EVENT EMITTER ====================

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Create global instance
window.notificationSystem = new NotificationSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}
