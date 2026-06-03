#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SERIF=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
W=/tmp/ads/work; OUT=/tmp/ads/out; MUSIC=/tmp/ads/music/uplifting.wav
CREAM=0xfaf7f2; INK=0x2c2c2c; GOLD=0xb8915a
SEGT=0.8; T=0.25
files=( 01 02 03 04 05 06 07 08 09 10 )

printf '%s' "TOP 10" > "$W/h1.txt"
printf '%s' "BESTSELLER 2026" > "$W/h2.txt"
printf '%s' "ab CHF 14.90 · Gratis Versand" > "$W/h3.txt"
printf '%s' "luxestyle.ch" > "$W/ho1.txt"
printf '%s' "10% mit Code WELCOME10" > "$W/ho2.txt"

hook () {
  local FMT="$1" CW CH BIG MID SUB
  if [ "$FMT" = "1x1" ]; then CW=1080; CH=1080; BIG=150; MID=52; SUB=34
  else CW=1080; CH=1920; BIG=180; MID=60; SUB=40; fi

  # hook intro card (1.4s)
  local IFC="[0:v]drawtext=fontfile=${SERIF}:textfile=${W}/h1.txt:fontcolor=${INK}:fontsize=${BIG}:x=(w-text_w)/2:y=(h/2)-${BIG}*0.9,"
  IFC+="drawtext=fontfile=${SANS}:textfile=${W}/h2.txt:fontcolor=${GOLD}:fontsize=${MID}:x=(w-text_w)/2:y=(h/2)+${BIG}*0.2,"
  IFC+="drawbox=x=(iw-200)/2:y=(ih/2)+${BIG}*0.2+${MID}+30:w=200:h=3:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:textfile=${W}/h3.txt:fontcolor=${INK}:fontsize=${SUB}:x=(w-text_w)/2:y=(h/2)+${BIG}*0.2+${MID}+55:alpha=0.8[v]"
  $FF -f lavfi -t 1.4 -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" -filter_complex "$IFC" -map "[v]" -t 1.4 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_hintro.mp4"

  # hook outro card (1.8s)
  local OFC="[0:v]drawtext=fontfile=${SERIF}:textfile=${W}/ho1.txt:fontcolor=${GOLD}:fontsize=${BIG}*0.7:x=(w-text_w)/2:y=(h/2)-${BIG}*0.55,"
  OFC+="drawbox=x=(iw-220)/2:y=(ih/2)+10:w=220:h=3:color=${GOLD}:t=fill,"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/ho2.txt:expansion=none:fontcolor=${INK}:fontsize=${MID}:x=(w-text_w)/2:y=(h/2)+40[v]"
  $FF -f lavfi -t 1.8 -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" -filter_complex "$OFC" -map "[v]" -t 1.8 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_houtro.mp4"

  # assemble: hintro + 10 trimmed segs + houtro, fast xfade + music
  local inputs="-i $W/${FMT}_hintro.mp4"
  local durs=( 1.4 )
  for f in "${files[@]}"; do inputs+=" -t $SEGT -i $W/${FMT}_seg_${f}.mp4"; durs+=( $SEGT ); done
  inputs+=" -i $W/${FMT}_houtro.mp4"; durs+=( 1.8 )
  local nseg=$(( ${#files[@]} + 2 ))
  local fc="" prev="0:v" acc total off fadeout
  acc=$(echo "${durs[0]}" | bc -l)
  for (( k=1; k<nseg; k++ )); do
    off=$(echo "$acc - $T" | bc -l)
    fc+="[${prev}][${k}:v]xfade=transition=fade:duration=${T}:offset=${off}[x$k];"
    prev="x$k"; acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
  done
  total=$acc
  fc+="[${prev}]format=yuv420p[vout];"
  fadeout=$(echo "$total - 1.0" | bc -l)
  fc+="[${nseg}:a]atrim=18:$(echo "18 + $total" | bc -l),asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeout}:d=1.0,volume=0.9[aout]"
  $FF $inputs -i "$MUSIC" -filter_complex "$fc" -map "[vout]" -map "[aout]" -t "$total" \
      -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium -c:a aac -b:a 160k -movflags +faststart \
      "$OUT/luxestyle_hook_${FMT}.mp4"
  echo ">> DONE $OUT/luxestyle_hook_${FMT}.mp4 (~${total}s)"
}

hook 1x1
hook 9x16
echo "HOOK DONE"; ls -la "$OUT"/luxestyle_hook_*