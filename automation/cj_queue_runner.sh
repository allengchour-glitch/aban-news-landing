#!/bin/bash
# CJ-Queue-Runner: arbeitet automation/cj_search_queue.txt in 4er-Batches ab,
# danach Kategorie-Fill (Default-Gruppen). Idempotent: erledigte Zeilen -> "#done ".
cd /home/user/aban-news-landing || exit 1
# ⚠️ 23.08.2026: Die Zugangsdaten stehen in /tmp/secrets_env.sh — genau wie bei den vier
# Grind-Runnern (cj_runner_template.sh Zeile 20). Dieses Skript hat sie NICHT geladen und
# starb deshalb in Zeile 5 mit «SHOPIFY_CLIENT_ID: fehlt», sobald der Aufseher es startete
# (alle 25 Minuten, drei Stunden lang, immer sofort). Vorher fiel es nicht auf, weil es
# gar nicht erst gestartet wurde: engine_keepalive suchte nur unter /tmp, und dort gibt es
# diese Datei nicht. Ein Dauerlaeufer, der sofort stirbt, sieht im Log aus wie einer, der
# laeuft — man sieht nur Startzeilen.
source /tmp/secrets_env.sh 2>/dev/null
: "${SHOPIFY_CLIENT_ID:?fehlt}"
: "${SHOPIFY_CLIENT_SECRET:?fehlt}"
export SHOPIFY_CLIENT_ID SHOPIFY_CLIENT_SECRET
export CJ_TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/cj_token.json'))['accessToken'])")
export GROQ_API_KEY=$(cat /tmp/groq_key 2>/dev/null)
export GROQ_API_KEY2=$(cat /tmp/groq_key2 2>/dev/null)
export GEMINI_API_KEY=$(cat /tmp/gemini_key 2>/dev/null)
Q=automation/cj_search_queue.txt
while true; do
  mapfile -t BATCH < <(grep -v '^#' "$Q" | head -4)
  [ ${#BATCH[@]} -eq 0 ] && break
  ITEMS=$(IFS=,; echo "${BATCH[*]}")
  echo "### BATCH: $ITEMS  $(date -u +%H:%M)"
  ITEMS="$ITEMS" /opt/node22/bin/node automation/cj_sku_import.mjs
  RC=$?
  if [ $RC -ne 0 ]; then echo "Importer RC=$RC — Punkte weg? Pause 30min"; sleep 1800; continue; fi
  for line in "${BATCH[@]}"; do
    esc=$(printf '%s' "$line" | sed 's/[\/&]/\\&/g')
    sed -i "s/^$esc\$/#done $esc/" "$Q"
  done
  sleep 60
done
echo "### QUEUE LEER → Kategorie-Fill-ROTATION (voll gas, divers statt Nagel-Default)"
GRPDONE=/tmp/cj_grp_done.txt; touch $GRPDONE
GRPS="kueche storage pet sport musik cjelektronik cjgadgets cjauto cjhome cjhaustier cjtaschen cjschmuck cjdamen cjherren makeup skincare gaming cjbasteln cjspielelektronik cjbeautytools cjuhren cjsneaker cjschuhekids"
# ⚠️ 23.08.2026 (zweiter Akt derselben Lehre): Sind ALLE Gruppen im Ledger, uebersprang die
# Schleife jede einzelne und meldete sofort «CJ-Runner fertig» — der Aufseher startete das
# Skript alle 25 Minuten, es lief, und tat NICHTS. Im Log stand eine Startzeile und eine
# Fertigzeile; genau so sieht auch ein erfolgreicher Lauf aus. «Laeuft» ist nicht «arbeitet»,
# und «fertig» ist nicht «hat gearbeitet» — die ZAHL der bearbeiteten Gruppen muss gezaehlt werden.
# Deshalb: Ledger leeren und eine neue RUNDE starten, mit tieferer Paginierung (DEPTH-Lehre
# 29.07.: flache Top-Seiten sind laengst erschoepft, eine neue Runde auf Seite 5 findet 0 Neue).
OFFEN=0; for G in $GRPS; do grep -qx "$G" $GRPDONE || OFFEN=$((OFFEN+1)); done
if [ "$OFFEN" -eq 0 ]; then
  R=$(cat /tmp/cj_queue_round 2>/dev/null); [ -z "$R" ] && R=0
  R=$((R+1)); [ "$R" -gt 12 ] && R=1
  echo "$R" > /tmp/cj_queue_round
  : > $GRPDONE
  echo "### ALLE GRUPPEN ERLEDIGT → Runde $R, Ledger geleert"
fi
R=$(cat /tmp/cj_queue_round 2>/dev/null); [ -z "$R" ] && R=1
TIEFE=$((5 + R*3)); [ "$TIEFE" -gt 40 ] && TIEFE=40
echo "### RUNDE $R · MAXPAGE=$TIEFE"
for G in $GRPS; do
  grep -qx "$G" $GRPDONE && continue
  echo "### GRP $G $(date -u +%H:%M)"
  GRP=$G CAP=25 MAXPAGE=$TIEFE /opt/node22/bin/node automation/cj_category_fill.mjs 2>&1 | tee /tmp/cj_queue_grp.out
  RC=${PIPESTATUS[0]}
  [ $RC -ne 0 ] && { echo "GRP $G RC=$RC — Punkte weg? Stop."; break; }
  # ⚠️ Ein erschoepftes Tagesbudget (Code 16900500) beendet den Lauf mit «FERTIG: 0» und
  # Exit 0 — die Gruppe waere also als erledigt quittiert worden, obwohl NICHTS geholt wurde,
  # und die naechste Runde haette sie uebersprungen. Ein leeres Budget ist keine erledigte
  # Arbeit: Gruppe NICHT quittieren, Runde nicht weiterdrehen, abbrechen.
  if grep -q '16900500\|Insufficient API points' /tmp/cj_queue_grp.out; then
    echo "### CJ-Tagesbudget erschoepft bei GRP $G — Gruppe bleibt offen, Stop."
    break
  fi
  echo "$G" >> $GRPDONE
  sleep 45
done
echo "### CJ-Runner fertig $(date -u +%H:%M)"
