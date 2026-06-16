#!/usr/bin/env bash
# render_savelist_reel.sh — «3 Finds»-Save-Listen-Reel (Save-Trigger = Reichweite-Signal #1 nach Comments).
# Gehirn rules.share_formats: Save-Liste (3-in-1) + expliziter Speicher-CTA. Treibt 📌-Saves.
#
# Nutzung:
#   ./render_savelist_reel.sh i1 p1 i2 p2 i3 p3 "<Hook>" "<CTA>" <out.mp4>
#   (i*=Bild-URL/Datei, p*=Preis-Label wie «CHF 34.90»)
# 9:16, 8s, stumm, SAFE-ZONE (Text endet y<=1470).
set -euo pipefail
I1="$1"; P1="$2"; I2="$3"; P2="$4"; I3="$5"; P3="$6"; HOOK="$7"; CTA="$8"; OUT="$9"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
fetch(){ case "$1" in http*) curl -sL --max-time 60 "$1" -o "$2";; *) cp "$1" "$2";; esac; }
fetch "$I1" "$TMP/1.img"; fetch "$I2" "$TMP/2.img"; fetch "$I3" "$TMP/3.img"
mkdir -p "$(dirname "$OUT")"
esc(){ printf '%s' "$1" | sed -e "s/\\\\/\\\\\\\\/g" -e "s/:/\\\\:/g" -e "s/'/\\\\\\\\'/g" -e "s/%/\\\\%/g"; }
H="$(esc "$HOOK")"; C="$(esc "$CTA")"; Q1="$(esc "$P1")"; Q2="$(esc "$P2")"; Q3="$(esc "$P3")"
# 3 Bilder gestapelt (je 1080x510): y 190..700, 700..1210, 1210..1720. Hook oben, CTA-Band y1370.
ffmpeg -y -loop 1 -t 8 -i "$TMP/1.img" -loop 1 -t 8 -i "$TMP/2.img" -loop 1 -t 8 -i "$TMP/3.img" -filter_complex "
color=c=0x0b0b0f:s=1080x1920:d=8[bg];
[0:v]scale=1080:510:force_original_aspect_ratio=increase,crop=1080:510[a];
[1:v]scale=1080:510:force_original_aspect_ratio=increase,crop=1080:510[b];
[2:v]scale=1080:510:force_original_aspect_ratio=increase,crop=1080:510[c];
[bg][a]overlay=0:190[t1];[t1][b]overlay=0:705[t2];[t2][c]overlay=0:1220[t3];
[t3]drawbox=x=0:y=60:w=1080:h=110:color=0x0b0b0f@0.65:t=fill,
drawtext=fontfile=${FONT}:text='${H}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=84,
drawbox=x=40:y=210:w=230:h=70:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='${Q1}':fontcolor=0x1a1206:fontsize=40:x=58:y=224,
drawbox=x=40:y=725:w=230:h=70:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='${Q2}':fontcolor=0x1a1206:fontsize=40:x=58:y=739,
drawbox=x=40:y=1240:w=230:h=70:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='${Q3}':fontcolor=0x1a1206:fontsize=40:x=58:y=1254,
drawbox=x=0:y=1370:w=1080:h=100:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='${C}':fontcolor=0x1a1206:fontsize=34:x=(w-text_w)/2:y=1400
" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -an "$OUT"
echo "✓ $OUT"
