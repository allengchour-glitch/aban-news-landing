#!/usr/bin/env python3
# LuxeStyle — Trend-Style-Tracks selbst produzieren (GM-MIDI -> fluidsynth). 3 Stile fuer Reels.
# Lauf:  python3 make_trend_tracks.py   (schreibt 3 .mid)  dann fluidsynth -> .wav (siehe README/Befehl unten)
import struct

TPQ = 480
def vlq(n):
    b=[n&0x7F]; n>>=7
    while n: b.insert(0,(n&0x7F)|0x80); n>>=7
    return bytes(b)

def build(name, bpm, bars, chords, bassprog, melprog, pattern):
    BAR=TPQ*4; ev=[]
    def note(ch,p,s,d,v): ev.append((s,bytes([0x90|ch,p,v]))); ev.append((s+d,bytes([0x80|ch,p,0])))
    for i in range(bars):
        t0=i*BAR; ch=chords[i%len(chords)]
        # Akkord (Pad/Stab) ch0
        for p in ch:
            if pattern.get('stab'):
                for k in range(4): note(0,p,t0+k*TPQ,TPQ//3,58)   # 4 Stabs/Bar
            else:
                note(0,p,t0,BAR-40,56)
        # Bass ch1
        root=ch[0]-12
        for k in range(pattern.get('bass_div',2)):
            note(1,root,t0+k*(BAR//pattern.get('bass_div',2)),BAR//pattern.get('bass_div',2)-20,90)
        # Melodie ch2 (einfaches Hook-Motiv)
        if pattern.get('mel'):
            mel=[ch[2]+12,ch[1]+12,ch[2]+12,ch[0]+12]
            for k,p in enumerate(mel): note(2,p,t0+k*TPQ,TPQ-40,70)
        # Drums ch9
        for beat in range(4):
            tb=t0+beat*TPQ
            if beat in pattern['kick']: note(9,36,tb,60,110)
            if beat in pattern['snare']: note(9,38,tb,60,88)
            if pattern.get('hat'):
                note(9,42,tb,25,52); note(9,42,tb+TPQ//2,25,40)
            if pattern.get('cowbell'):
                note(9,56,tb,40,70);
                if beat%2: note(9,56,tb+TPQ//2,40,55)
    trk=bytearray()
    trk+=vlq(0)+bytes([0xFF,0x51,0x03])+struct.pack('>I',int(60_000_000/bpm))[1:]
    trk+=vlq(0)+bytes([0xC0,pattern.get('chordprog',81)])  # chords instr
    trk+=vlq(0)+bytes([0xC1,bassprog]); trk+=vlq(0)+bytes([0xC2,melprog])
    ev.sort(key=lambda x:x[0]); last=0
    for tick,data in ev: trk+=vlq(tick-last)+data; last=tick
    trk+=vlq(0)+bytes([0xFF,0x2F,0x00])
    mid=b'MThd'+struct.pack('>IHHH',6,0,1,TPQ)+b'MTrk'+struct.pack('>I',len(trk))+bytes(trk)
    open(f'/tmp/{name}.mid','wb').write(mid); print('MIDI:',name, f'{bars*4*60/bpm:.0f}s')

# Cmaj-basierte, gefaellige Progressionen
HOUSE=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]]  # Cmaj7 Am7 Fmaj7 G7
HYPE =[[57,60,64],[53,57,60],[55,59,62],[57,60,64]]              # Am F G Am
PHONK=[[57,60,64],[56,59,62],[53,56,60],[55,58,62]]             # Am G#dim ... dunkel/minor

# (name, bpm, bars, chords, bassprog, melprog, pattern{kick,snare,hat,stab,mel,cowbell,bass_div,chordprog})
build('luxe-house',  122, 8, HOUSE, 38, 81, {'kick':[0,1,2,3],'snare':[1,3],'hat':1,'stab':1,'bass_div':4,'chordprog':81})
build('luxe-hype',   128, 8, HYPE,  38, 62, {'kick':[0,1,2,3],'snare':[1,3],'hat':1,'mel':1,'bass_div':4,'chordprog':62})
build('luxe-phonk',  130, 8, PHONK, 39, 0,  {'kick':[0,2],'snare':[2],'cowbell':1,'mel':0,'bass_div':2,'chordprog':89})
