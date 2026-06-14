#!/usr/bin/env bash
# LuxeStyle Autopilot + Gelato — VOLLAUTONOMES Deploy (läuft auch in einer Cloud-Session)
# ------------------------------------------------------------------------------------
# Braucht KEIN Browser-Login. Authentifizierung per Cloudflare-API-Token (Env-Var).
# Token-Scopes (Dashboard → My Profile → API Tokens → "Edit Cloudflare Workers"-Vorlage):
#   Account · Workers Scripts:Edit · Workers KV Storage:Edit · Workers R2 Storage:Edit · Account Settings:Read
#
# Pflicht-Env:   CLOUDFLARE_API_TOKEN
# Optional-Env:  CLOUDFLARE_ACCOUNT_ID (sonst Auto-Detect, falls Token nur 1 Account hat)
#                GELATO_API_KEY  SHOPIFY_WEBHOOK_SECRET  WEBHOOK_TOKEN
#                GEMINI_API_KEY  IG_USER_ID  IG_ACCESS_TOKEN  FB_PAGE_ID  FB_PAGE_ACCESS_TOKEN
#                THREADS_ACCESS_TOKEN  LUMA_API_KEY  RUN_KEY
# Aufruf:        cd cloudflare && CLOUDFLARE_API_TOKEN=… GELATO_API_KEY=… bash auto-deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
WR="npx --yes wrangler@4"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN fehlt}"

echo "== 1) Abhängigkeiten =="; npm install --no-audit --no-fund >/dev/null 2>&1 || npm install

echo "== 2) Token prüfen =="; $WR whoami | tail -3

echo "== 3) KV-Namespace STATE =="
if grep -q 'REPLACE_WITH_KV_NAMESPACE_ID' wrangler.toml; then
  KV_OUT="$($WR kv namespace create STATE 2>&1 || true)"; echo "$KV_OUT" | tail -4
  KV_ID="$(echo "$KV_OUT" | grep -oE '[0-9a-f]{32}' | head -1)"
  [ -n "$KV_ID" ] && sed -i "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml && echo "  ✓ KV id=$KV_ID in wrangler.toml"
else echo "  KV-id schon gesetzt — übersprungen."; fi

echo "== 4) R2-Bucket =="; $WR r2 bucket create luxestyle-autopilot 2>&1 | tail -2 || echo "  (existiert evtl. schon — ok)"

echo "== 5) Erst-Deploy → URL =="
DEP="$($WR deploy 2>&1)"; echo "$DEP" | tail -6
URL="$(echo "$DEP" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)"
if [ -n "$URL" ]; then sed -i "s#PUBLIC_BASE = \"[^\"]*\"#PUBLIC_BASE = \"$URL\"#" wrangler.toml && echo "  ✓ PUBLIC_BASE=$URL"; fi

echo "== 6) Secrets setzen (nur die, die als Env-Var da sind) =="
put(){ local n="$1"; local v="${!1:-}"; if [ -n "$v" ]; then printf '%s' "$v" | $WR secret put "$n" >/dev/null 2>&1 && echo "  ✓ $n"; else echo "  – $n (nicht gesetzt)"; fi; }
for s in GELATO_API_KEY SHOPIFY_WEBHOOK_SECRET WEBHOOK_TOKEN GEMINI_API_KEY IG_USER_ID IG_ACCESS_TOKEN FB_PAGE_ID FB_PAGE_ACCESS_TOKEN THREADS_ACCESS_TOKEN LUMA_API_KEY RUN_KEY; do put "$s"; done

echo "== 7) Gelato-Map in KV =="
[ -f gelato_map.json ] && $WR kv key put --binding=STATE gelato_map --path=gelato_map.json 2>&1 | tail -1 || echo "  gelato_map.json fehlt"

echo "== 8) Final deploy =="; $WR deploy 2>&1 | tail -4

echo ""; echo "✅ FERTIG."
echo "   PUBLIC_BASE = ${URL:-<siehe oben>}"
echo "   Shopify-Webhook-Ziel: ${URL:-<URL>}/webhooks/orders/create?t=\$WEBHOOK_TOKEN"
echo "   (Webhook wird separat per Shopify-Admin-API angelegt — kein manuelles Secret nötig.)"
