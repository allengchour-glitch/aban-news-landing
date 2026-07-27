# -*- coding: utf-8 -*-
"""Textur-Charge 5 (th9) fuer die Grossbauten der Stadt:
Wolkenkratzer, Stadion, Museum, Mall, Krankenhaus, Hotel, Burg, Wasserturm.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein Netz, kein Blender-Binary).
FALLE: np.ix_ nur mit 1-D-Indizes (in noise() korrekt) -- fuer 2-D-Indexraster
direktes Fancy-Indexing tint[iy, ix] verwenden."""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th9"
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
    print("  ->", name + ".png", os.path.getsize(os.path.join(OUT, name + ".png")), "B")


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
    """pixelfeines Rauschen, per Wrap-Mittelung leicht gerichtet verschmiert
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Halme/Korn."""
    a = np.random.default_rng(seed).random((N, N)).astype(np.float32)
    acc = np.zeros_like(a); c = 0
    for dy in range(-wy, wy + 1):
        for dx in range(-wx, wx + 1):
            acc += np.roll(np.roll(a, dy, axis=0), dx, axis=1); c += 1
    return acc / c


yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)


def wrap_d(py, px):
    """kuerzester (nahtloser) Abstandsvektor jedes Pixels zu Punkt (py,px)"""
    dy = ((yy - py + N * 0.5) % N) - N * 0.5
    dx = ((xx - px + N * 0.5) % N) - N * 0.5
    return dy, dx


# ------------------------------------------------- 1) Glasraster (Vorhangfassade)
def glasraster():
    cols, rows = 8, 16                      # 64 x 32 px Felder
    cx = xx / N * cols; cy = yy / N * rows
    ix = np.floor(cx).astype(int) % cols; iy = np.floor(cy).astype(int) % rows
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)

    # Sprossen (hell, Alu) -- innen = Glas
    sx = np.clip(fx / 0.10, 0, 1) * np.clip((1 - fx) / 0.10, 0, 1)
    sy = np.clip(fy / 0.16, 0, 1) * np.clip((1 - fy) / 0.16, 0, 1)
    glas_m = np.minimum(sx, sy)             # 1 = Glas, 0 = Sprosse

    r = np.random.default_rng(901)
    t = r.random((rows, cols)).astype(np.float32)[iy, ix]        # Reflex je Feld
    lit = (r.random((rows, cols)).astype(np.float32) > 0.86)[iy, ix]  # beleuchtete Buero

    # grossflaechige Wolkenspiegelung (nahtlos: ganzzahlige Frequenzen)
    wolke = 0.5 + 0.5 * np.sin(2 * np.pi * (2 * xx + 3 * yy) / N + noise(3, 902) * 6.0)
    spiegel = 0.10 + t * 0.30 + wolke * 0.20 + (1 - fy) * 0.10
    spiegel = spiegel + lit * 0.34                                # Licht an
    spiegel = spiegel - np.clip((fy - 0.55) * 1.4, 0, 1) * 0.10   # unten dunkler
    rr = spiegel * 0.52 + 0.05
    gg = spiegel * 0.72 + 0.07
    bb = spiegel * 0.95 + 0.10

    # helle Alu-Sprossen mit Kantenlicht
    kante = np.clip((0.5 - np.abs(fy - 0.5)) / 0.16, 0, 1)
    alu = 0.68 + noise(4, 903) * 0.10 + (1 - kante) * 0.06
    rr = np.where(glas_m > 0.5, rr, alu * 0.98)
    gg = np.where(glas_m > 0.5, gg, alu * 1.00)
    bb = np.where(glas_m > 0.5, bb, alu * 1.03)
    speichern("glasraster", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 2) Bueropaneel (helle Fassade)
def bueropaneel():
    cols, rows = 4, 8                       # 128 x 64 px Paneele
    cx = xx / N * cols; cy = yy / N * rows
    ix = np.floor(cx).astype(int) % cols; iy = np.floor(cy).astype(int) % rows
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)

    fuge = np.clip(fx / 0.016, 0, 1) * np.clip((1 - fx) / 0.016, 0, 1) \
         * np.clip(fy / 0.026, 0, 1) * np.clip((1 - fy) / 0.026, 0, 1)   # 1 = Paneel

    r = np.random.default_rng(911)
    t = r.random((rows, cols)).astype(np.float32)[iy, ix]
    warm = r.random((rows, cols)).astype(np.float32)[iy, ix]
    grund = 0.70 + t * 0.15 + noise(5, 912) * 0.09 - noise(2, 913) * 0.05
    # leichte Woelbung des Paneels (Blechspannung)
    grund += (np.sin(np.pi * fy) - 0.5) * 0.05 + (np.sin(np.pi * fx) - 0.5) * 0.03
    # feine vertikale Schliffstruktur + Metallkorn
    grund += np.sin(2 * np.pi * xx * 24 / N + noise(4, 914) * 3.0) * 0.010
    grund += (feinstruktur(917, wy=3, wx=0) - 0.5) * 0.055
    grund += (noise(7, 918) - 0.5) * 0.05
    # Schmutzfahnen unter den Fugen
    schmutz = np.clip((0.34 - fy) / 0.34, 0, 1) * np.clip(noise(6, 915) - 0.38, 0, 1) * 1.9
    grund -= schmutz * 0.20
    # Fasenlicht oben / Schatten unten + Seitenkanten
    grund += np.clip((0.06 - fy) / 0.06, 0, 1) * 0.09
    grund -= np.clip((fy - 0.94) / 0.06, 0, 1) * 0.10
    grund -= np.clip((fx - 0.955) / 0.045, 0, 1) * 0.05

    fugenwert = 0.30 + noise(4, 916) * 0.08
    v = np.where(fuge > 0.5, grund, fugenwert)
    rr = v * (1.00 + warm * 0.02); gg = v * 0.985; bb = v * (0.945 - warm * 0.02)
    speichern("bueropaneel", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 3) Stadionrasen (Maehstreifen)
def stadionrasen():
    streifen = 8                            # 8 Maehbahnen -> nahtlos (64 px)
    s = np.floor(xx / N * streifen).astype(int) % 2
    kante = np.abs(((xx / N * streifen) % 1.0) - 0.5) * 2
    weich = np.clip((0.985 - kante) / 0.035, 0, 1)         # nahezu harte Bahnkante
    richt = np.where(s > 0, 1.20, 0.82)
    richt = richt * weich + 1.0 * (1 - weich)

    # echte Halmstruktur: pixelfeines Rauschen, laengs verschmiert
    halme = feinstruktur(921, wy=4, wx=0)
    buesch = feinstruktur(925, wy=1, wx=1)
    mittel = noise(5, 922)
    # feine Schnittspuren quer zur Bahn
    quer = 0.5 + 0.5 * np.sin(2 * np.pi * yy * 64 / N + noise(6, 923) * 3.0)
    v = 0.52 + (halme - 0.5) * 0.42 + (buesch - 0.5) * 0.22 \
        + (mittel - 0.5) * 0.10 + quer * 0.04
    v = v * richt
    rr = v * (0.32 + noise(4, 924) * 0.08)
    gg = v * 0.84
    bb = v * 0.30
    speichern("stadionrasen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 4) Marmorboden (poliert)
def marmorboden():
    w1 = noise(5, 931); w2 = noise(4, 932)
    # Hauptadern (zwei Richtungen, domain-warped)
    a1 = np.sin(2 * np.pi * (2 * xx + 1 * yy) / N + w1 * 9.0)
    a2 = np.sin(2 * np.pi * (1 * xx - 3 * yy) / N + w2 * 7.5)
    ad1 = np.clip(1 - np.abs(a1) * 4.0, 0, 1) ** 1.5
    ad2 = np.clip(1 - np.abs(a2) * 6.5, 0, 1) ** 1.6
    fein = np.clip(1 - np.abs(np.sin(2 * np.pi * (5 * xx + 4 * yy) / N + noise(5, 933) * 11)) * 9.0, 0, 1)

    wolken = noise(4, 934); wolk2 = noise(3, 936)
    v = 0.92 - ad1 * 0.46 - ad2 * 0.26 - fein * 0.13 \
        - np.clip(wolken - 0.48, 0, 1) * 0.42 - np.clip(wolk2 - 0.58, 0, 1) * 0.30
    v += noise(6, 935) * 0.05
    # Politur-Schleier (nahtlose Grosswelle)
    v += np.sin(2 * np.pi * (1 * xx + 2 * yy) / N) * 0.025

    # dezente Plattenfugen 2x2
    g = 2.0
    fx = (xx / N * g) % 1.0; fy = (yy / N * g) % 1.0
    fuge = np.clip(np.minimum(fx, 1 - fx) / 0.006, 0, 1) * np.clip(np.minimum(fy, 1 - fy) / 0.006, 0, 1)
    v = v * (0.84 + fuge * 0.16)

    kalt = np.clip(ad1 + ad2, 0, 1)          # Adern gehen ins Graublaue
    rr = v * (1.00 - kalt * 0.03); gg = v * 0.985; bb = v * (0.955 + kalt * 0.05)
    speichern("marmorboden", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 5) Burgmauer (Bruchstein)
def burgmauer():
    r = np.random.default_rng(941)
    K = 62
    pts = r.random((K, 2)).astype(np.float32) * N
    dist = np.empty((K, N, N), dtype=np.float32)
    aniso = 0.7 + r.random(K).astype(np.float32) * 0.8
    for i in range(K):
        dy, dx = wrap_d(pts[i, 0], pts[i, 1])
        # leichte Verzerrung -> unregelmaessige Bruchsteine
        dist[i] = np.sqrt((dy * aniso[i]) ** 2 + (dx / aniso[i]) ** 2)
    # Rauschverzerrung der Zellgrenzen (Bruchkanten, nicht glatt)
    warp = (noise(5, 942) - 0.5) * 13.0 + (noise(7, 946) - 0.5) * 7.0
    dist = dist + warp[None, :, :]
    part = np.partition(dist, 1, axis=0)
    d1 = part[0]; d2 = part[1]
    idx = np.argmin(dist, axis=0)

    kante = d2 - d1                                  # px-Abstand zur Zellgrenze
    m = np.clip((kante - 3.5) / 1.8, 0, 1)           # 0 = Mortelfuge, 1 = Stein
    bev = np.clip((kante - 3.5) / 7.0, 0, 1)         # schmale Randabschraegung

    tint = r.random(K).astype(np.float32)[idx]
    rau = noise(7, 943); rau2 = noise(8, 947)
    grob = feinstruktur(948, wy=1, wx=1)             # raue Bruchflaeche
    kratz = feinstruktur(949, wy=0, wx=3)
    stein = 0.30 + tint * 0.44 + rau * 0.16 + (rau2 - 0.5) * 0.18 \
        + (grob - 0.5) * 0.20 + (kratz - 0.5) * 0.10
    stein = stein * (0.86 + bev * 0.14)                          # Rand leicht abgedunkelt
    stein += np.clip(noise(6, 944) - 0.66, 0, 1) * 0.28          # Flechten/Kalkschleier
    stein -= np.clip(rau2 - 0.80, 0, 1) * 0.55                   # Ausbrueche/Pockennarben

    # Mortel: heller Kalkmoertel, sandig, leicht zurueckversetzt
    mortel = 0.58 + noise(6, 945) * 0.12 + (grob - 0.5) * 0.16
    v = mortel * (1 - m) + stein * m
    v -= np.clip(1.0 - kante / 3.5, 0, 1) * (1 - m) * 0.14       # Fugengrund im Schatten

    rr = v * (1.00 + (1 - m) * 0.02)
    gg = v * (0.945 + tint * 0.04)
    bb = v * (0.860 + tint * 0.06)
    speichern("burgmauer", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 6) Betonwerkstein (Grossplatten)
def betonwerkstein():
    g = 2                                    # 2x2 Grossplatten (256 px), im Verband
    cy = yy / N * g
    iy = np.floor(cy).astype(int) % g
    cx = xx / N * g + (iy % 2) * 0.5         # halber Versatz je Reihe
    ix = np.floor(cx).astype(int) % g
    fx = cx - np.floor(cx); fy = cy - np.floor(cy)

    fw = 0.030                               # Fasenbreite
    top = np.clip((fw - fy) / fw, 0, 1)
    bot = np.clip((fy - (1 - fw)) / fw, 0, 1)
    lef = np.clip((fw - fx) / fw, 0, 1)
    rig = np.clip((fx - (1 - fw)) / fw, 0, 1)
    fuge = np.clip(np.maximum(np.maximum(top, bot), np.maximum(lef, rig)), 0, 1)

    r = np.random.default_rng(951)
    t = r.random((g, g * 2)).astype(np.float32)[iy, (ix + iy) % (g * 2)]
    korn = feinstruktur(955, wy=1, wx=1)           # gestrahlte Oberflaeche
    zuschlag = np.random.default_rng(957).random((N, N)).astype(np.float32)
    grund = 0.62 + t * 0.14 + noise(5, 952) * 0.14 \
        - np.clip(noise(3, 953) - 0.50, 0, 1) * 0.26 \
        + np.clip(noise(6, 956) - 0.58, 0, 1) * 0.18 \
        + (korn - 0.5) * 0.13
    # Zuschlagkoerner hell + Luftporen dunkel
    grund += (zuschlag > 0.985) * 0.10
    poren = (np.random.default_rng(954).random((N, N)).astype(np.float32) > 0.9955) * 0.22
    grund = grund - poren

    # Fase: oben/links Licht, unten/rechts Schatten
    lich = np.clip(top + lef, 0, 1) * 0.18
    scha = np.clip(bot + rig, 0, 1) * 0.26
    v = grund * (1 - fuge * 0.34) + lich - scha
    v = np.maximum(v, 0.10)
    speichern("betonwerkstein", np.stack([v * 1.00, v * 0.995, v * 0.972], -1))


# ------------------------------------------------- 7) Metallpaneel (Trapezblech)
def metallpaneel():
    p = N / 8.0                              # 8 Rippen je Kachel (64 px)
    u = (xx % p) / p                         # 0..1 im Profil
    # Trapez: Steg oben (0.00-0.30) | Flanke ab (0.30-0.42) | Tal (0.42-0.74) | Flanke auf (0.74-1.0)
    v = np.zeros_like(u)
    v = np.where(u < 0.30, 0.82 - u * 0.10, v)                                   # Steg, leicht gewoelbt
    v = np.where((u >= 0.30) & (u < 0.42), 0.79 - (u - 0.30) / 0.12 * 0.50, v)    # beschattete Flanke
    v = np.where((u >= 0.42) & (u < 0.74), 0.29 + (u - 0.42) / 0.32 * 0.06, v)    # Tal
    fl = np.clip((u - 0.74) / 0.26, 0, 1)
    v = np.where(u >= 0.74, 0.35 + fl ** 1.4 * 0.44, v)                          # Lichtflanke
    # harte Kanten der Sicken
    v += np.clip(1 - np.abs(u - 0.30) / 0.018, 0, 1) * 0.14      # Glanzgrat
    v -= np.clip(1 - np.abs(u - 0.42) / 0.018, 0, 1) * 0.10      # Knick unten
    v -= np.clip(1 - np.abs(u - 0.74) / 0.014, 0, 1) * 0.07

    # vertikale Laufspuren / Schmutz (nur x-abhaengig -> nahtlos)
    streif = noise(6, 963)[0]
    v = v - np.clip(streif - 0.55, 0, 1)[None, :] * 0.22

    # Querstoss der Bahnen alle 128 px + Schraubenreihe auf dem Steg
    ym = yy % 128.0
    stoss = np.clip(1 - np.abs(ym - 3.0) / 2.5, 0, 1)
    v = v * (1 - stoss * 0.40)
    v = v + np.clip(1 - np.abs(ym - 6.5) / 2.0, 0, 1) * 0.10     # Lichtkante unter dem Stoss
    ds = np.sqrt((ym - 64.0) ** 2 + ((u - 0.15) * p) ** 2)
    v = np.where(ds < 3.4, 0.30 + np.clip((3.4 - ds) / 3.4, 0, 1) * 0.34, v)
    v = np.where((ds >= 3.4) & (ds < 4.6), v * 0.72, v)          # Schattenring

    v = v + noise(7, 961) * 0.06 - 0.02
    v = v + np.sin(2 * np.pi * yy * 3 / N) * 0.015              # leichte Bahnwelligkeit
    v = v - np.clip(noise(4, 962) - 0.62, 0, 1) * 0.20          # Verwitterung
    speichern("metallpaneel", np.stack([v * 0.93, v * 0.965, v * 1.00], -1))


# ------------------------------------------------- 8) Terrazzo (Splitterboden)
def terrazzo():
    r = np.random.default_rng(971)
    base = 0.80 + noise(6, 972) * 0.09 - noise(3, 973) * 0.04
    rr = base * 1.00; gg = base * 0.985; bb = base * 0.955
    # feiner Feinsplitt im Zement
    fein = (r.random((N, N)).astype(np.float32) > 0.975)
    rr = np.where(fein, rr * 0.80, rr); gg = np.where(fein, gg * 0.80, gg); bb = np.where(fein, bb * 0.82, bb)

    pal = np.array([
        [0.19, 0.19, 0.21],   # anthrazit
        [0.90, 0.89, 0.86],   # weiss
        [0.60, 0.27, 0.23],   # rot
        [0.72, 0.57, 0.28],   # ocker
        [0.28, 0.42, 0.32],   # gruen
        [0.45, 0.47, 0.52],   # graublau
        [0.56, 0.49, 0.43],   # beige-braun
        [0.34, 0.33, 0.36],   # dunkelgrau
    ], dtype=np.float32)
    K = 620
    py = r.random(K).astype(np.float32) * N
    px_ = r.random(K).astype(np.float32) * N
    rad = 2.5 + r.random(K).astype(np.float32) ** 2.2 * 12.0
    ani = 0.50 + r.random(K).astype(np.float32) * 1.0
    rot = r.random(K).astype(np.float32) * np.pi
    col = pal[r.integers(0, len(pal), K)]
    hell = 0.86 + r.random(K).astype(np.float32) * 0.28
    kant = r.integers(4, 7, K)                    # 4-6 Bruchflaechen -> kantig
    pha = r.random(K).astype(np.float32) * 6.28
    fein_n = noise(8, 974)

    for i in range(K):
        dy, dx = wrap_d(py[i], px_[i])
        ca = np.cos(rot[i]); sa = np.sin(rot[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        d = np.sqrt((ux * ani[i]) ** 2 + (uy / ani[i]) ** 2)
        if d.min() > rad[i] * 1.3:
            continue
        # kantiger Splitter: facettierter Radius statt Kreis
        th = np.arctan2(uy, ux)
        rr_e = rad[i] * (0.92 + 0.12 * np.cos(th * kant[i] + pha[i]))
        m = d < rr_e
        if not m.any():
            continue
        f = (0.90 + 0.16 * np.clip((rr_e - d) / 2.5, 0, 1)) * (0.90 + fein_n * 0.22)
        c = col[i] * hell[i]
        rr = np.where(m, c[0] * f, rr)
        gg = np.where(m, c[1] * f, gg)
        bb = np.where(m, c[2] * f, bb)
        # dunkler Saum (eingebettet im Zement)
        s = (d >= rr_e) & (d < rr_e + 1.2)
        rr = np.where(s, rr * 0.86, rr); gg = np.where(s, gg * 0.86, gg); bb = np.where(s, bb * 0.86, bb)

    # Politur-Aufhellung gross und nahtlos
    sh = np.sin(2 * np.pi * (2 * xx + 1 * yy) / N) * 0.020
    speichern("terrazzo", np.stack([rr + sh, gg + sh, bb + sh], -1))


if __name__ == "__main__":
    print("Textur-Charge 5 (th9, Grossbauten):")
    for fn in (glasraster, bueropaneel, stadionrasen, marmorboden,
               burgmauer, betonwerkstein, metallpaneel, terrazzo):
        fn()
    print("fertig ->", OUT)
