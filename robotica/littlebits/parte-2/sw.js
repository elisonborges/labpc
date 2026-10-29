/* Scope is limited to Part 2. Never intercepts or changes Part 1. */
const CACHE = 'labpc-littlebits-parte2-completa-v1';
const FILES = ['./', './index.html', './data.js', './engine.js', './style.css', './progress.js', './journey.js', './offline.js', './missao-1/app.js', ...Array.from({length:9}, (_,i) => './missao-'+(i+1)+'/'), ...Array.from({length:9}, (_,i) => './missao-'+(i+1)+'/index.html')];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('labpc-littlebits-parte2-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    // Every activity asset is versioned with this cache. An update installs a complete new set.
    return cached || fetch(event.request);
  }));
});
