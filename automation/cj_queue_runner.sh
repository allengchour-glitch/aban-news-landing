#!/bin/bash
# CJ-Queue-Runner: arbeitet automation/cj_search_queue.txt in 4er-Batches ab,
# danach Kategorie-Fill (Default-Gruppen). Idempotent: erledigte Zeilen -> "#done ".
cd /home/user/aban-news-landing || exit 1
: "${SHOPIFY_CLIENT_ID:?SHOPIFY_CLIENT_ID fehlt (Env/autostart)}"
: "${SHOPIFY_CLIENT_SECRET:?SHOPIFY_CLIENT_SECRET fehlt (Env/autostart)}"
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
echo "### QUEUE LEER → Kategorie-Fill (voll gas)"
CAP=60 MAXPAGE=6 /opt/node22/bin/node automation/cj_category_fill.mjs
echo "### CJ-Runner fertig $(date -u +%H:%M)"
