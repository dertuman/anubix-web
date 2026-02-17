self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('talkartech').then((cache) => {
      return cache.addAll([
        '/',
        '/en',
        '/es',
        '/index.html',
        '/manifest.json',
        '/logo-jpg-cropped.jpg',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip handling for navigation requests to allow proper locale redirects
  if (event.request.mode === 'navigate') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request, { redirect: 'follow' });
    })
  );
});
