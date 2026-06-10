#!/usr/bin/env python3
"""LuxeStyle Producer — schreibt /tmp/hype_pro.mid (GM-MIDI für FluidSynth).
Echter Producer-Aufbau: half-time Intro (2 Takte) → Drop (6 Takte) bei 150 BPM, c-Moll.
Kanäle: 9=GM-Drums, 1=808-Sub (mit Pitch-Bend-Glide), 0=Vibraphon-Lead, 2=warmes Pad.
Render danach mit FluidSynth (FluidR3_GM.sf2) + automation/music/produce/hype_finish.py.
Reproduzierbar: kein pip nötig, eigener SMF-Writer (smf.py)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

TPQ = 480
BAR = TPQ * 4            # 4/4
def b(bar, beat=0.0): return int(bar * BAR + beat * TPQ)   # tick at bar/beat

# ---------- DRUMS (channel 9) ----------
K, SN, CLAP, HH, OH = 36, 38, 39, 42, 46
drum = []
def hit(bar, beat, p, v): drum.append((b(bar, beat), TPQ // 4, p, v))

TOTAL = 8
for bar in range(TOTAL):
    drop = bar >= 2
    # KICK half-time (beat 1 + 3.5), full pattern adds beat 4 in the drop
    hit(bar, 0.0, K, 118)
    hit(bar, 2.5, K, 105)
    if drop and bar % 2 == 1: hit(bar, 3.5, K, 92)
    # SNARE/CLAP backbeat
    hit(bar, 1.0, SN if bar % 2 == 0 else CLAP, 110)
    hit(bar, 3.0, SN if bar % 2 == 0 else CLAP, 108)
    # HI-HATS — 8ths in intro, 16ths + rolls in the drop
    subdiv = 16 if drop else 8
    for i in range(subdiv):
        beat = i * (4.0 / subdiv)
        v = 86 if (i % (subdiv // 4) == 0) else 60
        hit(bar, beat, HH, v)
    if drop and bar % 2 == 1:                 # 32nd roll into the backbeat
        for k in range(4): hit(bar, 3.0 + k * 0.125, HH, 55 + k * 6)
    if bar % 4 == 3:                          # open-hat accent end of phrase
        hit(bar, 3.5, OH, 80)

# ---------- 808 SUB-BASS (channel 1) with portamento glide ----------
# Cmin bassline degrees (MIDI pitches, ~C2): C2 Bb1 Ab1 G1
BASS = [36, 34, 32, 31]
bass_notes = []
for bar in range(2, TOTAL):                   # bass enters at the drop
    root = BASS[(bar - 2) % len(BASS)]
    bass_notes.append((b(bar, 0.0), int(TPQ * 2.4), root, 115))      # long held sub
    bass_notes.append((b(bar, 2.5), int(TPQ * 1.2), root + 12, 95))  # octave pop

# ---------- VIBRAPHONE LEAD (channel 0) ----------
# dark c-minor motif over the drop
MEL = [72, 75, 79, 75, 77, 75, 72, 70]
mel_notes = []
for bar in range(2, TOTAL):
    for i, p in enumerate(MEL):
        mel_notes.append((b(bar, i * 0.5), int(TPQ * 0.45), p, 70 + (i % 3) * 8))

# ---------- WARM PAD (channel 2) ----------
PAD = [[48, 51, 55], [46, 50, 53], [44, 48, 51], [43, 46, 50]]
pad_notes = []
for bar in range(2, TOTAL):
    chord = PAD[(bar - 2) % len(PAD)]
    for p in chord:
        pad_notes.append((b(bar, 0.0), int(TPQ * 3.8), p, 52))

# ---------- assemble tracks ----------
drums = []
for st, du, p, v in drum:
    drums.append((st, 0x99, p, v)); drums.append((st + du, 0x89, p, 0))

bass = notes_track(bass_notes, program=38, channel=1)   # 38 = Synth Bass 1
# pitch-bend glide: set bend range 12 semis (RPN) then small slide into each bass note
bass = [(0, 0xB1, 101, 0), (0, 0xB1, 100, 0), (0, 0xB1, 6, 12), (0, 0xB1, 100, 127)] + bass
for st, du, p, v in bass_notes:
    for k in range(6):                                  # ramp bend −2 semis → 0 over 6 steps
        val = int(8192 + (k / 6.0 - 1) * (8192 / 6))    # from ~−2st to 0
        val = max(0, min(16383, val))
        bass.append((max(0, st - 60) + k * 10, 0xE1, val & 0x7f, (val >> 7) & 0x7f))
    bass.append((st, 0xE1, 0x00, 0x40))                 # reset to center at note start

mel = notes_track(mel_notes, program=11, channel=0)     # 11 = Vibraphone
pad = notes_track(pad_notes, program=89, channel=2)     # 89 = Warm Pad

write_midi('/tmp/hype_pro.mid', [drums, bass, mel, pad], tpq=TPQ, tempo_bpm=150)
print('MIDI OK /tmp/hype_pro.mid  bars=%d  bpm=150  drop@bar2' % TOTAL)
