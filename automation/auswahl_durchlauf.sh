#!/bin/bash
# Auswahl-Dauerlauf: zieht die fehlenden Farben/Grössen bei ALLEN Kandidaten nach (cj_varianten_nachziehen.mjs, LIVE).
#
# Reihenfolge: Stufe 1 (bewertete Produkte) → 2 (Kleidung, Schuhe, Ringe, Uhren, Taschen) → 3 (Rest). Liste: node automation/auswahl_kandidaten.mjs.
# Das Werkzeug überspringt, was das Ledger kennt (GESCHRIEBEN; endgültige Überspringer 14 Tage), jeder Lauf beginnt also beim ersten offenen Produkt.
# Erschöpft CJ die Tagespunkte oder drosselt dauerhaft (Exitcode 3), wartet der Lauf 30 Minuten und macht weiter — er endet erst, wenn die Liste durch ist
# oder die Sperrdatei /tmp/auswahl_stop angelegt wird.
#
# Aufruf:  STUFEN="1 2 3" BATCH=150 nohup bash automation/auswahl_durchlauf.sh > /tmp/auswahl_durchlauf.out 2>&1 &
# Schalter: LISTE=/tmp/auswahl_kandidaten.csv · BATCH=150 · STUFEN="1 2 3" · WORKERS=3 · LOG=/tmp/auswahl_durchlauf.log · WARTE=1800
cd "$(dirname "$0")/.." || exit 1
LISTE=${LISTE:-/tmp/auswahl_kandidaten.csv}; BATCH=${BATCH:-150}; STUFEN=${STUFEN:-"1 2 3"}
LOG=${LOG:-/tmp/auswahl_durchlauf.log}; WARTE=${WARTE:-1800}; NODE=${NODE:-/opt/node22/bin/node}
[ -f "$LISTE" ] || { echo "Keine Liste: $LISTE (erst node automation/auswahl_kandidaten.mjs)"; exit 1; }
exec 9>/tmp/auswahl_durchlauf.lock; flock -n 9 || { echo "Läuft schon (Sperre /tmp/auswahl_durchlauf.lock)"; exit 1; }
WORKERS=${WORKERS:-3}   # parallele Läufe: die Zeit geht in Bild-Downloads und Shopify-Schreiben, nicht in CJ (CJ erlaubt ~1 Abfrage/s)

lauf_scheibe() {   # $1 = Stufe, $2 = Datei mit den Handles dieser Scheibe, $3 = Nummer
  local st=$1 datei=$2 nr=$3 lauf rc zus
  while true; do
    [ -e /tmp/auswahl_stop ] && { echo "$(date -u +%FT%TZ) [$st/$nr] Stopp-Datei gefunden" | tee -a "$LOG"; return 0; }
    lauf=$(mktemp)
    LIVE=1 LIMIT="$BATCH" HANDLES_DATEI="$datei" "$NODE" automation/cj_varianten_nachziehen.mjs > "$lauf" 2>&1; rc=$?
    cat "$lauf" >> "$LOG"
    zus=$(grep -E '^Zusammenfassung' "$lauf" | tail -1)
    echo "$(date -u +%FT%TZ) [$st/$nr] rc=$rc $zus" | tee -a "$LOG"
    if [ "$rc" = 3 ]; then echo "$(date -u +%FT%TZ) [$st/$nr] CJ drosselt/erschöpft — warte ${WARTE}s" | tee -a "$LOG"; rm -f "$lauf"; sleep "$WARTE"; continue; fi
    if ! grep -q 'LIMIT .* erreicht' "$lauf"; then rm -f "$lauf"; return 0; fi   # Scheibe durch
    rm -f "$lauf"
  done
}

for st in $STUFEN; do
  gesamt=/tmp/auswahl_stufe_$st.csv
  { echo "handle;stufe;sku;medien;google"; awk -F';' -v s="$st" '$2==s' "$LISTE"; } > "$gesamt"
  echo "$(date -u +%FT%TZ) Stufe $st: $(($(wc -l < "$gesamt") - 1)) Kandidaten, $WORKERS Läufe" | tee -a "$LOG"
  for k in $(seq 0 $((WORKERS - 1))); do
    # Scheibe k: jede WORKERS-te Zeile (Reihenfolge der Priorität bleibt erhalten)
    { echo "handle;stufe;sku;medien;google"; awk -F';' -v w="$WORKERS" -v k="$k" 'NR>1 && (NR-2)%w==k' "$gesamt"; } > "/tmp/auswahl_stufe_${st}_$k.csv"
    lauf_scheibe "$st" "/tmp/auswahl_stufe_${st}_$k.csv" "$k" &
  done
  wait
done
echo "$(date -u +%FT%TZ) FERTIG" | tee -a "$LOG"
