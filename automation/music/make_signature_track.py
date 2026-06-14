#!/usr/bin/env python3
# LuxeStyle Signature-Track — eigener Lofi/Chill-Loop (Piano+Bass+Beat), GM-MIDI → fluidsynth
import struct

TPQ = 480
BPM = 104
BAR = TPQ * 4
def vlq(n):
    b = [n & 0x7F]; n >>= 7
    while n: b.insert(0, (n & 0x7F) | 0x80); n >>= 7
    return bytes(b)

ev = []  # (abs_tick, bytes)
def note(ch, pitch, start, dur, vel):
    ev.append((start, bytes([0x90 | ch, pitch, vel])))
    ev.append((start + dur, bytes([0x80 | ch, pitch, 0])))

# vi-IV-I-V in C: Am, F, C, G  (warm, gefällig)  — als 7-Akkorde fürs „premium"
chords = [[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,67]]  # Am7,Fmaj7,Cmaj7,G7
bass =   [33,29,36,31]
for i in range(4):
    t0 = i * BAR
    # Piano-Akkord (weich, gehalten) ch0
    for p in chords[i]:
        note(0, p, t0, BAR - 40, 62)
    # sanftes Arpeggio oben drauf
    for k, off in enumerate([0, BAR//2, BAR//2 + BAR//4]):
        note(0, chords[i][(k+1) % 4] + 12, t0 + off, BAR//4 - 30, 50)
    # Bass ch1 (program 33 fingered) — Wurzel + Oktav-Pulse
    note(1, bass[i], t0, BAR//2 - 20, 80)
    note(1, bass[i], t0 + BAR//2, BAR//2 - 20, 74)
    # Drums ch9: Kick 1&3, Snare 2&4, Hat auf 8teln
    for beat in range(4):
        tb = t0 + beat * TPQ
        if beat in (0, 2): note(9, 36, tb, 60, 100)      # kick
        if beat in (1, 3): note(9, 38, tb, 60, 78)       # snare
        note(9, 42, tb, 30, 50)                          # hat
        note(9, 42, tb + TPQ//2, 30, 42)                 # hat off-beat

# Track bauen
trk = bytearray()
trk += vlq(0) + bytes([0xFF, 0x51, 0x03]) + struct.pack('>I', int(60_000_000 / BPM))[1:]  # tempo
trk += vlq(0) + bytes([0xC0, 0]); trk += vlq(0) + bytes([0xC1, 33])  # programs: piano, bass
ev.sort(key=lambda x: x[0])
last = 0
for tick, data in ev:
    trk += vlq(tick - last) + data; last = tick
trk += vlq(0) + bytes([0xFF, 0x2F, 0x00])  # end of track

mid = b'MThd' + struct.pack('>IHHH', 6, 0, 1, TPQ) + b'MTrk' + struct.pack('>I', len(trk)) + bytes(trk)
open('/tmp/luxe-signature.mid', 'wb').write(mid)
print('MIDI geschrieben:', len(mid), 'bytes ·', f'{4*BAR/TPQ*60/BPM:.1f}s loop')
