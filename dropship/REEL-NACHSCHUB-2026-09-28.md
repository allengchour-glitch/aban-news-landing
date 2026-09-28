# Reel-Nachschub seit 27.09. tot — zwei Sperren hintereinander (28.09.2026, Verbesserungsrunde 04:25)

**GEMESSEN:** 4 Reels ready (Schwelle 5); Reel-Motor-Log seit 27.09. 20:00 nur «Shop-Ledger … Cursor Kategorie 278/578
Seite 10» (unverändert), kein «neue Reels». CJ-Takt-Bericht 04:00: Kosten-Nachtrag 91 Aufrufe, Reel-Motor 0.

**Sperre 1 — Reihenfolge + Vorrang:** `reel_engine_runner.sh` rief ZUERST den Video-Index (150 CJ-Aufrufe) und danach den
Motor. Hinter dem Kosten-Vorrang (bis 90 min Wartezeit) wurde der Index nie fertig, bevor der Container (~stündlich) neu
startete → der Motor lief nie. Fix: Motor zuerst, Index danach; `cj_takt.mjs` ANTEIL = `cj_video_reel_engine` darf trotz
Vorrang, höchstens 1 Aufruf je 90 s (`/tmp/cj_anteil_letzter`). Gemessen: erster Anteil-Aufruf 04:37:08.

**Sperre 2 — Download:** danach scheiterten 4/4 Kandidaten am Video-Download (`download-only-api.cjdropshipping.com` =
Proxy 403 aus der Cloud, bekannt seit 27.09.). Fix: Server-Weg im Motor — gesperrter Download → Auftrag
`auftraege/offen/cj-reelquellen-*.json` (Skript `cj_quellvideo_holen.mjs`, 3 Videos), Merkliste `dropship/_reel_serverquelle.txt`
(24 h, keine Doppel-Aufträge); der nächste Lauf nimmt `auftraege/ergebnis/*-rq-<pid>.mp4` statt curl. Nach 3 gesperrten
Kandidaten stoppt der Lauf (spart CJ-Punkte). Erster Auftrag 04:43 (Hundegeschirr, Dampfkochtopf, Fischschuppen-Entferner), gepusht.

**Beide Runner/Motoren neu gestartet** (Bash liest Skripte stückweise — laufende Kopie auf geänderter Datei).
**OFFEN:** Quittung des Servers abwarten; dann baut der nächste Lauf die 3 Reels (Tor prüft wie immer).
