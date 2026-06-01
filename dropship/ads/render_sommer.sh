#!/usr/bin/env bash
# LuxeStyle "SOMMER 2026" — 14 Produkte aus allen Kategorien, 9:16, Musik + Klick-CTA
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
IMG=/tmp/ads/imgsommer; W=/tmp/ads/work_sommer; OUT=/tmp/ads/out
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
mkdir -p "$W" "$OUT"

names=( "Mini-Kleid mit Rüschen" "Strand-Maxirock" "Cropped Blazer" "Jumpsuit chic" \
"Wide-Leg-Hose" "Bandeau-Top" "Plateau-Sandalen" "Slingback-Pumps" "Loafer Damen" \
"Mini-Ventilator Eis" "Speaker + Charger" "Smaragd-Schmuck-Set" "Sonnenbrille UV400" "Sonnenhut" )
prices=( "CHF 29.90" "CHF 34.90" "CHF 44.90" "CHF 44.90" "CHF 39.90" "CHF 19.90" "CHF 29.90" \
"CHF 49.90" "CHF 27.90" "CHF 24.90" "CHF 34.90" "CHF 18.90" "CHF 19.90" "CHF 29.90" )
files=( 01 02 03 04 05 06 07 08 09 10 11 12 13 14 )
N=${#files[@]}
SEG=1.8

for i in "${!names[@]}"; do
  printf '%s' "${names[$i]}" > "$W/xn_$i.txt"
  printf '%s' "${prices[$i]}" > "$W/xp_$i.txt"
  printf '%s' "$(printf '%02d' $((i+1))) / ${N}" > "$W/xc_$i.txt"
done

CW=1080; CH=1920; BOXW=1000; BOXH=1180; PY=300; CTRY=130; BRY=138
NFS=58; PFS=78; NY=1520; PYY=1610; BARY=1500; BARH=210

echo ">> product segments ($N)"
for i in "${!files[@]}"; do
  f="${files[$i]}"
  fc="[0:v]scale=${BOXW}:${BOXH}:force_original_aspect_ratio=decrease,setsar=1[p];"
  fc+="[1:v][p]overlay=x=(W-w)/2:y=${PY}[bg];"
  fc+="[bg]zoompan=z='min(1+0.0011*on\,1.07)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${CW}x${CH}:fps=30[z];"
  fc+="[z]drawtext=fontfile=${SANS}:textfile=${W}/xc_${i}.txt:fontcolor=${GOLD}:fontsize=42:x=80:y=${CTRY},"
  fc+="drawtext=fontfile=${SANS}:text='LUXESTYLE':fontcolor=${INK}:fontsize=34:x=w-text_w-80:y=${BRY}:alpha=0.6,"
  fc+="drawbox=x=80:y=${BARY}:w=8:h=${BARH}:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/xn_${i}.txt:fontcolor=${INK}:fontsize=${NFS}:x=118:y='${NY}+40*(1-min(t/0.35\,1))':alpha='min(t/0.35\,1)',"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/xp_${i}.txt:fontcolor=${GOLD}:fontsize=${PFS}:x=118:y='${PYY}+40*(1-min(t/0.5\,1))':alpha='min(t/0.5\,1)'[v]"
  $FF -loop 1 -framerate 30 -t ${SEG} -i "$IMG/$f.jpg" -f lavfi -t ${SEG} -i "color=c=${BG}:s=${CW}x${CH}:r=30" \
      -filter_complex "$fc" -map "[v]" -t ${SEG} -r 30 -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/seg_${f}.mp4"
done

TFS=100; BFS=50; SFS=38
IFC="[0:v]drawbox=x=80:y=(ih/2)-${TFS}:w=8:h=${TFS}*2:color=${GOLD}:t=fill,"
IFC+="drawtext=fontfile=${SANS}:text='SOMMER-KOLLEKTION':fontcolor=${INK}:fontsize=${BFS}:x=118:y=(h/2)-${TFS}:alpha='min(t/0.4\,1)',"
IFC+="drawtext=fontfile=${SANS}:text='LUXESTYLE':fontcolor=${INK}:fontsize=${TFS}:x=118:y=(h/2)-${TFS}/2+10:alpha='min(t/0.5\,1)',"
IFC+="drawtext=fontfile=${SANS}:text='2026':fontcolor=${GOLD}:fontsize=${TFS}:x=118:y=(h/2)+${TFS}/2+20:alpha='min(t/0.65\,1)'[v]"
$FF -f lavfi -t 2.2 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$IFC" -map "[v]" -t 2.2 -r 30 \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/intro.mp4"

printf '%s' "-10% CODE: WELCOME10" > "$W/xo3.txt"
printf '%s' ">> JETZT LINK ANTIPPEN" > "$W/xo4.txt"
OFC="[0:v]drawbox=x=80:y=(ih/2)-${TFS}-60:w=8:h=${TFS}*2+40:color=${GOLD}:t=fill,"
OFC+="drawtext=fontfile=${SANS}:text='JETZT SHOPPEN':fontcolor=${INK}:fontsize=${BFS}:x=118:y=(h/2)-${TFS}-60:alpha='min(t/0.4\,1)',"
OFC+="drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=${GOLD}:fontsize=${TFS}*0.92:x=118:y=(h/2)-${TFS}/2-40:alpha='min(t/0.5\,1)',"
OFC+="drawtext=fontfile=${SANS}:textfile=${W}/xo3.txt:expansion=none:fontcolor=${INK}:fontsize=${SFS}:x=118:y=(h/2)+${TFS}/2-20:alpha='min(t/0.65\,1)',"
OFC+="drawtext=fontfile=${SANS}:textfile=${W}/xo4.txt:expansion=none:fontcolor=${GOLD}:fontsize=46:x=118:y=(h/2)+${TFS}/2+60:alpha='min(max((t-0.8)*2\,0)\,1)+0.15*sin(8*t)'[v]"
$FF -f lavfi -t 3.2 -i "color=c=${BG}:s=${CW}x${CH}:r=30" -filter_complex "$OFC" -map "[v]" -t 3.2 -r 30 \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/outro.mp4"

echo ">> assembling"
segs=( "$W/intro.mp4" ); for f in "${files[@]}"; do segs+=( "$W/seg_${f}.mp4" ); done; segs+=( "$W/outro.mp4" )
durs=( 2.2 ); for f in "${files[@]}"; do durs+=( $SEG ); done; durs+=( 3.2 )
T=0.3
inputs=""; fc2=""; prev="0:v"
for s in "${segs[@]}"; do inputs+=" -i $s"; done
acc=$(echo "${durs[0]}" | bc -l)
for (( k=1; k<${#segs[@]}; k++ )); do
  off=$(echo "$acc - $T" | bc -l)
  fc2+="[${prev}][${k}:v]xfade=transition=slideleft:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
done
fc2+="[${prev}]format=yuv420p[vout]"
$FF $inputs -filter_complex "$fc2" -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium \
    -movflags +faststart "$W/sommer_silent.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/sommer_silent.mp4")
FADE=$(echo "$DUR - 1.2" | bc -l)
$FF -i "$W/sommer_silent.mp4" -i /tmp/ads/music/uplifting.wav \
    -filter_complex "[1:a]afade=t=out:st=${FADE}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
    "$OUT/luxestyle_sommer_2026.mp4"
echo ">> DONE $OUT/luxestyle_sommer_2026.mp4 (~${DUR}s)"
