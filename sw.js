/**
 * sw.js — Service Worker para My K5
 * Usa Cache-First para assets estáticos, Network-First para HTML
 */

const CACHE_NAME = 'myk5-v2';

// Assets que se cachean al instalar
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './css/components.css',
  './css/animations.css',
  './js/icons.js',
  './js/state.js',
  './js/utils.js',
  './js/db.js',
  './js/app.js',
  './js/dashboard.js',
  './js/fuel.js',
  './js/wash.js',
  './js/maintenance.js',
  './js/expenses.js',
  './js/trips.js',
  './js/history.js',
  './js/statistics.js',
  './js/vehicle.js',
  './js/backup.js',
  './assets/images/k5.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.json',
];

// ─── Install: precache assets ────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache individually to avoid failing on missing files
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] No se pudo cachear:', url, e.message))
        )
      );
    })
  );
});

// ─── Activate: clean old caches ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch strategy ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin (CDN, etc.)
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // HTML → Network-First (always fresh)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets → Cache-First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => {
        // If offline and not cached, return nothing (let browser handle)
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
