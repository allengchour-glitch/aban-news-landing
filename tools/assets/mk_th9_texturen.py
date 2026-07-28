# -*- coding: utf-8 -*-
"""Textur-Charge 5 (th9) fuer die Grossbauten der Stadt:
Wolkenkratzer, Stadion, Museum, Mall, Krankenhaus, Hotel, Burg, Wasserturm.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

UEBERARBEITUNG (auf th15/th28-Niveau gehoben):
Die erste Fassung war flau, wolkig und airbrush-artig -- Flaechen ohne echte
Mikrostruktur, Elemente wie aufgeklebt. Jetzt durchgehend die th15-Technik:
Hoehenfeld -> relief() / schlagschatten() -> Licht, plus feinstruktur()/strich()
+ schaerfen() fuer echtes Korn statt Wolken. Bruchsteine ueber poly_stamp().

FALLEN (teuer gelernt, gelten weiter):
 * np.ix_ NUR mit 1-D-Indizes (in noise()/patch() korrekt);
   fuer 2-D-Indexraster IMMER direktes Fancy-Indexing tint[iy, ix].
 * Nahtlosigkeit ausschliesslich ueber Wrap-/Modulo-Arithmetik:
     noise()        -- Gitter teilt N, Basis per mode='wrap' gepaddet
     feinstruktur() -- Mittelung ueber np.roll
     strich()       -- gescherte Faserzuege, ebenfalls nur np.roll
     blur()         -- separabler Box-Blur ueber np.roll
     wrap_d()       -- kuerzester Abstand ueber die Kachelgrenze
     patch()        -- lokaler Stempel mit modulo-gewickelten Indizes
     alle sin/cos   -- ausschliesslich ganzzahlige Frequenzen ueber N
     Domain-Warp    -- nur mit periodischen Feldern, VOR dem Modulo angewandt
 * STRUKTUR-RASTER IMMER UM EINE HALBE EINHEIT VERSETZEN, damit die Kachel-
   grenze nicht in einer Fuge liegt. Die alte Fassung hatte genau das falsch:
   betonwerkstein (Randdiff v 27.7!), bueropaneel (21.9), marmorboden (5.3/5.9)
   und metallpaneel (h 2.7) legten ihre Fuge exakt auf den Kachelrand.
 * Streuobjekte (Bruchsteine) IMMER als konvexe Polygone mit Facetten-Shading
   stempeln -- ein "facettierter Radius" ueber cos(k*theta) erzeugt Blueten-
   formen statt Bruchsteinen.
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th9"
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


def strich(seed, L, steigung=0.0, achse=0):
    """gezogene Fasern entlang einer GENEIGTEN Geraden (Halme, Buerstenschliff,
    Schmutzfahnen). Nur np.roll -> nahtlos. achse=0: Zug in y, Drift in x."""
    a = np.random.default_rng(seed).random((N, N)).astype(np.float32)
    acc = np.zeros_like(a)
    for i in range(-L, L + 1):
        d2 = int(round(i * steigung))
        if achse == 0:
            acc += np.roll(np.roll(a, i, axis=0), d2, axis=1)
        else:
            acc += np.roll(np.roll(a, d2, axis=0), i, axis=1)
    return acc / (2 * L + 1)


def schaerfen(a, r=1, k=1.0):
    """Unschaerfemaske: hebt die Mikrostruktur heraus (macht aus Wolke Korn)"""
    return a + (a - blur(a, r)) * k


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


# ------------------------------------------------- 1) Glasraster (Vorhangfassade)
def glasraster():
    """Vorhangfassade. Frueher: flache Farbverlaeufe je Scheibe (Plastik-Look).
    Jetzt: echte Spiegelung einer Umgebung, die je Scheibe leicht versetzt
    abgetastet wird (Scheiben stehen nie exakt in einer Ebene) + Sprossen als
    Hoehenfeld mit Relief und Schlagschatten auf das zurueckversetzte Glas."""
    cols, rows = 8, 16                      # 64 x 32 px Felder
    # halber Versatz -> die Kachelgrenze liegt MITTEN in der Scheibe, nie auf
    # einer Sprosse
    cx = (xx / N * cols) + 0.5
    cy = (yy / N * rows) + 0.5
    ix = np.floor(cx).astype(int) % cols; iy = np.floor(cy).astype(int) % rows
    fx = cx % 1.0; fy = cy % 1.0

    r = np.random.default_rng(901)

    # ---- Sprossenprofil als Hoehenfeld (Alu-Riegel, Glas liegt zurueck)
    dx_ = np.minimum(fx, 1 - fx); dy_ = np.minimum(fy, 1 - fy)
    sx = np.clip((0.085 - dx_) / 0.022, 0, 1)
    sy = np.clip((0.135 - dy_) / 0.030, 0, 1)
    rahmen = np.maximum(sx, sy)                       # 1 = Sprosse
    h = rahmen * 3.2
    h += np.maximum(np.clip((0.045 - dx_) / 0.020, 0, 1),
                    np.clip((0.070 - dy_) / 0.026, 0, 1)) * 1.1   # Deckschale
    h = blur(h, 1)
    lit = relief(h, 0.62)
    ao = schlagschatten(h, 6, 0.42)                   # Sprossenschatten aufs Glas

    # ---- gespiegelte Umgebung (periodisch): Himmel + gegenueberliegender Bau
    wolken = strich(902, 7, 0.0, achse=1)             # waagrecht gezogene Baender
    wolken = schaerfen(blur(wolken, 2, 6), 3, 0.9)
    stufen = np.floor(noise(3, 903) * 6.0) / 6.0      # harte Reflexplateaus
    stufen = blur(stufen, 1)
    env = 0.26 + stufen * 0.44 + (wolken - 0.5) * 0.55
    env += np.clip(noise(5, 904) - 0.62, 0, 1) * 0.55  # helle Wolkenkanten
    env -= np.clip(0.34 - noise(4, 905), 0, 1) * 0.60  # dunkle Gebaeudeflanken
    env = np.clip(env, 0.02, 1.25).astype(np.float32)

    # je Scheibe leicht versetzt abtasten -> der Reflex bricht an jeder Fuge
    jy = (r.integers(-26, 27, (rows, cols)))[iy, ix]
    jx = (r.integers(-26, 27, (rows, cols)))[iy, ix]
    sy_i = (yy.astype(np.int32) + jy) % N
    sx_i = (xx.astype(np.int32) + jx) % N
    spiegel = env[sy_i, sx_i]                          # 2-D-Fancy-Indexing!

    # Scheibeneigener Verlauf (jede Scheibe kippt minimal -> eigener Himmelsanteil)
    kipp = r.random((rows, cols)).astype(np.float32)[iy, ix]
    spiegel = spiegel * 0.62 + (0.30 + (1 - fy) * 0.52 * (0.5 + kipp)) * 0.38
    # Glas ist dunkler als die Umgebung und leicht getoent
    t = r.random((rows, cols)).astype(np.float32)[iy, ix]
    spiegel *= (0.72 + t * 0.36)

    # ---- Jalousien in einem Teil der Scheiben (harte Lamellen, kein Verlauf)
    jal = (r.random((rows, cols)) < 0.30)[iy, ix]
    stand = r.random((rows, cols)).astype(np.float32)[iy, ix] * 0.75 + 0.15
    lam = 0.5 + 0.5 * np.sin(2 * np.pi * fy * 13.0)
    lam = np.clip((lam - 0.30) * 2.6, 0, 1)
    lam_m = jal & (fy < stand)
    lamelle = 0.52 + lam * 0.34 + (feinstruktur(906, 0, 2) - 0.5) * 0.10
    lamelle -= np.clip((fy - stand + 0.05) / 0.05, 0, 1) * 0.22    # Saum unten

    # ---- beleuchtete Bueros (warm, mit Deckenleuchtenreihe)
    lit_m = (r.random((rows, cols)) > 0.86)[iy, ix]
    decke = np.clip(1 - np.abs(((fy * 3.0) % 1.0) - 0.5) / 0.16, 0, 1)
    innen = 0.46 + decke * 0.40 * np.clip((0.55 - fy) / 0.55, 0, 1)
    innen += (noise(6, 907) - 0.5) * 0.12

    glas = np.where(lam_m, lamelle, spiegel)
    glas = np.where(lit_m & ~lam_m, np.maximum(spiegel * 0.5, innen), glas)

    # Glas-Mikrostruktur: leichte Walzwelligkeit + Staub, sonst wirkt es wie Farbe
    glas += (strich(908, 6, 0.0, achse=1) - 0.5) * 0.055
    glas += (feinstruktur(909, 1, 1) - 0.5) * 0.045
    glas *= (1 - ao * 0.42)                                        # Sprossenschatten
    glas -= np.clip((0.16 - dy_) / 0.16, 0, 1) * 0.05              # Kantenabdunklung

    # ---- Alu-Sprosse: gebuerstet, mit Kantenlicht
    schliff = schaerfen(strich(910, 5, 0.0, achse=1), 1, 1.4)
    alu = 0.58 + (schliff - 0.5) * 0.30 + (lit - 0.5) * 0.85
    alu += (noise(6, 911) - 0.5) * 0.07
    alu -= np.clip(noise(5, 912) - 0.66, 0, 1) * 0.28              # Verwitterung

    m = rahmen > 0.5
    v = np.where(m, alu, glas)
    # Schmutzfahnen unter den waagrechten Riegeln (laufen ueber das Glas)
    fahne = schaerfen(strich(913, 16, 0.0, achse=0), 2, 1.2)
    v -= np.clip((fy - 0.10) / 0.30, 0, 1) * np.clip(fahne - 0.54, 0, 1) * 1.7 * 0.30

    rr = np.where(m, v * 0.97, v * 0.60 + 0.02)
    gg = np.where(m, v * 0.99, v * 0.76 + 0.03)
    bb = np.where(m, v * 1.03, v * 0.98 + 0.05)
    # beleuchtete Bueros ins Warme ziehen
    warm = lit_m & ~lam_m
    rr = np.where(warm, rr * 1.55, rr); gg = np.where(warm, gg * 1.22, gg)
    speichern("glasraster", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 2) Bueropaneel (helle Fassade)
def bueropaneel():
    """Alu-Verbundplatten. Frueher: reine Airbrush-Verlaeufe, dazu lag die
    waagrechte Fuge exakt auf dem Kachelrand (Randdiff 21.9). Jetzt: echte
    Fugengeometrie ueber ein Hoehenfeld, gebuersteter Schliff + Orangenhaut."""
    cols, rows = 4, 8                       # 128 x 64 px Paneele
    # halber Versatz in BEIDEN Achsen -> Kachelgrenze mitten auf dem Paneel
    cx = (xx / N * cols) + 0.5
    cy = (yy / N * rows) + 0.5
    ix = np.floor(cx).astype(int) % cols; iy = np.floor(cy).astype(int) % rows
    fx = cx % 1.0; fy = cy % 1.0

    dx_ = np.minimum(fx, 1 - fx); dy_ = np.minimum(fy, 1 - fy)
    jx = 0.013; jy = 0.026                  # halbe Fugenbreite
    face = np.clip((dx_ - jx) / 0.010, 0, 1) * np.clip((dy_ - jy) / 0.018, 0, 1)

    r = np.random.default_rng(911)
    t = r.random((rows, cols)).astype(np.float32)[iy, ix]
    warm = r.random((rows, cols)).astype(np.float32)[iy, ix]
    beule = r.random((rows, cols)).astype(np.float32)[iy, ix]

    # ---- Hoehenfeld: Paneel vorn, Fuge tief; Paneel leicht bauchig (Blechspannung)
    h = face * 2.6
    h += face * (np.sin(np.pi * fx) * np.sin(np.pi * fy)) * (0.35 + beule * 0.75)
    h += face * (noise(4, 912) - 0.5) * 0.55           # Oberflaechenwelligkeit
    h = blur(h, 1)
    lit = relief(h, 0.60)
    ao = schlagschatten(h, 5, 0.55)

    # ---- Oberflaeche: Buerstenschliff laengs + Orangenhaut der Lackierung
    schliff = schaerfen(strich(914, 6, 0.0, achse=1), 1, 1.5)
    haut = schaerfen(feinstruktur(915, 1, 1), 2, 1.1)
    grund = 0.700 + t * 0.105
    grund += (schliff - 0.5) * 0.085
    grund += (haut - 0.5) * 0.115
    grund += (noise(6, 916) - 0.5) * 0.075
    grund += (noise(3, 917) - 0.5) * 0.055             # grossflaechige Tonwanderung
    grund += (lit - 0.5) * 0.42                        # Woelbungslicht

    # Schmutzfahnen unter der Fuge: gezogen, nicht als Verlauf gemalt
    fahne = schaerfen(strich(918, 18, 0.06, achse=0), 2, 1.3)
    lauf = np.clip((fy - jy) / 0.34, 0, 1) * np.clip((0.62 - fy) / 0.62, 0, 1) * 2.0
    grund -= np.clip(lauf, 0, 1) * np.clip(fahne - 0.52, 0, 1) * 1.9 * 0.26
    # Regenschleier unter der senkrechten Fuge
    grund -= np.clip((0.10 - dx_) / 0.10, 0, 1) * np.clip(noise(6, 919) - 0.56, 0, 1) * 0.55

    # ---- Befestigung: Senkschrauben in den Paneelecken (mit echter Delle)
    hs = np.zeros((N, N), dtype=np.float32)
    kopf = np.zeros((N, N), dtype=np.float32)
    for gy in range(rows):
        for gx in range(cols):
            for oy in (0.085, 0.915):
                for ox in (0.045, 0.955):
                    py = (gy + oy - 0.5) * (N / rows)
                    pxx = (gx + ox - 0.5) * (N / cols)
                    ys, xs, ddy, ddx = patch(py, pxx, 5)
                    d = np.sqrt(ddy * ddy + ddx * ddx)
                    kegel = np.clip(1 - d / 3.2, 0, 1)
                    sub = hs[np.ix_(ys, xs)]
                    hs[np.ix_(ys, xs)] = np.maximum(sub, kegel)
                    sk = kopf[np.ix_(ys, xs)]
                    kopf[np.ix_(ys, xs)] = np.maximum(sk, np.clip(1 - d / 2.2, 0, 1))
    grund += (relief(-hs * 1.5, 1.5) - 0.5) * 0.85      # Senkung: Licht/Schatten
    grund -= kopf * 0.055

    # ---- Fuge: dunkler Schattenspalt mit Dichtband
    fuge = 0.245 + noise(6, 920) * 0.075 + (haut - 0.5) * 0.10
    fuge -= np.clip((jy + 0.012 - dy_) / 0.012, 0, 1) * 0.06

    v = fuge * (1 - face) + grund * face
    v *= (1 - ao * 0.30)
    v = np.clip(v, 0.04, 1.10)

    rr = v * (1.000 + warm * 0.020 * face)
    gg = v * 0.986
    bb = v * (0.946 - warm * 0.022 * face)
    speichern("bueropaneel", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 3) Stadionrasen (Maehstreifen)
def stadionrasen():
    """Frueher: flache Streifen, Halme nur als Rauschen angedeutet, insgesamt
    zu dunkel. Jetzt: echte Halme ueber gescherte Faserzuege + Schaerfung, die
    Maehrichtung kippt die Halme (und damit das Licht) je Bahn."""
    streifen = 8                            # 8 Maehbahnen (64 px)
    # halber Versatz -> Bahnkante nicht auf dem Kachelrand
    sxf = (xx / N * streifen) + 0.5
    s = np.floor(sxf).astype(int) % 2
    kante = np.abs((sxf % 1.0) - 0.5) * 2
    weich = np.clip((0.965 - kante) / 0.055, 0, 1)

    # ---- Halme: zwei Zugrichtungen, je Bahn eine (gemaeht hin und zurueck)
    hA = schaerfen(strich(921, 7, 0.42, achse=0), 2, 2.3)
    hB = schaerfen(strich(922, 7, -0.42, achse=0), 2, 2.3)
    halm = np.where(s > 0, hA, hB)
    halm = halm * weich + (hA * 0.5 + hB * 0.5) * (1 - weich)   # Uebergang an der Kante
    buesch = schaerfen(feinstruktur(923, 1, 1), 1, 1.5)         # Buescheligkeit
    grob = noise(5, 924)

    # Halme, die zum Licht zeigen, sind heller -> das ist der Streifeneffekt
    richt = np.where(s > 0, 1.17, 0.845)
    richt = richt * weich + 1.0 * (1 - weich)

    v = 0.545 + (halm - 0.5) * 0.62 + (buesch - 0.5) * 0.20 + (grob - 0.5) * 0.115
    # Halmspitzen fangen Licht
    v += np.clip(halm - 0.66, 0, 1) * 0.85
    # Schnittspuren quer zur Bahn (Walzenabdruck), dezent
    v += (0.5 + 0.5 * np.sin(2 * np.pi * yy * 32 / N + (noise(5, 925) - 0.5) * 4.0)) * 0.030
    v *= richt

    # ---- abgespielte Stellen: Erde scheint durch
    kahl = np.clip(noise(4, 926) - 0.60, 0, 1) * 2.4
    kahl = np.clip(kahl * (0.55 + buesch * 0.9), 0, 1)
    erde = 0.30 + (feinstruktur(927, 1, 1) - 0.5) * 0.26 + noise(6, 928) * 0.14

    v = np.clip(v, 0.05, 1.30)
    rr = v * (0.300 + noise(4, 929) * 0.075)
    gg = v * (0.815 + (grob - 0.5) * 0.10)
    bb = v * 0.275
    # Erdanteil einblenden (warm braun)
    rr = rr * (1 - kahl) + erde * 0.52 * kahl
    gg = gg * (1 - kahl) + erde * 0.40 * kahl
    bb = bb * (1 - kahl) + erde * 0.27 * kahl
    # vereinzelte helle Fremdhalme / Samen
    fl = np.clip(feinstruktur(930, 2, 0) * 1.7 - 1.02, 0, 1) * 2.4
    rr += np.clip(fl, 0, 1) * 0.10; gg += np.clip(fl, 0, 1) * 0.13
    speichern("stadionrasen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 4) Marmorboden (poliert)
def marmorboden():
    """Frueher: weiche Aderwolken, ausgewaschen -- und die 2x2-Plattenfuge lag
    exakt auf dem Kachelrand (sichtbares Fugenkreuz, Randdiff 5.3/5.9).
    Jetzt: Fuge um eine halbe Platte versetzt, Adern mit dunklem Kern und
    hellem Saum, Kalzitkorn und feine Polierkratzer."""
    w1 = noise(5, 931); w2 = noise(4, 932); w3 = noise(6, 937)
    # Domain-Warp -> Adern laufen nicht schnurgerade
    X = xx + (w1 - 0.5) * 46.0 + (w3 - 0.5) * 15.0
    Y = yy + (w2 - 0.5) * 46.0 + (noise(6, 938) - 0.5) * 15.0

    def ader(fx_, fy_, ph, breite, seed):
        t = np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph + (noise(5, seed) - 0.5) * 5.0)
        kern = np.clip(1 - np.abs(t) / breite, 0, 1) ** 1.4
        saum = np.clip(1 - np.abs(t) / (breite * 3.4), 0, 1) ** 2.0
        return kern, saum

    k1, s1 = ader(2, 1, 0.0, 0.045, 933)
    k2, s2 = ader(1, -3, 1.7, 0.030, 934)
    k3, s3 = ader(4, 3, 3.1, 0.016, 935)
    k4, s4 = ader(-3, 5, 4.4, 0.011, 936)

    kern = np.clip(k1 * 1.00 + k2 * 0.80 + k3 * 0.55 + k4 * 0.40, 0, 1.4)
    saum = np.clip(s1 * 0.60 + s2 * 0.50 + s3 * 0.35 + s4 * 0.25, 0, 1.2)

    # Grundmasse: hell, mit feinem Kalzitkorn (nicht glatt!)
    korn = schaerfen(feinstruktur(939, 1, 1), 2, 1.3)
    v = 0.935 + (korn - 0.5) * 0.075 + (noise(7, 940) - 0.5) * 0.055
    v += saum * 0.045                                    # heller Saum neben der Ader
    v -= kern * 0.52                                     # dunkler Aderkern
    v -= np.clip(noise(4, 941) - 0.58, 0, 1) * 0.22      # graue Wolkenzonen
    # Aderrelief: die weichere Ader liegt minimal tiefer -> Politur bricht dort
    hv = -kern * 0.9 + saum * 0.15
    v += (relief(blur(hv, 1), 0.55) - 0.5) * 0.30

    # feine Polierkratzer in mehreren Richtungen (macht die Politur glaubhaft)
    for sd, st in ((942, 0.0), (943, 0.55), (944, -0.75)):
        kr = schaerfen(strich(sd, 9, st, achse=1), 1, 2.2)
        v += (kr - 0.5) * 0.022

    # ---- Plattenfuge 2x2, um eine HALBE Platte versetzt
    g = 2.0
    fx = ((xx / N * g) + 0.5) % 1.0
    fy = ((yy / N * g) + 0.5) % 1.0
    dxx = np.minimum(fx, 1 - fx); dyy = np.minimum(fy, 1 - fy)
    fuge = np.clip(1 - np.minimum(dxx, dyy) / 0.0045, 0, 1)
    fase = np.clip(1 - np.abs(np.minimum(dxx, dyy) - 0.010) / 0.006, 0, 1)
    v = v * (1 - fuge * 0.30) + fase * 0.030

    # Politur: breite, flache Glanzwelle (nahtlose ganzzahlige Frequenz)
    v += np.sin(2 * np.pi * (1 * xx + 2 * yy) / N) * 0.020
    v += np.clip(np.sin(2 * np.pi * (3 * xx - 2 * yy) / N), 0, 1) ** 6 * 0.045
    v = np.clip(v, 0.05, 1.05)

    kalt = np.clip(kern + saum * 0.4, 0, 1)              # Adern graublau/gold
    gold = np.clip(k2 + k4, 0, 1)
    rr = v * (1.000 - kalt * 0.030 + gold * 0.035)
    gg = v * (0.988 - kalt * 0.010 + gold * 0.012)
    bb = v * (0.962 + kalt * 0.045 - gold * 0.040)
    speichern("marmorboden", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 5) Burgmauer (Bruchstein)
def burgmauer():
    """Frueher: Voronoi-Blasen mit gemaltem Moertel -- weich, flach, ohne
    Steinrelief. Jetzt: echte Bruchsteine ueber poly_stamp() in groben
    Schichten, Hoehenfeld -> Relief + Schlagschatten in die Fugen."""
    r = np.random.default_rng(941)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    reihen = 9
    rh = N / reihen                                  # ~57 px Schichthoehe
    kid = 0
    # halber Versatz -> die Kachelgrenze liegt MITTEN in einer Schicht,
    # nicht in der Lagerfuge
    for j in range(reihen):
        ymit = (j + 0.5) * rh + rh * 0.5
        x = r.random() * N
        ziel = x + N
        while x < ziel:
            w = 30.0 + r.random() ** 1.3 * 62.0
            hgt = rh * (0.72 + r.random() * 0.20)
            if x + w > ziel:
                w = ziel - x
            if w < 16.0:
                break
            cyc = ymit + (r.random() - 0.5) * rh * 0.16
            cxc = x + w * 0.5
            nf = int(r.integers(5, 8))
            roff = 0.80 + r.random(nf).astype(np.float32) * 0.34
            rad = np.sqrt(w * hgt) * 0.5 / 0.95
            ani = float(np.sqrt(hgt / w))
            poly_stamp(H, ID, FS, kid, cyc, cxc, rad, roff,
                       float(r.random() * 6.283), ani,
                       float((r.random() - 0.5) * 0.20),
                       float(r.random() * 2.2),
                       flach=0.42, kuppe=0.30)
            kid += 1
            x += w + 2.0 + r.random() * 4.0

    # Zwickelsteine in die groesseren Moertelnester
    for _ in range(150):
        cyc = r.random() * N; cxc = r.random() * N
        nf = int(r.integers(5, 8))
        roff = 0.78 + r.random(nf).astype(np.float32) * 0.36
        poly_stamp(H, ID, FS, kid, cyc, cxc, 6.0 + r.random() * 7.0, roff,
                   float(r.random() * 6.283), 0.75 + r.random() * 0.6,
                   float(r.random() * 6.283), float(r.random() * 1.2),
                   flach=0.42, kuppe=0.30)
        kid += 1

    stein = H > -1e5
    Hc = np.where(stein, H, -2.6).astype(np.float32)
    Hs = blur(Hc, 1)
    lit = relief(Hs, 0.52)
    ao = np.clip(Hs - blur(Hs, 7), -6, 6) * 0.075
    schatten = schlagschatten(Hs, 6, 0.55)

    # ---- Steinflaeche: rau gespitzt, je Stein eigener Ton
    tint = r.random(kid + 1).astype(np.float32)[ID]
    warm = r.random(kid + 1).astype(np.float32)[ID]
    rau = schaerfen(feinstruktur(943, 1, 1), 1, 1.6)
    pick = schaerfen(feinstruktur(944, 0, 1), 1, 1.4)         # Spitzeisenspuren
    face = 0.375 + tint * 0.235
    face += (rau - 0.5) * 0.26 + (pick - 0.5) * 0.14
    face += (noise(7, 945) - 0.5) * 0.13
    face = face * FS * (0.82 + (lit - 0.5) * 0.62) + ao
    face -= np.clip(noise(8, 946) - 0.72, 0, 1) * 0.42        # Ausbrueche/Pocken
    face += np.clip(noise(7, 947) - 0.74, 0, 1) * 0.30        # frische Bruchkanten

    # ---- Kalkmoertel: sandig, koernig, zurueckversetzt
    sand = schaerfen(feinstruktur(948, 1, 1), 1, 1.8)
    mortel = 0.560 + noise(6, 949) * 0.115 + (sand - 0.5) * 0.30
    mortel += (noise(8, 950) - 0.5) * 0.10
    mortel -= np.clip(noise(5, 951) - 0.58, 0, 1) * 0.20      # ausgewaschene Zonen

    v = np.where(stein, face, mortel)
    v *= (1 - schatten * 0.36)

    # ---- Verwitterung ueber alles: Flechten, Kalksinter, Regenfahnen
    flecht = np.clip(noise(6, 952) - 0.64, 0, 1) * 2.1
    sinter = np.clip(noise(5, 953) - 0.70, 0, 1) * 2.0
    fahne = schaerfen(strich(954, 20, 0.0, achse=0), 3, 1.0)
    v -= np.clip(fahne - 0.56, 0, 1) * 1.6 * 0.16
    v *= (0.90 + noise(3, 955) * 0.22)                        # grossflaechige Toenung
    v = np.clip(v, 0.03, 1.05)

    rr = v * (1.000 + warm * 0.055)
    gg = v * (0.948 + warm * 0.020)
    bb = v * (0.868 - warm * 0.040)
    rr -= np.clip(flecht, 0, 1) * 0.055; gg -= np.clip(flecht, 0, 1) * 0.010
    bb -= np.clip(flecht, 0, 1) * 0.065                       # gruenliche Flechten
    rr += np.clip(sinter, 0, 1) * 0.075; gg += np.clip(sinter, 0, 1) * 0.075
    bb += np.clip(sinter, 0, 1) * 0.070                       # heller Kalkschleier
    speichern("burgmauer", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 6) Betonwerkstein (Grossplatten)
def betonwerkstein():
    """Frueher: milchig-flau, praktisch strukturlos -- und die Fuge lag exakt
    auf dem Kachelrand (Randdiff 27.7 / 13.9, der schlimmste Fall der Charge).
    Jetzt: Raster in beiden Achsen halb versetzt, gestrahlte Oberflaeche mit
    sichtbarem Zuschlagkorn (eigenes Mikro-Hoehenfeld) und echten Fasen."""
    g = 2                                    # 2x2 Grossplatten (256 px)
    # halber Versatz in beiden Achsen -> Kachelgrenze mitten auf der Platte
    cy = (yy / N * g) + 0.5
    iy = np.floor(cy).astype(int) % g
    cx = (xx / N * g) + 0.5 + (iy % 2) * 0.5         # Laeuferverband
    ix = np.floor(cx).astype(int) % g
    fx = cx % 1.0; fy = cy % 1.0

    dx_ = np.minimum(fx, 1 - fx); dy_ = np.minimum(fy, 1 - fy)
    j = 0.0075                               # halbe Fugenbreite ~1.9 px
    fase = 0.019
    face = np.clip((dx_ - j) / 0.006, 0, 1) * np.clip((dy_ - j) / 0.006, 0, 1)

    r = np.random.default_rng(951)
    t = r.random((g, g * 2)).astype(np.float32)[iy, (ix + iy) % (g * 2)]
    hue = r.random((g, g * 2)).astype(np.float32)[iy, (ix + iy) % (g * 2)]

    # ---- Mikro-Hoehenfeld: Zuschlagkoerner + Luftporen + Strahlrauheit
    gk = np.random.default_rng(952).random((N, N)).astype(np.float32)
    korn_m = np.clip((gk - 0.962) / 0.038, 0, 1)
    hmik = blur(korn_m, 1) * 2.2                                # Korn steht vor
    hmik += (feinstruktur(953, 1, 1) - 0.5) * 1.1               # Strahlrauheit
    hmik += (noise(8, 954) - 0.5) * 0.7
    pk = np.random.default_rng(955).random((N, N)).astype(np.float32)
    pore = np.clip((pk - 0.9905) / 0.0095, 0, 1)
    hmik -= blur(pore, 1) * 4.5                                 # Luftporen tief
    mlit = relief(hmik, 0.30)

    # ---- Plattenoberflaeche
    wolke = noise(6, 956); grob = noise(4, 957)
    platte = 0.640 + t * 0.075
    platte += (wolke - 0.5) * 0.115 + (grob - 0.5) * 0.085
    platte += (mlit - 0.5) * 0.75                               # Korn + Poren
    platte += korn_m * 0.075                                    # Quarz hell
    platte -= np.clip(noise(8, 958) - 0.78, 0, 1) * 0.50        # Abplatzer
    # Schalungsspuren / Zementschleier
    platte += (schaerfen(strich(959, 8, 0.0, achse=1), 2, 1.0) - 0.5) * 0.045
    # abgestossene Plattenkanten
    kante_n = np.clip(1 - np.minimum(dy_, dx_) / (j * 2.6), 0, 1)
    platte -= kante_n * np.clip(noise(8, 960) - 0.50, 0, 1) * 0.85
    # Haarrisse
    riss = np.abs(np.sin(2 * np.pi * (xx * 9 + yy * 6) / N + (noise(4, 961) - 0.5) * 8.0))
    rissm = np.clip(1 - riss / 0.016, 0, 1) * np.clip(noise(5, 962) * 1.8 - 0.95, 0, 1) * 3.0
    platte -= np.clip(rissm, 0, 1) * face * 0.16

    # ---- Fase: Licht oben/links, Schatten unten/rechts (harte Kante, kein Verlauf)
    platte += np.clip(1 - np.abs(fy - (j + fase)) / fase, 0, 1) * 0.085
    platte -= np.clip(1 - np.abs(fy - (1 - j - fase)) / fase, 0, 1) * 0.080
    platte += np.clip(1 - np.abs(fx - (j + fase)) / fase, 0, 1) * 0.060
    platte -= np.clip(1 - np.abs(fx - (1 - j - fase)) / fase, 0, 1) * 0.055

    # ---- Fuge: dunkler, koerniger Fugensand
    fuge = 0.335 + noise(6, 963) * 0.115 + (feinstruktur(964, 1, 1) - 0.5) * 0.24
    fuge -= np.clip((fy - (1 - j)) / j, 0, 1) * 0.09

    v = fuge * (1 - face) + platte * face
    v -= np.clip(1 - np.maximum(dy_ / j, dx_ / j), 0, 1) * (1 - face) * 0.09
    # Verwitterung bricht das 2x2-Raster auf
    v *= (0.91 + noise(3, 965) * 0.20)
    v -= np.clip(noise(4, 966) - 0.62, 0, 1) * 0.20             # Nasszonen
    v += np.clip(noise(4, 967) - 0.68, 0, 1) * 0.14             # ausgebleicht
    v = np.clip(v, 0.04, 1.05)

    rr = v * (1.000 + hue * 0.022 * face)
    gg = v * (0.992 + hue * 0.008 * face)
    bb = v * (0.966 - hue * 0.026 * face)
    speichern("betonwerkstein", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 7) Metallpaneel (Trapezblech)
def metallpaneel():
    """Frueher: von Hand gemalte Helligkeitsbaender, aufgeklebte Nieten, harte
    Stossnaht auf dem Kachelrand (Randdiff h 2.7). Jetzt: echtes Trapezprofil
    als Hoehenfeld, Licht ausschliesslich aus relief(), Schrauben mit Delle
    und Schlagschatten, Zink-Blumen als Mikrostruktur."""
    p = N / 8.0                              # 8 Rippen je Kachel (64 px)
    # halbe Periode versetzt -> Kachelgrenze mitten auf dem Steg, nicht im Knick
    u = ((xx + p * 0.5) % p) / p

    # ---- Trapezprofil als Hoehenfeld
    h = np.zeros_like(u)
    h = np.where(u < 0.30, 1.0, h)                                     # Steg oben
    h = np.where((u >= 0.30) & (u < 0.42), 1.0 - (u - 0.30) / 0.12, h)  # Flanke ab
    h = np.where((u >= 0.42) & (u < 0.74), 0.0, h)                     # Tal
    h = np.where(u >= 0.74, (u - 0.74) / 0.26, h)                      # Flanke auf
    h = h * 7.5

    # Stossnaht der Bahnen alle 128 px, um eine halbe Bahn versetzt
    ym = (yy + 64.0) % 128.0
    ueberlapp = np.clip((6.0 - ym) / 6.0, 0, 1)
    h += ueberlapp * 1.9                                    # obere Bahn liegt auf

    # Beulen/Blechspannung (Hoehenfeld, nicht Farbe)
    h += (noise(3, 961) - 0.5) * 1.5 + (noise(5, 962) - 0.5) * 0.7
    # Walzstruktur laengs
    h += (strich(963, 6, 0.0, achse=1) - 0.5) * 0.35

    # ---- Schrauben: Senkung + Kopf, auf dem Steg an jeder Stossnaht
    kopf = np.zeros((N, N), dtype=np.float32)
    for k in range(8):
        for row in range(4):
            pyy = row * 128.0 + 64.0 - 61.0        # dicht an der Stossnaht
            pxx = (k + 0.5) * p - p * 0.5 + 0.15 * p
            ys, xs, ddy, ddx = patch(pyy, pxx, 6)
            d = np.sqrt(ddy * ddy + ddx * ddx)
            sub = h[np.ix_(ys, xs)]
            h[np.ix_(ys, xs)] = sub - np.clip(1 - d / 3.6, 0, 1) * 1.7 \
                + np.clip(1 - d / 1.9, 0, 1) * 2.4
            sk = kopf[np.ix_(ys, xs)]
            kopf[np.ix_(ys, xs)] = np.maximum(sk, np.clip(1 - d / 2.0, 0, 1))

    hs = blur(h, 1)
    lit = relief(hs, 0.50)
    ao = schlagschatten(hs, 7, 0.42)

    # ---- Oberflaeche: verzinkt, gebuerstet laengs, Zinkblumen
    schliff = schaerfen(strich(964, 7, 0.0, achse=1), 1, 1.6)
    blume = np.floor(noise(5, 965) * 7.0) / 7.0             # kristalline Plateaus
    blume = blur(blume, 1)
    v = 0.575 + (lit - 0.5) * 0.95
    v += (schliff - 0.5) * 0.10
    v += (blume - 0.5) * 0.115                              # Zinkblumen
    v += (feinstruktur(966, 1, 1) - 0.5) * 0.055
    v += (noise(7, 967) - 0.5) * 0.055
    v *= (1 - ao * 0.34)

    # Schmutz sammelt sich im Tal, laeuft senkrecht ab
    tal = np.clip((0.62 - hs / 7.5), 0, 1)
    fahne = schaerfen(strich(968, 20, 0.0, achse=0), 3, 1.1)
    v -= tal * np.clip(fahne - 0.52, 0, 1) * 1.8 * 0.24
    v -= np.clip(noise(4, 969) - 0.64, 0, 1) * 0.22         # Verwitterung/Kreidung
    v += kopf * 0.10                                        # Schraubenkopf blank
    v = np.clip(v, 0.03, 1.10)

    # leicht kuehler Stahlton, Rostansatz an den Schrauben
    rost = np.clip(kopf - 0.35, 0, 1) * np.clip(noise(6, 970) - 0.45, 0, 1) * 3.0
    rost = np.clip(rost, 0, 1)
    rr = v * 0.945 + rost * 0.16
    gg = v * 0.975 + rost * 0.07
    bb = v * 1.000 - rost * 0.02
    speichern("metallpaneel", np.stack([rr, gg, bb], -1))


# ------------------------------------------------- 8) Terrazzo (Splitterboden)
# BEWUSST UNVERAENDERT: kantige Splitter, gute Farb- und Groessenstreuung,
# saubere Naht (Randdiff 1.16/0.92) -- die staerkste Textur der Charge.
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
    print("Textur-Charge 5 (th9, Grossbauten):")
    for fn in (glasraster, bueropaneel, stadionrasen, marmorboden,
               burgmauer, betonwerkstein, metallpaneel, terrazzo):
        fn()
    nahtpruefung()
    print("fertig ->", OUT)
