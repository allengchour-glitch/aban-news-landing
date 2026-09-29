# Doppelte Zeilen in der Reel-Warteschlange (Verbesserungsrunde 29.09.2026, 04:25 UTC)

## Gemessen
- `automation/reels_seed.csv`: **5 IDs doppelt** (je 2 Zeilen). Zwei davon **beide `ready`**
  (`cjreel-9BDA360E-DE48-4110-9C53-5B03DAAD9885`, `cjreel-1356864306993565696`) — also dieselbe Datei zweimal zum Posten
  vorgesehen; die übrigen drei standen schon auf Sperr-Status. Eingefügt vom Commit f48673311 «Reel-Queue: 2 Zeilen
  nachgetragen» direkt nach den eigentlichen Neuzugängen; auch das Ledger `_cj_reel_gebaut.txt` trug beide IDs doppelt.
- Die Poster hätten den zweiten Post vermutlich über `_posted_media.txt` (Dateiname) abgefangen — Glück, kein Schutz: die
  Kadenz-Wache, die Säuberer-Zählung und die Jury hätten die Doppelzeile als eigenen Kandidaten behandelt.

## Ursachen
1. **`inCsv` im Reel-Motor erkannte nur Ziffern-IDs** (`/^cjreel-(\d+)/`). UUID-IDs (9BDA360E-…, 56A53647-…) galten nie als
   «in der Queue» → der Waisen-Nachtrag hängte sie erneut an.
2. **`appendReel` prüfte nicht**, ob die ID schon in der Datei steht (Ziffern-ID 1356864… kam trotzdem doppelt — die Zeile
   fehlte beim Start des Laufs kurz, parallele Schreiber/Merge, dieselbe Lost-Update-Klasse wie am 28.09.).

## Getan
- `cj_video_reel_engine.mjs`: `inCsv` = jede ID bis zum Komma; `appendReel` liest die Datei direkt vor dem Schreiben
  und hängt keine vorhandene ID an.
- `social_queue_saeubern.py` (täglich im Aufseher): Schritt **`dup-zeile-skip`** — mehrfach `ready` → erste bleibt; `ready`
  + schon `posted…` → auch die erste `ready`-Zeile wird markiert. Zeilengenau über die Textposition (Doppelzeilen sind
  textgleich), Zeilenzahl-Prüfung vor dem atomaren Schreiben. Kanarienvogel (posted+ready, ready×2, einfach) bestanden.
- Angewendet: 2 Doppelzeilen markiert, danach 0 doppelte `ready`.
