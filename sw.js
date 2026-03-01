// ============================================================
//  MyWorkLog Service Worker v1.0.1 — FIXED
// ============================================================

const APP_VERSION   = '1.0.0';
const CACHE_NAME    = `mwl-cache-${APP_VERSION}`;
const POLL_INTERVAL = 300000;

// ✅ נתיבים מתוקנים לפי מבנה תיקיות אמיתי
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/i18n.js',
  './manifest.json',
  './icons/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ---- INSTALL ----
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // addAll fails if ANY file 404s — cache individually to be safe
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('SW cache miss:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE ----
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('mwl-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
  // ✅ setInterval moved OUTSIDE e.waitUntil — won't block activation
  setTimeout(() => {
    setInterval(() => checkForUpdate(), POLL_INTERVAL);
  }, 10000); // First check after 10s
});

// ---- FETCH ----
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // version.json: always fresh from network
  if (e.request.url.includes('version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // External requests (fonts, APIs): network only
  if (!e.request.url.startsWith(self.location.origin)) return;

  // App files: Cache First, fallback to network, fallback to index.html
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// ---- MESSAGES ----
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CHECK_UPDATE') checkForUpdate();
});

// ---- UPDATE CHECK ----
async function checkForUpdate() {
  try {
    const res  = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (data.version && data.version !== APP_VERSION) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({
        type: 'UPDATE_AVAILABLE',
        version: data.version,
        current: APP_VERSION
      }));
    }
  } catch (_) {
    // Silently fail — no network
  }
}
