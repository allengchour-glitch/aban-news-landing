#!/usr/bin/env python3
# LuxeStyle Producer — LIQUID DnB v2 (nach Analyse echter Top-Hits, 2026). 174 BPM, a-Moll.
# Struktur (48 Takte ~66s): Intro 1-8 (Rhodes+Pad, kein Drum, Sub-Andeutung) · Build 9-16 (gefilterter
# Break rein, Riser) · Drop1 17-32 (voller Two-Step + Reese/Sub + Hook) · Breakdown 33-40 (Drums raus,
# Pads atmen) · Drop2 41-48 (Break+Bass zurück). Regeln: Musik nach vorn, Two-Step m. Ghost-Snares,
# Sub mono + Reese getrennt (reese_synth.py), Extended-Moll-Chords (Am9-Cmaj7-Em7-Am9).
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480; BAR = TPQ * 4; S = TPQ // 4   # 16tel
BPM = 174
# Rhodes-Voicings (Extended-Moll) + Bass-Grundton (tief) + Sax/Hook-Ton
PROG = [
    ([57, 60, 64, 67, 71], 33, 72),  # Am9
    ([60, 64, 67, 71],     36, 71),  # Cmaj7
    ([64, 67, 71, 74],     40, 74),  # Em7
    ([57, 60, 64, 67, 71], 33, 72),  # Am9
]
NBARS = 48
rhodes, pad, sax = [], [], []
drum_rows = []  # (startSec, typ, vel) für drum_synth.py
reese_rows = []  # (startSec, durSec, midiNote) für reese_synth.py
sub = []          # Mono-Sub via GM (Sinus-nah: program 80 Lead würde zu hell; nutze program 38 tief)

sec_per_tick = 60.0 / BPM / TPQ

def D(tick, typ, vel):
    drum_rows.append((tick * sec_per_tick, typ, vel))
def is_two_step(t0, vel_k):
    for k in (0, 10): D(t0 + k*S, 'kick', vel_k)
    for sn in (4, 12): D(t0 + sn*S, 'snare', 118)
    for g in (7, 11, 15): D(t0 + g*S + 12, 'ghost', 60)
    for h in range(16):
        sw = 14 if h % 2 else 0
        D(t0 + h*S + sw, 'hat', 30 if h % 2 == 0 else 46)
    D(t0 + 14*S, 'ohat', 54)

for b in range(NBARS):
    voic, bs, hook = PROG[b % 4]
    t0 = b * BAR
    INTRO = b < 8
    BUILD = 8 <= b < 16
    DROP1 = 16 <= b < 32
    BREAK = 32 <= b < 40
    DROP2 = 40 <= b < 48

    # --- Rhodes: gehaltene Extended-Chords (Musik nach vorn!), im Drop rhythmischer
    if INTRO or BREAK:
        for p in voic: rhodes.append((t0, BAR - 20, p, 62))
    else:
        # Stabs auf Offbeats + langer Chord Zz1
        for p in voic: rhodes.append((t0, int(TPQ * 0.9), p, 50))
        for beat in range(4):
            st = t0 + beat * TPQ + TPQ // 2
            for p in voic: rhodes.append((st, int(TPQ * 0.35), p, 46))

    # --- Pad-Teppich durchgehend (lush)
    for p in voic[:3]:
        pad.append((t0, BAR - 20, p + 12, 34))

    # --- Sub-Bass (mono, GM tief) ab Build; folgt Grundton, statisch
    if not INTRO:
        vel = 60 if BUILD else 96
        if BREAK: vel = 0
        if vel:
            sub.append((t0, BAR - 30, bs, vel))

    # --- Reese-Layer (echter Synth) im Drop: Grundton + Oktave, atmet via Filter-LFO
    if DROP1 or DROP2:
        reese_rows.append((t0 * sec_per_tick, (BAR - 30) * sec_per_tick, bs + 12))
        reese_rows.append(((t0 + TPQ * 2) * sec_per_tick, (TPQ * 2 - 30) * sec_per_tick, bs + 19))

    # --- Drums
    if BUILD:
        # gefilterter Break-Andeutung: nur Snares + Hats, Roll am Ende
        is_two_step(t0, 60)
        if b == 15:
            for r in range(16):
                D(t0 + r * S, 'snare', 45 + r * 4)  # Snare-Riser-Roll
    elif DROP1 or DROP2:
        is_two_step(t0, 104)
        if (b + 1) % 8 == 0:  # Down-Fill am 8-Bar-Ende
            for r in range(8):
                D(t0 + TPQ * 3 + r * (TPQ // 8), 'snare', 55 + r * 5)

    # --- Sax-Hook (der emotionale Vocal-Chop-Ersatz): im Drop
    if DROP1 or DROP2:
        sax.append((t0, int(TPQ * 1.5), hook, 78))
        sax.append((t0 + TPQ * 2, TPQ, hook + 3, 68))
    elif BUILD and b >= 12:
        sax.append((t0, TPQ, hook, 50))   # Teaser

# Reese-Spec für reese_synth.py schreiben
with open('/tmp/liquid_dnb_reese.txt', 'w') as f:
    for st, du, note in reese_rows:
        f.write(f'{st:.4f} {du:.4f} {note}\n')

tracks = [
    notes_track(rhodes, program=4,  channel=0),   # Electric Piano (Rhodes)
    notes_track(pad,    program=89, channel=1),    # Warm Pad
    notes_track(sub,    program=38, channel=2),    # Synth Bass (Mono-Sub)
    notes_track(sax,    program=66, channel=4),    # Tenor Sax (Hook)
]
with open('/tmp/liquid_dnb_drums.txt','w') as f:
    for st,typ,vel in drum_rows: f.write(f'{st:.4f} {typ} {vel}\n')
write_midi('/tmp/liquid_dnb.mid', tracks, tpq=TPQ, tempo_bpm=BPM)
print('liquid_dnb.mid v2:', NBARS, 'Takte, 174 BPM, Two-Step + Reese-Spec geschrieben')
