/**
 * Roles Configuration Module
 * Handles role configuration interface with Discord API integration
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

class RolesConfig {
  constructor(configManager) {
    this.configManager = configManager;
    this.guildId = configManager.guildId;
    this.baseUrl = '/api/roles';
    this.guildRoles = [];
    this.currentConfig = {};
    this.roleCategories = {};
    this.displayNames = {};
    this.apiConnected = false;
    this.botHighestRole = null;
    this.validationTimers = new Map();
    this.conflicts = [];
    this.warnings = [];
  }

  /**
   * Initialize the roles configuration interface
   * Requirements: 3.1
   */
  async initialize() {
    try {
      // Load guild roles from Discord API
      await this.loadGuildRoles();
      
      // Load role category definitions
      await this.loadRoleCategories();
      
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Render the interface
      this.render();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initial conflict detection
      await this.detectConflicts();
      
      return true;
    } catch (error) {
      console.error('Error initializing roles config:', error);
      this.configManager.showNotification('Failed to initialize roles configuration', 'error');
      return false;
    }
  }

  /**
   * Load guild roles from Discord API
   * Requirements: 3.1
   */
  async loadGuildRoles() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}`);
      const result = await response.json();
      
      if (result.success) {
        this.apiConnected = true;
        this.guildRoles = result.data.roles || [];
        this.botHighestRole = result.data.botHighestRole;
        return this.guildRoles;
      } else {
        throw new Error(result.error || 'Failed to load roles');
      }
    } catch (error) {
      console.error('Error loading guild roles:', error);
      this.apiConnected = false;
      throw error;
    }
  }

  /**
   * Load role category definitions for configuration
   * Requirements: 3.1
   */
  async loadRoleCategories() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/categories`);
      const result = await response.json();
      
      if (result.success) {
        this.roleCategories = result.data.categories;
        this.displayNames = result.data.displayNames;
      }
    } catch (error) {
      console.error('Error loading role categories:', error);
      // Use default categories if API fails
      this.roleCategories = this.getDefaultCategories();
    }
  }

  /**
   * Get default role categories
   */
  getDefaultCategories() {
    return {
      level: {
        name: 'Level Roles',
        description: 'Roles awarded at specific levels',
        roles: [
          { key: 'level.5', name: 'Level 5 Role', level: 5 },
          { key: 'level.10', name: 'Level 10 Role', level: 10 },
          { key: 'level.15', name: 'Level 15 Role', level: 15 },
          { key: 'level.20', name: 'Level 20 Role', level: 20 },
          { key: 'level.25', name: 'Level 25 Role', level: 25 },
          { key: 'level.30', name: 'Level 30 Role', level: 30 },
          { key: 'level.40', name: 'Level 40 Role', level: 40 },
          { key: 'level.50', name: 'Level 50 Role', level: 50 }
        ]
      },
      staff: {
        name: 'Staff Roles',
        description: 'Roles for server staff and moderators',
        roles: [
          { key: 'staff.admin', name: 'Admin Role', permissions: ['Administrator'] },
          { key: 'staff.moderator', name: 'Moderator Role', permissions: ['ModerateMembers'] },
          { key: 'staff.helper', name: 'Helper Role', permissions: ['ManageMessages'] }
        ]
      },
      special: {
        name: 'Special Roles',
        description: 'Special purpose roles',
        roles: [
          { key: 'special.booster', name: 'Server Booster Role' },
          { key: 'special.vip', name: 'VIP Role' },
          { key: 'special.muted', name: 'Muted Role' }
        ]
      }
    };
  }

  /**
   * Load current role configuration
   * Requirements: 3.1
   */
  async loadCurrentConfig() {
    try {
      const config = await this.configManager.getConfigSection('roles');
      this.currentConfig = config || {};
      return this.currentConfig;
    } catch (error) {
      console.error('Error loading current config:', error);
      this.currentConfig = {};
      return {};
    }
  }


  /**
   * Render the roles configuration interface
   * Requirements: 3.1, 3.2, 3.3
   */
  render() {
    const container = document.getElementById('roles-config-container');
    if (!container) {
      console.error('Roles config container not found');
      return;
    }
    
    container.innerHTML = `
      <form id="roles-config-form" class="config-form">
        <div id="role-conflicts-banner" class="conflicts-banner" style="display: none;"></div>
        ${this.renderRoleCategories()}
        
        <div class="d-flex gap-2 mt-4">
          <button type="submit" class="btn btn-primary" data-config-save>
            <i class="fas fa-save me-2"></i>Save Role Configuration
          </button>
          <button type="button" class="btn btn-outline-secondary" id="refresh-roles-btn">
            <i class="fas fa-sync me-2"></i>Refresh Roles
          </button>
          <button type="button" class="btn btn-outline-warning" id="check-conflicts-btn">
            <i class="fas fa-exclamation-triangle me-2"></i>Check Conflicts
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render role category sections
   * Requirements: 3.1, 3.2
   */
  renderRoleCategories() {
    return Object.entries(this.roleCategories).map(([categoryKey, category]) => `
      <div class="card role-category mb-4" data-category="${categoryKey}">
        <div class="card-header collapse-toggle" data-bs-toggle="collapse" data-bs-target="#category-${categoryKey}">
          <h5 class="card-title mb-0">
            <i class="fas fa-users-cog me-2"></i>${category.name}
          </h5>
          <p class="category-description mb-0">${category.description}</p>
        </div>
        <div class="collapse show" id="category-${categoryKey}">
          <div class="card-body">
            <div class="row">
              ${category.roles.map(role => this.renderRoleSelect(role, categoryKey)).join('')}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render a single role select field
   * Requirements: 3.2, 3.3, 3.4
   */
  renderRoleSelect(roleConfig, categoryKey) {
    const { key, name, level, permissions } = roleConfig;
    const currentValue = this.getNestedValue(this.currentConfig, key) || '';
    const icon = categoryKey === 'staff' ? 'fa-shield-alt' : categoryKey === 'level' ? 'fa-star' : 'fa-tag';
    
    // Determine role type for validation
    const roleType = categoryKey === 'level' ? 'level' : categoryKey === 'staff' ? 'staff' : 'special';
    
    return `
      <div class="col-md-6 mb-3">
        <div class="form-group">
          <label for="${key.replace(/\./g, '-')}" class="form-label">
            <i class="fas ${icon} role-icon me-1"></i>${name}
            ${level ? `<span class="badge bg-primary ms-2">Level ${level}</span>` : ''}
          </label>
          ${permissions && permissions.length > 0 ? `
            <small class="d-block text-muted mb-2">
              Required permissions: ${permissions.join(', ')}
            </small>
          ` : ''}
          <div class="role-select-wrapper">
            <select 
              id="${key.replace(/\./g, '-')}" 
              name="${key}" 
              class="form-select role-select"
              data-validate="roleId"
              data-role-type="${roleType}"
              data-level="${level || ''}"
              data-permissions="${permissions ? permissions.join(',') : ''}"
            >
              <option value="">-- Select Role --</option>
              ${this.renderRoleOptions(currentValue)}
            </select>
            <button type="button" class="btn-clear-role" data-clear="${key}" title="Clear selection" ${!currentValue ? 'disabled' : ''}>
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="role-preview" id="${key.replace(/\./g, '-')}-preview">
            ${currentValue ? this.renderRolePreview(currentValue) : ''}
          </div>
          <div class="role-validation-feedback" id="${key.replace(/\./g, '-')}-feedback"></div>
        </div>
      </div>
    `;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  /**
   * Render role options sorted by position
   * Requirements: 3.2
   */
  renderRoleOptions(selectedValue) {
    // Filter out @everyone role and sort by position (highest first)
    const sortedRoles = this.guildRoles
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => b.position - a.position);
    
    return sortedRoles.map(role => {
      const canManage = role.canManage !== false;
      const managedBadge = role.managed ? ' [Bot/Integration]' : '';
      const unmanageableBadge = !canManage ? ' [Cannot Manage]' : '';
      
      return `
        <option 
          value="${role.id}" 
          ${role.id === selectedValue ? 'selected' : ''}
          ${!canManage ? 'disabled' : ''}
          style="color: ${role.color !== '#000000' ? role.color : 'inherit'}"
        >
          ${role.name}${managedBadge}${unmanageableBadge}
        </option>
      `;
    }).join('');
  }

  /**
   * Render role preview
   * Requirements: 3.4
   */
  renderRolePreview(roleId) {
    const role = this.findRoleById(roleId);
    if (!role) {
      return `<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Role not found</span>`;
    }
    
    const colorStyle = role.color !== '#000000' ? `color: ${role.color}` : '';
    const managedBadge = role.managed ? '<span class="badge bg-secondary ms-2">Bot Role</span>' : '';
    const canManageBadge = role.canManage === false ? '<span class="badge bg-warning ms-2">Cannot Manage</span>' : '';
    
    return `
      <div class="d-flex align-items-center">
        <span class="role-color-dot" style="background-color: ${role.color}"></span>
        <span class="role-name" style="${colorStyle}">${role.name}</span>
        ${managedBadge}
        ${canManageBadge}
        <span class="text-muted ms-2 small">Position: ${role.position}</span>
      </div>
    `;
  }

  /**
   * Find role by ID
   */
  findRoleById(roleId) {
    return this.guildRoles.find(role => role.id === roleId);
  }

  /**
   * Setup event listeners
   * Requirements: 3.4, 3.5
   */
  setupEventListeners() {
    const form = document.getElementById('roles-config-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfiguration();
    });
    
    // Role select changes - update preview and validate
    form.querySelectorAll('.role-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        this.updateRolePreview(e.target);
        await this.validateRoleSelection(e.target);
        this.updateClearButtonState(e.target);
        // Re-check conflicts when roles change
        await this.detectConflicts();
      });
    });
    
    // Clear role buttons
    form.querySelectorAll('.btn-clear-role').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const key = btn.dataset.clear;
        await this.clearRoleSelection(key);
      });
    });
    
    // Refresh roles button
    const refreshBtn = document.getElementById('refresh-roles-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshRoles();
      });
    }
    
    // Check conflicts button
    const conflictsBtn = document.getElementById('check-conflicts-btn');
    if (conflictsBtn) {
      conflictsBtn.addEventListener('click', async () => {
        await this.detectConflicts();
        this.configManager.showNotification(
          this.conflicts.length > 0 ? `Found ${this.conflicts.length} conflict(s)` : 'No conflicts detected',
          this.conflicts.length > 0 ? 'warning' : 'success'
        );
      });
    }
  }

  /**
   * Update clear button state based on selection
   * Requirements: 3.4
   */
  updateClearButtonState(selectElement) {
    const clearBtn = selectElement.parentElement.querySelector('.btn-clear-role');
    if (clearBtn) {
      clearBtn.disabled = !selectElement.value;
    }
  }

  /**
   * Clear a role selection
   * Requirements: 3.4
   */
  async clearRoleSelection(key) {
    const selectId = key.replace(/\./g, '-');
    const select = document.getElementById(selectId);
    if (select) {
      select.value = '';
      this.updateRolePreview(select);
      await this.validateRoleSelection(select);
      this.updateClearButtonState(select);
      await this.detectConflicts();
      
      // Show notification
      const displayName = this.displayNames[key] || key;
      this.configManager.showNotification(`${displayName} cleared`, 'info');
    }
  }

  /**
   * Update role preview on selection change
   * Requirements: 3.4
   */
  updateRolePreview(selectElement) {
    const previewId = `${selectElement.id}-preview`;
    const previewContainer = document.getElementById(previewId);
    
    if (previewContainer) {
      const roleId = selectElement.value;
      previewContainer.innerHTML = roleId ? this.renderRolePreview(roleId) : '';
    }
  }


  /**
   * Validate role selection
   * Requirements: 3.2, 3.3, 3.5
   */
  async validateRoleSelection(selectElement) {
    const roleId = selectElement.value;
    const roleType = selectElement.dataset.roleType;
    const level = selectElement.dataset.level;
    const permissions = selectElement.dataset.permissions ? selectElement.dataset.permissions.split(',').filter(p => p) : [];
    const feedbackId = `${selectElement.id}-feedback`;
    const feedbackContainer = document.getElementById(feedbackId);
    
    // Clear previous validation
    selectElement.classList.remove('is-valid', 'is-invalid');
    if (feedbackContainer) {
      feedbackContainer.innerHTML = '';
    }
    
    if (!roleId) {
      return { isValid: true, errors: [] }; // Empty is valid (optional)
    }
    
    const role = this.findRoleById(roleId);
    const errors = [];
    const warnings = [];
    
    if (!role) {
      errors.push('Selected role no longer exists');
    } else {
      // Check if role can be managed by bot
      if (role.canManage === false) {
        errors.push('Bot cannot manage this role - it is higher than or equal to bot\'s highest role');
      }
      
      // Check if role is managed (bot/integration role)
      if (role.managed) {
        warnings.push('This is a bot/integration role and may not be assignable');
      }
      
      // Validate hierarchy for level roles
      if (roleType === 'level' && level) {
        try {
          const response = await fetch(`${this.baseUrl}/${this.guildId}/validate-hierarchy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId, level: parseInt(level) })
          });
          const result = await response.json();
          
          if (result.success && !result.data.valid) {
            errors.push(result.data.error);
            if (result.data.suggestion) {
              warnings.push(result.data.suggestion);
            }
          }
        } catch (error) {
          console.error('Error validating hierarchy:', error);
        }
      }
      
      // Verify staff role permissions
      if (roleType === 'staff' && permissions.length > 0) {
        try {
          const response = await fetch(`${this.baseUrl}/${this.guildId}/verify-staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId, requiredPermissions: permissions })
          });
          const result = await response.json();
          
          if (result.success && !result.data.valid && result.data.missingPermissions) {
            warnings.push(`Role is missing permissions: ${result.data.missingPermissions.join(', ')}`);
            if (result.data.suggestion) {
              warnings.push(result.data.suggestion);
            }
          }
        } catch (error) {
          console.error('Error verifying staff role:', error);
        }
      }
    }
    
    const isValid = errors.length === 0;
    selectElement.classList.add(isValid ? 'is-valid' : 'is-invalid');
    
    // Update validation feedback
    if (feedbackContainer) {
      let feedbackHtml = '';
      
      if (errors.length > 0) {
        feedbackHtml += errors.map(e => `<div class="text-danger small"><i class="fas fa-times-circle me-1"></i>${e}</div>`).join('');
      }
      
      if (warnings.length > 0) {
        feedbackHtml += warnings.map(w => `<div class="text-warning small"><i class="fas fa-exclamation-triangle me-1"></i>${w}</div>`).join('');
      }
      
      feedbackContainer.innerHTML = feedbackHtml;
    }
    
    return { isValid, errors, warnings };
  }

  /**
   * Detect role conflicts in current configuration
   * Requirements: 3.5
   */
  async detectConflicts() {
    const form = document.getElementById('roles-config-form');
    if (!form) return;
    
    // Collect current form data
    const formData = this.collectFormData(form);
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}/detect-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      
      if (result.success) {
        this.conflicts = result.data.conflicts || [];
        this.warnings = result.data.warnings || [];
        this.renderConflictsBanner();
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }
  }

  /**
   * Render conflicts banner
   * Requirements: 3.5
   */
  renderConflictsBanner() {
    const banner = document.getElementById('role-conflicts-banner');
    if (!banner) return;
    
    if (this.conflicts.length === 0 && this.warnings.length === 0) {
      banner.style.display = 'none';
      return;
    }
    
    let html = '';
    
    if (this.conflicts.length > 0) {
      html += `
        <div class="alert alert-danger mb-3">
          <h6 class="alert-heading"><i class="fas fa-exclamation-circle me-2"></i>Role Conflicts Detected</h6>
          <ul class="mb-0">
            ${this.conflicts.map(c => `
              <li>
                <strong>${c.type}:</strong> ${c.message}
                ${c.suggestion ? `<br><small class="text-muted">${c.suggestion}</small>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    if (this.warnings.length > 0) {
      html += `
        <div class="alert alert-warning mb-3">
          <h6 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Warnings</h6>
          <ul class="mb-0">
            ${this.warnings.map(w => `<li>${w.message}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    banner.innerHTML = html;
    banner.style.display = 'block';
  }

  /**
   * Collect form data
   */
  collectFormData(form) {
    const formData = {};
    form.querySelectorAll('.role-select').forEach(select => {
      if (select.value) {
        this.setNestedValue(formData, select.name, select.value);
      }
    });
    return formData;
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * Save role configuration
   * Requirements: 3.4, 3.5
   */
  async saveConfiguration() {
    const form = document.getElementById('roles-config-form');
    if (!form) return;
    
    // Collect form data
    const formData = this.collectFormData(form);
    
    // Validate all selections
    let hasErrors = false;
    const validationPromises = [];
    
    form.querySelectorAll('.role-select').forEach(select => {
      validationPromises.push(this.validateRoleSelection(select));
    });
    
    const results = await Promise.all(validationPromises);
    hasErrors = results.some(r => !r.isValid);
    
    // Check for conflicts
    await this.detectConflicts();
    
    if (hasErrors) {
      this.configManager.showNotification('Please fix validation errors before saving', 'error');
      return;
    }
    
    if (this.conflicts.length > 0) {
      const proceed = confirm('There are role conflicts detected. Do you want to save anyway?');
      if (!proceed) return;
    }
    
    try {
      this.configManager.updateConfigStatus('roles', 'saving');
      await this.configManager.updateConfigSection('roles', formData);
      this.currentConfig = formData;
      this.configManager.updateConfigStatus('roles', 'saved');
    } catch (error) {
      console.error('Error saving role configuration:', error);
      this.configManager.updateConfigStatus('roles', 'error');
    }
  }

  /**
   * Refresh roles from Discord API
   * Requirements: 3.1
   */
  async refreshRoles() {
    try {
      this.configManager.showNotification('Refreshing roles...', 'info');
      await this.loadGuildRoles();
      this.render();
      this.setupEventListeners();
      await this.detectConflicts();
      this.configManager.showNotification('Roles refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing roles:', error);
      this.configManager.showNotification('Failed to refresh roles', 'error');
    }
  }

  /**
   * Get role name by ID
   */
  getRoleName(roleId) {
    const role = this.findRoleById(roleId);
    return role ? role.name : 'Unknown Role';
  }

  /**
   * Check if a role is configured
   */
  isRoleConfigured(key) {
    return Boolean(this.getNestedValue(this.currentConfig, key));
  }

  /**
   * Get all configured roles
   */
  getConfiguredRoles() {
    const configured = [];
    
    const traverse = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          traverse(value, fullKey);
        } else if (value) {
          configured.push({
            key: fullKey,
            roleId: value,
            displayName: this.displayNames[fullKey] || fullKey,
            role: this.findRoleById(value)
          });
        }
      }
    };
    
    traverse(this.currentConfig);
    return configured;
  }
}

// Export for use in other scripts
window.RolesConfig = RolesConfig;
