#!/usr/bin/env bash
# campaign-bridge.sh — startet den TikTok-Kampagnen-Aufbau im PC-Brave VOM VPS aus (ueber Tailscale-CDP).
# Setzt das saubere Top-Ad (See-Test-Reel, wasserfest) + verifizierte clean Landing + Mundart-Ad-Text und
# faehrt den Port-Skript. Standard = DRY (nur Screenshots, KEIN Spend). Mit GO=1 wird real abgesendet (70-CHF-Cap).
#
# Voraussetzung: PC an, Brave mit --remote-debugging-port=9222, bei ads.tiktok.com eingeloggt; Tailscale up.
# Lauf (DRY, sicher):   cd /opt/luxe/repo && bash automation/vps/campaign-bridge.sh
# Lauf (real, Geld):    cd /opt/luxe/repo && GO=1 bash automation/vps/campaign-bridge.sh
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
[ -f /opt/luxe/.env ] && { set -a; . /opt/luxe/.env; set +a; }   # GROQ/GEMINI fuer ai-browser + Shopify
NODE="$(command -v node || echo /usr/bin/node)"

export CDP_URL="http://${CDP_HOST:-100.71.8.47}:9222"   # PC-Brave ueber Tailnet
export TT_OBJECTIVE="Traffic"
export TT_DAILY_BUDGET="20"
export TT_TOTAL_BUDGET="70"                              # in den freigegebenen 350, hart gecappt
export TT_VIDEO="reels/seedance-wasserfest-sound.mp4"          # TOP-Creative (4.8Mbps See-Test)
export TT_LANDING="https://luxestyle.ch/discount/WELCOME10?redirect=/collections/wasserfester-schmuck"
export TT_ADTEXT="Bliebt das wirklich Gold? Wasserfeschte Edelstahl-Schmuck - lauft nid a, kei gruene Hut. -10% mit WELCOME10."

echo "[bridge] CDP_URL=$CDP_URL  Objective=$TT_OBJECTIVE  Creative=$TT_VIDEO"
if [ "${GO:-0}" = "1" ]; then
  echo "[bridge] !!! REAL-LAUNCH (AUTO_LAUNCH=1, Cap 70 CHF) !!!"
  AUTO_LAUNCH=1 "$NODE" automation/local/tiktok-campaign-port.mjs
else
  echo "[bridge] DRY-Lauf (nur Screenshots in automation/local/campaign-shots/, kein Spend)."
  "$NODE" automation/local/tiktok-campaign-port.mjs --dry
fi
echo "[bridge] fertig. Screenshots: automation/local/campaign-shots/  ·  Report: reports/campaign-last-run.json"
