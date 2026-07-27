# -*- coding: utf-8 -*-
"""Textur-Charge 1 fuer Traumhaus: nahtlos kachelbare PNGs (512x512) via numpy+bpy.
Alle Texturen sind tileable (modulo-Arithmetik, keine Kanten)."""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th5"
os.makedirs(OUT, exist_ok=True)
N = 512
rng = np.random.default_rng(7)

def speichern(name, rgb):
    """rgb: (N,N,3) float 0..1 -> PNG (bpy erwartet bottom-up)"""
    px = np.ones((N, N, 4), dtype=np.float32)
    px[..., :3] = np.clip(rgb, 0, 1)
    px = px[::-1]  # bpy-Origin unten links
    img = bpy.data.images.new(name, width=N, height=N)
    img.pixels = px.ravel()
    img.filepath_raw = os.path.join(OUT, name + ".png")
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    print("  ->", name + ".png", os.path.getsize(os.path.join(OUT, name + ".png")), "B")

def noise(oct_=4, seed=0):
    """nahtloses Wert-Rauschen durch Kachel-Interpolation"""
    r = np.random.default_rng(seed)
    acc = np.zeros((N, N), dtype=np.float32); amp = 1.0; tot = 0.0
    for o in range(oct_):
        g = 2 ** (o + 2)                      # Gitterpunkte (teilt N -> nahtlos)
        base = r.random((g, g)).astype(np.float32)
        base = np.pad(base, ((0,1),(0,1)), mode='wrap')
        yi = np.linspace(0, g, N, endpoint=False)
        xi = np.linspace(0, g, N, endpoint=False)
        y0 = yi.astype(int); x0 = xi.astype(int)
        fy = (yi - y0)[:, None]; fx = (xi - x0)[None, :]
        fy = fy*fy*(3-2*fy); fx = fx*fx*(3-2*fx)     # smoothstep
        a = base[np.ix_(y0, x0)]; b = base[np.ix_(y0, x0+1)]
        c = base[np.ix_(y0+1, x0)]; d = base[np.ix_(y0+1, x0+1)]
        acc += amp * ((a*(1-fx)+b*fx)*(1-fy) + (c*(1-fx)+d*fx)*fy)
        tot += amp; amp *= 0.5
    return acc / tot

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

# ------------------------------------------------------- 1) Kopfsteinpflaster
def kopfstein():
    rows, cols = 12, 12
    cy = (yy / N * rows); cx = (xx / N * cols)
    ry = np.floor(cy).astype(int)
    cx = cx + (ry % 2) * 0.5                    # Versatz je Reihe
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    d = np.maximum(np.abs(fx - 0.5), np.abs(fy - 0.5)) * 2
    fuge = np.clip((d - 0.80) / 0.20, 0, 1)     # Fugenmaske
    idr = np.random.default_rng(3)
    tint = idr.random((rows + 1, cols + 1)).astype(np.float32)
    t = tint[np.floor(cy).astype(int) % rows, np.floor(cx).astype(int) % cols]
    grund = 0.42 + t * 0.20 + noise(4, 11) * 0.10
    rgbv = np.stack([grund * 1.02, grund * 0.99, grund * 0.95], -1)
    rgbv *= (1 - fuge * 0.45)[..., None]        # dunkle Fugen
    speichern("kopfstein", rgbv)

# ------------------------------------------------------- 2) Dachziegel
def dachziegel():
    rows, cols = 16, 20
    cy = yy / N * rows; cx = xx / N * cols
    ry = np.floor(cy).astype(int)
    cx = cx + (ry % 2) * 0.5
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    wolb = np.sin(fx * np.pi) ** 0.6            # Woelbung quer
    kante = np.clip((fy - 0.82) / 0.18, 0, 1)   # Ueberlappungs-Schatten
    r = np.random.default_rng(5)
    tint = r.random((rows + 1, cols + 1)).astype(np.float32)
    t = tint[ry % rows, np.floor(cx).astype(int) % cols]
    hell = 0.55 + wolb * 0.32 - kante * 0.45 + t * 0.10 + noise(3, 21) * 0.08
    rgbv = np.stack([hell * 0.72, hell * 0.36, hell * 0.27], -1)   # Ziegelrot
    speichern("dachziegel", rgbv)

# ------------------------------------------------------- 3) Beton mit Fugen
def beton():
    g = 4
    cy = yy / N * g; cx = xx / N * g
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    fuge = np.clip((np.minimum(fx, fy)) / 0.03, 0, 1)
    fuge = np.minimum(fuge, np.clip((np.minimum(1-fx, 1-fy)) / 0.03, 0, 1))
    grund = 0.62 + noise(5, 31) * 0.16 - noise(2, 32) * 0.06
    flecken = np.clip(noise(3, 33) - 0.55, 0, 1) * 0.18
    v = grund - flecken
    v = v * (0.72 + fuge * 0.28)
    rgbv = np.stack([v, v * 0.995, v * 0.97], -1)
    speichern("beton_platten", rgbv)

# ------------------------------------------------------- 4) Holzdielen
def holzdielen():
    planks = 7
    py = yy / N * planks
    pi = np.floor(py).astype(int)
    fy = py - pi
    r = np.random.default_rng(9)
    shift = r.random(planks + 1).astype(np.float32) * 40
    off = shift[pi % planks][..., None] if False else shift[pi % planks]
    maser = np.sin((xx + off) * 0.16 + noise(4, 41) * 9.0)
    maser = (maser * 0.5 + 0.5) ** 1.6
    tint = r.random(planks + 1).astype(np.float32)[pi % planks]
    fuge = np.clip(fy / 0.035, 0, 1) * np.clip((1 - fy) / 0.035, 0, 1)
    v = 0.40 + maser * 0.22 + tint * 0.14 + noise(5, 42) * 0.07
    v = v * (0.55 + fuge * 0.45)
    rgbv = np.stack([v * 1.0, v * 0.68, v * 0.40], -1)
    speichern("holzdielen", rgbv)

# ------------------------------------------------------- 5) Riffelblech
def riffelblech():
    p = 64.0
    a = ((xx+yy) % p)/p; b = ((xx-yy) % p)/p
    ra = np.clip(1-np.abs(a-0.5)*4.2, 0, 1); rb = np.clip(1-np.abs(b-0.5)*4.2, 0, 1)
    seg = (np.floor(yy/(p*0.5)) % 2)
    rel = np.where(seg > 0, ra, rb)                # abwechselnde Rippenrichtung
    v = 0.44 + rel*0.40
    r = np.random.default_rng(29)
    v = v + (r.random((N, N)).astype(np.float32)-0.5)*0.045
    speichern("riffelblech", np.stack([v*0.93, v*0.955, v*1.0], -1))

# ------------------------------------------------------- 6) Backstein (Variante)
def backstein():
    rows, cols = 18, 9
    cy = yy / N * rows; cx = xx / N * cols
    ry = np.floor(cy).astype(int)
    cx = cx + (ry % 2) * 0.5
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)
    fuge = np.clip(fx / 0.055, 0, 1) * np.clip((1-fx) / 0.055, 0, 1) \
         * np.clip(fy / 0.10, 0, 1) * np.clip((1-fy) / 0.10, 0, 1)
    r = np.random.default_rng(13)
    tint = r.random((rows + 1, cols + 1)).astype(np.float32)
    t = tint[ry % rows, np.floor(cx).astype(int) % cols]
    stein = 0.48 + t * 0.24 + noise(4, 61) * 0.12
    mortel = 0.74 + noise(3, 62) * 0.10
    v = stein * fuge + mortel * (1 - fuge)
    rr = np.where(fuge > 0.5, v * 0.74, v * 0.92)
    gg = np.where(fuge > 0.5, v * 0.36, v * 0.90)
    bb = np.where(fuge > 0.5, v * 0.28, v * 0.86)
    speichern("backstein_alt", np.stack([rr, gg, bb], -1))

# ------------------------------------------------------- 7) Kies / Schotter (Voronoi)
def kies():
    r = np.random.default_rng(23); K = 170
    pts = r.random((K, 2)).astype(np.float32) * N
    d1 = np.full((N, N), 1e9, dtype=np.float32); idx = np.zeros((N, N), dtype=np.int32)
    for i, (py, px_) in enumerate(pts):
        for oy in (-N, 0, N):                      # Wrap -> nahtlos
            for ox in (-N, 0, N):
                dd = (yy-(py+oy))**2 + (xx-(px_+ox))**2
                m = dd < d1; d1 = np.where(m, dd, d1); idx = np.where(m, i, idx)
    d1 = np.sqrt(d1)
    tint = r.random(K).astype(np.float32)[idx]
    rand = np.clip(1 - d1/(d1.max()*0.16), 0, 1)   # Steinwoelbung
    v = 0.40 + tint*0.26 + rand*0.22
    v = v * (0.62 + np.clip(d1/6.0, 0, 1)*0.38)    # dunkle Zwischenraeume
    speichern("kies", np.stack([v*1.0, v*0.96, v*0.89], -1))

# ------------------------------------------------------- 8) Wiese (satt, fein)
def wiese():
    n1 = noise(6, 81); n2 = noise(3, 82); n3 = noise(7, 83)
    halme = np.clip((n3 - 0.48) * 4.0, 0, 1)
    v = 0.30 + n1 * 0.26 + halme * 0.20
    trocken = np.clip(n2 - 0.62, 0, 1) * 0.9
    rr = v * (0.42 + trocken * 0.62)
    gg = v * (0.78 - trocken * 0.16)
    bb = v * (0.26 + trocken * 0.10)
    speichern("wiese_satt", np.stack([rr, gg, bb], -1))

if __name__ == "__main__":
    print("Textur-Charge 1:")
    for fn in (kopfstein, dachziegel, beton, holzdielen, riffelblech, backstein, kies, wiese):
        fn()
    print("fertig")
