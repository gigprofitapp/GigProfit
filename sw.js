const CACHE_NAME = 'gigprofit-v9';
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
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
