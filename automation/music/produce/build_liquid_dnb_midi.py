#!/usr/bin/env python3
# LuxeStyle Producer — LIQUID DnB (User 2026-07-10 «dnb sound trends?»). TikTok/Reels-Trend 2026.
# 174 BPM, a-Moll. Melodisch/treibend: Amen-artiger Breakbeat + Reese/Sub-Bass + lush E-Piano-Pads +
# Sax-Stabs. ~62s / 45 Takte (bei 174 BPM). Aufbau: Intro-Pad · Break-Drop · Bass+Sax · Breakdown→Outro.
# 100% royalty-free (GM via FluidSynth).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4
PROG = [
    ([57, 60, 64, 69], 33, 69),   # Am  (Pad-Voicing, Sub-Grundton TIEF, Sax)
    ([53, 57, 60, 65], 29, 65),   # F
    ([52, 55, 60, 64], 36, 67),   # C
    ([50, 55, 59, 62], 31, 62),   # G
]
SAX = [
    [(0, 1.5, 69), (2.0, 1.0, 72)],
    [(0, 1.0, 69), (2.5, 1.0, 65)],
    [(0, 2.0, 72)],
    [(0, 1.0, 71), (2.0, 1.0, 67)],
]
NBARS = 45
pads, sub, reese, sax, drums = [], [], [], [], []

def amen(t0, vel_k=100):
    # 1 Takt Liquid-DnB-Break (16tel-Raster = TPQ/4). Kick/Snare/Hats.
    step = TPQ // 4
    # Kick-Pattern (0,10) / Snare (4,12) klassisch two-step
    for k in (0, 6, 10):
        drums.append((t0 + k * step, 40, 36, vel_k))
    for s in (4, 12):
        drums.append((t0 + s * step, 40, 38, 104))       # Snare
    for h in range(16):
        drums.append((t0 + h * step, 25, 42, 26 if h % 2 else 34))  # Hats 16tel
    drums.append((t0 + 14 * step, 30, 46, 40))            # Open-Hat Pickup

for b in range(NBARS):
    voic, subn, _ = PROG[b % 4]
    t0 = b * BAR
    INTRO = b < 4
    DROP  = 4 <= b
    FULL  = 12 <= b < 36
    OUTRO = b >= 36

    # Pads (lush, halten)
    vel_p = 58 if INTRO else (44 if not FULL else 52)
    for p in voic:
        pads.append((t0, BAR - 20, p, vel_p))

    if not DROP:
        continue

    # Breakbeat
    amen(t0, 100 if not OUTRO else 74)

    # Sub-Bass: langer Grundton pro Takt (der DnB-Wobble/Reese-Ersatz: tief + Oktave)
    sub.append((t0, BAR - 30, subn, 96))
    # Reese-ähnlich: gehaltener Ton eine Oktave höher, leicht (Sägezahn-Synth)
    if FULL:
        reese.append((t0, BAR - 30, subn + 12, 46))
        reese.append((t0 + TPQ * 2, TPQ * 2 - 30, subn + 19, 40))

    # Sax-Stabs ab Takt 9, voll ab 13
    if b >= 8:
        vel = 76 if FULL else (56 if not OUTRO else 64)
        for (off, dur, pitch) in SAX[b % 4]:
            sax.append((t0 + int(off * TPQ), int(dur * TPQ) - 20, pitch, vel))

tracks = [
    notes_track(pads,  program=89, channel=0),   # Pad 2 (warm)
    notes_track(sub,   program=38, channel=1),    # Synth Bass 1 (Sub)
    notes_track(reese, program=81, channel=2),    # Saw Lead (Reese-Layer)
    notes_track(sax,   program=66, channel=4),    # Tenor Sax
    notes_track(drums, channel=9),                # Break-Kit
]
write_midi('/tmp/dnb.mid', tracks, tpq=TPQ, tempo_bpm=174)
print('dnb.mid geschrieben:', NBARS, 'Takte, 174 BPM, Liquid DnB a-Moll')
