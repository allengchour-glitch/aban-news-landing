#!/usr/bin/env bash
# cross_sell_durchlauf.sh — laeuft die Querverweis-Boxen (automation/cross_sell.mjs) ueber den
# GANZEN Katalog, Zeitfenster fuer Zeitfenster, ohne Handarbeit.
#
# WARUM ES DAS BRAUCHT (gemessen 2026-10-23):
#   `SCAN` ist bei 3000 gedeckelt und `MAXFIX` bei 1000, der Shop hat aber ueber 50 000 aktive
#   Produkte. Ohne `SORT=CREATED_AT REVERSE=0` beginnt jeder Lauf bei den zuletzt GEAENDERTEN
#   Produkten — und eine Schreibung aendert `UPDATED_AT`, der Lauf bleibt also in seinem eigenen
#   Fenster haengen. Dieses Skript schiebt das Fenster anhand von `letztesErstellt` weiter, das
#   der Lauf selbst meldet (`productsCount` taugt dafuer nicht, es zaehlt nur bis 10 000).
#
# VORGABE IST DER TROCKENLAUF. Scharf nur mit LIVE=1 — und vorher die Verteilung je Ziel im
# Bericht ansehen: geht ein Ziel ueber die Haelfte, ist das ein Verdacht, kein Ergebnis
# (am 23.10. gingen so 265 Produkte fast nach „Schweiz-Edition", nur wegen des Wortes `sticker`).
#
# Aufruf:  AB=2026-07-25T02:07:10Z RUNDEN=20 LIVE=1 bash automation/cross_sell_durchlauf.sh
#   AB      Anfang des ersten Fensters (ISO). Ohne Angabe: der ganze Katalog von vorn.
#   RUNDEN  Hoechstzahl Laeufe (Vorgabe 10). Ein Fenster braucht meist 2 bis 4.
#   LIVE    1 = schreiben. Fehlt es, wird nur gemessen.
set -u
cd "$(dirname "$0")/.."
AB="${AB:-}"; RUNDEN="${RUNDEN:-10}"; GESETZT=0
for ((i=1; i<=RUNDEN; i++)); do
  Q="status:active"; [ -n "$AB" ] && Q="status:active AND created_at:>=$AB"
  # Ein Lauf kann STUNDEN brauchen: bis zu 1000 Schreib-Abfragen, und jede wartet nach Shopifys
  # eigener Punkte-Angabe. Der Eimer wird von aussen fast leergehalten (siehe shopify_gql.mjs).
  # Darum sagt das Skript VOR dem Lauf, was es tut — sonst sieht ein laufender Durchlauf
  # stundenlang wie ein haengender aus. Genau das ist mir am 23.10. passiert.
  echo "Lauf $i · Fenster ab ${AB:-Anfang} · gestartet $(date -u +%H:%M:%SZ) · kann Stunden dauern"
  BERICHT="${TMPDIR:-/tmp}/cross_sell_lauf.$$.json"
  SHOPIFY_SHOP="${SHOPIFY_SHOP:-au3j0y-hq.myshopify.com}" \
    PQUERY="$Q" SORT=CREATED_AT REVERSE=0 SCAN=3000 MAXFIX=1000 \
    node automation/cross_sell.mjs > "$BERICHT" 2>&1 \
    || { echo "Lauf $i abgebrochen:"; tail -3 "$BERICHT"; rm -f "$BERICHT"; break; }
  # Ueber eine Datei statt Prozess-Substitution: so bleibt der Bericht bei einem Abbruch lesbar.
  ZEILE=$(python3 -c '
import sys, json
d = json.load(open(sys.argv[1]))
print(d.get("zuSetzen", 0), d.get("crossSellAdded") or 0, d.get("letztesErstellt") or "")' "$BERICHT" 2>/dev/null) \
    || { echo "Lauf $i: Bericht nicht lesbar:"; tail -3 "$BERICHT"; rm -f "$BERICHT"; break; }
  rm -f "$BERICHT"
  read -r SETZ ADD LETZT <<<"$ZEILE"
  GESETZT=$((GESETZT + ADD))
  echo "Lauf $i · fertig $(date -u +%H:%M:%SZ) · zu setzen $SETZ · gesetzt $ADD · Summe $GESETZT"
  # Erst weiterschieben, wenn das Fenster leer ist — sonst bleiben Produkte uebersprungen.
  if [ "$SETZ" = "0" ]; then
    [ -z "$LETZT" ] && { echo "Katalogende erreicht."; break; }
    [ "$LETZT" = "$AB" ] && { echo "Fenster bewegt sich nicht mehr — Ende."; break; }
    AB="$LETZT"
  fi
done
echo "Fertig. Insgesamt gesetzt: $GESETZT"
