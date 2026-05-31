#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SERIF=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
IMG=/tmp/ads/img2
W=/tmp/ads/work
OUT=/tmp/ads/out
MUSIC=/tmp/ads/music/uplifting.wav
CREAM=0xfaf7f2
INK=0x2c2c2c
GOLD=0xb8915a
mkdir -p "$W" "$OUT"

# ---- product display names + prices ----
names=( "Himalaya Salzkristall-Lampe" "Flame Diffuser Premium" "Jade Roller & Gua Sha Set" \
"3-in-1 Wireless Charger" "Wellness-Tablett Bambus" "Mini Robo-Diffuser Auto" \
"Bambus Aroma Diffuser" "Seiden-Kissenbezug" "Slim Wallet Echtleder" "Anti-Aging Serum" )
prices=( "CHF 24.90" "CHF 49.90" "CHF 14.90" "CHF 39.90" "CHF 44.90" \
"CHF 19.90" "CHF 39.90" "CHF 39.90" "CHF 49.90" "CHF 29.90" )
files=( 01 02 03 04 05 06 07 08 09 10 )

# write text files (avoids shell escaping of umlauts/specials)
for i in "${!names[@]}"; do
  printf '%s' "${names[$i]}" > "$W/name_$i.txt"
  printf '%s' "${prices[$i]}" > "$W/price_$i.txt"
done
printf '%s' "L U X E S T Y L E" > "$W/brand.txt"

render_format () {
  local FMT="$1" CW CH BOXW BOXH ZC BY BFS GLY GLW NY NFS PY PFS DUR=2.0
  if [ "$FMT" = "1x1" ]; then
    CW=1080; CH=1080; BOXW=880; BOXH=660; ZC=455
    BY=70;  BFS=34; GLY=122; GLW=240
    NY=872; NFS=46; PY=948; PFS=56
  else
    CW=1080; CH=1920; BOXW=980; BOXH=980; ZC=940
    BY=250; BFS=42; GLY=322; GLW=260
    NY=1560; NFS=54; PY=1652; PFS=66
  fi
  local GLX=$(( (CW-GLW)/2 ))
  echo ">> [$FMT] rendering 10 product segments ($CW x $CH)"

  for i in "${!files[@]}"; do
    local f="${files[$i]}"
    local fc="[0:v]scale=${BOXW}:${BOXH}:force_original_aspect_ratio=decrease,setsar=1[p];"
    fc+="[1:v][p]overlay=x=(W-w)/2:y=${ZC}-h/2[ov];"
    fc+="[ov]zoompan=z='min(1+0.0011*on,1.075)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${CW}x${CH}:fps=30[zz];"
    fc+="[zz]drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=${INK}:fontsize=${BFS}:x=(w-text_w)/2:y=${BY}:alpha=0.85,"
    fc+="drawbox=x=${GLX}:y=${GLY}:w=${GLW}:h=3:color=${GOLD}:t=fill,"
    fc+="drawtext=fontfile=${SERIF}:textfile=${W}/name_${i}.txt:fontcolor=${INK}:fontsize=${NFS}:x=(w-text_w)/2:y=${NY},"
    fc+="drawtext=fontfile=${SERIF}:textfile=${W}/price_${i}.txt:fontcolor=${GOLD}:fontsize=${PFS}:x=(w-text_w)/2:y=${PY}[v]"
    $FF -loop 1 -framerate 30 -t $DUR -i "$IMG/$f.webp" \
        -f lavfi -t $DUR -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" \
        -filter_complex "$fc" -map "[v]" -t $DUR -r 30 \
        -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_seg_${f}.mp4"
  done

  # ---- intro card ----
  echo ">> [$FMT] intro/outro cards"
  if [ "$FMT" = "1x1" ]; then
    local IB=78 IS=40 ITAG=540 ILINE=470
    local OB1=92 OY1=380 OURL=560 OUC=700
  else
    local IB=92 IS=44 ITAG=1080 ILINE=980
    local OB1=100 OY1=760 OURL=980 OUC=1140
  fi
  printf '%s' "PREMIUM LIFESTYLE" > "$W/introtag.txt"
  printf '%s' "Die Bestseller 2026" > "$W/introtag2.txt"
  local IFC="[0:v]drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=${INK}:fontsize=${IS}:x=(w-text_w)/2:y=(h/2)-${IB}*2:alpha=0.9,"
  IFC+="drawtext=fontfile=${SERIF}:textfile=${W}/introtag2.txt:fontcolor=${INK}:fontsize=${IB}:x=(w-text_w)/2:y=(h/2)-${IB}/2,"
  IFC+="drawbox=x=(iw-200)/2:y=(ih/2)+${IB}:w=200:h=3:color=${GOLD}:t=fill,"
  IFC+="drawtext=fontfile=${SANS}:textfile=${W}/introtag.txt:fontcolor=${GOLD}:fontsize=${IS}:x=(w-text_w)/2:y=(h/2)+${IB}+40[v]"
  $FF -f lavfi -t 2.6 -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" \
      -filter_complex "$IFC" -map "[v]" -t 2.6 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_intro.mp4"

  # ---- outro card ----
  printf '%s' "Jetzt entdecken" > "$W/o1.txt"
  printf '%s' "luxestyle.ch" > "$W/o2.txt"
  printf '%s' "10% Rabatt mit Code  WELCOME10" > "$W/o3.txt"
  printf '%s' "Gratis Versand · 14 Tage Rückgabe" > "$W/o4.txt"
  local OFC="[0:v]drawtext=fontfile=${SERIF}:textfile=${W}/o1.txt:fontcolor=${INK}:fontsize=${IB}:x=(w-text_w)/2:y=(h/2)-${IB}*2:alpha=1,"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/o2.txt:fontcolor=${GOLD}:fontsize=${IB}-10:x=(w-text_w)/2:y=(h/2)-${IB}/2,"
  OFC+="drawbox=x=(iw-220)/2:y=(ih/2)+${IB}-10:w=220:h=3:color=${GOLD}:t=fill,"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/o3.txt:expansion=none:fontcolor=${INK}:fontsize=${IS}:x=(w-text_w)/2:y=(h/2)+${IB}+30,"
  OFC+="drawtext=fontfile=${SANS}:textfile=${W}/o4.txt:fontcolor=${INK}:fontsize=${IS}-8:x=(w-text_w)/2:y=(h/2)+${IB}+30+${IS}+24:alpha=0.7[v]"
  $FF -f lavfi -t 3.4 -i "color=c=${CREAM}:s=${CW}x${CH}:r=30" \
      -filter_complex "$OFC" -map "[v]" -t 3.4 -r 30 \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/${FMT}_outro.mp4"

  # ---- assemble with xfade + music ----
  echo ">> [$FMT] assembling crossfade montage + music"
  local segs=( "$W/${FMT}_intro.mp4" )
  for f in "${files[@]}"; do segs+=( "$W/${FMT}_seg_${f}.mp4" ); done
  segs+=( "$W/${FMT}_outro.mp4" )
  local durs=( 2.6 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 2.0 3.4 )
  local T=0.5
  local inputs="" fc="" prev="0:v" acc total
  for s in "${segs[@]}"; do inputs+=" -i $s"; done
  acc=$(echo "${durs[0]}" | bc -l)
  for (( k=1; k<${#segs[@]}; k++ )); do
    local off; off=$(echo "$acc - $T" | bc -l)
    local lbl="x$k"
    fc+="[${prev}][${k}:v]xfade=transition=fade:duration=${T}:offset=${off}[${lbl}];"
    prev="$lbl"
    acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
  done
  total=$acc
  fc+="[${prev}]format=yuv420p[vout];"
  local aidx=${#segs[@]}
  local fadeout; fadeout=$(echo "$total - 1.6" | bc -l)
  fc+="[${aidx}:a]atrim=0:${total},afade=t=in:st=0:d=0.9,afade=t=out:st=${fadeout}:d=1.6,volume=0.85[aout]"
  $FF $inputs -i "$MUSIC" -filter_complex "$fc" \
      -map "[vout]" -map "[aout]" -t "$total" \
      -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
      -c:a aac -b:a 160k -movflags +faststart "$OUT/luxestyle_bestseller_${FMT}.mp4"
  echo ">> DONE $OUT/luxestyle_bestseller_${FMT}.mp4  (total ~${total}s)"
}

render_format 1x1
render_format 9x16
echo "ALL MONTAGES DONE"
ls -la "$OUT"