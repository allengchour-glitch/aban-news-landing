# -*- coding: utf-8 -*-
"""Textur-Charge 2 (th6) fuer die Riesenstadt: Fassaden + Strassenbelaege.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein Netz, kein Blender-Binary).
WICHTIG: np.ix_ nur mit 1-D-Indizes (in noise() korrekt); fuer 2-D-Raster
direktes Fancy-Indexing tint[iy, ix] verwenden."""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th6"
os.makedirs(OUT, exist_ok=True)
N = 512

def speichern(name, rgb):
    px = np.ones((N, N, 4), dtype=np.float32)
    px[..., :3] = np.clip(rgb, 0, 1)
    px = px[::-1]
    img = bpy.data.images.new(name, width=N, height=N)
    img.pixels = px.ravel()
    img.filepath_raw = os.path.join(OUT, name + ".png")
    img.file_format = 'PNG'
    img.save(); bpy.data.images.remove(img)
    print("  ->", name + ".png", os.path.getsize(os.path.join(OUT, name + ".png")), "B")

def noise(oct_=4, seed=0):
    r = np.random.default_rng(seed)
    acc = np.zeros((N, N), dtype=np.float32); amp = 1.0; tot = 0.0
    for o in range(oct_):
        g = 2 ** (o + 2)
        base = r.random((g, g)).astype(np.float32)
        base = np.pad(base, ((0,1),(0,1)), mode='wrap')
        yi = np.linspace(0, g, N, endpoint=False); xi = np.linspace(0, g, N, endpoint=False)
        y0 = yi.astype(int); x0 = xi.astype(int)
        fy = (yi - y0)[:, None]; fx = (xi - x0)[None, :]
        fy = fy*fy*(3-2*fy); fx = fx*fx*(3-2*fx)
        a = base[np.ix_(y0, x0)]; b = base[np.ix_(y0, x0+1)]
        c = base[np.ix_(y0+1, x0)]; d = base[np.ix_(y0+1, x0+1)]
        acc += amp * ((a*(1-fx)+b*fx)*(1-fy) + (c*(1-fx)+d*fx)*fy)
        tot += amp; amp *= 0.5
    return acc / tot

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

# --------------------------------------------------- 1) Glasfassade (Hochhaus)
def glasfassade():
    cols, rows = 8, 12
    cx = xx / N * cols; cy = yy / N * rows
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    rahmen = np.clip(fx/0.09, 0, 1) * np.clip((1-fx)/0.09, 0, 1) \
           * np.clip(fy/0.11, 0, 1) * np.clip((1-fy)/0.11, 0, 1)
    r = np.random.default_rng(101)
    # jede Scheibe leicht anders getoent (Reflexe/Jalousien)
    sch = r.random((rows+1, cols+1)).astype(np.float32)
    t = sch[np.floor(cy).astype(int) % rows, np.floor(cx).astype(int) % cols]
    spiegel = np.clip(0.35 + fy*0.55 + t*0.30, 0, 1)      # Himmel spiegelt oben heller
    jal = (t > 0.78) * np.clip((fy-0.45)*2.2, 0, 1) * 0.35  # ein paar Jalousien unten
    v = spiegel - jal
    rr = v*0.52 + 0.10; gg = v*0.66 + 0.13; bb = v*0.80 + 0.17
    rahm_c = 0.42 + noise(3, 102)*0.10
    rr = np.where(rahmen > 0.5, rr, rahm_c)
    gg = np.where(rahmen > 0.5, gg, rahm_c*1.01)
    bb = np.where(rahmen > 0.5, bb, rahm_c*1.03)
    speichern("glasfassade", np.stack([rr, gg, bb], -1))

# --------------------------------------------------- 2) Betonfassade mit Fenstern
def betonfassade():
    cols, rows = 6, 9
    cx = xx / N * cols; cy = yy / N * rows
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    fen = ((fx > 0.22) & (fx < 0.78) & (fy > 0.20) & (fy < 0.68)).astype(np.float32)
    r = np.random.default_rng(111)
    t = r.random((rows+1, cols+1)).astype(np.float32)[np.floor(cy).astype(int) % rows,
                                                      np.floor(cx).astype(int) % cols]
    wand = 0.60 + noise(5, 112)*0.16 - np.clip(noise(3,113)-0.6, 0, 1)*0.20
    glas = 0.16 + t*0.26 + (1-fy)*0.14
    sims = (np.abs(fy - 0.72) < 0.045).astype(np.float32)   # Fensterbank
    v = np.where(fen > 0.5, glas, wand)
    v = np.maximum(v, sims*0.82)
    rr = np.where(fen > 0.5, v*0.75, v*1.0)
    gg = np.where(fen > 0.5, v*0.86, v*0.985)
    bb = np.where(fen > 0.5, v*1.0,  v*0.95)
    speichern("betonfassade", np.stack([rr, gg, bb], -1))

# --------------------------------------------------- 3) Asphalt (Fahrbahn)
def asphalt():
    korn = noise(7, 121)
    grob = np.clip(noise(5, 122) - 0.5, 0, 1)
    v = 0.26 + korn*0.13 + grob*0.10
    r = np.random.default_rng(123)
    splitt = (r.random((N, N)).astype(np.float32) > 0.988) * 0.16
    v = v + splitt
    speichern("asphalt", np.stack([v*1.0, v*1.0, v*1.06], -1))

# --------------------------------------------------- 4) Dachpappe (Flachdach)
def dachpappe():
    bahn = 6
    by = yy / N * bahn
    kante = np.clip((by - np.floor(by))/0.05, 0, 1) * np.clip((1-(by-np.floor(by)))/0.05, 0, 1)
    v = 0.20 + noise(6, 131)*0.12 + np.clip(noise(4,132)-0.55,0,1)*0.10
    v = v * (0.80 + kante*0.20)
    speichern("dachpappe", np.stack([v*1.05, v*1.0, v*0.96], -1))

# --------------------------------------------------- 5) Marmor (Rathaus/Foyer)
def marmor():
    ad = np.sin((xx*0.9 + yy*0.35)/N*np.pi*4 + noise(5, 141)*7.5)
    adern = np.clip(1 - np.abs(ad)*3.2, 0, 1)
    fein = np.clip(1 - np.abs(np.sin((xx*0.5 - yy*0.8)/N*np.pi*7 + noise(4,142)*9))*5.5, 0, 1)
    v = 0.86 - adern*0.24 - fein*0.10 + noise(4, 143)*0.05
    speichern("marmor", np.stack([v*1.0, v*0.985, v*0.955], -1))

# --------------------------------------------------- 6) Metallgitter (Zaun/Rost)
def metallgitter():
    p = 26.0
    gx = np.abs(((xx % p)/p) - 0.5)*2; gy = np.abs(((yy % p)/p) - 0.5)*2
    steg = np.clip((gx - 0.72)/0.28, 0, 1) + np.clip((gy - 0.72)/0.28, 0, 1)
    steg = np.clip(steg, 0, 1)
    v = 0.22 + steg*0.42 + noise(5, 151)*0.08
    speichern("metallgitter", np.stack([v*0.95, v*0.97, v*1.0], -1))

# --------------------------------------------------- 7) Acker / Erde
def acker():
    furche = np.sin(yy/N*np.pi*22 + noise(4, 161)*2.0)
    f = (furche*0.5 + 0.5)**1.4
    v = 0.30 + f*0.16 + noise(6, 162)*0.14
    speichern("acker", np.stack([v*1.0, v*0.76, v*0.52], -1))

# --------------------------------------------------- 8) Sand / Strand
def sand():
    well = np.sin((xx*0.6 + yy*0.25)/N*np.pi*16 + noise(5, 171)*3.0)
    v = 0.72 + (well*0.5+0.5)*0.10 + noise(7, 172)*0.10
    r = np.random.default_rng(173)
    v = v + (r.random((N, N)).astype(np.float32) - 0.5)*0.05
    speichern("sand", np.stack([v*1.0, v*0.93, v*0.74], -1))

if __name__ == "__main__":
    print("Textur-Charge 2 (th6, Riesenstadt):")
    for fn in (glasfassade, betonfassade, asphalt, dachpappe, marmor, metallgitter, acker, sand):
        fn()
    print("fertig")
