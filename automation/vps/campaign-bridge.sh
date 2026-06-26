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
export CAMPAIGN_KEEP_AUDIO="1"   # SOUND-ON Ad behalten (Musik-Lehre: TikTok-Ads nie stumm) — kein -an-Strip
export TT_LANG="German"          # NUR Deutsch (User 2026-06-26): Mundart-Content -> Deutschschweiz, NICHT Romandie/French

echo "[bridge] CDP_URL=$CDP_URL  Objective=$TT_OBJECTIVE  Creative=$TT_VIDEO"
RUNLOG="$(mktemp)"
if [ "${GO:-0}" = "1" ]; then
  echo "[bridge] !!! REAL-LAUNCH (AUTO_LAUNCH=1, Cap 70 CHF) !!!"
  AUTO_LAUNCH=1 "$NODE" automation/local/tiktok-campaign-port.mjs 2>&1 | tee "$RUNLOG"
else
  echo "[bridge] DRY-Lauf (nur Screenshots in automation/local/campaign-shots/, kein Spend)."
  "$NODE" automation/local/tiktok-campaign-port.mjs --dry 2>&1 | tee "$RUNLOG"
fi
echo "[bridge] fertig. Screenshots: automation/local/campaign-shots/  ·  Report: reports/campaign-last-run.json"

# 👁️ SELBST-MELDUNG (2026-06-26): VPS hat keine Push-Rechte -> Ergebnis ins Metafeld luxe.campaign_dry_status
# stempeln, damit die Cloud-Session es liest (kein Log-Paste noetig). Wichtige Signale aus dem Lauf ziehen.
MODEL="$(grep -oE 'Stagehand aktiv mit Modell [^ ]+' "$RUNLOG" | tail -1 | sed 's/Stagehand aktiv mit Modell //')"
[ -z "$MODEL" ] && MODEL="$(grep -q 'Playwright-Fallback' "$RUNLOG" && echo 'playwright-fallback' || echo '?')"
AIERR=$(grep -cE 'AI_LoadAPIKeyError|AI_APICallError|gpt-4.1-mini' "$RUNLOG")
ACTS=$(grep -cE '^[0-9].*act! ' "$RUNLOG")
PRESUBMIT=$(grep -qE 'ai-pre-submit|pre-submit' "$RUNLOG" && echo y || echo n)
SUBMIT=$(grep -qiE 'Kampagne (gesendet|abgesendet|live)|Submit ok|erfolgreich erstellt' "$RUNLOG" && echo y || echo n)
ERR1=$(grep -oE 'AI_[A-Za-z]+Error[^"]{0,60}' "$RUNLOG" | head -1)
SUMMARY="${GO:+GO }${GO:-DRY} model=$MODEL ai_err=$AIERR acts=$ACTS presubmit=$PRESUBMIT submit=$SUBMIT err=[$ERR1] @ $(date -u +%H:%MZ)"
STAMP_KEY="campaign_dry_status" STAMP_VALUE="$SUMMARY" "$NODE" automation/vps/stamp.mjs 2>&1 | tail -1
echo "[bridge] STATUS: $SUMMARY"

# 👁️ TEXT-TRACE (2026-06-26 "such ne weg", KEIN Bild-Upload = kein Privacy-Leak): die letzten "nicht gefunden"/
# "pruefen"/Fehler-Zeilen + den letzten erreichten DIAG-Schritt ins Metafeld stempeln, damit die Cloud sieht WO
# der Bot haengt (rein textuell, nichts wird extern publiziert).
LASTSTEP="$(grep -oE 'DIAG\[[a-z-]+\]' "$RUNLOG" | tail -1)"
TRACE="$(grep -oiE '[a-zäöü-]*feld nicht gefunden|nicht gefunden|Selektor pr[uü]fen|kein Datei-Input|Budgetfeld[^.]*' "$RUNLOG" | sort -u | head -4 | tr '\n' '; ')"
STAMP_KEY="campaign_trace" STAMP_VALUE="laststep=$LASTSTEP | $TRACE @ $(date -u +%H:%MZ)" "$NODE" automation/vps/stamp.mjs 2>&1 | tail -1
echo "[bridge] TRACE: laststep=$LASTSTEP | $TRACE"
# DOM-Labels (CONTROLS[...]) separat stempeln -> Cloud sieht die echten TikTok-Button/Input-Namen
CONTROLS="$(grep -oE 'CONTROLS\[[a-z]+\]: .*' "$RUNLOG" | tail -1)"
[ -n "$CONTROLS" ] && { STAMP_KEY="campaign_dom" STAMP_VALUE="${CONTROLS:0:250}" "$NODE" automation/vps/stamp.mjs 2>&1 | tail -1; echo "[bridge] $CONTROLS"; }
rm -f "$RUNLOG"
