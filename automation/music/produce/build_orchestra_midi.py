#!/usr/bin/env python3
# LuxeStyle Producer — EPISCHES ORCHESTER (User 2026-07-10 «orchester sachen»).
# D-Moll → Dur-Wendung, 88 BPM, ~66s / 24 Takte. Streicher-Ensemble + Celli + Hörner/Brass +
# Pauken + Harfe + Glockenspiel. Aufbau: 1-4 leise Streicher · 5-8 +Celli+Harfe · 9-16 +Hörner+Pauken ·
# 17-24 volles Tutti (episch, Trailer-Stil). 100% royalty-free (GM via FluidSynth).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4

# Progression Dm - B♭ - F - C - Gm - C - Dm - A (episch, i-VI-III-VII...-V)
# (Streicher-Voicing hoch, Cello-Grundton, Horn-Ton)
PROG = [
    ([62, 65, 69, 74], 38, 57),  # Dm
    ([58, 62, 65, 70], 34, 53),  # Bb
    ([57, 60, 65, 69], 41, 57),  # F
    ([60, 64, 67, 72], 36, 60),  # C
    ([58, 62, 67, 70], 43, 55),  # Gm
    ([60, 64, 67, 72], 36, 60),  # C
    ([62, 65, 69, 74], 38, 62),  # Dm
    ([61, 64, 69, 73], 45, 57),  # A (Dur, Aufhellung)
]
NBARS = 24

strings, celli, horns, timp, harp, glock = [], [], [], [], [], []
for b in range(NBARS):
    voic, cello, horn = PROG[b % 8]
    t0 = b * BAR
    cyc = b // 4  # 0..5

    # Streicher-Pad: hält den Akkord, wird lauter mit Aufbau
    vel_s = 44 + cyc * 8
    for p in voic:
        strings.append((t0, BAR - 15, p, min(vel_s, 88)))

    # Celli ab Takt 5: Grundton + Quinte, lange Bögen
    if b >= 4:
        celli.append((t0, BAR - 15, cello, 70))
        celli.append((t0 + TPQ * 2, TPQ * 2 - 15, cello + 7, 58))

    # Harfe ab Takt 5: aufsteigendes Arpeggio (elegante Läufe)
    if b >= 4:
        for i, p in enumerate(voic + [voic[0] + 12]):
            harp.append((t0 + i * (TPQ // 2), TPQ, p, 46))

    # Hörner/Brass ab Takt 9: kraftvolle lange Töne (Melodie-Anker)
    if b >= 8:
        horns.append((t0, TPQ * 2 - 20, horn, 74))
        horns.append((t0 + TPQ * 2, TPQ * 2 - 20, horn + 5, 70))

    # Pauken ab Takt 9: Betonung Zz1 + Aufbau-Rolls
    if b >= 8:
        timp.append((t0, 120, 41, 96))            # tiefer Pauken-Schlag Zz1
        if b >= 16:
            timp.append((t0 + TPQ * 2, 100, 41, 80))
            # Roll-Fill am Phrasenende
            if (b + 1) % 4 == 0:
                for r in range(8):
                    timp.append((t0 + TPQ * 3 + r * (TPQ // 8), 30, 41, 40 + r * 6))

    # Glockenspiel-Sparkle im vollen Teil
    if b >= 16:
        glock.append((t0, TPQ, voic[-1] + 12, 40))

tracks = [
    notes_track(strings, program=48, channel=0),  # String Ensemble 1
    notes_track(celli, program=42, channel=1),     # Cello
    notes_track(horns, program=60, channel=2),     # French Horn
    notes_track(harp, program=46, channel=3),      # Orchestral Harp
    notes_track(glock, program=9, channel=4),      # Glockenspiel
    notes_track(timp, channel=9),                  # GM-Drumkit (Timpani-Note 41)
]
write_midi('/tmp/orchestra.mid', tracks, tpq=TPQ, tempo_bpm=88)
print('orchestra.mid geschrieben:', NBARS, 'Takte, 88 BPM, D-Moll episch')
