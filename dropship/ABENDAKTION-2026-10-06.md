# Abendaktion 06.10.2026 — «Ziel heute 1 Verkauf»

## GEMESSEN (17:00 UTC)
- Heute 36 Sitzungen (direct 17, social 14, search 5) → 1 Warenkorb → 1 Checkout → 0 Kauf.
- Klaviyo: Email List 2, Newsletter 4 Profile → Mail-Aktion wirkungslos. Grösste gemessene Checkout-Hürde: CHF 7 Versand unter
  CHF 45 (5/7 Abbruch-Körbe, `WARENKORB-GRATISVERSAND-2026-10-06.md`).
- Alle meistbesuchten Produkte sind schon gepostet (Doppelpost-Regel) → Aktions-Story ohne Produkt.

## GETAN
- `automation/abendaktion.py --start 2026-10-06T21:59:00Z` (SCHARF): automatischer Rabatt «Abendaktion: Gratisversand ohne
  Mindestbetrag» (CH, kombinierbar, endet 23:59 Schweizer Zeit von selbst) · Ankündigungsleiste Block 1 «🚚 Nur heute bis 24 Uhr:
  Gratisversand auf alles – ohne Mindestbetrag» (WebFetch bestätigt live) · Warenkorb-Hinweis mit Zeitbedingung (zeigt bis 24 Uhr
  «Gratisversand inklusive» auch unter CHF 45, danach automatisch wieder «Versand CHF 7 · noch X»).
- Aufräumen: `engine_keepalive.sh` ruft stündlich `abendaktion.py --aufraeumen` → nach Ablauf Leiste zurück + Zeitbedingung raus
  (Zustand `dropship/_abendaktion.json`). Der Rabatt läuft selbst aus.
- Story-Karte `social/stories/story_abendaktion-2026-10-06.jpg` → Metricool IG + FB Story (389663280 / 389663282), Ledger
  `social/story_queue.csv`.

## OFFEN
- Morgen messen: Käufe/Checkouts 18–24 Uhr; wenn die Aktion einen Kauf bringt → als wiederholbares Werkzeug für ruhige Abende.
- Werkzeug wiederverwendbar: `SCHARF=1 python3 automation/abendaktion.py --start <ISO-Ende> [--text "…"]`.
