// 농구장에서 인터넷 없이도 열리도록 앱 파일을 캐시. 앱 파일은 캐시 먼저 보여주고 뒤에서 새로 받아둔다.
// 뼈대 인식(MediaPipe) 파일은 처음 한 번 받으면 캐시에서 쓴다.
var CACHE = 'bbtrain-v32';
var RUNTIME = 'bbtrain-rt-v1';
var CORE = ['./', './index.html', './drills.js', './coach.js', './coach2.js', './mycoach.js', './tips.js', './tips-ui.js', './patterns.js', './patterns-ui.js', './compare.js', './journal.js', './board.js', './help.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  // cache:'reload' = 브라우저가 기억해 둔 예전 파일(최대 10분)을 쓰지 말고 꼭 새로 받기. 안 그러면 새 버전에 옛 파일이 들어감
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
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
        var net = fetch(req, { cache: 'no-cache' }).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
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
