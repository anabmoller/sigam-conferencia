/* SIGAM Checkpoint Scanner — Service Worker
 * Caches app shell + html5-qrcode for offline scanning.
 * Scans captured offline are held in IndexedDB by the page and flushed
 * when the browser is online again.
 */
const CACHE_NAME = 'sigam-checkpoint-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL).catch(() => {
        // Some CDN preflights may fail in some browsers; ignore so install succeeds.
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Supabase API calls — they must be live.
  if (url.hostname.endsWith('supabase.co')) return;

  // Cache-first for the app shell and static assets; network-first fallback.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin and CDN font/script responses opportunistically.
          if (res && res.status === 200 && (url.origin === self.location.origin ||
              url.hostname === 'unpkg.com' ||
              url.hostname.endsWith('gstatic.com') ||
              url.hostname.endsWith('googleapis.com'))) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // As a last resort, for navigation requests, return the cached shell.
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
