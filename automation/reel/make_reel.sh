#!/bin/bash
# make_reel.sh <src.mp4> <out.mp4> "<Titel Zeile 1>" "<Titel Zeile 2>" "<Preis>" "<Hook>" <musik>   (v2, 22.09.2026)
# Rueckwaerts-kompatibel: 5 Argumente = alte Form <src> <out> "<Titel>" "<Preis>" <musik>.
#
# ⚠️ Die statische ffmpeg-Fassung im Container hat KEIN drawtext (gemessen 22.09.). Text kommt deshalb
# 23.09.: Das scharfe Video sitzt im Band 600-1180 (unter Kopf+Hook, ueber dem Fussfeld 1170-1440): Querformat
# 1000 breit, quadratische/hochformatige Quellen auf 580 px Hoehe eingepasst (Probe: ein quadratisches CJ-Video
# blieb zentriert und ragte ins Fussfeld). TikToks Caption deckt die unteren ~480 px, die Suchleiste die oberen ~200.
# als PNG-Ebenen aus overlay.py (PIL) und wird per `overlay` eingeblendet: eine statische Ebene (Marke,
# Titel auf zwei Zeilen, Preis, Fusszeile) und die HOOK-Ebene fuer die ersten 3,2 s.
set -e
if [ "$#" -ge 7 ]; then SRC="$1"; OUT="$2"; T1="$3"; T2="$4"; PRICE="$5"; HOOK="$6"; MUSIC="$7"
else SRC="$1"; OUT="$2"; T1="$3"; T2=""; PRICE="$4"; HOOK=""; MUSIC="$5"; fi
DUR="${DUR:-11}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d /tmp/reelov.XXXXXX)"; trap 'rm -rf "$TMP"' EXIT
python3 "$HERE/overlay.py" "$TMP/static.png" "$TMP/hook.png" "$T1" "$T2" "$PRICE" "$HOOK"
# Musik v2 (23.09.2026): MUSIK_START = gemessener Energie-Einstieg (automation/music/_einstiege.json) statt immer
# Sekunde 0 — bei 11 s kam der Drop sonst oft gar nicht vor. Lautheit per loudnorm auf -14 LUFS (Plattform-Norm)
# statt «volume=0.8» (Stücke lagen zwischen -9 und -15 LUFS).
MUSIK_START="${MUSIK_START:-0}"
ffmpeg -y -hide_banner -loglevel error -stream_loop 6 -i "$SRC" -ss "$MUSIK_START" -i "$MUSIC" -i "$TMP/static.png" -i "$TMP/hook.png" -t "$DUR" -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.06[bg];
[0:v]scale=w='if(gt(ih/iw\,0.58)\,-2\,1000)':h='if(gt(ih/iw\,0.58)\,580\,-2)'[fg];
[bg][fg]overlay=(W-w)/2:600+(580-h)/2[base];
[base][2:v]overlay=0:0[v1];
[v1][3:v]overlay=0:0:enable='lt(t,3.2)'[v]
" -map "[v]" -map 1:a -af "afade=t=in:d=0.3,afade=t=out:st=$((DUR-1)):d=1,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "$OUT"
