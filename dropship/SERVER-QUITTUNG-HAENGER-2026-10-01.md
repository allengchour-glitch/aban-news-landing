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

---

# Nachtrag 22.10.2026 (Runde 12:25): rein lesender Tageslauf stand 12 h auf «laufend»

## Gemessen
- Ampel «BOT-AUFTRAG HAENGT» für `server-zustand-2026-10-22` (Wartung `waechter_zustand`, in `server/wartung.mjs` mit `aendert: false`, wiederkehrend alle 1 Tag):
  Claim `Auftrag … beginnt` um **00:16:14 UTC**, danach nie eine Schlussquittung. Der Agent lebte weiter: nächster Claim 00:36:40, zehn Pin-Aufträge bis 02:48, Storefront 07:05→07:16 «erledigt», Bot-Puls stündlich.
  Am 20.10. und 21.10. lief derselbe Auftrag durch (`ok`; 21.10.: 1 Minute).
- Die Reihe kommt von selbst wieder: `faellige_anlegen()` im Runner entscheidet an der DATEI `<id>-<Datum>.json` in `offen/` oder `erledigt/`, nicht am Stand (Quelltext gelesen). Ein «laufend» blockiert den 23.10. nicht.
- Der Schliesser vom 01.10. kannte nur vier Auftragsarten (Download, Pin, `seite_text`, `screenshot`) — eine lesende **Wartung** blieb für immer in der Ampel.
- **Ursache des Abbruchs: UNBELEGT.** Das Server-Journal (22.10. 00:10–00:30) ist von hier nicht lesbar. Möglich: Runner-Absturz (der Starter `luxe-auftrag` läuft mit `set -e` — dann fällt der Schluss-Commit weg), Zeitgrenze 900 s, Push-Rennen. Ohne Journal nicht entscheidbar.

## Getan
- `automation/auftrag_haenger_schliessen.py`: eine Wartungsaktion gilt als lesend, wenn `server/wartung.mjs` sie mit `aendert: false` führt (14 Aktionen, 8 lesend; die Allowlist des Servers ist die Quelle, keine zweite Liste; Unklarheit = leere Menge = nichts wird geschlossen). Geschlossen wird nur, wenn der Lauf **wiederkehrend** ist (`[wiederkehrend` im `warum`) — ein Einmal-Auftrag hat jemand bestellt und wartet auf die Antwort.
- **Gedächtnis gegen Dauerrauschen UND gegen Wegwischen:** ist die jüngste frühere Quittung derselben Reihe «laufend» oder «abgebrochen…», wird NICHT geschlossen, die Ampel bleibt rot (zweimal hintereinander gestorben = System, nicht Zufall).
- `--selbsttest`: 9 Fälle (schliesst / Vortag abgebrochen / Vortag laufend / nur jüngster Vortag zählt / Einmal-Auftrag / verändernde Aktion / unbekannte Aktion / alte Regel / Parser) und **5 Mutanten** (Pflicht «wiederkehrend» weg, Wiederholungs-Sperre weg, `aendert`-Prüfung weg, Parser kehrt um, ältester statt jüngster Vorgänger) — alle erkannt. Läuft im Aufseher (`fixer_keepalive.sh`) VOR jedem Schliessen; scheitert er, ist der Schliesser ausgesetzt und eine ⚠️-Zeile steht im Bericht.
- Lauf SCHARF 12:48 UTC: `server-zustand-2026-10-22` → `abgebrochen` (mit Begründung in der Quittung). Ampel danach 0 «HAENGT».
- Falle im Selbsttest: die Suchtexte der Mutanten stehen selbst im Quelltext, jeder Treffer war doppelt («Ersetzungsstelle 2×») → Suchtext per Verkettung teilen.

## Offen
- Warum der Lauf von 00:16 starb: `journalctl -u luxe-agent.service --since '2026-10-22 00:10' --until '00:30'` auf dem Server (Betreiber-Klick) — oder abwarten: stirbt der Lauf am 23.10. wieder, bleibt die Ampel rot (Wiederholungs-Sperre) und es lohnt sich.

