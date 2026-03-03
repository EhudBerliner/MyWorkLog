// ═══════════════════════════════════════════════════════
//  MyWorkLog Service Worker  v1.4.0
//  Handles: caching, version checks, background sync
// ═══════════════════════════════════════════════════════

const APP_VERSION = '1.4.0';
const CACHE_NAME  = `mwl-${APP_VERSION}`;
const SYNC_TAG    = 'sync-logs';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './config.js',
  './app.js',
  './styles.css',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

/* ── Install ─────────────────────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ────────────────────────────────────────── */
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

/* ── Fetch ───────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(
        () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
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

/* ── Messages from app ───────────────────────────────── */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── Background Sync (Task 3) ─────────────────────────── */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-logs') {
    e.waitUntil(flushSyncQueue());
  }
});

async function flushSyncQueue() {
  // SW cannot read localStorage directly.
  // Signal all open app windows to perform the sync via postMessage.
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type: 'SW_REQUEST_SYNC' }));
}

/* ── Version check ───────────────────────────────────── */
async function checkUpdate() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (d.version && d.version !== APP_VERSION) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE', version: d.version }));
    }
  } catch (_) {}
}
