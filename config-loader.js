// Config Loader untuk Bot Utama
// File ini akan di-require oleh config.js untuk load konfigurasi dari database

const mongoose = require('mongoose');

class ConfigLoader {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.cacheTTL = 30000; // 30 detik cache
    this.isConnected = false;
  }

  // Connect ke MongoDB jika belum terkoneksi
  async ensureConnection() {
    if (this.isConnected) return;

    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
          maxPoolSize: 5,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 3000,
          socketTimeoutMS: 10000,
        });
      }
      this.isConnected = true;
    } catch (error) {
      console.warn('⚠️ Config Loader: Failed to connect to MongoDB, using file config');
      this.isConnected = false;
    }
  }

  // Load config dari database
  async loadFromDatabase() {
    try {
      await this.ensureConnection();
      
      if (!this.isConnected) {
        return null;
      }

      // Define schema inline untuk menghindari dependency issues
      const configSchema = new mongoose.Schema({
        channels: { type: Object, default: {} },
        roles: { type: Object, default: {} },
        categories: { type: Object, default: {} },
        emojis: { type: Object, default: {} },
        images: { type: Object, default: {} },
        features: { type: Object, default: {} },
        colors: { type: Object, default: {} },
        lastUpdated: { type: Date, default: Date.now },
        version: { type: Number, default: 1 }
      }, { timestamps: true });

      // Get or create model
      let BotConfig;
      try {
        BotConfig = mongoose.model('BotConfig');
      } catch {
        BotConfig = mongoose.model('BotConfig', configSchema);
      }

      const config = await BotConfig.findOne().lean();
      
      if (config) {
        this.cache = {
          channels: config.channels || {},
          roles: config.roles || {},
          categories: config.categories || {},
          emojis: config.emojis || {},
          images: config.images || {},
          features: config.features || {},
          colors: config.colors || {}
        };
        this.lastFetch = Date.now();
        return this.cache;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Config Loader: Database error, using file config:', error.message);
      return null;
    }
  }

  // Get config dengan caching
  async getConfig() {
    // Check cache validity
    if (this.cache && this.lastFetch && (Date.now() - this.lastFetch) < this.cacheTTL) {
      return this.cache;
    }

    // Try to load from database
    const dbConfig = await this.loadFromDatabase();
    return dbConfig;
  }

  // Clear cache (untuk force refresh)
  clearCache() {
    this.cache = null;
    this.lastFetch = null;
  }
}

// Export singleton instance
module.exports = new ConfigLoader();