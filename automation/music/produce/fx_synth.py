#!/usr/bin/env python3
# DJ-FX-Synth (User «richtiges dj zeug»): Riser/Uplifter, Impact-Boom, Downsweep — die Übergangs-Effekte.
# Liest Spec (Zeilen: "startSec typ durSec"), rendert FX-WAV. Typen: riser, impact, downsweep, sweepup.
import sys, numpy as np
from scipy.signal import butter, lfilter
SR = 44100
spec, out = sys.argv[1], sys.argv[2]
def hp(x,f): b,a=butter(2,f/(SR/2),'high'); return lfilter(b,a,x)
def lp(x,f): b,a=butter(2,min(f,SR/2-100)/(SR/2),'low'); return lfilter(b,a,x)

def riser(dur):  # weisses Rauschen, Pitch+Volume+Filter steigen (klassischer Uplifter)
    n=int(dur*SR); t=np.arange(n)/SR
    noise=np.random.randn(n)
    # Filter öffnet 300→12000 Hz
    y=np.zeros(n); step=1024
    for j in range(0,n,step):
        c=300+(12000-300)*(j/n); b,a=butter(2,min(c,SR/2-100)/(SR/2),'high'); y[j:j+step]=lfilter(b,a,noise[j:j+step])
    vol=np.linspace(0,1,n)**2
    # Tonhöhen-Sweep drübergelegt (Sine glissando)
    f=200*2**(np.linspace(0,3,n)); tone=0.3*np.sin(2*np.pi*np.cumsum(f)/SR)*vol
    return (y*vol*0.6+tone)/1.4
def impact(dur):  # Sub-Boom + Noise-Crash beim Drop
    n=int(dur*SR); t=np.arange(n)/SR
    f=90*np.exp(-t/0.12); boom=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.35)
    crash=hp(np.random.randn(n),4000)*np.exp(-t/0.25)*0.4
    return (boom+crash)/np.max(np.abs(boom+crash)+1e-9)*0.9
def downsweep(dur):  # Reverse-artiger Abwärts-Sweep (nach dem Drop/ins Breakdown)
    n=int(dur*SR); t=np.arange(n)/SR
    f=8000*2**(-np.linspace(0,4,n)); y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.linspace(1,0,n)
    noise=lp(np.random.randn(n),np.linspace(8000,200,n).mean())*np.linspace(0.5,0,n)
    return (0.5*y+0.4*noise)

rows=[]
for line in open(spec):
    p=line.split()
    if len(p)>=3: rows.append((float(p[0]),p[1],float(p[2])))
if not rows: open(out,'wb').close(); sys.exit(0)
total=max(s+d for s,_,d in rows)+0.5
buf=np.zeros(int(total*SR))
MK={'riser':riser,'impact':impact,'downsweep':downsweep}
for st,typ,dur in rows:
    if typ not in MK: continue
    y=MK[typ](dur); i0=int(st*SR); end=min(i0+len(y),len(buf)); buf[i0:end]+=y[:end-i0]
m=np.max(np.abs(buf))+1e-9; buf=buf/m*0.7
import scipy.io.wavfile as wav
wav.write(out,SR,(buf*32767).astype(np.int16))
print('fx:',out,round(total,1),'s,',len(rows),'FX')
