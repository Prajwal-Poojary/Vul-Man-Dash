import Redis from 'redis';

// Redis client setup
const redisClient = Redis.createClient({
  host: 'localhost',
  port: 6379,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server is not running');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis connection retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      
      const key = `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      
      // Store original res.json function
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(key, duration, JSON.stringify(data)).catch(err => {
          console.error('Cache set error:', err);
        });
        
        // Call original json function
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation helper
const invalidateCache = async (pattern = '*') => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

export { cache, invalidateCache, redisClient };