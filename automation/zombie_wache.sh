#!/bin/bash
# Beobachtet 5 reparierte Produkte. Aendert sich updatedAt, wird festgehalten WER gerade laeuft.
# 23.09.2026 (Verbesserungs-Audit): Der Vorzustand lag nur im Speicher (declare -A) — nach jedem stuendlichen
# Container-Neustart war die erste Lesung «neu» und wurde nie protokolliert; der taegliche Rueckschrieb um ~04:07 UTC
# erschien nur als «vorher …». Jetzt: Stand in /tmp/zombie_stand.txt (ueberlebt Neustarts), im Fenster 03:55–04:30 UTC
# alle 30 s statt 180 s, und beim Sprung die VOLLE Prozessliste (nicht nur .py/.mjs) plus uptime.
export REPO="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO"
IDS="15406765801857 15412949483905 15408457941377 15411554910593 15397247385985"
LOG=/tmp/zombie_wache.log
STAND=/tmp/zombie_stand.txt
touch "$STAND"
while true; do
  for id in $IDS; do
    U=$(python3 - "$id" <<'PY' 2>/dev/null
import sys,os,re
sys.path.insert(0,os.path.join(os.environ.get('REPO','.'),'automation'))
from shop_gql import gql
r=gql('query($id:ID!){product(id:$id){updatedAt descriptionHtml}}',{'id':'gid://shopify/Product/'+sys.argv[1]})
p=(r.get('data') or {}).get('product') or {}
h=p.get('descriptionHtml') or ''
usa='JA' if re.search(r'USA:?\s*(?:<[^>]+>\s*)*\d+\s*[–-]\s*\d+\s*Tage',h) else 'nein'
print((p.get('updatedAt') or '?')+' USA='+usa)
PY
)
    [ -z "$U" ] && continue
    ALT=$(awk -v i="$id" '$1==i {sub(/^[^ ]+ /,""); print}' "$STAND")
    if [ "$ALT" != "$U" ]; then
      { echo "=== $(date -u +%F\ %H:%M:%S) $id  $U   (vorher ${ALT:-unbekannt})   uptime: $(uptime | sed 's/^ *//')"
        ps -eo etimes,args --no-headers | grep -v -E '^\s*[0-9]+ (\[|ps |grep |sleep |awk )' | head -40
      } >> "$LOG"
      { grep -v "^$id " "$STAND"; echo "$id $U"; } > "$STAND.neu" && mv "$STAND.neu" "$STAND"
    fi
  done
  HM=$(date -u +%H%M | sed 's/^0*//'); HM=${HM:-0}
  if [ "$HM" -ge 355 ] && [ "$HM" -lt 430 ]; then sleep 30; else sleep 180; fi
done
