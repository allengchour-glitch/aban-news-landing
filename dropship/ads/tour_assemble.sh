#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SERIF=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
W=/tmp/ads/work; OUT=/tmp/ads/out; MUSIC=/tmp/ads/music/elegant.wav
CREAM=0xfaf7f2; INK=0x2c2c2c; GOLD=0xb8915a
SS=4.3; TDUR=11.0; T=0.5

printf '%s' "L U X E S T Y L E" > "$W/tbrand.txt"
printf '%s' "Der Online-Shop" > "$W/ti1.txt"
printf '%s' "Jetzt entdecken auf luxestyle.ch" > "$W/ti2.txt"

assemble () {
  local FMT="$1" CW CH IB IS
  if [ "$FMT" = "1x1" ]; then CW=1080; CH=1080; IB=78; IS=38
  else CW=1080; CH=1920; IB=92; IS=42; fi
  local webm; webm=$(find /tmp/ads/tour/$FMT -name '*.webm' | head -1)
  echo ">> [$FMT] normalizing tour clip from $webm"
  $FF -ss $SS -t $TDUR -i "$webm" \
     -vf "scale=${CW}:${CH}:flags=lanczos,fps=30,setsar=1,format=yuv420p" \
     -an -c:v libx264 -crf 19 -preset medium "$W/${FMT}_tour_norm.mp4"

  # tour intro card
  local IFC="[0:v]drawtext=fontfile=${SANS}:textfile=${W}/tbrand.txt:fontcolor=${INK}:fontsize=${IS}:x=(w-text_w)/2:y=(h/2)-${IB}*2:alpha=0.9,"
  IFC+="drawtext=fontfile=${SERIF}:textfile=${W}/ti1.txt:fontcolor=${INK}:fontsize=${IB}:x=(w-text_w)/2:y=(h/2)-${IB}/2,"
  IFC+="drawbox=x=(iw-200)/2:y=(ih/2)+${IB}:w=200:h=3:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:textfile=${W}/ti2.txt:fontcolor=${GOLD}:fontsize=${IS}-4:x=(w-text_w)/2:y=(h/2)+${IB}+40[v]"
  $FF -f lavfi -t 2.0 -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" \
      -filter_complex "$IFC" -map "[v]" -t 2.0 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_tintro.mp4"

  # reuse the montage outro card (same branding + WELCOME10 CTA)
  local outro="$W/${FMT}_outro.mp4"

  echo ">> [$FMT] assembling tour + music"
  local O1 acc total O2 fadeout
  O1=$(echo "2.0 - $T" | bc -l)
  acc=$(echo "2.0 + $TDUR - $T" | bc -l)
  O2=$(echo "$acc - $T" | bc -l)
  total=$(echo "$acc + 3.4 - $T" | bc -l)
  fadeout=$(echo "$total - 1.6" | bc -l)
  local fc="[0:v][1:v]xfade=transition=fade:duration=${T}:offset=${O1}[a];"
  fc+="[a][2:v]xfade=transition=fade:duration=${T}:offset=${O2}[vx];[vx]format=yuv420p[vout];"
  fc+="[3:a]atrim=0:${total},afade=t=in:st=0:d=0.9,afade=t=out:st=${fadeout}:d=1.6,volume=0.8[aout]"
  $FF -i "$W/${FMT}_tintro.mp4" -i "$W/${FMT}_tour_norm.mp4" -i "$outro" -i "$MUSIC" \
      -filter_complex "$fc" -map "[vout]" -map "[aout]" -t "$total" \
      -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
      -c:a aac -b:a 160k -movflags +faststart "$OUT/luxestyle_tour_${FMT}.mp4"
  echo ">> DONE $OUT/luxestyle_tour_${FMT}.mp4 (~${total}s)"
}

assemble 1x1
assemble 9x16
echo "TOUR ASSEMBLY DONE"; ls -la "$OUT"