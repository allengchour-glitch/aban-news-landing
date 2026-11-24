#!/usr/bin/env bash
# kosten_neu_runner.sh — rechnet die Einkaufspreise ALLER aktiven CJ-Produkte mit dem Versandgewicht neu und hebt danach
# die Preise, die unter dem Boden des Verlustschutzes liegen (24.11.2026).
#
# ANLASS: Betreiber 24.11. «mache dort kein gewinn, passe alle preise an?» / «scho 4te mal passiert und preise immernoch
# ned angepasst alle» → Entscheid «Kosten korrigieren» (nicht pauschal anheben). Bestellung #1046 (Mini-Projektor):
# Shop rechnete mit 100 g Nettogewicht, CJ verrechnet 629 g → EK 24.49 statt ~33, Preis 31.90, Gewinn CHF 4.
# verkauf_gewinn_wache hob immer erst NACH dem Verkauf und mit demselben falschen EK.
#
# ABLAUF je Stück (STUECK Produkte aus dropship/kosten-neu-2411/liste.txt, Reihenfolge: vermutlich sensible Ware →
# Varianten ohne Gewicht → Rest, je nach Preis absteigend):
#   1. cj_kosten_backfill.mjs NEU=1 NUR_IDS=… → unitCost + Gewicht neu, alt→neu in dropship/_cj_kosten_neu.tsv
#   2. preis_verlustschutz.py SCHARF=1 NUR_IDS=<die neu gerechneten> → nur HEBEN (Rabatt 15 %, Gratisversand)
# Versuchte Produkte stehen in dropship/_cj_kosten_neu_versucht.txt (kein Endlos-Wiederholen bei «keine CJ-Antwort»).
# Leeres CJ-Tagesbudget → 1 h warten. Notbremse: Datei dropship/_kosten_neu_aus.txt anlegen.
# Gestartet und am Leben gehalten von engine_keepalive.sh (Liste der Dauerläufer). Endet mit «FERTIG», wenn alles versucht ist.
cd "$(dirname "$0")/.." || exit 1
exec 9>/tmp/kosten_neu_runner.lock
flock -n 9 || { echo "kosten_neu_runner läuft bereits"; exit 0; }
LISTE=dropship/kosten-neu-2411/liste.txt
VERSUCHT=dropship/_cj_kosten_neu_versucht.txt
LED=dropship/_cj_kosten_neu.tsv
STUECK=${STUECK:-150}
N=/opt/node22/bin/node; [ -x "$N" ] || N=node
TMPD=${TMPDIR:-/tmp}
touch "$VERSUCHT" "$LED"
while true; do
  if [ -f dropship/_kosten_neu_aus.txt ]; then echo "$(date -u +%FT%TZ) AUS (Notbremse dropship/_kosten_neu_aus.txt)"; exit 0; fi
  [ -f "$LISTE" ] || { echo "PAUSE: $LISTE fehlt"; exit 0; }
  python3 - "$LISTE" "$VERSUCHT" "$STUECK" "$TMPD/kosten_neu_stueck.txt" <<'PY'
import sys
liste, versucht, n, aus = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
schon = {z.strip() for z in open(versucht) if z.strip()}
offen = [z.strip() for z in open(liste) if z.strip() and z.strip() not in schon]
open(aus, "w").write("\n".join(offen[:n]) + ("\n" if offen else ""))
print(len(offen))
PY
  OFFEN=$(wc -l < "$TMPD/kosten_neu_stueck.txt")
  if [ "$OFFEN" -eq 0 ]; then
    echo "$(date -u +%FT%TZ) FERTIG: alle $(wc -l < "$LISTE") Produkte versucht, $(wc -l < "$LED") neu gerechnet"; exit 0
  fi
  VORHER=$(wc -l < "$LED")
  OUT=$(NEU=1 NUR_IDS="$TMPD/kosten_neu_stueck.txt" LIMIT="$STUECK" timeout 3000 "$N" automation/cj_kosten_backfill.mjs 9>&- 2>&1 | tail -3)
  echo "$(date -u +%FT%TZ) kosten: $(echo "$OUT" | tr '\n' ' ' | cut -c1-300)"
  if echo "$OUT" | grep -q "PAUSE (CJ-Tagesbudget"; then
    echo "$(date -u +%FT%TZ) CJ-Budget leer — 1 h warten (Stück NICHT als versucht markiert)"
    sleep 3600 9>&-; continue
  fi
  # Nur bei einem regulär beendeten Lauf das Stück als versucht quittieren (Shopify stumm / Timeout → nochmals)
  if echo "$OUT" | grep -q "^FERTIG (NUR_IDS)"; then cat "$TMPD/kosten_neu_stueck.txt" >> "$VERSUCHT"; fi
  # Preise der in diesem Lauf neu gerechneten Produkte heben
  tail -n +"$((VORHER + 1))" "$LED" | cut -f1 | sort -u > "$TMPD/kosten_neu_fertig.txt"
  if [ -s "$TMPD/kosten_neu_fertig.txt" ]; then
    P=$(SCHARF=1 NUR_IDS="$TMPD/kosten_neu_fertig.txt" timeout 3000 python3 automation/preis_verlustschutz.py 9>&- 2>&1 | tail -1)
    echo "$(date -u +%FT%TZ) preise ($(wc -l < "$TMPD/kosten_neu_fertig.txt") Produkte): $(echo "$P" | cut -c1-300)"
  fi
  sleep 5 9>&-
done
