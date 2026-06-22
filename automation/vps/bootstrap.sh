#!/usr/bin/env bash
# LuxeStyle VPS - EIN-ZEILEN-SETUP. Macht ALLES allein: installieren, einrichten, taeglich starten.
# Aufruf (eine Zeile, als root):
#   curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-product-CizQ6/automation/vps/bootstrap.sh | bash
set -uo pipefail
BR="claude/luxestyle-product-CizQ6"
REPO_URL="https://github.com/allengchour-glitch/aban-news-landing.git"
say(){ printf "\n\033[1;36m>> %s\033[0m\n" "$*"; }

say "1/5  Node + git installieren..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 || true
  apt-get install -y nodejs git >/dev/null 2>&1 || apt-get install -y nodejs npm git >/dev/null 2>&1
fi
command -v git >/dev/null 2>&1 || apt-get install -y git >/dev/null 2>&1

say "2/5  Repo holen nach /opt/luxe/repo..."
mkdir -p /opt/luxe
if [ -d /opt/luxe/repo/.git ]; then git -C /opt/luxe/repo pull --rebase origin "$BR" 2>/dev/null || true
else git clone -b "$BR" "$REPO_URL" /opt/luxe/repo 2>/dev/null; fi

say "3/5  Shopify-Zugang einrichten (.env)..."
if [ ! -f /opt/luxe/.env ]; then
  echo "Bitte den Shopify-Secret einfuegen (beginnt mit shpss_ ) und Enter:"
  read -r -s SECRET; echo
  cat > /opt/luxe/.env <<ENV
SHOPIFY_CLIENT_ID=ffe6c3a1326affdd7f461760ac1a8950
SHOPIFY_CLIENT_SECRET=${SECRET}
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
ENV
  chmod 600 /opt/luxe/.env
  echo "OK - Secret gespeichert (nur lokal, nicht im Repo)."
else echo "/opt/luxe/.env existiert schon - lasse ich."; fi

say "4/5  Testlauf (DRY - aendert NICHTS)..."
DRY=1 MAX=20 bash /opt/luxe/repo/automation/vps/run-api-jobs.sh || true

say "5/5  Taeglichen Auto-Lauf einrichten (cron 04:00)..."
( crontab -l 2>/dev/null | grep -v run-api-jobs.sh; echo "0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh >> /opt/luxe/api-jobs.log 2>&1" ) | crontab -

say "FERTIG. Der VPS fuellt ab jetzt taeglich autonom SEO/Feed-Felder. Log: /opt/luxe/api-jobs.log"
echo "Echten Lauf JETZT testen:  bash /opt/luxe/repo/automation/vps/run-api-jobs.sh"
