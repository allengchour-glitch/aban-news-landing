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
# Optionale Lead-Spur (24.09.2026, Celtic Epic): build-Skript schreibt /tmp/<genre>_lead.mid → eigene Spur mit
# Präsenz-EQ (+3 dB um 2.5 kHz) und LEAD_GAIN (Standard 1.5) auf die Begleitung gemischt. Ohne Datei: wie bisher.
LEADMID="/tmp/${GENRE}_lead.mid"
if [ -f "$LEADMID" ]; then
  fluidsynth -ni -g 0.9 -r 44100 "$SF" "$LEADMID" -F "/tmp/${GENRE}_lead_raw.wav" 2>/dev/null
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i "/tmp/${GENRE}_lead_raw.wav" -filter_complex \
    "[1:a]equalizer=f=2500:t=q:w=1.2:g=3,volume=${LEAD_GAIN:-1.5}[l];[0:a][l]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95" \
    -ar 44100 "/tmp/${GENRE}_mitlead.wav" && RAW="/tmp/${GENRE}_mitlead.wav"
fi

# Optionaler Reese-Bass-Layer: build-Skript kann /tmp/<genre>_reese.txt schreiben (Zeilen: startSec durSec midiNote)
# Layers synthetisieren + PRO-MIXDOWN (Sidechain-Pump + FX)
REESE_SPEC="/tmp/${GENRE}_reese.txt"; DRUM_SPEC="/tmp/${GENRE}_drums.txt"; FXS="/tmp/${GENRE}_fx.txt"; KICKS="/tmp/${GENRE}_kicks.txt"
RW="-"; DW="-"; FW="-"; KK="-"
[ -f "$REESE_SPEC" ] && python3 "$HERE/reese_synth.py" "$REESE_SPEC" "/tmp/${GENRE}_reese.wav" 174 2>/dev/null && RW="/tmp/${GENRE}_reese.wav"
[ -f "$DRUM_SPEC" ] && python3 "$HERE/drum_synth.py" "$DRUM_SPEC" "/tmp/${GENRE}_drums.wav" 2>/dev/null && DW="/tmp/${GENRE}_drums.wav"
[ -f "$FXS" ] && python3 "$HERE/fx_synth.py" "$FXS" "/tmp/${GENRE}_fx.wav" 2>/dev/null && FW="/tmp/${GENRE}_fx.wav"
[ -f "$KICKS" ] && KK="$KICKS"
if [ "$RW$DW$FW" != "---" ]; then
  python3 "$HERE/mixdown.py" "$RAW" "$DW" "$RW" "$FW" "$KK" "/tmp/${GENRE}_full.wav" 2>/dev/null && RAW="/tmp/${GENRE}_full.wav"
fi


# Genre-Reverb (Default mittel; Ballade/Orchester mehr, DnB/House weniger)
case "$GENRE" in
  orchestra|premium)      RVB="40 55 100" ;;
  celtic_epic)            RVB="30 50 95" ;;
  liquid_dnb)             RVB="45 60 100" ;;
  *house*)                RVB="20 40 85" ;;
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
  -af "acompressor=threshold=-18dB:ratio=3:attack=6:release=160:makeup=3,${EXTRA}highpass=f=30,loudnorm=I=${LUFS:--14}:TP=-1.2,alimiter=limit=0.93" \
  -ar 44100 "$OUT" 2>/dev/null
# Stille am Ende kappen (24.09.2026): Reverb-/Synth-Nachlauf liess 8–11 s Leere stehen — auf Reels ein toter Schluss.
# Hörbares Ende = letzte Stelle über −45 dB (50-ms-Fenster), +1 s, Ausblenden über 2.5 s.
ENDE=$(python3 -c "
import numpy as np,scipy.io.wavfile as w
sr,d=w.read('$OUT'); x=d.astype(float); x=x.mean(1) if x.ndim>1 else x
e=np.convolve(np.abs(x),np.ones(int(.05*sr))/int(.05*sr),'same'); i=np.where(e>e.max()*10**(-45/20))[0]
print(round(i[-1]/sr,2) if len(i) else 0)" 2>/dev/null || echo 0)
if python3 -c "import sys; sys.exit(0 if float('$ENDE')>5 else 1)"; then
  ffmpeg -hide_banner -loglevel error -y -i "$OUT" -af "atrim=0:$(python3 -c "print($ENDE+1.0)"),afade=t=out:st=$(python3 -c "print(max(0,$ENDE-1.5))"):d=2.5" "/tmp/${GENRE}_trim.wav" && mv "/tmp/${GENRE}_trim.wav" "$OUT"
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo ">> $OUT  (${DUR}s)"
