#!/bin/bash
# Beobachtet 5 reparierte Produkte. Aendert sich updatedAt, wird festgehalten WER gerade laeuft.
export REPO="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO"
IDS="15396249502081 15396249960833 15408457941377 15411554910593 15397247385985"
LOG=/tmp/zombie_wache.log
declare -A LETZT
while true; do
  for id in $IDS; do
    U=$(python3 - "$id" <<'PY' 2>/dev/null
import sys,os
sys.path.insert(0,os.path.join(os.environ.get('REPO','.'),'automation'))
from shop_gql import gql
r=gql('query($id:ID!){product(id:$id){updatedAt descriptionHtml}}',{'id':'gid://shopify/Product/'+sys.argv[1]})
p=(r.get('data') or {}).get('product') or {}
import re
h=p.get('descriptionHtml') or ''
usa='JA' if re.search(r'USA:?\s*(?:<[^>]+>\s*)*\d+\s*[–-]\s*\d+\s*Tage',h) else 'nein'
print((p.get('updatedAt') or '?')+' USA='+usa)
PY
)
    [ -z "$U" ] && continue
    if [ "${LETZT[$id]}" != "$U" ] && [ -n "${LETZT[$id]}" ]; then
      { echo "=== $(date -u +%H:%M:%S) $id  $U   (vorher ${LETZT[$id]})"
        ps -eo etimes,args --no-headers | grep -E '\.py|\.mjs' | grep -v grep | head -12
      } >> "$LOG"
    fi
    LETZT[$id]="$U"
  done
  sleep 180
done
