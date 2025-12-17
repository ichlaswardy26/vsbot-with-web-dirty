/**
 * Appearance Configuration Module
 * Handles color pickers, emoji selectors, image URL configuration, and appearance preview
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

class AppearanceConfig {
  constructor(configManager) {
    this.configManager = configManager;
    this.guildId = configManager.guildId;
    this.baseUrl = '/api/config';
    this.currentConfig = {};
    this.apiConnected = false;
    this.validationTimers = new Map();
    this.previewDebounceTimer = null;
    
    // Default fallback emojis for when custom emojis are unavailable
    this.fallbackEmojis = {
      souls: '💰',
      dot: '•',
      blank: '⠀',
      seraphyx: '🤖',
      important: '❗',
      question: '❓',
      report: '📝',
      ban: '🔨',
      partner: '🤝',
      ticket: '🎫',
      roles: '🎭',
      info: 'ℹ️',
      website: '🌐',
      levelup: '⬆️',
      tier: '🏆',
      rocket: '🚀',
      sparkleThumbsup: '👍',
      kittyDance: '💃',
      cowoncy: '🪙',
      donation: '💝',
      foryouCommunity: '👥',
      check: '✅',
      clouds: '☁️',
      blackBoost: '⚡',
      cross: '❌',
      owoCash: '💵',
      blackBat: '🦇',
      cards: '🃏',
      spider: '🕷️',
      darkWyvern: '🐉',
      tako: '🐙',
      paimonPrimogems: '💎',
      witch: '🧙'
    };
    
    // Color definitions for the color picker
    this.colorDefinitions = {
      primary: { name: 'Primary Color', description: 'Main embed color for general messages' },
      success: { name: 'Success Color', description: 'Color for success messages and confirmations' },
      error: { name: 'Error Color', description: 'Color for error messages and warnings' },
      warning: { name: 'Warning Color', description: 'Color for warning and caution messages' },
      info: { name: 'Info Color', description: 'Color for informational messages' }
    };
    
    // Emoji categories for organization
    this.emojiCategories = {
      currency: {
        name: 'Currency & Economy',
        emojis: ['souls', 'cowoncy', 'owoCash', 'paimonPrimogems', 'donation']
      },
      status: {
        name: 'Status Indicators',
        emojis: ['check', 'cross', 'important', 'question', 'info']
      },
      features: {
        name: 'Feature Icons',
        emojis: ['ticket', 'partner', 'roles', 'levelup', 'tier', 'rocket']
      },
      decorative: {
        name: 'Decorative',
        emojis: ['seraphyx', 'dot', 'blank', 'clouds', 'blackBoost', 'sparkleThumbsup']
      },
      special: {
        name: 'Special',
        emojis: ['ban', 'report', 'website', 'kittyDance', 'blackBat', 'cards', 'spider', 'darkWyvern', 'tako', 'witch']
      }
    };
    
    // Image configuration definitions
    this.imageDefinitions = {
      defaultGif: { name: 'Default GIF', description: 'Default animated image for embeds' },
      event: { name: 'Event Image', description: 'Image for event announcements' },
      partner: { name: 'Partner Image', description: 'Image for partnership messages' },
      support: { name: 'Support Image', description: 'Image for support/ticket messages' },
      books: { name: 'Books Image', description: 'Image for rules/documentation' },
      rules: { name: 'Rules Image', description: 'Image for server rules display' },
      rinfo: { name: 'Role Info Image', description: 'Image for role information' },
      qris: { name: 'QRIS Image', description: 'QR code image for payments' }
    };
  }

  /**
   * Initialize the appearance configuration interface
   * Requirements: 5.1
   */
  async initialize() {
    try {
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Render the interface
      this.render();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.apiConnected = true;
      return true;
    } catch (error) {
      console.error('Error initializing appearance config:', error);
      this.configManager.showNotification('Failed to initialize appearance configuration', 'error');
      this.apiConnected = false;
      return false;
    }
  }

  /**
   * Load current appearance configuration
   */
  async loadCurrentConfig() {
    try {
      const config = await this.configManager.getConfigSection('appearance');
      this.currentConfig = config || this.getDefaultConfig();
      return this.currentConfig;
    } catch (error) {
      console.error('Error loading appearance config:', error);
      this.currentConfig = this.getDefaultConfig();
      return this.currentConfig;
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#5865F2'
      },
      emojis: { ...this.fallbackEmojis },
      images: {
        defaultGif: '',
        event: '',
        partner: '',
        support: '',
        books: '',
        rules: '',
        rinfo: '',
        qris: ''
      }
    };
  }

  /**
   * Render the appearance configuration interface
   * Requirements: 5.1
   */
  render() {
    const container = document.getElementById('appearance-config-container');
    if (!container) {
      console.error('Appearance config container not found');
      return;
    }
    
    container.innerHTML = `
      <form id="appearance-config-form" class="config-form">
        <!-- Colors Section -->
        <div class="card appearance-card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <i class="fas fa-palette me-2"></i>Embed Colors
            </h5>
            <p class="text-muted mb-0 mt-1">Customize the colors used in bot embeds and messages</p>
          </div>
          <div class="card-body">
            ${this.renderColorPickers()}
          </div>
        </div>
        
        <!-- Emojis Section -->
        <div class="card appearance-card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <i class="fas fa-smile me-2"></i>Custom Emojis
            </h5>
            <p class="text-muted mb-0 mt-1">Configure emojis used throughout bot messages</p>
          </div>
          <div class="card-body">
            ${this.renderEmojiSelectors()}
          </div>
        </div>
        
        <!-- Images Section -->
        <div class="card appearance-card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <i class="fas fa-image me-2"></i>Custom Images
            </h5>
            <p class="text-muted mb-0 mt-1">Set custom images and GIFs for bot embeds</p>
          </div>
          <div class="card-body">
            ${this.renderImageInputs()}
          </div>
        </div>
        
        <!-- Preview Section -->
        <div class="card appearance-card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <i class="fas fa-eye me-2"></i>Live Preview
            </h5>
            <p class="text-muted mb-0 mt-1">Preview how your settings will look in Discord</p>
          </div>
          <div class="card-body">
            ${this.renderPreview()}
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" data-config-save>
            <i class="fas fa-save me-2"></i>Save Appearance Settings
          </button>
          <button type="button" class="btn btn-outline-secondary" id="refresh-appearance-btn">
            <i class="fas fa-sync me-2"></i>Refresh
          </button>
          <button type="button" class="btn btn-outline-warning" id="reset-appearance-btn">
            <i class="fas fa-undo me-2"></i>Reset to Defaults
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render color picker components
   * Requirements: 5.1
   */
  renderColorPickers() {
    const colors = this.currentConfig.colors || {};
    
    return `
      <div class="row">
        ${Object.entries(this.colorDefinitions).map(([key, def]) => {
          const value = colors[key] || '#5865F2';
          return `
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="form-group color-picker-group">
                <label for="color-${key}" class="form-label">${def.name}</label>
                <small class="d-block text-muted mb-2">${def.description}</small>
                <div class="color-picker-wrapper">
                  <input 
                    type="color" 
                    class="form-control form-control-color color-picker-input" 
                    id="color-${key}"
                    name="colors.${key}"
                    value="${value}"
                    data-validate="color"
                  >
                  <input 
                    type="text" 
                    class="form-control color-hex-input" 
                    id="color-hex-${key}"
                    value="${value}"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#RRGGBB"
                    data-color-key="${key}"
                  >
                  <div class="color-preview" id="color-preview-${key}" style="background-color: ${value}"></div>
                </div>
                <div class="validation-feedback" id="color-${key}-feedback"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render emoji selector components
   * Requirements: 5.2
   */
  renderEmojiSelectors() {
    const emojis = this.currentConfig.emojis || {};
    
    return Object.entries(this.emojiCategories).map(([categoryKey, category]) => `
      <div class="emoji-category mb-4">
        <h6 class="emoji-category-title">${category.name}</h6>
        <div class="row">
          ${category.emojis.map(emojiKey => {
            const value = emojis[emojiKey] || this.fallbackEmojis[emojiKey] || '⭐';
            const fallback = this.fallbackEmojis[emojiKey] || '⭐';
            return `
              <div class="col-md-6 col-lg-4 mb-3">
                <div class="form-group emoji-input-group">
                  <label for="emoji-${emojiKey}" class="form-label">
                    <span class="emoji-preview-label">${value}</span>
                    ${this.formatEmojiName(emojiKey)}
                  </label>
                  <div class="emoji-input-wrapper">
                    <input 
                      type="text" 
                      class="form-control emoji-input" 
                      id="emoji-${emojiKey}"
                      name="emojis.${emojiKey}"
                      value="${this.escapeHtml(value)}"
                      placeholder="Enter emoji or custom emoji ID"
                      data-validate="emoji"
                      data-fallback="${fallback}"
                      data-emoji-key="${emojiKey}"
                    >
                    <button type="button" class="btn btn-outline-secondary btn-emoji-picker" data-emoji-key="${emojiKey}" title="Pick emoji">
                      <i class="fas fa-smile"></i>
                    </button>
                    <button type="button" class="btn btn-outline-warning btn-emoji-reset" data-emoji-key="${emojiKey}" data-fallback="${fallback}" title="Reset to default">
                      <i class="fas fa-undo"></i>
                    </button>
                  </div>
                  <div class="validation-feedback" id="emoji-${emojiKey}-feedback"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  /**
   * Render image URL input components
   * Requirements: 5.1
   */
  renderImageInputs() {
    const images = this.currentConfig.images || {};
    
    return `
      <div class="row">
        ${Object.entries(this.imageDefinitions).map(([key, def]) => {
          const value = images[key] || '';
          return `
            <div class="col-md-6 mb-3">
              <div class="form-group image-input-group">
                <label for="image-${key}" class="form-label">${def.name}</label>
                <small class="d-block text-muted mb-2">${def.description}</small>
                <div class="image-input-wrapper">
                  <input 
                    type="url" 
                    class="form-control image-url-input" 
                    id="image-${key}"
                    name="images.${key}"
                    value="${this.escapeHtml(value)}"
                    placeholder="https://example.com/image.png"
                    data-validate="url"
                    data-image-key="${key}"
                  >
                  <button type="button" class="btn btn-outline-secondary btn-image-preview" data-image-key="${key}" title="Preview image">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-image-clear" data-image-key="${key}" title="Clear image">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="image-thumbnail-preview" id="image-preview-${key}">
                  ${value ? `<img src="${this.escapeHtml(value)}" alt="${def.name}" onerror="this.parentElement.innerHTML='<span class=\\'text-muted\\'>Invalid image URL</span>'">` : '<span class="text-muted">No image set</span>'}
                </div>
                <div class="validation-feedback" id="image-${key}-feedback"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render appearance preview
   * Requirements: 5.3
   */
  renderPreview() {
    const colors = this.currentConfig.colors || {};
    const emojis = this.currentConfig.emojis || {};
    
    return `
      <div class="appearance-preview-container">
        <div class="preview-embed" id="preview-embed" style="border-left-color: ${colors.primary || '#5865F2'}">
          <div class="preview-embed-content">
            <div class="preview-embed-title">
              ${emojis.seraphyx || '🤖'} Sample Bot Message
            </div>
            <div class="preview-embed-description">
              ${emojis.check || '✅'} This is how your bot messages will look!<br>
              ${emojis.souls || '💰'} Currency: 1,000 Souls<br>
              ${emojis.levelup || '⬆️'} Level Up! You reached level 10<br>
              ${emojis.info || 'ℹ️'} Use the settings above to customize
            </div>
            <div class="preview-embed-footer">
              ${emojis.dot || '•'} Preview ${emojis.dot || '•'} Updated in real-time
            </div>
          </div>
        </div>
        
        <div class="preview-color-swatches mt-3">
          <span class="preview-swatch" style="background-color: ${colors.primary || '#5865F2'}" title="Primary"></span>
          <span class="preview-swatch" style="background-color: ${colors.success || '#57F287'}" title="Success"></span>
          <span class="preview-swatch" style="background-color: ${colors.error || '#ED4245'}" title="Error"></span>
          <span class="preview-swatch" style="background-color: ${colors.warning || '#FEE75C'}" title="Warning"></span>
          <span class="preview-swatch" style="background-color: ${colors.info || '#5865F2'}" title="Info"></span>
        </div>
      </div>
    `;
  }


  /**
   * Setup event listeners
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  setupEventListeners() {
    const form = document.getElementById('appearance-config-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfiguration();
    });
    
    // Color picker changes
    form.querySelectorAll('.color-picker-input').forEach(picker => {
      picker.addEventListener('input', (e) => {
        this.handleColorChange(e.target);
      });
    });
    
    // Color hex input changes
    form.querySelectorAll('.color-hex-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleColorHexChange(e.target);
      });
      input.addEventListener('blur', (e) => {
        this.validateColorInput(e.target);
      });
    });
    
    // Emoji input changes with validation
    form.querySelectorAll('.emoji-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleEmojiChange(e.target);
      });
      input.addEventListener('blur', (e) => {
        this.validateEmojiInput(e.target);
      });
    });
    
    // Emoji picker buttons
    form.querySelectorAll('.btn-emoji-picker').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.showEmojiPicker(e.target.closest('button').dataset.emojiKey);
      });
    });
    
    // Emoji reset buttons
    form.querySelectorAll('.btn-emoji-reset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        this.resetEmojiToDefault(button.dataset.emojiKey, button.dataset.fallback);
      });
    });
    
    // Image URL input changes
    form.querySelectorAll('.image-url-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleImageUrlChange(e.target);
      });
      input.addEventListener('blur', (e) => {
        this.validateImageUrl(e.target);
      });
    });
    
    // Image preview buttons
    form.querySelectorAll('.btn-image-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.previewImage(e.target.closest('button').dataset.imageKey);
      });
    });
    
    // Image clear buttons
    form.querySelectorAll('.btn-image-clear').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.clearImage(e.target.closest('button').dataset.imageKey);
      });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-appearance-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshAppearance();
      });
    }
    
    // Reset to defaults button
    const resetBtn = document.getElementById('reset-appearance-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }
  }

  /**
   * Handle color picker change
   * Requirements: 5.1, 5.3
   */
  handleColorChange(picker) {
    const key = picker.id.replace('color-', '');
    const value = picker.value;
    
    // Update hex input
    const hexInput = document.getElementById(`color-hex-${key}`);
    if (hexInput) {
      hexInput.value = value;
    }
    
    // Update preview
    const preview = document.getElementById(`color-preview-${key}`);
    if (preview) {
      preview.style.backgroundColor = value;
    }
    
    // Update live preview
    this.updatePreview();
  }

  /**
   * Handle color hex input change
   * Requirements: 5.1, 5.4
   */
  handleColorHexChange(input) {
    const key = input.dataset.colorKey;
    let value = input.value;
    
    // Add # if missing
    if (value && !value.startsWith('#')) {
      value = '#' + value;
      input.value = value;
    }
    
    // Validate and update color picker
    if (this.isValidColor(value)) {
      const picker = document.getElementById(`color-${key}`);
      if (picker) {
        picker.value = value;
      }
      
      const preview = document.getElementById(`color-preview-${key}`);
      if (preview) {
        preview.style.backgroundColor = value;
      }
      
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      
      // Update live preview
      this.updatePreview();
    } else if (value.length >= 7) {
      input.classList.remove('is-valid');
      input.classList.add('is-invalid');
    }
  }

  /**
   * Validate color input
   * Requirements: 5.4
   */
  validateColorInput(input) {
    const value = input.value;
    const feedbackId = `color-${input.dataset.colorKey}-feedback`;
    const feedback = document.getElementById(feedbackId);
    
    if (!value) {
      input.classList.remove('is-valid', 'is-invalid');
      if (feedback) feedback.innerHTML = '';
      return { isValid: true, errors: [] };
    }
    
    const isValid = this.isValidColor(value);
    input.classList.toggle('is-valid', isValid);
    input.classList.toggle('is-invalid', !isValid);
    
    if (feedback) {
      feedback.innerHTML = isValid ? '' : '<span class="text-danger">Invalid color format. Use #RRGGBB</span>';
    }
    
    return { isValid, errors: isValid ? [] : ['Invalid color format'] };
  }

  /**
   * Check if color is valid hex format
   */
  isValidColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Handle emoji input change
   * Requirements: 5.2, 5.3
   */
  handleEmojiChange(input) {
    const key = input.dataset.emojiKey;
    const value = input.value;
    
    // Update label preview
    const label = input.closest('.emoji-input-group').querySelector('.emoji-preview-label');
    if (label) {
      label.textContent = value || this.fallbackEmojis[key] || '⭐';
    }
    
    // Debounced preview update
    this.updatePreviewDebounced();
  }

  /**
   * Validate emoji input
   * Requirements: 5.2, 5.5
   */
  validateEmojiInput(input) {
    const key = input.dataset.emojiKey;
    const value = input.value;
    const fallback = input.dataset.fallback;
    const feedbackId = `emoji-${key}-feedback`;
    const feedback = document.getElementById(feedbackId);
    
    if (!value) {
      // Use fallback if empty
      input.value = fallback;
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      if (feedback) feedback.innerHTML = '<span class="text-info">Using default emoji</span>';
      
      // Update label
      const label = input.closest('.emoji-input-group').querySelector('.emoji-preview-label');
      if (label) label.textContent = fallback;
      
      return { isValid: true, errors: [], usedFallback: true };
    }
    
    const validation = this.isValidEmoji(value);
    input.classList.toggle('is-valid', validation.isValid);
    input.classList.toggle('is-invalid', !validation.isValid);
    
    if (feedback) {
      if (!validation.isValid) {
        // Apply fallback
        input.value = fallback;
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        feedback.innerHTML = `<span class="text-warning">Invalid emoji, using fallback: ${fallback}</span>`;
        
        // Update label
        const label = input.closest('.emoji-input-group').querySelector('.emoji-preview-label');
        if (label) label.textContent = fallback;
        
        this.configManager.showNotification(`Invalid emoji for ${this.formatEmojiName(key)}, using fallback`, 'warning');
      } else {
        feedback.innerHTML = '';
      }
    }
    
    this.updatePreview();
    return validation;
  }

  /**
   * Check if emoji is valid
   * Requirements: 5.2
   */
  isValidEmoji(emoji) {
    if (!emoji) return { isValid: false, errors: ['Emoji is required'] };
    
    // Unicode emoji pattern
    const unicodePattern = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B50}]|[\u{2139}]|[\u{2705}]|[\u{274C}]|[\u{2B06}]|[\u{1F4B0}]|[\u{1F4B5}]|[\u{1F4B8}]|[\u{1F389}]|[\u{1F3C6}]|[\u{1F680}]|[\u{2728}]|[\u{26A1}]|[\u{2601}]|[\u{1F916}]|[\u{2757}]|[\u{2753}]|[\u{1F4DD}]|[\u{1F528}]|[\u{1F91D}]|[\u{1F3AB}]|[\u{1F3AD}]|[\u{1F310}]|[\u{1F44D}]|[\u{1F483}]|[\u{1FA99}]|[\u{1F49D}]|[\u{1F465}]|[\u{2714}]|[\u{2611}]|[\u{1F987}]|[\u{1F0CF}]|[\u{1F577}]|[\u{1F409}]|[\u{1F419}]|[\u{1F48E}]|[\u{1F9D9}]$/u;
    
    // Discord custom emoji pattern
    const customPattern = /^<a?:\w+:\d+>$/;
    
    // Simple characters that are valid (like • or ⠀)
    const simpleChars = ['•', '⠀', '·', '‣', '◦', '▪', '▫'];
    
    if (unicodePattern.test(emoji) || customPattern.test(emoji) || simpleChars.includes(emoji)) {
      return { isValid: true, errors: [] };
    }
    
    // Check if it's a single emoji character (fallback check)
    if (emoji.length <= 2 && /\p{Emoji}/u.test(emoji)) {
      return { isValid: true, errors: [] };
    }
    
    return { isValid: false, errors: ['Invalid emoji format'] };
  }

  /**
   * Reset emoji to default fallback
   * Requirements: 5.5
   */
  resetEmojiToDefault(key, fallback) {
    const input = document.getElementById(`emoji-${key}`);
    if (input) {
      input.value = fallback;
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      
      // Update label
      const label = input.closest('.emoji-input-group').querySelector('.emoji-preview-label');
      if (label) label.textContent = fallback;
      
      // Clear feedback
      const feedback = document.getElementById(`emoji-${key}-feedback`);
      if (feedback) feedback.innerHTML = '';
      
      this.updatePreview();
      this.configManager.showNotification(`Reset ${this.formatEmojiName(key)} to default`, 'info');
    }
  }

  /**
   * Show emoji picker (simplified - opens native picker or shows common emojis)
   */
  showEmojiPicker(key) {
    const input = document.getElementById(`emoji-${key}`);
    if (!input) return;
    
    // Create a simple emoji picker popup
    const existingPicker = document.querySelector('.emoji-picker-popup');
    if (existingPicker) existingPicker.remove();
    
    const commonEmojis = ['💰', '⭐', '✅', '❌', '⬆️', '🚀', '🎫', '🤝', '👥', 'ℹ️', '⚠️', '❓', '🎉', '💎', '🏆', '🔥', '💫', '✨', '🌟', '⚡'];
    
    const picker = document.createElement('div');
    picker.className = 'emoji-picker-popup';
    picker.innerHTML = `
      <div class="emoji-picker-header">
        <span>Select Emoji</span>
        <button type="button" class="btn-close btn-close-sm" aria-label="Close"></button>
      </div>
      <div class="emoji-picker-grid">
        ${commonEmojis.map(e => `<button type="button" class="emoji-picker-item" data-emoji="${e}">${e}</button>`).join('')}
      </div>
    `;
    
    // Position near the input
    const rect = input.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = `${rect.bottom + 5}px`;
    picker.style.left = `${rect.left}px`;
    picker.style.zIndex = '1050';
    
    document.body.appendChild(picker);
    
    // Handle emoji selection
    picker.querySelectorAll('.emoji-picker-item').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.emoji;
        this.handleEmojiChange(input);
        picker.remove();
      });
    });
    
    // Close button
    picker.querySelector('.btn-close').addEventListener('click', () => picker.remove());
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeHandler(e) {
        if (!picker.contains(e.target) && e.target !== input) {
          picker.remove();
          document.removeEventListener('click', closeHandler);
        }
      });
    }, 100);
  }

  /**
   * Handle image URL change
   * Requirements: 5.1
   */
  handleImageUrlChange(input) {
    const key = input.dataset.imageKey;
    
    // Debounced preview update
    clearTimeout(this.validationTimers.get(key));
    this.validationTimers.set(key, setTimeout(() => {
      this.updateImagePreview(key, input.value);
    }, 500));
  }

  /**
   * Validate image URL
   * Requirements: 5.4
   */
  validateImageUrl(input) {
    const key = input.dataset.imageKey;
    const value = input.value;
    const feedbackId = `image-${key}-feedback`;
    const feedback = document.getElementById(feedbackId);
    
    if (!value) {
      input.classList.remove('is-valid', 'is-invalid');
      if (feedback) feedback.innerHTML = '';
      this.updateImagePreview(key, '');
      return { isValid: true, errors: [] };
    }
    
    const isValid = this.isValidUrl(value);
    input.classList.toggle('is-valid', isValid);
    input.classList.toggle('is-invalid', !isValid);
    
    if (feedback) {
      feedback.innerHTML = isValid ? '' : '<span class="text-danger">Invalid URL format. Use https://...</span>';
    }
    
    if (isValid) {
      this.updateImagePreview(key, value);
    }
    
    return { isValid, errors: isValid ? [] : ['Invalid URL format'] };
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Update image preview thumbnail
   */
  updateImagePreview(key, url) {
    const preview = document.getElementById(`image-preview-${key}`);
    if (!preview) return;
    
    if (!url) {
      preview.innerHTML = '<span class="text-muted">No image set</span>';
      return;
    }
    
    preview.innerHTML = `<img src="${this.escapeHtml(url)}" alt="${key}" onerror="this.parentElement.innerHTML='<span class=\\'text-danger\\'>Failed to load image</span>'">`;
  }

  /**
   * Preview image in modal
   */
  previewImage(key) {
    const input = document.getElementById(`image-${key}`);
    if (!input || !input.value) {
      this.configManager.showNotification('No image URL to preview', 'info');
      return;
    }
    
    // Open image in new tab for preview
    window.open(input.value, '_blank');
  }

  /**
   * Clear image URL
   */
  clearImage(key) {
    const input = document.getElementById(`image-${key}`);
    if (input) {
      input.value = '';
      input.classList.remove('is-valid', 'is-invalid');
      this.updateImagePreview(key, '');
      
      const feedback = document.getElementById(`image-${key}-feedback`);
      if (feedback) feedback.innerHTML = '';
    }
  }

  /**
   * Update live preview (debounced)
   */
  updatePreviewDebounced() {
    clearTimeout(this.previewDebounceTimer);
    this.previewDebounceTimer = setTimeout(() => {
      this.updatePreview();
    }, 150);
  }

  /**
   * Update live preview
   * Requirements: 5.3
   */
  updatePreview() {
    const form = document.getElementById('appearance-config-form');
    if (!form) return;
    
    // Collect current values
    const colors = {};
    form.querySelectorAll('.color-picker-input').forEach(picker => {
      const key = picker.id.replace('color-', '');
      colors[key] = picker.value;
    });
    
    const emojis = {};
    form.querySelectorAll('.emoji-input').forEach(input => {
      const key = input.dataset.emojiKey;
      emojis[key] = input.value || this.fallbackEmojis[key];
    });
    
    // Update preview embed
    const previewEmbed = document.getElementById('preview-embed');
    if (previewEmbed) {
      previewEmbed.style.borderLeftColor = colors.primary || '#5865F2';
      
      const content = previewEmbed.querySelector('.preview-embed-content');
      if (content) {
        content.innerHTML = `
          <div class="preview-embed-title">
            ${emojis.seraphyx || '🤖'} Sample Bot Message
          </div>
          <div class="preview-embed-description">
            ${emojis.check || '✅'} This is how your bot messages will look!<br>
            ${emojis.souls || '💰'} Currency: 1,000 Souls<br>
            ${emojis.levelup || '⬆️'} Level Up! You reached level 10<br>
            ${emojis.info || 'ℹ️'} Use the settings above to customize
          </div>
          <div class="preview-embed-footer">
            ${emojis.dot || '•'} Preview ${emojis.dot || '•'} Updated in real-time
          </div>
        `;
      }
    }
    
    // Update color swatches
    const swatches = document.querySelectorAll('.preview-swatch');
    const colorKeys = ['primary', 'success', 'error', 'warning', 'info'];
    swatches.forEach((swatch, index) => {
      if (colorKeys[index] && colors[colorKeys[index]]) {
        swatch.style.backgroundColor = colors[colorKeys[index]];
      }
    });
  }

  /**
   * Collect form data
   */
  collectFormData(form) {
    const formData = {
      colors: {},
      emojis: {},
      images: {}
    };
    
    // Collect colors
    form.querySelectorAll('.color-picker-input').forEach(picker => {
      const key = picker.id.replace('color-', '');
      formData.colors[key] = picker.value;
    });
    
    // Collect emojis
    form.querySelectorAll('.emoji-input').forEach(input => {
      const key = input.dataset.emojiKey;
      formData.emojis[key] = input.value || this.fallbackEmojis[key];
    });
    
    // Collect images
    form.querySelectorAll('.image-url-input').forEach(input => {
      const key = input.dataset.imageKey;
      formData.images[key] = input.value || null;
    });
    
    return formData;
  }

  /**
   * Save appearance configuration
   * Requirements: 5.3
   */
  async saveConfiguration() {
    const form = document.getElementById('appearance-config-form');
    if (!form) return;
    
    // Validate all inputs
    let hasErrors = false;
    const warnings = [];
    
    // Validate colors
    form.querySelectorAll('.color-hex-input').forEach(input => {
      const result = this.validateColorInput(input);
      if (!result.isValid) hasErrors = true;
    });
    
    // Validate emojis (with fallback)
    form.querySelectorAll('.emoji-input').forEach(input => {
      const result = this.validateEmojiInput(input);
      if (result.usedFallback) {
        warnings.push(`Using fallback emoji for ${this.formatEmojiName(input.dataset.emojiKey)}`);
      }
    });
    
    // Validate image URLs
    form.querySelectorAll('.image-url-input').forEach(input => {
      if (input.value) {
        const result = this.validateImageUrl(input);
        if (!result.isValid) hasErrors = true;
      }
    });
    
    if (hasErrors) {
      this.configManager.showNotification('Please fix validation errors before saving', 'error');
      return;
    }
    
    // Collect form data
    const formData = this.collectFormData(form);
    
    try {
      this.configManager.updateConfigStatus('appearance', 'saving');
      
      await this.configManager.updateConfigSection('appearance', formData);
      this.currentConfig = formData;
      this.configManager.updateConfigStatus('appearance', 'saved');
      
      if (warnings.length > 0) {
        this.configManager.showNotification('Appearance saved with fallbacks applied', 'warning', warnings);
      } else {
        this.configManager.showNotification('Appearance settings saved and applied immediately', 'success');
      }
    } catch (error) {
      console.error('Error saving appearance configuration:', error);
      this.configManager.updateConfigStatus('appearance', 'error');
      this.configManager.showNotification('Failed to save appearance settings', 'error', error.message);
    }
  }

  /**
   * Refresh appearance configuration
   */
  async refreshAppearance() {
    try {
      this.configManager.showNotification('Refreshing appearance settings...', 'info');
      await this.loadCurrentConfig();
      this.render();
      this.setupEventListeners();
      this.configManager.showNotification('Appearance settings refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing appearance:', error);
      this.configManager.showNotification('Failed to refresh appearance settings', 'error');
    }
  }

  /**
   * Reset to default values
   */
  resetToDefaults() {
    if (!confirm('Are you sure you want to reset all appearance settings to defaults?')) {
      return;
    }
    
    this.currentConfig = this.getDefaultConfig();
    this.render();
    this.setupEventListeners();
    this.configManager.showNotification('Appearance settings reset to defaults (not saved yet)', 'info');
  }

  /**
   * Format emoji key name for display
   */
  formatEmojiName(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other scripts
window.AppearanceConfig = AppearanceConfig;
