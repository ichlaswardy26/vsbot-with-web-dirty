// Config Manager untuk Bot Utama
// Utility untuk mengakses konfigurasi dengan mudah

const config = require('../config');

class ConfigManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 detik
  }

  // Get config value dengan caching
  async get(path, defaultValue = null) {
    const cacheKey = `config_${path}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache validity
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.value;
    }

    try {
      // Load full config
      const fullConfig = await config.async();
      
      // Navigate to nested property
      const value = this.getNestedValue(fullConfig, path);
      const result = value !== undefined ? value : defaultValue;
      
      // Cache result
      this.cache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.warn(`⚠️ ConfigManager: Failed to get ${path}, using default:`, error.message);
      
      // Fallback ke sync config
      const syncValue = this.getNestedValue(config.sync, path);
      return syncValue !== undefined ? syncValue : defaultValue;
    }
  }

  // Get nested value dari object menggunakan dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Get channel ID dengan fallback
  async getChannelId(channelKey, fallback = null) {
    const channelId = await this.get(`channels.${channelKey}`, fallback);
    return channelId || fallback;
  }

  // Get role ID dengan fallback
  async getRoleId(roleKey, fallback = null) {
    const roleId = await this.get(`roles.${roleKey}`, fallback);
    return roleId || fallback;
  }

  // Get category ID dengan fallback
  async getCategoryId(categoryKey, fallback = null) {
    const categoryId = await this.get(`categories.${categoryKey}`, fallback);
    return categoryId || fallback;
  }

  // Get emoji dengan fallback
  async getEmoji(emojiKey, fallback = '❓') {
    const emoji = await this.get(`emojis.${emojiKey}`, fallback);
    return emoji || fallback;
  }

  // Get image URL dengan fallback
  async getImageUrl(imageKey, fallback = null) {
    const imageUrl = await this.get(`images.${imageKey}`, fallback);
    return imageUrl || fallback;
  }

  // Get feature setting dengan fallback
  async getFeature(featureKey, fallback = null) {
    const feature = await this.get(`features.${featureKey}`, fallback);
    return feature !== null ? feature : fallback;
  }

  // Get color dengan fallback
  async getColor(colorKey, fallback = '#5865F2') {
    const color = await this.get(`colors.${colorKey}`, fallback);
    return color || fallback;
  }

  // Batch get multiple values
  async getBatch(paths) {
    const results = {};
    
    try {
      const fullConfig = await config.async();
      
      for (const [key, path] of Object.entries(paths)) {
        results[key] = this.getNestedValue(fullConfig, path);
      }
    } catch (error) {
      console.warn('⚠️ ConfigManager: Batch get failed, using sync config:', error.message);
      
      // Fallback ke sync config
      for (const [key, path] of Object.entries(paths)) {
        results[key] = this.getNestedValue(config.sync, path);
      }
    }
    
    return results;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Clear specific cache entry
  clearCacheEntry(path) {
    const cacheKey = `config_${path}`;
    this.cache.delete(cacheKey);
  }

  // Get all channels
  async getAllChannels() {
    return await this.get('channels', {});
  }

  // Get all roles
  async getAllRoles() {
    return await this.get('roles', {});
  }

  // Get all features
  async getAllFeatures() {
    return await this.get('features', {});
  }

  // Sync version untuk backward compatibility
  getSync(path, defaultValue = null) {
    const value = this.getNestedValue(config.sync, path);
    return value !== undefined ? value : defaultValue;
  }

  // Helper untuk validasi config
  async validateConfig() {
    try {
      const fullConfig = await config.async();
      const issues = [];

      // Check required channels
      const requiredChannels = ['welcome', 'ticketLogs'];
      for (const channel of requiredChannels) {
        if (!fullConfig.channels[channel]) {
          issues.push(`Missing required channel: ${channel}`);
        }
      }

      // Check required roles
      const requiredRoles = ['staff', 'supportTeam'];
      for (const role of requiredRoles) {
        if (!fullConfig.roles[role]) {
          issues.push(`Missing required role: ${role}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Config validation failed: ${error.message}`]
      };
    }
  }
}

// Export singleton instance
module.exports = new ConfigManager();