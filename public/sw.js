// ============================================================
// Casheer PWA Service Worker
// Strategy: Network First dengan Cache Fallback
// ============================================================

const CACHE_NAME = "casheer-v1";
const STATIC_CACHE = "casheer-static-v1";
const API_CACHE = "casheer-api-v1";

// Asset statis yang di-precache
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// ============================================================
// INSTALL — Precache aset statis
// ============================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATE — Bersihkan cache lama
// ============================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name !== CACHE_NAME &&
              name !== STATIC_CACHE &&
              name !== API_CACHE
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// FETCH — Strategi per jenis request
// ============================================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET dan request browser-extension
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // 1. API requests → Network First, fallback ke cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // 2. Aset statis (images, fonts, dll) → Cache First
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // 3. Next.js chunks / JS → Cache First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // 4. Navigasi halaman → Network First, fallback ke cache, lalu offline page
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // 5. Default → Network First
  event.respondWith(networkFirstWithCache(request, CACHE_NAME));
});

// ============================================================
// Helpers
// ============================================================

/** Network first, simpan ke cache jika berhasil */
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

/** Cache first, fallback ke network */
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

/** Network first untuk navigasi, fallback ke /dashboard dari cache */
async function networkFirstNavigate(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Coba dari cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback ke halaman utama yang ter-cache
    const fallback = await caches.match("/dashboard");
    return fallback || new Response("Aplikasi sedang offline.", { status: 503 });
  }
}
