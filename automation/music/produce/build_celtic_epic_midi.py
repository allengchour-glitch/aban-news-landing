#!/usr/bin/env python3
# LuxeStyle Producer — CELTIC EPIC (Betreiber 24.09.2026: «musik verbessern, fairy tail theme anime musik das finde
# ich super musik»). STIL-Vorbild: Anime-Abenteuer-Themes mit keltischem Lead (Tin Whistle/Fiedel/Dudelsack-Bordun)
# über Rock-Drums, verzerrter Gitarre und Orchester. ⚠️ KEINE Melodie, kein Riff, kein Sample aus einem echten
# Stück — die Melodie unten ist NEU komponiert (D-Dorisch, eigene Kontur). Ein nachgebautes Thema wäre ein
# Content-ID-Treffer und sperrt Reels (SKILL.md: 100 % royalty-frei).
#
# Stil-Merkmale (Genre, nicht Werk): Dorisch/Moll, 140–160 BPM, Lead mit Ornamenten (Cuts = kurzer Vorschlag
# einen Ton höher), aufsteigende Läufe in 8teln, Bordun D+A, Power-Chords in 8tel-Chugs, Streicher-Pad, Brass-Stösse
# im B-Teil, Pauken + Orchester-Hit auf Abschnittsanfängen, Bodhrán-artige Perkussion im Intro/Breakdown.
#
# v2 24.09. nach Hör-Kritik (Gemini 7/10: Lead unter Gitarre, Orchester zu leise, Ende abrupt): Lead +16 Vel +
# Piccolo-Oktave, Gitarre −16, Streicher +16, Horn-Gegenmelodie, Akustik-Arpeggio im Breakdown, Schluss 2 Takte.
# Aufbau (148 BPM, Takt = 1.62 s, 36 Takte ≈ 58 s = Reel-Länge):
#   0–3 Intro (Whistle solo über Bordun + Bodhrán) · 4–7 Build (Gitarre/Bass/Streicher, Riser) · 8–15 Thema A (voll)
#   16–23 Thema B (höher, Brass) · 24–27 Breakdown (Fiedel leise, Perkussion) · 28–35 Finale A' (voll + Bordun),
#   Schluss auf D mit Orchester-Hit.
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

random.seed(24092026)
BPM = 148
TPQ = 480
E8 = TPQ // 2            # Achtel
S16 = TPQ // 4           # Sechzehntel
BAR = TPQ * 4
SEC_PER_TICK = 60.0 / BPM / TPQ

# ── Harmonik (Grundton MIDI, Akkordtöne für Pad) ────────────────────────────────────────────────────────────────
CH = {
    'Dm': (38, [62, 65, 69]), 'C': (36, [60, 64, 67]), 'Bb': (34, [58, 62, 65]), 'F': (41, [60, 65, 69]),
    'Gm': (43, [62, 67, 70]), 'A': (45, [61, 64, 69]),
}
PROG_A = ['Dm', 'C', 'Bb', 'C', 'Dm', 'C', 'Bb', 'A']
PROG_B = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'A']

# ── Melodie (Achtel-Dauern je Takt, Summe 8) — NEU komponiert ─────────────────────────────────────────────────
D5, E5, F5, G5, A5, B5, C6, D6, E6 = 74, 76, 77, 79, 81, 83, 84, 86, 88
A4, C5, Cs5, Bb5, Cs6 = 69, 72, 73, 82, 85
MEL_A = [
    [(D5, 3), (A5, 1), (G5, 1), (F5, 1), (E5, 1), (D5, 1)],
    [(E5, 2), (C5, 1), (E5, 1), (G5, 3), (E5, 1)],
    [(F5, 1), (G5, 1), (A5, 2), (D6, 2), (C6, 1), (A5, 1)],
    [(G5, 3), (E5, 1), (C5, 2), (E5, 2)],
    [(D5, 1), (F5, 1), (A5, 1), (D6, 1), (C6, 1), (A5, 1), (G5, 1), (F5, 1)],
    [(E5, 1), (G5, 1), (C6, 2), (B5, 1), (G5, 1), (E5, 2)],
    [(F5, 2), (D5, 1), (F5, 1), (A5, 2), (G5, 1), (F5, 1)],
    [(E5, 2), (Cs5, 1), (E5, 1), (A5, 4)],
]
MEL_B = [
    [(A5, 3), (C6, 1), (A5, 2), (F5, 2)],
    [(G5, 3), (E5, 1), (C6, 4)],
    [(D6, 2), (C6, 1), (A5, 1), (F5, 2), (A5, 2)],
    [(D6, 3), (C6, 1), (Bb5, 2), (A5, 2)],
    [(C6, 2), (A5, 1), (C6, 1), (D6, 2), (C6, 2)],
    [(E6, 3), (D6, 1), (C6, 2), (G5, 2)],
    [(D6, 2), (Bb5, 1), (G5, 1), (Bb5, 2), (D6, 2)],
    [(E6, 2), (Cs6, 2), (A5, 4)],
]
# Schlusstakt des Finales: Auflösung auf D statt auf der Dominante
SCHLUSS = [(F5, 1), (E5, 1), (D5, 6)]
# Skala für Ornament-Vorschläge (eine Stufe höher): D-Dorisch + Leittöne
SKALA = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91]


def stufe_hoch(p):
    for s in SKALA:
        if s > p:
            return s
    return p + 2


def melodie(takte, bar0, vel, ornament=True, oktave=0):
    """Achtel-Figuren → Noten; lange Töne (≥ Viertel) bekommen oft einen Cut (16tel-Vorschlag eine Stufe höher),
    wie auf Whistle/Fiedel üblich. Mikro-Timing ±12 Ticks, Velocity ±6 — sonst klingt GM maschinell."""
    out = []
    for i, figur in enumerate(takte):
        t = (bar0 + i) * BAR
        for p, d in figur:
            p += 12 * oktave
            dur = d * E8
            v = max(30, min(120, vel + random.randint(-6, 6)))
            jit = random.randint(-12, 12) if t > 0 else 0
            if ornament and d >= 2 and random.random() < 0.55:
                g = S16 // 2
                out.append((max(0, t + jit), g, stufe_hoch(p), max(30, v - 18)))
                out.append((max(0, t + jit + g), dur - g - 10, p, v))
            else:
                out.append((max(0, t + jit), dur - 10, p, v))
            t += dur
    return out


lead, fiddle, drone, pad, guitar, bass, brass, timp, hit, harp = ([] for _ in range(10))
piccolo, horn, akustik, cello, dudelsack = [], [], [], [], []   # v2 (Hör-Kritik 24.09.): Lead-Präsenz, Orchester-Gegenmelodie, Breakdown-Textur
drums, fx = [], []           # DSP-Specs (Sekunden)


def sec(tick):
    return round(tick * SEC_PER_TICK, 4)


def akkordtakt(name, bar, *, pad_vel=0, gtr=False, gtr_vel=78, bass_vel=0, brass_vel=0, harp_vel=0):
    root, tones = CH[name]
    t0 = bar * BAR
    if pad_vel:
        for p in tones + [tones[0] + 12]:
            pad.append((t0, BAR - 20, p, pad_vel))
    if gtr:   # Power-Chord (Grundton, Quinte, Oktave) in 8tel-Chugs, Akzent auf 1 und 3
        for k in range(8):
            v = gtr_vel + (10 if k in (0, 4) else 0) + random.randint(-4, 4)
            for p in (root + 12, root + 19, root + 24):
                guitar.append((t0 + k * E8, E8 - 40, p, min(v, 118)))
    if bass_vel:
        for k in range(8):
            bass.append((t0 + k * E8, E8 - 30, root, bass_vel + (8 if k in (0, 4) else 0)))
    if brass_vel:  # Stösse auf 1 und 3-und
        for off, lng in ((0, TPQ), (TPQ * 2 + E8, E8)):
            for p in tones:
                brass.append((t0 + off, lng - 20, p, brass_vel))
    if harp_vel:
        arp = tones + [tones[0] + 12, tones[1] + 12]
        for k, p in enumerate(arp + arp[-2:0:-1]):
            harp.append((t0 + k * E8, TPQ, p, harp_vel))


def rock_drums(bar, *, fill=False, dicht=True):
    t0 = bar * BAR
    for k in range(8):                        # Hi-Hat 8tel, Akzent auf den Zählzeiten
        drums.append((sec(t0 + k * E8), 'hat', 58 if k % 2 == 0 else 42))
    for k in (0, 3, 4, 7) if dicht else (0, 4):   # Kick: 1, 2-und, 3, 4-und (treibend)
        drums.append((sec(t0 + k * E8), 'kick', 118 if k in (0, 4) else 96))
    for k in (2, 6):                           # Snare 2 und 4
        drums.append((sec(t0 + k * E8), 'snare', 112))
    if fill:                                   # 16tel-Wirbel auf Zz 4, crescendo
        for j in range(4):
            drums.append((sec(t0 + 3 * TPQ + j * S16), 'snare', 70 + j * 12))


def bodhran(bar, vel=80):
    t0 = bar * BAR
    for k, v in ((0, vel), (3, vel - 20), (4, vel - 8), (6, vel - 14), (7, vel - 24)):
        drums.append((sec(t0 + k * E8), 'perc', v))
    drums.append((sec(t0), 'kick', vel - 10))


def bordun(bar0, bars, vel):
    drone.append((bar0 * BAR, bars * BAR - 30, 50, vel))   # D3
    drone.append((bar0 * BAR, bars * BAR - 30, 57, vel))   # A3


# ── Intro 0–3: Whistle solo (Thema A Takte 1–4) über Bordun + Bodhrán ─────────────────────────────────────
bordun(0, 4, 46)
lead += melodie(MEL_A[:4], 0, 84)
for b in range(4):
    bodhran(b, 66)
    pad.append((b * BAR, BAR - 20, CH[PROG_A[b]][1][0], 34))

# ── Build 4–7: Gitarre, Bass, Streicher; Riser in den Drop ──────────────────────────────────────────────────
for i, b in enumerate(range(4, 8)):
    akkordtakt(PROG_A[i], b, pad_vel=52 + i * 6, gtr=True, gtr_vel=64 + i * 5, bass_vel=70)
    rock_drums(b, fill=(b == 7), dicht=(b >= 6))
harp_notes = None
fx.append((sec(6 * BAR), 'riser', round(2 * BAR * SEC_PER_TICK, 3)))
for r in range(8):   # Pauken-Wirbel in Takt 7
    timp.append((7 * BAR + TPQ * 2 + r * S16, S16, 45, 60 + r * 6))

# ── Thema A 8–15: voll ───────────────────────────────────────────────────────────────────────────────────────
hit.append((8 * BAR, TPQ, 50, 100)); hit.append((8 * BAR, TPQ, 62, 100))
fx.append((sec(8 * BAR), 'impact', 1.4))
lead += melodie(MEL_A, 8, 112)
piccolo += melodie(MEL_A, 8, 58, ornament=False, oktave=1)
fiddle += melodie(MEL_A, 8, 74, ornament=False, oktave=-1)
for i, b in enumerate(range(8, 16)):
    akkordtakt(PROG_A[i], b, pad_vel=80, gtr=True, gtr_vel=58, bass_vel=88, harp_vel=(40 if i % 2 else 0))
    rock_drums(b, fill=(b == 15))
    timp.append((b * BAR, 160, 38 if i % 4 == 0 else 41, 96 if i % 4 == 0 else 70))

# ── Thema B 16–23: höher, Brass-Stösse ──────────────────────────────────────────────────────────────────────
hit.append((16 * BAR, TPQ, 53, 104)); hit.append((16 * BAR, TPQ, 65, 104))
lead += melodie(MEL_B, 16, 116)
piccolo += melodie(MEL_B, 16, 60, ornament=False, oktave=1)
fiddle += melodie(MEL_B, 16, 82, ornament=False)
for i, b in enumerate(range(16, 24)):
    akkordtakt(PROG_B[i], b, pad_vel=88, gtr=True, gtr_vel=60, bass_vel=92, brass_vel=88)
    rock_drums(b, fill=(b == 23))
    timp.append((b * BAR, 160, 41, 84 if i % 2 == 0 else 66))
fx.append((sec(23 * BAR + TPQ * 2), 'riser', round(2 * TPQ * SEC_PER_TICK, 3)))

# ── Breakdown 24–27: Fiedel leise, Bodhrán, Harfe ────────────────────────────────────────────────────────────
fx.append((sec(24 * BAR), 'downsweep', 1.6))
fiddle += melodie(MEL_A[:4], 24, 70)
for i, b in enumerate(range(24, 28)):
    akkordtakt(PROG_A[i], b, pad_vel=48, bass_vel=0, harp_vel=46)
    bass.append((b * BAR, BAR - 30, CH[PROG_A[i]][0], 66))
    bodhran(b, 70 + i * 6)
for r in range(12):
    timp.append((27 * BAR + TPQ + r * S16, S16, 45, 50 + r * 5))
fx.append((sec(26 * BAR), 'riser', round(2 * BAR * SEC_PER_TICK, 3)))


# ── v2: Horn-Gegenmelodie (halbe Noten, Terz/Quinte der Akkorde) in B und Finale ─────────────────────────────
def horn_linie(prog, bar0, vel):
    for i, name in enumerate(prog):
        _, tones = CH[name]
        t0 = (bar0 + i) * BAR
        horn.append((t0, TPQ * 2 - 20, tones[1] - 12, vel))
        horn.append((t0 + TPQ * 2, TPQ * 2 - 20, tones[2] - 12, vel - 6))
horn_linie(PROG_B, 16, 86)
horn_linie(PROG_A[:7], 28, 90)
# ── v2: Akustikgitarre im Breakdown (8tel-Arpeggio) ────────────────────────────────────────────────────────────
for i, b in enumerate(range(24, 28)):
    root, tones = CH[PROG_A[i]]
    arp = [root + 12, tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0]]
    for k, p in enumerate(arp):
        akustik.append((b * BAR + k * E8, E8 * 2, p, 64 + (8 if k == 0 else 0)))


# ── v4 (Hör-Kritik v3, 8/10): Cello-Gegenstimme im Breakdown, Snare-Wirbel vor dem Finale, Dudelsack verdoppelt
# die ersten vier Finale-Takte eine Oktave tiefer (keltischer Höhepunkt).
for i, b in enumerate(range(24, 28)):
    _, tones = CH[PROG_A[i]]
    cello.append((b * BAR, TPQ * 2 - 20, tones[2] - 24, 78))
    cello.append((b * BAR + TPQ * 2, TPQ * 2 - 20, tones[1] - 24, 72))
for j in range(8):
    drums.append((sec(27 * BAR + TPQ * 2 + j * S16), 'snare', 56 + j * 8))
dudelsack += melodie(MEL_A[:4], 28, 88, ornament=True, oktave=-1)

# ── Finale 28–35: voll + Bordun + Brass, Schluss auf D ───────────────────────────────────────────────────────
hit.append((28 * BAR, TPQ, 50, 110)); hit.append((28 * BAR, TPQ, 62, 110))
fx.append((sec(28 * BAR), 'impact', 1.6))
bordun(28, 8, 70)
lead += melodie(MEL_A[:7] + [SCHLUSS], 28, 118)
piccolo += melodie(MEL_A[:7] + [SCHLUSS], 28, 62, ornament=False, oktave=1)
fiddle += melodie(MEL_A[:7] + [SCHLUSS], 28, 84, ornament=False, oktave=-1)
PROG_F = PROG_A[:7] + ['Dm']
for i, b in enumerate(range(28, 36)):
    letzter = (b == 35)
    akkordtakt(PROG_F[i], b, pad_vel=92, gtr=not letzter, gtr_vel=62, bass_vel=(0 if letzter else 92),
               brass_vel=(0 if letzter else (70 if i % 2 == 0 else 0)), harp_vel=(44 if i % 2 else 0))
    if not letzter:
        rock_drums(b, fill=(b == 34))
        timp.append((b * BAR, 160, 41, 80))
# Schlussakkord: alles auf D, Orchester-Hit, Pauke, Kick+Snare zusammen, dann ausklingen
t_end = 35 * BAR
for p in (38, 50, 57, 62):
    brass.append((t_end, 2 * BAR - 30, p + 12 if p < 50 else p, 100))
    pad.append((t_end, 2 * BAR - 30, p + 24 if p < 50 else p + 12, 84))
    guitar.append((t_end, BAR - 30, p + 12, 96))
bass.append((t_end, 2 * BAR - 30, 38, 96))
lead.append((t_end + BAR, BAR - 30, 86, 96))   # Schluss-Ton D6 über dem gehaltenen Akkord
horn.append((t_end, 2 * BAR - 30, 50, 96))
hit.append((t_end, TPQ, 50, 118)); hit.append((t_end, TPQ, 62, 118))
timp.append((t_end, 400, 38, 118))
drums.append((sec(t_end), 'kick', 124)); drums.append((sec(t_end), 'snare', 120)); drums.append((sec(t_end), 'ohat', 100))

# v3: Melodie-Instrumente als EIGENE Spur (/tmp/celtic_epic_lead.mid) — render.sh mischt sie mit LEAD_GAIN + Präsenz-EQ
# darüber (Hör-Kritik v2: Lead 1–2 dB zu leise gegen Gitarre/Drums; per Velocity allein nicht lösbar).
write_midi('/tmp/celtic_epic_lead.mid', [notes_track(lead, program=78, channel=0), notes_track(fiddle, program=110, channel=1),
           notes_track(piccolo, program=72, channel=11), notes_track(dudelsack, program=109, channel=2)], tpq=TPQ, tempo_bpm=BPM)
tracks = [
    notes_track(drone, program=109, channel=2),   # Bagpipe (Bordun)
    notes_track(pad, program=48, channel=3),      # String Ensemble 1
    notes_track(guitar, program=30, channel=4),   # Distortion Guitar (Power-Chords)
    notes_track(bass, program=34, channel=5),     # Electric Bass (pick)
    notes_track(brass, program=61, channel=6),    # Brass Section
    notes_track(timp, program=47, channel=7),     # Timpani
    notes_track(hit, program=55, channel=8),      # Orchestra Hit
    notes_track(harp, program=46, channel=10),    # Orchestral Harp
    notes_track(horn, program=60, channel=12),    # French Horn (Gegenmelodie)
    notes_track(akustik, program=25, channel=13), # Steel Guitar (Breakdown)
    notes_track(cello, program=42, channel=14),   # Cello (Breakdown-Gegenstimme)
]
write_midi('/tmp/celtic_epic.mid', tracks, tpq=TPQ, tempo_bpm=BPM)
with open('/tmp/celtic_epic_drums.txt', 'w') as f:
    for s, typ, v in sorted(drums):
        f.write(f"{s} {typ} {v}\n")
with open('/tmp/celtic_epic_fx.txt', 'w') as f:
    for s, typ, d in fx:
        f.write(f"{s} {typ} {d}\n")
print(f'celtic_epic.mid: 36 Takte, {BPM} BPM, D-Dorisch, {len(lead)} Lead-Noten, {len(drums)} Drum-Schläge')
