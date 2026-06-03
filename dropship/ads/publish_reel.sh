#!/usr/bin/env bash
# LuxeStyle — Reel veröffentlich-fertig machen: kopiert ein fertiges mp4 in den
# öffentlich gehosteten /reels/-Ordner (GitHub Pages → https://abannews.com/reels/<slug>.mp4)
# und gibt eine fertige CSV-Zeile für das Google-Sheet 'reels_queue' aus.
#
# Nutzung:
#   dropship/ads/publish_reel.sh <mp4> <slug> <scheduled_date> "<caption>" "<hashtags>" [platforms]
# Beispiel:
#   dropship/ads/publish_reel.sh /tmp/relA/out/luxestyle_eleganz.mp4 eleganz 2026-06-05 \
#     "Sommer-Eleganz von LuxeStyle ✨ Kleider ab CHF 34.90. -10% Code WELCOME10 → luxestyle.ch" \
#     "#schweizmode #sommerkleid #ootdschweiz #fashiontiktokschweiz #luxestyle" "tiktok,instagram"
set -euo pipefail

MP4="${1:?Pfad zum mp4 fehlt}"
SLUG="${2:?slug fehlt (z.B. eleganz)}"
DATE="${3:?scheduled_date fehlt (YYYY-MM-DD)}"
CAPTION="${4:?caption fehlt}"
HASHTAGS="${5:-}"
PLATFORMS="${6:-tiktok,instagram}"
BASEURL="${BASEURL:-https://abannews.com/reels}"

# Repo-Wurzel finden (zwei Ebenen über diesem Skript: dropship/ads -> repo)
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/reels"
mkdir -p "$OUT"

[ -f "$MP4" ] || { echo "FEHLER: mp4 nicht gefunden: $MP4" >&2; exit 1; }
cp "$MP4" "$OUT/$SLUG.mp4"
SIZE=$(du -h "$OUT/$SLUG.mp4" | cut -f1)
URL="$BASEURL/$SLUG.mp4"

# CSV-Zeile (Felder mit ; trennen wir NICHT — Google-Sheet-Import nutzt Komma; Caption kann Komma
# enthalten, daher Felder in doppelte Anführungszeichen + interne " verdoppeln)
csv_escape(){ printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"; }
ID="$(date +%s)"
ROW="$ID,$DATE,$(csv_escape "$URL"),$(csv_escape "$CAPTION"),$(csv_escape "$HASHTAGS"),$(csv_escape "$PLATFORMS"),pending,,"

echo ">> Reel kopiert: $OUT/$SLUG.mp4 ($SIZE)"
echo ">> Öffentliche URL (nach git push aktiv): $URL"
echo ">> CSV-Zeile für reels_queue (id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url):"
echo "$ROW"
echo ">> Nächste Schritte: 1) git add reels/$SLUG.mp4 && commit && push  2) Zeile ins Google-Sheet einfügen (status bleibt 'pending' bis Telegram-Freigabe → 'ready')."
