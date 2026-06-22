#!/bin/bash
# LuxeStyle VPS - Cloud-Init (Hetzner "Cloud config / User data" Feld beim Server-Erstellen einfuegen).
# Der Server richtet sich beim ERSTEN Start KOMPLETT selbst ein: Node+git, Repo, taeglicher Auto-Lauf.
# KEIN SSH/Konsole noetig. Danach nur EINMAL den Shopify-Secret in /opt/luxe/.env eintragen (Claude guidet, 30 Sek).
exec > /var/log/luxe-cloudinit.log 2>&1
set -x
BR="claude/luxestyle-product-CizQ6"
REPO_URL="https://github.com/allengchour-glitch/aban-news-landing.git"

# 1) Node 22 + git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || true
apt-get install -y nodejs git || apt-get install -y nodejs npm git

# 2) Repo
mkdir -p /opt/luxe
git clone -b "$BR" "$REPO_URL" /opt/luxe/repo

# 3) .env-Platzhalter (Secret traegt der User spaeter ein; Runner ueberspringt bis dahin sauber)
if [ ! -f /opt/luxe/.env ]; then
  cat > /opt/luxe/.env <<ENV
SHOPIFY_CLIENT_ID=ffe6c3a1326affdd7f461760ac1a8950
SHOPIFY_CLIENT_SECRET=HIER_SHPSS_SECRET_EINTRAGEN
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
ENV
  chmod 600 /opt/luxe/.env
fi

# 4) Taeglicher Auto-Lauf (cron 04:00) - API-Jobs (SEO/Feed), idempotent
( crontab -l 2>/dev/null | grep -v run-api-jobs.sh; echo "0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh >> /opt/luxe/api-jobs.log 2>&1" ) | crontab -

# 5) Fertig-Marker
echo "LuxeStyle VPS bereit $(date -u +%FT%TZ). Nur noch: /opt/luxe/.env -> SHOPIFY_CLIENT_SECRET eintragen." > /opt/luxe/READY.txt
