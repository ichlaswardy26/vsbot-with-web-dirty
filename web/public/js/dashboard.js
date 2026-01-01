/**
 * Enhanced Dashboard Frontend
 * Real-time configuration management with WebSocket integration
 */

class Dashboard {
  constructor() {
    this.socket = null;
    this.currentGuildId = null;
    this.currentSection = 'overview';
    this.config = null;
    this.csrfToken = null;
    this.charts = {};
    
    this.init();
  }

  async init() {
    try {
      // Get CSRF token
      await this.getCsrfToken();
      
      // Get guild ID from URL or session
      this.currentGuildId = this.getGuildIdFromUrl();
      
      // Initialize WebSocket connection
      this.initWebSocket();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadDashboardData();
      
      console.log('[Dashboard] Initialized successfully');
    } catch (error) {
      console.error('[Dashboard] Initialization failed:', error);
      this.showNotification('Failed to initialize dashboard', 'error');
    }
  }

  /**
   * Get CSRF token for API requests
   */
  async getCsrfToken() {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (error) {
      console.error('[Dashboard] Failed to get CSRF token:', error);
    }
  }

  /**
   * Get guild ID from URL parameters
   */
  getGuildIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const guildId = urlParams.get('guild') || localStorage.getItem('selectedGuild');
    
    // If no guild ID found, try to get from user's guilds
    if (!guildId) {
      console.warn('[Dashboard] No guild ID found in URL or localStorage');
      this.showGuildSelector();
      return null;
    }
    
    return guildId;
  }

  /**
   * Show guild selector if no guild ID is available
   */
  showGuildSelector() {
    // Create a simple guild selector
    const selectorHtml = `
      <div class="guild-selector" style="padding: 20px; text-align: center;">
        <h3>Select a Server</h3>
        <p>Please select a Discord server to configure:</p>
        <div id="guild-list" style="margin: 20px 0;">
          <div class="loading">Loading your servers...</div>
        </div>
      </div>
    `;
    
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.innerHTML = selectorHtml;
    
    // Load user's guilds
    this.loadUserGuilds();
  }

  /**
   * Load user's guilds for selection
   */
  async loadUserGuilds() {
    try {
      const response = await fetch('/api/user/guilds');
      if (response.ok) {
        const data = await response.json();
        this.displayGuildList(data.guilds || []);
      } else {
        throw new Error('Failed to load guilds');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load guilds:', error);
      document.getElementById('guild-list').innerHTML = `
        <div class="error">
          <p>Failed to load your servers. Please try refreshing the page.</p>
          <button onclick="window.location.reload()">Refresh</button>
        </div>
      `;
    }
  }

  /**
   * Display guild list for selection
   */
  displayGuildList(guilds) {
    if (guilds.length === 0) {
      document.getElementById('guild-list').innerHTML = `
        <div class="no-guilds">
          <p>No servers found. Make sure the bot is added to your Discord server.</p>
          <a href="/auth/discord" class="btn">Re-authenticate</a>
        </div>
      `;
      return;
    }

    const guildListHtml = guilds.map(guild => `
      <div class="guild-item" onclick="window.dashboard.selectGuild('${guild.id}')" style="
        display: inline-block; 
        margin: 10px; 
        padding: 15px; 
        border: 1px solid #ddd; 
        border-radius: 8px; 
        cursor: pointer;
        text-align: center;
        min-width: 150px;
      ">
        <img src="${guild.icon || '/assets/default-guild.png'}" alt="${guild.name}" style="width: 48px; height: 48px; border-radius: 50%; margin-bottom: 8px;">
        <div style="font-weight: bold;">${guild.name}</div>
        <div style="font-size: 12px; color: #666;">${guild.memberCount || 0} members</div>
      </div>
    `).join('');

    document.getElementById('guild-list').innerHTML = guildListHtml;
  }

  /**
   * Select a guild and reload dashboard
   */
  selectGuild(guildId) {
    localStorage.setItem('selectedGuild', guildId);
    window.location.href = `/dashboard?guild=${guildId}`;
  }

  /**
   * Initialize WebSocket connection
   */
  initWebSocket() {
    // Add connection status indicator
    this.updateConnectionStatus(false, 'Connecting...');
    
    this.socket = io({
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.updateConnectionStatus(true, 'Connected');
      
      if (this.currentGuildId) {
        this.socket.emit('join:guild', { guildId: this.currentGuildId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.updateConnectionStatus(false, 'Disconnected');
      
      // Show user-friendly message
      if (reason === 'io server disconnect') {
        this.showNotification('Server disconnected. Refreshing page...', 'warning');
        setTimeout(() => window.location.reload(), 3000);
      } else {
        this.showNotification('Connection lost. Attempting to reconnect...', 'warning');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.updateConnectionStatus(false, 'Connection failed');
      this.showNotification('Real-time updates unavailable. Some features may be limited.', 'warning');
    });

    this.socket.on('config:updated', (data) => {
      console.log('[WebSocket] Config updated:', data);
      this.handleConfigUpdate(data);
    });

    this.socket.on('bot:status', (status) => {
      console.log('[WebSocket] Bot status:', status);
      this.updateBotStatus(status);
    });

    this.socket.on('user:joined', (data) => {
      this.showNotification(`${data.username} joined the configuration session`, 'info');
    });

    this.socket.on('user:left', (data) => {
      this.showNotification(`${data.username} left the configuration session`, 'info');
    });

    this.socket.on('config:error', (data) => {
      this.showNotification(`Configuration error: ${data.error}`, 'error');
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });

    // Auto-refresh data every 30 seconds
    setInterval(() => {
      if (this.currentSection === 'overview') {
        this.loadDashboardData();
      }
    }, 30000);
  }

  /**
   * Switch between dashboard sections
   */
  async switchSection(section) {
    if (this.currentSection === section) return;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.add('hidden');
    });

    // Show selected section
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
      sectionElement.classList.remove('hidden');
    }

    this.currentSection = section;

    // Load section-specific data
    await this.loadSectionData(section);
  }

  /**
   * Load dashboard overview data
   */
  async loadDashboardData() {
    if (!this.currentGuildId) {
      console.warn('[Dashboard] No guild ID available, showing guild selector');
      return;
    }

    try {
      this.showLoading(true);

      const response = await this.apiRequest(`/api/config/${this.currentGuildId}/dashboard`, {
        timeout: 10000 // 10 second timeout
      });
      
      if (response.success) {
        this.updateProgressCards(response.data.progress);
        this.updateBotStatus(response.data.botStatus);
        this.updateGuildInfo(response.data.guild);
        this.updateRecentActivity(response.data.recentActivity);
        this.config = response.data;
        
        // Hide any error messages
        this.hideErrorMessage();
      } else {
        throw new Error(response.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load dashboard data:', error);
      this.showErrorMessage('Failed to load dashboard data: ' + error.message);
      this.showNotification('Failed to load dashboard data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load section-specific data
   */
  async loadSectionData(section) {
    if (!this.currentGuildId) return;

    try {
      this.showLoading(true);

      switch (section) {
        case 'analytics':
          await this.loadAnalytics();
          break;
        case 'suggestions':
          await this.loadSuggestions();
          break;
        case 'channels':
        case 'roles':
        case 'features':
        case 'appearance':
          await this.loadConfigSection(section);
          break;
      }
    } catch (error) {
      console.error(`[Dashboard] Failed to load ${section} data:`, error);
      this.showNotification(`Failed to load ${section} data`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load analytics data
   */
  async loadAnalytics() {
    const response = await this.apiRequest(`/api/config/${this.currentGuildId}/analytics`);
    
    if (response.success) {
      this.renderAnalyticsChart(response.data);
    }
  }

  /**
   * Load configuration suggestions
   */
  async loadSuggestions() {
    const response = await this.apiRequest(`/api/config/${this.currentGuildId}/suggestions`);
    
    if (response.success) {
      this.renderSuggestions(response.data.suggestions);
    }
  }

  /**
   * Load configuration section
   */
  async loadConfigSection(section) {
    const response = await this.apiRequest(`/api/config/${this.currentGuildId}/${section}`);
    
    if (response.success) {
      this.renderConfigSection(section, response.data);
    }
  }

  /**
   * Update progress cards
   */
  updateProgressCards(progress) {
    const sections = ['channels', 'roles', 'features', 'overall'];
    
    sections.forEach(section => {
      const percentage = progress[section]?.percentage || 0;
      const progressElement = document.getElementById(`${section}Progress`);
      const circleElement = document.getElementById(`${section}Circle`);
      
      if (progressElement) {
        progressElement.textContent = `${percentage}%`;
      }
      
      if (circleElement) {
        const circumference = 2 * Math.PI * 15.915;
        const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`;
        circleElement.style.strokeDasharray = strokeDasharray;
      }
    });
  }

  /**
   * Update bot status display
   */
  updateBotStatus(status) {
    const statusIndicator = document.getElementById('botStatusIndicator');
    const statusText = document.getElementById('botStatusText');
    const statusDisplay = document.getElementById('botStatusDisplay');
    const pingElement = document.getElementById('botPing');
    const uptimeElement = document.getElementById('botUptime');
    const guildsElement = document.getElementById('botGuilds');

    if (statusIndicator && statusText) {
      // Update header status
      statusIndicator.className = `status-indicator status-${status.status}`;
      statusText.textContent = status.message;
    }

    if (statusDisplay) {
      // Update detailed status
      statusDisplay.innerHTML = `
        <span class="status-indicator status-${status.status}"></span>
        ${this.capitalizeFirst(status.status)}
      `;
    }

    if (pingElement) {
      pingElement.textContent = status.ping > 0 ? `${status.ping}ms` : '-';
    }

    if (uptimeElement) {
      uptimeElement.textContent = status.uptime ? this.formatUptime(status.uptime) : '-';
    }

    if (guildsElement) {
      guildsElement.textContent = status.guilds || '-';
    }
  }

  /**
   * Update guild information
   */
  updateGuildInfo(guild) {
    const guildInfoElement = document.getElementById('guildInfo');
    
    if (!guildInfoElement || !guild) return;

    guildInfoElement.innerHTML = `
      <div class="flex justify-between">
        <span class="text-gray-600">Name:</span>
        <span class="font-medium">${guild.name}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Members:</span>
        <span>${guild.memberCount?.toLocaleString() || '-'}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Channels:</span>
        <span>${guild.channelCount || '-'}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Roles:</span>
        <span>${guild.roleCount || '-'}</span>
      </div>
    `;
  }

  /**
   * Update recent activity
   */
  updateRecentActivity(activities) {
    const activityElement = document.getElementById('recentActivity');
    
    if (!activityElement) return;

    if (!activities || activities.length === 0) {
      activityElement.innerHTML = '<div class="text-center text-gray-500">No recent activity</div>';
      return;
    }

    const activityHtml = activities.map(activity => `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
        <div class="flex items-center space-x-3">
          <div class="w-2 h-2 rounded-full bg-${this.getActivityColor(activity.eventType)}"></div>
          <div>
            <p class="text-sm font-medium text-gray-900">${activity.message}</p>
            <p class="text-xs text-gray-500">${this.formatTimestamp(activity.timestamp)}</p>
          </div>
        </div>
        <span class="text-xs text-gray-400">${activity.username || 'System'}</span>
      </div>
    `).join('');

    activityElement.innerHTML = activityHtml;
  }

  /**
   * Render analytics chart
   */
  renderAnalyticsChart(data) {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.charts.analytics) {
      this.charts.analytics.destroy();
    }

    this.charts.analytics = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(data.changesByTime || {}),
        datasets: [{
          label: 'Configuration Changes',
          data: Object.values(data.changesByTime || {}),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Configuration Changes Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Render configuration suggestions
   */
  renderSuggestions(suggestions) {
    const container = document.getElementById('suggestionsContainer');
    if (!container) return;

    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500">No suggestions available</div>';
      return;
    }

    const suggestionsHtml = suggestions.map(suggestion => `
      <div class="bg-white rounded-lg shadow card-hover p-6 mb-4">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${this.getPriorityColor(suggestion.priority)}-100 text-${this.getPriorityColor(suggestion.priority)}-800">
                ${suggestion.priority.toUpperCase()}
              </span>
              <span class="ml-2 text-sm text-gray-500">${suggestion.type}</span>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${suggestion.title}</h3>
            <p class="text-gray-600 mb-3">${suggestion.description}</p>
            <p class="text-sm text-gray-500">${suggestion.suggestion}</p>
          </div>
          <button class="ml-4 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors" 
                  onclick="dashboard.applySuggestion('${suggestion.action?.type}', '${suggestion.action?.field}', '${suggestion.action?.value}')">
            Apply
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = suggestionsHtml;
  }

  /**
   * Apply configuration suggestion
   */
  async applySuggestion(type, field, value) {
    try {
      this.showLoading(true);

      const updates = {};
      updates[field] = value;

      const response = await this.apiRequest(`/api/config/${this.currentGuildId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (response.success) {
        this.showNotification('Suggestion applied successfully', 'success');
        await this.loadSuggestions(); // Reload suggestions
        await this.loadDashboardData(); // Reload dashboard
      } else {
        this.showNotification('Failed to apply suggestion', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to apply suggestion:', error);
      this.showNotification('Failed to apply suggestion', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Handle configuration updates from WebSocket
   */
  handleConfigUpdate(data) {
    this.showNotification(`Configuration updated by ${data.updatedBy?.username || 'System'}`, 'info');
    
    // Reload current section data
    if (this.currentSection === 'overview') {
      this.loadDashboardData();
    } else {
      this.loadSectionData(this.currentSection);
    }
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(connected, message = null) {
    // Update visual indicators for WebSocket connection status
    console.log(`[Dashboard] Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
    
    const statusIndicator = document.getElementById('botStatusIndicator');
    const statusText = document.getElementById('botStatusText');
    
    if (statusIndicator && statusText) {
      if (connected) {
        statusIndicator.className = 'status-indicator status-online';
        statusText.textContent = message || 'Connected';
      } else {
        statusIndicator.className = 'status-indicator status-offline';
        statusText.textContent = message || 'Disconnected';
      }
    }
  }

  /**
   * Show error message in dashboard
   */
  showErrorMessage(message) {
    const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
    errorContainer.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-red-400"></i>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>${message}</p>
            </div>
            <div class="mt-4">
              <div class="flex space-x-2">
                <button onclick="window.location.reload()" class="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200">
                  Retry
                </button>
                <button onclick="window.dashboard.hideErrorMessage()" class="bg-white px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-gray-50 border border-red-300">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    errorContainer.style.display = 'block';
  }

  /**
   * Hide error message
   */
  hideErrorMessage() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  /**
   * Create error container if it doesn't exist
   */
  createErrorContainer() {
    let container = document.getElementById('error-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'error-container';
      container.style.display = 'none';
      
      const mainContent = document.querySelector('.main-content') || document.querySelector('main') || document.body;
      mainContent.insertBefore(container, mainContent.firstChild);
    }
    return container;
  }

  /**
   * Make API request with CSRF protection
   */
  async apiRequest(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.csrfToken
      },
      credentials: 'include'
    };

    const mergedOptions = { ...defaultOptions, ...options };
    if (options.headers) {
      mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    // Add timeout support
    const timeout = options.timeout || 15000; // Default 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    mergedOptions.signal = controller.signal;

    try {
      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          this.showNotification('Session expired. Please log in again.', 'warning');
          setTimeout(() => window.location.href = '/auth/discord', 2000);
          throw new Error('Authentication required');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to access this server.');
        } else if (response.status === 404) {
          throw new Error('Configuration not found for this server.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification bg-white border-l-4 border-${this.getNotificationColor(type)} rounded-lg shadow-lg p-4 mb-2 max-w-sm`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <i class="fas fa-${this.getNotificationIcon(type)} text-${this.getNotificationColor(type)}"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">${message}</p>
        </div>
        <div class="ml-auto pl-3">
          <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  /**
   * Utility functions
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  getActivityColor(eventType) {
    const colors = {
      'CONFIG_CHANGE': 'blue-500',
      'AUTH_LOGIN': 'green-500',
      'AUTH_LOGOUT': 'yellow-500',
      'SECURITY_VIOLATION': 'red-500'
    };
    return colors[eventType] || 'gray-500';
  }

  getPriorityColor(priority) {
    const colors = {
      'high': 'red',
      'medium': 'yellow',
      'low': 'green'
    };
    return colors[priority] || 'gray';
  }

  getNotificationColor(type) {
    const colors = {
      'success': 'green-500',
      'error': 'red-500',
      'warning': 'yellow-500',
      'info': 'blue-500'
    };
    return colors[type] || 'blue-500';
  }

  getNotificationIcon(type) {
    const icons = {
      'success': 'check-circle',
      'error': 'exclamation-circle',
      'warning': 'exclamation-triangle',
      'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new Dashboard();
});