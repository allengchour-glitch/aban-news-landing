# Hängende Server-Quittungen automatisch schliessen (01.10.2026, Verbesserungsrunde)

## Gemessen
- Ampel «BOT-AUFTRAG HAENGT» seit 30.09. ~21 UTC stündlich: `cj-torquellen-2026-09-30-20-32-c` + `-e` (je 3 CJ-Quellvideos,
  0 von 6 angekommen), am Morgen dazu `pinterest-pin-2026-10-01-1` (von Hand geklärt: Pin existiert einmal).
- Jede Quittung sagt «von Hand prüfen» — passiert ist 8 h nichts; die Meldung wurde Rauschen.

## Getan
- `automation/auftrag_haenger_schliessen.py` (SCHARF=1 schreibt, sonst Trockenlauf): «laufend» > 3 h wird nur geschlossen,
  wenn das Nachholen nachweislich geregelt ist —
  - `cj_quellvideo_holen.mjs` → `abgebrochen` + Liste der fehlenden Videos (tor_quellen_anfragen.mjs fragt nach 24 h neu an),
  - `pinterest_pin_erstellen.mjs` → `abgebrochen-unklar` NUR wenn ein späterer Pin-Lauf fertig ist (liest vorher die Pinnwand),
  - `seite_text` / `screenshot` → `abgebrochen` (rein lesend).
  Unbekannte Auftragsarten bleiben «laufend» und werden weiter gemeldet. Schreiben atomar + Rücklesen.
- Stündlich im Aufseher (`fixer_keepalive.sh`, vor dem Pin-Planer), Push über `git_sichern.sh`.
- Kanarienvögel: Pin ohne Folgelauf → bleibt; Pin mit Folgelauf → geschlossen; unbekanntes Skript → bleibt.
- Lauf: 2 geschlossen (c, e), Ampel danach 0 «HAENGT».
