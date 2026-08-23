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
for G in kueche storage pet sport musik cjelektronik cjgadgets cjauto cjhome cjhaustier cjtaschen cjschmuck cjdamen cjherren makeup skincare gaming cjbasteln cjspielelektronik cjbeautytools cjuhren cjsneaker cjschuhekids; do
  grep -qx "$G" $GRPDONE && continue
  echo "### GRP $G $(date -u +%H:%M)"
  GRP=$G CAP=25 MAXPAGE=5 /opt/node22/bin/node automation/cj_category_fill.mjs
  RC=$?
  [ $RC -ne 0 ] && { echo "GRP $G RC=$RC — Punkte weg? Stop."; break; }
  echo "$G" >> $GRPDONE
  sleep 45
done
echo "### CJ-Runner fertig $(date -u +%H:%M)"
