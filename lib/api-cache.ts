// API caching service for better performance
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key from endpoint and filters
  generateKey(endpoint: string, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    return `${endpoint}:${filterString}`;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const apiCache = new APICache();

// Enhanced API functions with caching
export const cachedGet = async <T = any>(
  url: string, 
  config?: any,
  ttl?: number
): Promise<T> => {
  const cacheKey = apiCache.generateKey(url);
  
  // Check cache first
  const cachedData = apiCache.get<T>(cacheKey);
  if (cachedData) {
    console.log(`[API Cache] Cache hit for ${url}`);
    return cachedData;
  }

  console.log(`[API Cache] Cache miss for ${url}, fetching from API`);
  
  // Import the original get function
  const { get } = await import('./api');
  const response = await get<T>(url, config);
  
  // Cache the response
  apiCache.set(cacheKey, response.data, ttl);
  
  return response.data;
};

export const cachedPost = async <T = any>(
  url: string, 
  data?: any, 
  config?: any,
  ttl?: number
): Promise<T> => {
  const cacheKey = apiCache.generateKey(url, data);
  
  // For POST requests, we might want to check cache for read operations
  // but generally POST requests should bypass cache
  if (url.includes('get') || url.includes('list')) {
    const cachedData = apiCache.get<T>(cacheKey);
    if (cachedData) {
      console.log(`[API Cache] Cache hit for POST ${url}`);
      return cachedData;
    }
  }

  console.log(`[API Cache] Cache miss for POST ${url}, fetching from API`);
  
  // Import the original post function
  const { post } = await import('./api');
  const response = await post<T>(url, data, config);
  
  // Cache the response for read operations
  if (url.includes('get') || url.includes('list')) {
    apiCache.set(cacheKey, response.data, ttl);
  }
  
  return response.data;
};

// Clear cache for specific patterns
export const clearCachePattern = (pattern: string): void => {
  const stats = apiCache.getStats();
  stats.entries.forEach(key => {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  });
};

// Clear all cache
export const clearAllCache = (): void => {
  apiCache.clear();
};
