# Reel-Motor prüft jetzt selbst gegen das Meisterwerk-Tor (30.09.2026)

## GEMESSEN
- `/tmp/social_autopilot.log` am 30.09. (Stand 12:27 UTC): **14 Reel-Postversuche, 14 vom Meisterwerk-Tor abgewiesen**, davon
  12 mit `HOOK < 3.0` (Bewegung in der ersten Sekunde; 2 zusätzlich `STILL` 82/91 %), 2 mit `BILDPREIS ≠ Caption`.
  Jeder Versuch kostet einen 15-Minuten-Durchlauf des Autopiloten ohne Post.
- Warteschlange `automation/reels_seed.csv`: 63 `ready`, schon 20 `meisterwerk-tor-skip` aus früheren Durchläufen.
- **Ursache:** `cj_video_reel_engine.mjs` rendert mit festem Einstieg `START=min(2, Dauer/4)` und prüft das Ergebnis nie —
  das Tor stand nur vor dem Posten (`meta_reel_post.mjs`, `metricool_tiktok_post.mjs`). Der Motor füllte die Queue also
  mit Reels, die der Poster wegwirft.
- Quellen (80 Lieferantenvideos in `auftraege/ergebnis/`, `automation/reel/hook_start.py`): Bewegung der 1. Sekunde am
  festen Einstieg (Standard 2 s) Median **6,2**, an der bewegtesten Sekunde Median **19,2** (je Quelle Median Faktor 2,7);
  **unter 3,0: 19 von 80 am Standard-Einstieg, 1 von 80 am gefundenen**; 10 Quellen hatten am Standard-Einstieg < 1,0
  (Standbild/Karton). Das sind Quellwerte — im fertigen Reel verdünnen Marken-Balken und Texte die Bewegung.
- Testrender Eierschüttler (`make_reel.sh`, gleiche Texte/Musik): Einstieg 4,87 s → Tor **bestanden** (HOOK 4,64,
  STILL 9 %, Bildpreis 19.90 = Caption).

## GETAN
1. `automation/reel/hook_start.py` (neu): misst die Quelle wie das Tor (96×170, 15 fps) und liefert die Startsekunde mit
   der höchsten Bewegung im 1-s-Fenster (≥ 6 s Material danach, erste 0,5 s ausgenommen).
2. `automation/cj_video_reel_engine.mjs`, Haupt- und Neu-Render-Pfad: `START` = gefundener Einstieg; danach
   `meisterwerk_tor.py` mit `PREIS_SOLL` = Live-Preis. Exit 4 → **nicht in die Queue**, pid nach
   `dropship/_reel_tor_abgelehnt.txt` (pid · Datum · Gründe) und nie wieder gefragt; Exit 2 (nicht messbar) → kein
   Eintrag, nächster Lauf versucht es neu. Neu-Render: bei Tor-Fehler bleibt die alte Fassung.
3. Bestand: siehe unten (Warteschlange gegen das Tor gemessen, Durchgefallene vorab markiert).

## OFFEN / Grenzen
- HOOK misst Pixeldifferenz, nicht Wirkung: die bewegteste Sekunde kann ein Szenenwechsel oder Blitz sein. Die
  Gemini-Jury (`gemini_jury.py`) sieht jedes Reel vor dem Post zusätzlich an.
- Unter hoher Last (Load 20) läuft tesseract im Tor in den 120-s-Timeout → Exit 2 «nicht messbar», kein Post. Kein Fehlurteil,
  aber verlorene Durchläufe.
