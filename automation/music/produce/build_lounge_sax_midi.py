#!/usr/bin/env python3
# LuxeStyle Producer — DEEP-HOUSE / LOUNGE mit SAXOFON-Lead + Klavier (User 2026-07-10 «dj sachen, klavier saxofon»).
# a-Moll, 122 BPM, 4-on-the-floor House-Groove + E-Piano-Chords + Sax-Melodie + Bass. ~64s / 32 Takte.
# Aufbau: 1-4 Piano-Chords · 5-8 +Bass+Kick · 9-16 +Hats/Claps+Sax-Intro · 17-32 voller Sax-Lead.
# 100% royalty-free (GM-Instrumente via FluidSynth).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4

# a-Moll Deep-House Progression: Am - F - C - G (i - VI - III - VII), warm & clubby
# (E-Piano-Voicing, Bass-Grundton, Sax-Zielton)
PROG = [
    ([57, 60, 64, 69], 45, 69),   # Am
    ([53, 57, 60, 65], 41, 65),   # F
    ([52, 55, 60, 64], 48, 67),   # C
    ([50, 55, 59, 62], 43, 62),   # G
]
NBARS = 32
# Sax-Melodie-Phrasen (Halbton-Offsets relativ, klingt bluesig-lounge); pro 4-Takt-Zyklus eine Phrase
SAX_PHRASES = [
    [(0, 2.0, 69), (2.0, 1.0, 72), (3.0, 1.0, 71)],       # Am
    [(0, 1.5, 69), (1.5, 1.5, 65), (3.0, 1.0, 67)],       # F
    [(0, 2.0, 67), (2.0, 2.0, 72)],                        # C
    [(0, 1.0, 71), (1.0, 1.0, 69), (2.0, 2.0, 67)],       # G
]

epiano, bass, sax, drums = [], [], [], []
for b in range(NBARS):
    voic, bs, _ = PROG[b % 4]
    t0 = b * BAR
    cyc = b // 4

    # E-Piano: gestochene House-Stabs auf Offbeats (& von 1..4)
    for beat in range(4):
        st = t0 + beat * TPQ + TPQ // 2   # Offbeat
        for p in voic:
            epiano.append((st, int(TPQ * 0.42), p, 60 if beat % 2 == 0 else 52))
    # Takt-Anfang zusätzlich ein weicher Chord
    for p in voic:
        epiano.append((t0, int(TPQ * 0.9), p - 12, 40))

    # Bass ab Takt 5: House-Bassline (Grundton auf jedem Beat, Oktav-Bounce)
    if b >= 4:
        for beat in range(4):
            st = t0 + beat * TPQ
            note = bs if beat % 2 == 0 else bs + 12
            bass.append((st, int(TPQ * 0.55), note, 82))

    # Drums ab Takt 5: 4-on-the-floor
    if b >= 4:
        for beat in range(4):
            drums.append((t0 + beat * TPQ, 60, 36, 90))          # Kick jeder Beat
        if b >= 8:
            for e in range(8):
                te = t0 + e * (TPQ // 2)
                if e % 2 == 1:
                    drums.append((te, 45, 42, 44))               # Open-ish Hat Offbeat
                drums.append((te, 30, 70, 20))                   # Shaker durchgehend
            drums.append((t0 + TPQ, 50, 39, 70))                 # Clap Backbeat Zz2
            drums.append((t0 + TPQ * 3, 50, 39, 70))             # Clap Zz4

    # Sax-Lead: Intro-Phrasen ab Takt 9, voll ab 17
    if b >= 8:
        vel = 78 if b >= 16 else 60
        for (off, dur, pitch) in SAX_PHRASES[b % 4]:
            st = t0 + int(off * TPQ)
            sax.append((st, int(dur * TPQ) - 20, pitch, vel))

tracks = [
    notes_track(epiano, program=4, channel=0),    # Electric Piano 1 (Rhodes-ähnlich)
    notes_track(bass, program=38, channel=2),      # Synth Bass 1
    notes_track(sax, program=66, channel=4),       # Tenor Sax
    notes_track(drums, channel=9),                 # GM-Drumkit
]
write_midi('/tmp/lounge_sax.mid', tracks, tpq=TPQ, tempo_bpm=122)
print('lounge_sax.mid geschrieben:', NBARS, 'Takte, 122 BPM, a-Moll, Sax+E-Piano+House')
