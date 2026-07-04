#!/usr/bin/env bash
# finish-winners.sh — veredelt die rohen Seedance-Winner-Clips (winner-onyx/amore/riviera.mp4) zu post-fertigen
# IG/FB-Reels: Mundart-Hook oben (Safe-Zone) + vibe-passende Musik + WELCOME10-CTA. Läuft in der CLOUD (finish_reel.sh).
# Rohe Clips = env-sound-only → TikTok stumm (raw nutzen); veredelte -ig.mp4 = mit Musik/Text für Meta.
# Nutzung: bash dropship/ads/finish-winners.sh   (idempotent: nur wenn Rohclip existiert; überspringt fehlende)
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
FIN="automation/finish_reel.sh"
[ -f "$FIN" ] || { echo "finish_reel.sh fehlt"; exit 1; }
done=0; skip=0
finish(){ # <raw> <hook> <out>
  if [ -f "$1" ]; then echo "→ finish $1"; bash "$FIN" "$1" "$2" "$3" && done=$((done+1)) || echo "  Fehler bei $1"; else echo "skip (kein Rohclip): $1"; skip=$((skip+1)); fi
}
finish "reels/winner-onyx.mp4"    "Eckig oder rund - was zieht?"          "reels/winner-onyx-ig.mp4"
finish "reels/winner-amore.mp4"   "Das Armband gaht sogar go schwimme"    "reels/winner-amore-ig.mp4"
finish "reels/winner-riviera.mp4" "Die Brille macht jedes Outfit teurer"  "reels/winner-riviera-ig.mp4"
echo "Fertig: $done veredelt, $skip übersprungen."
echo "Hinweis: -ig.mp4 = Meta (Musik+Text). Für TikTok den ROH-Clip stumm hochladen (Trend-Sound in-App)."
