#!/usr/bin/env bash
# deploy-now.sh — baut _site/ und deployt es nach Cloudflare Pages (abannews).
# Wird als /usr/local/bin/abannews-deploy installiert. Erwartet, dass
# CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID gesetzt sind (über EnvironmentFile
# beim Timer, oder beim manuellen Aufruf via /etc/abannews/deploy.env).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/abannews}"
ENV_FILE="/etc/abannews/deploy.env"
CF_PAGES_PROJECT="${CF_PAGES_PROJECT:-abannews}"

# Beim manuellen Aufruf die Secrets laden (Timer liefert sie via EnvironmentFile).
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✗ CLOUDFLARE_API_TOKEN fehlt — bitte $ENV_FILE ausfüllen."; exit 1
fi

cd "$APP_DIR"
echo "▶ build-pages.sh"
bash build-pages.sh

echo "▶ wrangler pages deploy (Projekt: $CF_PAGES_PROJECT)"
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}" \
  npx --yes wrangler@3 pages deploy _site \
    --project-name="$CF_PAGES_PROJECT" \
    --branch=main \
    --commit-dirty=true

echo "✅ Deploy abgeschlossen."
