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
import collections
led = {z.split("\t")[0] for z in open("dropship/_cj_kosten_neu.tsv") if z.strip()}   # ok ODER fehl:… = erledigt
versuche = collections.Counter(z.strip() for z in open(versucht) if z.strip())      # vorübergehend gescheitert (Drosselung, leerer Eimer)
offen = [z.strip() for z in open(liste) if z.strip() and z.strip() not in led and versuche[z.strip()] < 3]
open(aus, "w").write("\n".join(offen[:n]) + ("\n" if offen else ""))
print(len(offen))
PY
  OFFEN=$(wc -l < "$TMPD/kosten_neu_stueck.txt")
  if [ "$OFFEN" -eq 0 ]; then
    echo "$(date -u +%FT%TZ) FERTIG: alle $(wc -l < "$LISTE") Produkte versucht, $(wc -l < "$LED") neu gerechnet"; exit 0
  fi
  OUT=$(NEU=1 NUR_IDS="$TMPD/kosten_neu_stueck.txt" LIMIT="$STUECK" timeout 3000 "$N" automation/cj_kosten_backfill.mjs 9>&- 2>&1 | tail -3)
  echo "$(date -u +%FT%TZ) kosten: $(echo "$OUT" | tr '\n' ' ' | cut -c1-300)"
  if echo "$OUT" | grep -q "PAUSE (CJ-Tagesbudget"; then
    echo "$(date -u +%FT%TZ) CJ-Budget leer — 1 h warten (Stück NICHT als versucht markiert)"
    sleep 3600 9>&-; continue
  fi
  # Nach einem regulär beendeten Lauf zählt jedes Produkt des Stücks einen Versuch (erledigt = Zeile im NEU-Ledger; wer nach
  # 3 Versuchen keine hat, bleibt draussen und steht im Schlussbericht). Shopify stumm / Timeout → kein Versuch gezählt.
  if echo "$OUT" | grep -q "^FERTIG (NUR_IDS)"; then cat "$TMPD/kosten_neu_stueck.txt" >> "$VERSUCHT"; fi
  # Preise heben: alle Produkte des Stücks, die jetzt (auch aus einem früheren, abgebrochenen Lauf) «ok» im Ledger haben.
  awk -F'\t' '$3=="ok"{print $1}' "$LED" | sort -u > "$TMPD/kosten_neu_ok.txt"
  sort -u "$TMPD/kosten_neu_stueck.txt" | comm -12 - "$TMPD/kosten_neu_ok.txt" > "$TMPD/kosten_neu_fertig.txt"
  if [ -s "$TMPD/kosten_neu_fertig.txt" ]; then
    P=$(SCHARF=1 NUR_IDS="$TMPD/kosten_neu_fertig.txt" timeout 3000 python3 automation/preis_verlustschutz.py 9>&- 2>&1 | tail -1)
    echo "$(date -u +%FT%TZ) preise ($(wc -l < "$TMPD/kosten_neu_fertig.txt") Produkte): $(echo "$P" | cut -c1-300)"
  fi
  sleep 5 9>&-
done
