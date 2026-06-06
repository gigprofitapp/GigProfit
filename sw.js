const CACHE = 'gigprofit-v3';
const ASSETS = [
  '/GigProfit/',
  '/GigProfit/index.html',
  '/GigProfit/css/styles.css',
  '/GigProfit/js/app.js',
  '/GigProfit/manifest.json',
  '/GigProfit/icons/icon-192.png',
  '/GigProfit/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
