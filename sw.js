// Bump the version whenever the app assets change. New versions activate after
// existing game windows close, so a running match keeps a consistent build.
const CACHE = 'coin-duel-shell-v31';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './js/vendor/qrcode.js', './js/vendor/jsQR.js', './js/vendor/qrcode-LICENSE.txt', './js/vendor/jsQR-LICENSE.txt', './js/network/qr.js', './network.css', './js/network/protocol.js', './js/network/signaling.js', './js/network/commitReveal.js', './js/network/multiplayer.js', './js/network/webrtc.js', './js/network/session.js', './js/network/connectionUI.js',
  './styles.css', './mobile.css', './reference.css', './screen.css', './minimal.css',
  './js/config.js', './js/data.js', './js/gacha.js', './js/battle.js',
  './js/flick.js', './js/flick-ui.js', './js/squad.js', './js/adventure.js', './js/progression.js', './js/presentation.js', './js/pwa.js', './js/tour.js', './js/help.js', './js/app.js',
  './assets/coins/composed/light-metal.png', './assets/coins/composed/light-wood.png', './assets/coins/composed/light-water.png', './assets/coins/composed/light-fire.png', './assets/coins/composed/light-earth.png', './assets/coins/composed/light-none.png', './assets/coins/composed/dark-metal.png', './assets/coins/composed/dark-wood.png', './assets/coins/composed/dark-water.png', './assets/coins/composed/dark-fire.png', './assets/coins/composed/dark-earth.png', './assets/coins/composed/dark-none.png', './assets/coins/composed/coating-metal.png', './assets/coins/composed/coating-wood.png', './assets/coins/composed/coating-water.png', './assets/coins/composed/coating-fire.png', './assets/coins/composed/coating-earth.png',
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
