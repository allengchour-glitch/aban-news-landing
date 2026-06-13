#!/usr/bin/env bash
# LuxeStyle „Gehirn" — ein Befehl = ein kompletter Lernzyklus (wird mit jedem Lauf besser).
#   1) frische TikTok-Daten ziehen (no-login, yt-dlp)  2) kumulativ ins Gedaechtnis lernen + Pools/Aktionen neu ableiten.
# No-op-safe: faellt yt-dlp aus, lernt das Gehirn aus den schon vorhandenen Reports weiter.
set -u
cd "$(dirname "$0")/../.." || exit 1
echo "🧠 [1/2] TikTok-Analyse (frische Daten) ..."
python3 tools/tiktok_analyze.py --user @luxestyle.ch --max 60 --insecure --out reports/ 2>&1 | tail -3 \
  || echo "  (yt-dlp nicht verfuegbar/blockiert → lerne aus vorhandenen Reports)"
echo "🧠 [2/2] Gehirn lernen ..."
node automation/brain/brain.mjs "$@"
echo "✅ Zyklus fertig → automation/brain/BRAIN.md (Status + naechste Aktionen)"
