// MARTA PWA service worker — minimal app-shell cache (Phase 1).
// Navigations: network-first (new builds show immediately, cache fallback offline).
// Other GETs: stale-while-revalidate — serve cache fast, refresh in the background,
// so even non-content-hashed assets self-heal within one reload (no stale CSS).
const CACHE = "marta-v3";
const SHELL = [
  "/",
  "/discover",
  "/drops",
  "/sell",
  "/agent",
  "/community",
  "/card",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigations: try network, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Other GETs: stale-while-revalidate — return cache immediately if present, but
  // always fetch in the background and update the cache for the next load.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
