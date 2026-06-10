#!/usr/bin/env bash
# LuxeStyle Producer — regeneriert automation/music/luxe-hype-pro.mp3 reproduzierbar.
# Voraussetzungen (ephemerer Container, einmalig):
#   apt-get install -y fluidsynth fluid-soundfont-gm sox ffmpeg
#   pip install numpy scipy
# Pipeline: MIDI bauen → FluidSynth (echte GM-Instrumente) → Riser/Impact-Mix → Master (-13.6 LUFS).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$HERE/.." && pwd)/luxe-hype-pro.mp3"
SF="${SF2:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"
[ -f "$SF" ] || { echo "SoundFont fehlt: $SF (apt install fluid-soundfont-gm)"; exit 1; }

python3 "$HERE/build_hype_pro_midi.py"
fluidsynth -ni -g 0.85 -r 44100 "$SF" /tmp/hype_pro.mid -F /tmp/hype_pro_raw.wav
python3 "$HERE/hype_finish.py"                       # adds riser + drop impact → /tmp/hype_pro_mix.wav
sox /tmp/hype_pro_mix.wav /tmp/hype_pro_rev.wav reverb 18 norm -2.5
ffmpeg -hide_banner -loglevel error -y -i /tmp/hype_pro_rev.wav \
  -af "acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=4,volume=2.5dB,alimiter=limit=0.80:level=false:asc=true" \
  -ar 44100 -b:a 192k "$OUT"
echo ">> $OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af loudnorm=print_format=summary -f null - 2>&1 \
  | grep -E "Input Integrated|Input True Peak" || true
