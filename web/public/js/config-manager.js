/**
 * Configuration Manager for Web Dashboard
 * Provides real-time validation, form binding, caching, and notification systems
 * 
 * Requirements: 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.4, 9.5
 */
class ConfigManager {
  constructor(guildId) {
    this.guildId = guildId;
    this.baseUrl = '/api/config';
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Map();
    this.validationErrors = new Map();
    this.validationDebounceTimers = new Map();
    this.statusIndicators = new Map();
    this.isOnline = true;
    this.configVersion = null;
    this.lastSyncTime = null;
    
    // Feature dependencies for warning system
    this.featureDependencies = {
      leveling: ['economy'],
      economy: [],
      ticket: [],
      games: ['economy'],
      welcome: [],
      confession: [],
      wordChain: ['economy']
    };
    
    // Validation rules for different field types
    this.validationRules = {
      channelId: /^[0-9]{17,19}$/,
      roleId: /^[0-9]{17,19}$/,
      color: /^#[0-9A-Fa-f]{6}$/,
      emoji: /^(<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])$/u,
      url: /^https?:\/\/.+/,
      positiveInteger: /^[1-9]\d*$/
    };
    
    // Initialize notification system integration
    this.initNotificationIntegration();
  }
  
  /**
   * Initialize integration with NotificationSystem
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  initNotificationIntegration() {
    // Wait for notification system to be available
    if (typeof window !== 'undefined') {
      this.waitForNotificationSystem();
    }
  }
  
  /**
   * Wait for notification system to be ready
   */
  waitForNotificationSystem() {
    if (window.notificationSystem) {
      this.notificationSystem = window.notificationSystem;
      this.setupNotificationListeners();
    } else {
      // Retry after a short delay
      setTimeout(() => this.waitForNotificationSystem(), 100);
    }
  }
  
  /**
   * Setup listeners for notification system events
   * Requirements: 9.4, 9.5
   */
  setupNotificationListeners() {
    if (!this.notificationSystem) return;
    
    // Handle bot retry connection
    this.notificationSystem.on('bot:retry-connection', () => {
      this.checkConnectivity();
      this.checkDiscordConnectivity();
    });
    
    // Handle conflict resolution
    this.notificationSystem.on('conflict:reload', async ({ section }) => {
      await this.getConfigSection(section, true);
      this.showNotification(`${this.formatSectionName(section)} configuration reloaded`, 'success');
    });
    
    this.notificationSystem.on('conflict:keep', ({ section }) => {
      this.showNotification(`Keeping your changes for ${this.formatSectionName(section)}`, 'info');
    });
    
    this.notificationSystem.on('conflict:accept-all', async ({ conflicts }) => {
      for (const conflict of conflicts) {
        await this.getConfigSection(conflict.section, true);
      }
      this.showNotification('All remote changes accepted', 'success');
    });

    // Handle view differences (conflict:merge)
    this.notificationSystem.on('conflict:merge', async ({ section, changes }) => {
      await this.showConfigDiff(section, changes);
    });
  }

  /**
   * Show configuration diff viewer
   * Requirements: 9.4
   */
  async showConfigDiff(section, remoteChanges = null) {
    try {
      // Get current local config from cache or form
      const localConfig = this.getCached(section) || await this.getConfigSection(section, false);
      
      // Get latest remote config
      const remoteConfig = await this.getConfigSection(section, true);
      
      if (window.diffViewer) {
        window.diffViewer.show(
          localConfig,
          remoteConfig,
          section,
          async (newConfig) => {
            // Apply the remote changes
            this.setCache(section, newConfig);
            this.notifyListeners(`config:${section}:updated`, newConfig);
            this.showNotification(`${this.formatSectionName(section)} updated with remote changes`, 'success');
            
            // Trigger UI refresh
            window.dispatchEvent(new CustomEvent('configReload', { detail: { section } }));
          }
        );
      } else {
        this.showNotification('Diff viewer not available', 'error');
      }
    } catch (error) {
      console.error('Error showing config diff:', error);
      this.showNotification('Failed to load configuration diff', 'error');
    }
  }

  // ==================== API METHODS ====================

  /**
   * Get full configuration with caching
   */
  async getConfig(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCached('full');
      if (cached) {
        this.notifyListeners('config:loaded', cached);
        return cached;
      }
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = '/auth/discord';
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.setCache('full', result.data);
        this.notifyListeners('config:loaded', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to load configuration');
      }
    } catch (error) {
      console.error('Error getting config:', error);
      this.notifyListeners('config:error', error);
      // Return empty config instead of throwing
      return this.getDefaultConfig();
    }
  }
  
  /**
   * Get default configuration for fallback
   */
  getDefaultConfig() {
    return {
      channels: {},
      roles: {},
      features: {
        leveling: { enabled: true },
        economy: { enabled: true },
        ticket: { enabled: true },
        games: { enabled: true },
        welcome: { enabled: true }
      },
      colors: {
        primary: '#7289da',
        success: '#43b581',
        error: '#f04747',
        warning: '#faa61a',
        info: '#7289da'
      },
      emojis: {},
      language: { default: 'en', available: ['en'] }
    };
  }

  /**
   * Get specific configuration section with caching
   */
  async getConfigSection(section, forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCached(section);
      if (cached) {
        this.notifyListeners(`config:${section}:loaded`, cached);
        return cached;
      }
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/${section}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth/discord';
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.setCache(section, result.data);
        this.notifyListeners(`config:${section}:loaded`, result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Error getting ${section} config:`, error);
      this.notifyListeners(`config:${section}:error`, error);
      throw error;
    }
  }

  /**
   * Update full configuration
   * Requirements: 9.1
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update cache
        this.setCache('full', result.data);
        // Invalidate section caches as they may be stale
        this.invalidateCache('channels');
        this.invalidateCache('roles');
        this.invalidateCache('features');
        this.invalidateCache('appearance');
        
        this.notifyListeners('config:updated', result.data);
        
        // Show notification with change details
        const changeCount = Object.keys(config).length;
        this.showNotification(
          'Configuration updated successfully', 
          'success',
          `${changeCount} section(s) updated`
        );
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating config:', error);
      this.notifyListeners('config:error', error);
      this.showNotification('Failed to update configuration', 'error', error.message);
      throw error;
    }
  }

  /**
   * Update specific configuration section
   * Requirements: 9.1, 9.3
   */
  async updateConfigSection(section, data) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update cache
        this.setCache(section, result.data);
        // Invalidate full config cache
        this.invalidateCache('full');
        
        this.notifyListeners(`config:${section}:updated`, result.data);
        this.showNotification(`${this.formatSectionName(section)} configuration updated successfully`, 'success');
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Error updating ${section} config:`, error);
      this.notifyListeners(`config:${section}:error`, error);
      this.showNotification(
        `Failed to update ${this.formatSectionName(section)} configuration`, 
        'error',
        error.message
      );
      throw error;
    }
  }
  
  /**
   * Preview changes before saving
   * Shows diff between current and new configuration
   * @param {string} section - Configuration section
   * @param {object} newData - New configuration data
   * @param {function} onConfirm - Callback when user confirms changes
   */
  previewChanges(section, newData, onConfirm) {
    const currentData = this.getCached(section) || {};
    
    if (window.diffViewer) {
      window.diffViewer.show(
        currentData,
        newData,
        section,
        async () => {
          if (onConfirm && typeof onConfirm === 'function') {
            await onConfirm();
          }
        }
      );
    } else {
      // Fallback: just save without preview
      if (onConfirm) onConfirm();
    }
  }

  /**
   * Update config section with optional preview
   * @param {string} section - Configuration section
   * @param {object} data - New configuration data
   * @param {boolean} showPreview - Whether to show preview before saving
   */
  async updateConfigSectionWithPreview(section, data, showPreview = false) {
    if (showPreview) {
      return new Promise((resolve, reject) => {
        this.previewChanges(section, data, async () => {
          try {
            const result = await this.updateConfigSection(section, data);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      return this.updateConfigSection(section, data);
    }
  }

  /**
   * Format section name for display
   */
  formatSectionName(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Validate configuration
   */
  async validateConfig(config) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error validating config:', error);
      throw error;
    }
  }

  /**
   * Export configuration
   */
  async exportConfig() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/export`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Download the configuration as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `config-${this.guildId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Configuration exported successfully', 'success');
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error exporting config:', error);
      this.showNotification('Failed to export configuration', 'error');
      throw error;
    }
  }

  /**
   * Preview import configuration - shows changes before applying
   * Requirements: 6.2, 6.3
   */
  async previewImport(configData) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error previewing import:', error);
      throw error;
    }
  }

  /**
   * Import configuration
   * Requirements: 6.2, 6.4, 6.5
   */
  async importConfig(configData) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.cache.clear();
        this.notifyListeners('config:imported', result.data);
        
        // Show success notification with details
        const details = [];
        if (result.appliedSections && result.appliedSections.length > 0) {
          details.push(`Applied sections: ${result.appliedSections.join(', ')}`);
        }
        if (result.warnings && result.warnings.length > 0) {
          details.push(...result.warnings);
        }
        
        this.showNotification(
          'Configuration imported successfully', 
          'success',
          details.length > 0 ? details : null
        );
        
        return result;
      } else {
        // Handle validation errors
        const error = new Error(result.error);
        error.validationErrors = result.validationErrors || [];
        error.validationWarnings = result.validationWarnings || [];
        throw error;
      }
    } catch (error) {
      console.error('Error importing config:', error);
      
      // Show detailed error notification
      const details = error.validationErrors || [];
      this.showNotification(
        'Failed to import configuration', 
        'error',
        details.length > 0 ? details : error.message
      );
      
      throw error;
    }
  }

  /**
   * Create backup of current configuration
   * Requirements: 6.1
   */
  async createBackup() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/backup`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Download the backup as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `backup-${this.guildId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Backup created successfully', 'success');
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      this.showNotification('Failed to create backup', 'error');
      throw error;
    }
  }

  /**
   * Restore configuration from backup
   * Requirements: 6.5
   */
  async restoreFromBackup(backupData) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.cache.clear();
        this.notifyListeners('config:restored', result.data);
        this.showNotification('Configuration restored from backup successfully', 'success');
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      this.showNotification('Failed to restore from backup', 'error');
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig() {
    if (!confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/reset`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.cache.clear();
        this.notifyListeners('config:reset', result.data);
        this.showNotification('Configuration reset to defaults', 'success');
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error resetting config:', error);
      this.showNotification('Failed to reset configuration', 'error');
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

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
   * Notify listeners
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Show notification with enhanced feedback
   * Requirements: 9.1, 9.3
   */
  showNotification(message, type = 'info', details = null) {
    // Use NotificationSystem if available
    if (this.notificationSystem) {
      return this.notificationSystem.showNotification(message, type, { details });
    }
    
    // Fallback to basic notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let detailsHtml = '';
    if (details) {
      if (Array.isArray(details)) {
        detailsHtml = `<ul class="notification-details">${details.map(d => `<li>${d}</li>`).join('')}</ul>`;
      } else {
        detailsHtml = `<p class="notification-details">${details}</p>`;
      }
    }
    
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <div class="notification-body">
          <span class="notification-message">${message}</span>
          ${detailsHtml}
        </div>
        <button class="notification-close" aria-label="Close notification">&times;</button>
      </div>
    `;

    // Add to page
    const container = document.getElementById('notifications') || this.createNotificationContainer();
    container.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    // Auto remove after 5 seconds (longer for errors)
    const timeout = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      this.removeNotification(notification);
    }, timeout);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification);
    });
    
    // Notify listeners
    this.notifyListeners('notification', { message, type, details });
    
    return notification;
  }
  
  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }
  
  /**
   * Create notification container if it doesn't exist
   */
  createNotificationContainer() {
    let container = document.getElementById('notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    return container;
  }
  
  /**
   * Remove notification with animation
   */
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.classList.add('notification-hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  // ==================== REAL-TIME VALIDATION ====================

  /**
   * Validate a single field in real-time
   * Requirements: 7.1, 7.2
   */
  validateField(fieldName, value, fieldType = 'text') {
    const errors = [];
    
    // Skip validation for empty optional fields
    if (!value && value !== 0 && value !== false) {
      return { isValid: true, errors: [] };
    }
    
    // Type-specific validation
    switch (fieldType) {
      case 'channelId':
        if (!this.validationRules.channelId.test(value)) {
          errors.push('Invalid channel ID format');
        }
        break;
        
      case 'roleId':
        if (!this.validationRules.roleId.test(value)) {
          errors.push('Invalid role ID format');
        }
        break;
        
      case 'color':
        if (!this.validationRules.color.test(value)) {
          errors.push('Invalid color format (use #RRGGBB)');
        }
        break;
        
      case 'emoji':
        if (!this.validationRules.emoji.test(value)) {
          errors.push('Invalid emoji format');
        }
        break;
        
      case 'url':
        if (!this.validationRules.url.test(value)) {
          errors.push('Invalid URL format');
        }
        break;
        
      case 'positiveInteger':
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          errors.push('Must be a positive number');
        }
        break;
        
      case 'range':
        // Range validation handled separately
        break;
    }
    
    const isValid = errors.length === 0;
    
    // Store validation state
    this.validationErrors.set(fieldName, errors);
    
    return { isValid, errors };
  }
  
  /**
   * Validate range values (min/max pairs)
   */
  validateRange(minFieldName, maxFieldName, minValue, maxValue) {
    const errors = [];
    const min = parseInt(minValue, 10);
    const max = parseInt(maxValue, 10);
    
    if (!isNaN(min) && !isNaN(max) && min >= max) {
      errors.push('Minimum value must be less than maximum value');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Setup real-time validation on a form field
   * Requirements: 7.1
   */
  setupFieldValidation(field, fieldType = 'text') {
    const fieldName = field.name || field.id;
    
    // Debounced validation
    const validateWithDebounce = () => {
      // Clear existing timer
      if (this.validationDebounceTimers.has(fieldName)) {
        clearTimeout(this.validationDebounceTimers.get(fieldName));
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        const result = this.validateField(fieldName, field.value, fieldType);
        this.updateFieldValidationUI(field, result);
        this.notifyListeners('validation', { fieldName, ...result });
      }, 300);
      
      this.validationDebounceTimers.set(fieldName, timer);
    };
    
    // Add event listeners
    field.addEventListener('input', validateWithDebounce);
    field.addEventListener('blur', () => {
      // Immediate validation on blur
      const result = this.validateField(fieldName, field.value, fieldType);
      this.updateFieldValidationUI(field, result);
    });
  }
  
  /**
   * Update field UI based on validation result
   * Requirements: 7.2, 7.3
   */
  updateFieldValidationUI(field, validationResult) {
    const { isValid, errors } = validationResult;
    const fieldContainer = field.closest('.form-group') || field.parentElement;
    
    // Remove existing validation classes and messages
    field.classList.remove('is-valid', 'is-invalid');
    const existingFeedback = fieldContainer.querySelector('.validation-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Add appropriate class
    if (field.value || field.value === 0) {
      field.classList.add(isValid ? 'is-valid' : 'is-invalid');
      
      // Add feedback message for errors
      if (!isValid && errors.length > 0) {
        const feedback = document.createElement('div');
        feedback.className = 'validation-feedback invalid-feedback';
        feedback.textContent = errors[0];
        fieldContainer.appendChild(feedback);
      }
    }
    
    // Update save button state
    this.updateSaveButtonState();
  }
  
  /**
   * Update save button state based on validation
   * Requirements: 7.3
   */
  updateSaveButtonState() {
    const saveButtons = document.querySelectorAll('[data-config-save]');
    const hasErrors = Array.from(this.validationErrors.values()).some(errors => errors.length > 0);
    
    saveButtons.forEach(button => {
      button.disabled = hasErrors;
      if (hasErrors) {
        button.classList.add('btn-disabled');
        button.title = 'Fix validation errors before saving';
      } else {
        button.classList.remove('btn-disabled');
        button.title = '';
      }
    });
  }
  
  /**
   * Validate entire form
   */
  validateForm(form) {
    const fields = form.querySelectorAll('[data-validate]');
    let isValid = true;
    const errors = [];
    
    fields.forEach(field => {
      const fieldType = field.dataset.validate;
      const result = this.validateField(field.name, field.value, fieldType);
      this.updateFieldValidationUI(field, result);
      
      if (!result.isValid) {
        isValid = false;
        errors.push(...result.errors.map(e => `${field.name}: ${e}`));
      }
    });
    
    return { isValid, errors };
  }

  // ==================== STATUS INDICATORS ====================

  /**
   * Show real-time status indicator
   * Requirements: 9.2
   */
  showStatusIndicator(elementId, status, message = '') {
    let indicator = this.statusIndicators.get(elementId);
    
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'status-indicator';
      const element = document.getElementById(elementId);
      if (element) {
        element.appendChild(indicator);
        this.statusIndicators.set(elementId, indicator);
      }
    }
    
    if (indicator) {
      indicator.className = `status-indicator status-${status}`;
      indicator.textContent = message;
      indicator.title = message;
    }
  }
  
  /**
   * Update configuration status
   * Requirements: 9.2
   */
  updateConfigStatus(section, status, message = null) {
    const statusMap = {
      saving: { class: 'status-saving', text: 'Saving...' },
      saved: { class: 'status-saved', text: 'Saved' },
      error: { class: 'status-error', text: 'Error' },
      syncing: { class: 'status-syncing', text: 'Syncing...' }
    };
    
    const statusInfo = statusMap[status] || statusMap.saved;
    this.showStatusIndicator(`${section}-status`, statusInfo.class, statusInfo.text);
    this.notifyListeners('status:change', { section, status });
    
    // Use NotificationSystem for enhanced status updates
    if (this.notificationSystem) {
      this.notificationSystem.updateConfigStatus(section, status, message);
    }
  }
  
  /**
   * Show progress indicator for long operations
   * Requirements: 9.2
   */
  showProgress(id, options = {}) {
    if (this.notificationSystem) {
      return this.notificationSystem.showProgress(id, options);
    }
  }
  
  /**
   * Update progress indicator
   * Requirements: 9.2
   */
  updateProgress(id, progress, message = null) {
    if (this.notificationSystem) {
      this.notificationSystem.updateProgress(id, progress, message);
    }
  }
  
  /**
   * Hide progress indicator
   * Requirements: 9.2
   */
  hideProgress(id) {
    if (this.notificationSystem) {
      this.notificationSystem.hideProgress(id);
    }
  }
  
  /**
   * Update bot status indicator
   * Requirements: 9.5
   */
  updateBotStatus(status, details = null) {
    if (this.notificationSystem) {
      this.notificationSystem.updateBotStatus(status, details);
    }
  }
  
  /**
   * Handle concurrent user conflicts
   * Requirements: 9.4
   */
  handleConcurrentConflict(conflict) {
    if (this.notificationSystem) {
      this.notificationSystem.showConflictNotification(conflict);
    } else {
      this.showNotification(
        `Configuration conflict: ${conflict.user.username} modified ${conflict.section}`,
        'warning'
      );
    }
  }

  // ==================== FEATURE DEPENDENCY WARNINGS ====================

  /**
   * Check for feature dependencies when disabling
   * Requirements: 4.4
   */
  checkFeatureDependencies(featureName, enabled) {
    if (enabled) {
      return { hasWarnings: false, warnings: [] };
    }
    
    const warnings = [];
    const dependentFeatures = Object.entries(this.featureDependencies)
      .filter(([feature, deps]) => deps.includes(featureName))
      .map(([feature]) => feature);
    
    if (dependentFeatures.length > 0) {
      warnings.push(`Disabling ${featureName} may affect: ${dependentFeatures.join(', ')}`);
    }
    
    return { hasWarnings: warnings.length > 0, warnings };
  }

  // ==================== FORM HELPERS ====================

  /**
   * Bind form to configuration section with real-time validation
   * Requirements: 7.1, 7.2, 7.3
   */
  bindForm(formElement, section) {
    const form = typeof formElement === 'string' ? 
      document.getElementById(formElement) : formElement;

    if (!form) {
      console.error('Form element not found');
      return;
    }

    // Setup validation on all fields with data-validate attribute
    const validatableFields = form.querySelectorAll('[data-validate]');
    validatableFields.forEach(field => {
      this.setupFieldValidation(field, field.dataset.validate);
    });

    // Load current configuration
    this.getConfigSection(section).then(config => {
      this.populateForm(form, config);
      this.notifyListeners('form:loaded', { section, config });
    }).catch(error => {
      this.showNotification(`Failed to load ${section} configuration`, 'error', error.message);
    });

    // Handle form submission with validation
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate form before submission
      const validation = this.validateForm(form);
      if (!validation.isValid) {
        this.showNotification('Please fix validation errors before saving', 'error', validation.errors);
        return;
      }
      
      const formData = this.getFormData(form);
      
      // Show saving status
      this.updateConfigStatus(section, 'saving');
      
      try {
        const result = await this.updateConfigSection(section, formData);
        this.updateConfigStatus(section, 'saved');
        
        // Check for warnings (e.g., feature dependencies)
        if (result.warnings && result.warnings.length > 0) {
          this.showNotification('Configuration saved with warnings', 'warning', result.warnings);
        }
      } catch (error) {
        console.error('Error saving form:', error);
        this.updateConfigStatus(section, 'error');
        this.showNotification(`Failed to save ${section} configuration`, 'error', error.message);
      }
    });
    
    // Track form changes
    form.addEventListener('change', () => {
      this.notifyListeners('form:changed', { section, form });
    });
  }

  /**
   * Populate form with configuration data
   */
  populateForm(form, data, prefix = '') {
    Object.entries(data).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const field = form.querySelector(`[name="${fieldName}"]`);
      
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = Boolean(value);
        } else if (field.type === 'radio') {
          if (field.value === String(value)) {
            field.checked = true;
          }
        } else if (field.tagName === 'SELECT') {
          field.value = value || '';
          // Trigger change event for dependent fields
          field.dispatchEvent(new Event('change'));
        } else {
          field.value = value || '';
        }
        
        // Clear validation state on populate
        field.classList.remove('is-valid', 'is-invalid');
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively populate nested objects
        this.populateForm(form, value, fieldName);
      }
    });
  }

  /**
   * Get form data as object
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      this.setNestedValue(data, key, value);
    }
    
    // Handle unchecked checkboxes (they don't appear in FormData)
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (checkbox.name && !formData.has(checkbox.name)) {
        this.setNestedValue(data, checkbox.name, false);
      }
    });
    
    return data;
  }

  /**
   * Set nested object value from dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    
    // Handle different input types
    const field = document.querySelector(`[name="${path}"]`);
    if (field) {
      if (field.type === 'checkbox') {
        current[lastKey] = field.checked;
      } else if (field.type === 'number') {
        current[lastKey] = value ? Number(value) : null;
      } else {
        current[lastKey] = value || null;
      }
    } else {
      current[lastKey] = value || null;
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get cached configuration with expiry check
   */
  getCached(section = 'full') {
    const cached = this.cache.get(section);
    const timestamp = this.cacheTimestamps.get(section);
    
    if (cached && timestamp && (Date.now() - timestamp < this.cacheTimeout)) {
      return cached;
    }
    
    return null;
  }
  
  /**
   * Set cache with timestamp
   */
  setCache(section, data) {
    this.cache.set(section, data);
    this.cacheTimestamps.set(section, Date.now());
  }
  
  /**
   * Check if cache is valid
   */
  isCacheValid(section) {
    const timestamp = this.cacheTimestamps.get(section);
    return timestamp && (Date.now() - timestamp < this.cacheTimeout);
  }
  
  /**
   * Invalidate specific cache section
   */
  invalidateCache(section) {
    this.cache.delete(section);
    this.cacheTimestamps.delete(section);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  // ==================== CONNECTIVITY MONITORING ====================

  /**
   * Check API connectivity
   * Requirements: 7.4, 9.5
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/health', { method: 'GET' });
      const data = await response.json();
      
      const wasOffline = !this.isOnline;
      this.isOnline = response.ok && data.status === 'ok';
      
      // Update bot status indicator
      if (data.bot) {
        const botStatus = data.bot.status === 'ready' ? 'online' : 'offline';
        this.updateBotStatus(botStatus);
      }
      
      if (wasOffline && this.isOnline) {
        this.showNotification('Connection restored', 'success');
        this.notifyListeners('connectivity:restored');
      } else if (!this.isOnline) {
        this.showNotification('Connection issues detected - some features may be limited', 'warning');
        this.notifyListeners('connectivity:lost');
        this.updateBotStatus('offline', 'Server connection lost');
      }
      
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      this.showNotification('Unable to connect to server', 'error');
      this.notifyListeners('connectivity:lost');
      this.updateBotStatus('offline', 'Unable to connect to server');
      return false;
    }
  }

  /**
   * Check Discord API connectivity
   * Requirements: 7.4, 9.5
   */
  async checkDiscordConnectivity() {
    try {
      const response = await fetch('/api/health/discord', { method: 'GET' });
      const result = await response.json();
      
      if (result.success) {
        const { isConnected, warning, validationLimitations, status } = result.data;
        
        this.discordConnected = isConnected;
        this.validationLimitations = validationLimitations || [];
        
        // Update bot status based on Discord connectivity
        if (isConnected) {
          this.updateBotStatus(status === 'slow' ? 'warning' : 'online');
        } else {
          this.updateBotStatus('offline', warning || 'Discord API disconnected');
        }
        
        if (!isConnected && warning) {
          this.showNotification(warning, 'warning', validationLimitations);
          this.showDiscordConnectivityWarning(warning, validationLimitations);
        } else {
          this.hideDiscordConnectivityWarning();
        }
        
        this.notifyListeners('discord:connectivity', result.data);
        return result.data;
      }
      
      this.updateBotStatus('offline', 'Failed to check Discord connectivity');
      return { isConnected: false, warning: 'Failed to check Discord connectivity' };
    } catch (error) {
      console.error('Error checking Discord connectivity:', error);
      this.discordConnected = false;
      this.updateBotStatus('offline', 'Unable to check Discord API status');
      return { isConnected: false, warning: 'Unable to check Discord API status' };
    }
  }

  /**
   * Show Discord connectivity warning banner
   * Requirements: 7.4
   */
  showDiscordConnectivityWarning(warning, limitations) {
    let banner = document.getElementById('discord-connectivity-warning');
    
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'discord-connectivity-warning';
      banner.className = 'connectivity-warning';
      
      const container = document.querySelector('.dashboard-content') || document.body;
      container.insertBefore(banner, container.firstChild);
    }
    
    const limitationsList = limitations && limitations.length > 0
      ? `<ul class="limitation-list">${limitations.map(l => `<li>${l}</li>`).join('')}</ul>`
      : '';
    
    banner.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon">⚠️</span>
        <div class="warning-body">
          <strong>${warning}</strong>
          ${limitationsList}
        </div>
        <button class="warning-dismiss" onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
    `;
    
    banner.style.display = 'block';
  }

  /**
   * Hide Discord connectivity warning banner
   */
  hideDiscordConnectivityWarning() {
    const banner = document.getElementById('discord-connectivity-warning');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  /**
   * Detect and display configuration conflicts
   * Requirements: 7.5
   */
  async detectConflicts(config) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/validate/conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success && result.data.hasConflicts) {
        this.showConflictResolutionDialog(result.data.conflicts);
      }
      
      return result.data;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Show conflict resolution dialog
   * Requirements: 7.5
   */
  showConflictResolutionDialog(conflicts) {
    let dialog = document.getElementById('conflict-resolution-dialog');
    
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'conflict-resolution-dialog';
      dialog.className = 'modal conflict-dialog';
      document.body.appendChild(dialog);
    }
    
    const conflictItems = conflicts.map((conflict, index) => `
      <div class="conflict-item" data-conflict-index="${index}">
        <div class="conflict-header">
          <span class="conflict-type">${this.formatConflictType(conflict.type)}</span>
          <span class="conflict-fields">${conflict.affectedFields.join(', ')}</span>
        </div>
        <p class="conflict-description">${conflict.description}</p>
        <div class="conflict-suggestions">
          ${conflict.suggestions.map(s => `
            <button class="btn btn-sm btn-outline-primary suggestion-btn" 
                    data-action="${s.action}" 
                    data-conflict-type="${conflict.type}">
              ${s.description}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    dialog.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h5>Configuration Conflicts Detected</h5>
          <button class="close-btn" onclick="document.getElementById('conflict-resolution-dialog').style.display='none'">&times;</button>
        </div>
        <div class="modal-body">
          ${conflictItems}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('conflict-resolution-dialog').style.display='none'">
            Dismiss
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners for suggestion buttons
    dialog.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const conflictType = e.target.dataset.conflictType;
        await this.resolveConflict(conflictType, action);
        dialog.style.display = 'none';
      });
    });
    
    dialog.style.display = 'flex';
  }

  /**
   * Resolve a configuration conflict
   * Requirements: 7.5
   */
  async resolveConflict(conflictId, action) {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, action })
      });
      
      const result = await response.json();
      
      if (result.success && result.data.resolved) {
        this.showNotification(result.data.message, 'success');
        // Refresh configuration
        await this.getConfig(true);
        this.notifyListeners('conflict:resolved', result.data);
      } else {
        this.showNotification('Failed to resolve conflict', 'error');
      }
      
      return result;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      this.showNotification('Error resolving conflict', 'error');
      throw error;
    }
  }

  /**
   * Format conflict type for display
   */
  formatConflictType(type) {
    const typeLabels = {
      duplicate_channel: 'Duplicate Channel',
      role_hierarchy: 'Role Hierarchy',
      feature_dependency: 'Feature Dependency',
      permission_conflict: 'Permission Conflict'
    };
    return typeLabels[type] || type;
  }
  
  /**
   * Start connectivity monitoring
   */
  startConnectivityMonitoring(interval = 30000) {
    this.checkConnectivity();
    this.checkDiscordConnectivity();
    setInterval(() => {
      this.checkConnectivity();
      this.checkDiscordConnectivity();
    }, interval);
  }
}

// Export for use in other scripts
window.ConfigManager = ConfigManager;