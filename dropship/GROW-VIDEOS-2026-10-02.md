# Grow-Videos pushen — 02.10.2026 (Betreiber «grow videos push»)

## GEMESSEN
- Grow-Deckel: 1'000 Produktvideos (Basic 250). Probe-Upload VIDEO: Ziel kommt mit URL → frei.
- `cj_video_backfill` (Lieferantenvideos): Ledger 403 Prüfungen, **375 «kein-video-beim-lieferanten» (93 % Leerlauf)** —
  die Vorrangliste war «sichtbare Ware», nicht «Ware mit Video». Lauf 06:24 heute: «CJ-Tagesbudget erschöpft».
- `dropship/_cj_video_index.json` kennt **1'068 CJ-pids aus unserem Sortiment MIT Video** → 512 aktive Shop-Produkte
  (Zuordnung über SKU `CJ-<pid>`), keines je im Nachtrag; 15 davon sichtbar (Startseite/Landeseiten).
- **107 rohe CJ-Produktvideos lagen schon lokal** (`auftraege/ergebnis/*-rq-<pid>.mp4`, Server-Downloads für den Reel-Motor),
  alle zu aktiven Produkten ohne Video.
- CJ-Video-Download aus der Cloud geht wieder (200, 6,9 MB; am 28.09. noch Proxy-403).

## GETAN
- `automation/video_lokal_anhaengen.mjs` (neu, Standard trocken): lokale CJ-Videos → Staged Upload VIDEO → productCreateMedia →
  bis READY verfolgt (FAILED → Medium weg) → Bild bleibt vorn; Ledger = Nachtrags-Ledger (`ok-lokal`); Eimer-Boden.
  Probe 3/3 READY (je ~30 s, Bild vorn), dann alle im Hintergrund.
- `automation/video_prio_index.py` (neu): baut täglich (a) `_video_prio_index.txt` = nur Produkte MIT CJ-Video, sichtbare zuerst
  (498 offen) und (b) `_video_lokal_paare.json` = lokale Videos ↔ Produkt (keine CJ-Aufrufe).
- Aufseher: Vorrang-Fenster-Lauf nutzt jetzt die Index-Liste (`PRIO=dropship/_video_prio_index.txt`); neuer Block hängt lokale
  Videos stündlich an, solange offen (kein Fenster nötig).

## ERWARTUNG
- Heute: bis 107 Videos aus lokalen Dateien. Ab 16:00 UTC: bis 250/Tag aus dem Index statt ~7 % Treffer. Zusammen ~600 von 1'000.

## LEHRE (Nebenbefund)
- `fixer_keepalive.sh` an Ort und Stelle zu überschreiben ist gefährlich, solange der Aufseher läuft (Bash liest stückweise).
  Diesmal lief keiner (Neustart); künftig nur mit os.replace (neue Datei-ID) schreiben.
