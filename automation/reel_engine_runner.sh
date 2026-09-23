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
# 22.09.2026 (v2-Motor): Token-Datei /tmp/cj_shop_token.txt genuegt; CJ-Token aus /tmp/cj_token.json.
[ -s /tmp/cj_token.json ] || { echo "$(date -u +%H:%M) ⚠️ /tmp/cj_token.json fehlt — Reel-Motor startet nicht."; exit 0; }
if [ ! -s /tmp/cj_shop_token.txt ] && { [ -z "${SHOPIFY_CLIENT_ID:-}" ] || [ -z "${SHOPIFY_CLIENT_SECRET:-}" ]; }; then
  # Ohne Zugangsdaten würde der Motor bei jedem Durchlauf still scheitern. Lieber einmal
  # deutlich sagen, was fehlt, als alle 30 Minuten ein leeres Log zu erzeugen.
  echo "$(date -u +%H:%M) ⚠️ SHOPIFY_CLIENT_ID/_SECRET fehlen — Reel-Motor startet nicht."
  exit 0
fi

while true; do
  # Kadenz 22.09.: 2 Reels alle 6 h (= 8/Tag; Verbrauch IG 3/Tag + TikTok 2/Tag). Ablage bis zum Grow-Plan im Repo (~1,5 MB je Reel).
  # Video-Index zuerst (22.09.): 150 CJ-Listen-Aufrufe je Lauf fuellen dropship/_cj_video_index.json,
  # der Motor nimmt daraus fast sichere Treffer. BATCH 3 (Betreiber 22.09.: TikTok + Instagram im Fokus,
  # jede Plattform bekommt ein EIGENES Reel → Bedarf ~5–6 je Tag).
  INDEX_CALLS=${INDEX_CALLS:-150} flock -n /tmp/cj_video_index.lock /opt/node22/bin/node automation/cj_video_index.mjs 9>&- || true
  BATCH=${BATCH:-3} /opt/node22/bin/node automation/cj_video_reel_engine.mjs
  sleep "${TAKT:-21600}" 9>&-
done
