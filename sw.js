// MyWorkLog Service Worker v4.4.1
// Strategy: Cache-First for app shell, Network-First for GAS API calls
const APP_VERSION = '4.4.1';
const CACHE_SHELL = `mwl-shell-${APP_VERSION}`;
const CACHE_DATA  = `mwl-data-${APP_VERSION}`;

// App shell — cached on install, served immediately offline
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './i18n.js',
  './manifest.json',
];

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(c => Promise.allSettled(
        SHELL_ASSETS.map(u => c.add(u).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k.startsWith('mwl-') && k !== CACHE_SHELL && k !== CACHE_DATA)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        // After taking control, reload all open tabs so they get fresh assets
        clients.forEach(client => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// ── Fetch: routing strategy ────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // GAS endpoint calls — Network only (external domain, no-cors)
  // These are always opaque responses; don't cache them
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com')) {
    return; // let browser handle normally
  }

  // Same-origin app assets — Cache first, fallback to network
  // EXCEPT version.json — always network so update check is accurate
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('version.json')) {
      e.respondWith(networkFirstStrategy(e.request, CACHE_DATA));
      return;
    }
    e.respondWith(cacheFirstStrategy(e.request));
    return;
  }
  // External fonts / CDN — Network first, cache fallback
  if (url.hostname.includes('fonts.g') || url.hostname.includes('cdnjs')) {
    e.respondWith(networkFirstStrategy(e.request, CACHE_DATA));
  }
});

async function cacheFirstStrategy(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    // Offline fallback: return index.html for navigation requests
    if (req.mode === 'navigate') {
      return caches.match('./index.html') || new Response('Offline', { status: 503 });
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstStrategy(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    return caches.match(req) || new Response('Offline', { status: 503 });
  }
}

// ── Messages from app ─────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
