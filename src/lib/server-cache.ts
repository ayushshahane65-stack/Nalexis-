// Lightweight server-side in-memory TTL cache to prevent repeated cold requests
// to slow external catalogs like Gutendex and Open Library.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entries
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const serverCache = new MemoryCache<unknown>(300);

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = serverCache.get(key) as T | null;
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  if (fresh !== undefined && fresh !== null) {
    serverCache.set(key, fresh, ttlMs);
  }
  return fresh;
}
