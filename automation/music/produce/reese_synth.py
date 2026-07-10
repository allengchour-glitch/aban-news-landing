#!/usr/bin/env python3
# Reese-Bass-Synth (der Pro-DnB/House-Sound, den GM nicht kann): 3 verstimmte Sägezähne +
# bewegtes Tiefpass-Filter (LFO) + Sub-Sinus. Schreibt eine WAV, die render.sh unter den FluidSynth-Mix legt.
# Aufruf: python3 reese_synth.py <spec.txt> <out.wav> <bpm>   ·  spec-Zeile: "startSec durSec midiNote"
import sys, numpy as np
from scipy.signal import butter, lfilter

SR = 44100
spec, out = sys.argv[1], sys.argv[2]
def midi_hz(n): return 440.0 * 2 ** ((n - 69) / 12.0)

rows = []
for line in open(spec):
    p = line.split()
    if len(p) >= 3: rows.append((float(p[0]), float(p[1]), int(float(p[2]))))
if not rows:
    open(out, 'wb').close(); sys.exit(0)
total = max(s + d for s, d, _ in rows) + 0.5
buf = np.zeros(int(total * SR))

def saw(freq, n):
    t = np.arange(n) / SR
    # bandbegrenzter Sägezahn (additive Harmonische bis Nyquist/2)
    y = np.zeros(n)
    k = 1
    while freq * k < SR / 2.2 and k < 40:
        y += ((-1) ** (k + 1)) / k * np.sin(2 * np.pi * freq * k * t)
        k += 1
    return y

for st, dur, note in rows:
    n = int(dur * SR); i0 = int(st * SR)
    f = midi_hz(note)
    # 3 verstimmte Saws (Reese-Kern)
    s = saw(f, n) + saw(f * 1.006, n) + 0.8 * saw(f * 0.994, n)
    # bewegtes Tiefpass (LFO 0.5–2 Hz) → der typische «wobbelnde» Reese
    t = np.arange(n) / SR
    cutoff = 300 + 700 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t))
    # segmentweises Filtern (Cutoff-Mittel je 1024 Samples)
    y = np.zeros(n); step = 1024
    for j in range(0, n, step):
        c = float(np.clip(cutoff[j:j+step].mean(), 80, 1800))
        b, a = butter(2, c / (SR / 2), btype='low')
        y[j:j+step] = lfilter(b, a, s[j:j+step])
    # Sub-Sinus eine Oktave tiefer
    sub = 0.9 * np.sin(2 * np.pi * (f / 2) * t)
    seg = 0.5 * y + sub
    # Fade an den Rändern gegen Klicks
    fl = min(400, n // 8)
    seg[:fl] *= np.linspace(0, 1, fl); seg[-fl:] *= np.linspace(1, 0, fl)
    buf[i0:i0+n] += seg[:len(buf)-i0]

buf /= (np.max(np.abs(buf)) + 1e-9)
buf *= 0.7
import scipy.io.wavfile as wav
wav.write(out, SR, (buf * 32767).astype(np.int16))
print('reese:', out, round(total, 1), 's,', len(rows), 'Noten')
