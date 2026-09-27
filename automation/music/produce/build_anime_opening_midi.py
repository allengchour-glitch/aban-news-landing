#!/usr/bin/env python3
# LuxeStyle Producer — ANIME OPENING (27.09.2026, Betreiber «vielleicht kannst du musik noch besser machen»; Richtung aus
# dem einzigen Lob: «fairy tail theme anime musik das finde ich super» → luxe-celtic-epic). STIL-Vorbild: J-Rock-Anime-
# Openings (hell, heroisch, schnell). ⚠️ KEINE Melodie, kein Riff, kein Sample aus einem echten Stück — die Melodie
# unten ist NEU komponiert (E-Dur, eigene Kontur). Content-ID sperrt nachgebaute Themen (SKILL.md: 100 % royalty-frei).
#
# Stil-Merkmale (Genre, nicht Werk): Dur, 170–180 BPM, «Royal Road»-Folge IV–V–iii–vi im Refrain, Klavier-8tel-Arpeggio,
# Power-Chords, Streicher + Brass-Stösse, Snare-8tel→16tel-Steigerung vor dem Refrain, Orchester-Hit auf Einsen.
#
# REEL-REGEL (gemessen 27.09.: TikTok Ø 1,8 s Wiedergabe von 11 s): KEIN Intro. Takt 0 = Refrain-Hook mit Hit, Kick
# und voller Band — egal wo der Reel-Motor einsteigt (einstiege.py sucht die energiereichsten 11-s-Fenster), die
# erste Sekunde ist nie leer.
# Aufbau (176 BPM, Takt = 1.364 s, 42 Takte ≈ 57 s):
#   0–3 Cold Open (Refrain-Hook, voll) · 4–7 Strophe (Klavier, gedämpfte Gitarre) · 8–11 Pre-Chorus (Build, Snare-Steigerung)
#   12–19 Refrain (voll, Brass) · 20–23 Bridge (Klavier + Streicher, halbe Zeit) · 24–39 zwei Final-Refrains (+ Piccolo-Oktave, 16tel-Hats)
#   · 40–41 Schluss auf E mit Orchester-Hit.
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
from smf import write_midi, notes_track

random.seed(27092026)
BPM = 176
TPQ = 480
E8 = TPQ // 2
S16 = TPQ // 4
BAR = TPQ * 4
SEC_PER_TICK = 60.0 / BPM / TPQ

# ── Harmonik E-Dur (Grundton MIDI, Akkordtöne) ─────────────────────────────────────────────────────────────────
CH = {
    'E': (40, [64, 68, 71]), 'A': (45, [64, 69, 73]), 'B': (47, [63, 66, 71]), 'C#m': (49, [64, 68, 73]),
    'G#m': (44, [63, 68, 71]), 'F#m': (42, [66, 69, 73]),
}
PROG_REF = ['A', 'B', 'G#m', 'C#m', 'A', 'B', 'E', 'E']       # IV–V–iii–vi, dann IV–V–I
PROG_STR = ['C#m', 'A', 'E', 'B']
PROG_PRE = ['A', 'B', 'C#m', 'B']
PROG_BRI = ['F#m', 'A', 'C#m', 'B']

# ── Melodie (Achtel-Dauern je Takt, Summe 8) — NEU komponiert ─────────────────────────────────────────────────
E4, Fs4, Gs4, A4, B4 = 64, 66, 68, 69, 71
Cs5, Ds5, E5, Fs5, Gs5, A5, B5, Cs6, Ds6, E6 = 73, 75, 76, 78, 80, 81, 83, 85, 87, 88
REF = [
    [(Cs5, 2), (E5, 2), (Fs5, 3), (E5, 1)],
    [(Ds5, 2), (E5, 1), (Fs5, 1), (Gs5, 4)],
    [(B5, 3), (Gs5, 1), (Fs5, 2), (E5, 2)],
    [(E5, 3), (Gs5, 1), (Cs6, 4)],
    [(Cs6, 2), (B5, 1), (A5, 1), (B5, 2), (Cs6, 2)],
    [(B5, 3), (A5, 1), (Gs5, 2), (Fs5, 2)],
    [(Gs5, 2), (Fs5, 1), (E5, 1), (Fs5, 2), (Gs5, 2)],
    [(E5, 6), (B4, 1), (Cs5, 1)],
]
STR = [
    [(Gs4, 1), (Gs4, 1), (B4, 1), (Cs5, 2), (B4, 1), (Gs4, 2)],
    [(A4, 1), (A4, 1), (Cs5, 1), (E5, 2), (Cs5, 1), (A4, 2)],
    [(B4, 2), (Gs4, 1), (E4, 1), (Gs4, 2), (B4, 2)],
    [(Ds5, 3), (Cs5, 1), (B4, 4)],
]
PRE = [
    [(A4, 2), (B4, 2), (Cs5, 2), (E5, 2)],
    [(Ds5, 2), (E5, 2), (Fs5, 2), (Ds5, 2)],
    [(E5, 2), (Fs5, 2), (Gs5, 2), (B5, 2)],
    [(A5, 2), (Gs5, 2), (Fs5, 4)],
]
SCHLUSS = [(Gs5, 2), (Fs5, 2), (E5, 4)]


def melodie(takte, bar0, vel, oktave=0):
    """Achtel-Figuren → Noten; Mikro-Timing ±10 Ticks, Velocity ±6 (sonst klingt GM maschinell)."""
    out = []
    for i, figur in enumerate(takte):
        t = (bar0 + i) * BAR
        for p, d in figur:
            v = max(30, min(122, vel + random.randint(-6, 6)))
            jit = random.randint(-10, 10) if t > 0 else 0
            out.append((max(0, t + jit), d * E8 - 12, p + 12 * oktave, v))
            t += d * E8
    return out


lead, violin, piccolo, pad, guitar, bass, brass, timp, hit, piano, horn = ([] for _ in range(11))
drums, fx = [], []


def sec(tick):
    return round(tick * SEC_PER_TICK, 4)


def akkordtakt(name, bar, *, pad_vel=0, gtr_vel=0, gedaempft=False, bass_vel=0, brass_vel=0, piano_vel=0):
    root, tones = CH[name]
    t0 = bar * BAR
    if pad_vel:
        for p in tones + [tones[0] + 12]:
            pad.append((t0, BAR - 20, p, pad_vel))
    if gtr_vel:   # Power-Chords 8tel; gedämpft = kurz (Strophe)
        for k in range(8):
            v = gtr_vel + (10 if k in (0, 4) else 0) + random.randint(-4, 4)
            lng = E8 // 2 if gedaempft else E8 - 30
            for p in (root + 12, root + 19, root + 24):
                guitar.append((t0 + k * E8, lng, p, min(v, 118)))
    if bass_vel:
        for k in range(8):
            bass.append((t0 + k * E8, E8 - 30, root if root >= 40 else root + 12, bass_vel + (8 if k in (0, 4) else 0)))
    if brass_vel:  # Stösse auf 1 und 2-und (Anime-Typisch: synkopiert)
        for off, lng in ((0, E8 + TPQ // 2), (TPQ + E8, E8)):
            for p in tones:
                brass.append((t0 + off, lng - 20, p, brass_vel))
    if piano_vel:  # 8tel-Arpeggio auf-ab, Grundton oben drauf
        arp = [tones[0], tones[1], tones[2], tones[0] + 12, tones[1] + 12, tones[0] + 12, tones[2], tones[1]]
        for k, p in enumerate(arp):
            piano.append((t0 + k * E8, E8 * 2, p, piano_vel + (10 if k == 0 else 0) + random.randint(-4, 4)))


def rock(bar, *, dicht=True, fill=False, sechzehntel=False):
    t0 = bar * BAR
    teil = 16 if sechzehntel else 8
    schritt = BAR // teil
    for k in range(teil):
        drums.append((sec(t0 + k * schritt), 'hat', 48 if k % (teil // 4) == 0 else 30))   # v2: Hats −12 (Kritik: zu scharf)
    for k in ((0, 3, 4, 7) if dicht else (0, 4)):
        drums.append((sec(t0 + k * E8), 'kick', 120 if k in (0, 4) else 98))
    for k in (2, 6):
        drums.append((sec(t0 + k * E8), 'snare', 114))
    if fill:
        for j in range(4):
            drums.append((sec(t0 + 3 * TPQ + j * S16), 'snare', 72 + j * 12))


def hit_auf(bar, vel=108):
    for p in (52, 64):
        hit.append((bar * BAR, TPQ, p, vel))
    drums.append((sec(bar * BAR), 'ohat', 96))


# ── Cold Open 0–3: Refrain-Hook voll, Hit auf der ersten Eins ──────────────────────────────────────────────
hit_auf(0, 116)
fx.append((0.0, 'impact', 1.2))
lead += melodie(REF[:4], 0, 112)
violin += melodie(REF[:4], 0, 72, oktave=-1)
for i, b in enumerate(range(0, 4)):
    akkordtakt(PROG_REF[i], b, pad_vel=64, gtr_vel=64, bass_vel=100, brass_vel=(84 if i % 2 == 0 else 0), piano_vel=52)
    rock(b, fill=(b == 3))
    timp.append((b * BAR, 160, 40, 92 if i == 0 else 70))

# ── Strophe 4–7: Klavier vorn, gedämpfte Gitarre, Kick/Snare einfach ─────────────────────────────────────────
lead += melodie(STR, 4, 96)
for i, b in enumerate(range(4, 8)):
    akkordtakt(PROG_STR[i], b, pad_vel=46, gtr_vel=52, gedaempft=True, bass_vel=78, piano_vel=64)
    rock(b, dicht=False)

# ── Pre-Chorus 8–11: Build, Snare 8tel → 16tel, Riser in den Refrain ─────────────────────────────────────────
lead += melodie(PRE, 8, 104)
violin += melodie(PRE, 8, 70, oktave=-1)
for i, b in enumerate(range(8, 12)):
    akkordtakt(PROG_PRE[i], b, pad_vel=58 + i * 8, gtr_vel=56 + i * 4, bass_vel=84, piano_vel=58)
    t0 = b * BAR
    teil = 8 if i < 2 else 16
    for k in range(teil):
        drums.append((sec(t0 + k * (BAR // teil)), 'snare', 48 + i * 12 + k * (2 if teil == 16 else 3)))
    drums.append((sec(t0), 'kick', 110))
    drums.append((sec(t0 + 2 * TPQ), 'kick', 100))
fx.append((sec(10 * BAR), 'riser', round(2 * BAR * SEC_PER_TICK, 3)))
for r in range(8):
    timp.append((11 * BAR + TPQ * 2 + r * S16, S16, 40, 60 + r * 7))


# ── Refrain 12–19 / Final-Refrain 24–31 ─────────────────────────────────────────────────────────────────────
def refrain(bar0, vel, final=False, schluss=False):
    hit_auf(bar0, 118 if final else 110)
    fx.append((sec(bar0 * BAR), 'impact', 1.4))
    takte = REF[:7] + [SCHLUSS] if schluss else REF
    global lead, violin, piccolo
    lead += melodie(takte, bar0, vel)
    violin += melodie(takte, bar0, 82, oktave=-1)
    if final:
        piccolo += melodie(takte, bar0, 60, oktave=1)
    for i in range(8):
        b = bar0 + i
        akkordtakt(PROG_REF[i], b, pad_vel=74, gtr_vel=66, bass_vel=104, brass_vel=(88 if final else 78), piano_vel=50)
        rock(b, fill=(i == 7 and not schluss), sechzehntel=final)
        timp.append((b * BAR, 160, 40 if i % 4 == 0 else 45, 96 if i % 4 == 0 else 72))
        _, tones = CH[PROG_REF[i]]     # Horn-Gegenstimme (halbe Noten)
        horn.append((b * BAR, TPQ * 2 - 20, tones[1] - 12, 82))
        horn.append((b * BAR + TPQ * 2, TPQ * 2 - 20, tones[2] - 12, 76))


refrain(12, 116)

# ── Bridge 20–23: Klavier + Streicher, halbe Zeit, Aufbau zum Finale ───────────────────────────────────────────
fx.append((sec(20 * BAR), 'downsweep', 1.4))
violin += melodie(REF[4:8], 20, 76)
for i, b in enumerate(range(20, 24)):
    akkordtakt(PROG_BRI[i], b, pad_vel=60, bass_vel=0, piano_vel=70)
    bass.append((b * BAR, BAR - 30, CH[PROG_BRI[i]][0] if CH[PROG_BRI[i]][0] >= 40 else CH[PROG_BRI[i]][0] + 12, 70))
    drums.append((sec(b * BAR), 'kick', 100))
    drums.append((sec(b * BAR + 2 * TPQ), 'snare', 92))
for j in range(16):
    drums.append((sec(23 * BAR + j * S16), 'snare', 50 + j * 4))
fx.append((sec(22 * BAR), 'riser', round(2 * BAR * SEC_PER_TICK, 3)))

refrain(24, 120, final=True)
refrain(32, 120, final=True, schluss=True)   # zweiter Finaldurchlauf endet auf E (Takte 32–39)

# ── Schluss 40–41: alles auf E, Hit, ausklingen ───────────────────────────────────────────────────────────────
t_end = 40 * BAR
for p in (40, 52, 59, 64):
    brass.append((t_end, 2 * BAR - 30, p + 12 if p < 52 else p, 104))
    pad.append((t_end, 2 * BAR - 30, p + 24 if p < 52 else p + 12, 86))
    guitar.append((t_end, BAR - 30, p + 12, 96))
bass.append((t_end, 2 * BAR - 30, 40, 98))
lead.append((t_end, 2 * BAR - 30, E6, 104))
hit_auf(40, 122)
timp.append((t_end, 400, 40, 120))
drums.append((sec(t_end), 'kick', 124)); drums.append((sec(t_end), 'snare', 120))

# v2 (27.09., Gemini 6/10 «MIDI-haft, Lead zu leise, Hats scharf, Streicher aufdringlich, wenig Punch»): Hats −12 Vel,
# Streicher −18..−24 Vel, Gitarre +4, Lead-Schicht Synth-Brass (62) unter dem Saw-Lead; render.sh: Präsenz-/Härte-EQ,
# Stereobreite, LEAD_GAIN 1.9. v3 (Gemini v2 7–8/10 «Drums dünn, Bass schwach, Lead dominant»): Drums 0.85, Bass +10 Vel + 4 dB
# bei 75 Hz, Streicher +8, LEAD_GAIN 1.6. Render: LEAD_GAIN=1.6 MIX_DRUMS=0.85 MIX_FX=0.3 bash render.sh anime_opening
# Melodie als EIGENE Spur (render.sh mischt mit LEAD_GAIN + Präsenz-EQ): Saw-Lead + Violine + Piccolo
write_midi('/tmp/anime_opening_lead.mid', [notes_track(lead, program=81, channel=0), notes_track(violin, program=40, channel=1),
           notes_track(piccolo, program=72, channel=2), notes_track([(t, d, p, max(30, v - 26)) for t, d, p, v in lead], program=62, channel=12)], tpq=TPQ, tempo_bpm=BPM)
tracks = [
    notes_track(pad, program=48, channel=3),      # String Ensemble 1
    notes_track(guitar, program=30, channel=4),   # Distortion Guitar
    notes_track(bass, program=34, channel=5),     # Electric Bass (pick)
    notes_track(brass, program=61, channel=6),    # Brass Section
    notes_track(timp, program=47, channel=7),     # Timpani
    notes_track(hit, program=55, channel=8),      # Orchestra Hit
    notes_track(piano, program=0, channel=10),    # Acoustic Grand Piano
    notes_track(horn, program=60, channel=11),    # French Horn
]
write_midi('/tmp/anime_opening.mid', tracks, tpq=TPQ, tempo_bpm=BPM)
with open('/tmp/anime_opening_drums.txt', 'w') as f:
    for s, typ, v in sorted(drums):
        f.write(f"{s} {typ} {v}\n")
with open('/tmp/anime_opening_fx.txt', 'w') as f:
    for s, typ, d in fx:
        f.write(f"{s} {typ} {d}\n")
print(f'anime_opening.mid: 42 Takte, {BPM} BPM, E-Dur, {len(lead)} Lead-Noten, {len(drums)} Drum-Schläge')
