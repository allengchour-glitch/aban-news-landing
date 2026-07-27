# -*- coding: utf-8 -*-
"""Textur-Charge 6 (th12) fuer das Vergnuegungsviertel:
Casino, Nachtclub, Bowling, Spielhalle, Theater.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

FALLE (aus frueheren Chargen): np.ix_ nur mit 1-D-Indizes (in noise() korrekt);
fuer 2-D-Indexraster IMMER direktes Fancy-Indexing tint[iy, ix] verwenden.
Nahtlosigkeit ausschliesslich ueber Wrap-/Modulo-Arithmetik:
  * noise()        -- Gitter teilt N, Basis per mode='wrap' gepaddet
  * feinstruktur() -- Mittelung ueber np.roll
  * blur()         -- separabler Box-Blur ueber np.roll
  * wrap_d()       -- kuerzester Abstand ueber die Kachelgrenze
  * alle sin/cos   -- ausschliesslich ganzzahlige Frequenzen ueber N
  * Domain-Warp    -- nur mit periodischen Feldern, VOR dem Modulo angewandt
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th12"
os.makedirs(OUT, exist_ok=True)
N = 512


def speichern(name, rgb):
    """rgb: (N,N,3) float 0..1 -> PNG (bpy erwartet bottom-up)"""
    px = np.ones((N, N, 4), dtype=np.float32)
    px[..., :3] = np.clip(rgb, 0, 1)
    px = px[::-1]
    img = bpy.data.images.new(name, width=N, height=N)
    img.pixels = px.ravel()
    img.filepath_raw = os.path.join(OUT, name + ".png")
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    p = os.path.join(OUT, name + ".png")
    a = np.clip(rgb, 0, 1)
    print("  ->", name + ".png", os.path.getsize(p), "B",
          "| mean %.3f std %.3f" % (a.mean(), a.std()))


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
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Fasern/Flor/Korn."""
    a = np.random.default_rng(seed).random((N, N)).astype(np.float32)
    acc = np.zeros_like(a); c = 0
    for dy in range(-wy, wy + 1):
        for dx in range(-wx, wx + 1):
            acc += np.roll(np.roll(a, dy, axis=0), dx, axis=1); c += 1
    return acc / c


def blur(a, rx, ry=None):
    """separabler Box-Blur mit Wrap (fuer Glow / weiche Verlaeufe / AO)"""
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
    """weiche 1-px-genaue Linie um t=0 (t in Zell-Einheiten, w = halbe Breite)"""
    return np.clip(1.0 - np.abs(t) / w, 0, 1)


# ------------------------------------------------ 1) Casinoteppich (Vegas-Muster)
def casinoteppich():
    # Domain-Warp: gewebt statt gestanzt (periodisch -> bleibt nahtlos)
    X = xx + (noise(5, 1201) - 0.5) * 7.0
    Y = yy + (noise(5, 1202) - 0.5) * 7.0

    G = 4.0                                   # 4x4 Medaillons a 128 px
    cx = X / N * G; cy = Y / N * G
    ix = np.floor(cx).astype(int) % int(G); iy = np.floor(cy).astype(int) % int(G)
    u = (cx % 1.0) - 0.5; v = (cy % 1.0) - 0.5
    u2 = ((cx + 0.5) % 1.0) - 0.5; v2 = ((cy + 0.5) % 1.0) - 0.5

    # --- Hauptmedaillon: zwei Bluetenringe + Kern
    r1 = np.sqrt(u * u + v * v); t1 = np.arctan2(v, u)
    R_a = 0.345 + 0.050 * np.cos(8 * t1)
    R_b = 0.205 + 0.055 * np.cos(8 * t1 + np.pi)
    ros = band(r1 - R_a, 0.028) + 0.85 * band(r1 - R_b, 0.024)
    ros += np.clip((0.070 - r1) / 0.030, 0, 1)                     # Kernscheibe
    ros += 0.55 * band(r1 - 0.125, 0.014)                          # feiner Innenring

    # --- Rautengitter zwischen den Medaillons (verbindet die Zellen)
    dia = np.abs(u) + np.abs(v)
    gitter = band(dia - 0.470, 0.020) + 0.5 * band(dia - 0.415, 0.010)

    # --- Zwischenmotiv auf dem versetzten Gitter (Vierpass)
    r2 = np.sqrt(u2 * u2 + v2 * v2); t2 = np.arctan2(v2, u2)
    quat = band(r2 - (0.105 + 0.055 * np.cos(4 * t2)), 0.020)
    quat += np.clip((0.030 - r2) / 0.020, 0, 1)

    # --- Ranken/Filigran: dezente Wellenlinien ueber alles
    rank = band(np.sin(2 * np.pi * (X * 8 + Y * 4) / N + noise(4, 1203) * 2.2), 0.045) * 0.45
    rank += band(np.sin(2 * np.pi * (X * 4 - Y * 8) / N + noise(4, 1204) * 2.2), 0.045) * 0.45

    gold_m = np.clip(ros + gitter * 0.8 + quat * 0.9 + rank, 0, 1)
    gold_m = blur(gold_m, 1)                                       # weiche Florkante
    gold_m = np.clip(gold_m * 1.25, 0, 1)

    # --- Grundton: tiefes Burgund, Zellen leicht alternierend
    schach = ((ix + iy) % 2).astype(np.float32)
    flor = (feinstruktur(1205, 1, 1) - 0.5) * 0.55 + (feinstruktur(1206, 3, 0) - 0.5) * 0.35
    gross = noise(4, 1207)
    getreten = np.clip(noise(3, 1208) - 0.42, 0, 1)

    tief = 0.72 + gross * 0.34 + flor * 0.42 - schach * 0.055 - getreten * 0.24
    rr = tief * 0.325; gg = tief * 0.052; bb = tief * 0.075
    # dunkler Bordeaux-Schatten in den Feldern
    rr -= np.clip(noise(5, 1209) - 0.62, 0, 1) * 0.10

    # --- Gold: warm, mit Flor moduliert (nicht aufgeklebt)
    ton = 0.80 + noise(4, 1210) * 0.30 + flor * 0.58
    gr = ton * 0.80; gg_ = ton * 0.585; gb = ton * 0.205
    # Glanzlicht auf der Oberkante der Ornamentschlaufe
    hl = np.clip(gold_m - np.roll(gold_m, 2, axis=0), 0, 1) * 0.55
    gr += hl * 0.5; gg_ += hl * 0.42; gb += hl * 0.18
    # Schatten unter dem Ornament (Flor gedrueckt)
    sch = np.clip(np.roll(gold_m, -2, axis=0) - gold_m, 0, 1) * 0.5
    rr *= (1 - sch * 0.45); gg *= (1 - sch * 0.45); bb *= (1 - sch * 0.45)

    # --- cremefarbene Akzentpunkte im Vierpass-Kern (klassischer Vegas-Look)
    creme = np.clip((0.022 - r2) / 0.014, 0, 1) * 0.9

    m = gold_m
    rr = rr * (1 - m) + gr * m
    gg = gg * (1 - m) + gg_ * m
    bb = bb * (1 - m) + gb * m
    rr = rr * (1 - creme) + creme * (0.90 + flor * 0.3)
    gg = gg * (1 - creme) + creme * (0.83 + flor * 0.3)
    bb = bb * (1 - creme) + creme * (0.66 + flor * 0.3)
    speichern("casinoteppich", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 2) Spielfilz (Tischtuch)
def spielfilz():
    # Flor: kurze, wirre Fasern -- deutlich sichtbar, sonst wirkt Filz wie Farbe
    faser = (feinstruktur(1221, 1, 1) - 0.5) * 0.85 \
        + (feinstruktur(1222, 0, 2) - 0.5) * 0.55 \
        + (feinstruktur(1223, 2, 0) - 0.5) * 0.55 \
        + (np.random.default_rng(1227).random((N, N)).astype(np.float32) - 0.5) * 0.30
    wolke = noise(4, 1224); fein = noise(7, 1225)

    v = 0.84 + faser * 0.42 + (wolke - 0.5) * 0.26 + (fein - 0.5) * 0.16
    # Rautenlinien (Pressmuster): heller Grat + dunkle Rille -> sichtbar, aber dezent
    d1 = np.sin(2 * np.pi * (xx + yy) * 6 / N + (noise(3, 1228) - 0.5) * 1.1)
    d2 = np.sin(2 * np.pi * (xx - yy) * 6 / N + (noise(3, 1229) - 0.5) * 1.1)
    grat = np.clip(band(d1, 0.16) + band(d2, 0.16), 0, 1)
    rille = np.clip(band(d1, 0.045) + band(d2, 0.045), 0, 1)
    v += grat * 0.085 - rille * 0.075
    # Streiflicht (Filz schimmert leicht), nahtlose Grosswelle
    v += np.sin(2 * np.pi * (2 * xx + 1 * yy) / N) * 0.045
    v -= np.clip(noise(3, 1226) - 0.56, 0, 1) * 0.24        # abgegriffene Stellen
    v = np.clip(v, 0.15, 1.45)

    rr = v * 0.125; gg = v * 0.430; bb = v * 0.200
    rr += grat * 0.010; gg += grat * 0.014
    speichern("spielfilz", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 3) Bowlingahorn (Bahnholz)
def bowlingahorn():
    B = 8                                     # 8 Dielen a 64 px
    bw = N / B
    # halber Versatz -> die Kachelgrenze liegt in der Dielenmitte, nicht in der Fuge
    xb = (xx + bw * 0.5) % N
    ib = (np.floor(xb / bw).astype(int)) % B
    bf = (xb % bw) / bw                       # 0..1 in der Diele
    r = np.random.default_rng(1231)
    ph = (r.random(B).astype(np.float32) * 200.0)[ib]      # Maserungsphase je Diele
    to = (r.random(B).astype(np.float32))[ib]              # Farbton je Diele
    yo = (r.random(B).astype(np.float32) * N)[ib]          # Stossversatz je Diele

    # Laengsmaserung: Domain-Warp in x, Linien mit ganzzahliger Frequenz
    w1 = (noise(3, 1232) - 0.5) * 30.0 + (noise(5, 1233) - 0.5) * 11.0
    gx = xx + w1 + ph
    mas = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 96 / N)
    mas2 = 0.5 + 0.5 * np.sin(2 * np.pi * (gx * 28 / N) + 1.1)
    mas3 = 0.5 + 0.5 * np.sin(2 * np.pi * (gx * 208 / N) + 2.4)
    laengs = feinstruktur(1234, wy=9, wx=0)                # gezogene Fasern
    fein = feinstruktur(1235, wy=3, wx=0)

    # Maserung weichzeichnen -> Holz statt Tuschestriche
    ringe = mas ** 3.4 * 0.085 + mas2 ** 3.0 * 0.075 + mas3 ** 6.0 * 0.020
    ringe = blur(ringe, 1, 0)
    v = 0.905 + to * 0.085 - (1 - to) * 0.055              # Diele heller/dunkler
    v -= ringe
    v += (laengs - 0.5) * 0.16 + (fein - 0.5) * 0.055
    v += (noise(4, 1236) - 0.5) * 0.075
    # vereinzelte Poren/Nadelaeste
    ast = np.clip(noise(7, 1237) - 0.82, 0, 1) * 1.6
    v -= ast * 0.20

    # Fugen zwischen den Dielen + Fasenlicht
    kant = np.minimum(bf, 1 - bf) * bw                     # px-Abstand zur Fuge
    fuge = np.clip(1 - kant / 1.5, 0, 1)
    fase = np.clip(1 - np.abs(kant - 3.0) / 2.4, 0, 1)
    v = v * (1 - fuge * 0.48) + fase * 0.050
    # Stossfugen der Dielenenden alle 256 px (versetzt je Diele), nur angedeutet
    ys = (yy + yo) % 256.0
    stoss = np.clip(1 - np.minimum(ys, 256 - ys) / 1.1, 0, 1)
    v = v * (1 - stoss * 0.22)

    # Lackglanz der Bahn (nahtlose Grosswellen, flach)
    v += np.sin(2 * np.pi * (1 * xx + 2 * yy) / N) * 0.022
    v += np.sin(2 * np.pi * (3 * xx - 1 * yy) / N) * 0.012
    v = np.clip(v, 0.05, 1.35)
    rr = v * 0.955
    gg = v * (0.795 - to * 0.03)
    bb = v * (0.545 - to * 0.05)
    speichern("bowlingahorn", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 4) Samtvorhang (Theater)
def samtvorhang():
    # Falten wandern in der Hoehe UND haben ungleiche Breiten
    # (Stauchung der x-Achse mit ganzzahliger Frequenz -> bleibt nahtlos)
    wander = (noise(3, 1241) - 0.5) * 30.0 + (noise(5, 1242) - 0.5) * 10.0
    sx = xx + 24.0 * np.sin(2 * np.pi * xx * 2 / N + 0.8) \
        + 11.0 * np.sin(2 * np.pi * xx * 3 / N + 2.1) + wander
    haupt = np.sin(2 * np.pi * sx * 7 / N)
    neben = np.sin(2 * np.pi * (sx + wander * 0.5) * 19 / N + 1.3)
    breit = np.sin(2 * np.pi * (xx + wander * 1.4) * 3 / N + 0.4)

    h = 0.5 + 0.5 * haupt
    tiefe = 0.72 + noise(2, 1247) * 0.55                   # Falte mal tiefer, mal flacher
    v = 0.085 + h ** 2.1 * 0.66 * tiefe                    # Grat hell, Kerbe tief
    v += (0.5 + 0.5 * neben) * 0.10 * (0.35 + 0.65 * h)    # Nebenfalte nur am Grat
    v += (0.5 + 0.5 * breit) * 0.085                       # grosse Stoffwelle
    v -= np.clip(1 - (h / 0.16), 0, 1) ** 2 * 0.055        # scharfe Kerbe im Grund

    # Samtflor: gezogene Fasern, Fleckigkeit, feiner Glitzerstaub
    v += (feinstruktur(1243, wy=7, wx=0) - 0.5) * 0.13
    v += (feinstruktur(1244, wy=1, wx=1) - 0.5) * 0.075
    v += (np.random.default_rng(1248).random((N, N)).astype(np.float32) - 0.5) * 0.035
    v *= (0.84 + noise(3, 1245) * 0.34)                    # Licht wandert auch vertikal
    v -= np.clip(noise(4, 1246) - 0.60, 0, 1) * 0.20       # Schwerefalten/Schatten
    v = np.clip(v, 0, 1.18)

    # tiefes Bordeauxrot; Spitzlichter bleiben rot (kein Orange)
    rr = 0.070 + v * 0.80
    gg = 0.006 + v ** 3.0 * 0.21
    bb = 0.020 + v ** 2.8 * 0.19
    bb += np.clip(0.35 - v, 0, 1) * 0.030                  # kuehler Schatten im Grund
    speichern("samtvorhang", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 5) Neonkacheln (Tanzflaeche/LED)
def neonkacheln():
    G = 8                                    # 8x8 Felder a 64 px
    cx = xx / N * G; cy = yy / N * G
    ix = np.floor(cx).astype(int) % G; iy = np.floor(cy).astype(int) % G
    fx = cx % 1.0; fy = cy % 1.0

    pal = np.array([
        [0.10, 0.95, 1.00],   # cyan
        [1.00, 0.13, 0.72],   # magenta
        [0.55, 1.00, 0.15],   # lime
        [1.00, 0.62, 0.05],   # amber
        [0.62, 0.25, 1.00],   # violett
        [1.00, 0.22, 0.20],   # rot
        [0.20, 0.45, 1.00],   # elektroblau
        [0.95, 0.95, 1.00],   # weiss
    ], dtype=np.float32)
    r = np.random.default_rng(1251)
    idx = r.integers(0, len(pal), (G, G))
    hell = (0.45 + r.random((G, G)).astype(np.float32) * 0.75)
    aus = (r.random((G, G)).astype(np.float32) < 0.22)
    hell = np.where(aus, 0.06, hell).astype(np.float32)

    col = pal[idx]                                    # (G,G,3)
    feld = col[iy, ix]                                # 2-D-Fancy-Indexing!
    b = hell[iy, ix]

    # Panelform: Fuge dunkel, Innenflaeche leicht zur Mitte heller
    d = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    innen = np.clip((d - 0.055) / 0.045, 0, 1)
    mitte = np.clip(d / 0.45, 0, 1) ** 0.6

    # LED-Rasterpunkte im Feld (8x8 je Panel)
    px_ = np.abs(((xx % 8) / 8.0) - 0.5) * 2
    py_ = np.abs(((yy % 8) / 8.0) - 0.5) * 2
    dot = np.clip(1 - np.sqrt(px_ ** 2 + py_ ** 2) / 0.78, 0, 1) ** 0.7
    led = 0.62 + dot * 0.55

    emis = b * innen * (0.72 + mitte * 0.35) * led
    emis *= (0.93 + noise(6, 1252) * 0.16)
    e3 = emis[..., None] * feld

    # Glow: Licht blutet in die Fugen und auf die Nachbarn (Wrap -> nahtlos)
    glow = np.stack([blur(e3[..., k], 5) for k in range(3)], -1) * 0.55
    glow += np.stack([blur(e3[..., k], 13) for k in range(3)], -1) * 0.38

    # Grundkoerper: dunkles Alu-Raster
    korn = (feinstruktur(1253, 1, 1) - 0.5)
    rahmen = (0.055 + korn * 0.07) * (1 - innen)
    grund = np.stack([rahmen * 1.0, rahmen * 1.03, rahmen * 1.12], -1)

    out = grund + e3 * 1.05 + glow
    # Spiegelnder Boden: leichter Streifenreflex ueber alles
    out *= (0.93 + 0.10 * np.sin(2 * np.pi * (3 * yy + 1 * xx) / N))[..., None]
    speichern("neonkacheln", out)


# ------------------------------------------------ 6) Sternenhimmel (Saaldecke)
def sternenhimmel():
    # Grund: tiefes Nachtblau mit weichem Wolkenverlauf (nicht flach schwarz)
    w1 = noise(3, 1261); w2 = noise(5, 1262)
    grund = 0.050 + w1 ** 1.5 * 0.115 + w2 * 0.040
    rr = grund * 0.42; gg = grund * 0.62; bb = grund * 1.35
    # zarte Nebelschwaden ins Violette
    neb = np.clip(noise(4, 1263) - 0.55, 0, 1) * 0.9
    rr += neb * 0.055; gg += neb * 0.030; bb += neb * 0.080

    r = np.random.default_rng(1264)

    def sternmap(k, pot, seed):
        rr_ = np.random.default_rng(seed)
        py = rr_.integers(0, N, k); px = rr_.integers(0, N, k)
        b = rr_.random(k).astype(np.float32) ** pot
        warm = rr_.random(k).astype(np.float32)
        m = np.zeros((N, N), dtype=np.float32)
        mw = np.zeros((N, N), dtype=np.float32)
        np.add.at(m, (py, px), b)
        np.add.at(mw, (py, px), b * warm)
        return m, mw

    # 3 Groessenklassen: viele winzige, wenige mittlere, ganz wenige grosse
    k1, w1m = sternmap(1400, 3.4, 1265)      # Staub
    k2, w2m = sternmap(190, 1.8, 1266)       # mittel
    k3, w3m = sternmap(26, 1.0, 1267)        # Leitsterne

    licht = k1 * 1.00 + blur(k1, 1) * 1.4
    licht += k2 * 1.30 + blur(k2, 2) * 3.6 + blur(k2, 5) * 2.0
    licht += k3 * 1.60 + blur(k3, 3) * 6.0 + blur(k3, 9) * 4.0
    # Strahlenkreuz der hellsten Punkte
    licht += (blur(k3, 11, 0) + blur(k3, 0, 11)) * 3.0

    # ein Teil der Sterne warm (Gold/Bernstein) -> lebendige Saaldecke
    warm = w1m * 1.6 + w2m * 1.4 + blur(w2m, 2) * 4.5 + blur(w3m, 3) * 7.0

    rr += licht * 0.95 + warm * 0.60
    gg += licht * 0.97 + warm * 0.32
    bb += licht * 1.00 + warm * 0.02
    # feines Sensor-/Stoffkorn, damit die Flaeche nicht tot wirkt
    korn = (feinstruktur(1268, 1, 1) - 0.5) * 0.030
    speichern("sternenhimmel", np.stack([rr + korn, gg + korn, bb + korn * 1.3], -1))


# ------------------------------------------------ 7) Goldstuck (Theaterwand)
def goldstuck():
    G = 2.0                                   # 2x2 Kassetten a 256 px
    X = xx + (noise(5, 1271) - 0.5) * 4.0
    Y = yy + (noise(5, 1272) - 0.5) * 4.0
    cx = X / N * G; cy = Y / N * G
    u = (cx % 1.0) - 0.5; v = (cy % 1.0) - 0.5
    u2 = ((cx + 0.5) % 1.0) - 0.5; v2 = ((cy + 0.5) % 1.0) - 0.5

    def wulst(t, c, w):
        """halbrunder Profilwulst um |t| = c"""
        return np.clip(1 - ((np.abs(t) - c) / w) ** 2, 0, 1) ** 0.55

    h = np.zeros((N, N), dtype=np.float32)
    # --- Rahmenprofil der Kassette (zwei Wuelste + Kehle)
    h += np.maximum(wulst(u, 0.430, 0.045), wulst(v, 0.430, 0.045)) * 1.00
    h += np.maximum(wulst(u, 0.355, 0.028), wulst(v, 0.355, 0.028)) * 0.55
    h -= np.maximum(wulst(u, 0.395, 0.018), wulst(v, 0.395, 0.018)) * 0.35
    # Perlstab auf dem inneren Profil
    perl_x = 0.5 + 0.5 * np.cos(2 * np.pi * cy * 26)
    perl_y = 0.5 + 0.5 * np.cos(2 * np.pi * cx * 26)
    h += wulst(u, 0.355, 0.026) * perl_x * 0.45
    h += wulst(v, 0.355, 0.026) * perl_y * 0.45

    # --- innere Kehlleiste (Bilderrahmen-Filet im Feld)
    h += np.maximum(wulst(u, 0.285, 0.015), wulst(v, 0.285, 0.015)) * 0.40

    # --- Mittelrosette: gedrehte Rippen zwischen zwei Ringwuelsten (architektonisch,
    #     bewusst KEINE Blume -- fruehere Chargen wirkten sonst "blumig/aufgeklebt")
    r1 = np.sqrt(u * u + v * v); t1 = np.arctan2(v, u)
    ripp = (0.5 + 0.5 * np.cos(18 * t1 + r1 * 9.0)) ** 1.5
    zone = np.clip(1 - np.abs(r1 - 0.165) / 0.080, 0, 1) ** 0.55
    h += zone * (0.30 + ripp * 0.62)
    h += np.clip(1 - ((r1 - 0.247) / 0.028) ** 2, 0, 1) ** 0.6 * 0.65      # Aussentorus
    h += np.clip(1 - ((r1 - 0.093) / 0.022) ** 2, 0, 1) ** 0.6 * 0.50      # Innentorus
    h += np.clip(1 - (r1 / 0.046) ** 2, 0, 1) ** 0.5 * 0.62                # Knauf
    h -= np.clip(1 - np.abs(r1 - 0.205) / 0.016, 0, 1) * 0.18              # Kehle

    # --- Volute in den Zwickeln (versetztes Gitter)
    r2 = np.sqrt(u2 * u2 + v2 * v2); t2 = np.arctan2(v2, u2)
    Rv = 0.075 + 0.045 * np.cos(3 * t2 + r2 * 22.0)
    h += np.clip(1 - (r2 / np.maximum(Rv, 1e-3)) ** 2, 0, 1) ** 0.7 * 0.60

    # --- Feinstruktur: Gips-/Guss-Oberflaeche
    h += (noise(6, 1273) - 0.5) * 0.10 + (feinstruktur(1274, 1, 1) - 0.5) * 0.07
    h = np.clip(h, 0, 2.2)

    # --- Relief-Shading (Licht von oben links), Gradient per np.roll = nahtlos
    gx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1))
    gy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0))
    lit = np.clip(0.5 + (gx * 1.9 + gy * 1.9), 0, 1.6)
    ao = np.clip(h - blur(h, 7), -1, 1)

    v_ = 0.42 + h * 0.22 + (lit - 0.5) * 0.78 + ao * 0.45
    v_ += (noise(4, 1275) - 0.5) * 0.06
    v_ = np.clip(v_, 0.04, 1.35)

    # --- Blattgold: warme Basis + fast weisse Spitzlichter + Patina in den Tiefen
    spek = np.clip(v_ - 0.74, 0, 1) ** 1.4
    pat = np.clip(0.42 - v_, 0, 1) * 1.5
    rr = v_ * 1.10 + spek * 0.62 - pat * 0.05
    gg = v_ * 0.860 + spek * 0.58 - pat * 0.11
    bb = v_ * 0.340 + spek * 0.42 - pat * 0.05
    speichern("goldstuck", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 8) Arcade-Boden (90er)
def arcade_boden():
    # Grund: dunkelblauer Nadelfilz mit Flor
    flor = (feinstruktur(1281, 1, 1) - 0.5) * 0.55 + (feinstruktur(1282, 2, 0) - 0.5) * 0.30
    g = 0.115 + noise(5, 1283) * 0.075 + flor * 0.075
    rr = g * 0.55; gg = g * 0.60; bb = g * 1.25
    rr += np.clip(noise(3, 1284) - 0.58, 0, 1) * 0.09          # violette Schwaden
    bb += np.clip(noise(3, 1284) - 0.58, 0, 1) * 0.11

    neon = np.array([
        [0.15, 1.00, 0.95], [1.00, 0.18, 0.72], [0.65, 1.00, 0.20],
        [1.00, 0.70, 0.10], [0.55, 0.35, 1.00], [1.00, 0.30, 0.25],
    ], dtype=np.float32)

    # --- Neonlinien: wenige, duenne, stark geschwungene Zuege
    #     (Kurve ueber sin mit ganzzahliger Frequenz -> nahtlos in Laufrichtung)
    r = np.random.default_rng(1285)
    linien = np.zeros((N, N, 3), dtype=np.float32)
    for k in range(5):
        c = r.random() * N
        m = int(r.integers(1, 3))
        ph = r.random() * 6.283
        amp = 42 + r.random() * 55
        br = 1.3 + r.random() * 1.3
        col = neon[k % len(neon)] * (0.62 + r.random() * 0.35)
        if k % 2 == 0:                                    # quer
            kurve = c + amp * np.sin(2 * np.pi * xx * m / N + ph) \
                + 26 * np.sin(2 * np.pi * xx * 3 / N + ph * 1.7) \
                + (noise(4, 1290 + k) - 0.5) * 40
            d = np.abs(((yy - kurve + N * 0.5) % N) - N * 0.5)
        else:                                             # laengs
            kurve = c + amp * np.sin(2 * np.pi * yy * m / N + ph) \
                + 26 * np.sin(2 * np.pi * yy * 3 / N + ph * 1.7) \
                + (noise(4, 1290 + k) - 0.5) * 40
            d = np.abs(((xx - kurve + N * 0.5) % N) - N * 0.5)
        kern = np.clip(1 - d / br, 0, 1) ** 0.7
        linien += kern[..., None] * col[None, None, :]

    glow = np.stack([blur(linien[..., k], 4) for k in range(3)], -1) * 0.85
    glow += np.stack([blur(linien[..., k], 12) for k in range(3)], -1) * 0.60

    # --- bunte Sprenkel + Striche (Konfetti-Teppich, das Hauptmotiv)
    spr = np.random.default_rng(1286)
    K = 2600
    py = spr.integers(0, N, K); px = spr.integers(0, N, K)
    idx = spr.integers(0, len(neon), K)
    st = spr.random(K).astype(np.float32) ** 1.3
    lang = spr.random(K) < 0.30                          # ein Drittel als Strich
    kern_map = np.zeros((N, N, 3), dtype=np.float32)
    for j in range(len(neon)):
        for stil in (0, 1):
            sel = (idx == j) & (lang if stil else ~lang)
            if not sel.any():
                continue
            m_ = np.zeros((N, N), dtype=np.float32)
            np.add.at(m_, (py[sel], px[sel]), st[sel])
            if stil:                                     # gezogener Strich
                if j % 2:
                    m_ = blur(blur(m_, 3, 0), 0, 1) * 9.0     # liegend
                else:
                    m_ = blur(blur(m_, 0, 3), 1, 0) * 9.0     # stehend
            else:                                        # runder Tupfen (3x3)
                m_ = m_ * 0.8 + blur(blur(m_, 1), 1) * 5.0
            kern_map += m_[..., None] * neon[j][None, None, :]

    out = np.stack([rr, gg, bb], -1) + linien * 0.80 + glow * 0.75 + kern_map * 0.95
    # Laufspuren / Abnutzung
    out *= (0.86 + np.clip(noise(4, 1287), 0, 1) * 0.30)[..., None]
    speichern("arcade_boden", out)


if __name__ == "__main__":
    print("Textur-Charge 6 (th12, Vergnuegungsviertel):")
    for fn in (casinoteppich, spielfilz, bowlingahorn, samtvorhang,
               neonkacheln, sternenhimmel, goldstuck, arcade_boden):
        fn()
    print("fertig ->", OUT)
