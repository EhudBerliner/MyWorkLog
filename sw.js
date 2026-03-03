// MyWorkLog Service Worker v2.0.0
const APP_VERSION = '2.0.0';
const CACHE_NAME  = `mwl-${APP_VERSION}`;

const ASSETS = [
  './', './index.html', './manifest.json',
  './i18n.js', './app.js',
  './logo.png', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c =>
      Promise.allSettled(ASSETS.map(u => c.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k.startsWith('mwl-') && k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
  setTimeout(() => setInterval(checkUpdate, 300000), 15000);
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' })
      .catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' }})));
    return;
  }
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r && r.status === 200 && r.type !== 'opaque') {
        caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
      }
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function checkUpdate() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (d.version && d.version !== APP_VERSION) {
      (await self.clients.matchAll({ type: 'window' }))
        .forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE', version: d.version }));
    }
  } catch (_) {}
}
