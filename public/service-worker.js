const STATIC_CACHE = 'static-v2';
const API_CACHE = 'api-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    self.skipWaiting();
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put('/index.html', networkResponse.clone());
        return networkResponse;
      } catch (error) {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match('/index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  if (sameOrigin && ['style', 'script', 'font', 'image'].includes(event.request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const networkResponse = await fetch(event.request);
      cache.put(event.request, networkResponse.clone());
      return networkResponse;
    })());
    return;
  }

  if (sameOrigin && (url.pathname.startsWith('/filters') || url.pathname.startsWith('/restaurants') || url.pathname.startsWith('/search'))) {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      const cached = await cache.match(event.request);
      try {
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })());
  }
});
