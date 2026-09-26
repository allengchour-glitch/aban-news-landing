# Nullrunden: Katalog-Reiniger mit hängendem Cursor (25.09.2026, 20:30 UTC)

## Gemessen
- `bild_klein_fix`, `default_variant_fix`, `promo_aus_beschreibung` (Aufseher-Schleife, 4-h-Abkühlung)
  schrieben seit **14.09.** zusammen **537×** «FERTIG: 0 gescannt» (180 / 181 / 176).
- Ursache: Cursor-Datei wurde nach jeder Seite geschrieben, am Katalogende aber **nie gelöscht**.
  `/tmp/bildklein_cursor.txt` stand seit 14.09. 09:11 auf dem letzten Produkt → jeder Lauf fragte
  «nach dem letzten», bekam 0 und meldete FERTIG. Kein Traceback, keine Ampel.
- Dieselbe Klasse war am **19.09.** in `cj_verfuegbarkeit.py` schon behoben (Cursor ersatzlos raus) —
  die Geschwister wurden damals nicht mitgeprüft.
- Wirkung: Google meldet 27× «Image too small»; der Bild-Reiniger hätte Produkte mit grösserem
  Zweitbild selbst geheilt. Erster echter Lauf nach dem Fix: **2 Hauptbilder getauscht in den ersten 600**
  (Trinkflasche 209×666 → 800×800, Mondstein-Ring 437×449 → 1080×1080).

## Getan
- `automation/vollrunde.py`: `start()` / `weiter()` / `fertig()`. Am Ende fällt der Cursor weg;
  ein Stempel `.vollrunde` wird nur gesetzt, wenn die Runde **am Anfang begonnen** hat (`.begonnen`) —
  ein seit Tagen hängender Cursor zählt nicht als volle Runde. Danach `PAUSE` bis 7 Tage
  (`VOLLRUNDE_TAGE`). 5 synthetische Tests grün.
- Die drei Reiniger nutzen den Vertrag; je einmal gelaufen → Cursor gelöst, kein falscher Stempel.
- `automation/nullrunden_wache.py` in `engine_keepalive.sh`: meldet ein Log, wenn die letzten 3
  FERTIG-Zeilen alle «0 gescannt/geprüft» sind. Ergebnis-Nullen («0 Produkte bereinigt») zählen nicht;
  Ledger-Wächter (Bestand minus Ledger) stehen mit Grund in `LEDGER_NULL_OK`.

## Offen
- `bild_klein_fix` Vollrunde läuft (≈ 51'000 Produkte, Etappen über Neustarts); die beiden anderen
  starten nach der 4-h-Abkühlung aus dem Aufseher.
- Nicht geplante Cursor-Skripte ohne Rücksetzen (farbcode_clean, gmc_scan_fix, google_feed_cull,
  handle_dup_scan, orphan_scan, preis_lager_scan, qa_sweep8, versand_widerspruch_fix) laufen nicht —
  vor einem Wiederbeleben auf `vollrunde.py` umstellen.

## Nachtrag 26.09. 01:20 UTC — Fehlalarm der eigenen Wache
- Die Wache meldete die drei Reiniger nach der Freigabe weiter: die letzten 3 FERTIG-Zeilen blieben
  Nullen, weil die Freigabe selbst eine «FERTIG: 0» schreibt und danach in der Cloud kein voller Lauf kam.
- Gemessen (CJ-Takt-Zeitstempel 25./26.09.): Der Cloud-Container lebt nach einer Routine-Runde ohne
  Arbeit **genau ~5 min** (21:09–21:13, 22:08–22:13, 23:08–23:13, 00:08–00:13); längere Fenster nur, wenn
  eine Session arbeitet. Die Tages-Reiniger laufen dauerhaft auf dem Hetzner-Aufseher (80 Commits
  `luxe-waechter` in 24 h) — die Cloud-Logs sehen davon nichts.
- Fix: `vollrunde.fertig()` schreibt bei einer Freigabe `CURSOR-FREI`; `nullrunden_wache.py` wertet
  eine Null-Serie mit dieser Markierung im Fenster nicht als Befund (3 synthetische Fälle grün).
  Die drei Cloud-Logs tragen die Markierung nachgetragen (Freigabe 25.09. 20:30 UTC).
