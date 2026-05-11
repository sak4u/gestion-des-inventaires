const CACHE_NAME = 'inventaires-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/manifest.json',
];

// Install: cache les assets de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: stratégie NetworkFirst pour l'API, CacheFirst pour les assets statiques
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) schemes (e.g. chrome-extension://) — they cannot be cached
  if (!url.protocol.startsWith('http')) return;

  // API calls → NetworkFirst
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth') || url.pathname.startsWith('/produits') || url.pathname.startsWith('/stock') || url.pathname.startsWith('/commandes') || url.pathname.startsWith('/flux') || url.pathname.startsWith('/entrepots') || url.pathname.startsWith('/fournisseurs') || url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/propositions')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Si offline et pas en cache, retourner la page offline pour les navigations
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
        })
    );
    return;
  }

  // Static assets → CacheFirst, fallback network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
