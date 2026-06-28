/* aban news — Klick-Insights (transparent, anonym, cookielos) — OFF by default.
   ------------------------------------------------------------------------------
   Zeigt AGGREGIERT, wo Besucher klicken (welche Buttons/Links/Tool-Karten) —
   OHNE Cookie, OHNE IP-Speicherung, OHNE Personendaten, OHNE Fingerprint.
   Sendet pro Klick nur: { Pfad, kurzes Label }. Respektiert „Do Not Track".

   MARKENVERSPRECHEN: Solange ON=false bleibt, passiert NICHTS (keine Requests).
   Erst wenn DU es bewusst aktivierst, werden anonyme Klicks gezählt — und das
   gehört dann in die Datenschutzerklärung (Textbaustein liegt bereit).

   AKTIVIEREN (Nutzer):
     1. ON = true setzen (unten).
     2. In Cloudflare Pages eine KV-Namespace-Bindung `CLICK_KV` anlegen.
     3. Env `CLICK_STATS_KEY` (geheim) setzen → Auswertung unter /klick-statistik.html.
   ES5-safe, keine Abhängigkeiten. */
(function () {
  'use strict';
  var ON = false;                 // ▲ bewusst aus — auf true setzen zum Aktivieren
  if (!ON) return;
  try { if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1') return; } catch (e) {}
  if (!navigator.sendBeacon) return;

  function label(el) {
    var a = el.closest && el.closest('a,button,[data-ci]');
    if (!a) return null;
    var t = a.getAttribute('data-ci')
         || (a.getAttribute('aria-label') || '').trim()
         || (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
         || a.getAttribute('href') || a.tagName.toLowerCase();
    return t;
  }
  document.addEventListener('click', function (ev) {
    try {
      var l = label(ev.target);
      if (!l) return;
      var data = JSON.stringify({ p: location.pathname.slice(0, 80), l: String(l).slice(0, 80) });
      navigator.sendBeacon('/api/click', new Blob([data], { type: 'application/json' }));
    } catch (e) {}
  }, true);
})();
