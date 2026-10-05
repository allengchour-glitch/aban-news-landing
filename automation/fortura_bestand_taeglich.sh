#!/bin/bash
# fortura_bestand_taeglich.sh — Fortura-Feed holen und den Lagerbestand ALLER Fortura-Varianten nachführen (24.09.2026).
#
# WARUM EIGENER STARTER: fortura_bestand_sync.mjs hing nur an fortura_runner.sh (dem Import-Runner). Der steht seit der
# Import-Pause still — gemessen am 24.09.: letzter Bestandsabgleich 21.08.2026, 34 Tage eingefroren. Der erste Lauf
# danach änderte 3'847 von 8'416 Varianten, 248 fielen auf 0 (bis dahin bestellbar, obwohl Fortura sie nicht mehr hat).
# Bestand ist Kundenschutz, kein Import — er darf nicht an der Import-Pause hängen.
# Aufruf: täglich aus fixer_keepalive.sh (Zeitstempel /tmp/fortura_bestand.stamp, 20 h). Log /tmp/fortura_bestand.log.
#
# 04.10.2026 (gemessen: 3 Starts, 2 still gestorben, Bestand 36 h eingefroren, Ampel «2 T alt»): Der Lauf dauert 3–11 min,
# der Container startet ~stündlich neu und nimmt ihn mit. Der Aufseher erkannte den Tod nur, wenn die Log-Zeit VOR dem
# Container-Start lag (still_gestorben) — ein Tod ohne erkennbaren Neustart galt als Erfolg, weil der Anspruch (touch)
# vor dem Start gesetzt wird. Drei Änderungen: (1) `grep --line-buffered` — bisher schluckte der Block-Puffer von grep
# jede Fortschrittszeile des Node-Skripts, wenn der Lauf starb (im Log stand nur «Feed geladen», nichts danach);
# (2) `timeout 2400` um den Abgleich, ein Hänger wird PAUSE statt ewig; (3) der Zeitstempel wird HIER bei FERTIG
# gesetzt = «letzter Erfolg» — der Aufseher-Block setzt nur noch einen 2-h-Anspruch (/tmp/fortura_bestand.claim),
# dann holt sich ein still gestorbener Lauf nach 2 h von selbst nach, ohne Neustart-Erkennung.
#
# 05.10.2026 (Prüferbefund): «Stempel = Erfolg» galt nicht streng. (a) sync.mjs endete mit 0 auch im Pfad «läuft bereits,
# skip» (Lock < 60 min, nichts gelesen/geschrieben) — im Log belegt: START 00:27:57 … skip … FERTIG 00:28:10, 13 s, Stempel
# gesetzt, 20 h kein Nachholen. Jetzt Exit 3 = KEIN LAUF: weder FERTIG noch Stempel noch PAUSE. (b) sync.mjs endete mit 0
# auch mit offen gebliebenen Zeilen → jetzt `process.exit(fehler ? 1 : 0)`. (c) `nochmal()` drehte den ERFOLGSSTEMPEL auf
# «jetzt − 18 h» zurück — damit zeigte «letzter Erfolg vor N h» nach jeder PAUSE 18 statt der Wahrheit. Der Stempel bleibt
# jetzt unangetastet; eine PAUSE schreibt nur die Marke /tmp/fortura_bestand.pause (Zeit + Grund). Der Aufseher braucht
# dafür nichts Neues: der Stempel ist nach einer PAUSE ohnehin > 20 h alt, der 2-h-Anspruch (claim) startet den nächsten
# Versuch; die Marke dient der Ampel/Meldung («PAUSE seit … Grund») und wird bei FERTIG gelöscht.
cd "$(dirname "$0")/.." || exit 1
STAMP=/tmp/fortura_bestand.stamp
PAUSE=/tmp/fortura_bestand.pause
pause() { echo "PAUSE: $1 — nächster Versuch über den 2-h-Anspruch des Aufsehers (Stempel unverändert)"; echo "$(date -u +%FT%TZ) $1" > "$PAUSE"; }
echo "START $(date -u +%FT%TZ): Fortura-Bestand"   # Marke für still_gestorben() im Aufseher
NEU=/tmp/fortura_feed_neu.csv
if ! bash automation/fortura_fetch_feed.sh "$NEU"; then
  pause "Feed-Abruf gescheitert (Zugang in /tmp/fortura_env.sh?) — nichts geschrieben"; exit 2
fi
# Der neue Feed ersetzt den alten erst nach geglücktem Download (fortura_image_backfill & Co. lesen /tmp/fortura_feed.csv).
cp "$NEU" /tmp/fortura_feed.csv
FORTURA_CSV=/tmp/fortura_feed.csv timeout 2400 /opt/node22/bin/node automation/fortura_bestand_sync.mjs 2>&1 | grep --line-buffered -v "^  fortura-"
rc=${PIPESTATUS[0]}
if [ "$rc" = 0 ]; then
  touch "$STAMP"          # Erfolg = Zeitstempel; nur so zählt der Tag als erledigt
  rm -f "$PAUSE"
  echo "FERTIG $(date -u +%FT%TZ): Fortura-Bestand abgeglichen"
elif [ "$rc" = 3 ]; then
  echo "KEIN LAUF $(date -u +%FT%TZ): Abgleich läuft bereits (Lock < 60 min) — kein Stempel, keine Pause"
elif [ "$rc" = 124 ]; then
  pause "Abgleich nach 40 min abgebrochen (timeout)"
elif [ "$rc" = 1 ]; then
  pause "Abgleich beendet, aber Zeilen offen geblieben (rc=1, siehe dropship/_fortura_bestand_report.md)"
else
  pause "Abgleich rc=$rc"
fi
exit "$rc"
