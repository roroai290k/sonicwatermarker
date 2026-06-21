// ── SonicWatermarker Service Worker ──────────────────────────
// バージョンを上げると古いキャッシュが自動削除されます
const CACHE_NAME = 'sonicwm-v4-3';
const CACHE_PREFIX = 'sonicwm-';
const APP_URLS = [
  new URL('./', self.registration.scope).href,
  new URL('./index.html', self.registration.scope).href
];

// ── install: キャッシュに登録 ──────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_URLS);
    })
  );
  self.skipWaiting();
});

// ── activate: 古いキャッシュを削除 ────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── fetch: キャッシュ優先 (Stale-While-Revalidate) ────────
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  if (APP_URLS.indexOf(event.request.url) === -1) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
      // キャッシュがあれば即返す＆バックグラウンドで更新
      var networkFetch = fetch(event.request).then(function(res) {
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(event.request, res.clone());
        }
        return res;
      }).catch(function() {
        return cache.match(APP_URLS[1]);
      });

      return cached || networkFetch;
      });
    })
  );
});

