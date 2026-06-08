#!/usr/bin/env bash
# LuxeStyle — Werbevideo 9:16: Produktbilder (Ken-Burns) + Caption + Voiceover + geduckte Musik + Marken-CTA.
# Nutzung: render_ad.sh <out.mp4> <voice.wav> <musik> <img_dir> "<brandline>"
# img_dir: 1.jpg..N.jpg + names.txt (eine Caption je Zeile, gleiche Reihenfolge wie Bilder)
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
OUT="${1:?}"; VOICE="${2:?}"; MUSIC="${3:?}"; IMG="${4:?}"; BRAND="${5:-luxestyle.ch}"
W=$(mktemp -d); FPS=30; GOLD=0xc9a14a
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE")
mapfile -t IMGS < <(ls "$IMG"/[0-9]*.jpg | sort -V)
N=${#IMGS[@]}; [ "$N" -ge 2 ] || { echo "zu wenig Bilder ($N)"; exit 1; }
mapfile -t NAMES < "$IMG/names.txt"
SEG=$(python3 -c "print(round(($DUR+0.4)/$N,3))")
i=0; : > "$W/list.txt"
for f in "${IMGS[@]}"; do
  printf '%s' "${NAMES[$i]:-}" > "$W/cap$i.txt"
  if [ $((i % 2)) -eq 0 ]; then Z="z='min(1.03+0.0007*on,1.13)'"; else Z="z='max(1.13-0.0007*on,1.03)'"; fi
  fc="[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,setsar=1,"
  fc+="zoompan=${Z}:d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},"
  fc+="drawbox=x=0:y=1560:w=1080:h=360:color=black@0.40:t=fill,"
  fc+="drawbox=x=80:y=1650:w=8:h=150:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/cap${i}.txt:fontcolor=white:fontsize=54:x=118:y=1665:line_spacing=10"
  fc+="[v]"
  $FF -loop 1 -t $SEG -i "$f" -filter_complex "$fc" -map "[v]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 20 -preset veryfast "$W/c$i.mp4"
  echo "file '$W/c$i.mp4'" >> "$W/list.txt"
  i=$((i+1))
done
$FF -f concat -safe 0 -i "$W/list.txt" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium "$W/silent.mp4"
printf '%s' "$BRAND" > "$W/brand.txt"
FADE=$(python3 -c "print(max(0,$DUR-1.4))")
$FF -i "$W/silent.mp4" -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[0:v]drawtext=fontfile=${SANS}:text='LuxeStyle':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=80:shadowcolor=black@0.5:shadowx=2:shadowy=2,drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-th-46:shadowcolor=black@0.6:shadowx=2:shadowy=2[v];[1:a]loudnorm=I=-15:TP=-1.5[vo];[2:a]volume=0.16,afade=t=out:st=${FADE}:d=1.4[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo ">> AD fertig: $OUT (~${DUR}s, $N Bilder)"
rm -rf "$W"
