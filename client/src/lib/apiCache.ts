/**
 * API Caching and Request Deduplication Layer
 * Prevents duplicate API calls and provides caching utilities
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Get from cache if not expired
 */
export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set in cache with TTL
 */
export function setInCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Deduplicated fetch with caching
 * If the same request is already pending, returns the pending promise
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheTTL: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;

  // Check cache first
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${url}`);
    return cached;
  }

  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    console.log(`[Dedup] Using pending request for ${url}`);
    return pendingRequests.get(cacheKey)!;
  }

  // Make the actual request
  console.log(`[API] ${url}`);
  const promise = fetch(url, options)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      setInCache(cacheKey, data, cacheTTL);
      return data as T;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Debounced function - prevents rapid repeated calls
 */
export function createDebouncedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number = 1000
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastPromise: Promise<any> | null = null;

  return async (...args: Parameters<T>) => {
    // Clear previous timeout if exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Return a promise that resolves when the debounced function actually runs
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          lastPromise = Promise.resolve(fn(...args));
          const result = await lastPromise;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  };
}

/**
 * Simple debounce wrapper for void/non-Promise functions
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 1000
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

/**
 * Batch multiple API calls into one
 * Useful for fetching multiple resources in a single request
 */
export async function batchedFetch<T, R>(
  baseUrl: string,
  items: T[],
  batchSize: number = 50,
  options?: RequestInit,
  cacheTTL: number = 5 * 60 * 1000
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const url = `${baseUrl}?${batch.map((item, idx) => `id=${encodeURIComponent(String(item))}`).join('&')}`;
    
    const batchResults = await cachedFetch<R[]>(url, options, cacheTTL);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Execute function only once per unique key
 */
const executedOnce = new Set<string>();

export function executeOnce(key: string, fn: () => void): void {
  if (!executedOnce.has(key)) {
    executedOnce.add(key);
    fn();
  }
}

/**
 * Reset executeOnce for a key
 */
export function resetExecuteOnce(key: string): void {
  executedOnce.delete(key);
}
