/* aban Arcade — Service Worker
   Strategie: HTML/Navigation = network-first (Spiele bleiben aktuell, wir deployen oft),
   statische Assets (js/vendor, models, icons, audio) = stale-while-revalidate,
   Offline-Fallback auf die zuletzt gecachte Seite bzw. den App-Hub. */
var VERSION = "aban-arcade-v1";
var SHELL = [
  "/spiele.html",
  "/js/arcade.js",
  "/js/vendor/three.min.js",
  "/js/vendor/GLTFLoader.js",
  "/icons/arcade-192.png",
  "/icons/arcade-512.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      // tolerant: einzelne fehlende Assets brechen die Installation nicht ab
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isHTML(req) {
  return req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fremde Hosts unangetastet

  if (isHTML(req)) {
    // network-first: immer die aktuelle Seite, offline aus dem Cache
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) {
          return m || caches.match("/spiele.html");
        });
      })
    );
    return;
  }

  // statische Assets: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
