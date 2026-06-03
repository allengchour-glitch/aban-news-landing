# ABAN Files — STATUS / Memory (zuerst lesen)

> Dauerhafte Projekt-Memory für „ABAN Files" (YouTube-Shorts). Liegt hier statt in
> der Wurzel-`CLAUDE.md`, weil die von der Dropship-Session bespielt wird.
> Stand: 2026-06-03.

## Was es ist
Faceless YouTube-Shorts-Kanal (Sci-Fi/Ancient-Aliens). Sprecher **ABAN** (reptiloider
Herrscher). **Echten Owner-Namen NIE nennen** — nur „ABAN" / „we of ABAN".
Kanal = Haupt-Kanal `@allengchour` (umbenannt zu „ABAN Files").

## Stand
- **20 Folgen** (ep1–ep20) als fertige Clips in `clips/`.
- **Öffentlich auf YT:** ep1–ep13 (+ ep12=RBEaa5csRWY, ep13=ye2sgjpUxv8 u.a. in `video_ids.json`).
- **In der Queue (noch nicht gepostet):** ep14–ep20 → täglicher Cron postet automatisch.
- ep14–ep20 wurden mit den Voice-Fixes neu gerendert.

## Pipeline-Features (alle in `aban_stock.py`)
- Hook-Text in den ersten ~2.8 s (Retention).
- **Bild-zu-Text-Passung:** pro Satz passender Clip via Stichwort-Map `KW` (Mond→Mond …),
  exakt auf die Satzdauer getimt; Fallback = Episoden-Pool `SCENES`.
- **Kein Clip doppelt** (used-Set über alle Quellen).
- **Footage-Quellen:** Pexels + **Pixabay** (Env `PEXELS`, optional `PIXABAY`). NASA als 3.
  Quelle vorgeschlagen (kein Key) — noch nicht eingebaut.
- **ABAN deutsch ausgesprochen:** TTS bekommt „Ahbahn", Untertitel mappen zurück auf „ABAN".
- **Keine verschluckten Enden:** Videolänge = `max(Alignment, echte Audiolänge)+0.6`.
- Untertitel unten · Ambient-Musik · Dark-Grade. Länge: **neue Folgen ~75–90 s** (länger).

## Automatik
- `aban-youtube.yml` (täglich): postet nächste Folge aus `clips/` (vorgerendert) via
  vorhandene YT-Secrets. Render-in-CI bräuchte `XI`+`PEXELS`-Secrets (NICHT gesetzt → 401),
  daher **Clips lokal vorrendern + committen** (kein Secret nötig).
- `aban-director.yml` (alle 4 h): wertet Views aus, entscheidet (weiter / Gewinner
  ausbauen / nach 1 Woche < 100 Views → Pivot), Log in `reports/ABAN-DIRECTOR.md`.
- `aban-stats.yml` (wöchentl.): View-Report (Scrape, kein Key nötig).

## Neue Folge / neuer Vorrat (Workflow für die nächste Session)
1. `aban_scripts.json`: epN (title/hook/text, Ende „The ABAN Files. Check it out."), ~75–90 s.
2. `SCENES["epN"]` in `aban_stock.py` (12–18 thematische Queries).
3. Lokal rendern: `XI=… PEXELS=… [PIXABAY=…] python3 aban_stock.py epN` → `/tmp/aban_stock_epN.mp4`.
4. Komprimieren → `clips/epN.mp4` committen. Cron postet.

## Offen / Ideen
- NASA als 3. Footage-Quelle (kein Key, echtes Space-Material) — User hatte Interesse.
- View-Daten abwarten (~1 Tag+) → Bestperformer-Thema ausbauen (Director-Report lesen).
- Keys gehören in GitHub-Secrets (kann ich nicht setzen) ODER lokal vorrendern (aktueller Weg).
- Owner soll exponierte Keys rotieren (XI/PEXELS/Pixabay/HeyGen/gok_ standen im Chat).
