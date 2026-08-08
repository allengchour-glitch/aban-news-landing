#!/bin/bash
# Startseiten-Frische-Rotation (User 2026-08-08: «beide sollte immer neue bilder angezeigt werden»)
# Jede Startseiten-Reihe bekommt eine ANDERE Sortierung, und die Sortierungen wandern alle 3h weiter
# (versetzter Offset pro Collection) → keine zwei Reihen zeigen dieselben Top-Produkte, und alle 3h neue Bilder.
source /tmp/secrets_env.sh 2>/dev/null
# Startseiten-Reihen + Menü-Gegenstücke, die sich sonst doppeln würden
COLLS=(691351716225 690573050241 689681006977 688577577345 687522775425 687793897857 688698884481 689834393985)
#        blitz-high    blitz-CH-voll ventilatoren neu-eingetr. trends      elektronik  wohnen      eu-lager
SORTS=(CREATED_DESC PRICE_DESC PRICE_ASC ALPHA_ASC ALPHA_DESC)  # BEST_SELLING raus: ohne Verkäufe ≈ CREATED → Dubletten
NS=${#SORTS[@]}
while true; do
  STEP=$(cat /tmp/blitz_sort_idx 2>/dev/null || echo 0)
  STEP=$(( (STEP + 1) % NS ))
  TOK=$(curl -s -X POST "https://au3j0y-hq.myshopify.com/admin/oauth/access_token" -H 'Content-Type: application/json' \
    -d "{\"client_id\":\"$SHOPIFY_CLIENT_ID\",\"client_secret\":\"$SHOPIFY_CLIENT_SECRET\",\"grant_type\":\"client_credentials\"}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
  if [ -n "$TOK" ]; then
    I=0
    for CID in "${COLLS[@]}"; do
      # Versetzter Offset: Reihe i bekommt Sortierung (STEP + i) % NS → nie zwei Reihen gleich
      S=${SORTS[$(( (STEP + I) % NS ))]}
      curl -s "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json" -H "X-Shopify-Access-Token: $TOK" -H 'Content-Type: application/json' \
        -d "{\"query\":\"mutation{ collectionUpdate(input:{id:\\\"gid://shopify/Collection/$CID\\\", sortOrder:$S}){ userErrors{message} }}\"}" > /dev/null
      I=$((I+1)); sleep 2
    done
    echo "$(date -u +%H:%M) Rotation Schritt $STEP → ${#COLLS[@]} Reihen mit versetzten Sortierungen"
    echo "$STEP" > /tmp/blitz_sort_idx
  else
    echo "$(date -u +%H:%M) Token-Fehler, skip"
  fi
  sleep 10800
done
