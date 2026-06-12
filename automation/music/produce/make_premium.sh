#!/usr/bin/env bash
# LuxeStyle Producer — regeneriert automation/music/luxe-premium.wav reproduzierbar.
# Elegante Premium-Spur (Grand Piano + Streicher + Akustik-Bass + Glockenspiel + Soft-Groove),
# F-Dur, 96 BPM, ~64s, mit Aufbau. Für Marken-/Premium-Reels (render_brand_video.py).
# Voraussetzungen (ephemerer Container, einmalig):
#   apt-get install -y fluidsynth fluid-soundfont-gm sox ffmpeg python3-numpy python3-scipy
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$HERE/.." && pwd)/luxe-premium.wav"
SF="${SF2:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"
[ -f "$SF" ] || { echo "SoundFont fehlt: $SF (apt install fluid-soundfont-gm)"; exit 1; }

python3 "$HERE/build_premium_midi.py"
fluidsynth -ni -g 0.9 -r 44100 "$SF" /tmp/premium.mid -F /tmp/premium_raw.wav
sox /tmp/premium_raw.wav /tmp/premium_rev.wav reverb 28 50 100 norm -2
ffmpeg -hide_banner -loglevel error -y -i /tmp/premium_rev.wav \
  -af "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=180:makeup=3,highpass=f=32,loudnorm=I=-14:TP=-1.2,alimiter=limit=0.92:asc=true" \
  -ar 44100 "$OUT"
echo ">> $OUT"
