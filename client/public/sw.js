/**
 * Aroma AR — Service Worker
 *
 * Strategy: CacheFirst for 3D model files (.glb, .gltf) and poster images.
 * On first visit  → fetch from network, clone into Cache Storage, respond.
 * On repeat visit → respond directly from cache (0ms transfer, no network).
 *
 * Cache versioning: bumping CACHE_VERSION evicts all old assets on SW update.
 */

const CACHE_VERSION = "v1";
const MODEL_CACHE   = `aroma-models-${CACHE_VERSION}`;
const POSTER_CACHE  = `aroma-posters-${CACHE_VERSION}`;

/** Max number of GLB entries to keep (LRU via insertion order). */
const MAX_MODEL_ENTRIES  = 20;
const MAX_POSTER_ENTRIES = 40;

// ─── Install ──────────────────────────────────────────────────────────────────
// Skip waiting so the new SW takes over immediately without a page reload.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
// Clean up any caches from old versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== MODEL_CACHE && k !== POSTER_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGlbRequest(url) {
  return /\.(glb|gltf)(\?|$)/i.test(url.pathname);
}

function isPosterRequest(url) {
  // Poster images are PNG/WebP files served from Supabase storage
  return /\.(png|webp|jpg|jpeg)(\?|$)/i.test(url.pathname) &&
    url.pathname.includes("/storage/");
}

/**
 * Prune oldest entries when cache exceeds maxEntries.
 * Cache API preserves insertion order — oldest entry is first.
 */
async function pruneCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

/**
 * CacheFirst strategy:
 * 1. Return cached response if it exists.
 * 2. Otherwise fetch from network, cache the clone, return original.
 */
async function cacheFirst(request, cacheName, maxEntries) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  if (cached) {
    return cached;
  }

  // Network fallback — stream response while simultaneously caching it
  const networkResponse = await fetch(request);

  // Only cache successful responses
  if (networkResponse.ok) {
    // Clone before consuming — a Response body can only be read once
    cache.put(request, networkResponse.clone()).then(() =>
      pruneCache(cacheName, maxEntries)
    );
  }

  return networkResponse;
}

// ─── Fetch intercept ──────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return; // Unparsable URL — ignore
  }

  // GLB / GLTF models
  if (isGlbRequest(url)) {
    event.respondWith(
      cacheFirst(event.request, MODEL_CACHE, MAX_MODEL_ENTRIES)
    );
    return;
  }

  // Poster images from Supabase storage
  if (isPosterRequest(url)) {
    event.respondWith(
      cacheFirst(event.request, POSTER_CACHE, MAX_POSTER_ENTRIES)
    );
  }
});
