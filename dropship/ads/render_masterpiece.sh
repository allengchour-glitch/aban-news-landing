#!/usr/bin/env bash
# LuxeStyle — Meisterwerk-Werbung 9:16: Veo-Clips (echte Bewegung) + Ken-Burns-Stills + animierte Typo/Logo
# + Voiceover (voll) + geduckte Musik. Plus Clean-Version (Musik -30 dB) fuer Trend-Sound.
# Nutzung: render_masterpiece.sh <out.mp4> <voice.wav> <musik> <manifest> [lang(de|en)]
#   manifest: Zeilen "typ|quelle|caption"   typ: veo=mp4-Datei, still=Bild-Datei
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
SANSR=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
[ -f "$SANS" ] || SANS=$SANSR
OUT="${1:?out}"; VOICE="${2:?voice}"; MUSIC="${3:?musik}"; MANIFEST="${4:?manifest}"; LANG_="${5:-de}"
W=$(mktemp -d); FPS=30; BG=0x0e0e12; GOLD=0xc9a14a; INK=0xf4f3f1; T=0.5
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE")
mapfile -t LINES < <(grep -v '^[[:space:]]*$' "$MANIFEST")
N=${#LINES[@]}; [ "$N" -ge 2 ] || { echo "zu wenig Segmente ($N)"; exit 1; }
INTRO=2.4; OUTRO=3.4
SEG=$(python3 -c "print(round(max(1.9,($DUR-$INTRO-$OUTRO+($N+1)*$T)/$N),3))")
if [ "$LANG_" = "en" ]; then SUB="Premium Swiss Fashion"; O1="Shop now"; O4="Free shipping over CHF 65"; else SUB="Premium Swiss Fashion"; O1="Jetzt entdecken"; O4="Gratis Versand ab CHF 65"; fi

# --- Intro: Logo-Reveal ---
printf '%s' "LuxeStyle" > "$W/brand.txt"; printf '%s' "$SUB" > "$W/sub.txt"
$FF -f lavfi -t $INTRO -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex \
  "[0:v]drawbox=x=(iw-380)/2:y=ih/2-160:w=380:h=4:color=${GOLD}:t=fill:enable='gte(t,0.25)',drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=${INK}:fontsize=112:x=(w-text_w)/2:y=(h/2)-115:alpha='min(max((t-0.2)*1.6\,0)\,1)',drawtext=fontfile=${SANSR}:textfile=${W}/sub.txt:fontcolor=${GOLD}:fontsize=46:x=(w-text_w)/2:y=(h/2)+35:alpha='min(max((t-0.7)*1.6\,0)\,1)'[v]" \
  -map "[v]" -t $INTRO -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/intro.mp4"

# --- Segmente ---
CAPBOX="drawbox=x=0:y=1560:w=1080:h=340:color=black@0.42:t=fill,drawbox=x=80:y=1665:w=8:h=150:color=${GOLD}:t=fill"
idx=0
for line in "${LINES[@]}"; do
  typ="${line%%|*}"; rest="${line#*|}"; src="${rest%%|*}"; cap="${rest#*|}"
  printf '%s' "$cap" > "$W/cap$idx.txt"
  CAPTXT="drawtext=fontfile=${SANS}:textfile=${W}/cap${idx}.txt:fontcolor=white:fontsize=52:x=118:y='1690+30*(1-min((t-0.1)/0.4\,1))':alpha='min(max((t-0.1)/0.4\,0)\,1)'"
  if [ "$typ" = "veo" ] && [ -f "$src" ]; then
    $FF -i "$src" -filter_complex \
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=${FPS},${CAPBOX},${CAPTXT}[v]" \
      -map "[v]" -an -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/seg$idx.mp4"
  else
    [ -f "$src" ] || { echo "fehlt, ueberspringe: $src"; continue; }
    if [ $((idx % 2)) -eq 0 ]; then ZP="z='min(1.03+0.0006*on,1.12)'"; else ZP="z='max(1.12-0.0006*on,1.03)'"; fi
    $FF -loop 1 -t $SEG -i "$src" -filter_complex \
      "[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,setsar=1,zoompan=${ZP}:d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},${CAPBOX},${CAPTXT}[v]" \
      -map "[v]" -t $SEG -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/seg$idx.mp4"
  fi
  idx=$((idx+1))
done
[ "$idx" -ge 2 ] || { echo "zu wenige gueltige Segmente"; exit 1; }

# --- Outro: CTA mit Direktlink ---
printf '%s' "$O1" > "$W/o1.txt"; printf '%s' "luxestyle.ch" > "$W/o2.txt"
printf '%s' "-10%% mit Code WELCOME10" > "$W/o3.txt"; printf '%s' "$O4" > "$W/o4.txt"
$FF -f lavfi -t $OUTRO -i "color=c=${BG}:s=1080x1920:r=${FPS}" -filter_complex \
  "[0:v]drawbox=x=(iw-380)/2:y=ih/2-205:w=380:h=4:color=${GOLD}:t=fill,drawtext=fontfile=${SANS}:textfile=${W}/o1.txt:fontcolor=${INK}:fontsize=58:x=(w-text_w)/2:y=(h/2)-155:alpha='min(t/0.5\,1)',drawtext=fontfile=${SANS}:textfile=${W}/o2.txt:fontcolor=${GOLD}:fontsize=86:x=(w-text_w)/2:y=(h/2)-55:alpha='min(max((t-0.35)*1.6\,0)\,1)',drawtext=fontfile=${SANS}:textfile=${W}/o3.txt:expansion=none:fontcolor=white:fontsize=46:x=(w-text_w)/2:y=(h/2)+70:alpha='min(max((t-0.7)*1.6\,0)\,1)',drawtext=fontfile=${SANSR}:textfile=${W}/o4.txt:fontcolor=white@0.85:fontsize=38:x=(w-text_w)/2:y=(h/2)+150:alpha='min(max((t-0.95)*1.6\,0)\,1)'[v]" \
  -map "[v]" -t $OUTRO -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset veryfast "$W/outro.mp4"

# --- xfade-Kette ---
segs=( "$W/intro.mp4" ); for ((k=0;k<idx;k++)); do segs+=( "$W/seg$k.mp4" ); done; segs+=( "$W/outro.mp4" )
durs=( $INTRO ); for ((k=0;k<idx;k++)); do durs+=( $SEG ); done; durs+=( $OUTRO )
inputs=""; for s in "${segs[@]}"; do inputs+=" -i $s"; done
fc=""; prev="0:v"; acc=${durs[0]}
for ((k=1;k<${#segs[@]};k++)); do
  off=$(python3 -c "print(round($acc-$T,3))")
  tr="fade"; [ $((k % 3)) -eq 0 ] && tr="slideleft"
  fc+="[${prev}][${k}:v]xfade=transition=${tr}:duration=${T}:offset=${off}[x$k];"
  prev="x$k"; acc=$(python3 -c "print(round($acc+${durs[$k]}-$T,3))")
done
fc+="[${prev}]format=yuv420p,drawtext=fontfile=${SANS}:text='LuxeStyle':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=64:alpha=0.9:shadowcolor=black@0.5:shadowx=2:shadowy=2[vout]"
$FF $inputs -filter_complex "$fc" -map "[vout]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium "$W/silent.mp4"

# --- Audio: Voice (voll) + geduckte Musik ; plus Clean-Version ---
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/silent.mp4")
FADE=$(python3 -c "print(max(0,$VD-1.5))")
$FF -i "$W/silent.mp4" -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[1:a]loudnorm=I=-15:TP=-1.5[vo];[2:a]volume=0.16,afade=t=in:st=0:d=0.8,afade=t=out:st=${FADE}:d=1.5[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
CLEAN="${OUT%.*}-clean.mp4"
$FF -i "$W/silent.mp4" -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[1:a]loudnorm=I=-15:TP=-1.5[vo];[2:a]volume=-30dB[mu];[vo][mu]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$CLEAN"
echo ">> Meisterwerk fertig: $OUT (+clean) ~${VD}s, $idx Segmente, Sprache $LANG_"
rm -rf "$W"
