const CACHE_NAME = 'hazoom-os-v2.8';
const ASSETS = [
  '/',
  '/index.html',
  '/server.js',
  '/health.js',
  '/manifest.json'
];

const PROXY_CACHE = 'hazoom-proxy-v1';
const NEWS_CACHE = 'hazoom-news-v1';
const MAX_PROXY_CACHE = 50;
const MAX_NEWS_CACHE = 100;

// Install — cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== PROXY_CACHE && k !== NEWS_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — offline-first strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Proxy requests — network first, cache fallback
  if (url.pathname === '/proxy') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(PROXY_CACHE).then(c => {
            c.keys().then(keys => {
              if (keys.length >= MAX_PROXY_CACHE) c.delete(keys[0]);
              c.put(e.request, clone);
            });
          });
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // RSS feeds — network first, cache fallback
  if (url.pathname.startsWith('/rss')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(NEWS_CACHE).then(c => {
            c.keys().then(keys => {
              if (keys.length >= MAX_NEWS_CACHE) c.delete(keys[0]);
              c.put(e.request, clone);
            });
          });
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
      .catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Message handler for cache management
self.addEventListener('message', e => {
  if (e.data === 'cacheNews') {
    fetch('/rss')
      .then(r => r.json())
      .then(feeds => {
        feeds.forEach(f => {
          fetch(`/rss/${f.id}`)
            .then(r => r.json())
            .then(data => {
              caches.open(NEWS_CACHE).then(c => {
                c.put(new Request(`/rss/${f.id}`), new Response(JSON.stringify(data), {
                  headers: { 'Content-Type': 'application/json' }
                }));
              });
            });
        });
      });
  }
  if (e.data === 'clearCache') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});
