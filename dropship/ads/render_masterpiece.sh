#!/usr/bin/env bash
# LuxeStyle — Meisterwerk-Werbung 9:16, HOOK-FIRST (Hook in 1.5s, kein Logo-Intro, schnelle Cuts ~2s,
# ~20-25s, persistenter luxestyle.ch-Link, CTA Aktion+Ergebnis).
# Nutzung: render_masterpiece.sh <out.mp4> <voice.wav> <musik> <manifest> [lang(de|en)] [hook]
#   manifest: Zeilen "typ|quelle|caption"   typ: veo=mp4-Datei, still=Bild-Datei
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
SANSR=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
[ -f "$SANS" ] || SANS=$SANSR
OUT="${1:?out}"; VOICE="${2:?voice}"; MUSIC="${3:?musik}"; MANIFEST="${4:?manifest}"; LANG_="${5:-de}"; HOOK="${6:-}"
W=$(mktemp -d); FPS=30; BG=0x0e0e12; GOLD=0xc9a14a; INK=0xf4f3f1; T=0.45
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE")
mapfile -t LINES < <(grep -v '^[[:space:]]*$' "$MANIFEST")
N=${#LINES[@]}; [ "$N" -ge 2 ] || { echo "zu wenig Segmente ($N)"; exit 1; }
OUTRO=3.0
SEG=$(python3 -c "print(round(max(1.7,($DUR-$OUTRO+($N)*$T)/$N),3))")
if [ "$LANG_" = "en" ]; then O1="Shop now -> your look"; O4="Free shipping over CHF 65"; else O1="Jetzt shoppen -> dein Look"; O4="Gratis Versand ab CHF 65"; fi

CAPBOX="drawbox=x=0:y=1560:w=1080:h=340:color=black@0.42:t=fill,drawbox=x=80:y=1665:w=8:h=150:color=${GOLD}:t=fill"
idx=0
for line in "${LINES[@]}"; do
  typ="${line%%|*}"; rest="${line#*|}"; src="${rest%%|*}"; cap="${rest#*|}"
  printf '%s' "$cap" > "$W/cap$idx.txt"
  CAPTXT="drawtext=fontfile=${SANS}:textfile=${W}/cap${idx}.txt:fontcolor=white:fontsize=50:x=118:y='1690+30*(1-min((t-0.1)/0.4\,1))':alpha='min(max((t-0.1)/0.4\,0)\,1)'"
  HOOKTXT=""
  if [ "$idx" -eq 0 ] && [ -n "$HOOK" ]; then
    printf '%s' "$HOOK" > "$W/hook.txt"
    HOOKTXT=",drawbox=x=0:y=130:w=1080:h=240:color=black@0.42:t=fill:enable='lte(t,2.3)',drawtext=fontfile=${SANS}:textfile=${W}/hook.txt:fontcolor=white:fontsize=80:x=(w-text_w)/2:y=180:line_spacing=14:alpha='if(lte(t,1.9)\,min(t/0.2\,1)\,max(1-(t-1.9)/0.4\,0))'"
  fi
  if [ "$typ" = "veo" ] && [ -f "$src" ]; then
    $FF -i "$src" -filter_complex \
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=${FPS},${CAPBOX},${CAPTXT}${HOOKTXT}[v]" \
      -map "[v]" -an -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/seg$idx.mp4"
  else
    [ -f "$src" ] || { echo "fehlt, ueberspringe: $src"; continue; }
    if [ $((idx % 2)) -eq 0 ]; then ZP="z='min(1.03+0.0008*on,1.14)'"; else ZP="z='max(1.14-0.0008*on,1.03)'"; fi
    $FF -loop 1 -t $SEG -i "$src" -filter_complex \
      "[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,setsar=1,zoompan=${ZP}:d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},${CAPBOX},${CAPTXT}${HOOKTXT}[v]" \
      -map "[v]" -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/seg$idx.mp4"
  fi
  idx=$((idx+1))
done
[ "$idx" -ge 2 ] || { echo "zu wenige gueltige Segmente"; exit 1; }

printf '%s' "LuxeStyle" > "$W/ob.txt"; printf '%s' "$O1" > "$W/o1.txt"; printf '%s' "luxestyle.ch" > "$W/o2.txt"
printf '%s' "-10%% mit Code WELCOME10" > "$W/o3.txt"; printf '%s' "$O4" > "$W/o4.txt"
$FF -f lavfi -t $OUTRO -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex \
  "[0:v]drawtext=fontfile=${SANS}:textfile=${W}/ob.txt:fontcolor=${INK}:fontsize=104:x=(w-text_w)/2:y=(h/2)-260:alpha='min(max((t-0.1)*1.8\,0)\,1)',drawbox=x=(iw-360)/2:y=ih/2-150:w=360:h=4:color=${GOLD}:t=fill:enable='gte(t,0.3)',drawtext=fontfile=${SANS}:textfile=${W}/o1.txt:expansion=none:fontcolor=white:fontsize=54:x=(w-text_w)/2:y=(h/2)-90:alpha='min(max((t-0.4)*1.6\,0)\,1)',drawtext=fontfile=${SANS}:textfile=${W}/o2.txt:fontcolor=${GOLD}:fontsize=82:x=(w-text_w)/2:y=(h/2)+10:alpha='min(max((t-0.7)*1.6\,0)\,1)',drawtext=fontfile=${SANSR}:textfile=${W}/o3.txt:expansion=none:fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h/2)+120:alpha='min(max((t-1.0)*1.6\,0)\,1)',drawtext=fontfile=${SANSR}:textfile=${W}/o4.txt:fontcolor=white@0.8:fontsize=36:x=(w-text_w)/2:y=(h/2)+195:alpha='min(max((t-1.2)*1.6\,0)\,1)'[v]" \
  -map "[v]" -t $OUTRO -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/outro.mp4"

segs=(); for ((k=0;k<idx;k++)); do segs+=( "$W/seg$k.mp4" ); done; segs+=( "$W/outro.mp4" )
durs=(); for ((k=0;k<idx;k++)); do durs+=( $SEG ); done; durs+=( $OUTRO )
inputs=""; for s in "${segs[@]}"; do inputs+=" -i $s"; done
fc=""; prev="0:v"; acc=${durs[0]}
for ((k=1;k<${#segs[@]};k++)); do
  off=$(python3 -c "print(round($acc-$T,3))")
  tr="fade"; [ $((k % 3)) -eq 0 ] && tr="slideleft"
  fc+="[${prev}][${k}:v]xfade=transition=${tr}:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(python3 -c "print(round($acc+${durs[$k]}-$T,3))")
done
fc+="[${prev}]format=yuv420p,drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=64:alpha=0.85:shadowcolor=black@0.6:shadowx=2:shadowy=2[vout]"
$FF $inputs -filter_complex "$fc" -map "[vout]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium "$W/silent.mp4"
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/silent.mp4")
FADE=$(python3 -c "print(max(0,$VD-1.4))")
$FF -i "$W/silent.mp4" -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[1:a]loudnorm=I=-15:TP=-1.5[vo];[2:a]volume=0.16,afade=t=in:st=0:d=0.6,afade=t=out:st=${FADE}:d=1.4[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
CLEAN="${OUT%.*}-clean.mp4"
$FF -i "$W/silent.mp4" -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[1:a]loudnorm=I=-15:TP=-1.5[vo];[2:a]volume=-30dB[mu];[vo][mu]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$CLEAN"
echo ">> Meisterwerk (hook-first): $OUT (+clean) ~${VD}s, $idx Segmente, Sprache $LANG_"
rm -rf "$W"
