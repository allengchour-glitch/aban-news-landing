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
NODE="$(command -v node || echo /usr/bin/node)"

# --install: cron-Zeile (*/10) setzen, falls noch nicht da, + einmal durchlaufen
if [ "${1:-}" = "--install" ]; then
  LINE="*/10 * * * * cd $(pwd) && bash automation/vps/vps-cmd-poll.sh >> /opt/luxe/vps-poll.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'vps-cmd-poll.sh' ; echo "$LINE" ) | crontab - && LOG "cron installiert: alle 10 Min."
fi

# 1) Neuesten Stand holen (read-only consumer)
git fetch origin "$BR" 2>/dev/null && git reset --hard "origin/$BR" 2>/dev/null || LOG "git update uebersprungen"
[ -f /opt/luxe/.env ] && { set -a; . /opt/luxe/.env; set +a; }

# 2) Stagehand sicherstellen (KI-Klicks fuer den Kampagnen-Bot; ohne -> starrer Fallback haengt)
if [ ! -d node_modules/@browserbasehq/stagehand ]; then
  LOG "installiere @browserbasehq/stagehand ..."
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i @browserbasehq/stagehand --no-audit --no-fund >/dev/null 2>&1 && LOG "Stagehand installiert." || LOG "Stagehand-Install fehlgeschlagen (weiter)."
fi

# 3) Befehle lesen + neue ausfuehren (Dedup via .vps-cmd-done)
FILE="automation/vps/vps-commands.json"
[ -f "$FILE" ] || { LOG "keine vps-commands.json -> nichts zu tun."; exit 0; }
mapfile -t ROWS < <("$NODE" -e '
  const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  for(const c of a) console.log((c.id||"")+"\t"+(c.cmd||""));
' "$FILE" 2>/dev/null)

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
    jobs)         bash automation/vps/run-api-jobs.sh 2>&1 | tail -6 ;;
    campaign-dry) bash automation/vps/campaign-bridge.sh 2>&1 | tail -20 ;;
    *) LOG "unbekannter Befehl '$cmd' (ignoriert; campaign-go/echtes Geld laeuft NIE automatisch)" ;;
  esac
  LOG "fertig: $cmd"
done
LOG "Durchlauf fertig."
