const STATIC_CACHE = "geschool-static-v2";
const DYNAMIC_CACHE = "geschool-dynamic-v1";
const API_CACHE = "geschool-api-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/maskable-icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    if (
      url.pathname.startsWith("/api/conversations") ||
      url.pathname.startsWith("/api/attachments")
    ) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  event.respondWith(handleNavigationRequest(request));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CACHE_API_RESPONSE") {
    const { url, response } = event.data;
    caches.open(API_CACHE).then((cache) => {
      cache.put(url, response);
    });
  }
});

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);

  if (navigator.onLine) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const responseToCache = response.clone();
        const headers = new Headers(responseToCache.headers);
        headers.set("x-offline-timestamp", Date.now().toString());
        const cachedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers,
        });
        cache.put(request, cachedResponse);
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      return cached ?? new Response(
        JSON.stringify({ error: "Hors-ligne", cached: false, offline: true }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const cached = await cache.match(request);
  return cached ?? new Response(
    JSON.stringify({ error: "Hors-ligne", cached: false, offline: true }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match("/");
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "geschool-sync-queue") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_QUEUE" });
        });
      })
    );
  }
});