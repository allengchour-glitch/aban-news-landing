#!/bin/bash
# fortura_bestand_taeglich.sh — Fortura-Feed holen und den Lagerbestand ALLER Fortura-Varianten nachführen (24.09.2026).
#
# WARUM EIGENER STARTER: fortura_bestand_sync.mjs hing nur an fortura_runner.sh (dem Import-Runner). Der steht seit der
# Import-Pause still — gemessen am 24.09.: letzter Bestandsabgleich 21.08.2026, 34 Tage eingefroren. Der erste Lauf
# danach änderte 3'847 von 8'416 Varianten, 248 fielen auf 0 (bis dahin bestellbar, obwohl Fortura sie nicht mehr hat).
# Bestand ist Kundenschutz, kein Import — er darf nicht an der Import-Pause hängen.
# Aufruf: täglich aus fixer_keepalive.sh (Zeitstempel /tmp/fortura_bestand.stamp, 20 h). Log /tmp/fortura_bestand.log.
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
FORTURA_CSV=/tmp/fortura_feed.csv /opt/node22/bin/node automation/fortura_bestand_sync.mjs 2>&1 | grep -v "^  fortura-"
rc=${PIPESTATUS[0]}
[ "$rc" = 0 ] && echo "FERTIG $(date -u +%FT%TZ): Fortura-Bestand abgeglichen" || { echo "PAUSE: Abgleich rc=$rc — nächster Versuch in 2 h"; nochmal; }
