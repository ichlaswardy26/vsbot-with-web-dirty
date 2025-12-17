/**
 * Channels Configuration Module
 * Handles channel configuration interface with Discord API integration
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

class ChannelsConfig {
  constructor(configManager) {
    this.configManager = configManager;
    this.guildId = configManager.guildId;
    this.baseUrl = '/api/channels';
    this.guildChannels = [];
    this.voiceChannels = [];
    this.categories = [];
    this.channelsByCategory = {};
    this.currentConfig = {};
    this.channelCategories = {};
    this.displayNames = {};
    this.apiConnected = false;
    this.validationTimers = new Map();
  }

  /**
   * Initialize the channels configuration interface
   * Requirements: 2.1
   */
  async initialize() {
    try {
      // Load guild channels from Discord API
      await this.loadGuildChannels();
      
      // Load channel category definitions
      await this.loadChannelCategories();
      
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Render the interface
      this.render();
      
      // Setup event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Error initializing channels config:', error);
      this.configManager.showNotification('Failed to initialize channels configuration', 'error');
      return false;
    }
  }

  /**
   * Load guild channels from Discord API
   * Requirements: 2.1
   */
  async loadGuildChannels() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.guildId}`);
      const result = await response.json();
      
      if (result.success) {
        this.apiConnected = true;
        const channels = result.data || [];
        
        // Separate channels by type
        this.guildChannels = channels.filter(ch => ch.type === 0); // Text channels
        this.voiceChannels = channels.filter(ch => ch.type === 2); // Voice channels
        this.categories = channels.filter(ch => ch.type === 4); // Category channels
        
        // Organize channels by category
        this.organizeChannelsByCategory(channels);
        
        return channels;
      } else {
        throw new Error(result.error || 'Failed to load channels');
      }
    } catch (error) {
      console.error('Error loading guild channels:', error);
      this.apiConnected = false;
      throw error;
    }
  }

  /**
   * Organize channels by their parent category
   */
  organizeChannelsByCategory(channels) {
    this.channelsByCategory = { uncategorized: [] };
    
    // Initialize category buckets
    this.categories.forEach(cat => {
      this.channelsByCategory[cat.id] = [];
    });
    
    // Sort channels into categories
    channels.forEach(channel => {
      if (channel.type === 4) return; // Skip categories themselves
      
      const parentId = channel.parentId || 'uncategorized';
      if (!this.channelsByCategory[parentId]) {
        this.channelsByCategory[parentId] = [];
      }
      this.channelsByCategory[parentId].push(channel);
    });
    
    // Sort channels within each category by position
    Object.keys(this.channelsByCategory).forEach(catId => {
      this.channelsByCategory[catId].sort((a, b) => a.position - b.position);
    });
  }

  /**
   * Load channel category definitions for configuration
   * Requirements: 2.2
   */
  async loadChannelCategories() {
    // Define channel configuration categories
    this.channelCategories = {
      general: {
        name: 'General Channels',
        description: 'Core server channels',
        channels: [
          { key: 'welcomeChannel', name: 'Welcome Channel', description: 'Channel for welcome messages', type: 'text' },
          { key: 'goodbyeChannel', name: 'Goodbye Channel', description: 'Channel for goodbye messages', type: 'text' },
          { key: 'rulesChannel', name: 'Rules Channel', description: 'Channel containing server rules', type: 'text' },
          { key: 'announcementChannel', name: 'Announcement Channel', description: 'Channel for announcements', type: 'text' }
        ]
      },
      moderation: {
        name: 'Moderation Channels',
        description: 'Channels for moderation features',
        channels: [
          { key: 'modLogChannel', name: 'Mod Log Channel', description: 'Channel for moderation logs', type: 'text' },
          { key: 'reportChannel', name: 'Report Channel', description: 'Channel for user reports', type: 'text' },
          { key: 'auditLogChannel', name: 'Audit Log Channel', description: 'Channel for audit logs', type: 'text' }
        ]
      },
      leveling: {
        name: 'Leveling Channels',
        description: 'Channels for leveling system',
        channels: [
          { key: 'levelUpChannel', name: 'Level Up Channel', description: 'Channel for level up announcements', type: 'text' },
          { key: 'leaderboardChannel', name: 'Leaderboard Channel', description: 'Channel for leaderboard display', type: 'text' }
        ]
      },
      economy: {
        name: 'Economy Channels',
        description: 'Channels for economy features',
        channels: [
          { key: 'economyLogChannel', name: 'Economy Log Channel', description: 'Channel for economy transaction logs', type: 'text' },
          { key: 'shopChannel', name: 'Shop Channel', description: 'Channel for shop commands', type: 'text' }
        ]
      },
      tickets: {
        name: 'Ticket Channels',
        description: 'Channels for ticket system',
        channels: [
          { key: 'ticketCategory', name: 'Ticket Category', description: 'Category for ticket channels', type: 'category' },
          { key: 'ticketLogChannel', name: 'Ticket Log Channel', description: 'Channel for ticket logs', type: 'text' },
          { key: 'ticketTranscriptChannel', name: 'Transcript Channel', description: 'Channel for ticket transcripts', type: 'text' }
        ]
      },
      games: {
        name: 'Game Channels',
        description: 'Channels for games and activities',
        channels: [
          { key: 'giveawayChannel', name: 'Giveaway Channel', description: 'Channel for giveaways', type: 'text' },
          { key: 'wordChainChannel', name: 'Word Chain Channel', description: 'Channel for word chain game', type: 'text' },
          { key: 'confessionChannel', name: 'Confession Channel', description: 'Channel for anonymous confessions', type: 'text' }
        ]
      },
      voice: {
        name: 'Voice Channels',
        description: 'Voice channel configuration',
        channels: [
          { key: 'voiceCreateChannel', name: 'Voice Create Channel', description: 'Channel to create temporary voice channels', type: 'voice' },
          { key: 'voiceCategory', name: 'Voice Category', description: 'Category for temporary voice channels', type: 'category' }
        ]
      }
    };
    
    // Build display names map
    Object.values(this.channelCategories).forEach(category => {
      category.channels.forEach(ch => {
        this.displayNames[ch.key] = ch.name;
      });
    });
  }

  /**
   * Load current channel configuration
   * Requirements: 2.1
   */
  async loadCurrentConfig() {
    try {
      const config = await this.configManager.getConfigSection('channels');
      this.currentConfig = config || {};
      return this.currentConfig;
    } catch (error) {
      console.error('Error loading current config:', error);
      this.currentConfig = {};
      return {};
    }
  }

  /**
   * Render the channels configuration interface
   * Requirements: 2.1, 2.2, 2.3
   */
  render() {
    const container = document.getElementById('channels-config-container');
    if (!container) {
      console.error('Channels config container not found');
      return;
    }
    
    container.innerHTML = `
      <form id="channels-config-form" class="config-form">
        ${this.renderChannelCategories()}
        
        <div class="d-flex gap-2 mt-4">
          <button type="submit" class="btn btn-primary" data-config-save>
            <i class="fas fa-save me-2"></i>Save Channel Configuration
          </button>
          <button type="button" class="btn btn-outline-secondary" id="refresh-channels-btn">
            <i class="fas fa-sync me-2"></i>Refresh Channels
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render channel category sections
   * Requirements: 2.1, 2.2
   */
  renderChannelCategories() {
    return Object.entries(this.channelCategories).map(([categoryKey, category]) => `
      <div class="card channel-category mb-4" data-category="${categoryKey}">
        <div class="card-header collapse-toggle" data-bs-toggle="collapse" data-bs-target="#category-${categoryKey}">
          <h5 class="card-title mb-0">
            <i class="fas fa-hashtag me-2"></i>${category.name}
          </h5>
          <p class="category-description mb-0">${category.description}</p>
        </div>
        <div class="collapse show" id="category-${categoryKey}">
          <div class="card-body">
            <div class="row">
              ${category.channels.map(channel => this.renderChannelSelect(channel)).join('')}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render a single channel select field
   * Requirements: 2.2, 2.3, 2.4
   */
  renderChannelSelect(channelConfig) {
    const { key, name, description, type } = channelConfig;
    const currentValue = this.getNestedValue(this.currentConfig, key) || '';
    const channels = this.getChannelsForType(type);
    const icon = type === 'voice' ? 'fa-volume-up' : type === 'category' ? 'fa-folder' : 'fa-hashtag';
    
    return `
      <div class="col-md-6 mb-3">
        <div class="form-group">
          <label for="${key}" class="form-label">
            <i class="fas ${icon} channel-icon me-1"></i>${name}
          </label>
          <small class="d-block text-muted mb-2">${description}</small>
          <div class="channel-select-wrapper">
            <select 
              id="${key}" 
              name="${key}" 
              class="form-select channel-select"
              data-validate="channelId"
              data-channel-type="${type}"
            >
              <option value="">-- Select ${type === 'category' ? 'Category' : 'Channel'} --</option>
              ${this.renderChannelOptions(channels, currentValue, type)}
            </select>
            <button type="button" class="btn-clear-channel" data-clear="${key}" title="Clear selection" ${!currentValue ? 'disabled' : ''}>
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="channel-preview" id="${key}-preview">
            ${currentValue ? this.renderChannelPreview(currentValue) : ''}
          </div>
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
   * Get channels filtered by type
   */
  getChannelsForType(type) {
    switch (type) {
      case 'text':
        return this.guildChannels;
      case 'voice':
        return this.voiceChannels;
      case 'category':
        return this.categories;
      default:
        return this.guildChannels;
    }
  }

  /**
   * Render channel options grouped by category
   * Requirements: 2.3
   */
  renderChannelOptions(channels, selectedValue, type) {
    if (type === 'category') {
      return channels.map(cat => `
        <option value="${cat.id}" ${cat.id === selectedValue ? 'selected' : ''}>
          📁 ${cat.name}
        </option>
      `).join('');
    }
    
    // Group text/voice channels by category
    let html = '';
    
    // Uncategorized channels first
    const uncategorized = this.channelsByCategory['uncategorized'] || [];
    const filteredUncategorized = uncategorized.filter(ch => 
      type === 'voice' ? ch.type === 2 : ch.type === 0
    );
    
    if (filteredUncategorized.length > 0) {
      html += `<optgroup label="No Category">`;
      filteredUncategorized.forEach(ch => {
        const icon = ch.type === 2 ? '🔊' : '#';
        html += `<option value="${ch.id}" ${ch.id === selectedValue ? 'selected' : ''}>${icon} ${ch.name}</option>`;
      });
      html += `</optgroup>`;
    }
    
    // Channels by category
    this.categories.forEach(cat => {
      const categoryChannels = (this.channelsByCategory[cat.id] || []).filter(ch =>
        type === 'voice' ? ch.type === 2 : ch.type === 0
      );
      
      if (categoryChannels.length > 0) {
        html += `<optgroup label="${cat.name}">`;
        categoryChannels.forEach(ch => {
          const icon = ch.type === 2 ? '🔊' : '#';
          html += `<option value="${ch.id}" ${ch.id === selectedValue ? 'selected' : ''}>${icon} ${ch.name}</option>`;
        });
        html += `</optgroup>`;
      }
    });
    
    return html;
  }

  /**
   * Render channel preview
   * Requirements: 2.4
   */
  renderChannelPreview(channelId) {
    const channel = this.findChannelById(channelId);
    if (!channel) {
      return `<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Channel not found</span>`;
    }
    
    const icon = channel.type === 2 ? 'fa-volume-up' : channel.type === 4 ? 'fa-folder' : 'fa-hashtag';
    const category = this.categories.find(c => c.id === channel.parentId);
    
    return `
      <div class="d-flex align-items-center">
        <i class="fas ${icon} text-muted me-2"></i>
        <span class="channel-name">${channel.name}</span>
        ${category ? `<span class="text-muted ms-2 small">in ${category.name}</span>` : ''}
      </div>
    `;
  }

  /**
   * Find channel by ID
   */
  findChannelById(channelId) {
    return [...this.guildChannels, ...this.voiceChannels, ...this.categories]
      .find(ch => ch.id === channelId);
  }

  /**
   * Setup event listeners
   * Requirements: 2.4, 2.5
   */
  setupEventListeners() {
    const form = document.getElementById('channels-config-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfiguration();
    });
    
    // Channel select changes - update preview and clear button state
    form.querySelectorAll('.channel-select').forEach(select => {
      select.addEventListener('change', (e) => {
        this.updateChannelPreview(e.target);
        this.validateChannelSelection(e.target);
        this.updateClearButtonState(e.target);
      });
    });
    
    // Clear channel buttons
    form.querySelectorAll('.btn-clear-channel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = btn.dataset.clear;
        this.clearChannelSelection(key);
      });
    });
    
    // Refresh channels button
    const refreshBtn = document.getElementById('refresh-channels-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshChannels();
      });
    }
  }

  /**
   * Update clear button state based on selection
   * Requirements: 2.4
   */
  updateClearButtonState(selectElement) {
    const clearBtn = selectElement.parentElement.querySelector('.btn-clear-channel');
    if (clearBtn) {
      clearBtn.disabled = !selectElement.value;
    }
  }

  /**
   * Clear a channel selection
   * Requirements: 2.4
   */
  clearChannelSelection(key) {
    const select = document.getElementById(key);
    if (select) {
      select.value = '';
      this.updateChannelPreview(select);
      this.validateChannelSelection(select);
      this.updateClearButtonState(select);
      
      // Show notification
      const displayName = this.displayNames[key] || key;
      this.configManager.showNotification(`${displayName} cleared`, 'info');
    }
  }

  /**
   * Update channel preview on selection change
   * Requirements: 2.4
   */
  updateChannelPreview(selectElement) {
    const previewId = `${selectElement.id}-preview`;
    const previewContainer = document.getElementById(previewId);
    
    if (previewContainer) {
      const channelId = selectElement.value;
      previewContainer.innerHTML = channelId ? this.renderChannelPreview(channelId) : '';
    }
  }

  /**
   * Validate channel selection
   * Requirements: 2.5
   */
  validateChannelSelection(selectElement) {
    const channelId = selectElement.value;
    const channelType = selectElement.dataset.channelType;
    
    // Clear previous validation
    selectElement.classList.remove('is-valid', 'is-invalid');
    
    if (!channelId) {
      return { isValid: true, errors: [] }; // Empty is valid (optional)
    }
    
    const channel = this.findChannelById(channelId);
    const errors = [];
    
    if (!channel) {
      errors.push('Selected channel no longer exists');
    } else {
      // Validate channel type matches expected type
      const expectedType = channelType === 'voice' ? 2 : channelType === 'category' ? 4 : 0;
      if (channel.type !== expectedType) {
        errors.push(`Expected ${channelType} channel, got different type`);
      }
    }
    
    const isValid = errors.length === 0;
    selectElement.classList.add(isValid ? 'is-valid' : 'is-invalid');
    
    // Update validation feedback
    const feedback = selectElement.parentElement.querySelector('.validation-feedback');
    if (feedback) feedback.remove();
    
    if (!isValid) {
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'validation-feedback invalid-feedback';
      feedbackEl.textContent = errors[0];
      selectElement.parentElement.appendChild(feedbackEl);
    }
    
    return { isValid, errors };
  }

  /**
   * Save channel configuration
   * Requirements: 2.5
   */
  async saveConfiguration() {
    const form = document.getElementById('channels-config-form');
    if (!form) return;
    
    // Collect form data
    const formData = {};
    form.querySelectorAll('.channel-select').forEach(select => {
      if (select.value) {
        formData[select.name] = select.value;
      }
    });
    
    // Validate all selections
    let hasErrors = false;
    form.querySelectorAll('.channel-select').forEach(select => {
      const result = this.validateChannelSelection(select);
      if (!result.isValid) hasErrors = true;
    });
    
    if (hasErrors) {
      this.configManager.showNotification('Please fix validation errors before saving', 'error');
      return;
    }
    
    try {
      this.configManager.updateConfigStatus('channels', 'saving');
      await this.configManager.updateConfigSection('channels', formData);
      this.currentConfig = formData;
      this.configManager.updateConfigStatus('channels', 'saved');
    } catch (error) {
      console.error('Error saving channel configuration:', error);
      this.configManager.updateConfigStatus('channels', 'error');
    }
  }

  /**
   * Refresh channels from Discord API
   * Requirements: 2.1
   */
  async refreshChannels() {
    try {
      this.configManager.showNotification('Refreshing channels...', 'info');
      await this.loadGuildChannels();
      this.render();
      this.setupEventListeners();
      this.configManager.showNotification('Channels refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing channels:', error);
      this.configManager.showNotification('Failed to refresh channels', 'error');
    }
  }

  /**
   * Get channel name by ID
   */
  getChannelName(channelId) {
    const channel = this.findChannelById(channelId);
    return channel ? channel.name : 'Unknown Channel';
  }

  /**
   * Check if a channel is configured
   */
  isChannelConfigured(key) {
    return Boolean(this.currentConfig[key]);
  }

  /**
   * Get all configured channels
   */
  getConfiguredChannels() {
    return Object.entries(this.currentConfig)
      .filter(([key, value]) => value)
      .map(([key, channelId]) => ({
        key,
        channelId,
        displayName: this.displayNames[key] || key,
        channel: this.findChannelById(channelId)
      }));
  }
}

// Export for use in other scripts
window.ChannelsConfig = ChannelsConfig;