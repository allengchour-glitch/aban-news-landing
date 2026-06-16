#!/bin/bash
# render_value_reel.sh — VALUE/Tipp-Reel (80/20-Regel, 2026-Recherche): Mehrwert statt Produkt-Promo
# → treibt SAVES & SHARES (die Reichweite-Signale, die uns fehlen). Tipps erscheinen nacheinander.
# Nutzung: ./render_value_reel.sh <bild|url> "<Titel>" "<Tipp1>" "<Tipp2>" "<Tipp3>" "<Tipp4>" "<CTA>" <out.mp4>
# 9:16, ~12s, Musik (CC-BY), Safe-Zone (Text endet y<=1480). SILENT=1 = stumm (TikTok).
set -e
SRC="$1"; TITLE="$2"; T1="$3"; T2="$4"; T3="$5"; T4="$6"; CTA="$7"; OUT="$8"
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
RD="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; NODE="$(command -v node || echo /opt/node22/bin/node)"
TMP=$(mktemp --suffix=.jpg); case "$SRC" in http*) curl -s -L -o "$TMP" "$SRC";; *) cp "$SRC" "$TMP";; esac
mkdir -p "$(dirname "$OUT")"
esc(){ printf '%s' "$1" | sed -e "s/\\\\/\\\\\\\\/g" -e "s/:/\\\\:/g" -e "s/'/\\\\\\\\'/g" -e "s/%/\\\\%/g"; }
TT="$(esc "$TITLE")"; A="$(esc "$T1")"; B="$(esc "$T2")"; C="$(esc "$T3")"; D="$(esc "$T4")"; E="$(esc "$CTA")"
# dunkler, unscharfer Voll-BG (Produkt schwach sichtbar) → weisser Text knallt. Tipps gestaffelt.
VF="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:3,eq=brightness=-0.42:saturation=1.05,vignette=PI/5[bg];
[bg]drawbox=x=0:y=70:w=1080:h=150:color=0x0b0b0f@0.55:t=fill,
drawtext=fontfile=$F:text='${TT}':fontcolor=0xF5E6C8:fontsize=52:x=(w-text_w)/2:y=120:alpha='if(lt(t,0.4),t/0.4,1)',
drawtext=fontfile=$F:text='• ${A}':fontcolor=white:fontsize=44:x=80:y=560:alpha='if(lt(t,1.0),0,1)',
drawtext=fontfile=$F:text='• ${B}':fontcolor=white:fontsize=44:x=80:y=740:alpha='if(lt(t,2.6),0,1)',
drawtext=fontfile=$F:text='• ${C}':fontcolor=white:fontsize=44:x=80:y=920:alpha='if(lt(t,4.2),0,1)',
drawtext=fontfile=$F:text='• ${D}':fontcolor=white:fontsize=44:x=80:y=1100:alpha='if(lt(t,5.8),0,1)',
drawbox=x=0:y=1380:w=1080:h=100:color=0xC9A24F@0.92:t=fill,
drawtext=fontfile=$F:text='${E}':fontcolor=0x1A1206:fontsize=38:x=(w-text_w)/2:y=1410:alpha='if(lt(t,6.5),0,1)'[v]"
TRK=""
if [ "${SILENT:-0}" != "1" ]; then TRK=$(mktemp --suffix=.wav)
  "$NODE" "$RD/automation/music/music_library.mjs" pick --mood "${MOOD:-elegant}" --dur 12 --out "$TRK" >/dev/null 2>&1 && [ -s "$TRK" ] || TRK=""; fi
if [ -n "$TRK" ]; then
  ffmpeg -y -loop 1 -i "$TMP" -i "$TRK" -t 12 -r 30 -filter_complex \
"$VF;[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=11:d=1,volume=0.5,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -c:a aac -b:a 128k -shortest "$OUT"; rm -f "$TRK"
else
  ffmpeg -y -loop 1 -i "$TMP" -t 12 -r 30 -filter_complex "$VF" -map "[v]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -an "$OUT"; fi
rm -f "$TMP"; echo "OK $OUT ($(stat -c%s "$OUT") bytes)"
