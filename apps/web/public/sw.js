const CACHE_NAME = 'ledger-v2.4.0';
const assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/maskable-icon-512.png',
  '/assets/favicon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(assetsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      ))
    ])
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle http and https schemes (ignore chrome-extension://, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Skip API requests and cross-origin calls
  if (url.hostname.includes('api.gpnet.dev') || event.request.method !== 'GET') {
    return;
  }

  // Network-First for navigation (index.html) to ensure we get the latest hashed assets link
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // Cache-First for assets (hashed by Vite)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(fetchRes => {
          // If the request was successful and of a type we can cache, cache it
          if (fetchRes && fetchRes.status === 200 && fetchRes.type === 'basic') {
            const responseToCache = fetchRes.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return fetchRes;
        }).catch(err => {
          console.warn('[SW] Fetch failed for:', event.request.url);
          // Instead of returning null (which errors), we let the error bubble 
          // or return the original cachedResponse (which we know is null here).
          // But to avoid the TypeError, we MUST return a Response or just not handle the fetch.
          // Since we already called respondWith, we throw to let the browser handle the "Network Error"
          throw err;
        });
      })
  );
});
