#!/usr/bin/env bash
# LuxeStyle — Google-TTS Voiceover: splittet Text in Sätze, holt je MP3, konkateniert zu sauberem WAV.
# Nutzung: tts.sh <lang(de|en)> <out.wav> "<text>"  (Zahlen ausschreiben; 'punkt c h' = .ch; 'Welcome zehn' = WELCOME10)
set -euo pipefail
LANG_="${1:?lang}"; OUT="${2:?out}"; TEXT="${3:?text}"
W=$(mktemp -d); UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
python3 - "$TEXT" "$W" <<'PY'
import sys,re
text,w=sys.argv[1],sys.argv[2]
parts=[p.strip() for p in re.split(r'(?<=[.!?]) ', text) if p.strip()]
open(f"{w}/parts.txt","w").write("\n".join(parts)+"\n")
PY
: > "$W/list.txt"; i=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$line")
  n=$(printf "%02d" $i)
  curl -sS --max-time 25 -A "$UA" -e "https://translate.google.com/" -o "$W/$n.mp3" \
    "https://translate.google.com/translate_tts?ie=UTF-8&q=${enc}&tl=${LANG_}&client=tw-ob&ttsspeed=1" || true
  if [ -s "$W/$n.mp3" ]; then echo "file '$W/$n.mp3'" >> "$W/list.txt"; i=$((i+1)); fi
done < "$W/parts.txt"
[ -s "$W/list.txt" ] || { echo "TTS fehlgeschlagen (keine MP3)"; exit 1; }
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$W/list.txt" -ar 44100 -ac 2 \
  -af "loudnorm=I=-15:TP=-1.5,apad=pad_dur=0.2" "$OUT"
echo "TTS $LANG_ -> $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
rm -rf "$W"
