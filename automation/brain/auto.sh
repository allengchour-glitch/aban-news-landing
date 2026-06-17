#!/usr/bin/env bash
# 🤖 LuxeStyle AUTO-MODUS — EIN Befehl, der alles selbst macht (User 2026-06-13: „muss nichts mehr
# das gleiche sagen"). Kette: analysieren → lernen → Autopost-Queue aus Gelerntem nachfuellen →
# naechste Aktionen + Follower-/Manuell-Hebel ausgeben. No-op-safe an jeder Stelle.
#
#   bash automation/brain/auto.sh
#
set -u
cd "$(dirname "$0")/../.." || exit 1
echo "════════════════════════════════════════════════"
echo "🤖 LuxeStyle AUTO-MODUS — $(date -u +%Y-%m-%dT%H:%MZ)"
echo "════════════════════════════════════════════════"

echo "🩺 [1/6] HEALTH — welche GRATIS-KI-Provider/Tools leben gerade? ..."
node automation/health-check.mjs --ai 2>&1 | sed 's/^/   /'

echo "📊 [2/6] ANALYSIEREN — frische TikTok-Daten ..."
python3 tools/tiktok_analyze.py --user @luxestyle.ch --max 60 --insecure --out reports/ 2>&1 | tail -2 \
  || echo "   (yt-dlp blockiert → nutze vorhandene Reports)"

echo "📈 [3/6] TRENDS + MUSIK — Schweiz analysieren & Ideen entwickeln ..."
node automation/trends/trend_scan.mjs 2>&1 | sed 's/^/   /'

echo "🧠 [4/6] LERNEN — Gehirn (kumulativ, Ratsche) ..."
node automation/brain/brain.mjs 2>&1 | sed 's/^/   /'

echo "📤 [5/6] AUTOPOST — Queue aus gelernten Captions nachfuellen ..."
node automation/brain/build_queue.mjs 2>&1 | sed 's/^/   /'

echo "🎯 [6/6] NAECHSTE AKTIONEN (aus BRAIN.md):"
awk '/## 🎯/{f=1;next} /^## /{f=0} f' automation/brain/BRAIN.md | sed 's/^/   /'

echo "────────────────────────────────────────────────"
echo "🇨🇭 FOLLOWER-WACHSTUM (laeuft nur am PC-Claude, Browser/CDP — 1x/Tag):"
echo "   node automation/local/ch-follower-growth.mjs      # echte CH-Follower (Caps, sicher)"
echo "   node automation/local/ch-unfollow.mjs             # 1x/Woche: Nicht-Zurueckfolger entfolgen"
echo "🔒 NUR DU (bringt Kaeufe): Pixel + CH-Kampagne · AGB-Domain · ggf. neue CJ-Creds."
echo "📤 AUTOPOST live schalten: Cloudflare-Worker deployt? (automation/cloudflare/luxe-poster/deploy.sh)"
echo "✅ AUTO-MODUS fertig. Nichts mehr zu sagen — beim naechsten Lauf lernt das Gehirn weiter."
