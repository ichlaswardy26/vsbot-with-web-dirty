/**
 * Enhanced Cache Service
 * Provides intelligent caching with TTL, statistics, and invalidation strategies
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      totalRequests: 0
    };
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxSize = 1000;
    this.cleanupInterval = null;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key
   */
  generateKey(type, ...args) {
    return `${type}:${args.join(':')}`;
  }

  /**
   * Get value from cache
   */
  get(key) {
    this.stats.totalRequests++;
    
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access time
    item.lastAccessed = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl,
      ttl
    });

    this.stats.sets++;
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

    try {
      const value = await callback();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error('[Cache] Error in getOrSet callback:', error);
      throw error;
    }
  }

  /**
   * Delete specific key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern) {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.stats.invalidations += count;
    return count;
  }

  /**
   * Invalidate all cache entries for a guild
   */
  invalidateGuild(guildId) {
    return this.invalidatePattern(`.*:${guildId}(:|$)`);
  }

  /**
   * Invalidate specific section for a guild
   */
  invalidateSection(guildId, section) {
    return this.invalidatePattern(`.*:${guildId}:${section}(:|$)`);
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
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.deletes++;
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
      this.stats.deletes += cleaned;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate),
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length * 2; // Approximate string size
      totalSize += JSON.stringify(item.value).length * 2; // Approximate object size
      totalSize += 64; // Metadata overhead
    }
    
    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(pattern = null) {
    const entries = [];
    const regex = pattern ? new RegExp(pattern) : null;
    
    for (const [key, item] of this.cache.entries()) {
      if (!regex || regex.test(key)) {
        entries.push({
          key,
          createdAt: new Date(item.createdAt).toISOString(),
          lastAccessed: new Date(item.lastAccessed).toISOString(),
          expiresAt: new Date(item.expiresAt).toISOString(),
          ttl: item.ttl,
          isExpired: Date.now() > item.expiresAt,
          valueType: typeof item.value,
          valueSize: JSON.stringify(item.value).length
        });
      }
    }
    
    return entries.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
  }

  /**
   * Shutdown cache service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Cache key constants
const CacheKeys = {
  CONFIG: 'config',
  CHANNELS: 'channels',
  ROLES: 'roles',
  FEATURES: 'features',
  APPEARANCE: 'appearance',
  TEMPLATES: 'templates',
  USER_SESSION: 'user_session',
  GUILD_INFO: 'guild_info',
  BOT_STATUS: 'bot_status',
  VALIDATION: 'validation'
};

// Cache TTL constants (in milliseconds)
const CacheTTL = {
  CONFIG: 5 * 60 * 1000,        // 5 minutes
  CHANNELS: 2 * 60 * 1000,      // 2 minutes
  ROLES: 2 * 60 * 1000,         // 2 minutes
  FEATURES: 5 * 60 * 1000,      // 5 minutes
  APPEARANCE: 10 * 60 * 1000,   // 10 minutes
  TEMPLATES: 30 * 60 * 1000,    // 30 minutes
  USER_SESSION: 60 * 60 * 1000, // 1 hour
  GUILD_INFO: 5 * 60 * 1000,    // 5 minutes
  BOT_STATUS: 30 * 1000,        // 30 seconds
  VALIDATION: 60 * 1000         // 1 minute
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CacheKeys,
  CacheTTL
};