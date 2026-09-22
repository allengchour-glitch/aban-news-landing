#!/bin/bash
# make_reel.sh <src.mp4> <out.mp4> "<Titel Zeile 1>" "<Titel Zeile 2>" "<Preis>" "<Hook>" <musik>   (v2, 22.09.2026)
# Rueckwaerts-kompatibel: 5 Argumente = alte Form <src> <out> "<Titel>" "<Preis>" <musik>.
#
# ⚠️ Die statische ffmpeg-Fassung im Container hat KEIN drawtext (gemessen 22.09.). Text kommt deshalb
# als PNG-Ebenen aus overlay.py (PIL) und wird per `overlay` eingeblendet: eine statische Ebene (Marke,
# Titel auf zwei Zeilen, Preis, Fusszeile) und die HOOK-Ebene fuer die ersten 3,2 s.
set -e
if [ "$#" -ge 7 ]; then SRC="$1"; OUT="$2"; T1="$3"; T2="$4"; PRICE="$5"; HOOK="$6"; MUSIC="$7"
else SRC="$1"; OUT="$2"; T1="$3"; T2=""; PRICE="$4"; HOOK=""; MUSIC="$5"; fi
DUR="${DUR:-11}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d /tmp/reelov.XXXXXX)"; trap 'rm -rf "$TMP"' EXIT
python3 "$HERE/overlay.py" "$TMP/static.png" "$TMP/hook.png" "$T1" "$T2" "$PRICE" "$HOOK"
ffmpeg -y -hide_banner -loglevel error -stream_loop 6 -i "$SRC" -i "$MUSIC" -i "$TMP/static.png" -i "$TMP/hook.png" -t "$DUR" -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.06[bg];
[0:v]scale=1000:-2[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2[base];
[base][2:v]overlay=0:0[v1];
[v1][3:v]overlay=0:0:enable='lt(t,3.2)'[v]
" -map "[v]" -map 1:a -af "afade=t=in:d=0.5,afade=t=out:st=$((DUR-1)):d=1,volume=0.8" \
  -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "$OUT"
