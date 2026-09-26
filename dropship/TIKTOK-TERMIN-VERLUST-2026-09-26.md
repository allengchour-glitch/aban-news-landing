# TikTok/YouTube: übersprungene Kandidaten kosteten ganze 12-h-Termine (26.09.2026, 08:45 UTC)

## Gemessen
- Letzter TikTok-Post 24.09. 14:20 UTC; danach 25.09. 15:10 und 26.09. 04:08 je «⛔ Kein Post — Preis veraltet».
  YouTube: 26.09. 04:08 ebenso. ~42 h ohne TikTok, obwohl 17 postbare Reels warteten.
- Ursache: `metricool_tiktok_post.mjs` beendete sich beim Überspringen (Preis veraltet / Produkt nicht kaufbar) mit
  Exit 0. `social_autopilot.sh` wertet 0 als «gepostet» und setzt die 12-h-Marke → der Termin war weg.
- `meta_reel_post.mjs` hat seit 23.09. die Regel «Exit 3 = übersprungen, Marke bleibt alt». Der Metricool-Poster
  (22./23.09. gebaut) hat sie nie bekommen. Pinterest wählt intern den nächsten Kandidaten — nicht betroffen.

## Getan
- `metricool_tiktok_post.mjs`: beide Überspring-Pfade → Exit 3.
- `social_autopilot.sh`: TikTok und YouTube unterscheiden 0 (gepostet → Marke), 3 (übersprungen → nächster Durchlauf),
  sonst Fehler (Marke bleibt). Synthetischer Test 3/3 (0 → Marke gesetzt, 3 und 1 → offen).
- Autopilot neu gestartet (ohne laufenden Post); die zwei falsch gesetzten Marken zurückgenommen — beide Kanäle waren
  über 12 h ohne echten Post, die Kadenz wird nicht verkürzt.
- Nachgeholt: TikTok «Antihaft Silikon Küchenhelfer Set» (Metricool 382411507, 10:38 Zürich),
  YouTube «3-in-1 Bambus Dispenser» (382411515, 16:05 Zürich). Beide mit Preis- und ACTIVE-Prüfung.
