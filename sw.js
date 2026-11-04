// Offline support. App files are network-first (so updates show up as soon as you're online)
// with the cache as a fallback; MapLibre is cache-first. Map tiles and fonts are served from cache
// and refreshed in the background, so streets you've viewed still show without a signal.
// Address lookups and team sync (Firestore) always go to the network.
const VERSION = 'knock-v10';
const TILES = 'knock-tiles';
const SHELL = [
  './', 'index.html', 'style.css', 'mapstyle.js', 'cloud.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const LIBS = [
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/pmtiles@3.2.1/dist/pmtiles.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([...SHELL, ...LIBS])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== TILES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // The region pack is read in small byte ranges; let those go straight to the network.
  if (url.pathname.endsWith('.pmtiles')) return;

  if (url.origin === location.origin) {
    // 'no-cache' revalidates with the server so a new version shows up right away, not after the
    // browser's own cache expires. Page loads (navigate requests) can't take options, so refetch by URL.
    const fresh = e.request.mode === 'navigate'
      ? fetch(e.request.url, { cache: 'no-cache' })
      : fetch(e.request, { cache: 'no-cache' });
    e.respondWith(
      fresh
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
    );
    return;
  }

  if (url.hostname === 'tiles.openfreemap.org') {
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; });
      return hit ? (net.catch(() => {}), hit) : net;
    }));
    return;
  }

  if (url.hostname === 'unpkg.com' || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
