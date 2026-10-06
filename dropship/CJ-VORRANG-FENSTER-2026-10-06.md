# CJ-Vorrang-Fenster lag 16 Stunden hinter dem Punkte-Reset (06.10.2026)

## GEMESSEN
- **Reset der CJ-API-Punkte = 00:00 UTC**, nicht 16:00. Runner-Log `cj_runner3.log`: 23:08 «Remaining: 0», 00:09 liest
  wieder Kategorien. Über alle fünf Grind-Logs: **20 von 37** Wechseln «leer → gelesen» in der Stunde 00, **0** in der
  Stunde 16. Deckt sich mit der CJ-Doku (points.html, «00:00 UTC», Journal 29.09.).
- **Topf heute leer um 04:09 UTC** (Used today 74'510). `cj_category_fill.mjs` (Grind, `product/list` = 50 Punkte) machte
  bis 10:00 1'001 von 2'680 CJ-Aufrufen dieser Maschine.
- Das Vorrang-Fenster stand fest auf **16:00–17:30 UTC** (Annahme 15.08. «Reset ~16:00»). Folge: der Video-Nachfüller
  (`cj_video_backfill.mjs`, startet nur im Fenster) fand am 05.10. um 16:14 sofort `16900500` → **0 Videos**; dasselbe
  Schicksal für Kosten-Nachtrag (VORRANG in `cj_takt`) und Bewertungs-Import. Video-Prio-Index: 335 sichtbare Produkte
  mit CJ-Video ohne Video auf der Seite.

## GETAN
- `automation/cj_vorrang_fenster.sh` — EINE Stelle für das Fenster: Startstunde aus `dropship/_CJ_PUNKTE_RESET_UTC`
  (jetzt `0`), Dauer 90 min → **00:00–01:30 UTC**. Grenzfälle getestet (23:59 aus, 00:00 an, 01:29 an, 01:30 aus).
- `engine_keepalive.sh` (Grind-Pause, Kühlungen Kosten/Bewertungen) und `fixer_keepalive.sh` (Prio-Jobs, Video-Start,
  Prio-Fenster-Block) lesen das Fenster jetzt aus dem Helfer statt `"16"` fest. Aufseher läuft die neue Fassung (md5).
- Wächter `automation/cj_reset_wache.py` (Selbsttest 6/6): misst den Reset stündlich an den Runner-Logs; Zeile
  «CJ-RESET: …» in jeder Keepalive-Ausgabe, **⚠️ wenn die Mehrheit der Wechsel nicht in der eingestellten Stunde liegt**
  (Gegenprobe mit Soll 16 → ⚠️). Dazu «Topf zuletzt leer ab HH:MM».

## OFFEN
- Erster Lauf im neuen Fenster: **07.10. 00:00 UTC** — nachmessen in `/tmp/cj_video_backfill.log` (Ziel: Videos > 0) und
  im Kosten-Nachtrag. Erst dann ist «Tag 8: ≥ 50 neue Produktvideos» erreichbar.
- Der Grind leert den Topf weiterhin in ~4 h. Falls das Fenster nicht reicht: Grind-Tagesdeckel (Anteil am Topf) als nächste Klasse.
- Die Routine-Beschreibung des Keepalives nennt noch «16:00–17:30» als gewollte Pause — die Keepalive-Ausgabe zeigt im
  Fenster «VORRANG-FENSTER (00:00-01:30 UTC)», damit ist ein «0 CJ-Runner» um 00:xx erklärt.
