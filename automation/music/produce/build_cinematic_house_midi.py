#!/usr/bin/env python3
# LuxeStyle Producer — CINEMATIC HOUSE (User 2026-07-10 «mach ein guten mix draus»).
# EIN Track, der beide Welten vereint: episches Orchester-Intro (Streicher+Hörner+Pauken) das nach
# ~8s in einen House-Groove mit Saxofon-Lead DROPPT. a-Moll, 122 BPM, ~70s / 36 Takte. Trailer→Club.
# Aufbau: 1-4 Orchester-Intro (kein Beat, Riser) · 5 DROP (Kick+Bass+E-Piano) · 9 +Hats/Claps+Sax-Intro ·
#         17-28 volles Tutti (Sax-Lead + Streicher-Pad + Horn-Stabs) · 29-36 Breakdown→Outro.
# 100% royalty-free (GM-Instrumente via FluidSynth).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4
# a-Moll House-Progression: Am - F - C - G  (i-VI-III-VII)
PROG = [
    ([57, 60, 64, 69], 45, 69),   # Am  (E-Piano-Voicing, Bass, Sax-Zielton)
    ([53, 57, 60, 65], 41, 65),   # F
    ([52, 55, 60, 64], 48, 67),   # C
    ([50, 55, 59, 62], 43, 62),   # G
]
# Orchester-Voicing (hoch, für Intro-Streicher/Hörner)
ORCH = [[69, 72, 76], [65, 69, 72], [64, 67, 72], [62, 67, 71]]
SAX = [
    [(0, 2.0, 69), (2.0, 1.0, 72), (3.0, 1.0, 71)],
    [(0, 1.5, 69), (1.5, 1.5, 65), (3.0, 1.0, 67)],
    [(0, 2.0, 67), (2.0, 2.0, 72)],
    [(0, 1.0, 71), (1.0, 1.0, 69), (2.0, 2.0, 67)],
]
NBARS = 36
epiano, bass, sax, strings, horns, drums, timp = [], [], [], [], [], [], []

for b in range(NBARS):
    voic, bs, _ = PROG[b % 4]
    orch = ORCH[b % 4]
    t0 = b * BAR
    INTRO = b < 4          # Orchester-Intro
    DROP  = 4 <= b         # ab Drop läuft House
    FULL  = 16 <= b < 28   # volles Tutti
    OUTRO = b >= 28

    # --- Streicher: Intro-Pad + hält im ganzen Track als cinematischer Teppich (leiser im Beat-Teil)
    vel_s = 70 if INTRO else (46 if not FULL else 56)
    for p in orch:
        strings.append((t0, BAR - 15, p, vel_s))

    # --- Pauken: Intro-Betonung + Phrasen-Fills
    if INTRO:
        timp.append((t0, 130, 41, 88))
        if b == 3:  # Riser-Fill vor dem Drop
            for r in range(16):
                timp.append((t0 + r * (TPQ // 4), 24, 41, 30 + r * 4))
    elif FULL and (b + 1) % 4 == 0:
        for r in range(8):
            timp.append((t0 + TPQ * 3 + r * (TPQ // 8), 28, 41, 44 + r * 6))

    # --- Hörner: Intro-Melodie + Stabs im vollen Teil
    if INTRO:
        horns.append((t0, TPQ * 2 - 20, orch[0] - 12, 66))
        horns.append((t0 + TPQ * 2, TPQ * 2 - 20, orch[1] - 12, 62))
    elif FULL:
        horns.append((t0, int(TPQ * 0.5), orch[0] - 12, 58))   # kurzer Stab Zz1

    if not DROP:
        continue

    # --- E-Piano House-Stabs auf Offbeats
    for beat in range(4):
        st = t0 + beat * TPQ + TPQ // 2
        for p in voic:
            epiano.append((st, int(TPQ * 0.42), p, 58 if beat % 2 == 0 else 50))

    # --- Bass: House-Bassline (Oktav-Bounce)
    for beat in range(4):
        note = bs if beat % 2 == 0 else bs + 12
        bass.append((t0 + beat * TPQ, int(TPQ * 0.55), note, 84))

    # --- Drums: 4-on-the-floor (im Outro ausgedünnt)
    kick_vel = 92 if not OUTRO else 70
    for beat in range(4):
        drums.append((t0 + beat * TPQ, 60, 36, kick_vel))
    if b >= 8 and not OUTRO:
        for e in range(8):
            te = t0 + e * (TPQ // 2)
            if e % 2 == 1:
                drums.append((te, 45, 42, 42))     # Hat Offbeat
            drums.append((te, 30, 70, 18))         # Shaker
        drums.append((t0 + TPQ, 50, 39, 68))       # Clap Zz2
        drums.append((t0 + TPQ * 3, 50, 39, 68))   # Clap Zz4

    # --- Sax-Lead ab Takt 9, voll ab 17, im Outro ausklingend
    if b >= 8:
        vel = 80 if FULL else (58 if not OUTRO else 66)
        for (off, dur, pitch) in SAX[b % 4]:
            sax.append((t0 + int(off * TPQ), int(dur * TPQ) - 20, pitch, vel))

tracks = [
    notes_track(strings, program=48, channel=0),   # String Ensemble
    notes_track(horns,   program=60, channel=1),    # French Horn
    notes_track(epiano,  program=4,  channel=2),    # Electric Piano
    notes_track(bass,    program=38, channel=3),    # Synth Bass
    notes_track(sax,     program=66, channel=4),    # Tenor Sax
    notes_track(timp,    channel=9),                # Timpani/Perc (Kanal 10)
    notes_track(drums,   channel=9),                # House-Kit (Kanal 10)
]
write_midi('/tmp/cinehouse.mid', tracks, tpq=TPQ, tempo_bpm=122)
print('cinehouse.mid geschrieben:', NBARS, 'Takte, 122 BPM, a-Moll, Orchester→House+Sax')
