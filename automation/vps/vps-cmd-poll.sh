#!/usr/bin/env bash
# vps-cmd-poll.sh — VPS holt sich Befehle SELBST (Git-Kanal) + fuehrt sie aus. So loest die Cloud-Session
# Aktionen aus, OHNE dass der User auf dem VPS tippt: ich committe automation/vps/vps-commands.json -> der
# Poller (cron alle 10 Min) liest neue Befehle, fuehrt sie aus, dedupt. "befehl selber machen" — geloest.
#
# Erststart (EINMALIG, installiert den cron + laeuft sofort):
#   cd /opt/luxe/repo && git fetch origin claude/luxestyle-product-CizQ6 && git reset --hard FETCH_HEAD && bash automation/vps/vps-cmd-poll.sh --install
# Danach: ich queue Befehle per Git, der VPS macht sie von selbst.
#
# SICHERHEIT: echtes Geld (campaign-go / GO=1) laeuft NIE automatisch — nur DRY/Lesen/Jobs. Real-Launch bleibt
# bewusst ein expliziter User-Befehl. Secrets aus /opt/luxe/.env (NIE im Repo).
set -uo pipefail
BR="claude/luxestyle-product-CizQ6"
cd "$(dirname "$0")/../.." || exit 1
LOG(){ echo "[$(date -u +%FT%TZ)] vps-poll: $*"; }
DONE="automation/vps/.vps-cmd-done"; touch "$DONE"
# PATH-FIX (FALLE 2026-06-26): im cron ist der PATH minimal -> node/npm/git nicht gefunden -> Parser lief leer
# durch ("Durchlauf fertig" ohne Ausfuehrung). Bekannte node-Pfade + nvm voranstellen, damit cron==interaktiv.
export PATH="/opt/node22/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin:$PATH"
for d in /root/.nvm/versions/node/*/bin /home/*/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then for c in /opt/node22/bin/node /usr/local/bin/node /usr/bin/node; do [ -x "$c" ] && NODE="$c" && break; done; fi
[ -z "$NODE" ] && { LOG "FEHLER: node nicht gefunden (PATH=$PATH) -> Abbruch."; exit 1; }
LOG "node = $NODE"

# --install: cron-Zeile (*/10) setzen, falls noch nicht da, + einmal durchlaufen
if [ "${1:-}" = "--install" ]; then
  LINE="*/10 * * * * cd $(pwd) && bash automation/vps/vps-cmd-poll.sh >> /opt/luxe/vps-poll.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'vps-cmd-poll.sh' ; echo "$LINE" ) | crontab - && LOG "cron installiert: alle 10 Min."
fi

# 1) Neuesten Stand holen (read-only consumer)
git fetch origin "$BR" 2>/dev/null && git reset --hard "origin/$BR" 2>/dev/null || LOG "git update uebersprungen"
[ -f /opt/luxe/.env ] && { set -a; . /opt/luxe/.env; set +a; }

# 2) Stagehand sicherstellen (KI-Klicks fuer den Kampagnen-Bot; ohne -> starrer Fallback haengt)
# VERSION PIN (2026-06-26): die neue Stagehand (2.x/3.x) benutzt beim act() IMMER OpenAI/gpt-4.1-mini, egal welches
# Modell konfiguriert ist -> AI_LoadAPIKeyError (kein OpenAI-Key). Der Code ist fuer 1.x geschrieben (modelName
# 'google/..'/'groq/..' + modelClientOptions.apiKey). 1.x RESPEKTIERT die Modell-Wahl -> Groq/Gemini klicken wirklich.
PIN="1.14.0"
if [ ! -f node_modules/.stagehand-pin-$PIN ]; then
  LOG "pinne @browserbasehq/stagehand@$PIN + @ai-sdk/groq + @ai-sdk/google ..."
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i @browserbasehq/stagehand@$PIN @ai-sdk/groq @ai-sdk/google --no-audit --no-fund >/dev/null 2>&1 \
    && { mkdir -p node_modules; touch node_modules/.stagehand-pin-$PIN; rm -f node_modules/.stagehand-pin-* 2>/dev/null; touch node_modules/.stagehand-pin-$PIN; LOG "Stagehand@$PIN gepinnt."; } \
    || LOG "npm-Pin fehlgeschlagen (weiter)."
fi

# 3) Befehle lesen + neue ausfuehren (Dedup via .vps-cmd-done)
FILE="automation/vps/vps-commands.json"
[ -f "$FILE" ] || { LOG "keine vps-commands.json -> nichts zu tun."; exit 0; }
mapfile -t ROWS < <("$NODE" -e '
  const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  for(const c of a) console.log((c.id||"")+"\t"+(c.cmd||""));
' "$FILE")
LOG "${#ROWS[@]} Befehl(e) in der Queue."

for row in "${ROWS[@]}"; do
  id="${row%%$'\t'*}"; cmd="${row##*$'\t'}"
  [ -z "$id" ] && continue
  grep -qx "$id" "$DONE" && continue
  echo "$id" >> "$DONE"
  LOG "FUEHRE AUS: $cmd (id $id)"
  case "$cmd" in
    ads-read)     CDP_HOST="${CDP_HOST:-100.71.8.47}" "$NODE" automation/vps/tiktok-ads-read.mjs 2>&1 | tail -4 ;;
    ad-decision)  "$NODE" automation/ad_manager.mjs 2>&1 | tail -4 ;;
    pixel)        "$NODE" automation/vps/pixel_check.mjs 2>&1 | tail -3 ;;
    diag)         "$NODE" automation/vps/bot_diag.mjs 2>&1 | tail -3 ;;
    shopify-campaign) # GANZ ANDERER WEG: Smart+ in der Shopify-App (admin.shopify.com/.../tiktok-ads-2/ad_creation),
                      # NICHT der kaputte ads.tiktok.com-Wizard. Einfacher Flow (Collection->Targeting->Budget). DRY (kein AUTO_LAUNCH).
                      SCLOG="$(mktemp)"
                      CDP_URL="http://${CDP_HOST:-100.71.8.47}:9222" SHOP_HANDLE=luxestyle-ch TT_DAILY_BUDGET=15 TT_COLLECTION=wasserfester-schmuck "$NODE" automation/local/shopify-tiktok-campaign.mjs 2>&1 | tee "$SCLOG" | tail -18
                      SCSTEP="$(grep -oE 'DIAG\[[a-z-]+\]|Smart|Senden|gesendet|Budget|Login|login|Wizard|Modus: [a-z]+' "$SCLOG" | tail -3 | tr '\n' '; ')"
                      STAMP_KEY="shopify_campaign" STAMP_VALUE="${SCSTEP:0:240} @ $(date -u +%H:%MZ)" "$NODE" automation/vps/stamp.mjs 2>&1 | tail -1
                      rm -f "$SCLOG" ;;
    jobs)         bash automation/vps/run-api-jobs.sh 2>&1 | tail -6 ;;
    campaign-dry) bash automation/vps/campaign-bridge.sh 2>&1 | tail -20 ;;
    *) LOG "unbekannter Befehl '$cmd' (ignoriert; campaign-go/echtes Geld laeuft NIE automatisch)" ;;
  esac
  LOG "fertig: $cmd"
done
LOG "Durchlauf fertig."
