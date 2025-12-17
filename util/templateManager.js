const ConfigTemplate = require('../schemas/ConfigTemplate');
const configManager = require('./configManager');

/**
 * Pre-defined templates for common server types
 * Requirements: 10.1
 */
const predefinedTemplates = [
  {
    templateId: 'gaming-community',
    name: 'Gaming Community',
    description: 'Perfect for gaming servers with leveling, voice tracking, economy features, and giveaways',
    category: 'Gaming',
    type: 'predefined',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 60000, xpMin: 15, xpMax: 25, voiceXpPerMinute: 10 },
        economy: { enabled: true, dailyReward: 100, collectCooldown: 3600000, customRolePrice: 1000 },
        games: { enabled: true, wordChainTimeout: 30000 },
        ticket: { enabled: true, prefix: 'ticket', partnerPrefix: 'partner' },
        welcome: { enabled: true, message: 'Welcome to our gaming community!', embedColor: '#5865F2' },
        voice: { enabled: true, joinToCreateEnabled: true },
        confession: { enabled: false },
        autoResponder: { enabled: true }
      },
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      emojis: {
        souls: '💰',
        levelup: '⬆️',
        tier: '🏆',
        rocket: '🚀',
        check: '✅',
        cross: '❌'
      }
    }
  },
  {
    templateId: 'study-group',
    name: 'Study Group',
    description: 'Focused on productivity with minimal distractions, voice tracking for study sessions',
    category: 'Education',
    type: 'predefined',
    config: {
      features: {
        leveling: { enabled: false },
        economy: { enabled: false },
        games: { enabled: false },
        ticket: { enabled: true, prefix: 'help', partnerPrefix: 'collab' },
        welcome: { enabled: true, message: 'Welcome to our study group! Stay focused and productive.', embedColor: '#57F287' },
        voice: { enabled: true, joinToCreateEnabled: true },
        confession: { enabled: false },
        autoResponder: { enabled: false }
      },
      colors: {
        primary: '#57F287',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      emojis: {
        check: '✅',
        cross: '❌',
        info: 'ℹ️'
      }
    }
  },
  {
    templateId: 'business-server',
    name: 'Business Server',
    description: 'Professional setup with moderation, ticket system, and clean organization',
    category: 'Business',
    type: 'predefined',
    config: {
      features: {
        leveling: { enabled: false },
        economy: { enabled: false },
        games: { enabled: false },
        ticket: { enabled: true, prefix: 'support', partnerPrefix: 'business' },
        welcome: { enabled: true, message: 'Welcome to our professional community.', embedColor: '#2F3136' },
        voice: { enabled: true, joinToCreateEnabled: false },
        confession: { enabled: false },
        autoResponder: { enabled: true }
      },
      colors: {
        primary: '#2F3136',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      emojis: {
        check: '✅',
        cross: '❌',
        info: 'ℹ️',
        ticket: '🎫'
      }
    }
  },
  {
    templateId: 'creative-community',
    name: 'Creative Community',
    description: 'For artists, designers, and creators with showcase features and collaboration tools',
    category: 'Creative',
    type: 'predefined',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 120000, xpMin: 10, xpMax: 20, voiceXpPerMinute: 5 },
        economy: { enabled: true, dailyReward: 50, collectCooldown: 7200000, customRolePrice: 500 },
        games: { enabled: false },
        ticket: { enabled: true, prefix: 'commission', partnerPrefix: 'collab' },
        welcome: { enabled: true, message: 'Welcome to our creative space! Share your art and inspire others.', embedColor: '#E91E63' },
        voice: { enabled: true, joinToCreateEnabled: true },
        confession: { enabled: false },
        autoResponder: { enabled: true }
      },
      colors: {
        primary: '#E91E63',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#9C27B0'
      },
      emojis: {
        souls: '🎨',
        levelup: '⭐',
        tier: '🏆',
        check: '✅',
        cross: '❌'
      }
    }
  },
  {
    templateId: 'social-hangout',
    name: 'Social Hangout',
    description: 'Casual community server with all social features enabled for maximum engagement',
    category: 'Community',
    type: 'predefined',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 45000, xpMin: 20, xpMax: 30, voiceXpPerMinute: 15 },
        economy: { enabled: true, dailyReward: 150, collectCooldown: 3600000, customRolePrice: 800 },
        games: { enabled: true, wordChainTimeout: 45000 },
        ticket: { enabled: true, prefix: 'ticket', partnerPrefix: 'partner' },
        welcome: { enabled: true, message: 'Welcome! Make yourself at home and have fun!', embedColor: '#FF9800' },
        voice: { enabled: true, joinToCreateEnabled: true },
        confession: { enabled: true },
        autoResponder: { enabled: true }
      },
      colors: {
        primary: '#FF9800',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#03A9F4'
      },
      emojis: {
        souls: '💰',
        levelup: '🎉',
        tier: '👑',
        rocket: '🚀',
        check: '✅',
        cross: '❌',
        kittyDance: '💃'
      }
    }
  }
];

class TemplateManager {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize predefined templates in database
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      for (const template of predefinedTemplates) {
        await ConfigTemplate.findOneAndUpdate(
          { templateId: template.templateId },
          template,
          { upsert: true, new: true }
        );
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing templates:', error);
    }
  }

  /**
   * Get all available templates for a guild
   * Requirements: 10.1
   * @param {string} guildId - Guild ID for custom templates
   * @returns {Promise<Array>} Array of templates
   */
  async getTemplates(guildId = null) {
    await this.initialize();
    
    const query = {
      $or: [
        { type: 'predefined' },
        { type: 'custom', guildId: guildId },
        { type: 'custom', guildId: null } // Global custom templates
      ]
    };
    
    const templates = await ConfigTemplate.find(query).sort({ category: 1, name: 1 });
    return templates;
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<Object|null>} Template or null
   */
  async getTemplate(templateId) {
    await this.initialize();
    return await ConfigTemplate.findOne({ templateId });
  }

  /**
   * Preview template application
   * Requirements: 10.2, 10.3
   * @param {string} templateId - Template ID
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Preview with changes and conflicts
   */
  async previewTemplate(templateId, guildId) {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const currentConfig = await configManager.getConfig(guildId);
    const changes = this.calculateChanges(currentConfig, template.config);
    const conflicts = this.detectConflicts(currentConfig, template.config);
    const manualSteps = this.getManualSteps(template.config, currentConfig);

    return {
      template: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category
      },
      changes,
      conflicts,
      manualSteps,
      sectionsAffected: [...new Set(changes.map(c => c.section))],
      requiresConfirmation: true
    };
  }

  /**
   * Calculate changes between current config and template
   * @param {Object} current - Current configuration
   * @param {Object} templateConfig - Template configuration
   * @returns {Array} Array of change objects
   */
  calculateChanges(current, templateConfig) {
    const changes = [];
    const sections = ['channels', 'categories', 'roles', 'emojis', 'images', 'features', 'colors', 'language'];
    
    sections.forEach(section => {
      if (templateConfig[section]) {
        const currentSection = current[section] || {};
        this.compareObjects(currentSection, templateConfig[section], section, changes);
      }
    });
    
    return changes;
  }

  /**
   * Compare objects recursively
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
          field: key,
          oldValue: currentValue,
          newValue: newValue,
          type: currentValue === undefined ? 'add' : (newValue === null ? 'remove' : 'modify')
        });
      }
    });
  }

  /**
   * Detect conflicts between current config and template
   * Requirements: 10.3
   * @param {Object} current - Current configuration
   * @param {Object} templateConfig - Template configuration
   * @returns {Array} Array of conflict objects
   */
  detectConflicts(current, templateConfig) {
    const conflicts = [];

    // Check for feature conflicts
    if (templateConfig.features && current.features) {
      Object.entries(templateConfig.features).forEach(([feature, settings]) => {
        const currentSettings = current.features[feature];
        if (currentSettings && settings) {
          // Check if enabling a feature that was disabled
          if (settings.enabled && currentSettings.enabled === false) {
            conflicts.push({
              type: 'feature_enable',
              field: `features.${feature}`,
              description: `Template will enable ${feature} which is currently disabled`,
              currentValue: currentSettings.enabled,
              templateValue: settings.enabled,
              resolution: {
                keep_current: `Keep ${feature} disabled`,
                apply_template: `Enable ${feature} as per template`
              }
            });
          }
          // Check if disabling a feature that was enabled
          if (settings.enabled === false && currentSettings.enabled) {
            conflicts.push({
              type: 'feature_disable',
              field: `features.${feature}`,
              description: `Template will disable ${feature} which is currently enabled`,
              currentValue: currentSettings.enabled,
              templateValue: settings.enabled,
              resolution: {
                keep_current: `Keep ${feature} enabled`,
                apply_template: `Disable ${feature} as per template`
              }
            });
          }
        }
      });
    }

    // Check for color conflicts (significant changes)
    if (templateConfig.colors && current.colors) {
      const colorChanges = Object.entries(templateConfig.colors).filter(([key, value]) => 
        current.colors[key] && current.colors[key] !== value
      );
      
      if (colorChanges.length > 0) {
        conflicts.push({
          type: 'appearance_change',
          field: 'colors',
          description: `Template will change ${colorChanges.length} color setting(s)`,
          affectedFields: colorChanges.map(([key]) => key),
          resolution: {
            keep_current: 'Keep current color scheme',
            apply_template: 'Apply template colors'
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Get manual steps required after template application
   * Requirements: 10.4
   * @param {Object} templateConfig - Template configuration
   * @param {Object} currentConfig - Current configuration
   * @returns {Array} Array of manual step descriptions
   */
  getManualSteps(templateConfig, currentConfig) {
    const steps = [];

    // Check if channels need to be configured
    if (templateConfig.features) {
      if (templateConfig.features.welcome?.enabled && !currentConfig.channels?.welcome) {
        steps.push('Configure welcome channel for the welcome system');
      }
      if (templateConfig.features.ticket?.enabled && !currentConfig.categories?.ticket) {
        steps.push('Set up ticket category for the ticket system');
      }
      if (templateConfig.features.voice?.joinToCreateEnabled && !currentConfig.channels?.voice?.joinToCreate) {
        steps.push('Configure join-to-create voice channel');
      }
      if (templateConfig.features.leveling?.enabled) {
        steps.push('Configure level-up notification channel (optional)');
        steps.push('Set up level roles for automatic role assignment (optional)');
      }
      if (templateConfig.features.confession?.enabled && !currentConfig.channels?.confession) {
        steps.push('Configure confession channel for the confession system');
      }
    }

    // Always recommend reviewing role hierarchy
    steps.push('Review and configure role hierarchy according to your server structure');

    return steps;
  }

  /**
   * Apply template to guild configuration
   * Requirements: 10.3, 10.4
   * @param {string} templateId - Template ID
   * @param {string} guildId - Guild ID
   * @param {string} userId - User applying the template
   * @param {Object} options - Application options
   * @returns {Promise<Object>} Application result
   */
  async applyTemplate(templateId, guildId, userId, options = {}) {
    const { merge = true, conflictResolutions = {} } = options;
    
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const currentConfig = await configManager.getConfig(guildId);
    let configToApply = {};

    if (merge) {
      // Merge template with current config
      configToApply = this.mergeConfigs(currentConfig, template.config, conflictResolutions);
    } else {
      // Replace with template config (keeping channel/role IDs)
      configToApply = {
        ...template.config,
        channels: currentConfig.channels, // Keep existing channel assignments
        categories: currentConfig.categories, // Keep existing categories
        roles: currentConfig.roles // Keep existing role assignments
      };
    }

    // Apply the configuration
    const updatedConfig = await configManager.updateConfig(guildId, configToApply, userId);

    // Increment usage count
    await ConfigTemplate.findOneAndUpdate(
      { templateId },
      { $inc: { 'metadata.usageCount': 1 } }
    );

    // Get manual steps
    const manualSteps = this.getManualSteps(template.config, currentConfig);

    return {
      success: true,
      appliedTemplate: {
        templateId: template.templateId,
        name: template.name,
        appliedAt: new Date().toISOString(),
        appliedBy: userId
      },
      config: updatedConfig,
      manualSteps,
      message: `Template "${template.name}" applied successfully`
    };
  }

  /**
   * Merge template config with current config
   * @param {Object} current - Current configuration
   * @param {Object} template - Template configuration
   * @param {Object} resolutions - Conflict resolutions
   * @returns {Object} Merged configuration
   */
  mergeConfigs(current, template, resolutions = {}) {
    const merged = { ...current };
    
    Object.entries(template).forEach(([section, sectionConfig]) => {
      if (typeof sectionConfig === 'object' && sectionConfig !== null) {
        // Check if there's a resolution for this section
        const resolution = resolutions[section];
        
        if (resolution === 'keep_current') {
          // Keep current config for this section
          return;
        }
        
        if (resolution === 'apply_template' || !merged[section]) {
          // Apply template config
          merged[section] = { ...sectionConfig };
        } else {
          // Deep merge
          merged[section] = this.deepMerge(merged[section], sectionConfig);
        }
      }
    });
    
    return merged;
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else if (value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * Create a custom template from current configuration
   * Requirements: 10.5
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createCustomTemplate(templateData) {
    const { name, description, guildId, config, createdBy } = templateData;
    
    if (!name || !config) {
      throw new Error('Template name and configuration are required');
    }

    // Generate unique template ID
    const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template = new ConfigTemplate({
      templateId,
      name,
      description: description || 'Custom template',
      category: 'Custom',
      type: 'custom',
      createdBy,
      guildId,
      config,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        usageCount: 0
      }
    });

    await template.save();
    return template;
  }

  /**
   * Update a custom template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated template
   */
  async updateCustomTemplate(templateId, updates, userId) {
    const template = await ConfigTemplate.findOne({ templateId, type: 'custom' });
    
    if (!template) {
      throw new Error('Custom template not found');
    }

    // Only allow creator to update
    if (template.createdBy !== userId) {
      throw new Error('Only the template creator can update this template');
    }

    const allowedUpdates = ['name', 'description', 'config'];
    const updateObj = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateObj[field] = updates[field];
      }
    });

    const updatedTemplate = await ConfigTemplate.findOneAndUpdate(
      { templateId },
      { ...updateObj, 'metadata.updatedAt': new Date() },
      { new: true }
    );

    return updatedTemplate;
  }

  /**
   * Delete a custom template
   * @param {string} templateId - Template ID
   * @param {string} userId - User deleting the template
   * @returns {Promise<boolean>} Success status
   */
  async deleteCustomTemplate(templateId, userId) {
    const template = await ConfigTemplate.findOne({ templateId, type: 'custom' });
    
    if (!template) {
      throw new Error('Custom template not found');
    }

    // Only allow creator to delete
    if (template.createdBy !== userId) {
      throw new Error('Only the template creator can delete this template');
    }

    await ConfigTemplate.deleteOne({ templateId });
    return true;
  }

  /**
   * Get custom templates for a user
   * @param {string} userId - User ID
   * @param {string} guildId - Optional guild ID filter
   * @returns {Promise<Array>} Array of custom templates
   */
  async getUserTemplates(userId, guildId = null) {
    const query = { type: 'custom', createdBy: userId };
    if (guildId) {
      query.guildId = guildId;
    }
    
    return await ConfigTemplate.find(query).sort({ 'metadata.createdAt': -1 });
  }
}

module.exports = new TemplateManager();
