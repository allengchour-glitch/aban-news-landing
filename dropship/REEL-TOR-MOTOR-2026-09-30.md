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
- ~~Testrender Eierschüttler: Einstieg 4,87 s → Tor bestanden (HOOK 4,64)~~ — **KEIN BELEG (korrigiert 14:50 UTC):** der Test lief
  über den `make_reel.sh`-Zweig ohne Stimme/2-Pass, der `START` nie las; das Reel begann bei 0 s. Nach dem Fix (s. Nachtrag 2)
  gemessen: gleiche Quelle, Texte, Musik — **Einstieg 0 s → HOOK 4,65 · Einstieg 4,87 s → HOOK 19,94**; Bild bei 0,5 s
  unterscheidet sich um 103 Graustufen (also wirklich andere Stelle).

## GETAN
1. `automation/reel/hook_start.py` (neu): misst die Quelle wie das Tor (96×170, 15 fps) und liefert die Startsekunde mit
   der höchsten Bewegung im 1-s-Fenster (≥ 6 s Material danach, erste 0,5 s ausgenommen).
2. `automation/cj_video_reel_engine.mjs`, Haupt- und Neu-Render-Pfad: `START` = gefundener Einstieg; danach
   `meisterwerk_tor.py` mit `PREIS_SOLL` = Live-Preis. Exit 4 → **nicht in die Queue**, pid nach
   `dropship/_reel_tor_abgelehnt.txt` (pid · Datum · Gründe) und nie wieder gefragt; Exit 2 (nicht messbar) → kein
   Eintrag, nächster Lauf versucht es neu. Neu-Render: bei Tor-Fehler bleibt die alte Fassung.
3. Bestand gemessen (12:53–13:1x UTC, Tor ohne Bildpreis-OCR): **65 `ready`-Reels → 37 bestanden, 28 durchgefallen**
   (28× HOOK < 3,0, davon 4 auch STILL > 50 %). Die bei der Markierung noch `ready` standen (16; die übrigen hatten Poster
   bzw. Jury inzwischen selbst quittiert), stehen jetzt auf `meisterwerk-tor-skip` — zurückgelesen 16/16. Danach 23 `ready`
   (die Jury sperrte parallel weitere). Jeder Abweis hätte einen 15-min-Autopilot-Durchlauf gekostet.

## OFFEN / Grenzen
- HOOK misst Pixeldifferenz, nicht Wirkung: die bewegteste Sekunde kann ein Szenenwechsel oder Blitz sein. Die
  Gemini-Jury (`gemini_jury.py`) sieht jedes Reel vor dem Post zusätzlich an.
- Unter hoher Last (Load 20) läuft tesseract im Tor in den 120-s-Timeout → Exit 2 «nicht messbar», kein Post. Kein Fehlurteil,
  aber verlorene Durchläufe.

## Nachtrag 14:00–14:35 UTC — Reparaturweg und OCR-Stau
- **Gesperrt ≠ verloren:** `reel/reel_neu_rendern.py MODUS=hook` schneidet `meisterwerk-tor-skip`-Reels mit der bewegtesten
  Sekunde neu; Tor Pflicht; bestanden → Zeile zurück auf `ready` (frisch gelesen, nur noch gesperrte Zeilen, atomar). Seit heute
  nimmt auch der Fenster-Modus den gefundenen Einstieg. Täglich im Aufseher (`reel_tor_reparatur`, mit `git_sichern.sh`).
- **Fehlende Quellen:** `reel/tor_quellen_anfragen.mjs` holt die CJ-Videoadresse (API, `cj_takt`) und legt Server-Aufträge
  (≤ 3 Videos je Auftrag) an — 22 gesperrte ohne Quelle → 18 angefragt in 6 Aufträgen, 4 ohne CJ-Video. Erste Quellen kamen
  binnen Minuten an; der laufende Neu-Schnitt nahm sie mit. Falle beim Bau: zeilenweise Suche in `reels_seed.csv` fand 0 —
  Captions tragen Zeilenumbrüche; jetzt RFC-4180-Parser.
- **OCR-Stau (gemessen 14:31 UTC):** Load **50** auf 4 Kernen, **11 verwaiste `tesseract`** (Eltern = PID 1, bis 826 s alt).
  Folge: das Tor lief im Reel-Motor an seine OCR-Grenze (120 s) → «nicht messbar» → **5 von 6 fertigen Reels verworfen**.
  Ursache: `bildtext_pruefen.py` rief `image_to_data` ohne Timeout; ein äusseres `timeout` beendet nur Python, das Kind
  läuft weiter; ohne `OMP_THREAD_LIMIT` nimmt jeder Aufruf alle Kerne.
  Fix: `bildtext_pruefen.py` → `OMP_THREAD_LIMIT=1` + `timeout=OCR_TIMEOUT` (90 s, pytesseract beendet sein Kind; Überschreitung
  = RuntimeError, kein stilles «sauber»); `meisterwerk_tor.py` → 1 Thread, 240 s; `automation/ocr_waisen.sh` jede
  Aufseher-Runde (nur tesseract mit Eltern-PID 1 und > 300 s). 8 + 5 Waisen beendet; Load 50 → 17 in 3 Minuten.
  Kanarienvogel: `sleep` als «tesseract» per setsid (Eltern-PID 1) → beendet; Aufrufe mit python-Eltern unberührt.
  ⚠️ Erste Regel «Eltern ≠ python/node» war zu breit (traf im Test mit Schwelle 0 auch junge Prozesse) → auf Eltern-PID 1 eingeengt.

## Nachtrag 2 (14:50 UTC) — der Einstieg wirkte im Neu-Schnitt gar nicht
Der erste `MODUS=hook`-Lauf: **13/13 wieder am Hook-Tor gescheitert** (0,03–2,09). Ursache: `make_reel.sh` hat zwei Render-Zweige;
nur der mit `STIMME`/`LAUTHEIT_2PASS` las `START`. `reel_neu_rendern.py` (und mein erster Testrender) liefen über den anderen —
jedes Reel begann bei Quellsekunde 0. Der Reel-Motor setzt `LAUTHEIT_2PASS=1` (Runner) und war nicht betroffen.
Fix: gleicher Eingangs-Seek `-ss "${START:-0}"` im zweiten Zweig. Gegenprobe siehe oben (4,65 → 19,94). Neu-Schnitt neu gestartet.
**Lehre:** ein Parameter, der «übergeben» wird, ist erst belegt, wenn das ERGEBNIS sich mit ihm ändert (A/B am Ausgang).

## Ergebnis Neu-Schnitt (15:05 UTC, nach dem START-Fix)
`MODUS=hook SCHARF=1`: **22 ersetzt (21 Zeilen wieder `ready`)**, 2 am Tor durch `STILL` 73/91 % (Quelle zu ruhig — bleiben gesperrt),
10 ohne Quelle (4 ohne CJ-Video, 6 Server-Quellen noch unterwegs → nächster Tageslauf). Queue: `meisterwerk-tor-skip` 36 → 15,
`ready` 23 → 49 (inkl. neuer Motor-Reels). Kontaktbogen 8 Stichproben (Bild 0,3 s + 5 s): Produkt ab Bild 0 sichtbar in 8/8.
⚠️ 1745702295637073920 (Sternenhimmel-Projektor Kinder) trägt englischen Lieferantentext im Video («with multiple color
combinations») — die Gemini-Jury im Poster prüft Lieferantentext als K.-o.; nicht von Hand freigegeben.
⚠️ 1586604104162488320 steht zweimal in der Queue (Säuberer-Schritt `dup-zeile-skip` räumt ab).
