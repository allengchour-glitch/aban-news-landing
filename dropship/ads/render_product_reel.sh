#!/usr/bin/env bash
# LuxeStyle — PREMIUM Single-Produkt-Reel: nutzt den bewährten render_premium_reel.sh, aber mit
# MEHREREN Bildern EINES Produkts (Ken-Burns durch die Looks) + Trend-Musik (royalty-free Version +
# Clean-Version für den Trend-Sound in der App) + Text-Overlays (Hook/Name/WELCOME10) und reiht das
# Reel mit dem ECHTEN PRODUKTLINK in die Queue (reels_seed.csv). Clip bleibt in reels/ (für späteren Mix).
#   Nutzung:  bash dropship/ads/render_product_reel.sh <name>   (name = Spalte aus product_reels.csv)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MUSIC="$ROOT/automation/reel_music.m4a"
QUEUE="$ROOT/automation/reels_seed.csv"
MANIFEST="$ROOT/dropship/ads/product_reels.csv"
NAME="${1:?Produkt-name aus product_reels.csv angeben}"
BASEURL="${BASEURL:-https://abannews.com/reels}"
[ -f "$MUSIC" ] || { echo "reel_music.m4a fehlt → No-op."; exit 0; }
[ -f "$MANIFEST" ] || { echo "product_reels.csv fehlt → No-op."; exit 0; }
line=$(grep -m1 "^${NAME}|" "$MANIFEST" || true)
[ -n "$line" ] || { echo "Produkt '$NAME' nicht im Manifest."; exit 1; }
IFS='|' read -r pname label link urls <<< "$line"
WORK=$(mktemp -d); IMG="$WORK/img"; mkdir -p "$IMG"; : > "$IMG/names.txt"
k=0; IFS=',' read -ra arr <<< "$urls"
for u in "${arr[@]}"; do
  u="${u%%\?*}"   # evtl. ?v=… abschneiden
  nk=$((k+1))
  if curl -sL --fail "$u" -o "$IMG/$nk.jpg"; then echo "$label" >> "$IMG/names.txt"; k=$nk; else echo "WARN: Download fehlgeschlagen: $u" >&2; fi
done
[ "$k" -ge 2 ] || { echo "Zu wenige Bilder ($k) — abgebrochen."; rm -rf "$WORK"; exit 0; }
SLUG="product-${NAME}-$(date +%Y%m%d)"
mkdir -p "$ROOT/reels"
HOOK="${HOOK:-Dein Sommer-Moment ✨}" SEG="${SEG_DUR:-2.4}" T="${FADE_DUR:-0.5}" \
  bash "$ROOT/dropship/ads/render_premium_reel.sh" "$ROOT/reels/$SLUG.mp4" "$MUSIC" "$IMG"
csv(){ printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"; }
ID=$(date +%s)
CAP="${label} ✨ Premium-Look aus der Schweiz · -10% mit Code WELCOME10 → ${link}"
TAGS="#schweizmode #sommerkleid #ootdschweiz #fashiontiktokschweiz #luxestyle"
printf '%s,%s,%s,%s,%s,%s,ready,,\n' "$ID" "$(date +%F)" "$(csv "$BASEURL/$SLUG.mp4")" "$(csv "$CAP")" "$(csv "$TAGS")" "$(csv "tiktok,instagram")" >> "$QUEUE"
echo ">> Produkt-Reel reels/$SLUG.mp4 ($k Bilder) + Clean-Version (reels/$SLUG-clean.mp4) + Queue-Zeile (Link: $link)"
rm -rf "$WORK"
