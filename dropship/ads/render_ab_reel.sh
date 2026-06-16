#!/usr/bin/env bash
# render_ab_reel.sh — A/B-„1 oder 2?"-Vergleichs-Reel (Kommentar-/Share-Treiber).
# Warum: eigene TikTok-Daten = 0 Shares (hohle Reichweite). Gehirn (rules.share_formats):
# A/B-Entscheidung als Split = Comment- & Tag-a-Friend-Maschine. Genau das fehlte.
#
# Nutzung:
#   ./render_ab_reel.sh <img1-url|datei> <img2-url|datei> "<Hook>" "<CTA>" <out.mp4>
# Bsp:
#   ./render_ab_reel.sh https://.../a.jpg https://.../b.jpg "Welä Ohrring — 1 oder 2?" "Schrib 1 oder 2 i d Kommentär · -10% WELCOME10 · luxestyle.ch" reels/ab-ohrringe.mp4
#
# 9:16 (1080x1920), 8s, stumm (für TikTok; Meta-Version kann Musik aus music_library bekommen).
# SAFE-ZONE: aller eingebrannter Text endet bei y<=1470 (nie unter Plattform-Caption).
set -euo pipefail
I1="$1"; I2="$2"; HOOK="$3"; CTA="$4"; OUT="$5"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
fetch(){ case "$1" in http*) curl -sL --max-time 60 "$1" -o "$2";; *) cp "$1" "$2";; esac; }
fetch "$I1" "$TMP/1.img"; fetch "$I2" "$TMP/2.img"
mkdir -p "$(dirname "$OUT")"
# Texte für drawtext escapen (Doppelpunkt/Apostroph). KEINE Emojis (DejaVu kann sie nicht).
esc(){ printf '%s' "$1" | sed -e "s/\\\\/\\\\\\\\/g" -e "s/:/\\\\:/g" -e "s/'/\\\\\\\\'/g" -e "s/%/\\\\%/g"; }
H="$(esc "$HOOK")"; C="$(esc "$CTA")"
# Aufbau: oben Hook-Band; Bild1 (y220..1060), Bild2 (y1060..1920); grosse «1»/«2»; CTA-Band y1360.
ffmpeg -y -loop 1 -t 8 -i "$TMP/1.img" -loop 1 -t 8 -i "$TMP/2.img" -filter_complex "
color=c=0x0b0b0f:s=1080x1920:d=8[bg];
[0:v]scale=1080:840:force_original_aspect_ratio=increase,crop=1080:840[a];
[1:v]scale=1080:840:force_original_aspect_ratio=increase,crop=1080:840[b];
[bg][a]overlay=0:220[t1];
[t1][b]overlay=0:1060[t2];
[t2]drawbox=x=0:y=70:w=1080:h=120:color=0x0b0b0f@0.65:t=fill,
drawtext=fontfile=${FONT}:text='${H}':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=98,
drawbox=x=60:y=250:w=120:h=120:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='1':fontcolor=0x1a1206:fontsize=86:x=92:y=262,
drawbox=x=60:y=1090:w=120:h=120:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='2':fontcolor=0x1a1206:fontsize=86:x=92:y=1102,
drawbox=x=0:y=1360:w=1080:h=110:color=0xd4af37@0.92:t=fill,
drawtext=fontfile=${FONT}:text='${C}':fontcolor=0x1a1206:fontsize=34:x=(w-text_w)/2:y=1392
" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -an "$OUT"
echo "✓ $OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of default=noprint_wrappers=1 "$OUT" 2>/dev/null || true
