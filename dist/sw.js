// VFIED Service Worker - Cache Management & Offline Support
const VERSION = 'vfied-v8';  // Bumped version to bust cache
const CACHE_NAME = `vfied-${VERSION}`;

const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/style.css',
  '/manifest.json',
  '/data/local_lists.json',
  '/data/travel_lists.json',
  '/data/events.json'
];

const API_CACHE_PATTERNS = [
  '/v1/recommend',
  '/v1/quick_decision',
  '/health'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log(`🔧 SW ${VERSION} installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log(`✅ SW ${VERSION} installed`);
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ SW install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`🚀 SW ${VERSION} activating...`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('vfied-') && cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log(`🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log(`✅ SW ${VERSION} activated`);
        return self.clients.claim();
      })
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external domains (except our API)
  if (!url.origin.includes(self.location.origin) && 
      !url.origin.includes('vfied-v3.onrender.com') &&
      !url.origin.includes('localhost:3001')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If fetch succeeds, update cache and return response
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If fetch fails, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              console.log(`📦 Serving from cache: ${event.request.url}`);
              return response;
            }
            
            // If not in cache and it's an HTML request, return index.html
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Otherwise, return a basic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});