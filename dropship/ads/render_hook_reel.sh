#!/usr/bin/env bash
# LuxeStyle — Organisches Hook-Reel: Hook-Karte (2.2s) + Produkt-Montage + Musik.
# Für organisches TikTok/IG-Posten (nicht Ad). Hook = erste 2 Sek halten Zuschauer.
# Nutzung: render_hook_reel.sh <out.mp4> <musik.wav> "<HOOK1>" "<HOOK2>" <bild1> <bild2> ...
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
OUT="${1:?out}"; MUSIC="${2:?musik}"; H1="${3:?hook1}"; H2="${4:?hook2}"; shift 4
IMGS=( "$@" ); W=$(mktemp -d); SEG=2.4; T=0.4; FPS=30
printf '%s' "$H1" > "$W/h1.txt"; printf '%s' "$H2" > "$W/h2.txt"

# Hook-Karte (2.2s): grosse Zeile 1 (ink) + Zeile 2 (gold), Akzentbalken
HFC="[0:v]drawbox=x=80:y=(ih/2)-150:w=10:h=300:color=${GOLD}:t=fill,"
HFC+="drawtext=fontfile=${SANS}:textfile=${W}/h1.txt:fontcolor=${INK}:fontsize=60:x=120:y=(h/2)-150:line_spacing=14:alpha='min(t/0.3,1)',"
HFC+="drawtext=fontfile=${SANS}:textfile=${W}/h2.txt:fontcolor=${GOLD}:fontsize=60:x=120:y=(h/2)+20:line_spacing=14:alpha='min(max((t-0.25)*3,0),1)'[v]"
$FF -f lavfi -t 2.2 -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex "$HFC" -map "[v]" -t 2.2 -r $FPS \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/hook.mp4"

# Produkt-Segmente mit Ken-Burns
i=0
for img in "${IMGS[@]}"; do
  $FF -loop 1 -framerate $FPS -t $SEG -i "$img" -filter_complex \
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,\
zoompan=z='min(1+0.0013*on,1.09)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}[v]" \
    -map "[v]" -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/s_$i.mp4"
  i=$((i+1))
done

segs=( "$W/hook.mp4" ); for ((k=0;k<i;k++)); do segs+=( "$W/s_$k.mp4" ); done
durs=( 2.2 ); for ((k=0;k<i;k++)); do durs+=( $SEG ); done
inputs=""; for s in "${segs[@]}"; do inputs+=" -i $s"; done
fc=""; prev="0:v"; acc=${durs[0]}
for ((k=1;k<${#segs[@]};k++)); do
  off=$(echo "$acc - $T" | bc -l)
  fc+="[${prev}][${k}:v]xfade=transition=slideleft:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
done
fc+="[${prev}]format=yuv420p[vout]"
$FF $inputs -filter_complex "$fc" -map "[vout]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium -movflags +faststart "$W/silent.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/silent.mp4")
FADE=$(echo "$DUR - 1.0" | bc -l)
$FF -i "$W/silent.mp4" -i "$MUSIC" \
    -filter_complex "[1:a]afade=t=out:st=${FADE}:d=1.0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
rm -rf "$W"; echo ">> DONE $OUT (~${DUR}s)"
