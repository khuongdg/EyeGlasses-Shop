const Redis = require('ioredis');

// In-Memory Fallback Cache Store
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  del(key) {
    this.cache.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  flush() {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();
let redisClient = null;
let isRedisConnected = false;

try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // Don't keep retrying if Redis is not running
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('⚡ [CacheService] Connected to Redis successfully');
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Silent fail over to memory cache without throwing
  });
} catch (e) {
  isRedisConnected = false;
}

const getCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return memoryCache.get(key);
    }
  }
  return memoryCache.get(key);
};

const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch (e) {
      memoryCache.set(key, value, ttlSeconds);
    }
  } else {
    memoryCache.set(key, value, ttlSeconds);
  }
};

const clearCachePattern = async (pattern) => {
  memoryCache.delPattern(pattern);
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (e) {
      // Ignore
    }
  }
};

module.exports = {
  getCache,
  setCache,
  clearCachePattern
};
