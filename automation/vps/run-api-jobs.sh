#!/usr/bin/env bash
# LuxeStyle VPS - API-Jobs (kein Browser, kein PC). Per cron, idempotent + resuemierbar.
# Nutzt die schon funktionierenden Shopify-API-Skripte. Secrets aus /opt/luxe/.env (NIE im Repo).
# Cron-Beispiel (taeglich 04:00):  0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh >> /opt/luxe/api-jobs.log 2>&1
set -uo pipefail
BR="claude/luxestyle-product-CizQ6"
cd "$(dirname "$0")/../.." || exit 1
log(){ echo "[$(date -u +%FT%TZ)] $*"; }

# 1) Neuesten Code holen - read-only Consumer (committet nie) -> fetch + hard reset = robust gegen
# lokal geschriebene Reports/Logs (sonst wuerde 'pull --rebase' an dirty tree scheitern).
git fetch origin "$BR" 2>/dev/null && git reset --hard "origin/$BR" 2>/dev/null || log "git update uebersprungen"

# 2) Secrets laden (Shopify-Creds). Datei /opt/luxe/.env anlegen mit:
#    SHOPIFY_CLIENT_ID=... / SHOPIFY_CLIENT_SECRET=... / SHOPIFY_SHOP=au3j0y-hq.myshopify.com
if [ -f /opt/luxe/.env ]; then set -a; . /opt/luxe/.env; set +a; else log "WARN: /opt/luxe/.env fehlt -> keine Shopify-Creds"; fi
NODE="$(command -v node || echo /usr/bin/node)"

# 3) Jobs (idempotent; MAX begrenzt pro Lauf; DRY=1 zum Testen vorne dranstellen)
log "SEO/Feed-Polish (Google-Merchant-Felder)..."
MAX="${MAX:-300}" "$NODE" automation/feed_polish.mjs 2>&1 | tail -8 || log "feed_polish Fehler (weiter)"
log "Mode-Beschreibungen anreichern..."
MAX="${MAX:-150}" "$NODE" automation/enrich_apparel_descriptions.mjs 2>&1 | tail -8 || log "enrich Fehler (weiter)"
log "Leere SEO-Meta-Beschreibungen fuellen (ganzer Katalog, idempotent)..."
MAX="${SEO_MAX:-200}" "$NODE" automation/seo_polish.mjs 2>&1 | tail -8 || log "seo_polish Fehler (weiter)"
log "Trend-Scan CH (Google-Trends gratis + AI-Ideen, stateless/safe)..."
"$NODE" automation/trends/trend_scan.mjs 2>&1 | tail -12 || log "trend_scan uebersprungen (weiter)"

# ⚠️ BEWUSST NICHT auf die VPS: KEIN Social-Posting (TikTok/IG/FB/Pinterest). Gruende: (1) Hetzner =
# Rechenzentrums-IP -> Login wird blockiert/herausgefordert; (2) VPS ist read-only mit 'git reset --hard'
# -> Dedup-Ledger (tiktok-ledger/pinterest_done) werden ueberschrieben -> DOPPELPOSTS. Posting bleibt
# Worker-Cron (Meta-API) + PC (Browser). Auf die VPS gehoeren NUR idempotente Direkt-API-Mutationen (oben).

# 4) KEIN git commit/push vom VPS (Verfeinerung 2026-06-22): der VPS-Klon hat keine Push-Credentials ->
# lokale Commits wuerden kuenftige 'git pull --rebase' blockieren. Der VPS aendert Shopify DIREKT per API;
# Reports bleiben lokales Log. Aenderungen am Code holt der VPS oben via read-only 'git pull'.
log "fertig (Reports lokal: /opt/luxe/api-jobs.log)."
