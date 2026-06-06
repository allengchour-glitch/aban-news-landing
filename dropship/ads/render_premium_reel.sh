#!/usr/bin/env bash
# LuxeStyle — PREMIUM Reel (9:16): edles Marken-Intro, langsame Ken-Burns-Produktshots
# mit dezentem Namen auf Scrim, ruhige Fade-Übergänge, Marken-Outro, eleganter Track.
# Nutzung: render_premium_reel.sh <out.mp4> <musik.wav> <img_dir>   (img 1..N.jpg + names.txt je Zeile)
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
SANSR=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
[ -f "$SANS" ] || SANS=$SANSR
OUT="${1:?out}"; MUSIC="${2:?musik}"; IMG="${3:?imgdir}"
W=$(mktemp -d); FPS=30; SEG=${SEG:-2.9}; T=${T:-0.6}   # langsam default; via Env überschreibbar (schnellerer Schnitt)
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
mapfile -t NAMES < "$IMG/names.txt"
for i in "${!NAMES[@]}"; do printf '%s' "${NAMES[$i]}" > "$W/n_$i.txt"; done
printf '%s' "LUXESTYLE" > "$W/brand.txt"
printf '%s' "Sommer-Kollektion 2026" > "$W/sub.txt"
printf '%s' "Jetzt entdecken" > "$W/o1.txt"
printf '%s' "luxestyle.ch" > "$W/o2.txt"
printf '%s' "-10% mit Code  WELCOME10" > "$W/o3.txt"
HOOK=${HOOK:-}; [ -n "$HOOK" ] && printf '%s' "$HOOK" > "$W/hook.txt"   # Regel 8: Hook in ersten 1-2s

# Intro (3.0s): edel, off-white, Goldlinie + Wortmarke + Subtitle (sanftes Fade)
IFC="[0:v]drawbox=x=(iw-360)/2:y=ih/2-150:w=360:h=3:color=${GOLD}:t=fill:enable='gte(t,0.2)',"
IFC+="drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=${INK}:fontsize=92:x=(w-text_w)/2:y=(h/2)-90:alpha='min(max((t-0.2)*1.5\,0)\,1)',"
IFC+="drawtext=fontfile=${SANSR}:textfile=${W}/sub.txt:fontcolor=${GOLD}:fontsize=44:x=(w-text_w)/2:y=(h/2)+40:alpha='min(max((t-0.7)*1.5\,0)\,1)'[v]"
$FF -f lavfi -t 3.0 -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex "$IFC" -map "[v]" -t 3.0 -r $FPS \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/intro.mp4"

# Produkt-Segmente: Cover-Crop, langsamer Zoom, unten Scrim + Goldbalken + Name
N=0
for f in "$IMG"/[0-9]*.jpg; do
  idx=$(basename "$f" .jpg); ni=$((idx-1))
  # Quelle 2x hochskalieren -> zoompan rechnet x/y auf feinem Raster = sub-pixel-glatt (kein Ruckeln).
  # Sehr sanfter Zoom (1.0->1.035), damit der Rücksprung beim schnellen Schnitt kaum sichtbar ist.
  fc="[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,setsar=1,"
  fc+="zoompan=z='min(1+0.00045*on\,1.035)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},"
  fc+="drawbox=x=0:y=1610:w=1080:h=310:color=black@0.34:t=fill,"
  fc+="drawbox=x=80:y=1700:w=8:h=120:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/n_${ni}.txt:fontcolor=white:fontsize=52:x=118:y=1710,"
  fc+="drawtext=fontfile=${SANSR}:text='LUXESTYLE':fontcolor=white@0.85:fontsize=30:x=118:y=1772"
  if [ -n "$HOOK" ] && [ "$idx" = "1" ]; then
    fc+=",drawbox=x=0:y=0:w=1080:h=250:color=black@0.38:t=fill"
    fc+=",drawtext=fontfile=${SANS}:textfile=${W}/hook.txt:fontcolor=white:fontsize=62:x=(w-text_w)/2:y=95:line_spacing=14"
    fc+=",drawbox=x=(iw-220)/2:y=210:w=220:h=4:color=${GOLD}:t=fill"
  fi
  fc+="[v]"
  $FF -loop 1 -framerate $FPS -t $SEG -i "$f" -filter_complex "$fc" -map "[v]" -t $SEG -r $FPS \
      -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/seg_${idx}.mp4"
  N=$((N+1))
done

# Outro (3.4s): edel
OFC="[0:v]drawbox=x=(iw-360)/2:y=ih/2-170:w=360:h=3:color=${GOLD}:t=fill,"
OFC+="drawtext=fontfile=${SANS}:textfile=${W}/o1.txt:fontcolor=${INK}:fontsize=64:x=(w-text_w)/2:y=(h/2)-110:alpha='min(t/0.5\,1)',"
OFC+="drawtext=fontfile=${SANS}:textfile=${W}/o2.txt:fontcolor=${GOLD}:fontsize=72:x=(w-text_w)/2:y=(h/2)-10:alpha='min(max((t-0.4)*1.5\,0)\,1)',"
OFC+="drawtext=fontfile=${SANSR}:textfile=${W}/o3.txt:expansion=none:fontcolor=${INK}:fontsize=40:x=(w-text_w)/2:y=(h/2)+90:alpha='min(max((t-0.8)*1.5\,0)\,1)'[v]"
$FF -f lavfi -t 3.4 -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex "$OFC" -map "[v]" -t 3.4 -r $FPS \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset veryfast "$W/outro.mp4"

# Zusammensetzen mit Fade-Übergängen
segs=( "$W/intro.mp4" ); for f in "$IMG"/[0-9]*.jpg; do idx=$(basename "$f" .jpg); segs+=( "$W/seg_${idx}.mp4" ); done; segs+=( "$W/outro.mp4" )
durs=( 3.0 ); for ((k=0;k<N;k++)); do durs+=( $SEG ); done; durs+=( 3.4 )
inputs=""; for s in "${segs[@]}"; do inputs+=" -i $s"; done
fc=""; prev="0:v"; acc=${durs[0]}
for ((k=1;k<${#segs[@]};k++)); do
  off=$(echo "$acc - $T" | bc -l)
  fc+="[${prev}][${k}:v]xfade=transition=fade:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(echo "$acc + ${durs[$k]} - $T" | bc -l)
done
fc+="[${prev}]format=yuv420p[vout]"
$FF $inputs -filter_complex "$fc" -map "[vout]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium -movflags +faststart "$W/silent.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/silent.mp4")
FADE=$(echo "$DUR - 1.4" | bc -l)
# (1) MUSIK-Version (FB/Ads): voller royalty-free Track, loudnorm.
$FF -i "$W/silent.mp4" -i "$MUSIC" \
    -filter_complex "[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=${FADE}:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo ">> DONE $OUT (~${DUR}s, Musik-Version)"
# (2) CLEAN-Version (TikTok/IG): leises Tonbett (-30 dB), damit man in der App den TREND-SOUND drüberlegt
#     (Trend-Sounds dürfen nicht ins File gebrannt werden). Schaltbar via DUAL=0.
if [ "${DUAL:-1}" = "1" ]; then
  CLEAN="${OUT%.*}-clean.mp4"
  $FF -i "$W/silent.mp4" -i "$MUSIC" \
      -filter_complex "[1:a]volume=-30dB,afade=t=in:st=0:d=0.8,afade=t=out:st=${FADE}:d=1.2[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart "$CLEAN"
  echo ">> DONE $CLEAN (Clean-Version für Trend-Sound)"
fi
rm -rf "$W"
