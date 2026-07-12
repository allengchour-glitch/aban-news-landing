#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prozeduraler Textur-Generator (numpy + Pillow) — kachelbare Game-Texturen + Normal-Maps.
Erzeugt Boden/Straßen-Texturen in hoher Qualität ohne externe Assets.
    python3 automation/gen_textures.py
Ausgabe: textures/tex_*.png (+ _n Normal-Maps)."""
import sys, os, math
sys.path.insert(0, "/tmp/texenv")
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "textures")
os.makedirs(OUT, exist_ok=True)
N = 1024
rng = np.random.default_rng(7)

def save(arr, name):
    Image.fromarray(np.clip(arr,0,255).astype(np.uint8)).save(os.path.join(OUT, name))
    print("wrote", name)

# ---- kachelbares Value-Noise (wraparound) ----
def value_noise(res, size=N, seed=0):
    r = np.random.default_rng(seed)
    g = r.random((res, res)).astype(np.float32)
    # bilineare Hochskalierung mit Wrap
    ys = (np.arange(size)/size*res)
    xs = ys
    y0 = np.floor(ys).astype(int)%res; y1=(y0+1)%res; fy=(ys-np.floor(ys))[:,None]
    x0 = np.floor(xs).astype(int)%res; x1=(x0+1)%res; fx=(xs-np.floor(xs))[None,:]
    fy = (fy*fy*(3-2*fy)); fx=(fx*fx*(3-2*fx))
    a = g[np.ix_(y0,x0)]; b=g[np.ix_(y0,x1)]; c=g[np.ix_(y1,x0)]; d=g[np.ix_(y1,x1)]
    top = a*(1-fx)+b*fx; bot=c*(1-fx)+d*fx
    return top*(1-fy)+bot*fy

def fbm(size=N, octaves=5, seed=0):
    out = np.zeros((size,size),np.float32); amp=1.0; tot=0; res=4
    for o in range(octaves):
        out += amp*value_noise(res,size,seed+o); tot+=amp; amp*=0.5; res*=2
    return out/tot

# ---- kachelbares Worley/Voronoi (F1,F2 + cell id) ----
def worley(size=N, cells=8, seed=1):
    r = np.random.default_rng(seed)
    pts = (np.stack(np.meshgrid(np.arange(cells),np.arange(cells)),-1).astype(np.float32)
           + r.random((cells,cells,2)).astype(np.float32))  # ein Punkt pro Zelle
    cid = r.random((cells,cells)).astype(np.float32)
    yy,xx = np.meshgrid(np.arange(size),np.arange(size),indexing='ij')
    px = (xx/size*cells).astype(np.float32); py=(yy/size*cells).astype(np.float32)
    F1=np.full((size,size),9.9,np.float32); F2=F1.copy(); ID=np.zeros((size,size),np.float32)
    cellx=np.floor(px).astype(int); celly=np.floor(py).astype(int)
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            cx=(cellx+dx)%cells; cy=(celly+dy)%cells
            p=pts[cy,cx]  # (size,size,2)
            # Wrap-korrekte Distanz
            ddx=(p[...,0]+((cellx+dx)//cells)*cells)-px
            ddy=(p[...,1]+((celly+dy)//cells)*cells)-py
            d=np.sqrt(ddx*ddx+ddy*ddy)
            upd = d<F1
            F2=np.where(upd,F1,np.minimum(F2,d))
            ID=np.where(upd,cid[cy,cx],ID)
            F1=np.where(upd,d,F1)
    return F1,F2,ID

def normal_from_height(h, strength=2.0):
    h=(h-h.min())/(np.ptp(h)+1e-6)
    gy,gx=np.gradient(h.astype(np.float32))
    nx=-gx*strength; ny=-gy*strength; nz=np.ones_like(h)
    l=np.sqrt(nx*nx+ny*ny+nz*nz)+1e-6
    n=np.stack([nx/l,ny/l,nz/l],-1)
    return ((n*0.5+0.5)*255)

# ================= 1) KOPFSTEINPFLASTER (Straße) =================
F1,F2,ID = worley(N, cells=11, seed=3)
edge = np.clip((F2-F1)*3.2,0,1)          # Fugen dunkel
stone = 0.55+0.4*ID                       # Stein-Grundhelligkeit variiert
detail = fbm(N,5,seed=11)                 # Steinkorn
val = (stone*(0.6+0.4*detail))*edge + (1-edge)*0.12
base = np.stack([val*168, val*160, val*150],-1)  # helleres Pflaster (im Schatten grau statt schwarz)
# leichte moosgrüne Flecken in Fugen
moss = (1-edge)*np.clip(fbm(N,4,seed=22)-0.5,0,1)*2
base[...,1]+=moss*60; base[...,0]+=moss*10
save(base,"tex_cobble.png")
h = edge*(0.5+0.5*ID) - (1-edge)*0.5      # Höhe: Steine hoch, Fugen tief
save(normal_from_height(h,3.0),"tex_cobble_n.png")

# ================= 2) STEINBODEN (Platten, Dorfplatz) =================
tiles=6
yy,xx=np.meshgrid(np.arange(N),np.arange(N),indexing='ij')
gx=(xx/N*tiles)%1; gy=(yy/N*tiles)%1
grout=np.clip(np.minimum(np.minimum(gx,1-gx),np.minimum(gy,1-gy))*22,0,1)  # Fugenraster
tileid=((xx/N*tiles).astype(int)*7+(yy/N*tiles).astype(int)*13)%9/9.0
d2=fbm(N,5,seed=31)
v=(0.62+0.33*tileid)*(0.7+0.3*d2)
v=v*grout+(1-grout)*0.15
base=np.stack([v*182,v*182,v*190],-1)     # helleres Steingrau
save(base,"tex_stone.png")
save(normal_from_height(grout*(0.5+0.5*tileid),2.4),"tex_stone_n.png")

# ================= 3) GRAS (Boden) — natürlich, matt, feine Halme =================
patch=fbm(N,4,seed=41)                     # grosse Farbflächen (hell/dunkel)
fine =fbm(N,8,seed=43)                      # feines Halm-Korn (hochfrequent)
# feine gerichtete Halm-Streifen (vertikal), damit es wie Gras wirkt
streak=value_noise(3,N,seed=45)
streak=np.repeat(np.random.default_rng(46).random((1,N)).astype(np.float32),N,0)
streak=streak*0.5+fine*0.5
base=np.zeros((N,N,3),np.float32)
lum=(0.45+0.30*patch)*(0.75+0.25*fine)*(0.9+0.1*streak)  # matte Helligkeit
base[...,0]=lum*(70+40*patch)              # gedämpftes R (olivstich)
base[...,1]=lum*(120+35*patch)             # G moderat (nicht neon)
base[...,2]=lum*(48+22*patch)              # niedriges B
# trockene, erdige Flecken (bräunlich, nicht knallig)
dry=np.clip(fbm(N,5,seed=44)-0.60,0,1)*2.4
base[...,0]+=dry*55; base[...,1]+=dry*30; base[...,2]-=dry*10
# vereinzelte dunkle Erdlöcher
soil=np.clip(0.40-fbm(N,6,seed=47),0,1)*1.5
base[...,0]=base[...,0]*(1-soil)+soil*90
base[...,1]=base[...,1]*(1-soil)+soil*70
base[...,2]=base[...,2]*(1-soil)+soil*48
base=np.clip(base*1.30,0,255)
save(base,"tex_grass.png")
save(normal_from_height(fine*0.7+patch*0.3,1.1),"tex_grass_n.png")

# ================= 4) ERDE / WEG — mehr Struktur + Kiesel + Risse =================
d=fbm(N,6,seed=51); d2=fbm(N,8,seed=53); peb,peb2,pid=worley(N,cells=30,seed=52)
v=0.35+0.30*d+0.12*d2
base=np.stack([v*140,v*100,v*66],-1)       # warmes Braun
# eingelagerte Kiesel (heller, rund)
peblit=np.clip(0.35-peb*3.0,0,1)
base+= peblit[...,None]*np.array([55,52,46])
# dunkle Risse (Voronoi-Kanten)
crack=np.clip((peb2-peb)*4-0.3,0,1)
base*= (1-0.35*crack[...,None])
save(base,"tex_dirt.png")
save(normal_from_height(d+peblit*0.5-crack*0.4,1.8),"tex_dirt_n.png")

print("DONE_TEX")
