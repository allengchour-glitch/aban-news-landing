#!/usr/bin/env python3
# Pro-Mixdown mit SIDECHAIN-Pumpen (User «richtiges dj zeug»): duckt Musik+Bass im Kick-Takt = der
# atmende EDM-Pump. Summiert Musik(ge-sidechained) + Drums + Reese + FX. Drums bleiben ungeduckt.
# Aufruf: python3 mixdown.py <music.wav> <drums.wav|-> <reese.wav|-> <fx.wav|-> <kicktimes.txt|-> <out.wav>
import sys, numpy as np, scipy.io.wavfile as wav
SR=44100
def load(p):
    if p=='-' or not p: return np.zeros(1)
    sr,d=wav.read(p)
    if d.ndim>1: d=d.mean(1)
    return d.astype(np.float32)/32768.0
music,drums,reese,fx,kicks,out=sys.argv[1:7]
M=load(music); D=load(drums); R=load(reese); F=load(fx)
n=max(len(M),len(D),len(R),len(F))
def pad(x): return np.pad(x,(0,n-len(x))) if len(x)<n else x[:n]
M,D,R,F=pad(M),pad(D),pad(R),pad(F)

# Sidechain-Hüllkurve: bei jedem Kick auf ~0.35 runter, in ~180ms zurück auf 1.0
gain=np.ones(n)
if kicks not in ('-',''):
    dur=int(0.18*SR)
    shape=1-0.5*np.exp(-np.linspace(0,4,dur))   # 0.35 → 1.0
    for line in open(kicks):
        try: kt=float(line.split()[0])
        except: continue
        i=int(kt*SR)
        end=min(i+dur,n); gain[i:end]=np.minimum(gain[i:end],shape[:end-i])
# Musik + Reese werden geduckt; Drums + FX voll
mix = (M+0.9*R)*gain + 1.0*D + 0.55*F
mix/=(np.max(np.abs(mix))+1e-9); mix*=0.9
wav.write(out,SR,(mix*32767).astype(np.int16))
print('mixdown+sidechain:',out)
