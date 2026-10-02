# Grind-Importer ohne Eimer-Boden — Verbesserungsrunde 02.10.2026, 04:30 UTC

## GEMESSEN
- Letzte Logzeilen: `cj_versand_ch_guard` (00:28, Ghost-Sale-Klasse), `sku_dup_scan` (03:11), `farbe_metafeld` (04:10) endeten mit
  «12x gedrosselt (Eimer dauerhaft leer)» — Lauf abgebrochen. Seit 01.10. 17× in /tmp-Logs.
- Shopify-Eimer 04:28 (6-s-Takt): 60 · 42 · 53 · 63 · 139 · 191 · 168 · 195 von 2'000.
- Schreiber zu dem Zeitpunkt: **5× `cj_category_fill.mjs`** (Grind, 4 Runner + Such-Runner) + Bild-/Video-/Reel-Schreiber.
  `fortura_image_backfill`, `cj_video_reel_engine` u. a. halten den Eimer-Boden (`eimer_etikette`, seit 22.09.);
  **`cj_category_fill`, `cj_sku_import`, `cj_trending_import` nicht** — die drei Grind-Importer, die seit 01.10. 16:20 wieder laufen.
- Zusatzfund: `cj_category_fill.sgql()` gab eine HTTP-200-Antwort mit `THROTTLED` als «fachlichen Fehler» zurück, ohne Wiederholung.

## GETAN
- `cj_category_fill.mjs`, `cj_sku_import.mjs`, `cj_trending_import.mjs`: `nachlauf()` aus `eimer_etikette.mjs` nach jeder Antwort
  (Boden 600, Ziel 1'000, Deckel 20 s) + THROTTLED wird wiederholt (4×, 4/8/12/16 s). Syntax geprüft; `nachlauf` gegen
  Probeantwort: voll → 0 s, 500/2'000 → 5 s gewartet.
- Wächter: Regel `eimer-fehlt` im zweiten Gehirn (`tools/zweites_gehirn.py`) — jede Datei mit productCreate/productSet ohne
  `eimer_etikette` wird gemeldet; Köder (cj_sku_import-Muster) gefangen, echter Fall durchgelassen, Selbsttest 14/14.
  Grundlinie neu: 19 Alt-Anleger (POD-Erzeuger, BigBuy — alle nicht laufend) als bekannt, 0 NEU.
- Kein Neustart von Hand: cj_perpetual startet die Importer als Kindprozesse je Kategorie neu → neuer Code ab dem nächsten Kind.

## OFFEN
- Nachmessung des Eimers nach dem nächsten Grind-Zyklus; die drei gestorbenen Wächter holt der Aufseher nach (`absturz_nachholen`).
