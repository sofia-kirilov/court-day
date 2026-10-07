// Service worker: lets Court Day install like an app and open without internet.
var CACHE = "court-day-v1";
var FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png",
  "ocr/tesseract.min.js", "ocr/worker.min.js", "ocr/tesseract-core-simd-lstm.wasm.js", "ocr/tesseract-core-lstm.wasm.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  var big = url.pathname.indexOf("/ocr/") >= 0;
  if (big) {
    // The reader files never change: use the saved copy, fetch once if missing.
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return res; });
    }));
  } else {
    // Everything else: newest version when online, saved copy when offline.
    e.respondWith(fetch(e.request).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return res; })
      .catch(function () { return caches.match(e.request).then(function (hit) { return hit || caches.match("index.html"); }); }));
  }
});
