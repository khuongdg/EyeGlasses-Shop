const { getCache, setCache } = require('../services/cacheService');

/**
 * Express middleware to cache GET requests for a specified duration
 * @param {number} ttlSeconds Cache expiration time in seconds (default: 300 = 5 minutes)
 */
const cacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.baseUrl}${req.path}:${JSON.stringify(req.query)}`;

    try {
      const cachedData = await getCache(key);
      if (cachedData) {
        // Return cached response instantly with custom header
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Intercept res.json to store the response in cache before sending
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        res.setHeader('X-Cache', 'MISS');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(key, data, ttlSeconds).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

module.exports = cacheMiddleware;
