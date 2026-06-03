#!/usr/bin/env bash
# ABAN Files - HeyGen Avatar IV (echter sprechender ABAN-Avatar).
# Key kommt aus der Umgebung -> NIEMALS hier hartcodieren.
#   export HG="<dein-heygen-api-key>"
#   bash heygen_make.sh ep1
# Hinweis: Avatar IV braucht 'api'-Credits im HeyGen-Konto (~$4/Min).
set -euo pipefail
: "${HG:?Bitte HG (HeyGen API-Key) als Umgebungsvariable setzen}"
EP="${1:-ep1}"
TP="${TALKING_PHOTO_ID:-46dd26982dfb48f896b40850e75f4fed}"   # "ABAN" Talking-Photo
VID="${HEYGEN_VOICE_ID:-828b59f834fd4c7188da322b6d9b6c75}"   # tiefe Stimme
TXT=$(python3 -c "import json;print(json.load(open('aban_scripts.json'))['$EP']['text'])")
BODY=$(python3 -c "
import json,os
print(json.dumps({'video_inputs':[{'character':{'type':'talking_photo','talking_photo_id':'$TP','use_avatar_iv_model':True},'voice':{'type':'text','input_text':'''$TXT''','voice_id':'$VID'}}],'dimension':{'width':720,'height':1280}}))
")
RESP=$(curl -s -m 60 -X POST https://api.heygen.com/v2/video/generate \
  -H "X-Api-Key: $HG" -H "Content-Type: application/json" -d "$BODY")
echo "submit: $RESP"
VIDEO=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('video_id',''))")
[ -z "$VIDEO" ] && { echo "Kein video_id (Credits? Avatar-Modus?)"; exit 1; }
for i in $(seq 1 60); do
  R=$(curl -s -m 30 -H "X-Api-Key: $HG" "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO")
  ST=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('status'))" 2>/dev/null || echo "?")
  echo "[$i] $ST"
  if [ "$ST" = "completed" ]; then
    URL=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['video_url'])")
    curl -s -m 180 -o "aban_$EP.mp4" "$URL" && echo "SAVED aban_$EP.mp4"
    exit 0
  fi
  [ "$ST" = "failed" ] && { echo "FAILED: $R"; exit 1; }
  sleep 15
done
echo TIMEOUT
