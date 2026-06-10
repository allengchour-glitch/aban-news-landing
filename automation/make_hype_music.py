import numpy as np
from scipy.signal import butter, lfilter
SR=44100
def hp(x,f): b,a=butter(4,f/(SR/2),'high'); return lfilter(b,a,x)
def lp(x,f): b,a=butter(4,min(f,SR/2-100)/(SR/2),'low'); return lfilter(b,a,x)
def T(d): return np.linspace(0,d,int(SR*d),False)
def kick(d=0.5,f0=150,f1=50):
    t=T(d); f=f1+(f0-f1)*np.exp(-t*40)
    ph=2*np.pi*np.cumsum(f)/SR
    body=np.sin(ph)*np.exp(-t*7)
    click=np.sin(2*np.pi*2000*t)*np.exp(-t*150)*0.25
    return np.tanh((body+click)*1.2)
def snare(d=0.22):
    t=T(d); n=hp(np.random.randn(len(t)),1700)
    tone=np.sin(2*np.pi*180*t)*0.5
    return (n*0.8+tone)*np.exp(-t*20)
def clap(d=0.22):
    t=T(d); n=hp(np.random.randn(len(t)),1200)
    e=np.exp(-t*18)
    # 3 quick bursts for clap texture
    for off in (0.006,0.012):
        s=int(off*SR); e[s:]+=np.exp(-(t[:len(t)-s])*18)
    return n*e*0.5
def hat(d=0.06,op=False):
    t=T(d); n=hp(np.random.randn(len(t)),8500)
    return n*np.exp(-t*(9 if op else 70))*0.5
def b808(d,freq):
    t=T(d); f=freq*(1+0.6*np.exp(-t*28))
    ph=2*np.pi*np.cumsum(f)/SR
    s=np.tanh(np.sin(ph)*1.6)
    e=np.minimum(1,t*180)*np.exp(-t*1.3)
    return s*e
def supersaw(freq,d,det=0.012):
    t=T(d); out=np.zeros(len(t))
    for k in (-2,-1,0,1,2):
        f=freq*(1+det*k); out+=2*(t*f-np.floor(0.5+t*f))
    out/=5; out=lp(out,3500)
    e=np.minimum(1,t*120)*np.exp(-t*2.2)
    return out*e*0.5
def place(buf,sig,step,step_dur,gain=1.0):
    s=int(step*step_dur*SR)
    e=min(len(buf),s+len(sig))
    if s<len(buf): buf[s:e]+=sig[:e-s]*gain

# minor scales (Hz) for basslines
SCALES={
 'Fmin':[43.65,49.00,51.91,58.27,65.41,69.30,77.78],  # F G Ab Bb C Db Eb (F2-ish lows)
 'Cmin':[32.70,36.71,38.89,43.65,49.00,51.91,58.27],
 'Gmin':[49.00,55.00,58.27,65.41,73.42,77.78,87.31],
}
def build(bpm, key, bars, bass_steps, lead=True, seed=0):
    np.random.seed(seed)
    beat=60.0/bpm; step_dur=beat/4.0   # 16th
    steps=bars*16
    n=int(steps*step_dur*SR)+SR
    buf=np.zeros(n)
    sc=SCALES[key]
    for bar in range(bars):
        b0=bar*16
        # KICK half-time: step 0 and 10
        place(buf,kick(),b0+0,step_dur,1.0)
        place(buf,kick(),b0+10,step_dur,0.9)
        if bar%2==1: place(buf,kick(),b0+14,step_dur,0.7)
        # SNARE/CLAP backbeat on step 8
        place(buf,(snare() if bar%2==0 else clap()),b0+8,step_dur,0.9)
        if bar%4==3:  # fill
            for s in (12,13,14,15): place(buf,snare(0.08),b0+s,step_dur,0.25+0.06*(s-12))
        # 808 bass following bass_steps pattern (note index per quarter)
        for qi,deg in enumerate(bass_steps):
            if deg is None: continue
            freq=sc[deg%7]*(2 if deg>=7 else 1)
            place(buf,b808(beat*0.9,freq),b0+qi*4,step_dur,0.9)
        # HI-HATS 16th + rolls
        for s in range(16):
            g=0.5 if s%4==0 else 0.32
            place(buf,hat(),b0+s,step_dur,g)
            if s in (6,14) or (bar%2==1 and s in (3,11)):  # 32nd roll
                place(buf,hat(0.04),b0+s+0.5,step_dur,0.28)
        if bar%4==3:  # hat triplet burst end of phrase
            for k in range(6): place(buf,hat(0.035),b0+15+k/6.0,step_dur,0.2)
        # LEAD stab on downbeats from bar 4
        if lead and bar>=4:
            deg=[0,3,5,3][bar%4]
            place(buf,supersaw(sc[deg]*4,beat*1.6),b0+0,step_dur,0.5)
            place(buf,supersaw(sc[(deg+2)%7]*4,beat*0.9),b0+8,step_dur,0.4)
    # master: soft limit + normalize + tiny fade
    buf=np.tanh(buf*0.8)
    buf/=np.max(np.abs(buf))+1e-9; buf*=0.95
    fade=int(0.02*SR); buf[:fade]*=np.linspace(0,1,fade); buf[-fade:]*=np.linspace(1,0,fade)
    return (buf*32767).astype(np.int16)

import wave
def save(name,data):
    with wave.open(name,'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
    print(name, round(len(data)/SR,1),"s")

# 3 Varianten
save("/tmp/luxe-hype1.wav", build(150,'Fmin',8,[0,0,2,4],seed=1))           # dark drive
save("/tmp/luxe-hype2.wav", build(146,'Cmin',8,[0,None,5,3],seed=7))         # bouncy
save("/tmp/luxe-hype3.wav", build(152,'Gmin',8,[0,4,2,5],lead=True,seed=13)) # energetic

# ---- HOUSE (4-on-the-floor, ~124 BPM): Offbeat-Bass, Clap 2&4, Open-Hat-Offbeats, Akkord-Stabs ----
def build_house(bpm=124, root=110.0, bars=8, seed=0):
    np.random.seed(seed)
    beat=60.0/bpm; step_dur=beat/4.0
    n=int(bars*16*step_dur*SR)+SR
    buf=np.zeros(n)
    am7=[root, root*1.20, root*1.50, root*1.78]   # ~Root, m3, 5, m7
    bassline=[0,0,3,5,0,-2,3,0]                    # Halbton-Offsets je Takt
    for bar in range(bars):
        b0=bar*16; semi=bassline[bar%len(bassline)]; bf=root*2**(semi/12.0)
        for s in (0,4,8,12): place(buf,kick(0.4,140,52),b0+s,step_dur,1.0)    # 4-on-the-floor
        place(buf,clap(),b0+4,step_dur,0.8); place(buf,clap(),b0+12,step_dur,0.8)
        for s in (2,6,10,14): place(buf,hat(0.12,op=True),b0+s,step_dur,0.40) # Open-Hat Offbeat
        for s in range(16):
            if s%2==1: place(buf,hat(0.05),b0+s,step_dur,0.16)                # Closed-Hat 16tel
        for s in (2,6,10,14): place(buf,b808(beat*0.42,bf),b0+s,step_dur,0.70)# Offbeat-Pluck-Bass
        if bar>=2:
            stab=sum(supersaw(f*2*2**(semi/12.0),beat*0.42) for f in am7)/len(am7)
            for s in (6,14): place(buf,stab,b0+s,step_dur,0.55)               # Akkord-Stab
    buf=np.tanh(buf*0.8); buf/=np.max(np.abs(buf))+1e-9; buf*=0.95
    fade=int(0.02*SR); buf[:fade]*=np.linspace(0,1,fade); buf[-fade:]*=np.linspace(1,0,fade)
    return (buf*32767).astype(np.int16)

save("/tmp/luxe-house1.wav", build_house(124,110.0,8,seed=3))   # A-Moll, klassisch
save("/tmp/luxe-house2.wav", build_house(126,116.5,8,seed=21))  # höher, treibend
