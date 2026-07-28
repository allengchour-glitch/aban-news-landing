# -*- coding: utf-8 -*-
"""Textur-Charge (th28) Stadtdetails fuer Gehwege, Fassaden und Innenraeume:
Gehwegplatten, Fahrbahnmarkierung, Graffitiwand, Rauputz, Rostblech,
Dachpfannen, Badfliesen, Auslegware, nasses Kopfsteinpflaster, Gitterrost.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

FALLEN (teuer gelernt in den Chargen th12/th15, gelten hier unveraendert):
 * np.ix_ NUR mit 1-D-Indizes (in noise() und patch() korrekt);
   fuer 2-D-Indexraster IMMER direktes Fancy-Indexing tint[iy, ix].
 * Nahtlosigkeit ausschliesslich ueber Wrap-/Modulo-Arithmetik:
     noise()        -- Gitter teilt N, Basis per mode='wrap' gepaddet
     feinstruktur() -- Mittelung ueber np.roll
     blur()         -- separabler Box-Blur ueber np.roll
     wrap_d()       -- kuerzester Abstand ueber die Kachelgrenze
     patch()        -- lokaler Stempel mit modulo-gewickelten Indizes
     alle sin/cos   -- ausschliesslich ganzzahlige Frequenzen ueber N
     Domain-Warp    -- nur mit periodischen Feldern, VOR dem Modulo angewandt
 * STRUKTUR-RASTER IMMER UM EINE HALBE (bzw. VIERTEL-) EINHEIT VERSETZEN,
   damit die Kachelgrenze nicht in einer Fuge/Naht/Rille des Motivs liegt --
   sonst sieht die (mathematisch korrekte) Naht wie ein Fehler aus.
   Betrifft hier: gehwegplatten (halbe Platte), fahrbahnmarkierung (Strich-
   mitte), dachpfannen (Viertelwelle + halbe Reihe), badfliesen (halbe
   Fliese), gitterrost (Stabmitte auf der Kante), kopfstein_nass (Steinmitte).
 * Streuobjekte (Steine/Splitt) IMMER als konvexe Polygone mit Facetten-
   Shading stempeln -- ein "facettierter Radius" ueber cos(k*theta) erzeugt
   Bluetenformen statt Bruchsteinen.
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th28"
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
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Fasern/Korn/Schlieren."""
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


# ------------------------------------------------ 1) Gehwegplatten (Beton)
def gehwegplatten():
    CL = RW = 4                               # 4x4 Platten a 128 px
    bw = N / CL; bh = N / RW
    # gelegt, nicht gedruckt: Fugen laufen leicht unregelmaessig
    X = xx + (noise(4, 2801) - 0.5) * 3.4 + (noise(7, 2802) - 0.5) * 1.5
    Y = yy + (noise(4, 2803) - 0.5) * 3.4 + (noise(7, 2804) - 0.5) * 1.5

    # halber Versatz in beiden Achsen -> Kachelgrenze liegt MITTEN auf der
    # Platte, nie in einer Fuge
    cy = (Y + bh * 0.5) / bh
    iy = np.floor(cy).astype(int) % RW
    fy = cy % 1.0
    cx = (X + bw * 0.5) / bw + (iy % 2) * 0.5          # Laeuferverband
    ix = np.floor(cx).astype(int) % CL
    fx = cx % 1.0

    dy_ = np.minimum(fy, 1 - fy)
    dx_ = np.minimum(fx, 1 - fx)
    j = 0.0125                                        # halbe Fugenbreite ~1.6 px
    face = np.clip((dy_ - j) / 0.009, 0, 1) * np.clip((dx_ - j) / 0.009, 0, 1)

    r = np.random.default_rng(2805)
    t = r.random((RW, CL)).astype(np.float32)[iy, ix]         # 2-D-Fancy-Indexing!
    hue = r.random((RW, CL)).astype(np.float32)[iy, ix]
    sorte = r.random((RW, CL)).astype(np.float32)[iy, ix]
    dunkel = (sorte > 0.78).astype(np.float32)                # nachgelegte Platte
    hell = (sorte < 0.16).astype(np.float32)

    # Betonoberflaeche: Zementschlaemme mit feinem Sandkorn (nie glatt!)
    korn = (feinstruktur(2806, 1, 1) - 0.5) * 0.24
    korn += (np.random.default_rng(2807).random((N, N)).astype(np.float32) - 0.5) * 0.13
    wolke = noise(7, 2808); grob = noise(5, 2809)
    platte = 0.605 + t * 0.085 + (wolke - 0.5) * 0.16 + (grob - 0.5) * 0.11 + korn
    platte -= dunkel * 0.085
    platte += hell * 0.055
    # Luftporen und kleine Ausbrueche
    poren = (np.random.default_rng(2810).random((N, N)).astype(np.float32) > 0.9885) * 0.30
    poren += (np.random.default_rng(2811).random((N, N)).astype(np.float32) > 0.9975) * 0.26
    platte -= poren
    platte -= np.clip(noise(8, 2812) - 0.76, 0, 1) * 0.55     # Abplatzer
    # abgestossene Kanten (Platten sind an den Raendern immer ramponiert)
    kante_n = np.clip(1 - np.minimum(dy_ / j, dx_ / j) / 1.8, 0, 1)
    platte -= kante_n * np.clip(noise(8, 2813) - 0.52, 0, 1) * 0.95
    # Fase: Licht oben/links, Schatten unten/rechts
    platte += np.clip(1 - np.abs(fy - (j + 0.014)) / 0.014, 0, 1) * 0.075
    platte -= np.clip(1 - np.abs(fy - (1 - j - 0.014)) / 0.014, 0, 1) * 0.070
    platte += np.clip(1 - np.abs(fx - (j + 0.014)) / 0.014, 0, 1) * 0.050
    platte -= np.clip(1 - np.abs(fx - (1 - j - 0.014)) / 0.014, 0, 1) * 0.046

    # Haarrisse ueber einzelne Platten
    riss = np.abs(np.sin(2 * np.pi * (X * 11 + Y * 7) / N + (noise(4, 2814) - 0.5) * 7.0))
    rissm = np.clip(1 - riss / 0.020, 0, 1) * np.clip(noise(5, 2815) * 1.7 - 0.85, 0, 1) * 3.0
    platte -= np.clip(rissm, 0, 1) * face * 0.20

    # Fugensand: dunkelgrau, koernig, etwas ausgewaschen
    fuge = 0.335 + noise(6, 2816) * 0.13 + korn * 1.5
    fuge += (feinstruktur(2817, 1, 1) - 0.5) * 0.20
    fuge -= np.clip((fy - (1 - j)) / j, 0, 1) * 0.10          # Schatten an der Kante
    fuge -= np.clip((fx - (1 - j)) / j, 0, 1) * 0.05

    v = fuge * (1 - face) + platte * face
    v -= np.clip(1 - np.maximum(dy_ / j, dx_ / j), 0, 1) * (1 - face) * 0.10

    # grossflaechige Verschmutzung bricht das 4x4-Raster auf
    v *= (0.90 + noise(3, 2818) * 0.22)
    v -= np.clip(noise(4, 2819) - 0.60, 0, 1) * 0.20          # Nasszonen/Schmutz
    v += np.clip(noise(4, 2820) - 0.66, 0, 1) * 0.16          # ausgebleichte Zonen
    v = np.clip(v, 0.04, 1.05)

    rr = v * (1.000 + hue * 0.030 * face)
    gg = v * (0.988 + hue * 0.010 * face)
    bb = v * (0.952 - hue * 0.030 * face)

    # Kaugummiflecken + Moos in den Fugen (typische Gehwegdetails)
    rk = np.random.default_rng(2821)
    K = 16
    for i in range(K):
        py = rk.random() * N; px = rk.random() * N
        rad = 1.8 + rk.random() * 2.6
        R = int(rad) + 3
        ys, xs, dy, dx = patch(py, px, R)
        d = np.sqrt(dy * dy + dx * dx)
        m = d < rad
        f = 0.42 + rk.random() * 0.22
        for ch, tgt in enumerate((rr, gg, bb)):
            sub = tgt[np.ix_(ys, xs)]
            tgt[np.ix_(ys, xs)] = np.where(m, sub * f, sub)
    moos = np.clip(noise(6, 2822) - 0.66, 0, 1) * 1.9 * np.clip((1 - face) * 1.4, 0, 1)
    rr -= moos * 0.070; gg -= moos * 0.020; bb -= moos * 0.075
    speichern("gehwegplatten", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 2) Fahrbahnmarkierung
def fahrbahnmarkierung():
    # --- Asphalt: Splittkoerner im Bitumenmoertel
    r = np.random.default_rng(2831)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)
    K = 4200
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = 1.8 + r.random(K).astype(np.float32) ** 1.8 * 5.2
    z = r.random(K).astype(np.float32) * 1.1
    ani = 0.78 + r.random(K).astype(np.float32) * 0.44
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 8, K)
    ang0 = r.random(K).astype(np.float32) * 6.283
    for i in range(K):
        roff = 0.78 + r.random(int(nf[i])).astype(np.float32) * 0.38
        poly_stamp(H, ID, FS, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], z[i], flach=0.40, kuppe=0.42)

    korn = H > -1e5
    Hc = np.where(korn, H, -0.9).astype(np.float32)
    lit = relief(blur(Hc, 1), 0.85)
    ao = np.clip(Hc - blur(Hc, 5), -4, 4) * 0.055

    tint = r.random(K).astype(np.float32)[ID]
    stein = 0.245 + tint * 0.185
    stein = stein * FS * (0.86 + (lit - 0.5) * 0.55) + ao
    stein += (feinstruktur(2832, 1, 1) - 0.5) * 0.055
    # heller Quarzsplitt vereinzelt
    stein += (r.random(K).astype(np.float32)[ID] > 0.90) * 0.11
    bitumen = 0.105 + noise(7, 2833) * 0.055 + (feinstruktur(2834, 1, 1) - 0.5) * 0.055
    v = np.where(korn, stein, bitumen)

    # Reifenspuren (dunkel poliert) links und rechts der Mittellinie
    for sx in (118.0, 394.0):
        d = np.abs(((xx - sx + N * 0.5) % N) - N * 0.5)
        spur = np.clip(1 - d / 62.0, 0, 1) ** 0.7
        v *= (1 - spur * 0.17)
    v -= np.clip(noise(3, 2835) - 0.52, 0, 1) * 0.09          # Oel/Nasszonen
    v += np.clip(noise(4, 2836) - 0.62, 0, 1) * 0.07          # ausgemagerte Stellen

    # feine Setzrisse im Belag
    riss = np.abs(np.sin(2 * np.pi * (xx * 5 + yy * 13) / N + (noise(4, 2837) - 0.5) * 8.0))
    rissm = np.clip(1 - riss / 0.012, 0, 1) * np.clip(noise(5, 2838) * 1.6 - 0.82, 0, 1) * 3.0
    v -= np.clip(rissm, 0, 1) * 0.09
    v = np.clip(v, 0.02, 1.0)
    rr = v * 1.000; gg = v * 0.995; bb = v * 0.985

    # --- unterbrochene Mittellinie: laeuft in y, leicht wandernd
    lx = 256.0 + np.sin(2 * np.pi * yy * 1 / N) * 2.2 + (noise(3, 2839) - 0.5) * 3.0
    dl = ((xx - lx + N * 0.5) % N) - N * 0.5
    halbb = 6.5
    # Strichraster 256 px (2 Striche je Kachel), Strich 160 / Luecke 96.
    # +80 Versatz -> die Kachelgrenze liegt MITTEN im Strich, nicht am Strichende
    ys_ = (yy + 80.0) % 256.0
    strich = np.clip(ys_ / 2.5, 0, 1) * np.clip((160.0 - ys_) / 2.5, 0, 1)

    kern = np.clip((halbb - np.abs(dl)) / 1.6, 0, 1)
    # ausgefranste Kante (Farbe blaettert vom Rand her ab)
    frans = (feinstruktur(2840, 2, 2) - 0.5) * 2.4 + (noise(8, 2841) - 0.5) * 1.6
    kern = np.clip(kern + frans * np.clip(kern * (1 - kern) * 4, 0, 1) * 0.9, 0, 1)
    farbe = kern * strich

    # abgefahren: Loecher in der Farbe, Mitte staerker als der Rand
    abrieb = np.clip(noise(6, 2842) * 1.5 - 0.62, 0, 1) * 2.2
    abrieb += np.clip(noise(8, 2843) * 1.4 - 0.66, 0, 1) * 1.8
    abrieb *= (0.55 + np.clip(1 - np.abs(dl) / 5.0, 0, 1) * 0.85)
    farbe *= np.clip(1 - abrieb, 0, 1)
    farbe *= (0.55 + np.clip(noise(3, 2844), 0, 1) * 0.75)    # ganze Abschnitte blasser
    farbe = np.clip(farbe, 0, 1)

    # die Farbe liegt AUF dem Splitt -> Korn drueckt durch, Rand leicht erhaben
    weiss = 0.80 + (lit - 0.5) * 0.22 + (feinstruktur(2845, 1, 1) - 0.5) * 0.10
    weiss += np.clip(1 - np.abs(np.abs(dl) - halbb + 1.2) / 1.4, 0, 1) * 0.10
    weiss -= np.clip(noise(7, 2846) - 0.55, 0, 1) * 0.28      # Strassenschmutz
    weiss = np.clip(weiss, 0.10, 1.0)
    rr = rr * (1 - farbe) + farbe * weiss * 1.000
    gg = gg * (1 - farbe) + farbe * weiss * 0.988
    bb = bb * (1 - farbe) + farbe * weiss * 0.945
    speichern("fahrbahnmarkierung", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 3) Graffitiwand
def graffitiwand():
    # --- Untergrund: glatt geschalte Betonwand mit Flecken
    korn = (feinstruktur(2851, 1, 1) - 0.5) * 0.20
    korn += (np.random.default_rng(2852).random((N, N)).astype(np.float32) - 0.5) * 0.10
    v = 0.555 + (noise(6, 2853) - 0.5) * 0.14 + (noise(3, 2854) - 0.5) * 0.13 + korn
    v -= np.clip(noise(4, 2855) - 0.60, 0, 1) * 0.18          # Regenfahnen/Schmutz
    v -= np.clip(feinstruktur(2856, 16, 0) - 0.58, 0, 1) * 0.30
    poren = (np.random.default_rng(2857).random((N, N)).astype(np.float32) > 0.9930) * 0.26
    v -= poren
    # Schalungsstoesse (Wand ist plattenweise geschalt), Versatz -> nicht am Rand
    for sy in (96.0, 352.0):
        d = np.abs(((yy - sy + N * 0.5) % N) - N * 0.5)
        v -= np.clip(1 - d / 1.6, 0, 1) * 0.14
        v += np.clip(1 - np.abs(d - 2.6) / 1.8, 0, 1) * 0.07
    for sx in (64.0, 320.0):
        d = np.abs(((xx - sx + N * 0.5) % N) - N * 0.5)
        v -= np.clip(1 - d / 1.4, 0, 1) * 0.10
    v = np.clip(v, 0.05, 1.0)
    rr = v * 0.995; gg = v * 0.985; bb = v * 0.965

    spk = feinstruktur(2858, 1, 1)                            # Sprueh-Koernung
    spk2 = np.random.default_rng(2859).random((N, N)).astype(np.float32)
    wolke = noise(6, 2860)

    def sprueh(mask, col, deck=1.0):
        """Farbe mit Sprueh-Charakter auflegen: Deckung schwankt, Kante rau."""
        nonlocal rr, gg, bb
        a = np.clip(mask, 0, 1) * deck
        a = a * (0.80 + wolke * 0.34)                          # ungleiche Deckung
        a = np.clip(a, 0, 1)
        f = 0.86 + spk * 0.30 + (noise(7, 2861) - 0.5) * 0.16
        rr = rr * (1 - a) + a * np.clip(col[0] * f, 0, 1.4)
        gg = gg * (1 - a) + a * np.clip(col[1] * f, 0, 1.4)
        bb = bb * (1 - a) + a * np.clip(col[2] * f, 0, 1.4)

    def blob(cy, cx, ry_, rx_, rot, pot, warp_seed):
        """weiche superelliptische Flaeche -> q (0 innen, 1 = Kontur)"""
        dy, dx = wrap_d(cy, cx)
        ca = np.cos(rot); sa = np.sin(rot)
        ux = (dx * ca + dy * sa) / rx_
        uy = (-dx * sa + dy * ca) / ry_
        q = (np.abs(ux) ** pot + np.abs(uy) ** pot) ** (1.0 / pot)
        q = q * (1.0 + (noise(4, warp_seed) - 0.5) * 0.40
                 + (noise(6, warp_seed + 1) - 0.5) * 0.18)
        return q.astype(np.float32)

    def kante(q, w=0.055):
        """Sprueh-Kante: harte Deckung innen, gefranst am Rand + Overspray"""
        a = np.clip((1.0 - q) / w, 0, 1)
        rau = a * (1 - a) * 4.0
        a = np.clip(a + (spk - 0.5) * rau * 1.25, 0, 1)
        dust = np.clip((1.22 - q) / 0.24, 0, 1) * np.clip(spk2 * 1.9 - 0.62, 0, 1) * 1.5
        return np.clip(a, 0, 1), np.clip(dust, 0, 1) * (1 - a)

    PAL = np.array([
        [0.96, 0.20, 0.42],   # magenta
        [0.12, 0.76, 0.95],   # cyan
        [0.98, 0.78, 0.10],   # gelb
        [0.42, 0.86, 0.22],   # lime
        [0.35, 0.28, 0.82],   # ultramarin
        [0.99, 0.46, 0.08],   # orange
        [0.93, 0.93, 0.95],   # weiss
    ], dtype=np.float32)

    # --- 1. Lage: grosser, blasser Untergrund-Wash (alte, uebersprayte Stuecke)
    for cy, cx, ry_, rx_, ro, ci in ((150., 130., 78., 118., 0.35, 4),
                                     (350., 380., 66., 104., -0.25, 0)):
        q = blob(cy, cx, ry_, rx_, ro, 2.6, 2870 + int(cx))
        a, d = kante(q, 0.12)
        sprueh(np.maximum(a * 0.55, d * 0.35), PAL[ci] * 0.55 + 0.20, 1.0)

    # --- 2. Lage: gefuellte Blasen ("throw-ups") mit dunkler Kontur
    blasen = [(196., 148., 62., 92., 0.30, 0, 2880),
              (300., 336., 54., 86., -0.35, 1, 2884),
              (86., 372., 44., 62., 0.55, 2, 2888),
              (404., 96., 40., 70., -0.15, 3, 2892)]
    for cy, cx, ry_, rx_, ro, ci, sd in blasen:
        q = blob(cy, cx, ry_, rx_, ro, 2.4, sd)
        a, d = kante(q, 0.05)
        sprueh(d, PAL[ci] * 0.85, 0.42)                        # Overspray-Hof
        # dunkle Kontur zuerst, dann die Fuellung leicht kleiner
        kont = np.clip(1 - np.abs(q - 1.0) / 0.075, 0, 1)
        kont = np.clip(kont + (spk - 0.5) * kont * (1 - kont) * 3.0, 0, 1)
        sprueh(kont, np.array([0.07, 0.06, 0.09], dtype=np.float32), 1.0)
        fuell = np.clip((0.94 - q) / 0.05, 0, 1)
        fuell = np.clip(fuell + (spk - 0.5) * fuell * (1 - fuell) * 3.0, 0, 1)
        sprueh(fuell, PAL[ci], 1.0)
        # Glanzlicht oben links auf der Blase (typischer Highlight-Strich)
        dy, dx = wrap_d(cy - ry_ * 0.40, cx - rx_ * 0.30)
        hl = np.clip(1 - ((dx / (rx_ * 0.42)) ** 2 + (dy / (ry_ * 0.16)) ** 2), 0, 1) ** 0.6
        sprueh(hl * fuell, PAL[6], 0.75)

    # --- 3. Lage: breite geschwungene Zuege ueber die ganze Wand
    rz = np.random.default_rng(2900)
    zuege = [(1, 0, 5, 0.0), (0, 1, 3, 2.1), (1, 0, 2, 4.0)]
    for k, (laengs, quer, m, ph) in enumerate(zuege):
        c = rz.random() * N
        amp = 34 + rz.random() * 46
        br = 8.0 + rz.random() * 7.0
        col = PAL[(k * 2 + 3) % len(PAL)]
        t_ = yy if laengs else xx
        kurve = c + amp * np.sin(2 * np.pi * t_ * m / N + ph) \
            + 17 * np.sin(2 * np.pi * t_ * (m + 2) / N + ph * 1.7) \
            + (noise(4, 2901 + k) - 0.5) * 26
        d = np.abs((((xx if laengs else yy) - kurve + N * 0.5) % N) - N * 0.5)
        # Strichstaerke variiert entlang der Linie (Dosenabstand)
        brv = br * (0.70 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * t_ * 3 / N + ph)))
        a = np.clip((brv - d) / 1.8, 0, 1)
        a = np.clip(a + (spk - 0.5) * a * (1 - a) * 3.2, 0, 1)
        halo = np.clip((brv + 5.0 - d) / 5.0, 0, 1) * np.clip(spk2 * 1.9 - 0.66, 0, 1) * 1.4
        sprueh(np.clip(halo, 0, 1) * (1 - a), col, 0.40)
        kont = np.clip((brv + 2.4 - d) / 1.4, 0, 1) - a
        sprueh(np.clip(kont, 0, 1), np.array([0.06, 0.05, 0.08], dtype=np.float32), 0.9)
        sprueh(a, col, 1.0)

    # --- 4. Lage: Laeufer/Tropfen unter den Flaechen (Farbe lief herunter)
    rd = np.random.default_rng(2910)
    for i in range(26):
        px_ = rd.random() * N
        py_ = rd.random() * N
        L = 12 + rd.random() * 46
        w = 0.9 + rd.random() * 1.5
        col = PAL[rd.integers(0, len(PAL))]
        dxw = np.abs(((xx - px_ + N * 0.5) % N) - N * 0.5)
        dyw = (yy - py_) % N
        lauf = np.clip((w - dxw) / 0.9, 0, 1) * np.clip((L - dyw) / 3.0, 0, 1) \
            * np.clip(dyw / 1.5, 0, 1)
        # Tropfenkopf am Ende
        dy2, dx2 = wrap_d(py_ + L, px_)
        kopf = np.clip(1 - np.sqrt(dy2 * dy2 + dx2 * dx2) / (w + 1.3), 0, 1)
        sprueh(np.clip(lauf + kopf, 0, 1) * 0.9, col, 1.0)

    # --- 5. Lage: feiner Overspray-Nebel + Dosen-Spritzer ueber alles
    nebel = np.clip(noise(4, 2920) - 0.58, 0, 1) * 1.9
    tro = np.random.default_rng(2921).random((N, N)).astype(np.float32)
    sprit = (tro > 0.9975).astype(np.float32)
    sprit = np.clip(sprit + blur(sprit, 1) * 1.2, 0, 1)
    sprueh(nebel * np.clip(spk2 * 1.7 - 0.62, 0, 1) * 1.4,
           PAL[1] * 0.9, 0.35)
    sprueh(sprit, PAL[2], 0.65)

    # --- Wandalterung ueber allem: die Farbe kreidet aus, Wand schlaegt durch
    kreide = np.clip(noise(3, 2930) - 0.52, 0, 1) * 1.5
    rr = rr * (1 - kreide * 0.20) + kreide * 0.20 * 0.62
    gg = gg * (1 - kreide * 0.20) + kreide * 0.20 * 0.61
    bb = bb * (1 - kreide * 0.20) + kreide * 0.20 * 0.59
    schmutz = np.clip(feinstruktur(2931, 18, 0) - 0.56, 0, 1) * 1.8
    rr *= (1 - schmutz * 0.16); gg *= (1 - schmutz * 0.16); bb *= (1 - schmutz * 0.14)
    speichern("graffitiwand", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 4) Rauputz (Kratzputz beige)
def rauputz():
    r = np.random.default_rng(2941)
    # Grundputz: weiche Welligkeit der abgezogenen Flaeche
    H = (noise(4, 2942) - 0.5) * 1.4 + (noise(6, 2943) - 0.5) * 0.7
    H += (feinstruktur(2944, 1, 1) - 0.5) * 0.55

    # --- Koerner, die beim Abreiben Rillen gezogen haben (das Motiv)
    Hg = np.zeros((N, N), dtype=np.float32)      # Rillen (negativ)
    Hb = np.zeros((N, N), dtype=np.float32)      # Korn am Rillenende (positiv)
    K = 2600
    py = r.random(K) * N
    px = r.random(K) * N
    # Vorzugsrichtung leicht gedreht, aber breit gestreut -> Kratzputz, kein Kamm
    ang = r.normal(0.62, 1.05, K)
    L = 3.5 + r.random(K) ** 1.4 * 13.0
    br = 0.9 + r.random(K) * 0.9
    tief = 0.55 + r.random(K) * 0.85
    kr = 1.1 + r.random(K) * 1.5
    for i in range(K):
        R = int(L[i] + kr[i]) + 3
        ys, xs, dy, dx = patch(py[i], px[i], R)
        ca = np.cos(ang[i]); sa = np.sin(ang[i])
        ux = dx * ca + dy * sa
        uy = -dx * sa + dy * ca
        prof = np.clip(1 - np.abs(uy) / br[i], 0, 1)
        laeng = np.clip((L[i] - np.abs(ux)) / 2.0, 0, 1)
        gro = -(prof ** 0.65) * laeng * tief[i]
        sub = Hg[np.ix_(ys, xs)]
        Hg[np.ix_(ys, xs)] = np.minimum(sub, gro.astype(np.float32))
        # das Korn selbst sitzt am Ende der Rille
        dkk = np.sqrt((ux - L[i]) ** 2 + uy * uy)
        bump = np.clip(1 - dkk / kr[i], 0, 1) ** 0.55 * (0.55 + tief[i] * 0.75)
        sub = Hb[np.ix_(ys, xs)]
        Hb[np.ix_(ys, xs)] = np.maximum(sub, bump.astype(np.float32))

    # zusaetzliche, nicht gezogene Zuschlagkoerner in der Flaeche
    K2 = 2600
    py2 = r.random(K2) * N; px2 = r.random(K2) * N
    rr2 = 0.9 + r.random(K2) ** 1.6 * 2.1
    hh2 = 0.35 + r.random(K2) * 0.75
    for i in range(K2):
        R = int(rr2[i]) + 2
        ys, xs, dy, dx = patch(py2[i], px2[i], R)
        d = np.sqrt(dy * dy + dx * dx)
        bump = np.clip(1 - d / rr2[i], 0, 1) ** 0.5 * hh2[i]
        sub = Hb[np.ix_(ys, xs)]
        Hb[np.ix_(ys, xs)] = np.maximum(sub, bump.astype(np.float32))

    H = H + Hg * 1.05 + Hb * 1.15
    H += (np.random.default_rng(2945).random((N, N)).astype(np.float32) - 0.5) * 0.16

    lit = relief(blur(H, 1), 1.30)                 # Korn/Rille
    weit = relief(blur(H, 9), 0.55)                # Putzwelligkeit
    ao = np.clip(H - blur(H, 4), -3, 3) * 0.115
    sch = schlagschatten(H, 6, 0.34)               # echter Schattenwurf der Koerner

    v = 0.735 + (lit - 0.5) * 0.62 + (weit - 0.5) * 0.26 + ao
    v -= sch * 0.30
    v += (noise(7, 2946) - 0.5) * 0.055
    v *= (0.90 + noise(3, 2947) * 0.22)            # Auftragswolken des Verputzers
    v -= np.clip(noise(4, 2948) - 0.62, 0, 1) * 0.14
    v = np.clip(v, 0.05, 1.10)

    # Beige/Sandton, Vertiefungen etwas kuehler (Schatten)
    kalt = np.clip(0.60 - v, 0, 1) * 1.1
    warm = noise(5, 2949)
    rr = v * (0.935 + warm * 0.055) - kalt * 0.045
    gg = v * (0.855 + warm * 0.040) - kalt * 0.028
    bb = v * (0.700 + warm * 0.030) + kalt * 0.020
    speichern("rauputz", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 5) Rostblech (Stahl, lackiert)
def rostblech():
    # --- Nietreihen + Ueberlappungsstoss als Hoehenfeld
    Hr = np.zeros((N, N), dtype=np.float32)
    niet = np.zeros((N, N), dtype=np.float32)
    # Reihen bei y = 64/192/320/448, Niete alle 32 px ab x = 16
    # -> weder Reihe noch Niet liegt auf der Kachelgrenze
    for ry_ in (64.0, 192.0, 320.0, 448.0):
        for k in range(16):
            cx = 16.0 + k * 32.0
            dy, dx = wrap_d(ry_, cx)
            d = np.sqrt(dy * dy + dx * dx)
            kuppe = np.clip(1 - (d / 4.2) ** 2, 0, 1) ** 0.5
            Hr = np.maximum(Hr, kuppe * 2.6)
            niet = np.maximum(niet, np.clip((4.6 - d) / 1.2, 0, 1))
    # Blechstoss senkrecht bei x = 256 (Mitte, nicht am Rand)
    dsx = ((xx - 256.0 + N * 0.5) % N) - N * 0.5
    stoss = np.clip(1 - np.abs(dsx) / 2.0, 0, 1)
    # Nur ein flacher Ueberlappungsgrat — bei 1.3 leuchtete relief() daraus einen
    # weissen Strich mitten durchs Blech.
    Hr += np.clip((dsx + 2.0) / 3.0, 0, 1) * np.clip((26.0 - dsx) / 6.0, 0, 1) * 0.45

    # Blechbeulen
    beule = (noise(3, 2951) - 0.5) * 1.5 + (noise(5, 2952) - 0.5) * 0.6
    Hm = Hr + beule
    litm = relief(blur(Hm, 1), 1.35)
    schm = schlagschatten(Hm, 6, 0.40)

    # --- blanker/verrosteter Stahl
    walz = (feinstruktur(2953, 0, 6) - 0.5) * 0.16 + (feinstruktur(2954, 1, 1) - 0.5) * 0.16
    stahl = 0.455 + walz + (noise(7, 2955) - 0.5) * 0.10
    stahl += (litm - 0.5) * 0.55 - schm * 0.28

    # Rostnester + davon herunterlaufende Fahnen
    nest = np.clip(noise(5, 2956) * 1.30 - 0.62, 0, 1) * 2.4
    nest += np.clip(noise(7, 2957) * 1.35 - 0.78, 0, 1) * 2.2
    nest = np.clip(nest * 0.75 + blur(nest, 1) * 0.6, 0, 1)
    fahn = np.zeros_like(nest)
    for dd in range(0, 44):
        fahn = np.maximum(fahn, np.roll(nest, dd, axis=0) * (1.0 - dd / 44.0))
    schlier = np.clip(feinstruktur(2958, 20, 0) - 0.46, 0, 1) * 2.2
    rost = np.maximum(nest, fahn * (0.18 + schlier * 0.80))
    # unter jeder Nietreihe laeuft Rost heraus
    for ry_ in (64.0, 192.0, 320.0, 448.0):
        dyr = (yy - ry_) % N
        lauf = np.clip(dyr / 3.0, 0, 1) * np.clip(1 - dyr / 40.0, 0, 1)
        rost = np.maximum(rost, np.clip(lauf * 1.6 * (0.25 + schlier * 0.9), 0, 1)
                          * np.clip(niet * 1.5 + 0.25, 0, 1))
    rost = np.maximum(rost, stoss * np.clip(noise(5, 2959) - 0.44, 0, 1) * 2.6)
    rost = np.clip(rost * (0.45 + noise(6, 2960) * 0.85), 0, 1)
    rost = np.clip(rost * 0.75 + blur(rost, 1) * 0.45, 0, 1)

    # Rost ist narbig -> eigene Mikrostruktur, sonst wirkt er wie Farbe
    narbe = (feinstruktur(2961, 1, 1) - 0.5) * 0.30 + (noise(8, 2962) - 0.5) * 0.26
    narbe += (np.random.default_rng(2963).random((N, N)).astype(np.float32) - 0.5) * 0.16
    rv = 0.42 + narbe + (litm - 0.5) * 0.40 - schm * 0.22
    rv = np.clip(rv, 0.05, 1.0)
    ton = noise(5, 2964)
    r_r = rv * (0.98 + ton * 0.22)
    r_g = rv * (0.475 + ton * 0.170)
    r_b = rv * (0.235 + ton * 0.075)
    dunkelrost = np.clip(noise(4, 2965) - 0.58, 0, 1) * 1.7    # alte, schwarze Zonen
    r_r *= (1 - dunkelrost * 0.45); r_g *= (1 - dunkelrost * 0.50); r_b *= (1 - dunkelrost * 0.45)

    s_r = np.clip(stahl, 0.03, 1.0) * 1.00
    s_g = np.clip(stahl, 0.03, 1.0) * 1.01
    s_b = np.clip(stahl, 0.03, 1.0) * 1.05
    rr = s_r * (1 - rost) + r_r * rost
    gg = s_g * (1 - rost) + r_g * rost
    bb = s_b * (1 - rost) + r_b * rost

    # --- abblaetternde Lackschicht (Industriegruen), Inseln mit scharfem Rand
    hf = noise(3, 2966) * 1.0 + noise(5, 2967) * 0.5 + noise(7, 2968) * 0.22
    hf = (hf - hf.min()) / (hf.max() - hf.min() + 1e-6)
    lack = np.clip((hf - 0.455) * 11.0, 0, 1)
    lack -= np.clip(noise(8, 2969) - 0.60, 0, 1) * 3.0         # Blasen/Loecher
    lack -= np.clip(noise(7, 2970) - 0.64, 0, 1) * 2.6
    lack -= rost * 0.85                                        # wo Rost, kein Lack
    lack -= niet * 0.35
    lack = np.clip(lack, 0, 1)
    lack = np.clip(lack * 1.15 + (feinstruktur(2971, 1, 1) - 0.5)
                   * np.clip(lack * (1 - lack) * 4, 0, 1) * 1.6, 0, 1)

    aufk = np.clip(lack - blur(lack, 2), 0, 1)                 # aufstehende Kante
    schat = np.clip(blur(lack, 2) - lack, 0, 1)                # Schatten daneben
    lackkorn = (feinstruktur(2972, 1, 1) - 0.5) * 0.10
    lv = 0.60 + lackkorn + (litm - 0.5) * 0.42 - schm * 0.22
    lv *= (0.78 + noise(4, 2973) * 0.42)                       # ausgebleicht/kreidig
    lv = np.clip(lv, 0.05, 1.15)
    # Verblasstes Graugruen statt Tuerkis — auf rostigem Stahl las sich das
    # gesaettigte Tuerkis wie Moos, nicht wie alter Industrielack.
    l_r = lv * (0.420 + noise(5, 2974) * 0.09)
    l_g = lv * (0.480 + noise(5, 2974) * 0.07)
    l_b = lv * (0.405 + noise(5, 2974) * 0.05)
    rr = rr * (1 - lack) + l_r * lack
    gg = gg * (1 - lack) + l_g * lack
    bb = bb * (1 - lack) + l_b * lack
    rr += aufk * 0.16; gg += aufk * 0.19; bb += aufk * 0.18
    rr *= (1 - schat * 0.30); gg *= (1 - schat * 0.30); bb *= (1 - schat * 0.28)

    # Niete sitzen ueber allem (Kuppe hell, Kragen dunkel)
    dome = np.clip(niet, 0, 1)
    kuppe_lit = np.clip(relief(blur(Hr, 1), 1.6) - 0.5, -1, 1)
    rr = rr * (1 - dome * 0.55) + dome * 0.55 * np.clip(0.46 + kuppe_lit * 1.4, 0.05, 1.2)
    gg = gg * (1 - dome * 0.55) + dome * 0.55 * np.clip(0.45 + kuppe_lit * 1.4, 0.05, 1.2)
    bb = bb * (1 - dome * 0.55) + dome * 0.55 * np.clip(0.46 + kuppe_lit * 1.4, 0.05, 1.2)
    speichern("rostblech", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 6) Dachpfannen (rote Tonziegel)
def dachpfannen():
    P = 64.0                                  # 8 Wellen (Ziegelspalten) je Kachel
    RH = N / 6.0                              # 6 Ziegelreihen a 85.33 px
    # leichter Handverlege-Versatz
    Xw = xx + (noise(4, 2981) - 0.5) * 3.2 + (noise(7, 2982) - 0.5) * 1.4
    Yw = yy + (noise(4, 2983) - 0.5) * 2.6

    # Viertelversatz in x -> die Kachelgrenze liegt auf der WELLENFLANKE,
    # weder im Wellental (Seitenfalz) noch auf dem Rollscheitel
    u = Xw + P * 0.25
    ph = 2 * np.pi * u / P
    prof = (0.5 + 0.5 * np.cos(ph)) ** 1.75           # schmale Krempe, breite Pfanne

    # halber Reihenversatz -> Kachelgrenze liegt MITTEN im Ziegel, nicht im Stoss
    cyr = (Yw + RH * 0.5) / RH
    iy = np.floor(cyr).astype(int) % 6
    fy = cyr % 1.0
    ix = np.floor(u / P).astype(int) % 8

    h = prof * 3.6
    h += fy * 1.1                                     # Ziegel steigt zum Fuss hin an
    fuss = np.clip(1 - (1 - fy) / 0.055, 0, 1)        # ueberdeckender Fussrand
    h += fuss * 2.0
    kopf = np.clip(1 - fy / 0.075, 0, 1)              # verdeckter Kopf der Reihe
    h -= kopf * 1.5

    # Seitenfalz: schmale Rinne im Wellental
    dv = (u % P) - P * 0.5
    falz = np.clip(1 - np.abs(dv) / 2.6, 0, 1)
    h -= falz * 1.5

    lit = relief(blur(h, 1), 0.95)
    weit = relief(blur(h, 5), 0.42)
    ao = np.clip(h - blur(h, 7), -4, 4) * 0.085
    sch = schlagschatten(h, 9, 0.30)

    r = np.random.default_rng(2984)
    t = r.random((6, 8)).astype(np.float32)[iy, ix]           # 2-D-Fancy-Indexing!
    hue = r.random((6, 8)).astype(np.float32)[iy, ix]
    alt = (r.random((6, 8)).astype(np.float32)[iy, ix] > 0.80).astype(np.float32)

    # Tonoberflaeche: sandig gebrannt, nie glatt
    korn = (feinstruktur(2985, 1, 1) - 0.5) * 0.24
    korn += (np.random.default_rng(2986).random((N, N)).astype(np.float32) - 0.5) * 0.12
    korn += (feinstruktur(2987, 0, 3) - 0.5) * 0.13           # Strangpress-Riefen
    v = 0.700 + t * 0.115 + korn + (noise(7, 2988) - 0.5) * 0.13
    v += (lit - 0.5) * 0.62 + (weit - 0.5) * 0.26 + ao
    v -= sch * 0.26
    v -= kopf * 0.42                                          # Schattenfuge der Reihe
    v -= falz * 0.22
    v -= alt * 0.11
    # Kantenabplatzer an Fuss und Falz
    v -= np.clip(fuss * 1.4 - 0.4, 0, 1) * np.clip(noise(8, 2989) - 0.58, 0, 1) * 1.4
    v -= np.clip(noise(8, 2990) - 0.79, 0, 1) * 0.75
    v = np.clip(v, 0.03, 1.15)

    rr = v * (0.985 + hue * 0.075)
    gg = v * (0.415 + hue * 0.100 + alt * 0.030)
    bb = v * (0.290 + hue * 0.060 + alt * 0.045)

    # Verwitterung: Moos in den Schattenfugen, Kalkausblueh, Russ
    moos = np.clip(noise(5, 2991) - 0.56, 0, 1) * 1.9 * (0.30 + kopf * 1.5 + falz * 1.1)
    moos = np.clip(moos, 0, 1) * (0.35 + noise(7, 2992) * 0.9)
    rr = rr * (1 - moos * 0.55) + moos * 0.55 * 0.255
    gg = gg * (1 - moos * 0.55) + moos * 0.55 * 0.290
    bb = bb * (1 - moos * 0.55) + moos * 0.55 * 0.165
    kalk = np.clip(noise(4, 2993) - 0.62, 0, 1) * 1.9
    rr += kalk * 0.17; gg += kalk * 0.175; bb += kalk * 0.165
    russ = np.clip(noise(3, 2994) - 0.50, 0, 1) * 1.5
    rr *= (1 - russ * 0.22); gg *= (1 - russ * 0.24); bb *= (1 - russ * 0.22)
    # Regenfahnen laengs der Pfanne
    fahne = np.clip(feinstruktur(2995, 16, 0) - 0.56, 0, 1) * 1.9
    rr *= (1 - fahne * 0.13); gg *= (1 - fahne * 0.12); bb *= (1 - fahne * 0.10)
    speichern("dachpfannen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 7) Badfliesen (weiss, glasiert)
def badfliesen():
    G = 8                                     # 8x8 Fliesen a 64 px
    bs = N / G
    X = xx + (noise(5, 3001) - 0.5) * 1.6
    Y = yy + (noise(5, 3002) - 0.5) * 1.6
    # halber Versatz -> Kachelgrenze liegt MITTEN in der Fliese, nicht in der Fuge
    cx = (X + bs * 0.5) / bs
    cy = (Y + bs * 0.5) / bs
    ix = np.floor(cx).astype(int) % G
    iy = np.floor(cy).astype(int) % G
    fx = cx % 1.0; fy = cy % 1.0
    dx_ = np.minimum(fx, 1 - fx)
    dy_ = np.minimum(fy, 1 - fy)

    j = 0.028                                 # halbe Fugenbreite ~1.8 px
    face = np.clip((dy_ - j) / 0.016, 0, 1) * np.clip((dx_ - j) / 0.016, 0, 1)

    r = np.random.default_rng(3003)
    t = r.random((G, G)).astype(np.float32)[iy, ix]
    hue = r.random((G, G)).astype(np.float32)[iy, ix]

    # Fliesenkoerper: leicht ballig gebrannt -> weiche Woelbung + Glasurglanz
    woelb = np.clip(1 - ((fx - 0.5) / 0.5) ** 2, 0, 1) * np.clip(1 - ((fy - 0.5) / 0.5) ** 2, 0, 1)
    h = woelb ** 0.55 * 1.0 + face * 0.4
    lit = relief(blur(h, 2), 2.6)

    glas = 0.885 + t * 0.045 + (noise(6, 3004) - 0.5) * 0.045
    glas += (feinstruktur(3005, 1, 1) - 0.5) * 0.045          # feinste Glasurnarbung
    glas += (lit - 0.5) * 0.30
    # breiter Glanzverlauf ueber die Wand (nahtlose Grosswellen)
    glanz = 0.5 + 0.5 * np.sin(2 * np.pi * (1 * xx + 2 * yy) / N + 0.7)
    glanz = glanz ** 2.0
    glas += glanz * 0.115
    glas += (0.5 + 0.5 * np.sin(2 * np.pi * (3 * xx - 1 * yy) / N + 2.2)) * 0.030
    # Spiegelnde Spitze in der oberen linken Fliesenhaelfte
    spek = np.clip(1 - ((fx - 0.32) ** 2 + (fy - 0.28) ** 2) / 0.045, 0, 1) ** 1.6
    glas += spek * (0.055 + glanz * 0.075)
    # Haarrisse in der Glasur (Craquele) und winzige Nadelstiche
    craq = np.abs(np.sin(2 * np.pi * (X * 17 + Y * 23) / N + (noise(4, 3006) - 0.5) * 9.0))
    craqm = np.clip(1 - craq / 0.010, 0, 1) * np.clip(noise(6, 3007) * 1.6 - 0.92, 0, 1) * 4.0
    glas -= np.clip(craqm, 0, 1) * 0.10
    glas -= (np.random.default_rng(3008).random((N, N)).astype(np.float32) > 0.9975) * 0.22
    # Kantenfase der Fliese
    kant = np.minimum(dy_, dx_)
    glas += np.clip(1 - np.abs(fy - (j + 0.020)) / 0.020, 0, 1) * 0.045
    glas -= np.clip(1 - np.abs(fy - (1 - j - 0.020)) / 0.020, 0, 1) * 0.040
    glas += np.clip(1 - np.abs(fx - (j + 0.020)) / 0.020, 0, 1) * 0.030
    glas -= np.clip(1 - np.abs(fx - (1 - j - 0.020)) / 0.020, 0, 1) * 0.028

    # Fuge: dunkelgrauer Zementmoertel, zurueckversetzt, koernig, teils vergraut
    fug = 0.335 + noise(6, 3009) * 0.115
    fug += (feinstruktur(3010, 1, 1) - 0.5) * 0.16
    fug -= np.clip(1 - kant / j, 0, 1) * 0.075                # Kehle
    fug -= np.clip((fy - (1 - j)) / j, 0, 1) * 0.09
    fug += np.clip((j - fy) / j, 0, 1) * 0.05
    fug -= np.clip(noise(5, 3011) - 0.56, 0, 1) * 0.16        # Schimmel/Schmutz dunkler

    v = fug * (1 - face) + glas * face
    v -= np.clip(1 - np.maximum(dy_ / j, dx_ / j), 0, 1) * (1 - face) * 0.055
    # dezente Kalkschleier auf der Wand (bricht das 8x8-Raster)
    kalk = np.clip(noise(3, 3012) - 0.54, 0, 1) * 1.5
    v += kalk * 0.045 * face
    v *= (0.965 + noise(3, 3013) * 0.075)
    v = np.clip(v, 0.03, 1.05)

    fliese = face > 0.5
    rr = np.where(fliese, v * (0.995 + hue * 0.010), v * 1.000)
    gg = np.where(fliese, v * (0.998 - hue * 0.006), v * 0.985)
    bb = np.where(fliese, v * (0.990 - hue * 0.022), v * 0.960)
    # kalter Reflex des Badezimmerlichts in der Glasur
    rr += spek * face * 0.010
    bb += (glanz * face) * 0.020
    speichern("badfliesen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 8) Auslegware (Nadelfilz)
def auslegware():
    # Flor: kurze, wirre Fasern in mehreren Richtungen -> Filz, kein Rauschen
    f1 = feinstruktur(3021, 1, 1)
    f2 = feinstruktur(3022, 2, 0)
    f3 = feinstruktur(3023, 0, 2)
    f4 = feinstruktur(3024, 1, 2)
    fein = np.random.default_rng(3025).random((N, N)).astype(np.float32)
    v = 0.560 + (f1 - 0.5) * 0.30 + (f2 - 0.5) * 0.22 + (f3 - 0.5) * 0.22 \
        + (f4 - 0.5) * 0.16 + (fein - 0.5) * 0.13

    # Vernadelung: feines Lochraster, per Rauschen aufgeweicht (kein Screen-Look)
    nx = (xx + 4.0) % 8.0 - 4.0
    ny = (yy + 4.0) % 8.0 - 4.0
    stich = np.clip(1 - np.sqrt(nx * nx + ny * ny) / 1.7, 0, 1)
    stich = stich * (0.35 + noise(7, 3026) * 1.1)
    v -= stich * 0.055
    # zweite, versetzte Nadelreihe
    nx2 = (xx + 8.0) % 16.0 - 8.0
    ny2 = (yy + 12.0) % 16.0 - 8.0
    stich2 = np.clip(1 - np.sqrt(nx2 * nx2 + ny2 * ny2) / 2.1, 0, 1)
    v -= stich2 * (0.20 + noise(6, 3027) * 0.9) * 0.035

    # leichte Rippung der Bahn (Nadelfilz laeuft in Bahnrichtung)
    v += (0.5 + 0.5 * np.sin(2 * np.pi * xx * 64 / N)) * 0.018
    v += (feinstruktur(3028, 5, 0) - 0.5) * 0.075

    # Wolkigkeit + begangene Zonen (sonst wirkt Teppich wie eine Farbflaeche)
    v += (noise(4, 3029) - 0.5) * 0.115
    v += (noise(6, 3030) - 0.5) * 0.065
    v -= np.clip(noise(3, 3031) - 0.52, 0, 1) * 0.19          # Laufspur, gedrueckt
    v += np.clip(noise(3, 3032) - 0.62, 0, 1) * 0.13          # aufgestellter Flor
    # Flusen/helle Fremdfasern
    fl = np.clip(feinstruktur(3033, 3, 1) * 1.6 - 0.92, 0, 1) * 2.2
    v += np.clip(fl, 0, 1) * 0.14
    v -= (np.random.default_rng(3034).random((N, N)).astype(np.float32) > 0.9970) * 0.20
    v = np.clip(v, 0.10, 1.05)

    # gedaempftes Grau-Blau, Fasermischung aus kuehlen und warmen Anteilen
    misch = feinstruktur(3035, 1, 1)
    warm = np.clip(noise(5, 3036) - 0.5, -1, 1)
    rr = v * (0.845 + (misch - 0.5) * 0.13 + warm * 0.045)
    gg = v * (0.900 + (misch - 0.5) * 0.09)
    bb = v * (0.985 - (misch - 0.5) * 0.11 - warm * 0.040)
    speichern("auslegware", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 9) Kopfsteinpflaster, nass
def kopfstein_nass():
    r = np.random.default_rng(3041)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    G = 13                                    # 13x13 Steine a 39.4 px
    cell = N / G
    reihen_off = r.random(G).astype(np.float32)      # Reihe fuer Reihe versetzt
    k_id = 0
    zentren = []
    for gy in range(G):
        for gx in range(G):
            # KEIN +0.5 -> die Steinmitte liegt auf der Kachelgrenze, nie die Fuge
            cy = (gy + (r.random() - 0.5) * 0.26) * cell
            cx = (gx + reihen_off[gy] + (r.random() - 0.5) * 0.26) * cell
            rad = cell * (0.50 + r.random() * 0.10)
            nf = int(r.integers(5, 8))
            roff = 0.84 + r.random(nf).astype(np.float32) * 0.26
            poly_stamp(H, ID, FS, k_id, cy, cx, rad, roff,
                       r.random() * 6.283, 0.88 + r.random() * 0.28,
                       r.random() * 6.283, r.random() * 1.3,
                       flach=0.50, kuppe=0.30)
            zentren.append((cy, cx))
            k_id += 1
    KK = k_id

    stein = H > -1e5
    Hc = np.where(stein, H, -2.2).astype(np.float32)
    Hc += (feinstruktur(3042, 1, 1) - 0.5) * 0.35 * stein     # Steinnarbung
    lit = relief(blur(Hc, 1), 0.75)
    fein_lit = relief(Hc, 0.35)
    ao = np.clip(Hc - blur(Hc, 7), -6, 6) * 0.085

    tint = r.random(KK).astype(np.float32)[ID]
    warmk = r.random(KK).astype(np.float32)[ID]
    korn = (feinstruktur(3043, 1, 1) - 0.5) * 0.16 + (noise(8, 3044) - 0.5) * 0.10
    face = 0.335 + tint * 0.235 + korn
    face = face * FS * (0.84 + (lit - 0.5) * 0.60) + ao
    face += (fein_lit - 0.5) * 0.16
    face += np.clip(noise(8, 3045) - 0.78, 0, 1) * 0.30       # helle Bruchstellen
    face -= np.clip(noise(6, 3046) - 0.68, 0, 1) * 0.16

    # Fugen: dunkler, nasser Sand mit feinem Splitt
    fuge = 0.135 + noise(7, 3047) * 0.075 + (feinstruktur(3048, 1, 1) - 0.5) * 0.10
    v = np.where(stein, face, fuge)
    v *= (0.90 + noise(3, 3049) * 0.22)
    v = np.clip(v, 0.02, 1.10)

    rr = v * (1.000 + warmk * 0.055)
    gg = v * (0.985 + warmk * 0.015)
    bb = v * (0.975 - warmk * 0.050)

    # --- Nasse Oberflaeche: alles dunkler und gesaettigter, harte Spitzlichter
    nass = 0.55 + np.clip(noise(3, 3050) - 0.35, 0, 1) * 1.3
    nass = np.clip(nass, 0, 1)
    rr *= (1 - nass * 0.34); gg *= (1 - nass * 0.33); bb *= (1 - nass * 0.27)
    # Spitzlichter deutlich zurueckgenommen: bei voller Staerke brannte JEDER Stein
    # oben weiss aus, das las sich wie Scherben/Eis statt wie nasses Pflaster.
    spek = np.clip(relief(blur(Hc, 1), 1.5) - 0.70, 0, 1) ** 1.7 * 1.15 * stein
    spek += np.clip(fein_lit - 0.68, 0, 1) ** 1.5 * 0.55 * stein
    spek *= (0.35 + nass * 0.70)
    rr += spek * 0.15; gg += spek * 0.17; bb += spek * 0.22

    # --- Pfuetzen in den Senken: glatte, spiegelnde Flaechen
    tief = blur(Hc, 11)
    tief = (tief - tief.min()) / (tief.max() - tief.min() + 1e-6)
    wasserfeld = noise(3, 3051) * 1.0 + noise(5, 3052) * 0.45
    wasserfeld = (wasserfeld - wasserfeld.min()) / (wasserfeld.max() - wasserfeld.min() + 1e-6)
    pf = np.clip((0.46 - wasserfeld) * 6.0, 0, 1) * np.clip((0.62 - tief) * 3.2, 0, 1)
    pf = np.clip(blur(pf, 2) * 1.25, 0, 1)
    # Wasserstand: nur was unter dem Pegel liegt, ist ueberflutet
    pegel = np.clip((0.55 - (Hc + 2.2) / 3.4) * 2.4, 0, 1)
    pf = np.clip(pf * (0.35 + pegel * 0.9), 0, 1)

    # Spiegelbild: kaltes Himmelsgrau mit weichen Wolkenbaendern + Kraeuselung
    krl = np.zeros((N, N), dtype=np.float32)
    for fx_, fy_, amp, phr in [(7, 3, 1.00, 0.4), (-3, 9, 0.85, 2.1),
                               (13, -5, 0.62, 3.9), (5, 15, 0.48, 1.5)]:
        krl += amp * np.sin(2 * np.pi * (fx_ * xx + fy_ * yy) / N + phr)
    krl = blur(krl / 2.95, 1)
    himmel = 0.46 + noise(3, 3053) * 0.30 + krl * 0.085
    hl = np.clip(relief(blur(krl, 1), 2.2) - 0.55, 0, 1) ** 1.2 * 1.6
    p_r = himmel * 0.80 + hl * 0.55
    p_g = himmel * 0.87 + hl * 0.60
    p_b = himmel * 1.00 + hl * 0.68
    # dunkler Rand der Pfuetze (Wasser saugt sich in die Fuge)
    rand = np.clip(blur(pf, 3) - pf, 0, 1) * 2.0
    rr = rr * (1 - pf) + (rr * 0.30 + p_r * 0.78) * pf
    gg = gg * (1 - pf) + (gg * 0.30 + p_g * 0.78) * pf
    bb = bb * (1 - pf) + (bb * 0.30 + p_b * 0.78) * pf
    rr *= (1 - rand * 0.28); gg *= (1 - rand * 0.28); bb *= (1 - rand * 0.24)
    speichern("kopfstein_nass", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 10) Gitterrost (Stahl)
def gitterrost():
    SB = 32.0                                 # Tragstab-Teilung (16 Staebe)
    SQ = 64.0                                 # Querstab-Teilung (8 Staebe)
    # Halber Teilungsversatz: die Staebe sitzen bei x=16 bzw. y=32, die
    # Kachelgrenze laeuft damit durch die MITTE einer Masche -- also durch die
    # groesste ruhige Flaeche, nie durch eine Stabkante. (Erste Fassung hatte
    # die Staebe auf x=0/y=0: mathematisch nahtlos, aber die Naht lag genau im
    # steilsten Helligkeitssprung des Motivs.)
    dxb = (xx % SB) - SB * 0.5
    dyq = (yy % SQ) - SQ * 0.5

    bw = 2.9                                  # halbe Tragstabbreite (5.8 px)
    qw = 2.1                                  # halbe Querstabbreite (4.2 px)

    trag = np.clip((bw - np.abs(dxb)) / 1.1, 0, 1)
    quer = np.clip((qw - np.abs(dyq)) / 1.0, 0, 1)

    # Kerbverzahnung auf den Tragstaebender (Rutschsicherung), Periode 16 px
    ykerb = (yy + 8.0) % 16.0
    kerbe = np.clip((3.0 - ykerb) / 1.0, 0, 1) * np.clip(ykerb / 1.0, 0, 1)
    kerbe = kerbe * trag * (1 - quer)

    H = np.maximum(trag * 1.00, quer * 0.86)
    H -= kerbe * 0.34
    metall = np.clip(np.maximum(trag, quer), 0, 1)

    # Seitenwaende in der Masche: von der Stabkante nach innen dunkler
    randnah = np.clip(np.maximum((np.abs(dxb) - bw) / 4.5, 0) , 0, 1)
    randnah2 = np.clip(np.maximum((np.abs(dyq) - qw) / 4.5, 0), 0, 1)
    tiefe = np.clip(np.minimum(randnah, randnah2), 0, 1)

    lit = relief(blur(H, 1), 1.5)
    fein_lit = relief(H, 0.55)
    sch = schlagschatten(H, 7, 0.20)

    # verzinkter Stahl: matt, mit Zinkblume und Kratzern
    korn = (feinstruktur(3061, 1, 1) - 0.5) * 0.14
    korn += (feinstruktur(3062, 4, 0) - 0.5) * 0.10           # Walzriefen laengs
    zink = (noise(7, 3063) - 0.5) * 0.13 + (noise(5, 3064) - 0.5) * 0.09
    m = 0.575 + korn + zink
    m += (lit - 0.5) * 0.60 + (fein_lit - 0.5) * 0.22
    m += np.clip(1 - np.abs(np.abs(dxb) - (bw - 0.9)) / 0.9, 0, 1) * trag * 0.14   # Grat
    m -= np.clip(1 - np.abs(np.abs(dxb) - (bw - 0.2)) / 0.7, 0, 1) * trag * 0.10
    m -= kerbe * 0.28
    m -= np.clip(quer - trag, 0, 1) * 0.055                   # Querstab liegt tiefer
    # Schmutz, Rostanflug und abgelaufene Blankstellen
    dreck = np.clip(noise(4, 3065) - 0.50, 0, 1) * 1.5
    m -= dreck * 0.20
    blank = np.clip(noise(3, 3066) - 0.60, 0, 1) * 1.7
    m += blank * 0.13
    m -= sch * 0.16
    m = np.clip(m, 0.04, 1.15)

    # Untergrund unter dem Rost: fast schwarz, mit angedeutetem Boden
    grund = 0.055 + noise(5, 3067) * 0.045 + (feinstruktur(3068, 1, 1) - 0.5) * 0.030
    grund = grund * (0.55 + (1 - tiefe) * 0.95)               # Wandung heller als Loch

    v = grund * (1 - metall) + m * metall
    v = np.clip(v, 0.01, 1.15)

    rr = v * 0.985; gg = v * 0.995; bb = v * 1.010
    # Rostanflug an den Querstabkreuzungen (dort steht Wasser)
    kreuz = np.clip(trag * quer * 1.4, 0, 1)
    rost = np.clip(noise(5, 3069) - 0.48, 0, 1) * 2.0 * (0.20 + kreuz * 1.4)
    rost = np.clip(rost * (0.4 + noise(7, 3070) * 0.9), 0, 0.8) * metall
    rr = rr * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.90
    gg = gg * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.47
    bb = bb * (1 - rost) + rost * np.clip(v * 1.05, 0, 1) * 0.24
    # kalter Himmelsreflex auf den Stabkanten
    kante_hl = np.clip(fein_lit - 0.60, 0, 1) ** 1.2 * 1.5 * metall
    rr += kante_hl * 0.16; gg += kante_hl * 0.18; bb += kante_hl * 0.22
    speichern("gitterrost", np.stack([rr, gg, bb], -1))


ALLE = (gehwegplatten, fahrbahnmarkierung, graffitiwand, rauputz, rostblech,
        dachpfannen, badfliesen, auslegware, kopfstein_nass, gitterrost)


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
    print("Textur-Charge th28 (Stadtdetails: Gehweg/Fassade/Innenraum):")
    for fn in ALLE:
        fn()
    nahtpruefung()
    print("fertig ->", OUT)
