const DB_NAME = "geschool-offline";
const DB_VERSION = 1;
const CACHE_STORE = "api_cache";
const QUEUE_STORE = "sync_queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

interface CachedResponse {
  url: string;
  body: unknown;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = 5 * 60 * 1000;

export const offlineStorage = {
  async cacheResponse(url: string, response: Response, ttlMs: number = DEFAULT_TTL): Promise<void> {
    try {
      const body = await response.json();
      const db = await openDB();
      const transaction = db.transaction(CACHE_STORE, "readwrite");
      const store = transaction.objectStore(CACHE_STORE);
      store.put({
        url,
        body,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: Date.now(),
        ttl: ttlMs,
      });
    } catch {
      /* Silently fail if IndexedDB is unavailable */
    }
  },

  async getCachedResponse(url: string): Promise<{ body: unknown; status: number } | null> {
    try {
      const db = await openDB();
      const transaction = db.transaction(CACHE_STORE, "readonly");
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(url);
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result as CachedResponse | undefined;
          if (!result) {
            resolve(null);
            return;
          }
          if (Date.now() - result.timestamp > result.ttl) {
            store.delete(url);
            resolve(null);
            return;
          }
          resolve({ body: result.body, status: result.status });
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async clearCache(): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(CACHE_STORE, "readwrite");
      const store = transaction.objectStore(CACHE_STORE);
      store.clear();
    } catch {
      /* Silently fail */
    }
  },

  async clearExpiredCache(): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(CACHE_STORE, "readwrite");
      const store = transaction.objectStore(CACHE_STORE);
      const all = await new Promise<CachedResponse[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const now = Date.now();
      for (const entry of all) {
        if (now - entry.timestamp > entry.ttl) {
          store.delete(entry.url);
        }
      }
    } catch {
      /* Silently fail */
    }
  },
};