#!/usr/bin/env python3
# DnB/Electronic Drum-Synth (User 2026-07-10 «der beat ton ist zu schlicht»): echte, druckvolle
# One-Shots per DSP statt dünner GM-Drums. Kick=Pitch-Env-Sine+Click, Snare=Noise-Body+Snap+Ton,
# Hats=gefiltertes Noise. Liest Pattern-Spec (Zeilen: "startSec typ velocity"), rendert Drum-WAV.
# Aufruf: python3 drum_synth.py <spec.txt> <out.wav>
import sys, numpy as np
from scipy.signal import butter, lfilter

SR = 44100
spec, out = sys.argv[1], sys.argv[2]

def env(n, a, d):  # Attack/Decay-Hüllkurve
    e = np.ones(n); ai = int(a * SR); di = int(d * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[-di:] = np.exp(-np.linspace(0, 5, di))
    return e

def bp(x, lo, hi):
    b, a = butter(2, [lo/(SR/2), min(hi,SR/2-100)/(SR/2)], btype='band'); return lfilter(b, a, x)
def hp(x, f):
    b, a = butter(2, f/(SR/2), btype='high'); return lfilter(b, a, x)

def kick(vel):
    n = int(0.32 * SR); t = np.arange(n)/SR
    f = 48 + (140-48)*np.exp(-t/0.018)                 # Pitch drop 140→48 Hz
    body = np.sin(2*np.pi*np.cumsum(f)/SR)
    body *= np.exp(-t/0.13)
    click = hp(np.random.randn(n), 1500) * np.exp(-t/0.004) * 0.5   # Transient-Click
    y = body + click
    return y/np.max(np.abs(y)+1e-9) * (vel/127) * 0.95

def snare(vel, ghost=False):
    n = int((0.10 if ghost else 0.22) * SR); t = np.arange(n)/SR
    body  = (np.sin(2*np.pi*200*t)) * np.exp(-t/0.035) * 0.7          # Body 200Hz (Gewicht)
    crack = bp(np.random.randn(n), 1500, 5000) * np.exp(-t/(0.045 if not ghost else 0.018))  # Crack 1.5-5kHz
    tail  = bp(np.random.randn(n), 3000, 9000) * np.exp(-t/(0.06 if not ghost else 0.02)) * 0.5
    top   = hp(np.random.randn(n), 6000) * np.exp(-t/0.004) * 0.4    # Transient-Top
    y = body + 0.9*crack + tail + top
    v = (vel/127) * (0.42 if ghost else 1.0)
    return y/np.max(np.abs(y)+1e-9) * v * 0.9

def hat(vel, open_=False):
    n = int((0.16 if open_ else 0.035) * SR); t = np.arange(n)/SR
    y = hp(np.random.randn(n), 7000) * np.exp(-t/(0.06 if open_ else 0.008))
    return y/np.max(np.abs(y)+1e-9) * (vel/127) * 0.6


def clap(vel):
    n = int(0.16*SR); t = np.arange(n)/SR
    y = np.zeros(n)
    for off in (0, int(0.008*SR), int(0.016*SR), int(0.024*SR)):  # 4 gestaffelte Bursts
        seg = bp(np.random.randn(n), 1200, 6000)
        e = np.zeros(n); e[off:] = np.exp(-np.arange(n-off)/(0.03*SR))
        y += seg*e
    return y/np.max(np.abs(y)+1e-9)*(vel/127)*0.8
def rim(vel):
    n = int(0.05*SR); t = np.arange(n)/SR
    tone = np.sin(2*np.pi*1700*t)*np.exp(-t/0.006)
    noise = hp(np.random.randn(n),3000)*np.exp(-t/0.004)*0.5
    return (tone+noise)/np.max(np.abs(tone+noise)+1e-9)*(vel/127)*0.7
def perc(vel):
    n = int(0.09*SR); t = np.arange(n)/SR
    y = (np.sin(2*np.pi*440*t)+0.5*np.sin(2*np.pi*660*t))*np.exp(-t/0.05)
    return y/np.max(np.abs(y)+1e-9)*(vel/127)*0.5
def kick808(vel):
    n = int(0.45*SR); t = np.arange(n)/SR
    f = 45 + (90-45)*np.exp(-t/0.03)                 # sanfterer Pitch-Drop, langer Sub-Tail
    y = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.28)
    y += hp(np.random.randn(n),2000)*np.exp(-t/0.003)*0.25  # dezenter Click
    return y/np.max(np.abs(y)+1e-9)*(vel/127)*0.95

rows = []
for line in open(spec):
    p = line.split()
    if len(p) >= 3: rows.append((float(p[0]), p[1], int(float(p[2]))))
if not rows:
    open(out,'wb').close(); sys.exit(0)
total = max(s for s,_,_ in rows) + 0.5
buf = np.zeros(int(total*SR))
MAKE = {'kick':lambda v:kick(v),'snare':lambda v:snare(v),'ghost':lambda v:snare(v,True),
        'hat':lambda v:hat(v),'ohat':lambda v:hat(v,True),
        'clap':lambda v:clap(v),'rim':lambda v:rim(v),'perc':lambda v:perc(v),'k808':lambda v:kick808(v)}
for st, typ, vel in rows:
    if typ not in MAKE: continue
    y = MAKE[typ](vel); i0 = int(st*SR)
    end = min(i0+len(y), len(buf)); buf[i0:end] += y[:end-i0]

buf /= (np.max(np.abs(buf))+1e-9); buf *= 0.85
import scipy.io.wavfile as wav
wav.write(out, SR, (buf*32767).astype(np.int16))
print('drums:', out, round(total,1),'s,', len(rows),'hits')
