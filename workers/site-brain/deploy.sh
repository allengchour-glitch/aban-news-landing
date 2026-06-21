#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — montiert das Site-Brain (Cloudflare-Cron-Worker, gratis).
# -----------------------------------------------------------------------------
#  Das "zweite Gehirn": überwacht abannews.com alle 6 h (Health-Score, Alarm).
#  Es fixt/deployt NICHTS an der Seite — es ist nur das Auge.
#
#  Voraussetzung (nur du): ein Cloudflare-Token mit  Workers Scripts: Edit
#  (für KV-Verlauf zusätzlich  Workers KV Storage: Edit), von erlaubter IP:
#     export CLOUDFLARE_API_TOKEN=...     ODER   npx wrangler login
#
#  Optional Alarm per Telegram (vor dem Deploy einmalig):
#     npx wrangler secret put TELEGRAM_BOT_TOKEN
#     npx wrangler secret put TELEGRAM_CHAT_ID
#
#  Aufruf:  bash workers/site-brain/deploy.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"
WR="npx --yes wrangler@latest"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && ! $WR whoami >/dev/null 2>&1; then
  echo "❌ Kein Zugang. Einmal:  npx wrangler login"
  echo "   ODER:  export CLOUDFLARE_API_TOKEN=...  (Workers Scripts:Edit, von erlaubter IP)"
  exit 1
fi

echo "── Site-Brain deployen ──"
$WR deploy

cat <<'EOF'

✅ Site-Brain montiert. Es prüft abannews.com ab jetzt alle 6 h automatisch.
   Status live ansehen:  https://aban-site-brain.<dein-subdomain>.workers.dev/
   (Worker-URL zeigt wrangler nach dem Deploy an.)

Optional Verlauf/History: KV-Namespace anlegen + in wrangler.toml eintragen:
   npx wrangler kv namespace create BRAIN_KV
EOF
