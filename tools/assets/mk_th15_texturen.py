# -*- coding: utf-8 -*-
"""Textur-Charge 7 (th15) fuer Hafen, Park, Bahn und Bauernhof:
Wasser, Gleisschotter, Kies, Acker, Blumenwiese, Herbstlaub, Schnee,
Holzdeck, Ziegelmauer, Wellblech.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

FALLEN (teuer gelernt, gelten weiter):
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
 * STRUKTUR-RASTER IMMER UM EINE HALBE EINHEIT VERSETZEN, damit die
   Kachelgrenze nicht in einer Fuge/Naht/Rille des Motivs liegt -- sonst
   sieht die (mathematisch korrekte) Naht wie ein Fehler aus.
   Betrifft hier: acker_furchen, holzdeck, ziegelmauer_rot, wellblech.
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th15"
os.makedirs(OUT, exist_ok=True)
N = 512

BILDER = {}          # name -> (N,N,3) float, fuer die Nahtpruefung


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
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Halme/Fasern/Korn."""
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


# ------------------------------------------------ 1) Wasser (Hafenbecken)
def wasser():
    # Domain-Warp aus periodischen Feldern -> Wellen laufen nicht schnurgerade
    wA = (noise(4, 1501) - 0.5); wB = (noise(4, 1502) - 0.5)
    X = xx + wA * 26.0 + (noise(6, 1503) - 0.5) * 8.0
    Y = yy + wB * 26.0 + (noise(6, 1504) - 0.5) * 8.0

    # Duenungsfeld: viele Richtungen, ausschliesslich ganzzahlige Frequenzen
    wellen = [(3, 1, 1.00, 0.30), (1, 3, 0.82, 1.90), (4, -2, 0.62, 2.70),
              (-2, 5, 0.52, 0.80), (6, 3, 0.36, 4.10), (3, -7, 0.30, 5.20),
              (9, 2, 0.20, 1.10), (2, -10, 0.17, 3.30), (13, 5, 0.11, 2.20),
              (-6, 12, 0.10, 4.80)]
    h = np.zeros((N, N), dtype=np.float32); tot = 0.0
    for fx_, fy_, amp, ph in wellen:
        h += amp * np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph)
        tot += amp
    h /= tot
    # Kraeuselung auf den Wellen (feine Windriffel)
    h += (noise(7, 1505) - 0.5) * 0.40
    h += (feinstruktur(1506, 1, 2) - 0.5) * 0.16

    # Kaemme aufsteilen (Wellenkamm scharf, Tal weich) -- Gerstner-Anmutung
    hn = (h - h.min()) / (h.max() - h.min() + 1e-6)
    kamm = np.clip((hn - 0.60) / 0.40, 0, 1) ** 1.4

    lit = relief(blur(h, 1), 9.0)
    spek = np.clip(lit - 0.62, 0, 1) ** 1.7 * 2.4
    spek += np.clip(relief(h, 16.0) - 0.85, 0, 1) ** 2.0 * 1.6

    # Schaumspitzen: nur auf den steilsten Kaemmen, fleckig aufgeloest
    schaum_r = feinstruktur(1507, 1, 1)
    schaum = kamm ** 2.2 * np.clip(noise(6, 1508) * 1.5 - 0.42, 0, 1) * 2.2
    schaum = np.clip(schaum * (0.35 + schaum_r * 1.3), 0, 1)
    schaum = np.clip(schaum + blur(schaum, 1) * 0.6, 0, 1)

    # Tiefenfarbe: dunkles Petrol im Tal, mittleres Blau auf der Flaeche
    tief = 0.35 + hn * 0.65
    gross = noise(3, 1509)
    rr = 0.035 + tief * 0.085 + gross * 0.030
    gg = 0.185 + tief * 0.240 + gross * 0.055
    bb = 0.315 + tief * 0.300 + gross * 0.060
    # Reflex des Himmels auf den Wellenflanken
    rr += spek * 0.30 + kamm * 0.045
    gg += spek * 0.42 + kamm * 0.085
    bb += spek * 0.46 + kamm * 0.105
    # Schaum weiss-blaeulich
    rr = rr * (1 - schaum) + schaum * 0.90
    gg = gg * (1 - schaum) + schaum * 0.95
    bb = bb * (1 - schaum) + schaum * 0.99
    speichern("wasser", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 2) Gleisschotter (Bahnkoerper)
def gleisschotter():
    r = np.random.default_rng(1511)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)          # Facetten-Helligkeit

    # zwei Groessenklassen: kleine fuellen die Luecken, grosse liegen oben auf
    K1, K2 = 520, 190
    K = K1 + K2
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = np.concatenate([4.5 + r.random(K1).astype(np.float32) ** 1.5 * 6.0,
                          10.0 + r.random(K2).astype(np.float32) ** 1.3 * 13.0])
    z = np.concatenate([r.random(K1).astype(np.float32) * 2.0,
                        2.4 + r.random(K2).astype(np.float32) * 3.2])
    ani = 0.60 + r.random(K).astype(np.float32) * 0.85
    rot = r.random(K).astype(np.float32) * np.pi
    kant = r.integers(4, 8, K)
    pha = r.random(K).astype(np.float32) * 6.283

    for i in range(K):
        R = int(rad[i] * 1.7) + 2
        ys, xs, dy, dx = patch(cy[i], cx[i], R)
        ca = np.cos(rot[i]); sa = np.sin(rot[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        d = np.sqrt((ux * ani[i]) ** 2 + (uy / ani[i]) ** 2)
        th = np.arctan2(uy, ux)
        # kantiger Bruchstein: facettierter Radius statt Kreis
        re = rad[i] * (0.84 + 0.20 * np.cos(th * kant[i] + pha[i])
                       + 0.09 * np.cos(th * 2.0 + pha[i] * 1.7))
        t = np.clip(1 - d / np.maximum(re, 1e-3), 0, 1)
        hh = z[i] + (t ** 0.42) * rad[i] * 0.52 * (0.82 + 0.26 * np.cos(2 * th + pha[i]))
        hh = np.where(t > 0, hh, -1e6).astype(np.float32)
        # gequantelte Facetten -> Bruchflaechen fangen Licht unterschiedlich
        fs = 0.74 + 0.42 * ((np.floor((th + pha[i]) / (2 * np.pi / kant[i]))
                             * 0.7 + pha[i]) % 1.0)

        sub = H[np.ix_(ys, xs)]
        upd = hh > sub
        H[np.ix_(ys, xs)] = np.where(upd, hh, sub)
        sI = ID[np.ix_(ys, xs)]
        ID[np.ix_(ys, xs)] = np.where(upd, i, sI)
        sF = FS[np.ix_(ys, xs)]
        FS[np.ix_(ys, xs)] = np.where(upd, fs, sF).astype(np.float32)

    stein = H > -1e5
    Hc = np.where(stein, H, 0.0).astype(np.float32)
    lit = relief(blur(Hc, 1), 0.85)
    ao = np.clip(Hc - blur(Hc, 7), -6, 6) * 0.055

    tint = r.random(K).astype(np.float32)[ID]
    warm = r.random(K).astype(np.float32)[ID]
    rau = (feinstruktur(1512, 1, 1) - 0.5) * 0.17 + (noise(8, 1513) - 0.5) * 0.13
    face = 0.32 + tint * 0.36 + rau
    face = face * FS * (0.62 + lit * 0.62) + ao
    face += np.clip(noise(7, 1514) - 0.74, 0, 1) * 0.35        # helle Bruchkanten
    face -= np.clip(noise(6, 1515) - 0.70, 0, 1) * 0.28        # dunkle Schattenseiten

    # Feinanteil / Schotterbett zwischen den Steinen
    fein = 0.115 + noise(6, 1516) * 0.085 + (feinstruktur(1517, 1, 1) - 0.5) * 0.10
    v = np.where(stein, face, fein)
    v = np.clip(v, 0.03, 1.0)

    rr = v * (1.00 + warm * 0.055) * np.where(stein, 1.0, 0.95)
    gg = v * (0.985 + warm * 0.020)
    bb = v * (0.965 - warm * 0.055)
    speichern("gleisschotter", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 3) Kies fein (Parkweg)
def kies_fein():
    r = np.random.default_rng(1521)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)

    K = 2100
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = 2.0 + r.random(K).astype(np.float32) ** 1.9 * 5.4
    z = r.random(K).astype(np.float32) * 1.6
    ani = 0.70 + r.random(K).astype(np.float32) * 0.6
    rot = r.random(K).astype(np.float32) * np.pi
    kant = r.integers(3, 7, K)
    pha = r.random(K).astype(np.float32) * 6.283

    for i in range(K):
        R = int(rad[i] * 1.8) + 2
        ys, xs, dy, dx = patch(cy[i], cx[i], R)
        ca = np.cos(rot[i]); sa = np.sin(rot[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        d = np.sqrt((ux * ani[i]) ** 2 + (uy / ani[i]) ** 2)
        th = np.arctan2(uy, ux)
        re = rad[i] * (0.88 + 0.15 * np.cos(th * kant[i] + pha[i]))
        t = np.clip(1 - d / np.maximum(re, 1e-3), 0, 1)
        hh = z[i] + (t ** 0.5) * rad[i] * 0.62
        hh = np.where(t > 0, hh, -1e6).astype(np.float32)
        sub = H[np.ix_(ys, xs)]
        upd = hh > sub
        H[np.ix_(ys, xs)] = np.where(upd, hh, sub)
        sI = ID[np.ix_(ys, xs)]
        ID[np.ix_(ys, xs)] = np.where(upd, i, sI)

    korn = H > -1e5
    Hc = np.where(korn, H, 0.0).astype(np.float32)
    lit = relief(Hc, 1.5)
    ao = np.clip(Hc - blur(Hc, 4), -4, 4) * 0.07

    tint = r.random(K).astype(np.float32)[ID]
    warm = r.random(K).astype(np.float32)[ID]
    v = 0.55 + tint * 0.30
    v = v * (0.70 + lit * 0.52) + ao
    v += (feinstruktur(1522, 1, 1) - 0.5) * 0.11 + (noise(8, 1523) - 0.5) * 0.07

    # Sand/Splitt-Bett zwischen den Koernern (heller Kalkkies)
    bett = 0.44 + noise(7, 1524) * 0.12 + (feinstruktur(1525, 1, 1) - 0.5) * 0.14
    v = np.where(korn, v, bett)
    # begangener Weg: grossflaechige Aufhellung/Verdichtung
    v *= (0.90 + noise(3, 1526) * 0.26)
    v -= np.clip(noise(4, 1527) - 0.68, 0, 1) * 0.22          # feuchte/dunkle Stellen
    v = np.clip(v, 0.06, 1.0)

    rr = v * (1.00 + warm * 0.030)
    gg = v * (0.965 + warm * 0.010)
    bb = v * (0.895 - warm * 0.040)
    speichern("kies_fein", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 4) Acker mit Furchen
def acker_furchen():
    F = 10                                   # 10 Furchen je Kachel (51.2 px)
    # Warp aus periodischen Feldern -> Furchen laufen nicht schnurgerade
    warp = (noise(3, 1531) - 0.5) * 26.0 + (noise(5, 1532) - 0.5) * 10.0
    # +N/(4F): Viertelversatz -> die Kachelgrenze liegt auf der FLANKE,
    # weder in der Furchensohle noch auf dem Kamm (Naht faellt nicht auf)
    u = xx + warp + N / (4.0 * F)
    ph = 2 * np.pi * u * F / N
    prof = np.cos(ph)
    tiefe = 0.70 + noise(2, 1533) * 0.62      # Furche mal tiefer, mal flacher
    h = (0.5 + 0.5 * prof) ** 1.35 * tiefe    # Kamm rund, Sohle breit/flach

    # Schollen und Krumen (das Motiv darf nicht wie Wellblech wirken)
    scholl = (noise(6, 1534) - 0.5) * 0.55 + (noise(8, 1535) - 0.5) * 0.30
    h += scholl * 0.55
    h += (feinstruktur(1536, 1, 1) - 0.5) * 0.22
    # Pflugschollen als kurze Querbrocken auf den Kaemmen
    brock = np.clip(np.sin(2 * np.pi * (yy * 26 + warp * 0.7) / N
                           + (noise(5, 1537) - 0.5) * 6.0), 0, 1) ** 2
    h += brock * (0.5 + 0.5 * prof) * 0.22

    lit = relief(blur(h, 1), 5.0)
    ao = np.clip(h - blur(h, 6), -1, 1)

    v = 0.36 + h * 0.30 + (lit - 0.5) * 0.42 + ao * 0.30
    v += (noise(7, 1538) - 0.5) * 0.09
    v -= np.clip(noise(4, 1539) - 0.58, 0, 1) * 0.20          # feuchte dunkle Schollen
    v = np.clip(v, 0.05, 1.0)

    rr = v * 0.98
    gg = v * (0.705 + h * 0.055)
    bb = v * (0.500 + h * 0.045)
    # kuehle, feuchte Furchensohle
    kalt = np.clip(0.30 - h, 0, 1) * 1.6
    rr -= kalt * 0.030; bb += kalt * 0.020

    # Strohreste / Ernterueckstaende: wenige helle kurze Striche
    r = np.random.default_rng(1540)
    Ks = 150
    stroh = np.zeros((N, N), dtype=np.float32)
    py = r.random(Ks) * N; px = r.random(Ks) * N
    laenge = 4 + r.random(Ks) * 9
    winkel = r.random(Ks) * np.pi
    for i in range(Ks):
        R = int(laenge[i]) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        ca = np.cos(winkel[i]); sa = np.sin(winkel[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        m = (np.abs(ux) < laenge[i]) & (np.abs(uy) < 0.8)
        sub = stroh[np.ix_(ys, xs)]
        stroh[np.ix_(ys, xs)] = np.where(m, 1.0, sub)
    stroh = np.clip(stroh * 0.75 + blur(stroh, 1) * 0.5, 0, 1) * (0.5 + h * 0.6)
    rr = rr * (1 - stroh) + stroh * 0.60
    gg = gg * (1 - stroh) + stroh * 0.52
    bb = bb * (1 - stroh) + stroh * 0.33
    speichern("acker_furchen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 5) Blumenwiese
def wiese_blumen():
    # Halme: pixelfeines Rauschen in mehrere Richtungen verschmiert
    h1 = feinstruktur(1551, wy=4, wx=0)
    h2 = feinstruktur(1552, wy=3, wx=1)
    h3 = feinstruktur(1553, wy=1, wx=3)
    buesch = feinstruktur(1554, 1, 1)
    v = 0.50 + (h1 - 0.5) * 0.46 + (h2 - 0.5) * 0.26 + (h3 - 0.5) * 0.18 \
        + (buesch - 0.5) * 0.20
    # Grasbueschel / Wuchsdichte gross moduliert (sonst wirkt es wie Filz)
    v += (noise(4, 1555) - 0.5) * 0.22 + (noise(6, 1556) - 0.5) * 0.13
    v -= np.clip(noise(5, 1557) - 0.66, 0, 1) * 0.30          # Schattenluecken
    v = np.clip(v, 0.10, 1.30)

    trocken = np.clip(noise(5, 1558) - 0.58, 0, 1) * 1.6      # vertrocknete Halme
    rr = v * (0.255 + trocken * 0.42 + noise(7, 1559) * 0.075)
    gg = v * (0.760 + trocken * 0.11)
    bb = v * (0.215 + trocken * 0.10)
    # Klee/dunkelgruene Inseln
    klee = np.clip(noise(4, 1560) - 0.62, 0, 1) * 1.5
    rr -= klee * 0.035; gg -= klee * 0.055; bb -= klee * 0.010

    # --- Bluetchen: weiss (Gaensebluemchen), gelb (Hahnenfuss), lila (Glockenblume)
    pal = np.array([[0.97, 0.96, 0.92],
                    [0.99, 0.86, 0.16],
                    [0.68, 0.45, 0.86]], dtype=np.float32)
    kern = np.array([[0.98, 0.80, 0.12],
                     [0.95, 0.62, 0.06],
                     [0.96, 0.90, 0.45]], dtype=np.float32)
    r = np.random.default_rng(1561)
    K = 300
    py = r.random(K) * N; px = r.random(K) * N
    art = r.integers(0, 3, K)
    rad = 2.0 + r.random(K) * 2.6
    blatt = r.integers(5, 9, K)
    pha = r.random(K) * 6.283
    helle = 0.82 + r.random(K) * 0.26

    for i in range(K):
        R = int(rad[i] * 2.2) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        d = np.sqrt(dy * dy + dx * dx)
        th = np.arctan2(dy, dx)
        re = rad[i] * (0.72 + 0.34 * np.abs(np.cos(blatt[i] * 0.5 * th + pha[i])))
        m = d < re
        if not m.any():
            continue
        c = pal[art[i]] * helle[i]
        kc = kern[art[i]] * helle[i]
        km = d < rad[i] * 0.36
        f = 0.86 + 0.22 * np.clip((re - d) / 1.6, 0, 1)
        for ch, cv, kv in ((0, c[0], kc[0]), (1, c[1], kc[1]), (2, c[2], kc[2])):
            tgt = (rr, gg, bb)[ch]
            sub = tgt[np.ix_(ys, xs)]
            neu = np.where(km, kv, cv * f)
            tgt[np.ix_(ys, xs)] = np.where(m, neu, sub)

    speichern("wiese_blumen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 6) Herbstlaub (Waldboden)
def herbstlaub():
    # Waldboden darunter: dunkle Humuserde mit Krumen
    boden = 0.20 + noise(6, 1571) * 0.16 + (feinstruktur(1572, 1, 1) - 0.5) * 0.16
    rr = boden * 1.00; gg = boden * 0.74; bb = boden * 0.50

    pal = np.array([
        [0.72, 0.17, 0.09],   # feuerrot
        [0.85, 0.38, 0.07],   # orange
        [0.86, 0.62, 0.12],   # goldgelb
        [0.62, 0.30, 0.10],   # rostbraun
        [0.48, 0.31, 0.14],   # lehmbraun
        [0.76, 0.50, 0.16],   # ocker
        [0.55, 0.14, 0.10],   # dunkelrot
        [0.36, 0.23, 0.11],   # altbraun
    ], dtype=np.float32)

    r = np.random.default_rng(1573)
    K = 620
    H = np.full((N, N), -1e6, dtype=np.float32)
    py = r.random(K) * N; px = r.random(K) * N
    a = 8.0 + r.random(K) * 13.0                    # halbe Laenge
    bb_ = 0.42 + r.random(K) * 0.36                 # Breitenverhaeltnis
    rot = r.random(K) * np.pi
    idx = r.integers(0, len(pal), K)
    helle = 0.78 + r.random(K) * 0.44
    lapp = r.integers(3, 8, K)
    pha = r.random(K) * 6.283
    z = r.random(K) * 3.0
    fein_n = noise(8, 1574)
    korn = feinstruktur(1575, 1, 1)

    for i in range(K):
        R = int(a[i] * 1.5) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        ca = np.cos(rot[i]); sa = np.sin(rot[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        # Blattkontur: Ellipse mit Lappen und leichter Spitze
        sx = ux / a[i]; sy = uy / (a[i] * bb_[i])
        th = np.arctan2(sy, sx)
        e = np.sqrt(sx * sx + sy * sy)
        kontur = 1.0 + 0.16 * np.cos(lapp[i] * th + pha[i]) - 0.10 * np.cos(th) ** 2
        m = e < kontur
        if not m.any():
            continue
        hh = z[i] + (1.0 - np.clip(e / kontur, 0, 1)) * 1.1
        hh = np.where(m, hh, -1e6).astype(np.float32)
        subH = H[np.ix_(ys, xs)]
        upd = hh > subH
        if not upd.any():
            continue
        H[np.ix_(ys, xs)] = np.where(upd, hh, subH)

        # Wölbung des Blattes + Mittelrippe + Seitenadern
        woelb = 0.86 + 0.26 * np.cos(sy * 2.4)
        rippe = np.clip(1 - np.abs(uy) / 1.1, 0, 1)
        adern = np.clip(1 - np.abs(np.sin(ux * 0.55 + uy * 1.5 + pha[i])) * 7.0, 0, 1) * 0.5
        rand = np.clip((kontur - e) / 0.16, 0, 1)          # dunkler, trockener Rand
        f = woelb * (0.70 + rand * 0.34) + rippe * 0.20 + adern * 0.11
        f = f * (0.88 + fein_n[np.ix_(ys, xs)] * 0.24) * helle[i]
        c = pal[idx[i]]
        for ch, cv in ((0, c[0]), (1, c[1]), (2, c[2])):
            tgt = (rr, gg, bb)[ch]
            sub = tgt[np.ix_(ys, xs)]
            tgt[np.ix_(ys, xs)] = np.where(upd, cv * f, sub)

    # Kontaktschatten zwischen den Blattlagen + Streulicht
    Hc = np.where(H > -1e5, H, -0.6).astype(np.float32)
    ao = np.clip(Hc - blur(Hc, 5), -3, 3) * 0.085
    lit = (relief(blur(Hc, 1), 0.55) - 0.5) * 0.42
    s = 1.0 + ao + lit + (korn - 0.5) * 0.10
    rr = rr * s; gg = gg * s; bb = bb * s
    # feuchte, dunkle Zonen (Waldboden ist nie gleichmaessig)
    d = np.clip(noise(3, 1576) - 0.52, 0, 1) * 0.75
    rr *= (1 - d * 0.42); gg *= (1 - d * 0.44); bb *= (1 - d * 0.40)
    speichern("herbstlaub", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 7) Schnee (Decke mit Verwehungen)
def schnee():
    # Verwehungen: grosse, weiche Duenen + windgetriebene Riffel
    d1 = noise(3, 1581); d2 = noise(5, 1582)
    warp = (noise(4, 1583) - 0.5) * 34.0
    riffel = np.sin(2 * np.pi * ((xx * 3 + yy * 7) + warp * 3.0) / N * 5.0)
    h = d1 * 1.00 + d2 * 0.34 + (0.5 + 0.5 * riffel) * 0.11 * (0.4 + d1 * 0.8)
    # Windkanten: Verwehung bricht scharf ab (Kamm auf der Leeseite)
    kante = np.clip((d1 - 0.56) / 0.06, 0, 1)
    h += kante * 0.10
    # feine Koernung (Firn) + Kristallfunkeln
    h += (feinstruktur(1584, 1, 1) - 0.5) * 0.055
    h += (noise(8, 1585) - 0.5) * 0.045

    lit = relief(blur(h, 1), 7.0)
    ao = np.clip(h - blur(h, 9), -1, 1)
    korn = feinstruktur(1586, 1, 1)

    v = 0.80 + (lit - 0.5) * 0.30 + ao * 0.55 + (korn - 0.5) * 0.075
    v += (h - 0.5) * 0.055
    v = np.clip(v, 0.42, 1.0)

    # Schatten im Schnee sind blau, Licht ist neutralweiss
    sch = np.clip(0.86 - v, 0, 1)
    rr = v * 0.975 - sch * 0.075
    gg = v * 0.990 - sch * 0.035
    bb = v * 1.000 + sch * 0.030

    # Eiskristall-Funkeln: sehr wenige, sehr kleine Spitzlichter
    r = np.random.default_rng(1587)
    fk = (r.random((N, N)).astype(np.float32) > 0.9982).astype(np.float32)
    fk = fk * (0.45 + r.random((N, N)).astype(np.float32) * 0.55)
    fk = np.clip(fk + blur(fk, 1) * 1.6, 0, 1) * np.clip((v - 0.72) * 3.0, 0, 1)
    rr += fk * 0.30; gg += fk * 0.31; bb += fk * 0.33
    speichern("schnee", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 8) Holzdeck (Steg, verwittert)
def holzdeck():
    B = 6                                     # 6 Dielen a 85.33 px
    bw = N / B
    # halber Versatz -> Kachelgrenze liegt in der Dielenmitte, nicht in der Fuge
    xb = (xx + bw * 0.5) % N
    ib = np.floor(xb / bw).astype(int) % B
    bf = (xb % bw) / bw
    r = np.random.default_rng(1591)
    ph = (r.random(B).astype(np.float32) * 300.0)[ib]
    to = (r.random(B).astype(np.float32))[ib]          # Grauton je Diele
    yo = (r.random(B).astype(np.float32) * 256.0)[ib]  # Stossversatz je Diele
    cup = (r.random(B).astype(np.float32))[ib]         # Schuesselung je Diele

    # Laengsmaserung (Faser laeuft in y) mit Domain-Warp in x
    w1 = (noise(3, 1592) - 0.5) * 26.0 + (noise(5, 1593) - 0.5) * 10.0
    gx = xx + w1 + ph
    m1 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 84 / N)
    m2 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 26 / N + 1.1)
    m3 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 176 / N + 2.4)
    laengs = feinstruktur(1594, wy=10, wx=0)
    fein = feinstruktur(1595, wy=3, wx=0)

    ringe = m1 ** 3.0 * 0.13 + m2 ** 2.6 * 0.10 + m3 ** 5.0 * 0.045
    ringe = blur(ringe, 1, 0)
    v = 0.60 + to * 0.13 - (1 - to) * 0.07
    v -= ringe
    v += (laengs - 0.5) * 0.24 + (fein - 0.5) * 0.085
    v += (noise(4, 1596) - 0.5) * 0.10

    # Schuesselung der Diele (Rand hoch, Mitte tief) -> plastisch statt flach
    woelb = np.cos(2 * np.pi * (bf - 0.5)) * 0.5 + 0.5
    v += (woelb - 0.5) * (0.10 + cup * 0.10)

    # Witterungsrisse laengs (Trockenrisse), duenn und unregelmaessig
    riss = np.clip(np.abs(np.sin(2 * np.pi * (gx * 21 / N) + (noise(4, 1597) - 0.5) * 5.0)), 0, 1)
    rissm = np.clip(1 - riss / 0.035, 0, 1) * np.clip(noise(4, 1598) * 1.6 - 0.62, 0, 1) * 2.0
    rissm = np.clip(rissm, 0, 1) * np.clip(feinstruktur(1599, 9, 0) * 1.7 - 0.55, 0, 1) * 2.2
    v -= np.clip(rissm, 0, 1) * 0.30

    # Astloecher
    ast = np.clip(noise(7, 1600) - 0.80, 0, 1) * 1.9
    v -= ast * 0.28

    # Fugen zwischen den Dielen + Fasenlicht
    kant = np.minimum(bf, 1 - bf) * bw
    fuge = np.clip(1 - kant / 2.2, 0, 1)
    fase = np.clip(1 - np.abs(kant - 4.0) / 3.0, 0, 1)
    v = v * (1 - fuge * 0.62) + fase * 0.055

    # Stossfugen der Dielenenden alle 256 px, je Diele versetzt
    ys = (yy + yo) % 256.0
    stoss = np.clip(1 - np.minimum(ys, 256 - ys) / 1.4, 0, 1)
    v = v * (1 - stoss * 0.42)

    # Schrauben paarweise vor jedem Stoss
    for sy in (10.0, 246.0):
        for sx in (0.30, 0.70):
            ds = np.sqrt(((ys - sy + 128) % 256 - 128) ** 2 + ((bf - sx) * bw) ** 2)
            v = np.where(ds < 1.9, v * 0.55, v)
            v = np.where((ds >= 1.9) & (ds < 3.0), v * 1.12, v)

    # Graue Patina + Algen/Moosschleier in den Fugen
    pat = np.clip(noise(4, 1601) - 0.40, 0, 1) * 1.3
    v = np.clip(v, 0.04, 1.05)

    warmton = (1 - pat) * (0.5 + to * 0.5)
    rr = v * (0.780 + warmton * 0.140)
    gg = v * (0.760 + warmton * 0.085)
    bb = v * (0.720 + warmton * 0.010)
    # gruener Algenanflug entlang der Fugen
    alg = np.clip(noise(5, 1602) - 0.56, 0, 1) * 1.8 * np.clip(fuge * 2.2 + 0.15, 0, 1)
    rr -= alg * 0.055; gg -= alg * 0.020; bb -= alg * 0.070
    speichern("holzdeck", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 9) Ziegelmauer rot (Laeuferverband)
def ziegelmauer_rot():
    RW, CL = 8, 4                             # 8 Schichten a 64 px, 4 Steine a 128 px
    bh = N / RW; bwid = N / CL
    # leichte Unregelmaessigkeit der Lager-/Stossfugen (handvermauert)
    X = xx + (noise(5, 1611) - 0.5) * 3.2 + (noise(7, 1612) - 0.5) * 1.4
    Y = yy + (noise(5, 1613) - 0.5) * 2.4 + (noise(7, 1614) - 0.5) * 1.0

    # halber Versatz in beiden Achsen -> Kachelgrenze liegt MITTEN im Stein,
    # nicht in einer Fuge (sonst sieht die Naht aus wie ein Fehler)
    cy = (Y + bh * 0.5) / bh
    iy = np.floor(cy).astype(int) % RW
    fy = cy % 1.0
    cx = (X + bwid * 0.5) / bwid + (iy % 2) * 0.5      # Laeuferverband
    ix = np.floor(cx).astype(int) % CL
    fx = cx % 1.0

    dy_ = np.minimum(fy, 1 - fy)              # Abstand zur Lagerfuge (in Einheiten)
    dx_ = np.minimum(fx, 1 - fx)              # Abstand zur Stossfuge
    jy = 0.052; jx = 0.026                    # halbe Fugenbreite (~3.3 px)
    face = np.clip((dy_ - jy) / 0.013, 0, 1) * np.clip((dx_ - jx) / 0.007, 0, 1)

    r = np.random.default_rng(1615)
    t = r.random((RW, CL)).astype(np.float32)[iy, ix]          # 2-D-Fancy-Indexing!
    hue = r.random((RW, CL)).astype(np.float32)[iy, ix]
    dunkel = (r.random((RW, CL)).astype(np.float32) > 0.86)[iy, ix]   # Brandsteine

    sand = (feinstruktur(1616, 1, 1) - 0.5) * 0.17
    wolke = noise(6, 1617); grob = noise(8, 1618)
    stein = 0.62 + t * 0.20 + (wolke - 0.5) * 0.20 + (grob - 0.5) * 0.13 + sand
    stein -= dunkel * 0.20
    # Poren / Ausbrueche
    poren = (np.random.default_rng(1619).random((N, N)).astype(np.float32) > 0.9955) * 0.30
    stein -= poren
    stein -= np.clip(noise(7, 1620) - 0.80, 0, 1) * 0.55
    # Fase: Lichtkante oben/links, Schatten unten/rechts
    stein += np.clip(1 - np.abs(fy - (jy + 0.030)) / 0.030, 0, 1) * 0.085
    stein -= np.clip(1 - np.abs(fy - (1 - jy - 0.030)) / 0.030, 0, 1) * 0.075
    stein += np.clip(1 - np.abs(fx - (jx + 0.016)) / 0.016, 0, 1) * 0.050
    stein -= np.clip(1 - np.abs(fx - (1 - jx - 0.016)) / 0.016, 0, 1) * 0.045

    # Moertel: heller Kalkmoertel, sandig, zurueckversetzt
    mortel = 0.74 + noise(6, 1621) * 0.13 + sand * 1.1
    mortel -= np.clip((fy - (1 - jy)) / jy, 0, 1) * 0.26       # Schatten unter dem Stein
    mortel -= np.clip((fx - (1 - jx)) / jx, 0, 1) * 0.10
    mortel += np.clip((jy - fy) / jy, 0, 1) * 0.06

    v = mortel * (1 - face) + stein * face
    v -= np.clip(1 - np.maximum(dy_ / jy, dx_ / jx), 0, 1) * (1 - face) * 0.10
    v = np.clip(v, 0.05, 1.15)

    rr = np.where(face > 0.5, v * (0.905 + hue * 0.085), v * 0.965)
    gg = np.where(face > 0.5, v * (0.390 + hue * 0.090), v * 0.940)
    bb = np.where(face > 0.5, v * (0.300 + hue * 0.045), v * 0.885)
    # Salzausblueh / Kalkschleier ueber alles (bricht die Rasterwiederholung)
    eff = np.clip(noise(4, 1622) - 0.63, 0, 1) * 1.5
    rr += eff * 0.16; gg += eff * 0.155; bb += eff * 0.15
    # Russ-/Regenfahnen von oben
    fahne = np.clip(feinstruktur(1623, 12, 0) - 0.55, 0, 1) * 1.8
    rr *= (1 - fahne * 0.16); gg *= (1 - fahne * 0.16); bb *= (1 - fahne * 0.14)
    speichern("ziegelmauer_rot", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 10) Wellblech (verzinkt)
def wellblech():
    P = 64.0                                  # 8 Wellen je Kachel
    # Viertelversatz -> die Kachelgrenze liegt auf der Flanke, nicht im Wellental
    u = (xx + P * 0.25)
    ph = 2 * np.pi * u / P
    h = np.cos(ph)                            # +1 = Rippe, -1 = Tal
    # leichte Beulen/Verzug des Blechs (periodisch -> nahtlos)
    beule = (noise(3, 1631) - 0.5) * 0.55 + (noise(5, 1632) - 0.5) * 0.22
    h = h + beule * 0.30

    lit = relief(blur(h, 1, 0), 3.2)
    v = 0.42 + (0.5 + 0.5 * np.cos(ph)) ** 1.25 * 0.30 + (lit - 0.5) * 0.62
    # harte Glanzkante auf dem Rippenscheitel, Schatten in der Kehle
    v += np.clip(1 - np.abs(((u % P) - P * 0.5)) / 4.0, 0, 1) * 0.16
    v -= np.clip(1 - np.abs(((u + P * 0.5) % P) - P * 0.5) / 5.0, 0, 1) * 0.10

    # Zink-Spangle: kristalline Zellen (Voronoi ueber wrap_d, nur argmin)
    r = np.random.default_rng(1633)
    K = 110
    py = r.random(K) * N; px = r.random(K) * N
    best = np.full((N, N), 1e12, dtype=np.float32)
    best2 = np.full((N, N), 1e12, dtype=np.float32)
    idz = np.zeros((N, N), dtype=np.int32)
    for i in range(K):
        dy, dx = wrap_d(py[i], px[i])
        d = dy * dy + dx * dx
        m = d < best
        best2 = np.where(m, best, np.minimum(best2, d))
        best = np.where(m, d, best)
        idz = np.where(m, i, idz)
    zell = r.random(K).astype(np.float32)[idz]
    rand = np.clip(1 - (np.sqrt(best2) - np.sqrt(best)) / 2.4, 0, 1)
    v += (zell - 0.5) * 0.085 - rand * 0.045
    v += (feinstruktur(1634, 1, 1) - 0.5) * 0.075
    v += (noise(7, 1635) - 0.5) * 0.06

    # Ueberlappungsstoss der Bahnen: bei x = 128 und 384 (NICHT am Kachelrand)
    for sx in (128.0, 384.0):
        d = ((xx - sx + N * 0.5) % N) - N * 0.5
        v -= np.clip(1 - np.abs(d) / 2.0, 0, 1) * 0.16
        v += np.clip(1 - np.abs(d - 3.0) / 2.0, 0, 1) * 0.09

    # Schraubenreihen alle 128 px auf den Rippenscheiteln
    ym = (yy + 40.0) % 128.0
    scheitel = np.clip(1 - np.abs(((u % P) - P * 0.5)) / 5.0, 0, 1)
    ds = np.sqrt(((ym - 64.0)) ** 2 + (((u % P) - P * 0.5)) ** 2)
    v = np.where(ds < 3.2, 0.34 + np.clip((3.2 - ds) / 3.2, 0, 1) * 0.42, v)
    v = np.where((ds >= 3.2) & (ds < 4.4), v * 0.70, v)

    v = np.clip(v, 0.05, 1.15)
    rr = v * 0.965; gg = v * 0.985; bb = v * 1.000

    # --- Rost: Laufspuren unter den Schrauben + an den Stoessen, patiniert
    lauf = np.clip((ym - 64.0) / 46.0, 0, 1) * np.clip(1 - (ym - 64.0) / 60.0, 0, 1)
    lauf = np.clip(lauf, 0, 1) * scheitel
    fleck = np.clip(noise(4, 1636) * 1.5 - 0.62, 0, 1) * 1.6
    schlier = np.clip(feinstruktur(1637, 14, 0) - 0.50, 0, 1) * 2.0
    rost = np.clip(lauf * 1.5 * schlier + fleck * schlier * 0.9, 0, 1)
    rost = np.clip(rost * (0.55 + noise(7, 1638) * 0.9), 0, 1) * 0.85
    # zusaetzlich leichter Rostsaum an den Ueberlappungen
    for sx in (128.0, 384.0):
        d = np.abs(((xx - sx + N * 0.5) % N) - N * 0.5)
        rost += np.clip(1 - d / 6.0, 0, 1) * np.clip(noise(5, 1639) - 0.48, 0, 1) * 1.6
    rost = np.clip(rost, 0, 0.92)

    rf = 0.52 + v * 0.42
    rr = rr * (1 - rost) + rost * rf * 0.86
    gg = gg * (1 - rost) + rost * rf * 0.40
    bb = bb * (1 - rost) + rost * rf * 0.18
    speichern("wellblech", np.stack([rr, gg, bb], -1))


ALLE = (wasser, gleisschotter, kies_fein, acker_furchen, wiese_blumen,
        herbstlaub, schnee, holzdeck, ziegelmauer_rot, wellblech)


if __name__ == "__main__":
    print("Textur-Charge 7 (th15, Hafen/Park/Bahn/Bauernhof):")
    for fn in ALLE:
        fn()
    print("fertig ->", OUT)
