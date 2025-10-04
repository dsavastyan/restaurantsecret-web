const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';
const API_BASE = self.location.origin; // SW scope; API кешируем выборочно

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll([
    '/', '/index.html', '/manifest.webmanifest'
  ])));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Кэш статики: cache-first
  if (e.request.destination === 'document' || e.request.destination === 'style' || e.request.destination === 'script') {
    e.respondWith(caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((resp) => {
        const respClone = resp.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(e.request, respClone));
        return resp;
      });
    }));
    return;
  }

  // API GET: stale-while-revalidate (только GET)
  if (url.pathname.startsWith('/filters') || url.pathname.startsWith('/restaurants') || url.pathname.startsWith('/search')) {
    if (e.request.method !== 'GET') return;
    e.respondWith(caches.open(API_CACHE).then(async (c) => {
      const cached = await c.match(e.request);
      const network = fetch(e.request).then((resp) => {
        c.put(e.request, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || network;
    }));
  }
});
