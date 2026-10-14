# Reel-Reparatur brach ab: Regex-Kopie statt Import (14.10.2026, Verbesserungsrunde 00:25 UTC)

## GEMESSEN
- `/tmp/reel_tor_reparatur.log` (14.10. 00:10) und `/tmp/reel_preis_reparatur.log` (13.10. 22:34) endeten mit
  `ReferenceError: PRAEP is not defined` — **jede** Tor- und Preis-Reparatur seit dem 13.10. abends brach ab, bevor ein
  Reel neu gerendert wurde (4 Reels `preis-veraltet-skip` warteten).
- Ursache: `automation/reel/reel_neu_rendern.py` holte `kurzTitel()` und `zeilen()` per **Regex aus dem Quelltext** von
  `cj_video_reel_engine.mjs` und führte sie mit `eval` aus. Seit der Reel-Nacharbeit vom 13.10. (R9 Schritt 3) braucht
  `zeilen()` die Modul-Konstante `PRAEP` — die kopierte die Regex nicht mit.
- Die Ausgabe lief im Aufseher durch `grep -E 'ERSETZT|DURCHGEFALLEN|FERTIG'`: der Traceback stand nur im Log, kein
  Signal in der Ampel. Gefunden hat ihn die Verbesserungsrunde (Schritt 3, «Traceback in den letzten Zeilen»).

## GETAN
- **Eine Quelle:** `automation/lib/reel_titel.mjs` (`PRAEP`, `kurzTitel`, `zeilen`, unverändert verschoben). Der Motor
  importiert sie, `reel_neu_rendern.py` importiert sie per `node -e "import(...)"`.
- **Gleichlauf GEMESSEN:** 600 echte Titel aus `social/posts_image.csv` → alte Funktion (mit PRAEP) = neues Modul **600/600**.
- **Wächter:** `python3 automation/reel/reel_neu_rendern.py --selbsttest` — 4 Kanarien mit festen Zeilen, Motor importiert
  (definiert nicht selbst), keine Datei kopiert `zeilen`/`kurzTitel` mehr per Regex aus dem Motor. **Gegenprobe:** alte
  Fassung von `reel_neu_rendern.py` → als Kopie erkannt; alter Motor → «definiert selbst» erkannt; `bild_reel_auswahl.py`
  (kopiert nur `thema`, eigener py=js-Gleichlauftest) → kein Fehlalarm.
- **Aufseher:** Tor- und Preis-Reparatur laufen nur nach grünem Selbsttest; sonst Zeile
  «⚠️ REEL-NEURENDERN Selbsttest rot» im Log statt eines Abbruchs mitten im Lauf.
- **Nachlauf:** `MODUS=preis SCHARF=1` → «FERTIG: 0 ersetzt, 4 nicht» — kein Absturz mehr; die 4 Reels fallen am
  Qualitätstor durch («STILL 55 %», ruhige Quellvideos) und bleiben zu Recht gesperrt.

## Regel
Eine Funktion, die ein anderes Skript braucht, wird **exportiert und importiert** — nie per Regex aus dem Quelltext
kopiert. Die Kopie bricht, sobald die Funktion eine neue Abhängigkeit bekommt, und niemand merkt es.

## OFFEN (nächste Runde)
- `/tmp/mobilfunk_netz.log`: `FileNotFoundError dropship/_klassen/mobilfunk-kandidaten.txt` (2G/3G-Wächter, 14.10. 00:16).
