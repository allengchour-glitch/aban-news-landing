#!/usr/bin/env python3
# LuxeStyle Producer — DnB DRIVE (27.09.2026, Betreiber «drum and base? mache orginale musik besser»). Dancefloor-Drum-
# and-Bass statt Liquid: harter Kick+Snare-Two-Step, rollende 16tel-Hats, Reese-Bass, Synth-Hook. ⚠️ Hook NEU komponiert
# (Fis-Moll, eigene Kontur) — kein Riff/Sample eines echten Stücks (Content-ID, SKILL.md).
#
# REEL-REGEL (TikTok Ø 1,8 s Wiedergabe von 11 s): KEIN Intro — Takt 0 ist der Drop (Impact, Kick, Reese, Hook).
# Aufbau (174 BPM, Takt = 1.379 s, 34 Takte ≈ 47 s):
#   0–7 Drop A (Hook) · 8–11 Mini-Breakdown (Pad + Hook gefiltert, Snare-Roll, Riser) · 12–27 Drop B (Hook + Gegenstimme,
#   Hat-Variation) · 28–31 Drop A' · 32–33 Schluss (Impact, Downsweep).
# Render: MIX_DRUMS=1.1 SC_TIEFE=0.65 LEAD_GAIN=1.3 bash render.sh dnb_drive  (v2)
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

random.seed(1742709)
BPM = 174
TPQ = 480
S = TPQ // 4
E8 = TPQ // 2
BAR = TPQ * 4
SPT = 60.0 / BPM / TPQ

# i–VI–III–VII in Fis-Moll: F#m – D – A – E (Grundton für Reese/Sub, Pad-Töne)
PROG = [(42, [66, 69, 73]), (38, [62, 66, 69]), (45, [64, 69, 73]), (40, [64, 68, 71])]

# Hook: 16tel-Raster (Dauer in 16teln, Summe 16 je Takt) — NEU komponiert, synkopiert
Fs5, A5, B5, Cs6, D6, E6, Fs6 = 78, 81, 83, 85, 86, 88, 90
Gs5, E5, Cs5 = 80, 76, 73
HOOK = [
    [(Cs6, 3), (Cs6, 1), (B5, 2), (A5, 2), (B5, 3), (Cs6, 5)],
    [(D6, 3), (Cs6, 1), (A5, 2), (Fs5, 2), (A5, 4), (B5, 4)],
    [(Cs6, 3), (E6, 3), (Cs6, 2), (A5, 2), (B5, 2), (A5, 4)],
    [(Gs5, 3), (A5, 1), (B5, 2), (Gs5, 2), (E5, 8)],
]
GEGEN = [  # Gegenstimme Drop B (tiefer, ruhiger)
    [(A5 - 12, 8), (Gs5 - 12, 8)], [(Fs5 - 12, 8), (A5 - 12, 8)], [(E5 - 12, 8), (Cs5 - 12, 8)], [(E5 - 12, 16)],
]

lead, gegen, pad, stab = [], [], [], []
drums, reese, fx, kicks = [], [], [], []


def sec(t):
    return round(t * SPT, 4)


def D(t, typ, v):
    drums.append((sec(t), typ, int(max(1, min(127, v)))))


def hum(t):
    return t + random.randint(-5, 5)


def spiele(takte, bar0, vel, liste, okt=0):
    for i, fig in enumerate(takte):
        t = (bar0 + i) * BAR
        for p, d in fig:
            liste.append((max(0, hum(t)), d * S - 10, p + 12 * okt, max(30, min(122, vel + random.randint(-6, 6)))))
            t += d * S


def drop_takt(b, vel=112, rolle=True, fill=False):
    t0 = b * BAR
    # Two-Step: Kick 1 + «3-und», Snare 2 + 4 (hart), Ghost-Snares leise
    for k, v in ((0, vel + 8), (10, vel - 8)):
        D(t0 + k * S, 'kick', v); D(t0 + k * S, 'k808', v - 20); kicks.append(sec(t0 + k * S))
    for sn in (4, 12):
        D(t0 + sn * S, 'snare', 120); D(t0 + sn * S, 'clap', 84)
    for g in (7, 14):
        D(hum(t0 + g * S), 'snare', 36)
    if rolle:   # rollende 16tel-Hats mit Betonungskurve (nicht maschinell gleich)
        for h in range(16):
            D(hum(t0 + h * S + (10 if h % 2 else 0)), 'hat', (44 if h % 4 == 2 else 30 if h % 2 else 22) + random.randint(-5, 5))
    D(t0 + 14 * S, 'ohat', 50)
    if fill:
        for r in range(8):
            D(t0 + TPQ * 3 + r * (TPQ // 8), 'snare', 60 + r * 7)


def harmonie(b, pad_vel=46, stab_vel=0, reese_an=True):
    root, tones = PROG[b % 4]
    t0 = b * BAR
    for p in tones:
        pad.append((t0, BAR - 20, p, pad_vel))
    if stab_vel:   # kurze Synth-Stabs auf 1 und 2-und (Energie ohne Matsch)
        for off in (0, 6 * S):
            for p in tones:
                stab.append((t0 + off, S * 2, p + 12, stab_vel))
    if reese_an:   # Reese: Grundton, Rhythmus 1 (lang) + «3-und» (kurz) — folgt dem Kick
        reese.append((sec(t0), round(9 * S * SPT, 4), root))
        reese.append((sec(t0 + 10 * S), round(6 * S * SPT, 4), root + (12 if b % 2 else 0)))


# ── Drop A 0–7 ───────────────────────────────────────────────────────────────────────────────────────────────
fx.append((0.0, 'impact', 1.3))
for b in range(8):
    drop_takt(b, fill=(b == 7))
    harmonie(b, stab_vel=70)
spiele(HOOK + HOOK, 0, 108, lead)

# ── Mini-Breakdown 8–11 ─────────────────────────────────────────────────────────────────────────────────────
fx.append((sec(8 * BAR), 'downsweep', 1.2))
for b in range(8, 12):
    harmonie(b, pad_vel=64, reese_an=False)
    D(b * BAR, 'kick', 70)
spiele(HOOK, 8, 70, lead)
for r in range(16):
    D(11 * BAR + r * S, 'snare', 40 + r * 5)
fx.append((sec(10 * BAR), 'riser', round(2 * BAR * SPT, 3)))
fx.append((sec(11 * BAR), 'revreverb', round(BAR * SPT, 3)))

# ── Drop B 12–27 ────────────────────────────────────────────────────────────────────────────────────────────
fx.append((sec(12 * BAR), 'impact', 1.4))
for b in range(12, 28):
    drop_takt(b, vel=116, fill=((b + 1) % 8 == 0))
    harmonie(b, stab_vel=76)
spiele(HOOK * 4, 12, 112, lead)
spiele(GEGEN * 4, 12, 70, gegen)

# ── Drop A' 28–31 + Schluss 32–33 ───────────────────────────────────────────────────────────────────────────
for b in range(28, 32):
    drop_takt(b, fill=(b == 31))
    harmonie(b, stab_vel=72)
spiele(HOOK, 28, 110, lead)
t_end = 32 * BAR
fx.append((sec(t_end), 'impact', 1.6))
fx.append((sec(t_end + TPQ), 'downsweep', 1.6))
D(t_end, 'kick', 124); D(t_end, 'snare', 120); D(t_end, 'ohat', 90); kicks.append(sec(t_end))
reese.append((sec(t_end), round(BAR * SPT, 4), 42))
for p in (66, 69, 73, 78):
    pad.append((t_end, 2 * BAR - 30, p, 70))
lead.append((t_end, BAR, Fs6, 100))

# Lead als eigene Spur (render.sh: Präsenz-EQ + LEAD_GAIN): Saw-Lead (81) + Square (80) eine Oktave tiefer, Gegenstimme Brass-Synth
write_midi('/tmp/dnb_drive_lead.mid', [notes_track(lead, program=81, channel=0),
           notes_track([(t, d, p - 12, max(30, v - 30)) for t, d, p, v in lead], program=80, channel=1),
           notes_track(gegen, program=62, channel=2)], tpq=TPQ, tempo_bpm=BPM)
write_midi('/tmp/dnb_drive.mid', [notes_track(pad, program=89, channel=3),     # Pad 2 (warm)
                                  notes_track(stab, program=90, channel=4)],   # Pad 3 (polysynth) als Stab
           tpq=TPQ, tempo_bpm=BPM)
with open('/tmp/dnb_drive_drums.txt', 'w') as f:
    for s_, typ, v in sorted(drums):
        f.write(f"{s_} {typ} {v}\n")
with open('/tmp/dnb_drive_reese.txt', 'w') as f:
    for s_, d, n in reese:
        f.write(f"{s_} {d} {n}\n")
with open('/tmp/dnb_drive_fx.txt', 'w') as f:
    for s_, typ, d in fx:
        f.write(f"{s_} {typ} {d}\n")
with open('/tmp/dnb_drive_kicks.txt', 'w') as f:
    for k in sorted(kicks):
        f.write(f"{k:.4f}\n")
print(f'dnb_drive.mid: 34 Takte, {BPM} BPM, Fis-Moll, {len(lead)} Lead-Noten, {len(drums)} Drum-Schläge, {len(reese)} Reese')
