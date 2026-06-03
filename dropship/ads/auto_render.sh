#!/usr/bin/env bash
# LuxeStyle — Auto-Render-Engine: baut automatisch EIN Reel aus gut bewerteten Produkten
# (Allow-Liste automation/good_products.csv = Regel 7b: nur geprüfte Produkte mit echtem Top-Bild),
# rendert es vertikal mit Hook + Musik und hängt es als status=ready an die Queue (reels_seed.csv).
# Rotiert über die Liste (Pointer-Datei), damit nichts doppelt/random kommt.
# Lokal testbar; läuft auch in .github/workflows/reel-render.yml.
#   Nutzung:  N=5 dropship/ads/auto_render.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LIST="$ROOT/automation/good_products.csv"
MUSIC="$ROOT/automation/reel_music.m4a"
QUEUE="$ROOT/automation/reels_seed.csv"
PTR="$ROOT/automation/.render_pointer"
N="${N:-5}"                          # Produkte pro Reel (max 9)
BASEURL="${BASEURL:-https://abannews.com/reels}"
HOOKS=("Welcher Look ist deiner?" "Sommer-Looks, die auffallen" "Dein Sommer-Favorit?" "Welches Teil nimmst du?" "Sommer-Mode 2026")
# Rotierende, conversion-fokussierte Caption-Templates (%s = gezeigtes Top-Produkt) — nie zwei gleich hintereinander.
CAPS=(
  "%s & mehr Sommer-Lieblinge ✨ Schweizer Shop · Gratis-Versand ab CHF 65 · -10%% mit Code WELCOME10 → luxestyle.ch"
  "Welcher Look ist deiner? 👇 Sommer-Favoriten wie %s ab CHF 34.90. Code WELCOME10 = -10%% → luxestyle.ch"
  "Sommer 2026 bei LuxeStyle ☀️ %s & weitere Looks. -10%% mit WELCOME10 · Gratis-Versand ab CHF 65 → luxestyle.ch"
  "Neu für deinen Sommer: %s 🤍 Plus weitere Styles. Schweizer Shop, -10%% Code WELCOME10 → luxestyle.ch"
  "Spar dir den Designer-Preis 👀 %s & Co. ab CHF 34.90 bei LuxeStyle. -10%% WELCOME10 → luxestyle.ch"
)
TAGSETS=(
  "#schweizmode #sommerkleid #ootdschweiz #fashiontiktokschweiz #luxestyle"
  "#swissfashion #sommeroutfit #ootd #fashionschweiz #styletipps"
  "#sommermode2026 #ootdschweiz #fashiontiktok #schweizmode #kleider"
)

[ -f "$LIST" ] || { echo "good_products.csv fehlt"; exit 0; }
[ -f "$MUSIC" ] || { echo "reel_music.m4a fehlt"; exit 0; }
mapfile -t LINES < <(tail -n +2 "$LIST" | sed '/^$/d')
TOTAL=${#LINES[@]}
[ "$TOTAL" -ge 1 ] || { echo "Allow-Liste leer"; exit 0; }

start=0; [ -f "$PTR" ] && start=$(cat "$PTR" 2>/dev/null || echo 0)
WORK=$(mktemp -d); IMGDIR="$WORK/img"; mkdir -p "$IMGDIR"; : > "$IMGDIR/names.txt"
k=0
for ((j=0;j<N && j<TOTAL;j++)); do
  idx=$(( (start + j) % TOTAL ))
  line="${LINES[$idx]}"
  url=$(printf '%s' "$line" | cut -d, -f2)
  label=$(printf '%s' "$line" | cut -d, -f3-)
  nk=$((k+1))
  if curl -sL --fail "$url" -o "$IMGDIR/$nk.jpg"; then
    echo "$label" >> "$IMGDIR/names.txt"; k=$nk
  else
    echo "WARN: Bild-Download fehlgeschlagen: $url" >&2
  fi
done
[ "$k" -ge 2 ] || { echo "Zu wenige Bilder ($k) — abgebrochen."; rm -rf "$WORK"; exit 0; }
echo "$(( (start + N) % TOTAL ))" > "$PTR"

HOOK="${HOOKS[$(( start % ${#HOOKS[@]} ))]}"
SLUG="auto-$(date +%Y%m%d-%H%M)"
mkdir -p "$ROOT/reels"
# Schnelleres, TikTok-natives Pacing (kurze Segmente + knappe Fades) — via Env überschreibbar.
HOOK="$HOOK" SEG="${SEG_DUR:-1.7}" T="${FADE_DUR:-0.35}" bash "$ROOT/dropship/ads/render_premium_reel.sh" "$ROOT/reels/$SLUG.mp4" "$MUSIC" "$IMGDIR"

# Queue-Zeile (ready) anhängen — CSV-sicher gequotet
csv(){ printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"; }
ID=$(date +%s)
FEATURED=$(head -1 "$IMGDIR/names.txt")
# shellcheck disable=SC2059
CAP=$(printf "${CAPS[$(( start % ${#CAPS[@]} ))]}" "$FEATURED")
TAGS="${TAGSETS[$(( start % ${#TAGSETS[@]} ))]}"
printf '%s,%s,%s,%s,%s,%s,ready,,\n' "$ID" "$(date +%F)" "$(csv "$BASEURL/$SLUG.mp4")" "$(csv "$CAP")" "$(csv "$TAGS")" "$(csv "tiktok,instagram")" >> "$QUEUE"

echo ">> Auto-Reel: reels/$SLUG.mp4 ($k Produkte, Hook: \"$HOOK\") + Queue-Zeile ready. Pointer→$(cat "$PTR")"
rm -rf "$WORK"
