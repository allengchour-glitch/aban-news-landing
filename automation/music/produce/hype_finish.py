import numpy as np, wave
SR=44100
def readwav(p):
    w=wave.open(p,'r'); n=w.getnframes(); ch=w.getnchannels(); sw=w.getsampwidth()
    raw=w.readframes(n); w.close()
    a=np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768.0
    if ch==2: a=a.reshape(-1,2).mean(1)
    return a
def writewav(p,x):
    x=np.clip(x,-1,1); d=(x*32767).astype(np.int16)
    w=wave.open(p,'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes()); w.close()

mix=readwav('/tmp/hype_pro_raw.wav')
dur=len(mix)/SR
from scipy.signal import butter,lfilter
def lp(x,f): b,a=butter(4,min(f,SR/2-100)/(SR/2),'low'); return lfilter(b,a,x)
def hp(x,f): b,a=butter(4,f/(SR/2),'high'); return lfilter(b,a,x)

# Tempo: 150 BPM, 4 bars before drop. drop at bar 4 (0-indexed bar 4 -> after 4 bars)
bpm=150; beat=60.0/bpm; bar=beat*4
drop_t=4*bar  # seconds where drop hits

# --- Riser: filtered white-noise sweep rising over the 2 bars before drop ---
rlen=2*bar
t=np.linspace(0,rlen,int(SR*rlen),False)
noise=np.random.randn(len(t))
# rising lowpass cutoff 400 -> 9000, rising amplitude
env=(t/rlen)**2.2
riser=np.zeros(len(t))
# chunked sweep filter
chunk=2048
for i in range(0,len(t),chunk):
    seg=noise[i:i+chunk]
    frac=i/len(t)
    cut=400+8600*frac
    riser[i:i+len(seg)]=lp(seg,cut)
riser*=env*0.5
# uptuned sine sweep on top
swf=np.linspace(200,1600,len(t))
riser+=np.sin(2*np.pi*np.cumsum(swf)/SR)*env*0.12
# place riser ending exactly at drop
rs=int((drop_t-rlen)*SR)
if rs<0: rs=0
mix[rs:rs+len(riser)]+=riser[:len(mix)-rs]

# --- Impact at the drop: sub boom + noise hit ---
il=int(1.2*SR); ti=np.linspace(0,1.2,il,False)
boomf=80*np.exp(-ti*6)+40
boom=np.sin(2*np.pi*np.cumsum(boomf)/SR)*np.exp(-ti*4)*0.8
crash=hp(np.random.randn(il),3000)*np.exp(-ti*5)*0.35
impact=boom+crash
di=int(drop_t*SR)
mix[di:di+il]+=impact[:len(mix)-di]

# --- Reverse-cymbal pre-drop (short) ---
# gentle glue: soft saturation + normalize
mix=np.tanh(mix*0.9)
mix/=np.max(np.abs(mix))+1e-9; mix*=0.97
fade=int(0.03*SR); mix[:fade]*=np.linspace(0,1,fade); mix[-fade:]*=np.linspace(1,0,fade)
writewav('/tmp/hype_pro_mix.wav',mix)
print("MIX OK", round(dur,1),"s  drop@",round(drop_t,2),"s")
