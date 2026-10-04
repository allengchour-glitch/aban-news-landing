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
# gesetzt = «letzter Erfolg» — der Aufseher-Block soll nur noch einen 2-h-Anspruch (/tmp/fortura_bestand.claim)
# setzen, dann holt sich ein still gestorbener Lauf nach 2 h von selbst nach, ohne Neustart-Erkennung.
cd "$(dirname "$0")/.." || exit 1
# Gescheiterter Lauf → Zeitstempel so zurückdrehen, dass der Keepalive in 2 h erneut startet (28.09.: rc=2 wegen
# fehlendem Shopify-Zugang blockierte den nächsten Versuch 20 h lang, Bestand 3 T alt, obwohl der Zugang längst zurück war).
nochmal() { touch -d "@$(( $(date +%s) - 72000 + 7200 ))" /tmp/fortura_bestand.stamp; }
echo "START $(date -u +%FT%TZ): Fortura-Bestand"   # Marke für still_gestorben() im Aufseher
NEU=/tmp/fortura_feed_neu.csv
if ! bash automation/fortura_fetch_feed.sh "$NEU"; then
  echo "PAUSE: Feed-Abruf gescheitert (Zugang in /tmp/fortura_env.sh?) — nichts geschrieben"; nochmal; exit 2
fi
# Der neue Feed ersetzt den alten erst nach geglücktem Download (fortura_image_backfill & Co. lesen /tmp/fortura_feed.csv).
cp "$NEU" /tmp/fortura_feed.csv
FORTURA_CSV=/tmp/fortura_feed.csv timeout 2400 /opt/node22/bin/node automation/fortura_bestand_sync.mjs 2>&1 | grep --line-buffered -v "^  fortura-"
rc=${PIPESTATUS[0]}
if [ "$rc" = 0 ]; then
  touch /tmp/fortura_bestand.stamp          # Erfolg = Zeitstempel; nur so zählt der Tag als erledigt
  echo "FERTIG $(date -u +%FT%TZ): Fortura-Bestand abgeglichen"
elif [ "$rc" = 124 ]; then
  echo "PAUSE: Abgleich nach 40 min abgebrochen (timeout) — nächster Versuch in 2 h"; nochmal
else
  echo "PAUSE: Abgleich rc=$rc — nächster Versuch in 2 h"; nochmal
fi
