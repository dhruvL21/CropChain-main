const CACHE_NAME = 'cropchain-cache-v3';

// Add core paths here to precache them statically
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/marketplace',
  '/dashboard/profile',
  '/dashboard/shop',
  '/dashboard/schemes',
  '/dashboard/my-listings',
  '/dashboard/my-offers',
  '/offline',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Don't fail the entire install if precache fails, just cache what we can
      return Promise.allSettled(
        PRECACHE_ASSETS.map(asset => 
          cache.add(asset).catch(e => console.warn(`[SW] Precaching failed for ${asset}`, e))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network First, fallback to Cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // We only want to handle GET requests for our origin
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Certain paths we don't want to intercept (e.g. Next.js hot reload)
  if (
    request.url.includes('/_next/webpack-hmr') ||
    request.url.includes('/_next/development/')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Try getting fresh response from network
        const networkResponse = await fetch(request);

        // Put a copy in the cache if the response is ok
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        console.log(`[SW] Network request failed for ${request.url}, relying on cache.`);
        // Network failed, try returning from the cache
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // If we don't have it in the cache and it's navigation, return a generic fallback
        if (request.mode === 'navigate') {
          const fallbackResponse = await cache.match('/dashboard/marketplace');
          if (fallbackResponse) {
             return fallbackResponse;
          }
           // Worst case, let it fail natively which will show Chrome's dino or standard offline page.
        }
        
        // Return a broken response if not found
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
