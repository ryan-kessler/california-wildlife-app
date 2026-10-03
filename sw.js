// Service worker for the phone app (local-maps R1, R13). Built by pipeline/build_app.py, which
// fills in VERSION (a hash of the shell files) and FILES.
//
// - install: cache every shell file for this version. If any fails, the install fails and the
//   old version keeps running untouched (an interrupted update never breaks the app).
// - no skipWaiting on install: a new version waits, the page shows "Update ready - reload",
//   and only the user's tap (a "skip-waiting" message) switches versions.
// - activate: delete other versions' caches.
// - fetch: shell files cache-first; the user's data lives in device storage, never fetched.
const VERSION = "b95c63234f3ec265";
const FILES = ["./", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "index.html", "manifest.webmanifest", "map-vendor.js"];
const CACHE = `cawl-shell-${VERSION}`;

self.addEventListener("install", (event) => {
  // cache: "reload" fetches each file from the server, never the browser's HTTP cache: GitHub
  // Pages lets browsers keep files for 10 minutes, and a version published within that window
  // was otherwise installed with the previous version's files (owner saw no change, 2026-09-29).
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("cawl-shell-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") self.skipWaiting();
  if (event.data?.type === "version") event.source?.postMessage({ type: "version", version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "./" : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    return hit ?? fetch(req);
  })());
});
