# Tagesläufe, die beim Container-Neustart still sterben (25.09.2026)

## GEMESSEN
- Ampel 12:22: «⚠️ FORTURA-BESTAND 1 T alt (letzter Abgleich 24.09. 05:37)».
- `/tmp/fortura_bestand.log` endete 02:10 mit «Fortura-Feed geladen» — keine FERTIG/PAUSE-Zeile, Sperrdatei zeigte auf
  toten PID 4511. Container-Start 12:19 (uptime), der vorige um ~02:1x.
- Das Tor setzt den Anspruch (`touch stamp`) VOR dem Lauf → der gestorbene Lauf galt als Tageslauf; nächster Versuch
  erst nach 20 h. `absturz_nachholen` (Nachtrag 65) greift nur bei Traceback/Error — ein Neustart hinterlässt keine.
- Klasse über alle 47 Tor-Logs gemessen: 20 enden ohne FERTIG/PAUSE, aber bei den meisten schreibt das Skript FERTIG
  nur bedingt (z. B. «nur wenn nichts geändert», Lehre 21.08.) → dort beweist das Fehlen nichts. Unbedingte
  Schlusszeile haben: `fortura_bestand_taeglich.sh` (FERTIG/PAUSE) und `wahlversprechen.py` (FERTIG: n geprueft …) —
  beide VOR dem Neustart ohne Schlusszeile = gestorben.

## GETAN
- `fixer_keepalive.sh`: Helfer `still_gestorben LOG` (letzte Schreibung vor Container-Start, keine FERTIG/PAUSE-Zeile
  in den letzten 3, höchstens 3×/Tag), zugeschaltet an den Toren Fortura-Bestand und Wahlversprechen. Synthetischer
  Test 4/4 (gestorben → nachholen · FERTIG → nein · nach Boot geschrieben → nein · Deckel 3/Tag).
- Fortura-Abgleich 12:30 von Hand nachgestartet (eigene Sperre, 1 Prozess).

## REGEL
Ein neuer Tagesjob, der `still_gestorben` bekommen soll, MUSS als letzte Zeile immer FERTIG oder PAUSE schreiben.
Jobs mit bedingtem FERTIG nicht zuschalten — sie würden nach jedem Neustart bis 3× nachlaufen.
