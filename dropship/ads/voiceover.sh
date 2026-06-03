#!/usr/bin/env bash
set -euo pipefail
cd /tmp/ads/voice
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

# German ad scripts (sentence per line; "Welcome zehn" = code WELCOME10, "punkt c h" = .ch)
declare -A SCRIPT
SCRIPT[montage]="LuxeStyle. Die Bestseller. Premium Wellness und Lifestyle für dein Zuhause, schon ab vierzehn Franken neunzig. Jetzt auf luxestyle punkt c h, mit zehn Prozent Rabatt und dem Code Welcome zehn. Gratis Versand."
SCRIPT[hook]="Die Top Ten Bestseller von LuxeStyle. Sichere dir zehn Prozent mit dem Code Welcome zehn."
SCRIPT[tour]="Willkommen bei LuxeStyle, deinem Online-Shop für Premium Wellness und Lifestyle. Sichere dir zehn Prozent mit dem Code Welcome zehn. Gratis Versand auf luxestyle punkt c h."

gen () {
  local name="$1" text="${SCRIPT[$1]}"
  rm -f ${name}_*.mp3 ${name}_list.txt
  local i=0
  # split into sentences on ". "
  python3 - "$text" "$name" <<'PY'
import sys,urllib.parse,re
text,name=sys.argv[1],sys.argv[2]
parts=[p.strip() for p in re.split(r'(?<=[.!?]) ', text) if p.strip()]
open(f"/tmp/ads/voice/{name}_parts.txt","w").write("\n".join(parts)+"\n")
PY
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    local enc; enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$line")
    local n=$(printf "%02d" $i)
    curl -sS --max-time 25 -A "$UA" -e "https://translate.google.com/" \
      -o "${name}_${n}.mp3" \
      "https://translate.google.com/translate_tts?ie=UTF-8&q=${enc}&tl=de&client=tw-ob&ttsspeed=1"
    echo "file '${name}_${n}.mp3'" >> ${name}_list.txt
    # 220ms silence between sentences
    i=$((i+1))
  done < "${name}_parts.txt"
  # concat sentence mp3s, then to clean 44.1k stereo wav with light normalization
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i ${name}_list.txt -ar 44100 -ac 2 \
    -af "loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.1" "${name}_voice.wav"
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${name}_voice.wav")
  echo "$name voice: ${d}s ($(echo "${SCRIPT[$1]}" | wc -w) words)"
}

gen montage
gen hook
gen tour
echo "VOICES DONE"