#!/usr/bin/env bash
# run-local.sh — ABAN-Files-Upload LOKAL auf deinem PC (gratis, kein GitHub/GitLab noetig).
#
# Laedt die naechsten N noch nicht hochgeladenen, BEREITS GERENDERTEN Folgen auf YouTube.
# Die Stimme ist im mp4 -> kein ElevenLabs noetig. YouTube-Limit ~6 Uploads/Tag.
#
# Einmalig Secrets als Env setzen (in der Shell oder ~/.bashrc):
#   export YT_CLIENT_ID=...      export YT_CLIENT_SECRET=...     export YT_REFRESH_TOKEN=...
#   (Refresh-Token verloren? -> python3 get_yt_refresh_token.py)
#
# Start:   bash run-local.sh 6          # laedt 6 Folgen hoch
#          bash run-local.sh 7 public   # Anzahl + Sichtbarkeit
set -euo pipefail
COUNT="${1:-6}"
PRIVACY="${2:-public}"
cd "$(dirname "$0")"

: "${YT_CLIENT_ID:?YT_CLIENT_ID fehlt (export setzen)}"
: "${YT_CLIENT_SECRET:?YT_CLIENT_SECRET fehlt}"
: "${YT_REFRESH_TOKEN:?YT_REFRESH_TOKEN fehlt (oder python3 get_yt_refresh_token.py)}"

echo "Pruefe Abhaengigkeiten..."
python3 -c "import googleapiclient" 2>/dev/null || pip install --quiet \
  google-api-python-client google-auth-oauthlib google-auth-httplib2 Pillow numpy imageio-ffmpeg

echo "Lade bis zu $COUNT Folge(n) hoch ($PRIVACY)..."
python3 aban_publish.py --count "$COUNT" --privacy "$PRIVACY"
echo "Fertig. Status in uploaded.json / video_ids.json."
echo "Tipp: morgen erneut fuer die restlichen Folgen (YouTube-Tageslimit ~6)."
