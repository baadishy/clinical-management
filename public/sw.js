self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Basic pass-through for now to satisfy PWA criteria
  e.respondWith(fetch(e.request));
});
