#!/usr/bin/env python3
# LuxeStyle — Trend-Tracks v2: mit echten HOOK-MELODIEN (GM-MIDI -> fluidsynth).
# Fokus: HYPE (catchy Lead) + PHONK (gepitchte Cowbell/Agogo-Melodie). + House.
import struct
TPQ=480; S=TPQ//4  # 16tel
def vlq(n):
    b=[n&0x7F]; n>>=7
    while n: b.insert(0,(n&0x7F)|0x80); n>>=7
    return bytes(b)

def write(name,bpm,events,progs):
    # events: list of (ch,pitch,start_tick,dur_tick,vel)
    trk=bytearray()
    trk+=vlq(0)+bytes([0xFF,0x51,0x03])+struct.pack('>I',int(60_000_000/bpm))[1:]
    for ch,prog in progs: trk+=vlq(0)+bytes([0xC0|ch,prog])
    seq=[]
    for ch,p,s,d,v in events:
        seq.append((s,bytes([0x90|ch,p,v]))); seq.append((s+d,bytes([0x80|ch,p,0])))
    seq.sort(key=lambda x:x[0]); last=0
    for t,data in seq: trk+=vlq(t-last)+data; last=t
    trk+=vlq(0)+bytes([0xFF,0x2F,0x00])
    mid=b'MThd'+struct.pack('>IHHH',6,0,1,TPQ)+b'MTrk'+struct.pack('>I',len(trk))+bytes(trk)
    open(f'/tmp/{name}.mid','wb').write(mid); print('MIDI:',name)

def drums(ev,bars,kick,snare,hat=True,openhat=False):
    for i in range(bars):
        t0=i*TPQ*4
        for b in range(4):
            tb=t0+b*TPQ
            if b in kick: ev.append((9,36,tb,60,118))
            if b in snare: ev.append((9,38,tb,60,96))
            if hat:
                for h in range(2): ev.append((9,42,tb+h*(TPQ//2),22,48))
            if openhat and b in (1,3): ev.append((9,46,tb+TPQ//2,80,60))

# ---------- HYPE: catchy Lead-Hook (saw) ueber Am-F-C-G ----------
def hype():
    ev=[]; bars=8
    chords=[[57,60,64],[53,57,60],[48,52,55,60],[55,59,62]]  # Am F C G
    # Lead-Melodie (MIDI, 16tel-Schritte, Laenge) — eingaengiger Hook, 4 Bars, x2
    # (pitch, step16, len16)
    hook=[(76,0,2),(74,2,1),(72,3,1),(76,4,2),(72,6,2),(69,8,3),(72,11,1),(74,12,2),(76,14,2),  # bar1 Am
          (72,16,2),(76,18,1),(77,19,1),(76,20,2),(72,22,2),(69,24,4),(72,28,2),(74,30,2),       # bar2 F
          (72,32,2),(76,34,2),(79,36,2),(76,38,2),(72,40,2),(76,42,2),(72,44,4),                # bar3 C
          (74,48,2),(72,50,2),(71,52,2),(74,54,2),(79,56,4),(76,60,4)]                          # bar4 G
    for rep in range(2):
        off=rep*4*TPQ*4
        for p,s,l in hook: ev.append((2,p,off+s*S,l*S-20,84))
        for i in range(4):
            t0=off+i*TPQ*4
            for p in chords[i]:  # Stab-Akkorde
                for k in range(4): ev.append((0,p,t0+k*TPQ,TPQ//3,52))
            ev.append((1,chords[i][0]-12,t0,TPQ*2-20,95)); ev.append((1,chords[i][0]-12,t0+TPQ*2,TPQ*2-20,88))
    drums(ev,bars,[0,1,2,3],[1,3],hat=True,openhat=True)
    write('luxe-hype',128,ev,[(0,81),(1,38),(2,82)])  # chords=saw, bass, lead=sawtooth

# ---------- PHONK: gepitchte Cowbell/Agogo-Melodie + 808, dunkel ----------
def phonk():
    ev=[]; bars=8
    # dunkle Moll-Basis (Am), 808-Bass-Linie
    bassline=[(33,0,4),(33,8,2),(36,10,2),(31,12,4)]  # pro Bar (A, A, C, G) tief
    # Cowbell-Melodie (Agogo prog 113) — klassischer Memphis-Riff
    cow=[(69,0,2),(69,4,2),(72,6,2),(69,8,2),(76,10,2),(69,12,2),(67,14,2)]  # A A C A E A G
    for i in range(bars):
        t0=i*TPQ*4
        for p,s,l in cow: ev.append((2,p,t0+s*S,l*S-20,90))
        for p,s,l in bassline: ev.append((1,p,t0+s*S,l*S-20,105))
        # dunkler Pad-Akkord
        for p in [57,60,64]: ev.append((0,p,t0,TPQ*4-40,44))
    drums(ev,bars,[0],[2],hat=True,openhat=False)  # half-time: kick 1, snare 3
    write('luxe-phonk',130,ev,[(0,89),(1,39),(2,113)])  # pad, synthbass(808-ish), agogo cowbell

# ---------- HOUSE (premium, dezente Melodie) ----------
def house():
    ev=[]; bars=8
    chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]]
    mel=[(72,0,4),(76,4,4),(74,8,4),(72,12,4)]
    for i in range(bars):
        t0=i*TPQ*4; ch=chords[i%4]
        for p in mel: ev.append((2,p,t0+p_s*S if False else t0+0,0,0)) if False else None
        for p,s,l in mel: ev.append((2,p,t0+s*S,l*S-20,66))
        for k in range(4):
            for p in ch: ev.append((0,p,t0+k*TPQ,TPQ//3,50))
            ev.append((1,ch[0]-12,t0+k*TPQ,TPQ-30,92))
    drums(ev,bars,[0,1,2,3],[1,3],hat=True,openhat=True)
    write('luxe-house',122,ev,[(0,81),(1,38),(2,11)])  # chords, bass, vibraphone-mel

hype(); phonk(); house()
