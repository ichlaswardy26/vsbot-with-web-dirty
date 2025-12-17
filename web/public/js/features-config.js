/**
 * Features Configuration Module
 * Handles feature toggle switches, settings forms, and dependency detection
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

class FeaturesConfig {
  constructor(configManager) {
    this.configManager = configManager;
    this.guildId = configManager.guildId;
    this.baseUrl = '/api/features';
    this.currentConfig = {};
    this.featureDefinitions = {};
    this.apiConnected = false;
    this.validationTimers = new Map();
    this.warnings = [];
    
    // Feature dependencies - which features depend on others
    this.featureDependencies = {
      leveling: [],
      economy: [],
      ticket: [],
      games: ['economy'],
      welcome: [],
      confession: [],
      wordChain: ['economy'],
      giveaway: [],
      customRole: ['economy']
    };
  }

  /**
   * Initialize the features configuration interface
   * Requirements: 4.1
   */
  async initialize() {
    try {
      // Load feature definitions
      await this.loadFeatureDefinitions();
      
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Render the interface
      this.render();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.apiConnected = true;
      return true;
    } catch (error) {
      console.error('Error initializing features config:', error);
      this.configManager.showNotification('Failed to initialize features configuration', 'error');
      this.apiConnected = false;
      return false;
    }
  }

  /**
   * Load feature definitions
   * Requirements: 4.1
   */
  async loadFeatureDefinitions() {
    this.featureDefinitions = {
      leveling: {
        name: 'Leveling System',
        description: 'XP-based leveling with role rewards',
        icon: 'fa-chart-line',
        settings: [
          { key: 'xpCooldown', name: 'XP Cooldown', type: 'number', min: 30000, max: 300000, step: 1000, unit: 'ms', description: 'Cooldown between XP gains' },
          { key: 'xpMin', name: 'Minimum XP', type: 'number', min: 5, max: 50, description: 'Minimum XP per message' },
          { key: 'xpMax', name: 'Maximum XP', type: 'number', min: 10, max: 100, description: 'Maximum XP per message' },
          { key: 'voiceXpPerMinute', name: 'Voice XP/Min', type: 'number', min: 1, max: 50, description: 'XP earned per minute in voice' }
        ]
      },
      economy: {
        name: 'Economy System',
        description: 'Virtual currency and rewards',
        icon: 'fa-coins',
        settings: [
          { key: 'dailyReward', name: 'Daily Reward', type: 'number', min: 50, max: 1000, description: 'Daily claim reward amount' },
          { key: 'collectCooldown', name: 'Collect Cooldown', type: 'number', min: 1800000, max: 7200000, step: 60000, unit: 'ms', description: 'Cooldown for collect command' }
        ]
      },
      ticket: {
        name: 'Ticket System',
        description: 'Support ticket management',
        icon: 'fa-ticket-alt',
        settings: [
          { key: 'prefix', name: 'Ticket Prefix', type: 'text', maxLength: 20, description: 'Prefix for ticket channel names' },
          { key: 'maxTicketsPerUser', name: 'Max Tickets', type: 'number', min: 1, max: 10, description: 'Maximum open tickets per user' }
        ]
      },
      games: {
        name: 'Mini Games',
        description: 'Fun games and activities',
        icon: 'fa-gamepad',
        dependsOn: ['economy'],
        settings: [
          { key: 'rewardMultiplier', name: 'Reward Multiplier', type: 'number', min: 0.5, max: 3, step: 0.1, description: 'Multiplier for game rewards' }
        ]
      },
      welcome: {
        name: 'Welcome System',
        description: 'Welcome messages for new members',
        icon: 'fa-door-open',
        settings: [
          { key: 'message', name: 'Welcome Message', type: 'textarea', maxLength: 500, description: 'Message sent to new members. Use {user} for mention, {server} for server name' },
          { key: 'dmEnabled', name: 'Send DM', type: 'toggle', description: 'Also send welcome message via DM' }
        ]
      },
      confession: {
        name: 'Confession System',
        description: 'Anonymous confessions',
        icon: 'fa-user-secret',
        settings: [
          { key: 'cooldown', name: 'Confession Cooldown', type: 'number', min: 60000, max: 3600000, step: 60000, unit: 'ms', description: 'Cooldown between confessions' },
          { key: 'anonymous', name: 'Force Anonymous', type: 'toggle', description: 'Always hide confessor identity' }
        ]
      },
      wordChain: {
        name: 'Word Chain Game',
        description: 'Word chain game with rewards',
        icon: 'fa-link',
        dependsOn: ['economy'],
        settings: [
          { key: 'timeout', name: 'Turn Timeout', type: 'number', min: 10000, max: 120000, step: 5000, unit: 'ms', description: 'Time limit per turn' },
          { key: 'reward', name: 'Win Reward', type: 'number', min: 0, max: 100, description: 'Currency reward for valid words' }
        ]
      },
      giveaway: {
        name: 'Giveaway System',
        description: 'Host giveaways with reactions',
        icon: 'fa-gift',
        settings: [
          { key: 'emoji', name: 'Reaction Emoji', type: 'emoji', description: 'Emoji for giveaway entries' },
          { key: 'winnerCount', name: 'Default Winners', type: 'number', min: 1, max: 20, description: 'Default number of winners' }
        ]
      },
      customRole: {
        name: 'Custom Roles',
        description: 'Allow users to create custom roles',
        icon: 'fa-palette',
        dependsOn: ['economy'],
        settings: [
          { key: 'price', name: 'Role Price', type: 'number', min: 100, max: 100000, description: 'Cost to create a custom role' },
          { key: 'maxRoles', name: 'Max Roles', type: 'number', min: 1, max: 5, description: 'Maximum custom roles per user' }
        ]
      }
    };
  }


  /**
   * Load current feature configuration
   * Requirements: 4.1
   */
  async loadCurrentConfig() {
    try {
      const config = await this.configManager.getConfigSection('features');
      this.currentConfig = config || this.getDefaultConfig();
      return this.currentConfig;
    } catch (error) {
      console.error('Error loading current config:', error);
      this.currentConfig = this.getDefaultConfig();
      return this.currentConfig;
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    const defaults = {};
    Object.keys(this.featureDefinitions).forEach(featureKey => {
      defaults[featureKey] = { enabled: false };
      const feature = this.featureDefinitions[featureKey];
      if (feature.settings) {
        feature.settings.forEach(setting => {
          if (setting.type === 'toggle') {
            defaults[featureKey][setting.key] = false;
          } else if (setting.type === 'number') {
            defaults[featureKey][setting.key] = setting.min || 0;
          } else {
            defaults[featureKey][setting.key] = '';
          }
        });
      }
    });
    return defaults;
  }

  /**
   * Render the features configuration interface
   * Requirements: 4.1, 4.2
   */
  render() {
    const container = document.getElementById('features-config-container');
    if (!container) {
      console.error('Features config container not found');
      return;
    }
    
    container.innerHTML = `
      <form id="features-config-form" class="config-form">
        <div id="feature-warnings-banner" class="warnings-banner" style="display: none;"></div>
        ${this.renderFeatureCards()}
        
        <div class="d-flex gap-2 mt-4">
          <button type="submit" class="btn btn-primary" data-config-save>
            <i class="fas fa-save me-2"></i>Save Feature Configuration
          </button>
          <button type="button" class="btn btn-outline-secondary" id="refresh-features-btn">
            <i class="fas fa-sync me-2"></i>Refresh
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render feature cards
   * Requirements: 4.1, 4.2
   */
  renderFeatureCards() {
    return Object.entries(this.featureDefinitions).map(([featureKey, feature]) => {
      const config = this.currentConfig[featureKey] || { enabled: false };
      const isEnabled = config.enabled;
      const hasDependencies = feature.dependsOn && feature.dependsOn.length > 0;
      const dependenciesMet = this.checkDependencies(featureKey);
      
      return `
        <div class="card feature-card mb-4" data-feature="${featureKey}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <i class="fas ${feature.icon} feature-icon me-3"></i>
              <div>
                <h5 class="card-title mb-0">${feature.name}</h5>
                <p class="feature-description mb-0">${feature.description}</p>
              </div>
            </div>
            <div class="d-flex align-items-center gap-3">
              <span class="feature-status ${isEnabled ? 'status-enabled' : 'status-disabled'}">
                ${isEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <div class="form-check form-switch">
                <input 
                  class="form-check-input feature-toggle" 
                  type="checkbox" 
                  id="toggle-${featureKey}"
                  name="${featureKey}.enabled"
                  ${isEnabled ? 'checked' : ''}
                  ${!dependenciesMet ? 'disabled' : ''}
                  data-feature="${featureKey}"
                >
              </div>
            </div>
          </div>
          ${hasDependencies ? this.renderDependencyWarning(featureKey, feature.dependsOn, dependenciesMet) : ''}
          <div class="collapse ${isEnabled ? 'show' : ''}" id="settings-${featureKey}">
            <div class="card-body">
              ${this.renderFeatureSettings(featureKey, feature, config)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render dependency warning
   * Requirements: 4.4
   */
  renderDependencyWarning(featureKey, dependencies, dependenciesMet) {
    if (dependenciesMet) {
      return '';
    }
    
    const missingDeps = dependencies.filter(dep => !this.isFeatureEnabled(dep));
    const depNames = missingDeps.map(dep => this.featureDefinitions[dep]?.name || dep).join(', ');
    
    return `
      <div class="dependency-warning alert alert-warning m-3 mb-0">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Dependency Required:</strong> Enable ${depNames} first to use this feature.
      </div>
    `;
  }

  /**
   * Render feature settings
   * Requirements: 4.3
   */
  renderFeatureSettings(featureKey, feature, config) {
    if (!feature.settings || feature.settings.length === 0) {
      return '<p class="text-muted mb-0">No additional settings for this feature.</p>';
    }
    
    return `
      <div class="row">
        ${feature.settings.map(setting => this.renderSettingField(featureKey, setting, config)).join('')}
      </div>
    `;
  }

  /**
   * Render a single setting field
   * Requirements: 4.3
   */
  renderSettingField(featureKey, setting, config) {
    const { key, name, type, description, min, max, step, unit, maxLength } = setting;
    const value = config[key] !== undefined ? config[key] : (setting.default || '');
    const fieldId = `${featureKey}-${key}`;
    const fieldName = `${featureKey}.${key}`;
    
    let inputHtml = '';
    
    switch (type) {
      case 'number':
        inputHtml = `
          <div class="input-group">
            <input 
              type="number" 
              class="form-control setting-input" 
              id="${fieldId}"
              name="${fieldName}"
              value="${value}"
              min="${min || 0}"
              max="${max || 999999}"
              step="${step || 1}"
              data-validate="range"
              data-min="${min || 0}"
              data-max="${max || 999999}"
            >
            ${unit ? `<span class="input-group-text">${unit}</span>` : ''}
          </div>
        `;
        break;
        
      case 'text':
        inputHtml = `
          <input 
            type="text" 
            class="form-control setting-input" 
            id="${fieldId}"
            name="${fieldName}"
            value="${value}"
            maxlength="${maxLength || 100}"
          >
        `;
        break;
        
      case 'textarea':
        inputHtml = `
          <textarea 
            class="form-control setting-input" 
            id="${fieldId}"
            name="${fieldName}"
            rows="3"
            maxlength="${maxLength || 500}"
          >${value}</textarea>
        `;
        break;
        
      case 'toggle':
        inputHtml = `
          <div class="form-check form-switch">
            <input 
              class="form-check-input setting-toggle" 
              type="checkbox" 
              id="${fieldId}"
              name="${fieldName}"
              ${value ? 'checked' : ''}
            >
            <label class="form-check-label" for="${fieldId}">
              ${value ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        `;
        break;
        
      case 'emoji':
        inputHtml = `
          <input 
            type="text" 
            class="form-control setting-input emoji-input" 
            id="${fieldId}"
            name="${fieldName}"
            value="${value}"
            placeholder="Enter emoji or custom emoji ID"
            data-validate="emoji"
          >
        `;
        break;
        
      default:
        inputHtml = `
          <input 
            type="text" 
            class="form-control setting-input" 
            id="${fieldId}"
            name="${fieldName}"
            value="${value}"
          >
        `;
    }
    
    return `
      <div class="col-md-6 mb-3">
        <div class="form-group">
          <label for="${fieldId}" class="form-label">${name}</label>
          <small class="d-block text-muted mb-2">${description}</small>
          ${inputHtml}
          <div class="setting-validation-feedback" id="${fieldId}-feedback"></div>
        </div>
      </div>
    `;
  }


  /**
   * Setup event listeners
   * Requirements: 4.2, 4.3, 4.4, 4.5
   */
  setupEventListeners() {
    const form = document.getElementById('features-config-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfiguration();
    });
    
    // Feature toggle changes
    form.querySelectorAll('.feature-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.handleFeatureToggle(e.target);
      });
    });
    
    // Setting input changes with validation
    form.querySelectorAll('.setting-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.validateSettingInput(e.target);
      });
      input.addEventListener('blur', (e) => {
        this.validateSettingInput(e.target);
      });
    });
    
    // Setting toggle changes
    form.querySelectorAll('.setting-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const label = e.target.parentElement.querySelector('.form-check-label');
        if (label) {
          label.textContent = e.target.checked ? 'Enabled' : 'Disabled';
        }
      });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-features-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshFeatures();
      });
    }
  }

  /**
   * Handle feature toggle
   * Requirements: 4.2, 4.4
   */
  handleFeatureToggle(toggle) {
    const featureKey = toggle.dataset.feature;
    const isEnabled = toggle.checked;
    const card = toggle.closest('.feature-card');
    const settingsCollapse = card.querySelector(`#settings-${featureKey}`);
    const statusBadge = card.querySelector('.feature-status');
    
    // Update status badge
    if (statusBadge) {
      statusBadge.textContent = isEnabled ? 'Enabled' : 'Disabled';
      statusBadge.className = `feature-status ${isEnabled ? 'status-enabled' : 'status-disabled'}`;
    }
    
    // Toggle settings visibility
    if (settingsCollapse) {
      if (isEnabled) {
        settingsCollapse.classList.add('show');
      } else {
        settingsCollapse.classList.remove('show');
      }
    }
    
    // Check for dependency warnings when disabling
    if (!isEnabled) {
      this.checkDependencyWarnings(featureKey);
    }
    
    // Update dependent features
    this.updateDependentFeatures(featureKey, isEnabled);
  }

  /**
   * Check and display dependency warnings
   * Requirements: 4.4
   */
  checkDependencyWarnings(disabledFeature) {
    const dependentFeatures = this.getDependentFeatures(disabledFeature);
    
    if (dependentFeatures.length > 0) {
      const featureNames = dependentFeatures
        .map(f => this.featureDefinitions[f]?.name || f)
        .join(', ');
      
      this.configManager.showNotification(
        `Warning: Disabling ${this.featureDefinitions[disabledFeature]?.name} may affect: ${featureNames}`,
        'warning'
      );
      
      this.warnings.push({
        type: 'dependency',
        feature: disabledFeature,
        affected: dependentFeatures,
        message: `Disabling ${this.featureDefinitions[disabledFeature]?.name} may affect: ${featureNames}`
      });
      
      this.renderWarningsBanner();
    }
  }

  /**
   * Get features that depend on a given feature
   */
  getDependentFeatures(featureKey) {
    return Object.entries(this.featureDependencies)
      .filter(([feature, deps]) => deps.includes(featureKey) && this.isFeatureEnabled(feature))
      .map(([feature]) => feature);
  }

  /**
   * Update dependent features when a dependency is toggled
   * Requirements: 4.4
   */
  updateDependentFeatures(featureKey, isEnabled) {
    // Find features that depend on this one
    Object.entries(this.featureDependencies).forEach(([feature, deps]) => {
      if (deps.includes(featureKey)) {
        const toggle = document.getElementById(`toggle-${feature}`);
        const card = document.querySelector(`[data-feature="${feature}"]`);
        
        if (toggle && card) {
          const dependenciesMet = this.checkDependencies(feature);
          toggle.disabled = !dependenciesMet;
          
          // Update dependency warning
          const existingWarning = card.querySelector('.dependency-warning');
          if (!dependenciesMet) {
            if (!existingWarning) {
              const warningHtml = this.renderDependencyWarning(
                feature, 
                this.featureDefinitions[feature].dependsOn, 
                false
              );
              card.querySelector('.card-header').insertAdjacentHTML('afterend', warningHtml);
            }
            // Disable the feature if dependency is not met
            if (toggle.checked) {
              toggle.checked = false;
              this.handleFeatureToggle(toggle);
            }
          } else if (existingWarning) {
            existingWarning.remove();
          }
        }
      }
    });
  }

  /**
   * Check if all dependencies for a feature are met
   */
  checkDependencies(featureKey) {
    const deps = this.featureDependencies[featureKey] || [];
    return deps.every(dep => this.isFeatureEnabled(dep));
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureKey) {
    const toggle = document.getElementById(`toggle-${featureKey}`);
    if (toggle) {
      return toggle.checked;
    }
    return this.currentConfig[featureKey]?.enabled || false;
  }

  /**
   * Validate setting input
   * Requirements: 4.5
   */
  validateSettingInput(input) {
    const validateType = input.dataset.validate;
    const feedbackId = `${input.id}-feedback`;
    const feedbackContainer = document.getElementById(feedbackId);
    
    // Clear previous validation
    input.classList.remove('is-valid', 'is-invalid');
    if (feedbackContainer) {
      feedbackContainer.innerHTML = '';
    }
    
    if (!input.value && input.value !== 0) {
      return { isValid: true, errors: [] };
    }
    
    const errors = [];
    
    switch (validateType) {
      case 'range':
        const value = parseFloat(input.value);
        const min = parseFloat(input.dataset.min);
        const max = parseFloat(input.dataset.max);
        
        if (isNaN(value)) {
          errors.push('Please enter a valid number');
        } else if (value < min) {
          errors.push(`Value must be at least ${min}`);
        } else if (value > max) {
          errors.push(`Value must be at most ${max}`);
        }
        break;
        
      case 'emoji':
        const emojiPattern = /^(<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])$/u;
        if (input.value && !emojiPattern.test(input.value)) {
          errors.push('Please enter a valid emoji or custom emoji ID');
        }
        break;
    }
    
    const isValid = errors.length === 0;
    input.classList.add(isValid ? 'is-valid' : 'is-invalid');
    
    if (feedbackContainer && errors.length > 0) {
      feedbackContainer.innerHTML = `<div class="text-danger small">${errors[0]}</div>`;
    }
    
    return { isValid, errors };
  }

  /**
   * Render warnings banner
   */
  renderWarningsBanner() {
    const banner = document.getElementById('feature-warnings-banner');
    if (!banner) return;
    
    if (this.warnings.length === 0) {
      banner.style.display = 'none';
      return;
    }
    
    banner.innerHTML = `
      <div class="alert alert-warning">
        <h6 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Warnings</h6>
        <ul class="mb-0">
          ${this.warnings.map(w => `<li>${w.message}</li>`).join('')}
        </ul>
      </div>
    `;
    banner.style.display = 'block';
  }

  /**
   * Collect form data
   */
  collectFormData(form) {
    const formData = {};
    
    // Collect feature toggles
    form.querySelectorAll('.feature-toggle').forEach(toggle => {
      const featureKey = toggle.dataset.feature;
      if (!formData[featureKey]) {
        formData[featureKey] = {};
      }
      formData[featureKey].enabled = toggle.checked;
    });
    
    // Collect settings
    form.querySelectorAll('.setting-input, .setting-toggle').forEach(input => {
      const nameParts = input.name.split('.');
      if (nameParts.length === 2) {
        const [featureKey, settingKey] = nameParts;
        if (!formData[featureKey]) {
          formData[featureKey] = {};
        }
        
        if (input.type === 'checkbox') {
          formData[featureKey][settingKey] = input.checked;
        } else if (input.type === 'number') {
          formData[featureKey][settingKey] = parseFloat(input.value) || 0;
        } else {
          formData[featureKey][settingKey] = input.value;
        }
      }
    });
    
    return formData;
  }

  /**
   * Save feature configuration
   * Requirements: 4.2, 4.5
   */
  async saveConfiguration() {
    const form = document.getElementById('features-config-form');
    if (!form) return;
    
    // Validate all inputs
    let hasErrors = false;
    form.querySelectorAll('.setting-input[data-validate]').forEach(input => {
      const result = this.validateSettingInput(input);
      if (!result.isValid) hasErrors = true;
    });
    
    if (hasErrors) {
      this.configManager.showNotification('Please fix validation errors before saving', 'error');
      return;
    }
    
    // Collect form data
    const formData = this.collectFormData(form);
    
    try {
      this.configManager.updateConfigStatus('features', 'saving');
      
      // Check for dependency warnings
      const warnings = [];
      Object.entries(formData).forEach(([featureKey, config]) => {
        if (!config.enabled) {
          const dependents = this.getDependentFeatures(featureKey);
          if (dependents.length > 0) {
            const featureName = this.featureDefinitions[featureKey]?.name || featureKey;
            const depNames = dependents.map(d => this.featureDefinitions[d]?.name || d).join(', ');
            warnings.push(`Disabling ${featureName} may affect: ${depNames}`);
          }
        }
      });
      
      await this.configManager.updateConfigSection('features', formData);
      this.currentConfig = formData;
      this.warnings = [];
      this.renderWarningsBanner();
      this.configManager.updateConfigStatus('features', 'saved');
      
      if (warnings.length > 0) {
        this.configManager.showNotification('Features saved with warnings', 'warning', warnings);
      }
    } catch (error) {
      console.error('Error saving feature configuration:', error);
      this.configManager.updateConfigStatus('features', 'error');
    }
  }

  /**
   * Refresh features configuration
   */
  async refreshFeatures() {
    try {
      this.configManager.showNotification('Refreshing features...', 'info');
      await this.loadCurrentConfig();
      this.render();
      this.setupEventListeners();
      this.configManager.showNotification('Features refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing features:', error);
      this.configManager.showNotification('Failed to refresh features', 'error');
    }
  }

  /**
   * Get feature status
   */
  getFeatureStatus(featureKey) {
    return this.currentConfig[featureKey]?.enabled || false;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures() {
    return Object.entries(this.currentConfig)
      .filter(([key, config]) => config.enabled)
      .map(([key]) => ({
        key,
        name: this.featureDefinitions[key]?.name || key,
        config: this.currentConfig[key]
      }));
  }
}

// Export for use in other scripts
window.FeaturesConfig = FeaturesConfig;
