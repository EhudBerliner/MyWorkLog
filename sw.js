// ============================================================
//  MyWorkLog Service Worker v1.0.0
// ============================================================

const APP_VERSION  = '1.0.0';
const CACHE_NAME   = `mwl-cache-${APP_VERSION}`;
const POLL_INTERVAL = 300000;

const STATIC_ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/i18n.js', './manifest.json',
  './icons/logo.png', './icons/icon-192.png',
  './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mwl-cache-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
  setInterval(() => checkForUpdate(), POLL_INTERVAL);
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('version.json')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (!e.request.url.includes(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CHECK_UPDATE') checkForUpdate();
});

async function checkForUpdate() {
  try {
    const res  = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (data.version && data.version !== APP_VERSION) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE', version: data.version, current: APP_VERSION }));
    }
  } catch (_) {}
}
