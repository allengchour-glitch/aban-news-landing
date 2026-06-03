#!/usr/bin/env bash
# LuxeStyle — Story-Reel (9:16) aus fertigen Produkt-Creatives + Musik.
# Nimmt die PNG-Creatives (render_story_creatives.sh), gibt jedem einen
# sanften Ken-Burns-Zoom, blendet mit slideleft über und legt Musik drunter.
#
# Nutzung:  render_story_reel.sh <out.mp4> <musik.wav> <bild1.png> <bild2.png> ...
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
OUTFILE="${1:?out.mp4 fehlt}"; shift
MUSIC="${1:?musik.wav fehlt}"; shift
IMGS=( "$@" )
[ "${#IMGS[@]}" -ge 2 ] || { echo "mind. 2 Bilder"; exit 1; }
W=$(mktemp -d); SEG=2.6; T=0.4; FPS=30

i=0
for img in "${IMGS[@]}"; do
  # Ken-Burns: langsamer Zoom auf 9:16-Canvas
  $FF -loop 1 -framerate $FPS -t $SEG -i "$img" -filter_complex \
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,\
zoompan=z='min(1+0.0012*on,1.08)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}[v]" \
    -map "[v]" -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/seg_$i.mp4"
  i=$((i+1))
done
N=$i

# xfade-Kette
inputs=""; for ((k=0;k<N;k++)); do inputs+=" -i $W/seg_$k.mp4"; done
fc=""; prev="0:v"; acc=$SEG
for ((k=1;k<N;k++)); do
  off=$(echo "$acc - $T" | bc -l)
  fc+="[${prev}][${k}:v]xfade=transition=slideleft:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(echo "$acc + $SEG - $T" | bc -l)
done
fc+="[${prev}]format=yuv420p[vout]"
$FF $inputs -filter_complex "$fc" -map "[vout]" -r $FPS \
    -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium -movflags +faststart "$W/silent.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/silent.mp4")
FADE=$(echo "$DUR - 1.2" | bc -l)
$FF -i "$W/silent.mp4" -i "$MUSIC" \
    -filter_complex "[1:a]afade=t=out:st=${FADE}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUTFILE"
rm -rf "$W"
echo ">> DONE $OUTFILE (~${DUR}s)"
