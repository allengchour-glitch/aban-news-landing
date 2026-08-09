#!/bin/bash
# CJ-Grind: cj_category_fill mit Gruppen-Rotation (schreibt cj_niche_done, Groq-Titel)
# WICHTIG: Variable NICHT 'GROUPS' nennen (bash-Spezialvariable = Gruppen-IDs!)
cd /home/user/aban-news-landing
source /tmp/secrets_env.sh 2>/dev/null; source /tmp/cj_creds.env 2>/dev/null
LOG=/tmp/cj_runner2.log
GRPLIST="cjwerkzeug cjelektronik gaming cjauto nagel musik cj3d cjspielelektronik cjschuhedamen cjschuheherren cjgadgets cjschmuck cjuhren cjdamen cjherren cjtaschen cjhome cjhaustier sport pet kueche makeup skincare storage cjsneaker cjbeautytools cjbasteln cjschuhekids"
set -- $GRPLIST
N=$#
IDXF=/tmp/cj_grp_idx; i=$(cat $IDXF 2>/dev/null || echo 0)
while true; do
  TOK=$(curl -s -X POST "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken" \
    -H "Content-Type: application/json" -d "{\"email\":\"$CJ_EMAIL\",\"password\":\"$CJ_API_KEY\"}" \
    | python3 -c "import json,sys;print((json.load(sys.stdin).get('data') or {}).get('accessToken',''))" 2>/dev/null)
  pick=$(( (i % N) + 1 ))
  eval "G=\${$pick}"
  if [ -n "$TOK" ]; then
    echo "$(date +%T) GRP=$G" >> $LOG
    GRP=$G CAP=12 MAXPAGE=20 GROUPS_FILE=/tmp/cj_groups_extra.json CJ_TOKEN="$TOK" /opt/node22/bin/node automation/cj_category_fill.mjs >> $LOG 2>&1
  else
    echo "$(date +%T) kein CJ-Token" >> $LOG
  fi
  i=$((i+1)); echo $i > $IDXF
  sleep 30
done
