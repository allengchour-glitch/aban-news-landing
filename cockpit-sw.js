/* aban Business-Cockpit — Service Worker
   Macht die Cockpit-App offline nutzbar. Cached NUR die App-Seite + ihre Icons;
   alle anderen Anfragen laufen unangetastet durchs Netz (stört den Rest der Site nicht). */
var CACHE = "aban-cockpit-v1";
var ASSETS = [
  "/cockpit-app.html",
  "/cockpit.webmanifest",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE && k.indexOf("aban-cockpit") === 0;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isApp(url) {
  var u = new URL(url);
  if (u.origin !== self.location.origin) return false;
  return u.pathname === "/cockpit-app.html" || u.pathname === "/cockpit-app" || ASSETS.indexOf(u.pathname) >= 0;
}
function keyFor(url) {
  var u = new URL(url);
  return u.pathname === "/cockpit-app" ? "/cockpit-app.html" : u.pathname;
}

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (!isApp(e.request.url)) return; // pass-through: SW ignoriert den Rest der Website
  var key = keyFor(e.request.url);
  e.respondWith(
    caches.match(key).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (ca) { ca.put(key, copy); });
        return resp;
      }).catch(function () { return caches.match("/cockpit-app.html"); });
    })
  );
});
