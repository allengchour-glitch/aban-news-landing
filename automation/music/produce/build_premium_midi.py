#!/usr/bin/env python3
# LuxeStyle Producer — elegante PREMIUM-Spur (für Marken-/Premium-Reels).
# Grand Piano + warme Streicher + Akustik-Bass + Glockenspiel + dezenter Soft-Groove.
# F-Dur, 96 BPM, Progression F–C–Dm–B♭ (I–V–vi–IV), 24 Takte (~60s) mit Aufbau:
#   Takt 1–4 Piano+Streicher · 5–8 +Bass/Glocken · 9–16 +Soft-Drums · 17–24 voll.
# 100% royalty-free (echte GM-Instrumente via FluidSynth, keine Attribution nötig).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4

# (Piano-Voicing, Bass-Grundton, Glockenspiel-Akzent)
PROG = [
    ([53, 57, 60, 65], 41, 77),  # F-Dur
    ([52, 55, 60, 64], 36, 76),  # C-Dur
    ([50, 53, 57, 62], 38, 74),  # d-Moll
    ([46, 53, 58, 62], 34, 77),  # B♭-Dur
]
NBARS = 24

piano, strings, bass, glock, drums = [], [], [], [], []
for b in range(NBARS):
    voic, bs, gl = PROG[b % 4]
    t0 = b * BAR
    cycle = b // 4  # 0..5

    # Streicher: warmes Pad über den ganzen Takt (leise)
    for p in voic:
        strings.append((t0, BAR - 20, p, 50))

    # Piano: aufsteigendes Viertel-Arpeggio, klingt aus
    for i, p in enumerate(voic):
        st = t0 + i * TPQ
        piano.append((st, int(TPQ * 1.6), p, 74 if i == 0 else 62))

    # Bass: Grundton auf Zählzeit 1 + 3
    bass.append((t0, TPQ * 2 - 20, bs, 80))
    bass.append((t0 + TPQ * 2, TPQ * 2 - 20, bs, 70))

    # Glockenspiel-Sparkle ab 2. Zyklus
    if cycle >= 1:
        glock.append((t0, TPQ, gl, 58))
        if cycle >= 3:
            glock.append((t0 + TPQ * 2, TPQ, gl - 5, 50))

    # Soft-Drums ab Takt 9 (dezent, elegant — kein Trap)
    if b >= 8:
        drums.append((t0, 60, 36, 74))             # Soft-Kick Zz1
        drums.append((t0 + TPQ * 2, 60, 36, 66))   # Soft-Kick Zz3
        for e in range(8):
            te = t0 + e * (TPQ // 2)
            drums.append((te, 40, 70, 24))         # Shaker (leise, durchgehend)
            if e % 2 == 1:
                drums.append((te, 40, 42, 30))     # Closed Hi-Hat auf Offbeat
        if b >= 16:
            drums.append((t0 + TPQ, 40, 37, 42))   # Side-Stick Backbeat Zz2
            drums.append((t0 + TPQ * 3, 40, 37, 42))  # Zz4

tracks = [
    notes_track(piano, program=0, channel=0),    # Acoustic Grand Piano
    notes_track(strings, program=48, channel=1),  # String Ensemble 1
    notes_track(bass, program=32, channel=2),     # Acoustic Bass
    notes_track(glock, program=9, channel=3),     # Glockenspiel
    notes_track(drums, channel=9),                # GM-Drumkit (Kanal 10)
]
write_midi('/tmp/premium.mid', tracks, tpq=TPQ, tempo_bpm=96)
print('premium.mid geschrieben:', NBARS, 'Takte, 96 BPM, F-Dur')
