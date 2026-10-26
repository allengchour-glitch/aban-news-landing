#!/bin/bash
# Auswahl-Dauerlauf: zieht die fehlenden Farben/Grössen bei ALLEN Kandidaten nach (cj_varianten_nachziehen.mjs, LIVE).
#
# Reihenfolge: Stufe 1 (bewertete Produkte) → 2 (Kleidung, Schuhe, Ringe, Uhren, Taschen) → 3 (Rest). Liste: node automation/auswahl_kandidaten.mjs.
# Das Werkzeug überspringt, was das Ledger kennt (GESCHRIEBEN; endgültige Überspringer 14 Tage), jeder Lauf beginnt also beim ersten offenen Produkt.
# Erschöpft CJ die Tagespunkte oder drosselt dauerhaft (Exitcode 3), wartet der Lauf 30 Minuten und macht weiter — er endet erst, wenn die Liste durch ist
# oder die Sperrdatei /tmp/auswahl_stop angelegt wird.
#
# Aufruf:  STUFEN="1 2 3" BATCH=150 nohup bash automation/auswahl_durchlauf.sh > /tmp/auswahl_durchlauf.out 2>&1 &
# Schalter: LISTE=/tmp/auswahl_kandidaten.csv · BATCH=150 · STUFEN="1 2 3" · LOG=/tmp/auswahl_durchlauf.log · WARTE=1800
cd "$(dirname "$0")/.." || exit 1
LISTE=${LISTE:-/tmp/auswahl_kandidaten.csv}; BATCH=${BATCH:-150}; STUFEN=${STUFEN:-"1 2 3"}
LOG=${LOG:-/tmp/auswahl_durchlauf.log}; WARTE=${WARTE:-1800}; NODE=${NODE:-/opt/node22/bin/node}
[ -f "$LISTE" ] || { echo "Keine Liste: $LISTE (erst node automation/auswahl_kandidaten.mjs)"; exit 1; }
exec 9>/tmp/auswahl_durchlauf.lock; flock -n 9 || { echo "Läuft schon (Sperre /tmp/auswahl_durchlauf.lock)"; exit 1; }
for st in $STUFEN; do
  datei=/tmp/auswahl_stufe_$st.csv
  { echo "handle;stufe;sku;medien;google"; awk -F';' -v s="$st" '$2==s' "$LISTE"; } > "$datei"
  echo "$(date -u +%FT%TZ) Stufe $st: $(($(wc -l < "$datei") - 1)) Kandidaten" | tee -a "$LOG"
  while true; do
    [ -e /tmp/auswahl_stop ] && { echo "$(date -u +%FT%TZ) Stopp-Datei gefunden" | tee -a "$LOG"; exit 0; }
    lauf=$(mktemp)
    LIVE=1 LIMIT="$BATCH" HANDLES_DATEI="$datei" "$NODE" automation/cj_varianten_nachziehen.mjs > "$lauf" 2>&1; rc=$?
    cat "$lauf" >> "$LOG"
    zus=$(grep -E '^Zusammenfassung' "$lauf" | tail -1)
    echo "$(date -u +%FT%TZ) Stufe $st rc=$rc $zus" | tee -a "$LOG"
    if [ "$rc" = 3 ]; then echo "$(date -u +%FT%TZ) CJ drosselt/erschöpft — warte ${WARTE}s" | tee -a "$LOG"; rm -f "$lauf"; sleep "$WARTE"; continue; fi
    if ! grep -q 'LIMIT .* erreicht' "$lauf"; then rm -f "$lauf"; break; fi   # Liste dieser Stufe durch
    rm -f "$lauf"
  done
done
echo "$(date -u +%FT%TZ) FERTIG" | tee -a "$LOG"
