#!/usr/bin/env bash
# LuxeStyle — fetch_voice_ref.sh · Referenz-Audio fuer Voice-Cloning holen (yt-dlp + ffmpeg).
# Schneidet einen sauberen ~12s-Mono-Clip (16kHz) als Klon-Referenz.
#
# ⚠️ RECHTE/EINWILLIGUNG: Eine fremde Stimme (z.B. zufaelliger YouTuber) fuer einen KOMMERZIELLEN
#    Shop zu klonen ist NICHT erlaubt (Persoenlichkeitsrecht). Erlaubt: DEINE eigene Stimme, eine
#    bezahlte/lizenzierte Sprecher-Stimme, oder eine ausdruecklich freigegebene Stimme.
#    Dieses Tool dient zum TECHNISCHEN Testen der Pipeline bzw. fuer eigenes/lizenziertes Material.
#
# Nutzung:
#   bash automation/fetch_voice_ref.sh <youtube-url-oder-datei> [start_sek] [dauer_sek] [out.wav]
#   z.B. bash automation/fetch_voice_ref.sh "https://youtu.be/XXXX" 30 12 ref.wav
set -e
SRC="${1:?URL oder Audiodatei}"; START="${2:-0}"; DUR="${3:-12}"; OUT="${4:-/tmp/voice_ref.wav}"
RAW=/tmp/_voiceraw.m4a

if [[ "$SRC" =~ ^https?:// ]]; then
  echo "==> Audio laden (yt-dlp) …"
  yt-dlp -q -x --audio-format m4a -o "$RAW" "$SRC"
  IN="$RAW"
else
  IN="$SRC"
fi

echo "==> 12s-Mono-16k-Referenz schneiden (ab ${START}s) …"
ffmpeg -nostdin -y -loglevel error -ss "$START" -t "$DUR" -i "$IN" \
  -ar 16000 -ac 1 -af "loudnorm=I=-18:TP=-2,highpass=f=80,lowpass=f=8000" "$OUT"
echo "✅ Referenz: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
echo "   -> damit am PC (GPU) klonen: automation/local/avatar/KLON-STIMME.bat"
