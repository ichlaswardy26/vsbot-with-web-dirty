/**
 * Overview Dashboard Script
 * Handles dashboard overview statistics, progress indicators, search, and quick actions
 * Requirements: Overall user experience requirements (Task 18)
 */

class OverviewDashboard {
  constructor(configManager) {
    this.configManager = configManager;
    this.searchIndex = [];
    this.searchTimeout = null;
    this.activeSearchIndex = -1;
    this.recentActivity = [];
    this.healthCheckInterval = null;
    
    this.init();
  }

  /**
   * Initialize the overview dashboard
   */
  init() {
    this.setupQuickActions();
    this.setupSearch();
    this.setupSetupChecklist();
    this.setupProgressClickHandlers();
    this.setupHealthRefresh();
    this.buildSearchIndex();
    
    // Load initial data
    this.loadBotStatus();
    this.loadConfigurationProgress();
    this.loadRecentActivity();
    this.checkSystemHealth();
    
    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => this.checkSystemHealth(), 30000);
  }

  /**
   * Setup quick action buttons
   */
  setupQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  /**
   * Handle quick action button clicks
   */
  handleQuickAction(action) {
    switch (action) {
      case 'configure-channels':
        window.dashboard?.switchSection('channels');
        break;
      case 'configure-roles':
        window.dashboard?.switchSection('roles');
        break;
      case 'toggle-features':
        window.dashboard?.switchSection('features');
        break;
      case 'apply-template':
        this.showTemplateModal();
        break;
      case 'export-config':
        window.dashboard?.exportConfig();
        break;
    }
  }

  /**
   * Show template selection modal
   */
  async showTemplateModal() {
    // Check if templates modal exists, if not create it
    let modal = document.getElementById('templateModal');
    if (!modal) {
      modal = this.createTemplateModal();
      document.body.appendChild(modal);
    }
    
    // Load templates
    await this.loadTemplates();
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  /**
   * Create template selection modal
   */
  createTemplateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'templateModal';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-magic me-2"></i>
              Apply Configuration Template
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-3">Select a template to quickly configure your bot for common use cases.</p>
            <div id="templateList" class="row g-3">
              <div class="text-center py-4">
                <div class="loading-spinner mb-2"></div>
                <p class="text-muted">Loading templates...</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  /**
   * Load available templates
   */
  async loadTemplates() {
    const templateList = document.getElementById('templateList');
    if (!templateList) return;

    try {
      const response = await fetch('/api/templates', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to load templates');
      
      const data = await response.json();
      const templates = data.data || [];
      
      if (templates.length === 0) {
        templateList.innerHTML = `
          <div class="col-12 text-center py-4">
            <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
            <p class="text-muted">No templates available</p>
          </div>
        `;
        return;
      }
      
      templateList.innerHTML = templates.map(template => `
        <div class="col-md-6">
          <div class="card template-card h-100" data-template-id="${template._id || template.id}">
            <div class="card-body">
              <div class="d-flex align-items-start gap-3">
                <div class="template-icon">
                  <i class="fas ${this.getTemplateIcon(template.type)} fa-2x text-primary"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="card-title mb-1">${template.name}</h6>
                  <p class="card-text small text-muted mb-2">${template.description || 'No description'}</p>
                  <div class="d-flex flex-wrap gap-1">
                    ${(template.tags || []).map(tag => `<span class="badge bg-light text-dark">${tag}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <button class="btn btn-sm btn-primary w-100 apply-template-btn" data-template-id="${template._id || template.id}">
                <i class="fas fa-check me-1"></i> Apply Template
              </button>
            </div>
          </div>
        </div>
      `).join('');
      
      // Add click handlers
      templateList.querySelectorAll('.apply-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const templateId = e.currentTarget.dataset.templateId;
          this.applyTemplate(templateId);
        });
      });
      
    } catch (error) {
      console.error('Error loading templates:', error);
      templateList.innerHTML = `
        <div class="col-12 text-center py-4">
          <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <p class="text-muted">Failed to load templates</p>
        </div>
      `;
    }
  }


  /**
   * Get icon for template type
   */
  getTemplateIcon(type) {
    const icons = {
      gaming: 'fa-gamepad',
      community: 'fa-users',
      education: 'fa-graduation-cap',
      business: 'fa-briefcase',
      default: 'fa-cog'
    };
    return icons[type] || icons.default;
  }

  /**
   * Apply a template
   */
  async applyTemplate(templateId) {
    try {
      const modal = bootstrap.Modal.getInstance(document.getElementById('templateModal'));
      modal?.hide();
      
      this.configManager.showNotification('Applying template...', 'info');
      
      const response = await fetch(`/api/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to apply template');
      
      this.configManager.showNotification('Template applied successfully!', 'success');
      
      // Reload configuration progress
      this.loadConfigurationProgress();
      this.addActivity('import', 'Applied configuration template');
      
    } catch (error) {
      console.error('Error applying template:', error);
      this.configManager.showNotification('Failed to apply template', 'error');
    }
  }

  /**
   * Setup global search functionality
   */
  setupSearch() {
    const searchInput = document.getElementById('globalSearch');
    const mobileSearchInput = document.getElementById('mobileGlobalSearch');
    const clearBtn = document.getElementById('clearSearch');
    const dropdown = document.getElementById('searchResultsDropdown');
    
    const handleSearch = (e) => {
      const query = e.target.value.trim();
      
      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
      }
      
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 200);
    };
    
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          dropdown.style.display = 'block';
        }
      });
      searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    }
    
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', handleSearch);
      mobileSearchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (mobileSearchInput) mobileSearchInput.value = '';
        clearBtn.style.display = 'none';
        dropdown.style.display = 'none';
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container') && !e.target.closest('.mobile-search-bar')) {
        dropdown.style.display = 'none';
      }
    });
  }

  /**
   * Build search index from configuration options
   */
  buildSearchIndex() {
    this.searchIndex = [
      // Channels
      { title: 'Welcome Channel', section: 'channels', path: 'channels.welcome', icon: 'fa-hashtag', keywords: ['welcome', 'greeting', 'join'] },
      { title: 'Log Channel', section: 'channels', path: 'channels.log', icon: 'fa-hashtag', keywords: ['log', 'audit', 'history'] },
      { title: 'Level Up Channel', section: 'channels', path: 'channels.levelUp', icon: 'fa-hashtag', keywords: ['level', 'xp', 'rank'] },
      { title: 'Confession Channel', section: 'channels', path: 'channels.confession', icon: 'fa-hashtag', keywords: ['confession', 'anonymous'] },
      { title: 'Ticket Category', section: 'channels', path: 'channels.ticketCategory', icon: 'fa-folder', keywords: ['ticket', 'support', 'help'] },
      { title: 'Voice Create Channel', section: 'channels', path: 'channels.voiceCreate', icon: 'fa-volume-up', keywords: ['voice', 'vc', 'create'] },
      
      // Roles
      { title: 'Admin Role', section: 'roles', path: 'roles.admin', icon: 'fa-user-shield', keywords: ['admin', 'administrator', 'owner'] },
      { title: 'Moderator Role', section: 'roles', path: 'roles.moderator', icon: 'fa-user-cog', keywords: ['mod', 'moderator', 'staff'] },
      { title: 'Level Roles', section: 'roles', path: 'roles.levels', icon: 'fa-layer-group', keywords: ['level', 'tier', 'rank', 'xp'] },
      { title: 'Muted Role', section: 'roles', path: 'roles.muted', icon: 'fa-volume-mute', keywords: ['mute', 'timeout', 'silence'] },
      
      // Features
      { title: 'Leveling System', section: 'features', path: 'features.leveling', icon: 'fa-chart-line', keywords: ['level', 'xp', 'experience', 'rank'] },
      { title: 'Economy System', section: 'features', path: 'features.economy', icon: 'fa-coins', keywords: ['economy', 'money', 'coins', 'balance'] },
      { title: 'Welcome Messages', section: 'features', path: 'features.welcome', icon: 'fa-door-open', keywords: ['welcome', 'greeting', 'join'] },
      { title: 'Ticket System', section: 'features', path: 'features.tickets', icon: 'fa-ticket-alt', keywords: ['ticket', 'support', 'help'] },
      { title: 'Giveaways', section: 'features', path: 'features.giveaways', icon: 'fa-gift', keywords: ['giveaway', 'raffle', 'prize'] },
      { title: 'Auto Responder', section: 'features', path: 'features.autoResponder', icon: 'fa-reply', keywords: ['auto', 'response', 'trigger'] },
      { title: 'Word Chain', section: 'features', path: 'features.wordChain', icon: 'fa-link', keywords: ['word', 'chain', 'game'] },
      { title: 'AFK System', section: 'features', path: 'features.afk', icon: 'fa-moon', keywords: ['afk', 'away', 'status'] },
      
      // Appearance
      { title: 'Embed Colors', section: 'appearance', path: 'appearance.colors', icon: 'fa-palette', keywords: ['color', 'embed', 'theme'] },
      { title: 'Custom Emojis', section: 'appearance', path: 'appearance.emojis', icon: 'fa-smile', keywords: ['emoji', 'emoticon', 'reaction'] },
      { title: 'Bot Images', section: 'appearance', path: 'appearance.images', icon: 'fa-image', keywords: ['image', 'picture', 'avatar'] }
    ];
  }

  /**
   * Perform search and display results
   */
  performSearch(query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    const resultsList = document.getElementById('searchResultsList');
    
    if (!query) {
      dropdown.style.display = 'none';
      return;
    }
    
    const queryLower = query.toLowerCase();
    const results = this.searchIndex.filter(item => {
      return item.title.toLowerCase().includes(queryLower) ||
             item.keywords.some(kw => kw.includes(queryLower));
    });
    
    if (results.length === 0) {
      resultsList.innerHTML = `
        <div class="search-no-results">
          <i class="fas fa-search"></i>
          <div>No results found for "${query}"</div>
        </div>
      `;
    } else {
      resultsList.innerHTML = results.map((item, index) => `
        <div class="search-result-item" data-section="${item.section}" data-path="${item.path}" data-index="${index}">
          <div class="search-result-icon">
            <i class="fas ${item.icon}"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${this.highlightMatch(item.title, query)}</div>
            <div class="search-result-section">${this.getSectionLabel(item.section)}</div>
          </div>
          <span class="search-result-badge">${item.section}</span>
        </div>
      `).join('');
      
      // Add click handlers
      resultsList.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const section = item.dataset.section;
          window.dashboard?.switchSection(section);
          dropdown.style.display = 'none';
          document.getElementById('globalSearch').value = '';
        });
      });
    }
    
    dropdown.style.display = 'block';
    this.activeSearchIndex = -1;
  }

  /**
   * Handle keyboard navigation in search
   */
  handleSearchKeydown(e) {
    const dropdown = document.getElementById('searchResultsDropdown');
    const items = dropdown.querySelectorAll('.search-result-item');
    
    if (dropdown.style.display === 'none' || items.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeSearchIndex = Math.min(this.activeSearchIndex + 1, items.length - 1);
        this.updateActiveSearchItem(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.activeSearchIndex = Math.max(this.activeSearchIndex - 1, 0);
        this.updateActiveSearchItem(items);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.activeSearchIndex >= 0 && items[this.activeSearchIndex]) {
          items[this.activeSearchIndex].click();
        }
        break;
      case 'Escape':
        dropdown.style.display = 'none';
        break;
    }
  }

  /**
   * Update active search item highlight
   */
  updateActiveSearchItem(items) {
    items.forEach((item, index) => {
      item.classList.toggle('active', index === this.activeSearchIndex);
    });
    
    if (this.activeSearchIndex >= 0 && items[this.activeSearchIndex]) {
      items[this.activeSearchIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Highlight matching text in search results
   */
  highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Get human-readable section label
   */
  getSectionLabel(section) {
    const labels = {
      channels: 'Channel Configuration',
      roles: 'Role Configuration',
      features: 'Feature Settings',
      appearance: 'Appearance Settings'
    };
    return labels[section] || section;
  }

  /**
   * Setup setup checklist click handlers
   */
  setupSetupChecklist() {
    document.querySelectorAll('.setup-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        window.dashboard?.switchSection(section);
      });
    });
    
    // Make entire setup item clickable on mobile
    document.querySelectorAll('.setup-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (window.innerWidth <= 575.98 && !e.target.closest('.setup-action')) {
          const section = item.dataset.step;
          window.dashboard?.switchSection(section);
        }
      });
    });
  }

  /**
   * Setup progress item click handlers
   */
  setupProgressClickHandlers() {
    document.querySelectorAll('.config-progress-list .progress-item').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        window.dashboard?.switchSection(section);
      });
    });
  }

  /**
   * Setup health refresh button
   */
  setupHealthRefresh() {
    const refreshBtn = document.getElementById('refreshHealthBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.checkSystemHealth();
      });
    }
  }


  /**
   * Load bot status and statistics
   */
  async loadBotStatus() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      
      // Update bot status
      const statusEl = document.getElementById('botStatus');
      const statusIcon = document.getElementById('botStatusIcon');
      const uptimeEl = document.getElementById('botUptime');
      
      if (data.bot?.status === 'ready') {
        statusEl.textContent = 'Online';
        statusEl.className = 'stat-value text-success';
        statusIcon.className = 'fas fa-circle stat-icon text-success';
        
        // Format uptime
        const uptime = data.uptime || 0;
        uptimeEl.textContent = this.formatUptime(uptime);
      } else {
        statusEl.textContent = 'Offline';
        statusEl.className = 'stat-value text-danger';
        statusIcon.className = 'fas fa-circle stat-icon text-danger';
        uptimeEl.textContent = '--';
      }
      
      // Update guild count
      const guildCountEl = document.getElementById('guildCount');
      if (guildCountEl && data.bot?.guilds !== undefined) {
        guildCountEl.textContent = data.bot.guilds;
      }
      
    } catch (error) {
      console.error('Error loading bot status:', error);
      const statusEl = document.getElementById('botStatus');
      if (statusEl) {
        statusEl.textContent = 'Unknown';
        statusEl.className = 'stat-value text-warning';
      }
    }
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h uptime`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m uptime`;
    } else {
      return `${minutes}m uptime`;
    }
  }

  /**
   * Load configuration progress
   */
  async loadConfigurationProgress() {
    try {
      const guildId = window.dashboard?.guildId;
      if (!guildId) return;
      
      const response = await fetch(`/api/config/${guildId}/progress`);
      
      if (!response.ok) {
        // If endpoint doesn't exist, calculate from config
        await this.calculateProgressFromConfig();
        return;
      }
      
      const data = await response.json();
      this.updateProgressDisplay(data.data);
      
    } catch (error) {
      console.error('Error loading configuration progress:', error);
      await this.calculateProgressFromConfig();
    }
  }

  /**
   * Calculate progress from current configuration
   */
  async calculateProgressFromConfig() {
    try {
      const guildId = window.dashboard?.guildId;
      if (!guildId) return;
      
      const response = await fetch(`/api/config/${guildId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const config = data.data || {};
      
      // Calculate progress for each section
      const progress = {
        channels: this.calculateSectionProgress(config.channels, ['welcome', 'log', 'levelUp', 'confession', 'ticketCategory']),
        roles: this.calculateSectionProgress(config.roles, ['admin', 'moderator', 'muted']),
        features: this.calculateFeaturesProgress(config.features),
        appearance: this.calculateSectionProgress(config.appearance, ['embedColor', 'successColor', 'errorColor'])
      };
      
      this.updateProgressDisplay(progress);
      
    } catch (error) {
      console.error('Error calculating progress:', error);
    }
  }

  /**
   * Calculate progress for a configuration section
   */
  calculateSectionProgress(section, fields) {
    if (!section) return { percentage: 0, configured: 0, total: fields.length };
    
    let configured = 0;
    fields.forEach(field => {
      if (section[field]) configured++;
    });
    
    return {
      percentage: Math.round((configured / fields.length) * 100),
      configured,
      total: fields.length
    };
  }

  /**
   * Calculate features progress
   */
  calculateFeaturesProgress(features) {
    if (!features) return { percentage: 0, enabled: 0, total: 8 };
    
    const featureKeys = ['leveling', 'economy', 'welcome', 'tickets', 'giveaways', 'autoResponder', 'wordChain', 'afk'];
    let enabled = 0;
    
    featureKeys.forEach(key => {
      if (features[key]?.enabled) enabled++;
    });
    
    return {
      percentage: Math.round((enabled / featureKeys.length) * 100),
      enabled,
      total: featureKeys.length
    };
  }

  /**
   * Update progress display in the UI
   */
  updateProgressDisplay(progress) {
    // Update overall progress
    const overallPercentage = Math.round(
      (progress.channels.percentage + progress.roles.percentage + 
       progress.features.percentage + progress.appearance.percentage) / 4
    );
    
    document.getElementById('overallProgress').textContent = `${overallPercentage}%`;
    document.getElementById('overallProgressText').textContent = `${overallPercentage}%`;
    document.getElementById('overallProgressBar').style.width = `${overallPercentage}%`;
    
    // Update channels progress
    this.updateSectionProgress('channels', progress.channels, 
      `${progress.channels.configured} of ${progress.channels.total} channels configured`);
    
    // Update roles progress
    this.updateSectionProgress('roles', progress.roles,
      `${progress.roles.configured} of ${progress.roles.total} roles configured`);
    
    // Update features progress
    this.updateSectionProgress('features', progress.features,
      `${progress.features.enabled} of ${progress.features.total} features enabled`);
    
    // Update appearance progress
    this.updateSectionProgress('appearance', progress.appearance,
      progress.appearance.percentage > 0 ? 'Custom appearance' : 'Default appearance');
    
    // Update feature count stat
    const featureCountEl = document.getElementById('featureCount');
    const totalFeaturesEl = document.getElementById('totalFeatures');
    if (featureCountEl) featureCountEl.textContent = progress.features.enabled;
    if (totalFeaturesEl) totalFeaturesEl.textContent = `of ${progress.features.total} total`;
    
    // Update setup checklist
    this.updateSetupChecklist(progress);
  }

  /**
   * Update a single section's progress display
   */
  updateSectionProgress(section, data, details) {
    const progressText = document.getElementById(`${section}-progress-text`);
    const progressBar = document.getElementById(`${section}-progress-bar`);
    const progressDetails = document.getElementById(`${section}-progress-details`);
    const statusBadge = document.getElementById(`${section}-status-badge`);
    
    if (progressText) progressText.textContent = `${data.percentage}%`;
    if (progressBar) {
      progressBar.style.width = `${data.percentage}%`;
      progressBar.className = `progress-bar ${data.percentage >= 80 ? 'bg-success' : data.percentage >= 40 ? 'bg-warning' : ''}`;
    }
    if (progressDetails) progressDetails.textContent = details;
    if (statusBadge) {
      if (data.percentage >= 80) {
        statusBadge.textContent = 'Complete';
        statusBadge.className = 'config-status-badge complete';
      } else if (data.percentage > 0) {
        statusBadge.textContent = 'Partial';
        statusBadge.className = 'config-status-badge partial';
      } else {
        statusBadge.textContent = 'Not Started';
        statusBadge.className = 'config-status-badge not-started';
      }
    }
  }

  /**
   * Update setup checklist based on progress
   */
  updateSetupChecklist(progress) {
    const sections = ['channels', 'roles', 'features', 'appearance'];
    
    sections.forEach(section => {
      const checkIcon = document.getElementById(`setup-${section}-check`);
      if (checkIcon) {
        const isComplete = progress[section].percentage >= 50;
        checkIcon.classList.toggle('completed', isComplete);
      }
    });
  }

  /**
   * Load recent activity
   */
  async loadRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    // Try to load from localStorage
    const stored = localStorage.getItem('dashboardActivity');
    if (stored) {
      try {
        this.recentActivity = JSON.parse(stored);
      } catch (e) {
        this.recentActivity = [];
      }
    }
    
    this.renderActivityList();
  }

  /**
   * Add activity to recent activity list
   */
  addActivity(type, message) {
    const activity = {
      type,
      message,
      timestamp: Date.now()
    };
    
    this.recentActivity.unshift(activity);
    this.recentActivity = this.recentActivity.slice(0, 10); // Keep last 10
    
    // Save to localStorage
    localStorage.setItem('dashboardActivity', JSON.stringify(this.recentActivity));
    
    this.renderActivityList();
  }

  /**
   * Render activity list
   */
  renderActivityList() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    if (this.recentActivity.length === 0) {
      activityList.innerHTML = `
        <div class="text-muted text-center py-3">
          <i class="fas fa-clock mb-2"></i>
          <div class="small">No recent activity</div>
        </div>
      `;
      return;
    }
    
    activityList.innerHTML = this.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon activity-${activity.type}">
          <i class="fas ${this.getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-text">${activity.message}</div>
          <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get icon for activity type
   */
  getActivityIcon(type) {
    const icons = {
      save: 'fa-save',
      change: 'fa-edit',
      import: 'fa-upload',
      export: 'fa-download',
      template: 'fa-magic'
    };
    return icons[type] || 'fa-circle';
  }

  /**
   * Format timestamp as time ago
   */
  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const healthItems = ['bot', 'discord', 'database', 'websocket'];
    
    // Set all to checking state
    healthItems.forEach(item => {
      const indicator = document.getElementById(`health-${item}`);
      const status = document.getElementById(`health-${item}-status`);
      if (indicator) {
        indicator.className = 'health-indicator health-checking';
      }
      if (status) {
        status.textContent = 'Checking...';
      }
    });
    
    try {
      // Check main health endpoint
      const healthResponse = await fetch('/health');
      const healthData = await healthResponse.json();
      
      // Bot status
      this.updateHealthItem('bot', 
        healthData.bot?.status === 'ready' ? 'good' : 'error',
        healthData.bot?.status === 'ready' ? 'Connected' : 'Disconnected'
      );
      
      // Database (inferred from health response)
      this.updateHealthItem('database',
        healthData.status === 'ok' ? 'good' : 'error',
        healthData.status === 'ok' ? 'Connected' : 'Error'
      );
      
      // WebSocket
      const wsConnected = window.websocketClient?.isConnected();
      this.updateHealthItem('websocket',
        wsConnected ? 'good' : 'warning',
        wsConnected ? 'Connected' : 'Disconnected'
      );
      
      // Discord API
      try {
        const discordResponse = await fetch('/api/health/discord');
        const discordData = await discordResponse.json();
        
        this.updateHealthItem('discord',
          discordData.data?.isConnected ? 'good' : 'error',
          discordData.data?.isConnected ? `Connected (${discordData.data?.ping}ms)` : 'Disconnected'
        );
      } catch {
        this.updateHealthItem('discord', 'warning', 'Unknown');
      }
      
    } catch (error) {
      console.error('Error checking system health:', error);
      healthItems.forEach(item => {
        this.updateHealthItem(item, 'error', 'Error');
      });
    }
  }

  /**
   * Update a health indicator
   */
  updateHealthItem(item, status, text) {
    const indicator = document.getElementById(`health-${item}`);
    const statusEl = document.getElementById(`health-${item}-status`);
    
    if (indicator) {
      indicator.className = `health-indicator health-${status}`;
    }
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Export for use in dashboard
window.OverviewDashboard = OverviewDashboard;
