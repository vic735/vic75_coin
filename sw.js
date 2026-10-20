// Bump the version whenever the app assets change. New versions activate after
// existing game windows close, so a running match keeps a consistent build.
const CACHE = 'coin-duel-shell-v11';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './styles.css', './mobile.css', './reference.css', './screen.css', './minimal.css',
  './js/config.js', './js/data.js', './js/gacha.js', './js/battle.js',
  './js/flick.js', './js/flick-ui.js', './js/squad.js', './js/adventure.js', './js/presentation.js', './js/pwa.js', './js/app.js',
  './assets/coins/center-light.png', './assets/coins/center-dark.png', './assets/coins/frame-light.png', './assets/coins/frame-dark.png', './assets/coins/metal.png', './assets/coins/wood.png', './assets/coins/water.png', './assets/coins/fire.png', './assets/coins/earth.png',
  './assets/grain.svg', './assets/icon-192.png', './assets/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('coin-duel-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (cached) return cached;
    return fetch(event.request);
  })());
});
