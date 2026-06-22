#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# LuxeStyle 24/7 AUTONOMER BOT — Server-Setup (Hetzner/Ubuntu)
# EINMAL auf dem Server ausführen. Danach läuft der Bot per Cron rund um die Uhr.
#
# So nutzt du es (auf dem Hetzner-Server als root):
#   1) bash server-setup.sh
#   2) nano /root/luxe-bot/.env   → deine Keys eintragen (Vorlage wird angelegt)
#   3) fertig — Cron startet den Bot automatisch alle 30 Min
# ═══════════════════════════════════════════════════════════════════════════
set -e
BOT=/root/luxe-bot
REPO="https://github.com/allengchour-glitch/aban-news-landing.git"
BRANCH="claude/memory-2026-06-13"

echo "▶ 1/5  System-Pakete + Node 22 installieren …"
apt-get update -y -qq
apt-get install -y -qq git curl ca-certificates
if ! command -v node >/dev/null || [ "$(node -v 2>/dev/null | cut -dv -f2 | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
fi
echo "   Node: $(node -v)"

echo "▶ 2/5  Repo klonen/aktualisieren …"
if [ -d "$BOT/repo/.git" ]; then
  git -C "$BOT/repo" fetch origin "$BRANCH" -q && git -C "$BOT/repo" reset --hard "origin/$BRANCH" -q
else
  mkdir -p "$BOT"
  # Privates Repo: ggf. mit Token klonen → https://<GITHUB_TOKEN>@github.com/...
  git clone -q -b "$BRANCH" "$REPO" "$BOT/repo" || {
    echo "   ⚠️ Klon fehlgeschlagen (privates Repo?). Nutze: git clone -b $BRANCH https://<DEIN_GITHUB_TOKEN>@github.com/allengchour-glitch/aban-news-landing.git $BOT/repo"
    exit 1; }
fi

echo "▶ 3/5  .env-Vorlage anlegen (falls nicht vorhanden) …"
if [ ! -f "$BOT/.env" ]; then
cat > "$BOT/.env" <<'ENV'
# ── Shopify (Custom-App Client-Credentials) ──
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
# ── Lieferant + KI ──
BIGBUY_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
# ── Bot-Verhalten ──
CATS=rucksaecke,beleuchtung,garten,camping,haarstyling,bar,pool
PER=6
GAP=2500
ENV
  echo "   → $BOT/.env angelegt. JETZT mit deinen Keys füllen: nano $BOT/.env"
fi

echo "▶ 4/5  Bot-Loop-Skript installieren …"
cp "$BOT/repo/automation/server-bot-loop.sh" "$BOT/bot-loop.sh"
chmod +x "$BOT/bot-loop.sh"

echo "▶ 5/5  Cron einrichten (alle 30 Min, mit Lock gegen Überlappung) …"
CRON="*/30 * * * * /usr/bin/flock -n /tmp/luxebot.lock /root/luxe-bot/bot-loop.sh >> /root/luxe-bot/bot.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'luxe-bot/bot-loop.sh'; echo "$CRON" ) | crontab -
apt-get install -y -qq util-linux >/dev/null 2>&1 || true

echo ""
echo "✅ FERTIG. Nächster Schritt:  nano $BOT/.env   (Keys eintragen) → dann läuft der Bot alle 30 Min."
echo "   Logs ansehen:  tail -f $BOT/bot.log"
echo "   Sofort testen: cd $BOT && ./bot-loop.sh"
