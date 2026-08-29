#!/bin/bash
# Baut in ruhigem Takt neue Reels aus CJ-Produktvideos und legt sie in die Warteschlange.
#
# Auch diese Datei lag bisher nur unter /tmp und war nach dem Container-Wipe weg (siehe
# Kommentarkopf von social_autopilot.sh). Der eigentliche Motor — `cj_video_reel_engine.mjs` —
# war committet, nur der Dauerlauf drumherum nicht. Das genügt nicht: ohne ihn läuft der Motor
# genau einmal und danach nie wieder.
#
# Der Motor ist fortsetzbar (Ledger `dropship/_cj_reel_done.txt`, Cursor /tmp/cj_reel_cursor.txt)
# und legt am Katalogende von selbst wieder vorn an. Ein Neustart verursacht also keine Doppelung.
set -u
cd "$(dirname "$0")/.." || exit 1

exec 9>/tmp/reel_engine_runner.lock
# ⚠️ `9>&-` ist KEIN Beiwerk (29.08.2026). `exec 9>lock` wird an JEDES Kind vererbt —
# auch an `sleep`. Stirbt die Schleife, haelt der verwaiste sleep die flock-Sperre bis
# zu zwei Stunden weiter, und jeder Neustart beendet sich mit «laeuft bereits», waehrend
# der Motor in Wahrheit still steht. Live nachgewiesen: /tmp/social_autopilot.lock wurde
# von `sleep 900` (PID 2193) gehalten, /tmp/website_hygiene.lock von `sleep 7200`.
flock -n 9 || { echo "$(date -u +%H:%M) Reel-Motor läuft bereits — dieser Start endet."; exit 0; }

source /tmp/secrets_env.sh 2>/dev/null
if [ -z "${SHOPIFY_CLIENT_ID:-}" ] || [ -z "${SHOPIFY_CLIENT_SECRET:-}" ]; then
  # Ohne Zugangsdaten würde der Motor bei jedem Durchlauf still scheitern. Lieber einmal
  # deutlich sagen, was fehlt, als alle 30 Minuten ein leeres Log zu erzeugen.
  echo "$(date -u +%H:%M) ⚠️ SHOPIFY_CLIENT_ID/_SECRET fehlen — Reel-Motor startet nicht."
  exit 0
fi

while true; do
  BATCH=${BATCH:-3} /opt/node22/bin/node automation/cj_video_reel_engine.mjs
  sleep "${TAKT:-1800}" 9>&-
done
