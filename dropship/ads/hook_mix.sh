#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
W=/tmp/ads/work; OUT=/tmp/ads/out
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
files=( 01 02 03 04 05 06 07 08 09 10 ); SEGT=0.8; T=0.25
printf '%s' "10% CODE: WELCOME10" > "$W/mh3.txt"

mhook () {
  local FMT="$1" CW CH BIG MID SUB
  if [ "$FMT" = "1x1" ]; then CW=1080; CH=1080; BIG=104; MID=44; SUB=34
  else CW=1080; CH=1920; BIG=124; MID=52; SUB=40; fi
  # intro card
  local IFC="[0:v]drawbox=x=80:y=(ih/2)-${BIG}*0.7:w=8:h=${BIG}*1.5:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:text='HIGHLIGHTS':fontcolor=${INK}:fontsize=${BIG}:x=118:y=(h/2)-${BIG}*0.7:alpha='min(t/0.3\,1)',"
  IFC+="drawtext=fontfile=${SANS}:text='2026':fontcolor=${GOLD}:fontsize=${MID}:x=120:y=(h/2)+${BIG}*0.55:alpha='min(t/0.45\,1)'[v]"
  $FF -f lavfi -t 1.4 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$IFC" -map "[v]" -t 1.4 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/XH${FMT}_intro.mp4"
  # outro card
  local OFC="[0:v]drawbox=x=80:y=(ih/2)-${BIG}*0.55:w=8:h=${BIG}*1.2:color=${GOLD}:t=fill,"
  OFC+="drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=${GOLD}:fontsize=${BIG}*0.78:x=118:y=(h/2)-${BIG}*0.5:alpha='min(t/0.3\,1)',"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/mh3.txt:expansion=none:fontcolor=${INK}:fontsize=${SUB}:x=120:y=(h/2)+${BIG}*0.35:alpha='min(t/0.45\,1)'[v]"
  $FF -f lavfi -t 1.8 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$OFC" -map "[v]" -t 1.8 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/XH${FMT}_outro.mp4"
  # assemble: intro + 10 trimmed modern segs + outro, fast slide
  local inputs="-i $W/XH${FMT}_intro.mp4"; local durs=( 1.4 )
  for f in "${files[@]}"; do inputs+=" -t $SEGT -i $W/X${FMT}_seg_${f}.mp4"; durs+=( $SEGT ); done
  inputs+=" -i $W/XH${FMT}_outro.mp4"; durs+=( 1.8 )
  local nseg=$(( ${#files[@]} + 2 )) fc="" prev="0:v" acc off
  acc=$(echo "${durs[0]}"|bc -l)
  for (( k=1; k<nseg; k++ )); do off=$(echo "$acc - $T"|bc -l)
    fc+="[${prev}][${k}:v]xfade=transition=slideleft:duration=${T}:offset=${off}[x$k];"; prev="x$k"
    acc=$(echo "$acc + ${durs[$k]} - $T"|bc -l); done
  fc+="[${prev}]format=yuv420p[vout]"
  $FF $inputs -filter_complex "$fc" -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
      -movflags +faststart "$OUT/luxestyle_mixhook_${FMT}.mp4"
  echo ">> DONE modernhook_${FMT} (~${acc}s)"
}
mhook 9x16
mhook 1x1