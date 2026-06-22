#!/usr/bin/env bash
# LuxeStyle 24/7-Bot — eine Welle pro Aufruf (vom Cron alle 30 Min gestartet).
# Holt + cleant Produkte (Google-Merchant-sauber) via bigbuy_pipeline.sh.
cd /root/luxe-bot/repo || exit 1
set -a; . /root/luxe-bot/.env; set +a

if [ -z "$SHOPIFY_CLIENT_ID" ] || [ -z "$BIGBUY_API_KEY" ]; then
  echo "$(date '+%F %T') ⚠️ .env nicht vollständig gefüllt (SHOPIFY_CLIENT_ID / BIGBUY_API_KEY fehlen) — bitte nano /root/luxe-bot/.env"
  exit 0
fi

# Pipeline erwartet die Keys teils aus Dateien in /tmp — bereitstellen:
mkdir -p /tmp
echo -n "$BIGBUY_API_KEY" > /tmp/bigbuy_key.txt
echo -n "$GEMINI_API_KEY" > /tmp/gemini_key
echo -n "$GROQ_API_KEY"   > /tmp/groq_key.txt
cat > /tmp/shopify_creds.env <<EOF
SHOPIFY_SHOP=$SHOPIFY_SHOP
SHOPIFY_CLIENT_ID=$SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET=$SHOPIFY_CLIENT_SECRET
EOF

# Neueste Version + Ledger holen (verhindert Doppel-Importe mit den Cloud-Sessions)
git pull --rebase -q 2>/dev/null || true

echo "$(date '+%F %T') ===== Bot-Welle: $CATS (PER=$PER) ====="
CATS="$CATS" PER="${PER:-6}" GAP="${GAP:-2500}" LIVE=1 bash automation/bigbuy_pipeline.sh 2>&1 \
  | grep -E "Neu angelegt:|PIPELINE FERTIG|Keine neuen|on-brand Kandidaten" || true
echo "$(date '+%F %T') ===== Welle fertig ====="
