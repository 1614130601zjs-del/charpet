const CACHE = 'charpet-shell-v6';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// CharPet is a Vite app with hashed production assets. Let the browser
// fetch the current app directly instead of keeping HTML/JS/CSS in a SW cache.
// This avoids stale PWA shells surviving a deployment.
