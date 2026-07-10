#!/usr/bin/env bash
# LuxeStyle Universal-Producer (User 2026-07-10 «giltet für zukunft auch für andere richtung»).
# EIN Renderer für JEDE Richtung: nimmt ein build_<genre>_midi.py + optionale Reese-Bass-Layer + Mastering.
# Aufruf:  bash render.sh <genre> [OUT.wav]
#   <genre> = Name ohne build_/_midi.py, z.B. liquid_dnb, cinematic_house, orchestra, lounge_sax, premium
# Voraussetzungen (ephemer, einmalig): apt install fluidsynth fluid-soundfont-gm sox ffmpeg; pip numpy scipy
# Mastering-Ziel: -13..-14 LUFS, TP -1.2, sauberer Hochpass. Genre-spezifische Reverb/Bass in build-Skript-Kommentar.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
GENRE="${1:?genre fehlt (z.B. liquid_dnb)}"
OUT="${2:-$(cd "$HERE/.." && pwd)/luxe-${GENRE//_/-}.wav}"
SF="${SF2:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"
BUILD="$HERE/build_${GENRE}_midi.py"
[ -f "$BUILD" ] || { echo "Kein Build-Skript: $BUILD"; exit 1; }
[ -f "$SF" ] || { echo "SoundFont fehlt: $SF"; exit 1; }
MID="/tmp/${GENRE}.mid"; RAW="/tmp/${GENRE}_raw.wav"; REV="/tmp/${GENRE}_rev.wav"

python3 "$BUILD"
fluidsynth -ni -g 0.9 -r 44100 "$SF" "$MID" -F "$RAW" 2>/dev/null

# Optionaler Reese-Bass-Layer: build-Skript kann /tmp/<genre>_reese.txt schreiben (Zeilen: startSec durSec midiNote)
REESE_SPEC="/tmp/${GENRE}_reese.txt"
if [ -f "$REESE_SPEC" ]; then
  python3 "$HERE/reese_synth.py" "$REESE_SPEC" "/tmp/${GENRE}_reese.wav" 174 2>/dev/null || true
  if [ -f "/tmp/${GENRE}_reese.wav" ]; then
    sox -m "$RAW" "/tmp/${GENRE}_reese.wav" "/tmp/${GENRE}_mix.wav" 2>/dev/null && RAW="/tmp/${GENRE}_mix.wav"
  fi
fi

# Genre-Reverb (Default mittel; Ballade/Orchester mehr, DnB/House weniger)
case "$GENRE" in
  orchestra|premium)      RVB="40 55 100" ;;
  liquid_dnb|*house*)     RVB="20 40 85" ;;
  *)                      RVB="28 48 92" ;;
esac
sox "$RAW" "$REV" reverb $RVB norm -2 2>/dev/null

# Mastering (Bass-Boost nur bei Bass-Genres)
case "$GENRE" in
  liquid_dnb) EXTRA="bass=g=5:f=65," ;;
  *house*|*hype*) EXTRA="bass=g=4:f=70," ;;
  *)                          EXTRA="" ;;
esac
ffmpeg -hide_banner -loglevel error -y -i "$REV" \
  -af "acompressor=threshold=-18dB:ratio=3:attack=6:release=160:makeup=3,${EXTRA}highpass=f=30,loudnorm=I=${LUFS:-13.5}:TP=-1.2,alimiter=limit=0.93" \
  -ar 44100 "$OUT" 2>/dev/null
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo ">> $OUT  (${DUR}s)"
