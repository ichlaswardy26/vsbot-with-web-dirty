/**
 * Cache Service for Web Dashboard
 * Provides in-memory caching with TTL support for API responses
 * Requirements: Performance optimization - database query caching
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Default TTL: 5 minutes
    this.defaultTTL = 5 * 60 * 1000;
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Get item from cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  /**
   * Set item in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null
    };
    
    this.cache.set(key, item);
    this.stats.sets++;
    
    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Delete items matching a pattern
   */
  deletePattern(pattern) {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.stats.deletes += count;
    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    return size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get or set with callback
   */
  async getOrSet(key, callback, ttl = this.defaultTTL) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await callback();
    this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Cleanup expired items
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Invalidate guild-specific cache
   */
  invalidateGuild(guildId) {
    return this.deletePattern(`^.*:${guildId}(:|$)`);
  }

  /**
   * Invalidate section-specific cache for a guild
   */
  invalidateSection(guildId, section) {
    return this.deletePattern(`^${section}:${guildId}`);
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache keys for different data types
const CacheKeys = {
  CONFIG: 'config',
  CHANNELS: 'channels',
  ROLES: 'roles',
  FEATURES: 'features',
  APPEARANCE: 'appearance',
  TEMPLATES: 'templates',
  GUILD_INFO: 'guild_info',
  USER_SESSION: 'user_session'
};

// TTL values for different cache types (in milliseconds)
const CacheTTL = {
  CONFIG: 5 * 60 * 1000,      // 5 minutes
  CHANNELS: 2 * 60 * 1000,    // 2 minutes (Discord data changes more frequently)
  ROLES: 2 * 60 * 1000,       // 2 minutes
  FEATURES: 5 * 60 * 1000,    // 5 minutes
  APPEARANCE: 10 * 60 * 1000, // 10 minutes (rarely changes)
  TEMPLATES: 30 * 60 * 1000,  // 30 minutes (static data)
  GUILD_INFO: 5 * 60 * 1000,  // 5 minutes
  USER_SESSION: 60 * 60 * 1000 // 1 hour
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CacheKeys,
  CacheTTL
};
