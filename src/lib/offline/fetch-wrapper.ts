import { enqueueSync } from "@/lib/offline/sync-queue";
import { offlineStorage } from "@/lib/offline/storage";

interface OfflineFetchOptions extends RequestInit {
  forceOnline?: boolean;
  cacheTTL?: number;
  skipOfflineQueue?: boolean;
}

export async function offlineFetch(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<Response> {
  const {
    forceOnline = false,
    cacheTTL = 5 * 60 * 1000,
    skipOfflineQueue = false,
    ...fetchOptions
  } = options;

  const isOnline = navigator.onLine;

  if (!isOnline && !forceOnline) {
    const cached = await offlineStorage.getCachedResponse(url);
    if (cached) {
      return new Response(JSON.stringify(cached.body), {
        status: cached.status,
        headers: { "Content-Type": "application/json", "x-offline-cached": "true" },
      });
    }

    if (fetchOptions.method && fetchOptions.method !== "GET" && !skipOfflineQueue) {
      await enqueueSync({
        url,
        method: fetchOptions.method as "POST" | "PUT" | "PATCH" | "DELETE",
        body: fetchOptions.body,
        headers: Object.fromEntries(
          (fetchOptions.headers as HeadersInit)
            ? new Headers(fetchOptions.headers).entries()
            : []
        ),
      });
    }

    return new Response(
      JSON.stringify({ error: "Hors-ligne", cached: false, offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (response.ok && fetchOptions.method === undefined || fetchOptions.method === "GET" || fetchOptions.method === undefined) {
      const clone = response.clone();
      offlineStorage.cacheResponse(url, clone, cacheTTL).catch(() => {});
    }

    return response;
  } catch (error) {
    const cached = await offlineStorage.getCachedResponse(url);
    if (cached) {
      return new Response(JSON.stringify(cached.body), {
        status: cached.status,
        headers: { "Content-Type": "application/json", "x-offline-cached": "true" },
      });
    }

    if (fetchOptions.method && fetchOptions.method !== "GET" && !skipOfflineQueue) {
      await enqueueSync({
        url,
        method: fetchOptions.method as "POST" | "PUT" | "PATCH" | "DELETE",
        body: fetchOptions.body,
        headers: Object.fromEntries(
          (fetchOptions.headers as HeadersInit)
            ? new Headers(fetchOptions.headers).entries()
            : []
        ),
      });
    }

    throw error;
  }
}