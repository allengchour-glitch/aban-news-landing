# -*- coding: utf-8 -*-
"""Textur-Charge 1 (th5) fuer Traumhaus/Stadt -- NEUFASSUNG auf dem Qualitaets-
stand der Chargen th15/th28: Kopfstein, Dachziegel, Betonplatten, Holzdielen,
Riffelblech, Backstein, Kies, Wiese.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

Die erste Fassung dieser Charge war flau, wolkig und "airbrushig" (flache
Voronoi-Kiesel mit Donut-Ringen, glatte Farbverlaeufe statt Oberflaeche,
Fugen exakt auf der Kachelgrenze). Diese Fassung arbeitet durchgaengig mit
Hoehenfeld + relief() + schlagschatten() + poly_stamp(), so wie th15/th28.

FALLEN (teuer gelernt, gelten unveraendert):
 * np.ix_ NUR mit 1-D-Indizes (in noise() und patch() korrekt);
   fuer 2-D-Indexraster IMMER direktes Fancy-Indexing tint[iy, ix].
 * Nahtlosigkeit ausschliesslich ueber Wrap-/Modulo-Arithmetik:
     noise()        -- Gitter teilt N, Basis per mode='wrap' gepaddet
     feinstruktur() -- Mittelung ueber np.roll
     blur()         -- separabler Box-Blur ueber np.roll
     wrap_d()       -- kuerzester Abstand ueber die Kachelgrenze
     patch()        -- lokaler Stempel mit modulo-gewickelten Indizes
     alle sin/cos   -- ausschliesslich ganzzahlige Frequenzen ueber N
 * STRUKTUR-RASTER IMMER UM EINE HALBE (bzw. VIERTEL-) EINHEIT VERSETZEN,
   damit die Kachelgrenze nicht in einer Fuge/Naht/Rille des Motivs liegt.
   Betrifft hier: dachziegel (halbe Reihe/Spalte), beton_platten (halbe
   Platte), holzdielen (halbe Diele + versetzte Stossfugen), riffelblech
   (halbe Zelle), backstein_alt (halbe Schicht), kopfstein (Steinmitte
   liegt auf der Kante, nie die Fuge).
 * Streuobjekte (Steine/Splitt/Halme) IMMER als konvexe Polygone bzw. Kapseln
   mit Facetten-Shading stempeln -- ein "facettierter Radius" ueber
   cos(k*theta) erzeugt Bluetenformen statt Bruchsteinen.
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th5"
os.makedirs(OUT, exist_ok=True)
N = 512

BILDER = {}          # name -> (N,N,3) float, fuer die Nahtpruefung
LICHT = -2.356       # Licht von oben links (Winkel in der dx/dy-Ebene)


def speichern(name, rgb):
    """rgb: (N,N,3) float 0..1 -> PNG (bpy erwartet bottom-up)"""
    a = np.clip(np.asarray(rgb, dtype=np.float32), 0, 1)
    BILDER[name] = a
    px = np.ones((N, N, 4), dtype=np.float32)
    px[..., :3] = a
    px = px[::-1]
    img = bpy.data.images.new(name, width=N, height=N)
    img.pixels = px.ravel()
    img.filepath_raw = os.path.join(OUT, name + ".png")
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    p = os.path.join(OUT, name + ".png")
    print("  ->", name + ".png", os.path.getsize(p), "B",
          "| mean %.3f std %.3f min %.3f max %.3f"
          % (a.mean(), a.std(), a.min(), a.max()))


def noise(oct_=4, seed=0):
    """nahtloses Wert-Rauschen (Gitter teilt N -> kein Rand)"""
    r = np.random.default_rng(seed)
    acc = np.zeros((N, N), dtype=np.float32); amp = 1.0; tot = 0.0
    for o in range(oct_):
        g = 2 ** (o + 2)
        base = r.random((g, g)).astype(np.float32)
        base = np.pad(base, ((0, 1), (0, 1)), mode='wrap')
        yi = np.linspace(0, g, N, endpoint=False); xi = np.linspace(0, g, N, endpoint=False)
        y0 = yi.astype(int); x0 = xi.astype(int)
        fy = (yi - y0)[:, None]; fx = (xi - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = base[np.ix_(y0, x0)]; b = base[np.ix_(y0, x0 + 1)]
        c = base[np.ix_(y0 + 1, x0)]; d = base[np.ix_(y0 + 1, x0 + 1)]
        acc += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy)
        tot += amp; amp *= 0.5
    return acc / tot


def feinstruktur(seed=0, wy=1, wx=1):
    """pixelfeines Rauschen, per Wrap-Mittelung gerichtet verschmiert
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Fasern/Korn/Halme."""
    a = np.random.default_rng(seed).random((N, N)).astype(np.float32)
    acc = np.zeros_like(a); c = 0
    for dy in range(-wy, wy + 1):
        for dx in range(-wx, wx + 1):
            acc += np.roll(np.roll(a, dy, axis=0), dx, axis=1); c += 1
    return acc / c


def blur(a, rx, ry=None):
    """separabler Box-Blur mit Wrap (Glow / weiche Verlaeufe / AO)"""
    ry = rx if ry is None else ry
    out = a.astype(np.float32)
    if rx > 0:
        acc = np.zeros_like(out)
        for d in range(-rx, rx + 1):
            acc += np.roll(out, d, axis=1)
        out = acc / (2 * rx + 1)
    if ry > 0:
        acc = np.zeros_like(out)
        for d in range(-ry, ry + 1):
            acc += np.roll(out, d, axis=0)
        out = acc / (2 * ry + 1)
    return out


yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)


def wrap_d(py, px):
    """kuerzester (nahtloser) Abstandsvektor jedes Pixels zu Punkt (py,px)"""
    dy = ((yy - py + N * 0.5) % N) - N * 0.5
    dx = ((xx - px + N * 0.5) % N) - N * 0.5
    return dy, dx


def band(t, w):
    """weiche Linie um t=0 (w = halbe Breite)"""
    return np.clip(1.0 - np.abs(t) / w, 0, 1)


def patch(cy, cx, R):
    """lokales Stempelfenster (2R+1)^2 um (cy,cx), Indizes modulo N gewickelt.
    Rueckgabe: 1-D-Indexvektoren ys/xs (fuer np.ix_) + 2-D-Offsets dy/dx."""
    iy0 = int(np.floor(cy)); ix0 = int(np.floor(cx))
    off = np.arange(-R, R + 1)
    ys = (iy0 + off) % N
    xs = (ix0 + off) % N
    dy = (iy0 + off - cy).astype(np.float32)[:, None]
    dx = (ix0 + off - cx).astype(np.float32)[None, :]
    return ys, xs, dy, dx


def relief(h, s=1.0):
    """Shading aus einem Hoehenfeld, Licht von oben links (Gradient per roll)"""
    gx = np.roll(h, 1, axis=1) - np.roll(h, -1, axis=1)
    gy = np.roll(h, 1, axis=0) - np.roll(h, -1, axis=0)
    return np.clip(0.5 + (gx + gy) * 0.5 * s, 0, 1.6)


def schlagschatten(h, weite=7, neigung=0.30):
    """harter Schlagschatten aus oben-links (nahtlos ueber np.roll).
    Liefert 0..1 -- 1 = voll im Schatten eines hoeheren Nachbarn."""
    sh = np.zeros_like(h)
    for d in range(1, weite + 1):
        nb = np.roll(np.roll(h, d, axis=0), d, axis=1)
        sh = np.maximum(sh, nb - h - d * neigung)
    return np.clip(sh, 0, 1)


def poly_stamp(H, ID, FS, k_id, cy, cx, rad, roff, ang0, ani, rot, z,
               flach=0.35, kuppe=0.50):
    """konvexer Polygon-Splitter (echte Bruchflaechen) in Hoehen-, ID- und
    Facetten-Puffer stempeln. roff = relative Kantenabstaende je Facette."""
    nf = len(roff)
    R = int(rad * 1.7) + 2
    ys, xs, dy, dx = patch(cy, cx, R)
    ca = np.cos(rot); sa = np.sin(rot)
    ux = (dx * ca + dy * sa) * ani
    uy = (-dx * sa + dy * ca) / ani
    q = None; fb = None
    for k in range(nf):
        a = ang0 + 2.0 * np.pi * k / nf
        proj = (ux * np.cos(a) + uy * np.sin(a)) / (rad * roff[k])
        bright = np.float32(0.52 + 0.58 * np.cos(a - rot - LICHT))
        if q is None:
            q = proj.astype(np.float32)
            fb = np.full(q.shape, bright, dtype=np.float32)
        else:
            m = proj > q
            q = np.where(m, proj, q)
            fb = np.where(m, bright, fb)
    m = q < 1.0
    if not m.any():
        return
    t = np.clip(1.0 - q, 0, 1)
    hh = np.where(m, z + rad * kuppe * t ** flach, -1e6).astype(np.float32)
    sub = H[np.ix_(ys, xs)]
    upd = hh > sub
    if not upd.any():
        return
    H[np.ix_(ys, xs)] = np.where(upd, hh, sub)
    sI = ID[np.ix_(ys, xs)]
    ID[np.ix_(ys, xs)] = np.where(upd, k_id, sI)
    bev = np.clip((q - 0.42) / 0.58, 0, 1)          # 0 = Deckflaeche, 1 = Kante
    sh = (1 - bev) * 1.06 + bev * fb
    sF = FS[np.ix_(ys, xs)]
    FS[np.ix_(ys, xs)] = np.where(upd, sh, sF).astype(np.float32)


def kapsel(H, ID, FS, k_id, cy, cx, laenge, breite, rot, z, hell,
           spitz=0.85):
    """duenne, sich verjuengende Kapsel (Grashalm/Faser) stempeln."""
    R = int(laenge) + 3
    ys, xs, dy, dx = patch(cy, cx, R)
    ca = np.cos(rot); sa = np.sin(rot)
    u = dx * ca + dy * sa                     # laengs (0 .. laenge)
    w = -dx * sa + dy * ca                    # quer
    t = np.clip(u / laenge, 0, 1)
    halb = breite * (1.0 - t * spitz) + 0.35
    m = (u > -0.6) & (u < laenge) & (np.abs(w) <= halb)
    if not m.any():
        return
    prof = np.clip(1.0 - np.abs(w) / (halb + 1e-6), 0, 1)
    hh = np.where(m, z + prof * 0.55 + t * 0.30, -1e6).astype(np.float32)
    sub = H[np.ix_(ys, xs)]
    upd = hh > sub
    if not upd.any():
        return
    H[np.ix_(ys, xs)] = np.where(upd, hh, sub)
    sI = ID[np.ix_(ys, xs)]
    ID[np.ix_(ys, xs)] = np.where(upd, k_id, sI)
    sF = FS[np.ix_(ys, xs)]
    f = (hell * (0.72 + 0.42 * prof)).astype(np.float32)
    FS[np.ix_(ys, xs)] = np.where(upd, f, sF).astype(np.float32)


# ------------------------------------------------ 1) Kopfsteinpflaster (trocken)
def kopfstein():
    r = np.random.default_rng(5101)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    G = 11                                   # 11x11 Steine a 46.5 px
    cell = N / G
    reihen_off = r.random(G).astype(np.float32)
    k_id = 0
    for gy in range(G):
        for gx in range(G):
            # KEIN +0.5 -> die Steinmitte liegt auf der Kachelgrenze, nie die Fuge
            cy = (gy + (r.random() - 0.5) * 0.24) * cell
            cx = (gx + reihen_off[gy] + (r.random() - 0.5) * 0.24) * cell
            rad = cell * (0.50 + r.random() * 0.11)
            nf = int(r.integers(5, 8))
            roff = 0.84 + r.random(nf).astype(np.float32) * 0.26
            poly_stamp(H, ID, FS, k_id, cy, cx, rad, roff,
                       r.random() * 6.283, 0.86 + r.random() * 0.30,
                       r.random() * 6.283, r.random() * 1.5,
                       flach=0.52, kuppe=0.32)
            k_id += 1
    KK = k_id

    stein = H > -1e5
    Hc = np.where(stein, H, -2.6).astype(np.float32)
    Hc += (feinstruktur(5102, 1, 1) - 0.5) * 0.42 * stein     # Steinnarbung
    lit = relief(blur(Hc, 1), 0.78)
    fein_lit = relief(Hc, 0.38)
    ao = np.clip(Hc - blur(Hc, 7), -6, 6) * 0.090
    sch = schlagschatten(Hc, 7, 0.24)

    tint = r.random(KK).astype(np.float32)[ID]
    warm = r.random(KK).astype(np.float32)[ID]
    hellstein = (r.random(KK).astype(np.float32)[ID] > 0.80).astype(np.float32)

    korn = (feinstruktur(5103, 1, 1) - 0.5) * 0.20 + (noise(8, 5104) - 0.5) * 0.11
    face = 0.415 + tint * 0.255 + korn + hellstein * 0.075
    face = face * FS * (0.84 + (lit - 0.5) * 0.62) + ao
    face += (fein_lit - 0.5) * 0.18
    face += np.clip(noise(8, 5105) - 0.76, 0, 1) * 0.34       # frische Abschlaege
    face -= np.clip(noise(6, 5106) - 0.64, 0, 1) * 0.17       # dunkler Belag
    face -= sch * 0.20

    # Fugen: trockener, heller Sand mit Splitt (nicht einfach "dunkel")
    fuge = 0.300 + noise(7, 5107) * 0.140 + (feinstruktur(5108, 1, 1) - 0.5) * 0.24
    fuge -= sch * 0.30
    fuge += np.clip(noise(8, 5109) - 0.70, 0, 1) * 0.22       # heller Splitt

    v = np.where(stein, face, fuge)
    v *= (0.90 + noise(3, 5110) * 0.23)                       # Wisch-/Schmutzzonen
    v = np.clip(v, 0.03, 1.10)

    rr = v * (1.000 + warm * 0.060)
    gg = v * (0.985 + warm * 0.012)
    bb = v * (0.965 - warm * 0.060)

    # Moos in den Fugen, Rostfahne, ausgeblichene Zonen
    moos = np.clip(noise(6, 5111) - 0.60, 0, 1) * 1.9 * np.where(stein, 0.16, 1.25)
    moos = np.clip(moos, 0, 1) * (0.35 + noise(7, 5112) * 0.85)
    rr = rr * (1 - moos * 0.45) + moos * 0.45 * 0.235
    gg = gg * (1 - moos * 0.45) + moos * 0.45 * 0.285
    bb = bb * (1 - moos * 0.45) + moos * 0.45 * 0.150
    hell = np.clip(noise(3, 5113) - 0.62, 0, 1) * 1.6
    rr += hell * 0.075; gg += hell * 0.070; bb += hell * 0.060
    speichern("kopfstein", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 2) Dachziegel (Biberschwanz)
def dachziegel():
    COLS, ROWS = 9, 14
    TW = N / COLS; RH = N / ROWS
    Xw = xx + (noise(4, 5201) - 0.5) * 2.8 + (noise(7, 5202) - 0.5) * 1.3
    Yw = yy + (noise(4, 5203) - 0.5) * 2.2

    # halber Reihenversatz -> Kachelgrenze liegt MITTEN im sichtbaren Band
    cyr = (Yw + RH * 0.5) / RH
    iy0 = np.floor(cyr).astype(int)
    fy = cyr % 1.0
    basis = (Xw + TW * 0.5) / TW

    def spalte(par):
        """Spaltenraster der Reihe mit Paritaet par (Halbversatz je Reihe)"""
        c = basis + (par % 2) * 0.5
        return np.floor(c).astype(int) % COLS, c % 1.0

    ixA, fxA = spalte(iy0)          # Reihe iy0
    _, fxB = spalte(iy0 - 1)        # Reihe darueber
    ixC, _ = spalte(iy0 + 1)        # Reihe darunter

    def bogen(fx):
        """Rundschnitt: untere Ziegelkante ist ein flacher Bogen"""
        return 1.0 - 0.20 * (1.0 - np.sqrt(np.clip(1 - (2 * fx - 1) ** 2, 0, 1)))

    bA = bogen(fxA); bB = bogen(fxB)
    unten = fy >= bA                                   # gehoert zur Reihe darunter
    # d = Abstand unterhalb der Deckkante des eigenen Ziegels (0 = frisch verdeckt,
    # 1 = eigene Unterkante). Ueber die Zellgrenze hinweg stetig.
    d = np.where(unten, fy - bA, fy + 1.0 - bB).astype(np.float32)
    iyO = (iy0 + unten.astype(int)) % ROWS
    ixO = np.where(unten, ixC, ixA)
    fxO = np.where(unten, (basis + ((iy0 + 1) % 2) * 0.5) % 1.0, fxA)

    # Hoehenfeld: Ziegel steigt zur Unterkante hin an, dahinter Stufe nach unten
    h = 0.30 + d * 1.25
    dxe = np.minimum(fxO, 1 - fxO)
    seite = np.clip(1 - dxe / 0.035, 0, 1)             # Stossfuge zwischen Ziegeln
    h -= seite * 0.85
    wulst = np.clip(1 - np.abs(d - 0.93) / 0.07, 0, 1)  # verdickte Unterkante
    h += wulst * 0.35
    h += (noise(7, 5204) - 0.5) * 0.18                 # Ziegel liegen nie plan

    lit = relief(blur(h, 1), 1.05)
    weit = relief(blur(h, 5), 0.45)
    ao = np.clip(h - blur(h, 7), -4, 4) * 0.095
    sch = schlagschatten(h, 10, 0.26)

    r = np.random.default_rng(5205)
    t = r.random((ROWS, COLS)).astype(np.float32)[iyO, ixO]
    hue = r.random((ROWS, COLS)).astype(np.float32)[iyO, ixO]
    alt = (r.random((ROWS, COLS)).astype(np.float32)[iyO, ixO] > 0.76).astype(np.float32)

    # Tonoberflaeche: sandig gebrannt, Strangpress-Riefen laengs
    korn = (feinstruktur(5206, 1, 1) - 0.5) * 0.26
    korn += (np.random.default_rng(5207).random((N, N)).astype(np.float32) - 0.5) * 0.13
    korn += (feinstruktur(5208, 3, 0) - 0.5) * 0.14
    v = 0.660 + t * 0.130 + korn + (noise(7, 5209) - 0.5) * 0.14
    v += (lit - 0.5) * 0.66 + (weit - 0.5) * 0.28 + ao
    v -= sch * 0.30
    v -= np.clip(1 - d / 0.10, 0, 1) * 0.34            # Schattenfuge unter der Deckkante
    v -= seite * 0.26
    v -= alt * 0.12
    v -= np.clip(wulst * 1.5 - 0.5, 0, 1) * np.clip(noise(8, 5210) - 0.56, 0, 1) * 1.5
    v -= np.clip(noise(8, 5211) - 0.79, 0, 1) * 0.70   # Abplatzer
    v = np.clip(v, 0.03, 1.15)

    rr = v * (0.975 + hue * 0.085)
    gg = v * (0.430 + hue * 0.105 + alt * 0.030)
    bb = v * (0.300 + hue * 0.065 + alt * 0.050)

    moos = np.clip(noise(5, 5212) - 0.55, 0, 1) * 1.9 * (0.28 + np.clip(1 - d / 0.16, 0, 1) * 1.5
                                                          + seite * 1.1)
    moos = np.clip(moos, 0, 1) * (0.35 + noise(7, 5213) * 0.9)
    rr = rr * (1 - moos * 0.55) + moos * 0.55 * 0.250
    gg = gg * (1 - moos * 0.55) + moos * 0.55 * 0.300
    bb = bb * (1 - moos * 0.55) + moos * 0.55 * 0.170
    kalk = np.clip(noise(4, 5214) - 0.63, 0, 1) * 1.9
    rr += kalk * 0.16; gg += kalk * 0.165; bb += kalk * 0.155
    russ = np.clip(noise(3, 5215) - 0.50, 0, 1) * 1.5
    rr *= (1 - russ * 0.20); gg *= (1 - russ * 0.22); bb *= (1 - russ * 0.20)
    speichern("dachziegel", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 3) Betonplatten (grossformatig)
def beton_platten():
    CL = RW = 3                               # 3x3 Platten a 170.7 px
    bw = N / CL; bh = N / RW
    X = xx + (noise(4, 5301) - 0.5) * 4.0 + (noise(7, 5302) - 0.5) * 1.6
    Y = yy + (noise(4, 5303) - 0.5) * 4.0 + (noise(7, 5304) - 0.5) * 1.6

    cy = (Y + bh * 0.5) / bh                  # halber Versatz -> Kante mitten
    iy = np.floor(cy).astype(int) % RW        # auf der Platte
    fy = cy % 1.0
    cx = (X + bw * 0.5) / bw + (iy % 2) * 0.5
    ix = np.floor(cx).astype(int) % CL
    fx = cx % 1.0

    dy_ = np.minimum(fy, 1 - fy)
    dx_ = np.minimum(fx, 1 - fx)
    j = 0.0135                                # halbe Fugenbreite ~2.3 px
    face = np.clip((dy_ - j) / 0.010, 0, 1) * np.clip((dx_ - j) / 0.010, 0, 1)

    # Hoehenfeld: Platte oben, Fuge tief, Kanten gefast
    h = face * 1.0
    fase = np.clip((np.minimum(dy_, dx_) - j) / 0.020, 0, 1)
    h = np.minimum(h, fase) * 1.0
    h += (noise(5, 5305) - 0.5) * 0.10        # Platten liegen leicht schief
    lit = relief(blur(h, 1), 1.30)
    ao = np.clip(h - blur(h, 6), -4, 4) * 0.20
    sch = schlagschatten(h, 6, 0.22)

    r = np.random.default_rng(5306)
    t = r.random((RW, CL)).astype(np.float32)[iy, ix]
    sorte = r.random((RW, CL)).astype(np.float32)[iy, ix]
    dunkel = (sorte > 0.72).astype(np.float32)

    # Zementhaut: feines Sandkorn, Kellenschlieren, Luftporen, Zuschlag
    korn = (feinstruktur(5307, 1, 1) - 0.5) * 0.22
    korn += (np.random.default_rng(5308).random((N, N)).astype(np.float32) - 0.5) * 0.12
    schlier = (noise(6, 5309) - 0.5) * 0.13 + (noise(3, 5310) - 0.5) * 0.12
    platte = 0.630 + t * 0.070 + korn + schlier
    platte -= dunkel * 0.075
    platte += (lit - 0.5) * 0.30 + ao
    zuschlag = np.clip(feinstruktur(5311, 0, 0) - 0.982, 0, 1) * 14.0   # helle Koerner
    platte += np.clip(zuschlag, 0, 1) * 0.16
    poren = (np.random.default_rng(5312).random((N, N)).astype(np.float32) > 0.9880) * 0.28
    poren += (np.random.default_rng(5313).random((N, N)).astype(np.float32) > 0.9972) * 0.28
    platte -= poren
    platte -= np.clip(noise(8, 5314) - 0.75, 0, 1) * 0.55               # Abplatzer
    # ramponierte Plattenkanten
    kante_n = np.clip(1 - np.minimum(dy_ / j, dx_ / j) / 2.0, 0, 1)
    platte -= kante_n * np.clip(noise(8, 5315) - 0.50, 0, 1) * 1.00

    # Haarrisse und Setzrisse ueber die Platte
    riss = np.abs(np.sin(2 * np.pi * (X * 7 + Y * 5) / N + (noise(4, 5316) - 0.5) * 8.0))
    rissm = np.clip(1 - riss / 0.014, 0, 1) * np.clip(noise(5, 5317) * 1.7 - 0.80, 0, 1) * 3.0
    platte -= np.clip(rissm, 0, 1) * face * 0.22
    riss2 = np.abs(np.sin(2 * np.pi * (X * 3 - Y * 11) / N + (noise(4, 5318) - 0.5) * 9.0))
    platte -= np.clip(1 - riss2 / 0.009, 0, 1) * np.clip(noise(6, 5319) * 1.6 - 0.92, 0, 1) * 3.0 * face * 0.18

    # Fuge: dunkler Vergussmoertel mit Sand
    fuge = 0.310 + noise(6, 5320) * 0.12 + korn * 1.6
    fuge += (feinstruktur(5321, 1, 1) - 0.5) * 0.18

    v = fuge * (1 - face) + platte * face
    v -= sch * 0.16
    v *= (0.91 + noise(3, 5322) * 0.20)
    v -= np.clip(noise(4, 5323) - 0.58, 0, 1) * 0.20          # Nass-/Schmutzzonen
    v += np.clip(noise(4, 5324) - 0.66, 0, 1) * 0.15          # Kalkschleier
    v = np.clip(v, 0.04, 1.05)

    rr = v * 0.995; gg = v * 1.000; bb = v * 1.020            # leicht kuehl (Zement)
    # Rostfahnen an ein paar Stellen (Gelaender/Bewehrung)
    rost = np.clip(noise(5, 5325) - 0.68, 0, 1) * 2.0 * (0.4 + noise(7, 5326) * 0.9)
    rost = np.clip(rost, 0, 0.75)
    rr = rr * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.86
    gg = gg * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.52
    bb = bb * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.30
    # Moos in den Fugen
    moos = np.clip(noise(6, 5327) - 0.62, 0, 1) * 1.9 * (1 - face)
    rr -= moos * 0.075; gg -= moos * 0.020; bb -= moos * 0.080
    speichern("beton_platten", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 4) Holzdielen (Eiche, geoelt)
def holzdielen():
    P = 6                                     # 6 Dielen a 85.3 px
    PH = N / P
    Xw = xx + (noise(6, 5401) - 0.5) * 1.6
    cy = (yy + PH * 0.5) / PH                 # halber Versatz -> Kante mitten drin
    ip = np.floor(cy).astype(int) % P
    fy = cy % 1.0

    r = np.random.default_rng(5402)
    # Stossfugen: je Diele eigenes Laengenraster (256 px) mit eigenem Versatz
    soff = r.random(P).astype(np.float32) * 256.0
    sx = (xx + soff[ip]) % 256.0
    ib = np.floor((xx + soff[ip]) / 256.0).astype(int) % 2
    stoss = np.clip(1 - np.minimum(sx, 256.0 - sx) / 2.2, 0, 1)

    dyk = np.minimum(fy, 1 - fy)
    fuge = np.clip(1 - dyk / 0.020, 0, 1)     # Laengsfuge
    h = 1.0 - np.clip(1 - dyk / 0.045, 0, 1) * 0.55 - fuge * 0.55
    h -= stoss * 0.75
    h += (noise(6, 5403) - 0.5) * 0.10        # Dielen leicht gewoelbt
    h += (np.cos(2 * np.pi * fy) * 0.5 + 0.5) * 0.10

    # Brettidentitaet (Diele x Laengenabschnitt)
    bid = (ip * 2 + ib)
    tint = r.random(P * 2).astype(np.float32)[bid]
    hue = r.random(P * 2).astype(np.float32)[bid]
    dreh = r.random(P * 2).astype(np.float32)[bid]

    # --- Maserung: Jahresringe laengs der Diele, kathedralartig verzogen
    ly = (fy - 0.5) + (dreh - 0.5) * 0.55
    warp = (noise(3, 5404) - 0.5) * 2.6 + (noise(5, 5405) - 0.5) * 1.1
    ring = ly * (7.0 + tint * 4.0) + warp + (feinstruktur(5406, 0, 8) - 0.5) * 0.9

    # Astloecher: dort draengen sich die Ringe zusammen
    knoten = np.zeros((N, N), dtype=np.float32)
    kern = np.zeros((N, N), dtype=np.float32)
    for i in range(9):
        ky = (r.random() * N)
        kx = (r.random() * N)
        kr = 7.0 + r.random() * 9.0
        dy, dx = wrap_d(ky, kx)
        dd = np.sqrt((dy / (kr * 0.75)) ** 2 + (dx / kr) ** 2)
        knoten += np.clip(1 - dd, 0, 1) ** 1.4 * (2.4 + r.random() * 2.0)
        kern = np.maximum(kern, np.clip((0.34 - dd) / 0.34, 0, 1) ** 0.8)
    ring = ring + knoten

    fein = np.abs(np.sin(np.pi * ring))
    maser = (1 - fein) ** 2.6                                   # dunkle Spaetholzlinien
    maser += (1 - np.abs(np.sin(np.pi * (ring * 2.0 + 0.3)))) ** 6.0 * 0.35
    fasern = (feinstruktur(5407, 0, 9) - 0.5) * 0.30 + (feinstruktur(5408, 0, 3) - 0.5) * 0.16

    hh = h - maser * 0.16                                       # Maserung leicht vertieft
    lit = relief(blur(hh, 1), 1.05)
    weit = relief(blur(hh, 4), 0.40)
    ao = np.clip(hh - blur(hh, 6), -4, 4) * 0.16
    sch = schlagschatten(hh, 6, 0.22)

    v = 0.560 + tint * 0.115 + (noise(7, 5409) - 0.5) * 0.11
    v -= maser * 0.235
    v += fasern
    v += (lit - 0.5) * 0.40 + (weit - 0.5) * 0.18 + ao
    v -= sch * 0.22
    v -= kern * 0.30                                            # Astkern dunkel
    v -= np.clip(noise(8, 5410) - 0.80, 0, 1) * 0.45            # Kratzer/Dellen
    v -= np.clip(feinstruktur(5411, 0, 14) - 0.62, 0, 1) * 0.35  # Schleifspuren
    v -= fuge * 0.30 + stoss * 0.32
    v = np.clip(v, 0.05, 1.10)

    rr = v * (1.000 + hue * 0.040)
    gg = v * (0.690 + hue * 0.070)
    bb = v * (0.415 + hue * 0.075)
    # Oelglanz: breiter Streiflichtstreifen quer ueber den Boden
    glanz = np.clip(relief(blur(hh, 2), 1.9) - 0.62, 0, 1) ** 1.4 * 1.5
    glanz *= (0.35 + np.clip(noise(3, 5412), 0, 1) * 1.1)
    rr += glanz * 0.16; gg += glanz * 0.145; bb += glanz * 0.115
    # abgelaufene, ausgeblichene Zonen
    lauf = np.clip(noise(3, 5413) - 0.58, 0, 1) * 1.7
    rr += lauf * 0.055; gg += lauf * 0.055; bb += lauf * 0.050
    speichern("holzdielen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 5) Riffelblech (Duett-Muster)
def riffelblech():
    H = np.zeros((N, N), dtype=np.float32)
    C = 64.0                                  # 8x8 Zellen a 64 px (teilt N)
    la = 20.0; wb = 3.6

    def lamelle(cy, cx, rot):
        R = int(la) + 3
        ys, xs, dy, dx = patch(cy, cx, R)
        ca = np.cos(rot); sa = np.sin(rot)
        u = (dx * ca + dy * sa) / la
        w = (-dx * sa + dy * ca) / wb
        q = (np.abs(u) ** 6 + np.abs(w) ** 2.5) ** (1.0 / 2.5)
        m = q < 1.0
        if not m.any():
            return
        hh = np.where(m, np.clip(1 - q, 0, 1) ** 0.45 * 2.6, 0).astype(np.float32)
        sub = H[np.ix_(ys, xs)]
        H[np.ix_(ys, xs)] = np.maximum(sub, hh)

    for gy in range(8):
        for gx in range(8):
            # halbe Zelle Versatz -> die Kachelgrenze schneidet Lamellen,
            # sie liegt nicht auf der leeren Zellgrenze
            cy0 = (gy + 0.5) * C
            cx0 = (gx + 0.5) * C
            rot = np.pi * 0.25 if (gx + gy) % 2 == 0 else -np.pi * 0.25
            for s in (-1, 1):
                dyp = -np.sin(rot) * 11.0 * s
                dxp = np.cos(rot) * 0.0 + np.cos(rot + np.pi * 0.5) * 11.0 * s
                lamelle(cy0 + np.sin(rot + np.pi * 0.5) * 11.0 * s,
                        cx0 + np.cos(rot + np.pi * 0.5) * 11.0 * s, rot)

    H += (noise(6, 5501) - 0.5) * 0.16        # Blech ist nie ganz plan
    lit = relief(blur(H, 1), 0.85)
    fein_lit = relief(H, 0.40)
    ao = np.clip(H - blur(H, 5), -4, 4) * 0.10
    sch = schlagschatten(H, 8, 0.30)

    # Grundblech: gewalzt, laengs gebuerstet, mit Kratzern und Schmutz
    walz = (feinstruktur(5502, 0, 6) - 0.5) * 0.13
    walz += (feinstruktur(5503, 6, 0) - 0.5) * 0.05
    korn = (np.random.default_rng(5504).random((N, N)).astype(np.float32) - 0.5) * 0.07
    v = 0.545 + walz + korn + (noise(7, 5505) - 0.5) * 0.10
    v += (lit - 0.5) * 0.72 + (fein_lit - 0.5) * 0.26 + ao
    v -= sch * 0.30
    v -= np.clip(noise(3, 5506) - 0.50, 0, 1) * 0.26          # Schmutzfilm
    v += np.clip(H, 0, 3) * 0.030                            # Lamellen blank gelaufen
    kratz = np.clip(feinstruktur(5507, 0, 20) - 0.60, 0, 1) * 1.8
    v += kratz * 0.10
    v -= np.clip(feinstruktur(5508, 20, 0) - 0.63, 0, 1) * 0.14
    v = np.clip(v, 0.03, 1.15)

    rr = v * 0.965; gg = v * 0.980; bb = v * 1.010           # kaltes Stahlgrau
    # Rostnester in den Senken
    rost = np.clip(noise(5, 5509) - 0.60, 0, 1) * 2.0 * np.clip(1 - H * 0.5, 0, 1)
    rost = np.clip(rost * (0.4 + noise(7, 5510) * 0.9), 0, 0.8)
    rr = rr * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.88
    gg = gg * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.46
    bb = bb * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.24
    # harte Spitzlichter auf den Lamellenruecken
    spek = np.clip(relief(blur(H, 1), 1.5) - 0.66, 0, 1) ** 1.5 * 1.4
    rr += spek * 0.20; gg += spek * 0.21; bb += spek * 0.23
    speichern("riffelblech", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 6) Backstein (alt, verwittert)
def backstein_alt():
    COLS, ROWS = 7, 17                        # Stein 73 x 30 px
    BW = N / COLS; BH = N / ROWS
    X = xx + (noise(4, 5601) - 0.5) * 3.2 + (noise(7, 5602) - 0.5) * 1.5
    Y = yy + (noise(4, 5603) - 0.5) * 2.4 + (noise(7, 5604) - 0.5) * 1.1

    cy = (Y + BH * 0.5) / BH                  # halbe Schicht Versatz
    iy = np.floor(cy).astype(int) % ROWS
    fy = cy % 1.0
    cx = (X + BW * 0.5) / BW + (iy % 2) * 0.5 # Laeuferverband
    ix = np.floor(cx).astype(int) % COLS
    fx = cx % 1.0

    r = np.random.default_rng(5605)
    # jeder Stein sitzt minimal anders -> Fugen laufen unregelmaessig
    jit = (r.random((ROWS, COLS)).astype(np.float32) - 0.5)[iy, ix]
    dy_ = np.minimum(fy, 1 - fy) + jit * 0.035
    dx_ = np.minimum(fx, 1 - fx) + jit * 0.020
    jy = 0.115; jx = 0.055                    # halbe Fugenbreite (ca. 3.5 px)
    face = np.clip((dy_ - jy) / 0.045, 0, 1) * np.clip((dx_ - jx) / 0.022, 0, 1)

    # Hoehenfeld: Stein steht vor, Fuge liegt zurueck
    h = face * 1.0 + (noise(6, 5606) - 0.5) * 0.20
    h += (r.random((ROWS, COLS)).astype(np.float32)[iy, ix] - 0.5) * 0.30 * face
    lit = relief(blur(h, 1), 1.15)
    ao = np.clip(h - blur(h, 5), -4, 4) * 0.22
    sch = schlagschatten(h, 6, 0.24)

    t = r.random((ROWS, COLS)).astype(np.float32)[iy, ix]
    hue = r.random((ROWS, COLS)).astype(np.float32)[iy, ix]
    sorte = r.random((ROWS, COLS)).astype(np.float32)[iy, ix]
    sinter = (sorte > 0.86).astype(np.float32)          # dunkel gesinterte Steine
    blass = (sorte < 0.14).astype(np.float32)           # ausgeblichene Steine

    # Ziegeloberflaeche: grober Sand, Poren, Brandflecken
    korn = (feinstruktur(5607, 1, 1) - 0.5) * 0.28
    korn += (np.random.default_rng(5608).random((N, N)).astype(np.float32) - 0.5) * 0.14
    korn += (feinstruktur(5609, 0, 3) - 0.5) * 0.12     # Strangpress-Riefen
    stein = 0.600 + t * 0.145 + korn + (noise(7, 5610) - 0.5) * 0.15
    stein -= sinter * 0.190
    stein += blass * 0.085
    poren = (np.random.default_rng(5611).random((N, N)).astype(np.float32) > 0.9905) * 0.30
    stein -= poren
    stein -= np.clip(noise(8, 5612) - 0.74, 0, 1) * 0.60         # Abplatzer
    kante_n = np.clip(1 - np.minimum(dy_ / jy, dx_ / jx) / 1.7, 0, 1)
    stein -= kante_n * np.clip(noise(8, 5613) - 0.48, 0, 1) * 1.10   # bestossene Kanten
    riss = np.abs(np.sin(2 * np.pi * (X * 9 + Y * 15) / N + (noise(4, 5614) - 0.5) * 8.0))
    stein -= np.clip(1 - riss / 0.010, 0, 1) * np.clip(noise(6, 5615) * 1.6 - 0.90, 0, 1) * 3.0 * 0.20

    # Kalkmoertel: rau, sandig, teils ausgewaschen/ausgebroeckelt
    mortel = 0.660 + noise(6, 5616) * 0.16 + korn * 1.5
    mortel += (feinstruktur(5617, 1, 1) - 0.5) * 0.26
    mortel -= np.clip(noise(7, 5618) - 0.58, 0, 1) * 0.45        # ausgewaschene Stellen
    mortel -= np.clip(noise(4, 5619) - 0.62, 0, 1) * 0.30

    v = mortel * (1 - face) + stein * face
    v += (lit - 0.5) * 0.42 + ao
    v -= sch * 0.24
    v *= (0.90 + noise(3, 5620) * 0.22)
    v = np.clip(v, 0.03, 1.10)

    rr = v * (0.870 + hue * 0.110 * face)
    gg = v * (0.500 + hue * 0.075 * face + (1 - face) * 0.290)
    bb = v * (0.400 + hue * 0.060 * face + (1 - face) * 0.330)

    # Verwitterung: Salpeterausblueh, Russ, Moos am Fuss der Fugen, Regenfahnen
    kalk = np.clip(noise(4, 5621) - 0.60, 0, 1) * 2.0 * (0.4 + noise(7, 5622) * 0.9)
    kalk = np.clip(kalk, 0, 0.85)
    rr = rr * (1 - kalk * 0.55) + kalk * 0.55 * 0.82
    gg = gg * (1 - kalk * 0.55) + kalk * 0.55 * 0.81
    bb = bb * (1 - kalk * 0.55) + kalk * 0.55 * 0.78
    russ = np.clip(noise(3, 5623) - 0.52, 0, 1) * 1.6
    rr *= (1 - russ * 0.26); gg *= (1 - russ * 0.27); bb *= (1 - russ * 0.25)
    moos = np.clip(noise(6, 5624) - 0.64, 0, 1) * 1.8 * (1 - face * 0.75)
    rr -= moos * 0.075; gg -= moos * 0.025; bb -= moos * 0.080
    fahne = np.clip(feinstruktur(5625, 14, 0) - 0.58, 0, 1) * 1.8
    rr *= (1 - fahne * 0.13); gg *= (1 - fahne * 0.12); bb *= (1 - fahne * 0.10)
    speichern("backstein_alt", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 7) Kies (Rundkies, grob)
def kies():
    r = np.random.default_rng(5701)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    k_id = 0
    # zwei Korngroessen: erst die groben, dann Fuellkies dazwischen
    for K, r0, r1, zz in ((330, 9.0, 17.0, 1.6), (1500, 3.4, 8.0, 0.9)):
        cy = r.random(K).astype(np.float32) * N
        cx = r.random(K).astype(np.float32) * N
        rad = r0 + r.random(K).astype(np.float32) ** 1.5 * (r1 - r0)
        z = r.random(K).astype(np.float32) * zz
        ani = 0.74 + r.random(K).astype(np.float32) * 0.50
        rot = r.random(K).astype(np.float32) * np.pi * 2
        nf = r.integers(6, 10, K)
        ang0 = r.random(K).astype(np.float32) * 6.283
        for i in range(K):
            roff = 0.90 + r.random(int(nf[i])).astype(np.float32) * 0.20   # rund gerollt
            poly_stamp(H, ID, FS, k_id, cy[i], cx[i], rad[i], roff, ang0[i],
                       ani[i], rot[i], z[i], flach=0.62, kuppe=0.62)
            k_id += 1
    KK = k_id

    korn_m = H > -1e5
    Hc = np.where(korn_m, H, -1.6).astype(np.float32)
    Hc += (feinstruktur(5702, 1, 1) - 0.5) * 0.30 * korn_m
    lit = relief(blur(Hc, 1), 0.80)
    fein_lit = relief(Hc, 0.34)
    ao = np.clip(Hc - blur(Hc, 6), -6, 6) * 0.085
    sch = schlagschatten(Hc, 6, 0.26)

    tint = r.random(KK).astype(np.float32)[ID]
    art = r.random(KK).astype(np.float32)[ID]
    warm = r.random(KK).astype(np.float32)[ID]
    quarz = (art > 0.88).astype(np.float32)             # weisser Quarzkiesel
    dunkel = (art < 0.13).astype(np.float32)            # dunkler Basalt

    stein = 0.480 + tint * 0.230 + quarz * 0.150 - dunkel * 0.230
    stein = stein * FS * (0.84 + (lit - 0.5) * 0.62) + ao
    stein += (fein_lit - 0.5) * 0.16
    stein += (feinstruktur(5703, 1, 1) - 0.5) * 0.13
    stein -= sch * 0.22
    stein += np.clip(noise(8, 5704) - 0.80, 0, 1) * 0.28

    # Untergrund: feiner Sand/Splitt zwischen den Kieseln
    sandg = 0.300 + noise(7, 5705) * 0.13 + (feinstruktur(5706, 1, 1) - 0.5) * 0.24
    sandg -= sch * 0.35

    v = np.where(korn_m, stein, sandg)
    v *= (0.92 + noise(3, 5707) * 0.18)
    v = np.clip(v, 0.03, 1.10)

    rr = v * (0.995 + warm * 0.075)
    gg = v * (0.955 + warm * 0.020)
    bb = v * (0.905 - warm * 0.070)
    # feuchte Zonen + gruener Anflug in den Zwischenraeumen
    feucht = np.clip(noise(3, 5708) - 0.58, 0, 1) * 1.6
    rr *= (1 - feucht * 0.20); gg *= (1 - feucht * 0.19); bb *= (1 - feucht * 0.14)
    alg = np.clip(noise(6, 5709) - 0.66, 0, 1) * 1.8 * np.where(korn_m, 0.25, 1.2)
    rr -= alg * 0.055; gg -= alg * 0.010; bb -= alg * 0.060
    speichern("kies", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 8) Wiese (dichter Rasen)
def wiese_satt():
    r = np.random.default_rng(5801)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    # Grundfilz: kurze, dichte Halme (verschmiertes Feinrauschen)
    filz = (feinstruktur(5802, 3, 0) - 0.5) * 0.55 + (feinstruktur(5803, 2, 1) - 0.5) * 0.32
    filz += (feinstruktur(5804, 1, 2) - 0.5) * 0.22

    # echte Halme als Kapseln stempeln -> Rasen bekommt Tiefe statt Filzoptik
    K = 4200
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    lng = 5.5 + r.random(K).astype(np.float32) ** 1.4 * 9.5
    brt = 0.85 + r.random(K).astype(np.float32) * 0.75
    rot = (r.random(K).astype(np.float32) - 0.5) * 2.4 - np.pi * 0.5   # ueberwiegend nach oben
    z = r.random(K).astype(np.float32) * 1.5
    hell = 0.80 + r.random(K).astype(np.float32) * 0.55
    for i in range(K):
        kapsel(H, ID, FS, i, cy[i], cx[i], lng[i], brt[i], rot[i], z[i], hell[i])

    halm = H > -1e5
    Hc = np.where(halm, H, -1.2).astype(np.float32)
    lit = relief(blur(Hc, 1), 0.55)
    ao = np.clip(Hc - blur(Hc, 5), -4, 4) * 0.16
    sch = schlagschatten(Hc, 5, 0.30)

    tint = r.random(K).astype(np.float32)[ID]
    v = 0.560 + filz
    v = np.where(halm, v * FS * (0.90 + (lit - 0.5) * 0.55) + tint * 0.16, v * 0.62)
    v += ao
    v -= sch * 0.30
    # Wuchsdichte und Maehstreifen (Streifen gegen die Kante versetzt)
    v += (noise(3, 5805) - 0.5) * 0.26 + (noise(5, 5806) - 0.5) * 0.16
    streif = np.sin(2 * np.pi * (yy + 64.0) * 4 / N)
    v *= (1.0 + streif * 0.055)
    v -= np.clip(noise(5, 5807) - 0.66, 0, 1) * 0.32          # Schattenluecken
    v = np.clip(v, 0.06, 1.30)

    trocken = np.clip(noise(4, 5808) - 0.56, 0, 1) * 1.7
    frisch = np.clip(noise(4, 5809) - 0.58, 0, 1) * 1.6
    gelb = (r.random(K).astype(np.float32)[ID] > 0.90) * halm   # vertrocknete Halme
    rr = v * (0.255 + trocken * 0.44 + gelb * 0.30 + noise(7, 5810) * 0.075)
    gg = v * (0.740 + trocken * 0.14 + frisch * 0.14 + gelb * 0.10)
    bb = v * (0.215 + trocken * 0.11)
    # Klee-Inseln und Erde in den Luecken
    klee = np.clip(noise(4, 5811) - 0.62, 0, 1) * 1.7
    rr -= klee * 0.045; gg -= klee * 0.075; bb -= klee * 0.012
    erde = np.clip(1 - (Hc + 1.2) * 1.6, 0, 1) * np.clip(noise(4, 5812) - 0.60, 0, 1) * 2.2
    erde = np.clip(erde, 0, 1)
    rr = rr * (1 - erde * 0.55) + erde * 0.55 * 0.220
    gg = gg * (1 - erde * 0.55) + erde * 0.55 * 0.165
    bb = bb * (1 - erde * 0.55) + erde * 0.55 * 0.105
    speichern("wiese_satt", np.stack([rr, gg, bb], -1))


ALLE = (kopfstein, dachziegel, beton_platten, holzdielen, riffelblech,
        backstein_alt, kies, wiese_satt)


def nahtpruefung():
    """Randdifferenz gegen die mittlere Nachbardifferenz (Ziel <= 1.5)."""
    print("\nNahtpruefung (Rand/Nachbar, Ziel <= 1.5):")
    for name, a in BILDER.items():
        g = a.mean(axis=2)
        v_naht = np.abs(g[0, :] - g[-1, :]).mean()
        h_naht = np.abs(g[:, 0] - g[:, -1]).mean()
        v_ref = np.abs(np.diff(g, axis=0)).mean()
        h_ref = np.abs(np.diff(g, axis=1)).mean()
        print("  %-22s v %.3f  h %.3f"
              % (name, v_naht / (v_ref + 1e-9), h_naht / (h_ref + 1e-9)))


if __name__ == "__main__":
    import sys
    wahl = sys.argv[1:]
    print("Textur-Charge th5 (Neufassung):")
    for fn in ALLE:
        if wahl and fn.__name__ not in wahl:
            continue
        fn()
    nahtpruefung()
    print("fertig ->", OUT)
