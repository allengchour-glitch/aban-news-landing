#!/usr/bin/env bash
# LuxeStyle VPS - API-Jobs (kein Browser, kein PC). Per cron, idempotent + resuemierbar.
# Nutzt die schon funktionierenden Shopify-API-Skripte. Secrets aus /opt/luxe/.env (NIE im Repo).
# Cron-Beispiel (taeglich 04:00):  0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh >> /opt/luxe/api-jobs.log 2>&1
set -uo pipefail
BR="claude/luxestyle-product-CizQ6"
cd "$(dirname "$0")/../.." || exit 1
log(){ echo "[$(date -u +%FT%TZ)] $*"; }

# 1) Neuesten Code holen (idempotent)
git pull --rebase origin "$BR" 2>/dev/null || log "git pull uebersprungen"

# 2) Secrets laden (Shopify-Creds). Datei /opt/luxe/.env anlegen mit:
#    SHOPIFY_CLIENT_ID=... / SHOPIFY_CLIENT_SECRET=... / SHOPIFY_SHOP=au3j0y-hq.myshopify.com
if [ -f /opt/luxe/.env ]; then set -a; . /opt/luxe/.env; set +a; else log "WARN: /opt/luxe/.env fehlt -> keine Shopify-Creds"; fi
NODE="$(command -v node || echo /usr/bin/node)"

# 3) Jobs (idempotent; MAX begrenzt pro Lauf; DRY=1 zum Testen vorne dranstellen)
log "SEO/Feed-Polish (Google-Merchant-Felder)..."
MAX="${MAX:-300}" "$NODE" automation/feed_polish.mjs 2>&1 | tail -8 || log "feed_polish Fehler (weiter)"
log "Mode-Beschreibungen anreichern..."
MAX="${MAX:-150}" "$NODE" automation/enrich_apparel_descriptions.mjs 2>&1 | tail -8 || log "enrich Fehler (weiter)"

# 4) Ergebnis-Reports committen (falls die Skripte welche schreiben)
git add -A reports/ 2>/dev/null || true
git commit -m "vps(api): geplanter SEO/Feed-Lauf" 2>/dev/null || true
git pull --rebase origin "$BR" 2>/dev/null || true
git push origin "$BR" 2>/dev/null || true
log "fertig."
