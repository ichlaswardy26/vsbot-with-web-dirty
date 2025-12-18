/**
 * Dashboard Main Script
 * Handles section navigation, initialization, and global dashboard functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

class Dashboard {
  constructor() {
    this.guildId = this.getGuildIdFromUrl() || this.getDefaultGuildId();
    this.configManager = new ConfigManager(this.guildId);
    this.channelsConfig = null;
    this.rolesConfig = null;
    this.featuresConfig = null;
    this.appearanceConfig = null;
    this.overviewDashboard = null;
    this.currentSection = 'overview';
    this.initialized = false;
    this.isMobile = window.innerWidth <= 767.98;
    
    this.init();
  }

  /**
   * Initialize the dashboard
   * Requirements: 8.1, 8.5, 9.2, 9.4, 9.5
   */
  async init() {
    try {
      // Track initialization start time for performance monitoring
      const initStart = performance.now();
      
      // Mark performance timing
      if (window.performanceUtils) {
        window.performanceUtils.mark('dashboard-init-start');
      }
      
      // Fetch guild ID if not set
      if (!this.guildId) {
        await this.fetchAndSetGuildId();
      }
      
      // If still no guild ID, show error
      if (!this.guildId) {
        console.error('No guild ID available');
        this.showNoGuildError();
        return;
      }
      
      // Setup navigation
      this.setupNavigation();
      
      // Setup global event listeners
      this.setupGlobalListeners();
      
      // Setup mobile-specific features
      this.setupMobileFeatures();
      
      // Initialize WebSocket for real-time updates
      this.setupWebSocket();
      
      // Initialize config manager connectivity monitoring
      this.configManager.startConnectivityMonitoring();
      
      // Setup lazy loading for images
      this.setupLazyLoading();
      
      // Load initial section from URL hash or default to overview
      const hash = window.location.hash.slice(1);
      if (hash && this.isValidSection(hash)) {
        await this.switchSection(hash);
      } else {
        await this.switchSection('overview');
      }
      
      this.initialized = true;
      
      // Mark performance timing
      if (window.performanceUtils) {
        window.performanceUtils.mark('dashboard-init-end');
        window.performanceUtils.measure('dashboard-init', 'dashboard-init-start', 'dashboard-init-end');
      }
      
      // Log initialization time for performance monitoring
      const initTime = performance.now() - initStart;
      console.log(`Dashboard initialized in ${initTime.toFixed(2)}ms`);
      
      // Warn if initialization exceeds 3 seconds on mobile (Requirement 8.5)
      if (this.isMobile && initTime > 3000) {
        console.warn('Mobile initialization exceeded 3 second target');
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      this.configManager.showNotification('Failed to initialize dashboard', 'error');
    }
  }
  
  /**
   * Show error when no guild is available
   */
  showNoGuildError() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container mt-5">
          <div class="alert alert-warning">
            <h4><i class="fas fa-exclamation-triangle me-2"></i>No Server Access</h4>
            <p>You don't have administrator permissions on any server where this bot is installed.</p>
            <p>Please make sure:</p>
            <ul>
              <li>The bot is added to your server</li>
              <li>You have Administrator permissions on that server</li>
            </ul>
            <a href="/auth/discord" class="btn btn-primary">Re-authenticate with Discord</a>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Setup lazy loading for images and sections
   * Requirements: 8.5 - Performance optimization
   */
  setupLazyLoading() {
    if (!window.performanceUtils) return;
    
    // Observe all lazy images
    document.querySelectorAll('img[data-lazy-src]').forEach(img => {
      window.performanceUtils.observeLazyElement(img);
    });
    
    // Observe lazy sections
    document.querySelectorAll('[data-lazy-section]').forEach(section => {
      window.performanceUtils.observeLazyElement(section);
    });
  }

  /**
   * Setup WebSocket for real-time updates
   * Requirements: 9.2, 9.4, 9.5
   */
  setupWebSocket() {
    if (!window.websocketClient) {
      console.warn('WebSocket client not available');
      return;
    }

    const ws = window.websocketClient;

    // Join guild room when connected
    ws.on('connected', () => {
      if (this.guildId) {
        ws.joinGuild(this.guildId);
      }
    });

    // Handle configuration updates from other users
    ws.on('config:updated', (data) => {
      this.handleRemoteConfigUpdate(data);
    });

    // Handle reload section requests
    ws.on('reload:section', async (data) => {
      await this.reloadSection(data.section);
    });

    // Handle bot status updates
    ws.on('bot:status', (data) => {
      this.updateBotStatusDisplay(data);
    });

    // If already connected, join guild
    if (ws.isConnected() && this.guildId) {
      ws.joinGuild(this.guildId);
    }
  }

  /**
   * Handle remote configuration update from another user
   * Requirements: 9.2, 9.4
   */
  handleRemoteConfigUpdate(data) {
    console.log('Remote config update received:', data);
    
    // If the update is for the current section, offer to reload
    if (data.section === this.currentSection || data.section === 'full') {
      // The WebSocket client will show a notification with reload option
      // We just need to handle the actual reload when requested
    }
  }

  /**
   * Reload a specific section
   */
  async reloadSection(section) {
    // Reset the section config to force reload
    switch (section) {
      case 'channels':
        this.channelsConfig = null;
        break;
      case 'roles':
        this.rolesConfig = null;
        break;
      case 'features':
        this.featuresConfig = null;
        break;
      case 'appearance':
        this.appearanceConfig = null;
        break;
    }
    
    // Reinitialize if it's the current section
    if (section === this.currentSection) {
      await this.initializeSection(section);
    }
  }

  /**
   * Update bot status display in overview
   * Requirements: 9.5
   */
  updateBotStatusDisplay(data) {
    const statusEl = document.getElementById('botStatus');
    if (statusEl) {
      statusEl.textContent = data.isOnline ? 'Online' : 'Offline';
      statusEl.className = data.isOnline ? 'stat-value text-success' : 'stat-value text-danger';
    }
    
    const guildCountEl = document.getElementById('guildCount');
    if (guildCountEl && data.guilds !== undefined) {
      guildCountEl.textContent = data.guilds;
    }
  }

  /**
   * Setup mobile-specific features
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  setupMobileFeatures() {
    // Listen for resize events to update mobile state
    window.addEventListener('resize', this.debounce(() => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 767.98;
      
      if (wasMobile !== this.isMobile) {
        this.onMobileStateChange();
      }
    }, 150));
    
    // Setup mobile save button
    this.setupMobileSaveButton();
    
    // Setup touch-friendly interactions
    if (this.isMobile || 'ontouchstart' in window) {
      this.setupTouchInteractions();
    }
    
    // Listen for breakpoint changes from MobileResponsive
    window.addEventListener('breakpointChange', (e) => {
      this.isMobile = e.detail.isMobile;
      this.updateMobileWizard();
    });
  }

  /**
   * Handle mobile state changes
   * Requirements: 8.1
   */
  onMobileStateChange() {
    if (this.isMobile) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }

  /**
   * Setup mobile save button (FAB)
   * Requirements: 8.4
   */
  setupMobileSaveButton() {
    const mobileSaveBtn = document.getElementById('mobile-save-btn');
    if (mobileSaveBtn) {
      mobileSaveBtn.addEventListener('click', () => this.saveCurrentSection());
    }
  }

  /**
   * Setup touch-friendly interactions
   * Requirements: 8.1, 8.3
   */
  setupTouchInteractions() {
    // Add touch feedback to interactive elements
    document.querySelectorAll('.btn, .nav-link, .card-header').forEach(el => {
      el.addEventListener('touchstart', () => {
        el.classList.add('touch-active');
      }, { passive: true });
      
      el.addEventListener('touchend', () => {
        setTimeout(() => el.classList.remove('touch-active'), 100);
      }, { passive: true });
    });
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get guild ID from URL parameters
   */
  getGuildIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guild');
  }

  /**
   * Get default guild ID (first available guild)
   * Will be set asynchronously from user's guilds
   */
  getDefaultGuildId() {
    // Return null initially, will be fetched from API
    return window.GUILD_ID || null;
  }
  
  /**
   * Fetch user's admin guilds and set the appropriate one
   * Prioritizes guilds where the bot is installed
   */
  async fetchAndSetGuildId() {
    if (this.guildId) return this.guildId;
    
    try {
      // Get user's admin guilds
      const response = await fetch('/auth/guilds');
      const data = await response.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        console.warn('No admin guilds found for user');
        this.configManager.showNotification('No servers found where you have admin permissions', 'warning');
        return null;
      }
      
      const adminGuilds = data.data;
      
      // Try to get guilds where bot is installed
      try {
        const botGuildsResponse = await fetch('/auth/bot-guilds');
        const botGuildsData = await botGuildsResponse.json();
        
        if (botGuildsData.success && botGuildsData.data && botGuildsData.data.length > 0) {
          const botGuildIds = botGuildsData.data.map(g => g.id);
          
          // Find guilds where user has admin AND bot is installed
          const matchingGuilds = adminGuilds.filter(g => botGuildIds.includes(g.id));
          
          if (matchingGuilds.length > 0) {
            // Use the first matching guild
            this.guildId = matchingGuilds[0].id;
            this.availableGuilds = matchingGuilds;
            console.log('Guild ID set to (bot installed):', this.guildId, matchingGuilds[0].name);
          } else {
            // No matching guilds - show warning
            console.warn('Bot is not installed in any of your admin guilds');
            this.configManager.showNotification('Bot is not installed in any server where you have admin permissions', 'warning');
            // Still set first admin guild for display purposes
            this.guildId = adminGuilds[0].id;
            this.availableGuilds = adminGuilds;
          }
        } else {
          // Fallback to first admin guild
          this.guildId = adminGuilds[0].id;
          this.availableGuilds = adminGuilds;
        }
      } catch (botGuildsError) {
        console.warn('Could not fetch bot guilds:', botGuildsError);
        // Fallback to first admin guild
        this.guildId = adminGuilds[0].id;
        this.availableGuilds = adminGuilds;
      }
      
      this.configManager.guildId = this.guildId;
      window.GUILD_ID = this.guildId;
      console.log('Guild ID set to:', this.guildId);
      
      // Update guild selector if exists
      this.updateGuildSelector();
      
      return this.guildId;
    } catch (error) {
      console.error('Error fetching guilds:', error);
      return null;
    }
  }
  
  /**
   * Update guild selector dropdown
   */
  updateGuildSelector() {
    const selector = document.getElementById('guild-selector');
    if (!selector || !this.availableGuilds) return;
    
    selector.innerHTML = this.availableGuilds.map(guild => `
      <option value="${guild.id}" ${guild.id === this.guildId ? 'selected' : ''}>
        ${guild.name}
      </option>
    `).join('');
    
    // Remove existing listener to prevent duplicates
    const newSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(newSelector, selector);
    
    newSelector.addEventListener('change', async (e) => {
      const newGuildId = e.target.value;
      if (newGuildId !== this.guildId) {
        const oldGuildId = this.guildId;
        this.guildId = newGuildId;
        this.configManager.guildId = newGuildId;
        this.configManager.cache.clear(); // Clear cache for new guild
        window.GUILD_ID = newGuildId;
        
        // Update WebSocket connection to new guild
        if (window.wsClient && window.wsClient.isConnected()) {
          window.wsClient.leaveGuild(); // Leaves current guild
          window.wsClient.joinGuild(newGuildId);
        }
        
        // Reload current section
        this.channelsConfig = null;
        this.rolesConfig = null;
        this.featuresConfig = null;
        this.appearanceConfig = null;
        
        await this.initializeSection(this.currentSection);
        this.configManager.showNotification('Switched to ' + this.availableGuilds.find(g => g.id === newGuildId)?.name, 'info');
      }
    });
  }

  /**
   * Check if section name is valid
   */
  isValidSection(section) {
    const validSections = ['overview', 'channels', 'roles', 'features', 'appearance', 'language'];
    return validSections.includes(section);
  }

  /**
   * Setup navigation event listeners
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        
        if (section) {
          await this.switchSection(section);
          
          // Update URL hash
          window.location.hash = section;
        }
      });
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', async () => {
      const hash = window.location.hash.slice(1);
      if (hash && this.isValidSection(hash)) {
        await this.switchSection(hash);
      }
    });
  }

  /**
   * Setup global event listeners
   */
  setupGlobalListeners() {
    // Save config button
    const saveBtn = document.getElementById('saveConfig');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCurrentSection());
    }

    // Reload config button
    const reloadBtn = document.getElementById('reloadConfig');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => this.reloadCurrentSection());
    }

    // Export config
    const exportBtn = document.getElementById('exportConfig');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportConfig());
    }

    // Import config
    const importBtn = document.getElementById('importConfig');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportModal());
    }

    // Preview import
    const previewImportBtn = document.getElementById('previewImport');
    if (previewImportBtn) {
      previewImportBtn.addEventListener('click', () => this.previewImport());
    }

    // Back to file select
    const backToFileSelectBtn = document.getElementById('backToFileSelect');
    if (backToFileSelectBtn) {
      backToFileSelectBtn.addEventListener('click', () => this.showImportStep1());
    }

    // Confirm import
    const confirmImportBtn = document.getElementById('confirmImport');
    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', () => this.importConfig());
    }

    // Reset config
    const resetBtn = document.getElementById('resetConfig');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfig());
    }

    // Backup config
    const backupBtn = document.getElementById('confirmBackup');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => this.createBackup());
    }

    // Reset import modal when closed
    const importModal = document.getElementById('importModal');
    if (importModal) {
      importModal.addEventListener('hidden.bs.modal', () => this.resetImportModal());
    }
  }

  /**
   * Store pending import data for confirmation
   */
  pendingImportData = null;

  /**
   * Switch to a different section
   * Requirements: 2.1, 8.2, 8.4, 9.4
   */
  async switchSection(section) {
    // Show loading state on mobile
    if (this.isMobile) {
      this.showMobileLoadingState(section);
    }
    
    // Notify WebSocket about stopping editing previous section
    if (window.websocketClient && this.currentSection && this.currentSection !== 'overview') {
      window.websocketClient.stopEditing();
    }
    
    // Update navigation active state
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      const isActive = link.dataset.section === section;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Hide all sections
    document.querySelectorAll('.config-section').forEach(sec => {
      sec.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
      
      // Scroll to top on mobile when switching sections
      if (this.isMobile) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Update section title
    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) {
      sectionTitle.textContent = this.getSectionTitle(section);
    }

    // Initialize section-specific functionality
    await this.initializeSection(section);

    this.currentSection = section;
    
    // Notify WebSocket about starting to edit new section
    if (window.websocketClient && section !== 'overview') {
      window.websocketClient.startEditing(section);
    }
    
    // Update mobile wizard progress
    this.updateMobileWizard();
    
    // Hide loading state
    if (this.isMobile) {
      this.hideMobileLoadingState();
    }
  }

  /**
   * Show loading state with skeleton screens
   * Requirements: 8.5 - Performance optimization
   */
  showMobileLoadingState(section) {
    const targetSection = document.getElementById(`${section}-section`);
    if (!targetSection) return;
    
    const container = targetSection.querySelector('[id$="-config-container"]');
    if (container) {
      // Use performanceUtils for skeleton if available
      if (window.performanceUtils) {
        const skeletonType = this.getSkeletonTypeForSection(section);
        window.performanceUtils.showLoadingSkeleton(container, skeletonType, 3);
      } else if (window.mobileResponsive) {
        window.mobileResponsive.showLoadingSkeleton(container);
      }
    }
  }

  /**
   * Get appropriate skeleton type for section
   */
  getSkeletonTypeForSection(section) {
    const skeletonTypes = {
      overview: 'stat',
      channels: 'form',
      roles: 'form',
      features: 'card',
      appearance: 'form'
    };
    return skeletonTypes[section] || 'card';
  }

  /**
   * Hide loading state
   * Requirements: 8.5
   */
  hideMobileLoadingState() {
    // Remove skeleton wrappers
    document.querySelectorAll('.skeleton-wrapper, .mobile-loading-skeleton').forEach(skeleton => {
      skeleton.remove();
    });
    
    // Remove loading-skeleton class from containers
    document.querySelectorAll('.loading-skeleton').forEach(container => {
      if (window.performanceUtils) {
        window.performanceUtils.hideLoadingSkeleton(container);
      } else {
        container.classList.remove('loading-skeleton');
      }
    });
  }

  /**
   * Update mobile wizard progress indicator
   * Requirements: 8.4
   */
  updateMobileWizard() {
    if (window.mobileResponsive) {
      window.mobileResponsive.updateWizardProgress();
    }
  }

  /**
   * Get display title for section
   */
  getSectionTitle(section) {
    const titles = {
      overview: 'Dashboard Overview',
      channels: 'Channel Configuration',
      roles: 'Role Configuration',
      features: 'Feature Settings',
      appearance: 'Appearance Configuration',
      language: 'Language Settings'
    };
    return titles[section] || 'Bot Configuration';
  }

  /**
   * Initialize section-specific functionality
   * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async initializeSection(section) {
    switch (section) {
      case 'overview':
        await this.initializeOverviewSection();
        break;
      case 'channels':
        await this.initializeChannelsSection();
        break;
      case 'roles':
        await this.initializeRolesSection();
        break;
      case 'features':
        await this.initializeFeaturesSection();
        break;
      case 'appearance':
        await this.initializeAppearanceSection();
        break;
      case 'language':
        await this.initializeLanguageSection();
        break;
      default:
        // No special initialization needed
        break;
    }
  }

  /**
   * Initialize overview section with dashboard statistics and quick actions
   * Requirements: Overall user experience (Task 18)
   */
  async initializeOverviewSection() {
    // Only initialize once
    if (this.overviewDashboard) {
      // Refresh data on revisit
      this.overviewDashboard.loadBotStatus();
      this.overviewDashboard.loadConfigurationProgress();
      return;
    }

    try {
      if (window.OverviewDashboard) {
        this.overviewDashboard = new OverviewDashboard(this.configManager);
      }
    } catch (error) {
      console.error('Error initializing overview section:', error);
    }
  }

  /**
   * Initialize channels configuration section
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async initializeChannelsSection() {
    // Only initialize once
    if (this.channelsConfig) {
      return;
    }

    try {
      this.channelsConfig = new ChannelsConfig(this.configManager);
      await this.channelsConfig.initialize();
      
      // Update API status banner
      this.updateChannelsApiStatus(this.channelsConfig.apiConnected);
    } catch (error) {
      console.error('Error initializing channels section:', error);
      this.configManager.showNotification('Failed to load channels configuration', 'error');
      this.updateChannelsApiStatus(false);
    }
  }

  /**
   * Update channels API status banner
   */
  updateChannelsApiStatus(connected) {
    const statusBanner = document.getElementById('channels-api-status');
    if (statusBanner) {
      statusBanner.className = `api-status-banner ${connected ? 'connected' : 'disconnected'}`;
      const statusText = statusBanner.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = connected ? 'Discord API Connected' : 'Discord API Disconnected';
      }
    }
  }

  /**
   * Initialize roles configuration section
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async initializeRolesSection() {
    // Only initialize once
    if (this.rolesConfig) {
      return;
    }

    try {
      this.rolesConfig = new RolesConfig(this.configManager);
      await this.rolesConfig.initialize();
      
      // Update API status banner
      this.updateRolesApiStatus(this.rolesConfig.apiConnected);
    } catch (error) {
      console.error('Error initializing roles section:', error);
      this.configManager.showNotification('Failed to load roles configuration', 'error');
      this.updateRolesApiStatus(false);
    }
  }

  /**
   * Update roles API status banner
   */
  updateRolesApiStatus(connected) {
    const statusBanner = document.getElementById('roles-api-status');
    if (statusBanner) {
      statusBanner.className = `api-status-banner ${connected ? 'connected' : 'disconnected'}`;
      const statusText = statusBanner.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = connected ? 'Discord API Connected' : 'Discord API Disconnected';
      }
    }
  }

  /**
   * Initialize features configuration section
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async initializeFeaturesSection() {
    // Only initialize once
    if (this.featuresConfig) {
      return;
    }

    try {
      this.featuresConfig = new FeaturesConfig(this.configManager);
      await this.featuresConfig.initialize();
      
      // Update API status banner
      this.updateFeaturesApiStatus(this.featuresConfig.apiConnected);
    } catch (error) {
      console.error('Error initializing features section:', error);
      this.configManager.showNotification('Failed to load features configuration', 'error');
      this.updateFeaturesApiStatus(false);
    }
  }

  /**
   * Update features API status banner
   */
  updateFeaturesApiStatus(connected) {
    const statusBanner = document.getElementById('features-api-status');
    if (statusBanner) {
      statusBanner.className = `api-status-banner ${connected ? 'connected' : 'disconnected'}`;
      const statusText = statusBanner.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = connected ? 'Features Loaded' : 'Failed to Load Features';
      }
    }
  }

  /**
   * Initialize appearance configuration section
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async initializeAppearanceSection() {
    // Only initialize once
    if (this.appearanceConfig) {
      return;
    }

    try {
      this.appearanceConfig = new AppearanceConfig(this.configManager);
      await this.appearanceConfig.initialize();
      
      // Update API status banner
      this.updateAppearanceApiStatus(this.appearanceConfig.apiConnected);
    } catch (error) {
      console.error('Error initializing appearance section:', error);
      this.configManager.showNotification('Failed to load appearance configuration', 'error');
      this.updateAppearanceApiStatus(false);
    }
  }

  /**
   * Update appearance API status banner
   */
  updateAppearanceApiStatus(connected) {
    const statusBanner = document.getElementById('appearance-api-status');
    if (statusBanner) {
      statusBanner.className = `api-status-banner ${connected ? 'connected' : 'disconnected'}`;
      const statusText = statusBanner.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = connected ? 'Appearance Settings Loaded' : 'Failed to Load Appearance';
      }
    }
  }

  /**
   * Initialize language configuration section
   */
  async initializeLanguageSection() {
    const form = document.getElementById('language-config-form');
    if (!form) return;
    
    try {
      // Load current language config
      const config = await this.configManager.getConfigSection('language');
      
      // Set default language
      const defaultLang = document.getElementById('default-language');
      if (defaultLang && config.default) {
        defaultLang.value = config.default;
      }
      
      // Set available languages
      if (config.available && Array.isArray(config.available)) {
        config.available.forEach(lang => {
          const checkbox = document.getElementById(`lang-${lang}`);
          if (checkbox) checkbox.checked = true;
        });
      }
      
      // Setup form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveLanguageConfig();
      });
    } catch (error) {
      console.error('Error initializing language section:', error);
    }
  }
  
  /**
   * Save language configuration
   */
  async saveLanguageConfig() {
    try {
      const defaultLang = document.getElementById('default-language')?.value || 'en';
      const available = ['en']; // English always available
      
      if (document.getElementById('lang-id')?.checked) {
        available.push('id');
      }
      
      await this.configManager.updateConfigSection('language', {
        default: defaultLang,
        available: available
      });
      
      this.configManager.showNotification('Language settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving language config:', error);
      this.configManager.showNotification('Failed to save language settings', 'error');
    }
  }

  /**
   * Save current section configuration
   */
  async saveCurrentSection() {
    let saved = false;
    
    switch (this.currentSection) {
      case 'channels':
        if (this.channelsConfig) {
          await this.channelsConfig.saveConfiguration();
          saved = true;
        }
        break;
      case 'roles':
        if (this.rolesConfig) {
          await this.rolesConfig.saveConfiguration();
          saved = true;
        }
        break;
      case 'features':
        if (this.featuresConfig) {
          await this.featuresConfig.saveConfiguration();
          saved = true;
        }
        break;
      case 'appearance':
        if (this.appearanceConfig) {
          await this.appearanceConfig.saveConfiguration();
          saved = true;
        }
        break;
      default:
        this.configManager.showNotification('No changes to save', 'info');
    }
    
    // Track activity
    if (saved && this.overviewDashboard) {
      this.overviewDashboard.addActivity('save', `Saved ${this.currentSection} configuration`);
      this.overviewDashboard.loadConfigurationProgress();
    }
  }

  /**
   * Reload current section configuration
   */
  async reloadCurrentSection() {
    switch (this.currentSection) {
      case 'channels':
        if (this.channelsConfig) {
          await this.channelsConfig.refreshChannels();
        }
        break;
      case 'roles':
        if (this.rolesConfig) {
          await this.rolesConfig.refreshRoles();
        }
        break;
      case 'features':
        if (this.featuresConfig) {
          await this.featuresConfig.refreshFeatures();
        }
        break;
      case 'appearance':
        if (this.appearanceConfig) {
          await this.appearanceConfig.refreshAppearance();
        }
        break;
      default:
        this.configManager.showNotification('Section reloaded', 'info');
    }
  }

  /**
   * Export configuration
   * Requirements: 6.1
   */
  async exportConfig() {
    try {
      await this.configManager.exportConfig();
    } catch (error) {
      console.error('Error exporting config:', error);
    }
  }

  /**
   * Show import modal
   * Requirements: 6.2
   */
  showImportModal() {
    this.resetImportModal();
    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    modal.show();
  }

  /**
   * Reset import modal to initial state
   */
  resetImportModal() {
    this.pendingImportData = null;
    this.showImportStep1();
    
    const fileInput = document.getElementById('configFile');
    if (fileInput) fileInput.value = '';
    
    // Hide confirm button
    const confirmBtn = document.getElementById('confirmImport');
    if (confirmBtn) confirmBtn.style.display = 'none';
  }

  /**
   * Show import step 1 (file selection)
   */
  showImportStep1() {
    const step1 = document.getElementById('import-step-1');
    const step2 = document.getElementById('import-step-2');
    const confirmBtn = document.getElementById('confirmImport');
    
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
  }

  /**
   * Show import step 2 (preview)
   */
  showImportStep2() {
    const step1 = document.getElementById('import-step-1');
    const step2 = document.getElementById('import-step-2');
    
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
  }

  /**
   * Preview import configuration
   * Requirements: 6.2, 6.3
   */
  async previewImport() {
    const fileInput = document.getElementById('configFile');
    const file = fileInput.files[0];
    
    if (!file) {
      this.configManager.showNotification('Please select a file to import', 'warning');
      return;
    }

    try {
      const text = await file.text();
      const configData = JSON.parse(text);
      
      // Store for later import
      this.pendingImportData = configData;
      
      // Get preview from server
      const preview = await this.configManager.previewImport(configData);
      
      // Show step 2
      this.showImportStep2();
      
      // Display preview results
      this.displayImportPreview(preview);
      
    } catch (error) {
      console.error('Error previewing import:', error);
      if (error instanceof SyntaxError) {
        this.configManager.showNotification('Invalid JSON file format', 'error');
      } else {
        this.configManager.showNotification('Failed to preview import: ' + error.message, 'error');
      }
    }
  }

  /**
   * Display import preview results
   * Requirements: 6.3
   */
  displayImportPreview(preview) {
    const errorsDiv = document.getElementById('import-errors');
    const errorsList = document.getElementById('import-errors-list');
    const warningsDiv = document.getElementById('import-warnings');
    const warningsList = document.getElementById('import-warnings-list');
    const changesDiv = document.getElementById('import-changes');
    const changesList = document.getElementById('import-changes-list');
    const noChangesDiv = document.getElementById('import-no-changes');
    const confirmBtn = document.getElementById('confirmImport');
    const sectionsCount = document.getElementById('sections-affected-count');
    
    // Reset all
    errorsDiv.style.display = 'none';
    warningsDiv.style.display = 'none';
    changesDiv.style.display = 'none';
    noChangesDiv.style.display = 'none';
    confirmBtn.style.display = 'none';
    
    // Show errors if any
    if (preview.errors && preview.errors.length > 0) {
      errorsList.innerHTML = preview.errors.map(e => `<li>${e}</li>`).join('');
      errorsDiv.style.display = 'block';
    }
    
    // Show warnings if any
    if (preview.warnings && preview.warnings.length > 0) {
      warningsList.innerHTML = preview.warnings.map(w => `<li>${w}</li>`).join('');
      warningsDiv.style.display = 'block';
    }
    
    // Show changes or no changes message
    if (preview.isValid) {
      if (preview.changes && preview.changes.length > 0) {
        sectionsCount.textContent = preview.sectionsAffected ? preview.sectionsAffected.length : 0;
        changesList.innerHTML = this.formatChanges(preview.changes);
        changesDiv.style.display = 'block';
        confirmBtn.style.display = 'block';
      } else {
        noChangesDiv.style.display = 'block';
      }
    }
  }

  /**
   * Format changes for display
   */
  formatChanges(changes) {
    const grouped = {};
    
    // Group changes by section
    changes.forEach(change => {
      if (!grouped[change.section]) {
        grouped[change.section] = [];
      }
      grouped[change.section].push(change);
    });
    
    // Generate HTML
    let html = '';
    for (const [section, sectionChanges] of Object.entries(grouped)) {
      html += `<div class="change-section mb-3">`;
      html += `<h6 class="text-capitalize"><i class="fas fa-folder me-2"></i>${section}</h6>`;
      html += `<ul class="list-unstyled ms-3">`;
      
      sectionChanges.forEach(change => {
        const icon = change.type === 'add' ? 'plus text-success' : 
                     change.type === 'remove' ? 'minus text-danger' : 
                     'edit text-warning';
        const oldVal = change.oldValue !== null && change.oldValue !== undefined ? 
                       `<span class="text-muted">${this.truncateValue(change.oldValue)}</span> → ` : '';
        const newVal = change.newValue !== null && change.newValue !== undefined ? 
                       this.truncateValue(change.newValue) : '<em>null</em>';
        
        html += `<li class="change-item">`;
        html += `<i class="fas fa-${icon} me-2"></i>`;
        html += `<code>${change.path.split('.').slice(1).join('.')}</code>: `;
        html += `${oldVal}${newVal}`;
        html += `</li>`;
      });
      
      html += `</ul></div>`;
    }
    
    return html;
  }

  /**
   * Truncate long values for display
   */
  truncateValue(value) {
    const str = String(value);
    return str.length > 30 ? str.substring(0, 27) + '...' : str;
  }

  /**
   * Import configuration from file
   * Requirements: 6.4, 6.5
   */
  async importConfig() {
    if (!this.pendingImportData) {
      this.configManager.showNotification('No configuration data to import', 'warning');
      return;
    }

    try {
      await this.configManager.importConfig(this.pendingImportData);
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
      modal.hide();
      
      // Reset pending data
      this.pendingImportData = null;
      
      // Reset section configs to force reload
      this.channelsConfig = null;
      this.rolesConfig = null;
      this.featuresConfig = null;
      this.appearanceConfig = null;
      
      // Track activity
      if (this.overviewDashboard) {
        this.overviewDashboard.addActivity('import', 'Imported configuration from file');
        this.overviewDashboard.loadConfigurationProgress();
      }
      
      // Reload current section
      await this.initializeSection(this.currentSection);
      
    } catch (error) {
      console.error('Error importing config:', error);
      // Error notification is handled by configManager
    }
  }

  /**
   * Create backup of current configuration
   * Requirements: 6.1
   */
  async createBackup() {
    try {
      await this.configManager.createBackup();
      
      // Close modal if open
      const modal = bootstrap.Modal.getInstance(document.getElementById('backupModal'));
      if (modal) modal.hide();
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig() {
    try {
      await this.configManager.resetConfig();
      
      // Reset section configs to force reload
      this.channelsConfig = null;
      this.rolesConfig = null;
      this.featuresConfig = null;
      this.appearanceConfig = null;
      
      // Reload current section
      await this.initializeSection(this.currentSection);
    } catch (error) {
      console.error('Error resetting config:', error);
    }
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new Dashboard();
});
