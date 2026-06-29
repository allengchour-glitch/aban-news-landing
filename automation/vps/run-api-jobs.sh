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
log "Falsch-markierte Feed-Bloecke bereinigen (Schmuck/Beauty/Accessoires, idempotent)..."
MAX="${STRIP_MAX:-600}" "$NODE" automation/strip_nonapparel_feedblock.mjs 2>&1 | tail -5 || log "strip Fehler (weiter)"
log "Leere SEO-Meta-Beschreibungen fuellen (ganzer Katalog, idempotent)..."
MAX="${SEO_MAX:-200}" "$NODE" automation/seo_polish.mjs 2>&1 | tail -8 || log "seo_polish Fehler (weiter)"
log "Trend-Scan CH (Google-Trends gratis + AI-Ideen, stateless/safe)..."
"$NODE" automation/trends/trend_scan.mjs 2>&1 | tail -12 || log "trend_scan uebersprungen (weiter)"
log "TikTok-Pixel-Healthcheck (Storefront -> Metafeld luxe.pixel_status)..."
"$NODE" automation/vps/pixel_check.mjs 2>&1 | tail -3 || log "pixel_check uebersprungen (weiter)"
log "TikTok-Ad-Stats (nur falls TIKTOK_ACCESS_TOKEN gesetzt) -> Metafeld luxe.tiktok_stats..."
"$NODE" automation/vps/tiktok-stats.mjs 2>&1 | tail -3 || log "tiktok-stats uebersprungen (weiter)"
log "TikTok-Ads-Reporting via Tailscale-Bruecke aus PC-Brave lesen (No-op falls PC aus) -> luxe.tiktok_stats..."
CDP_HOST="${CDP_HOST:-100.71.8.47}" "$NODE" automation/vps/tiktok-ads-read.mjs 2>&1 | tail -4 || log "tiktok-ads-read uebersprungen (weiter)"
log "Ad-Kill/Scale-Entscheidung (Simo-Formel) -> Metafeld luxe.ad_decision..."
"$NODE" automation/ad_manager.mjs 2>&1 | tail -4 || log "ad_manager uebersprungen (weiter)"
log "Smart+/Ads-Probe via Bruecke (liest Shopify-TikTok-Ad-Seite -> luxe.campaign_error, Sicht fuer den Bot-Driver)..."
CDP_HOST="${CDP_HOST:-100.71.8.47}" "$NODE" automation/vps/tiktok-campaign-error.mjs 2>&1 | tail -4 || log "campaign-error-probe uebersprungen (weiter)"
log "Smart+-Driver DRY (pure-playwright, faehrt den Ad-Flow durch, kein Spend) -> luxe.smartplus_status..."
CDP_HOST="${CDP_HOST:-100.71.8.47}" "$NODE" automation/vps/smartplus-drive.mjs 2>&1 | tail -5 || log "smartplus-drive uebersprungen (weiter)"
log "TikTok Events API / CAPI: bezahlte Orders server-seitig an TikTok (No-op ohne Token/Orders)..."
"$NODE" automation/vps/tiktok_capi.mjs 2>&1 | tail -4 || log "tiktok_capi uebersprungen (weiter)"
log "Proof-of-Life Metafeld stempeln (luxe.vps_last_run)..."
"$NODE" automation/vps/stamp_alive.mjs 2>&1 | tail -3 || log "stamp uebersprungen (weiter)"

# ⚠️ BEWUSST NICHT auf die VPS: KEIN Social-Posting (TikTok/IG/FB/Pinterest). Gruende: (1) Hetzner =
# Rechenzentrums-IP -> Login wird blockiert/herausgefordert; (2) VPS ist read-only mit 'git reset --hard'
# -> Dedup-Ledger (tiktok-ledger/pinterest_done) werden ueberschrieben -> DOPPELPOSTS. Posting bleibt
# Worker-Cron (Meta-API) + PC (Browser). Auf die VPS gehoeren NUR idempotente Direkt-API-Mutationen (oben).

# 4) KEIN git commit/push vom VPS (Verfeinerung 2026-06-22): der VPS-Klon hat keine Push-Credentials ->
# lokale Commits wuerden kuenftige 'git pull --rebase' blockieren. Der VPS aendert Shopify DIREKT per API;
# Reports bleiben lokales Log. Aenderungen am Code holt der VPS oben via read-only 'git pull'.
log "fertig (Reports lokal: /opt/luxe/api-jobs.log)."
