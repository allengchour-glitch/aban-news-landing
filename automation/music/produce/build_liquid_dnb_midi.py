#!/usr/bin/env python3
# LuxeStyle Producer — LIQUID DnB v4 VOCAL (Ref: AFTERGLOW Vocal Mix). 174 BPM, a-Moll, WARM, ELEKTRONISCHE Perc (808/Clap/Rim, kein akust. Kit).
# + Choir/Voice-Hook (aah-Vocals), lush Reverb, weicher Groove.
# Struktur (48 Takte ~66s): Intro 1-8 (Rhodes+Pad, kein Drum, Sub-Andeutung) · Build 9-16 (gefilterter
# Break rein, Riser) · Drop1 17-32 (voller Two-Step + Reese/Sub + Hook) · Breakdown 33-40 (Drums raus,
# Pads atmen) · Drop2 41-48 (Break+Bass zurück). Regeln: Musik nach vorn, Two-Step m. Ghost-Snares,
# Sub mono + Reese getrennt (reese_synth.py), Extended-Moll-Chords (Am9-Cmaj7-Em7-Am9).
import sys, os, random
random.seed(174)  # deterministisch
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
rhodes, pad, sax, voice = [], [], [], []
drum_rows = []  # (startSec, typ, vel) für drum_synth.py
reese_rows = []  # (startSec, durSec, midiNote) für reese_synth.py
fx_rows = []      # (startSec, typ, durSec) für fx_synth.py
sub = []          # Mono-Sub via GM (Sinus-nah: program 80 Lead würde zu hell; nutze program 38 tief)

sec_per_tick = 60.0 / BPM / TPQ

def D(tick, typ, vel):
    drum_rows.append((tick * sec_per_tick, typ, vel))
def hum(t): return t + random.randint(-6, 6)          # Micro-Timing (menschlich)
def is_two_step(t0, vel_k):
    # AKZENTE: Kick 1 = Downbeat-Betonung (voll), Kick "3-and" etwas leichter
    D(t0 + 0*S, 'k808', min(127, vel_k + 8))           # Betonung Zz1
    D(t0 + 10*S, 'k808', vel_k - 10)                    # leichter
    # Snare/Clap: Zz2 & Zz4 STARK betont (der Backbeat), Layer für Punch
    for sn in (4, 12):
        D(t0 + sn*S, 'clap', 118)
        D(t0 + sn*S, 'snare', 70)                       # akustischer Snare-Body drunter = Wärme+Betonung
    # Ghost-Rims: DEUTLICH leiser (Kontrast = Groove), leicht geswingt+humanisiert
    for g in (7, 11, 15): D(hum(t0 + g*S + 14), 'rim', 34)
    D(t0 + 6*S, 'perc', 44)
    # Hats: Offbeats betont, Onbeats sehr leise (Dynamik statt flach)
    for h in range(16):
        if h % 2 == 1: D(hum(t0 + h*S + 12), 'hat', 46) # Offbeat = betont
        elif h % 4 == 0: D(hum(t0 + h*S), 'hat', 22)    # dezenter Onbeat-Tick

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
            phrase_end = (b % 4 == 3)  # letzter Takt der 4er-Phrase → Sub pausiert Beat 3+4 (atmet)
            dur = (TPQ * 2 - 30) if phrase_end else (BAR - 30)
            sub.append((t0, dur, bs, vel))

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
                D(t0 + r * S, 'rim', 45 + r * 3)  # Rim-Riser-Roll
    elif DROP1 or DROP2:
        is_two_step(t0, 104)
        if (b + 1) % 8 == 0:  # Down-Fill am 8-Bar-Ende
            for r in range(8):
                D(t0 + TPQ * 3 + r * (TPQ // 8), 'rim', 55 + r * 5)

    # --- Vocal-Hook (Choir-Aahs = der Liquid-Vocal-Charakter) + Sax-Antwort
    if DROP1 or DROP2:
        voice.append((t0, TPQ * 2, hook, 72))              # langes "aah" auf dem Hook-Ton
        voice.append((t0 + TPQ * 2, int(TPQ * 1.5), hook - 2, 62))
        for p in [hook - 12, hook - 8]:                     # Vocal-Harmonie-Layer (Terz)
            voice.append((t0, BAR - 40, p, 34))
        sax.append((t0 + TPQ * 3, TPQ, hook + 3, 60))       # Sax-Antwort am Taktende
    elif BREAK:
        voice.append((t0, BAR - 30, hook, 58))              # Vocal atmet im Breakdown
        for p in [hook - 12, hook - 5]:
            voice.append((t0, BAR - 30, p, 30))
    elif BUILD and b >= 12:
        voice.append((t0, TPQ * 2, hook, 46))               # Vocal-Teaser
        if b == 15:                                          # Stutter-Chop: 1/16 Wdh. mit Pitch-Ramp
            for r in range(16):
                voice.append((t0 + r * S, S - 8, hook + (r // 4), 40 + r * 3))

# DJ-FX: Riser vor Drops, Impact bei Drops, Downsweep ins Breakdown
fx_rows.append((15 * BAR * sec_per_tick, 'revreverb', BAR * sec_per_tick))       # Reverse-Reverb vor Drop1
fx_rows.append((39 * BAR * sec_per_tick, 'revreverb', BAR * sec_per_tick))       # vor Drop2
fx_rows.append((14 * BAR * sec_per_tick, 'riser', 2 * BAR * sec_per_tick))       # Build→Drop1
fx_rows.append((16 * BAR * sec_per_tick, 'impact', BAR * sec_per_tick))          # Drop1-Impact
fx_rows.append((32 * BAR * sec_per_tick, 'downsweep', BAR * sec_per_tick))       # in Breakdown
fx_rows.append((39 * BAR * sec_per_tick, 'riser', BAR * sec_per_tick))           # Breakdown→Drop2
fx_rows.append((40 * BAR * sec_per_tick, 'impact', BAR * sec_per_tick))          # Drop2-Impact
with open('/tmp/liquid_dnb_fx.txt','w') as f:
    for st,typ,du in fx_rows: f.write(f'{st:.4f} {typ} {du:.4f}\n')
# Kick-Times für Sidechain (aus drum_rows, nur Kicks)
with open('/tmp/liquid_dnb_kicks.txt','w') as f:
    for st,typ,vel in drum_rows:
        if typ in ('kick','k808'): f.write(f'{st:.4f}\n')

# Reese-Spec für reese_synth.py schreiben
with open('/tmp/liquid_dnb_reese.txt', 'w') as f:
    for st, du, note in reese_rows:
        f.write(f'{st:.4f} {du:.4f} {note}\n')

tracks = [
    notes_track(rhodes, program=4,  channel=0),   # Electric Piano (Rhodes)
    notes_track(pad,    program=89, channel=1),    # Warm Pad
    notes_track(sub,    program=38, channel=2),    # Synth Bass (Mono-Sub)
    notes_track(sax,    program=66, channel=4),    # Tenor Sax (Antwort)
    notes_track(voice,  program=52, channel=5),    # Choir Aahs (Vocal-Hook)
]
with open('/tmp/liquid_dnb_drums.txt','w') as f:
    for st,typ,vel in drum_rows: f.write(f'{st:.4f} {typ} {vel}\n')
write_midi('/tmp/liquid_dnb.mid', tracks, tpq=TPQ, tempo_bpm=BPM)
print('liquid_dnb.mid v2:', NBARS, 'Takte, 174 BPM, Two-Step + Reese-Spec geschrieben')
