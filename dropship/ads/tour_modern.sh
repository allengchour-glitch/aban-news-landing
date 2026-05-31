#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
W=/tmp/ads/work; OUT=/tmp/ads/out
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
SS=4.3; TDUR=11.0; T=0.3
printf '%s' "10% CODE: WELCOME10" > "$W/mt3.txt"

mtour () {
  local FMT="$1" CW CH BIG SUB
  if [ "$FMT" = "1x1" ]; then CW=1080; CH=1080; BIG=92; SUB=32
  else CW=1080; CH=1920; BIG=104; SUB=38; fi
  local webm; webm=$(find /tmp/ads/tour/$FMT -name '*.webm' | head -1)
  $FF -ss $SS -t $TDUR -i "$webm" -vf "scale=${CW}:${CH}:flags=lanczos,fps=30,setsar=1,format=yuv420p" \
     -an -c:v libx264 -crf 19 -preset medium "$W/MT${FMT}_tour.mp4"
  # modern intro
  local IFC="[0:v]drawbox=x=80:y=(ih/2)-${BIG}:w=8:h=${BIG}*2:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:text='LUXESTYLE':fontcolor=${INK}:fontsize=${BIG}*0.5:x=118:y=(h/2)-${BIG}:alpha='min(t/0.4\,1)',"
  IFC+="drawtext=fontfile=${SANS}:text='DER ONLINE-SHOP':fontcolor=${GOLD}:fontsize=${BIG}*0.62:x=118:y=(h/2):alpha='min(t/0.5\,1)'[v]"
  $FF -f lavfi -t 1.8 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$IFC" -map "[v]" -t 1.8 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/MT${FMT}_intro.mp4"
  # modern outro
  local OFC="[0:v]drawbox=x=80:y=(ih/2)-${BIG}*0.8:w=8:h=${BIG}*1.6:color=${GOLD}:t=fill,"
  OFC+="drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=${GOLD}:fontsize=${BIG}*0.9:x=118:y=(h/2)-${BIG}*0.7:alpha='min(t/0.4\,1)',"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/mt3.txt:expansion=none:fontcolor=${INK}:fontsize=${SUB}:x=120:y=(h/2)+${BIG}*0.3:alpha='min(t/0.5\,1)'[v]"
  $FF -f lavfi -t 3.0 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$OFC" -map "[v]" -t 3.0 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/MT${FMT}_outro.mp4"
  # assemble intro + tour + outro with slide
  local durs=( 1.8 $TDUR 3.0 ) prev="0:v" acc off fc=""
  acc=1.8; off=$(echo "$acc - $T"|bc -l)
  fc+="[0:v][1:v]xfade=transition=slideleft:duration=${T}:offset=${off}[a];"
  acc=$(echo "1.8 + $TDUR - $T"|bc -l); off=$(echo "$acc - $T"|bc -l)
  fc+="[a][2:v]xfade=transition=slideleft:duration=${T}:offset=${off}[vx];[vx]format=yuv420p[vout]"
  $FF -i "$W/MT${FMT}_intro.mp4" -i "$W/MT${FMT}_tour.mp4" -i "$W/MT${FMT}_outro.mp4" \
      -filter_complex "$fc" -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
      -movflags +faststart "$OUT/luxestyle_moderntour_${FMT}.mp4"
  echo ">> DONE moderntour_${FMT} (~$(echo "1.8 + $TDUR + 3.0 - 2*$T"|bc -l)s)"
}
mtour 9x16
mtour 1x1