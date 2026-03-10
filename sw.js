// ── SonicWatermarker Service Worker ──────────────────────────
// バージョンを上げると古いキャッシュが自動削除されます
const CACHE_NAME = 'sonicwm-v2';

// ── install: キャッシュに登録 ──────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(['./','./index.html']).then(function() {
        // Googleフォントは外部なので失敗しても続行
        return cache.add(
          'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap'
        ).catch(function() {});
      });
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
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── fetch: キャッシュ優先 (Stale-While-Revalidate) ────────
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // キャッシュがあれば即返す＆バックグラウンドで更新
      var networkFetch = fetch(event.request).then(function(res) {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE_NAME).then(function(c) {
            c.put(event.request, res.clone());
          });
        }
        return res;
      }).catch(function() {
        return caches.match('./index.html');
      });

      return cached || networkFetch;
    })
  );
});
