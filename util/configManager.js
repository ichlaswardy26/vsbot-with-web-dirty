const WebConfig = require('../schemas/WebConfig');

class ConfigManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get configuration for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig(guildId) {
    // Check cache first
    const cached = this.cache.get(guildId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.config;
    }

    try {
      let config = await WebConfig.findOne({ guildId });
      
      // Create default config if not exists
      if (!config) {
        config = await this.createDefaultConfig(guildId);
      }

      // Cache the config
      this.cache.set(guildId, {
        config: config.toObject(),
        timestamp: Date.now()
      });

      return config.toObject();
    } catch (error) {
      console.error('Error getting config:', error);
      return this.getDefaultConfig(guildId);
    }
  }

  /**
   * Update configuration for a guild
   * @param {string} guildId - Discord guild ID
   * @param {Object} updates - Configuration updates
   * @param {string} updatedBy - User ID who made the update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(guildId, updates, updatedBy = null) {
    try {
      const config = await WebConfig.findOneAndUpdate(
        { guildId },
        { 
          ...updates,
          'metadata.lastConfiguredBy': updatedBy,
          'metadata.updatedAt': new Date()
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );

      // Update cache
      this.cache.set(guildId, {
        config: config.toObject(),
        timestamp: Date.now()
      });

      return config.toObject();
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  /**
   * Create default configuration for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Default configuration
   */
  async createDefaultConfig(guildId) {
    try {
      const defaultConfig = new WebConfig({
        guildId,
        metadata: {
          createdAt: new Date(),
          version: '1.0.0'
        }
      });

      await defaultConfig.save();
      return defaultConfig;
    } catch (error) {
      console.error('Error creating default config:', error);
      throw error;
    }
  }

  /**
   * Get default configuration object (fallback)
   * @param {string} guildId - Discord guild ID
   * @returns {Object} Default configuration
   */
  getDefaultConfig(guildId) {
    return {
      guildId,
      prefix: '!',
      channels: {},
      categories: {},
      roles: {},
      emojis: {
        souls: '💰',
        check: '✅',
        cross: '❌',
        info: 'ℹ️'
      },
      features: {
        leveling: { enabled: true, xpCooldown: 60000, xpMin: 15, xpMax: 25 },
        economy: { enabled: true, dailyReward: 100, collectCooldown: 3600000 },
        ticket: { enabled: true, prefix: 'ticket' },
        games: { enabled: true },
        welcome: { enabled: true, message: 'Welcome to the server!' }
      },
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      language: {
        default: 'en',
        available: ['en']
      }
    };
  }

  /**
   * Clear cache for a guild
   * @param {string} guildId - Discord guild ID
   */
  clearCache(guildId) {
    this.cache.delete(guildId);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get specific configuration section
   * @param {string} guildId - Discord guild ID
   * @param {string} section - Configuration section (channels, roles, etc.)
   * @returns {Promise<Object>} Configuration section
   */
  async getConfigSection(guildId, section) {
    const config = await this.getConfig(guildId);
    
    // Handle appearance section specially - combines colors, emojis, and images
    if (section === 'appearance') {
      return {
        colors: config.colors || {},
        emojis: config.emojis || {},
        images: config.images || {}
      };
    }
    
    return config[section] || {};
  }

  /**
   * Update specific configuration section
   * @param {string} guildId - Discord guild ID
   * @param {string} section - Configuration section
   * @param {Object} updates - Section updates
   * @param {string} updatedBy - User ID who made the update
   * @returns {Promise<Object>} Updated section
   */
  async updateConfigSection(guildId, section, updates, updatedBy = null) {
    const updateObj = {};
    
    // Handle appearance section specially - splits into colors, emojis, and images
    if (section === 'appearance') {
      if (updates.colors) updateObj.colors = updates.colors;
      if (updates.emojis) updateObj.emojis = updates.emojis;
      if (updates.images) updateObj.images = updates.images;
    } else {
      updateObj[section] = updates;
    }
    
    const config = await this.updateConfig(guildId, updateObj, updatedBy);
    
    // Return the combined appearance section
    if (section === 'appearance') {
      return {
        colors: config.colors || {},
        emojis: config.emojis || {},
        images: config.images || {}
      };
    }
    
    return config[section];
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!config.guildId) {
      errors.push('Guild ID is required');
    }

    // Validate colors
    if (config.colors) {
      Object.entries(config.colors).forEach(([key, value]) => {
        if (value && !value.match(/^#[0-9A-F]{6}$/i)) {
          errors.push(`Invalid color format for ${key}: ${value}`);
        }
      });
    }

    // Validate feature settings
    if (config.features) {
      if (config.features.leveling) {
        const { xpMin, xpMax } = config.features.leveling;
        if (xpMin && xpMax && xpMin >= xpMax) {
          errors.push('XP minimum must be less than maximum');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate configuration with detailed field-level feedback
   * Requirements: 7.1, 7.2, 7.3
   * @param {Object} config - Configuration to validate
   * @returns {Object} Detailed validation result
   */
  validateConfigWithDetails(config) {
    const errors = [];
    const warnings = [];
    const fieldValidation = {};
    const successIndicators = {};

    // Validation rules
    const validationRules = {
      channelId: /^[0-9]{17,19}$/,
      roleId: /^[0-9]{17,19}$/,
      color: /^#[0-9A-Fa-f]{6}$/,
      url: /^https?:\/\/.+/,
      positiveInteger: /^[1-9]\d*$/
    };

    // Validate channels section
    if (config.channels) {
      let channelErrors = 0;
      Object.entries(config.channels).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.length > 0) {
          const isValid = validationRules.channelId.test(value);
          fieldValidation[`channels.${key}`] = {
            isValid,
            errors: isValid ? [] : ['Invalid channel ID format'],
            highlighted: !isValid
          };
          if (!isValid) {
            errors.push(`channels.${key}: Invalid channel ID format`);
            channelErrors++;
          }
        }
      });
      successIndicators.channels = {
        status: channelErrors === 0 ? 'valid' : 'invalid',
        message: channelErrors === 0 ? 'All channels configured correctly' : `${channelErrors} channel(s) have errors`
      };
    }

    // Validate roles section
    if (config.roles) {
      let roleErrors = 0;
      this.validateRolesRecursive(config.roles, 'roles', fieldValidation, errors, validationRules);
      roleErrors = Object.keys(fieldValidation).filter(k => k.startsWith('roles.') && !fieldValidation[k].isValid).length;
      successIndicators.roles = {
        status: roleErrors === 0 ? 'valid' : 'invalid',
        message: roleErrors === 0 ? 'All roles configured correctly' : `${roleErrors} role(s) have errors`
      };
    }

    // Validate colors/appearance section
    if (config.colors || config.appearance) {
      const colors = config.colors || config.appearance?.colors || {};
      let colorErrors = 0;
      Object.entries(colors).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          const isValid = validationRules.color.test(value);
          fieldValidation[`colors.${key}`] = {
            isValid,
            errors: isValid ? [] : ['Invalid color format (use #RRGGBB)'],
            highlighted: !isValid
          };
          if (!isValid) {
            errors.push(`colors.${key}: Invalid color format`);
            colorErrors++;
          }
        }
      });
      successIndicators.appearance = {
        status: colorErrors === 0 ? 'valid' : 'invalid',
        message: colorErrors === 0 ? 'Appearance settings valid' : `${colorErrors} color(s) have errors`
      };
    }

    // Validate features section
    if (config.features) {
      let featureErrors = 0;
      if (config.features.leveling) {
        const { xpMin, xpMax, xpCooldown } = config.features.leveling;
        if (xpMin !== undefined && xpMax !== undefined && xpMin >= xpMax) {
          fieldValidation['features.leveling.xpRange'] = {
            isValid: false,
            errors: ['XP minimum must be less than maximum'],
            highlighted: true
          };
          errors.push('features.leveling: XP minimum must be less than maximum');
          featureErrors++;
        }
        if (xpCooldown !== undefined && (typeof xpCooldown !== 'number' || xpCooldown < 0)) {
          fieldValidation['features.leveling.xpCooldown'] = {
            isValid: false,
            errors: ['XP cooldown must be a positive number'],
            highlighted: true
          };
          errors.push('features.leveling: XP cooldown must be a positive number');
          featureErrors++;
        }
      }
      successIndicators.features = {
        status: featureErrors === 0 ? 'valid' : 'invalid',
        message: featureErrors === 0 ? 'Feature settings valid' : `${featureErrors} feature setting(s) have errors`
      };
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      fieldValidation,
      canSave: isValid,
      successIndicators
    };
  }

  /**
   * Recursively validate roles
   */
  validateRolesRecursive(obj, path, fieldValidation, errors, validationRules) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const fullPath = `${path}.${key}`;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.validateRolesRecursive(value, fullPath, fieldValidation, errors, validationRules);
      } else if (value && typeof value === 'string' && value.length > 0) {
        const isValid = validationRules.roleId.test(value);
        fieldValidation[fullPath] = {
          isValid,
          errors: isValid ? [] : ['Invalid role ID format'],
          highlighted: !isValid
        };
        if (!isValid) {
          errors.push(`${fullPath}: Invalid role ID format`);
        }
      }
    });
  }

  /**
   * Validate a single field in real-time
   * Requirements: 7.1
   * @param {string} fieldName - Name of the field
   * @param {any} value - Value to validate
   * @param {string} fieldType - Type of field (channelId, roleId, color, url, positiveInteger)
   * @returns {Object} Validation result
   */
  validateField(fieldName, value, fieldType = 'text') {
    const errors = [];
    const warnings = [];

    // Skip validation for empty optional fields
    if (!value && value !== 0 && value !== false) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation rules
    const validationRules = {
      channelId: { pattern: /^[0-9]{17,19}$/, message: 'Invalid channel ID format' },
      roleId: { pattern: /^[0-9]{17,19}$/, message: 'Invalid role ID format' },
      color: { pattern: /^#[0-9A-Fa-f]{6}$/, message: 'Invalid color format (use #RRGGBB)' },
      url: { pattern: /^https?:\/\/.+/, message: 'Invalid URL format' },
      positiveInteger: { pattern: /^[1-9]\d*$/, message: 'Must be a positive number' },
      emoji: { pattern: /^(<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])$/u, message: 'Invalid emoji format' }
    };

    const rule = validationRules[fieldType];
    if (rule && !rule.pattern.test(String(value))) {
      errors.push(rule.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect configuration conflicts
   * Requirements: 7.5
   * @param {Object} config - Configuration to check for conflicts
   * @returns {Array} Array of detected conflicts with resolution suggestions
   */
  detectConflicts(config) {
    const conflicts = [];

    // Check for duplicate channel assignments
    if (config.channels) {
      const channelUsage = new Map();
      Object.entries(config.channels).forEach(([purpose, channelId]) => {
        if (channelId && typeof channelId === 'string') {
          if (!channelUsage.has(channelId)) {
            channelUsage.set(channelId, []);
          }
          channelUsage.get(channelId).push(purpose);
        }
      });

      channelUsage.forEach((purposes, channelId) => {
        if (purposes.length > 1) {
          conflicts.push({
            type: 'duplicate_channel',
            description: 'Same channel assigned to multiple purposes',
            affectedFields: purposes,
            suggestions: [
              { action: 'use_different_channel', description: 'Assign different channels for each purpose' },
              { action: 'keep_primary', description: `Keep channel for ${purposes[0]} only` }
            ],
            autoResolvable: true
          });
        }
      });
    }

    // Check for feature dependencies
    if (config.features) {
      const featureDependencies = {
        leveling: ['economy'],
        games: ['economy'],
        wordChain: ['economy']
      };

      Object.entries(featureDependencies).forEach(([feature, deps]) => {
        if (config.features[feature]?.enabled) {
          deps.forEach(dep => {
            if (config.features[dep] && !config.features[dep].enabled) {
              conflicts.push({
                type: 'feature_dependency',
                description: `${feature} requires ${dep} to be enabled`,
                affectedFields: [feature, dep],
                suggestions: [
                  { action: 'enable_dependency', description: `Enable ${dep} feature` },
                  { action: 'disable_dependent', description: `Disable ${feature} feature` }
                ],
                autoResolvable: true
              });
            }
          });
        }
      });
    }

    return conflicts;
  }

  /**
   * Resolve a configuration conflict
   * Requirements: 7.5
   * @param {string} guildId - Guild ID
   * @param {string} conflictId - Conflict identifier
   * @param {string} action - Resolution action to apply
   * @param {string} userId - User applying the resolution
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(guildId, conflictId, action, userId) {
    // Get current config
    const config = await this.getConfig(guildId);
    
    // Apply resolution based on action
    let updates = {};
    
    if (action === 'enable_dependency') {
      // Enable the dependent feature
      const [, depFeature] = conflictId.split('_') || [];
      if (depFeature && config.features) {
        updates = {
          features: {
            ...config.features,
            [depFeature]: { ...config.features[depFeature], enabled: true }
          }
        };
      }
    } else if (action === 'disable_dependent') {
      // Disable the feature that has unmet dependencies
      const [feature] = conflictId.split('_') || [];
      if (feature && config.features) {
        updates = {
          features: {
            ...config.features,
            [feature]: { ...config.features[feature], enabled: false }
          }
        };
      }
    } else if (action === 'use_different_channel' || action === 'keep_primary') {
      // For channel conflicts, we need more context - just mark as resolved
      // The user will need to manually select different channels
    }

    if (Object.keys(updates).length > 0) {
      await this.updateConfig(guildId, updates, userId);
    }

    return {
      resolved: true,
      appliedResolution: action,
      config: await this.getConfig(guildId)
    };
  }

  /**
   * Export configuration to JSON
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Configuration export
   */
  async exportConfig(guildId) {
    const config = await this.getConfig(guildId);
    
    // Ensure all configuration sections are included
    const exportData = {
      guildId: config.guildId,
      channels: config.channels || {},
      categories: config.categories || {},
      roles: config.roles || {},
      emojis: config.emojis || {},
      images: config.images || {},
      features: config.features || {},
      colors: config.colors || {},
      language: config.language || {},
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return exportData;
  }

  /**
   * Validate import configuration structure and format
   * @param {Object} configData - Configuration data to validate for import
   * @returns {Object} Validation result with isValid, errors, and warnings
   */
  validateImportConfig(configData) {
    const errors = [];
    const warnings = [];

    // Check if configData is an object
    if (!configData || typeof configData !== 'object') {
      errors.push('Configuration must be a valid JSON object');
      return { isValid: false, errors, warnings };
    }

    // Validate required structure
    const validSections = ['channels', 'categories', 'roles', 'emojis', 'images', 'features', 'colors', 'language'];
    
    // Check for unknown sections
    Object.keys(configData).forEach(key => {
      if (!validSections.includes(key) && !['guildId', 'exportedAt', 'version', 'metadata', '_id', '__v'].includes(key)) {
        warnings.push(`Unknown configuration section: ${key}`);
      }
    });

    // Validate colors format
    if (configData.colors) {
      Object.entries(configData.colors).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.match(/^#[0-9A-Fa-f]{6}$/i)) {
          errors.push(`Invalid color format for ${key}: ${value}. Expected format: #RRGGBB`);
        }
      });
    }

    // Validate feature settings
    if (configData.features) {
      if (configData.features.leveling) {
        const { xpMin, xpMax, xpCooldown } = configData.features.leveling;
        if (xpMin !== undefined && xpMax !== undefined && xpMin >= xpMax) {
          errors.push('XP minimum must be less than maximum');
        }
        if (xpCooldown !== undefined && (typeof xpCooldown !== 'number' || xpCooldown < 0)) {
          errors.push('XP cooldown must be a positive number');
        }
      }
      
      if (configData.features.economy) {
        const { dailyReward, collectCooldown } = configData.features.economy;
        if (dailyReward !== undefined && (typeof dailyReward !== 'number' || dailyReward < 0)) {
          errors.push('Daily reward must be a positive number');
        }
        if (collectCooldown !== undefined && (typeof collectCooldown !== 'number' || collectCooldown < 0)) {
          errors.push('Collect cooldown must be a positive number');
        }
      }
    }

    // Validate channel IDs format (should be Discord snowflakes)
    if (configData.channels) {
      this.validateChannelIds(configData.channels, errors, 'channels');
    }

    // Validate role IDs format
    if (configData.roles) {
      this.validateRoleIds(configData.roles, errors, 'roles');
    }

    // Validate image URLs
    if (configData.images) {
      Object.entries(configData.images).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.match(/^https?:\/\/.+/i)) {
          errors.push(`Invalid URL format for image ${key}: ${value}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate channel IDs recursively
   * @param {Object} obj - Object containing channel IDs
   * @param {Array} errors - Array to push errors to
   * @param {string} path - Current path for error messages
   */
  validateChannelIds(obj, errors, path) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (typeof value === 'object') {
        this.validateChannelIds(value, errors, `${path}.${key}`);
      } else if (typeof value === 'string' && value.length > 0) {
        if (!value.match(/^[0-9]{17,19}$/)) {
          errors.push(`Invalid channel ID format at ${path}.${key}: ${value}`);
        }
      }
    });
  }

  /**
   * Validate role IDs recursively
   * @param {Object} obj - Object containing role IDs
   * @param {Array} errors - Array to push errors to
   * @param {string} path - Current path for error messages
   */
  validateRoleIds(obj, errors, path) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (typeof value === 'object') {
        this.validateRoleIds(value, errors, `${path}.${key}`);
      } else if (typeof value === 'string' && value.length > 0) {
        if (!value.match(/^[0-9]{17,19}$/)) {
          errors.push(`Invalid role ID format at ${path}.${key}: ${value}`);
        }
      }
    });
  }

  /**
   * Preview import configuration - shows what will change
   * @param {string} guildId - Discord guild ID
   * @param {Object} configData - Configuration data to preview
   * @returns {Promise<Object>} Preview result with changes and validation
   */
  async previewImport(guildId, configData) {
    // Validate the import configuration
    const validation = this.validateImportConfig(configData);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors,
        warnings: validation.warnings,
        changes: []
      };
    }

    // Get current configuration
    const currentConfig = await this.getConfig(guildId);
    
    // Calculate changes
    const changes = this.calculateConfigChanges(currentConfig, configData);
    
    return {
      isValid: true,
      errors: [],
      warnings: validation.warnings,
      changes,
      sectionsAffected: [...new Set(changes.map(c => c.section))]
    };
  }

  /**
   * Calculate differences between current and new configuration
   * @param {Object} current - Current configuration
   * @param {Object} newConfig - New configuration to import
   * @returns {Array} Array of change objects
   */
  calculateConfigChanges(current, newConfig) {
    const changes = [];
    const sections = ['channels', 'categories', 'roles', 'emojis', 'images', 'features', 'colors', 'language'];
    
    sections.forEach(section => {
      if (newConfig[section]) {
        const currentSection = current[section] || {};
        const newSection = newConfig[section];
        
        this.compareObjects(currentSection, newSection, section, changes);
      }
    });
    
    return changes;
  }

  /**
   * Compare two objects and record changes
   * @param {Object} current - Current object
   * @param {Object} newObj - New object
   * @param {string} path - Current path
   * @param {Array} changes - Array to push changes to
   */
  compareObjects(current, newObj, path, changes) {
    if (!newObj || typeof newObj !== 'object') return;
    
    Object.entries(newObj).forEach(([key, newValue]) => {
      const currentValue = current ? current[key] : undefined;
      const fullPath = `${path}.${key}`;
      
      if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
        this.compareObjects(currentValue, newValue, fullPath, changes);
      } else if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        changes.push({
          section: path.split('.')[0],
          path: fullPath,
          oldValue: currentValue,
          newValue: newValue,
          type: currentValue === undefined ? 'add' : (newValue === null ? 'remove' : 'modify')
        });
      }
    });
  }

  /**
   * Import configuration from JSON
   * @param {string} guildId - Discord guild ID
   * @param {Object} configData - Configuration data to import
   * @param {string} importedBy - User ID who imported
   * @returns {Promise<Object>} Import result with applied configuration
   */
  async importConfig(guildId, configData, importedBy = null) {
    // Validate imported config
    const validation = this.validateImportConfig(configData);
    if (!validation.isValid) {
      const error = new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      error.validationErrors = validation.errors;
      error.validationWarnings = validation.warnings;
      throw error;
    }

    // Remove metadata fields from import
    const { metadata, exportedAt, version, guildId: importGuildId, _id, __v, ...cleanConfig } = configData;
    
    // Apply the configuration
    const updatedConfig = await this.updateConfig(guildId, cleanConfig, importedBy);
    
    return {
      success: true,
      data: updatedConfig,
      warnings: validation.warnings,
      appliedSections: Object.keys(cleanConfig).filter(k => cleanConfig[k] !== undefined)
    };
  }

  /**
   * Create a backup of current configuration
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Backup data with timestamp
   */
  async createBackup(guildId) {
    const config = await this.exportConfig(guildId);
    return {
      ...config,
      backupCreatedAt: new Date().toISOString(),
      isBackup: true
    };
  }

  /**
   * Restore configuration from backup
   * @param {string} guildId - Discord guild ID
   * @param {Object} backupData - Backup data to restore
   * @param {string} restoredBy - User ID who restored
   * @returns {Promise<Object>} Restored configuration
   */
  async restoreFromBackup(guildId, backupData, restoredBy = null) {
    // Validate backup data
    if (!backupData.isBackup && !backupData.exportedAt) {
      throw new Error('Invalid backup data: missing backup metadata');
    }
    
    return await this.importConfig(guildId, backupData, restoredBy);
  }
}

module.exports = new ConfigManager();