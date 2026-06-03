#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
IMG=/tmp/ads/img2; W=/tmp/ads/work; OUT=/tmp/ads/out
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
mkdir -p "$W" "$OUT"

names=( "Herren Lederarmband" "Flame Diffuser Premium" "Jade Roller & Gua Sha Set" \
"Damen Portemonnaie XL" "Wellness-Tablett Bambus" "Mini Robo-Diffuser Auto" \
"Bambus Aroma Diffuser" "Seiden-Kissenbezug" "Slim Wallet Echtleder" "Anti-Aging Serum" )
prices=( "CHF 29.90" "CHF 49.90" "CHF 14.90" "CHF 54.90" "CHF 44.90" \
"CHF 19.90" "CHF 39.90" "CHF 39.90" "CHF 49.90" "CHF 29.90" )
files=( 01 02 03 04 05 06 07 08 09 10 )

for i in "${!names[@]}"; do
  printf '%s' "${names[$i]}" > "$W/mn_$i.txt"
  printf '%s' "${prices[$i]}" > "$W/mp_$i.txt"
  printf '%s' "$(printf '%02d' $((i+1))) / 10" > "$W/mc_$i.txt"
done

modern () {
  local FMT="$1" CW CH BOXW BOXH PY CTRY NFS PFS NY PYY BARY BARH BRY
  if [ "$FMT" = "1x1" ]; then
    CW=1080; CH=1080; BOXW=1000; BOXH=700; PY=120; CTRY=66; BRY=72
    NFS=52; PFS=64; NY=868; PYY=940; BARY=854; BARH=150
  else
    CW=1080; CH=1920; BOXW=1000; BOXH=1180; PY=300; CTRY=130; BRY=138
    NFS=62; PFS=78; NY=1520; PYY=1610; BARY=1500; BARH=210
  fi
  echo ">> [$FMT] modern segments"
  for i in "${!files[@]}"; do
    local f="${files[$i]}"
    local fc="[0:v]scale=${BOXW}:${BOXH}:force_original_aspect_ratio=decrease,setsar=1[p];"
    fc+="[1:v][p]overlay=x=(W-w)/2:y=${PY}[bg];"
    fc+="[bg]zoompan=z='min(1+0.0009*on\,1.06)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${CW}x${CH}:fps=30[z];"
    fc+="[z]drawtext=fontfile=${SANS}:textfile=${W}/mc_${i}.txt:fontcolor=${GOLD}:fontsize=42:x=80:y=${CTRY},"
    fc+="drawtext=fontfile=${SANS}:text='LUXESTYLE':fontcolor=${INK}:fontsize=34:x=w-text_w-80:y=${BRY}:alpha=0.6,"
    fc+="drawbox=x=80:y=${BARY}:w=8:h=${BARH}:color=${GOLD}:t=fill,"
    fc+="drawtext=fontfile=${SANS}:textfile=${W}/mn_${i}.txt:fontcolor=${INK}:fontsize=${NFS}:x=118:y='${NY}+40*(1-min(t/0.35\,1))':alpha='min(t/0.35\,1)',"
    fc+="drawtext=fontfile=${SANS}:textfile=${W}/mp_${i}.txt:fontcolor=${GOLD}:fontsize=${PFS}:x=118:y='${PYY}+40*(1-min(t/0.5\,1))':alpha='min(t/0.5\,1)'[v]"
    $FF -loop 1 -framerate 30 -t 2.0 -i "$IMG/$f.webp" -f lavfi -t 2.0 -i "color=c=${BG}:s=${CW}x${CH}:r=30" \
        -filter_complex "$fc" -map "[v]" -t 2.0 -r 30 -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/M${FMT}_seg_${f}.mp4"
  done

  # modern intro card
  local TFS BFS SFS
  if [ "$FMT" = "1x1" ]; then TFS=88; BFS=42; SFS=32; else TFS=100; BFS=50; SFS=38; fi
  local IFC="[0:v]drawbox=x=80:y=(ih/2)-${TFS}:w=8:h=${TFS}*2:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:text='LUXESTYLE':fontcolor=${INK}:fontsize=${BFS}:x=118:y=(h/2)-${TFS}:alpha='min(t/0.4\,1)',"
  IFC+="drawtext=fontfile=${SANS}:text='DIE BESTSELLER':fontcolor=${INK}:fontsize=${TFS}:x=118:y=(h/2)-${TFS}/2+10:alpha='min(t/0.5\,1)',"
  IFC+="drawtext=fontfile=${SANS}:text='2026':fontcolor=${GOLD}:fontsize=${TFS}:x=118:y=(h/2)+${TFS}/2+20:alpha='min(t/0.65\,1)'[v]"
  $FF -f lavfi -t 2.2 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$IFC" -map "[v]" -t 2.2 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/M${FMT}_intro.mp4"

  # modern outro card
  printf '%s' "10% CODE: WELCOME10" > "$W/mo3.txt"
  local OFC="[0:v]drawbox=x=80:y=(ih/2)-${TFS}:w=8:h=${TFS}*2:color=${GOLD}:t=fill,"
  OFC+="drawtext=fontfile=${SANS}:text='JETZT SHOPPEN':fontcolor=${INK}:fontsize=${BFS}:x=118:y=(h/2)-${TFS}:alpha='min(t/0.4\,1)',"
  OFC+="drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=${GOLD}:fontsize=${TFS}*0.92:x=118:y=(h/2)-${TFS}/2+10:alpha='min(t/0.5\,1)',"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/mo3.txt:expansion=none:fontcolor=${INK}:fontsize=${SFS}:x=118:y=(h/2)+${TFS}/2+30:alpha='min(t/0.65\,1)'[v]"
  $FF -f lavfi -t 3.0 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$OFC" -map "[v]" -t 3.0 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/M${FMT}_outro.mp4"

  # assemble with modern slide transitions (no audio yet)
  echo ">> [$FMT] assembling modern montage"
  local segs=( "$W/M${FMT}_intro.mp4" ); for f in "${files[@]}"; do segs+=( "$W/M${FMT}_seg_${f}.mp4" ); done; segs+=( "$W/M${FMT}_outro.mp4" )
  local durs=( 2.2 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 3.0 ); local T=0.35
  local inputs="" fc2="" prev="0:v" acc
  for s in "${segs[@]}"; do inputs+=" -i $s"; done
  acc=$(echo "${durs[0]}" | bc -l)
  for (( k=1; k<${#segs[@]}; k++ )); do
    local off; off=$(echo "$acc - $T" | bc -l)
    fc2+="[${prev}][${k}:v]xfade=transition=slideleft:duration=${T}:offset=${off}[x$k];"
    prev="x$k"; acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
  done
  fc2+="[${prev}]format=yuv420p[vout]"
  $FF $inputs -filter_complex "$fc2" -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
      -movflags +faststart "$OUT/luxestyle_modern_${FMT}.mp4"
  echo ">> DONE $OUT/luxestyle_modern_${FMT}.mp4 (total ~${acc}s)"
}

modern "${1:-9x16}"