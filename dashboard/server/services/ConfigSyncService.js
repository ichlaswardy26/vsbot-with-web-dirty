const fs = require('fs').promises;
const path = require('path');
const BotConfig = require('../models/BotConfig');

class ConfigSyncService {
  constructor() {
    this.botConfigPath = process.env.BOT_CONFIG_PATH || '../config.js';
    this.botEnvPath = process.env.BOT_ENV_PATH || '../.env';
    this.syncInterval = 30000; // 30 detik
    this.isRunning = false;
  }

  // Start automatic sync service
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Config sync service started');
    
    // Initial sync
    this.syncFromDatabase();
    
    // Set interval untuk sync berkala
    this.intervalId = setInterval(() => {
      this.syncFromDatabase();
    }, this.syncInterval);
  }

  // Stop sync service
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('⏹️ Config sync service stopped');
  }

  // Sync config dari database ke file config.js
  async syncFromDatabase() {
    try {
      const config = await BotConfig.getConfig();
      await this.updateMainBotConfig(config.toMainBotFormat());
      
      // Log sync (optional, bisa di-comment jika terlalu verbose)
      // console.log('✅ Config synced from database to main bot');
    } catch (error) {
      console.error('❌ Config sync error:', error.message);
    }
  }

  // Update file config.js dengan data dari database
  async updateMainBotConfig(configData) {
    try {
      const configPath = path.resolve(__dirname, '../../..', this.botConfigPath);
      
      // Read current config file
      let configContent = await fs.readFile(configPath, 'utf8');
      
      // Generate new config sections
      const newSections = this.generateConfigSections(configData);
      
      // Replace each section in the config file
      Object.entries(newSections).forEach(([section, content]) => {
        const regex = new RegExp(
          `(\\s*${section}:\\s*{[\\s\\S]*?})(,?\\s*(?=\\n\\s*\\w+:|\\n\\s*}))`,
          'g'
        );
        
        if (regex.test(configContent)) {
          configContent = configContent.replace(regex, `  ${section}: ${content}$2`);
        }
      });
      
      // Write updated config
      await fs.writeFile(configPath, configContent, 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to update main bot config: ${error.message}`);
    }
  }

  // Generate config sections untuk di-inject ke config.js
  generateConfigSections(configData) {
    const sections = {};
    
    // Channels section
    if (configData.channels) {
      sections.channels = this.formatObjectForConfig(configData.channels, 2);
    }
    
    // Roles section
    if (configData.roles) {
      sections.roles = this.formatObjectForConfig(configData.roles, 2);
    }
    
    // Categories section
    if (configData.categories) {
      sections.categories = this.formatObjectForConfig(configData.categories, 2);
    }
    
    // Emojis section
    if (configData.emojis) {
      sections.emojis = this.formatObjectForConfig(configData.emojis, 2);
    }
    
    // Images section
    if (configData.images) {
      sections.images = this.formatObjectForConfig(configData.images, 2);
    }
    
    // Features section
    if (configData.features) {
      sections.features = this.formatObjectForConfig(configData.features, 2);
    }
    
    // Colors section
    if (configData.colors) {
      sections.colors = this.formatObjectForConfig(configData.colors, 2);
    }
    
    return sections;
  }

  // Format object untuk JavaScript code
  formatObjectForConfig(obj, indentLevel = 0) {
    const indent = '  '.repeat(indentLevel);
    const innerIndent = '  '.repeat(indentLevel + 1);
    
    let result = '{\n';
    
    Object.entries(obj).forEach(([key, value], index, array) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested object
        result += `${innerIndent}${key}: ${this.formatObjectForConfig(value, indentLevel + 1)}`;
      } else {
        // Primitive value
        const formattedValue = this.formatValue(value);
        result += `${innerIndent}${key}: ${formattedValue}`;
      }
      
      // Add comma if not last item
      if (index < array.length - 1) {
        result += ',';
      }
      result += '\n';
    });
    
    result += `${indent}}`;
    return result;
  }

  // Format individual values
  formatValue(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    return `'${String(value)}'`;
  }

  // Load config dari file ke database (untuk initial setup)
  async loadFromFile() {
    try {
      const configPath = path.resolve(__dirname, '../../..', this.botConfigPath);
      
      // Dynamically import config (menghindari cache)
      delete require.cache[require.resolve(configPath)];
      const fileConfig = require(configPath);
      
      // Extract hanya bagian yang bisa dikonfigurasi
      const configurableConfig = {
        channels: fileConfig.channels || {},
        roles: fileConfig.roles || {},
        categories: fileConfig.categories || {},
        emojis: fileConfig.emojis || {},
        images: fileConfig.images || {},
        features: fileConfig.features || {},
        colors: fileConfig.colors || {}
      };
      
      // Update database
      await BotConfig.updateConfig(configurableConfig, 'system');
      
      console.log('✅ Config loaded from file to database');
      return configurableConfig;
    } catch (error) {
      throw new Error(`Failed to load config from file: ${error.message}`);
    }
  }

  // Create backup of current config
  async createBackup() {
    try {
      const config = await BotConfig.getConfig();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.resolve(__dirname, '../../../backups', `config-backup-${timestamp}.json`);
      
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      
      const backupData = {
        timestamp: new Date(),
        version: config.version,
        config: config.toMainBotFormat()
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      
      console.log(`📦 Config backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  // Restore config from backup
  async restoreFromBackup(backupPath) {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      if (!backupData.config) {
        throw new Error('Invalid backup file format');
      }
      
      await BotConfig.updateConfig(backupData.config, 'system');
      await this.syncFromDatabase();
      
      console.log(`🔄 Config restored from backup: ${backupPath}`);
      return backupData;
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error.message}`);
    }
  }

  // Get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncInterval,
      lastSync: this.lastSync || null,
      configPath: this.botConfigPath
    };
  }

  // Manual sync trigger
  async manualSync() {
    try {
      await this.syncFromDatabase();
      this.lastSync = new Date();
      return { success: true, timestamp: this.lastSync };
    } catch (error) {
      throw new Error(`Manual sync failed: ${error.message}`);
    }
  }
}

module.exports = new ConfigSyncService();