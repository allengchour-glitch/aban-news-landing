/* aban news — cookielose Reichweiten-Statistik (shared)
   ------------------------------------------------------------------
   Lädt Cloudflare Web Analytics: aggregiert, COOKIELOS, ohne
   personenbezogene Daten und ohne klassisches Tracking-Pixel.
   Beantwortet die eine wichtige Frage bei 0 Abonnenten:
   "Welche Seite bringt überhaupt Besucher?"

   Conversion (Klick auf "Abonnieren") wird NICHT hier gemessen,
   sondern von beehiiv selbst über die Anmelde-Quelle — so bleibt
   das Markenversprechen "kein Tracking-Pixel" gewahrt.

   AKTIVIERUNG (1 Schritt, Nutzer):
   1. Cloudflare-Dashboard → Web Analytics → Site hinzufügen.
   2. Den Token (z. B. "0123abcd...") unten bei CF_TOKEN eintragen.
   Solange der Platzhalter steht, tut diese Datei bewusst nichts.
   ES5-safe, keine Abhängigkeiten. */
(function () {
  'use strict';

  // ▼▼▼ HIER den Cloudflare-Web-Analytics-Token eintragen ▼▼▼
  var CF_TOKEN = 'CF_WEB_ANALYTICS_TOKEN';
  // ▲▲▲ bis dahin bleibt die Statistik inaktiv (no-op) ▲▲▲

  // Platzhalter erkannt → nichts laden (kein Konsolen-Lärm in Produktion).
  if (!CF_TOKEN || CF_TOKEN === 'CF_WEB_ANALYTICS_TOKEN') return;

  // Respektiere "Do Not Track".
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  } catch (e) {}

  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', '{"token":"' + CF_TOKEN + '"}');
  (document.head || document.documentElement).appendChild(s);
})();
