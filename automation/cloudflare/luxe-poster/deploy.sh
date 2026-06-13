#!/usr/bin/env bash
# LuxeStyle — Ein-Klick-Deploy des autonomen IG/FB-Posters auf Cloudflare.
# Danach postet Cloudflare 2×/Tag selbstständig (Cron), ohne PC/GitHub/Nachfragen.
#
# NUTZUNG (einmalig, am PC oder durch PC-Claude):
#   META_ACCESS_TOKEN="EAAB..." TRIGGER_KEY="meinpasswort" bash deploy.sh
#
# Voraussetzung: Node/npm vorhanden. wrangler wird bei Bedarf installiert.
set -e
cd "$(dirname "$0")"

command -v wrangler >/dev/null 2>&1 || npm i -g wrangler

echo "→ Cloudflare-Login (Browser öffnet sich, falls nötig)…"
wrangler whoami >/dev/null 2>&1 || wrangler login

# KV-Namespace anlegen + ID in wrangler.toml eintragen (nur beim ersten Mal)
if grep -q REPLACE_WITH_KV_ID wrangler.toml; then
  echo "→ KV-Namespace LUXE_KV anlegen…"
  OUT=$(wrangler kv namespace create LUXE_KV 2>&1) || true
  ID=$(printf '%s' "$OUT" | grep -oE '[0-9a-f]{32}' | head -1)
  if [ -z "$ID" ]; then echo "⚠️ Konnte KV-ID nicht lesen. Ausgabe:"; echo "$OUT"; exit 1; fi
  sed -i.bak "s/REPLACE_WITH_KV_ID/$ID/" wrangler.toml && rm -f wrangler.toml.bak
  echo "  KV-ID gesetzt: $ID"
fi

# Secrets setzen (nur wenn als Env übergeben)
if [ -n "$META_ACCESS_TOKEN" ]; then printf '%s' "$META_ACCESS_TOKEN" | wrangler secret put META_ACCESS_TOKEN; fi
if [ -n "$TRIGGER_KEY" ]; then printf '%s' "$TRIGGER_KEY" | wrangler secret put TRIGGER_KEY; fi

echo "→ Deploy…"
wrangler deploy

echo "✅ Fertig. Cloudflare postet jetzt 2×/Tag autonom (Cron 09:00 & 17:00 UTC)."
echo "   Sofort-Test:  https://luxe-poster.<dein-subdomain>.workers.dev/?key=$TRIGGER_KEY"
