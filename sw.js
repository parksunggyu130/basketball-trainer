// 농구장에서 인터넷 없이도 열리도록 앱 파일을 캐시. 앱 파일은 캐시 먼저 보여주고 뒤에서 새로 받아둔다.
// 뼈대 인식(MediaPipe) 파일은 처음 한 번 받으면 캐시에서 쓴다.
var CACHE = 'bbtrain-v6';
var RUNTIME = 'bbtrain-rt-v1';
var CORE = ['./', './index.html', './drills.js', './drills2.js', './tips.js', './tips-ui.js', './patterns.js', './patterns-ui.js', './compare.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== RUNTIME; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
        return hit ? (net.catch(function () {}), hit) : net;
      });
    }));
  } else if (/cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models/.test(req.url)) {
    e.respondWith(caches.open(RUNTIME).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      });
    }));
  }
});
