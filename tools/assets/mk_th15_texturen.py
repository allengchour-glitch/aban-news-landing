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
 * STRUKTUR-RASTER IMMER UM EINE HALBE (bzw. VIERTEL-) EINHEIT VERSETZEN,
   damit die Kachelgrenze nicht in einer Fuge/Naht/Rille des Motivs liegt --
   sonst sieht die (mathematisch korrekte) Naht wie ein Fehler aus.
   Betrifft hier: acker_furchen, holzdeck, ziegelmauer_rot, wellblech.
 * Streuobjekte (Steine/Blaetter) IMMER als konvexe Polygone mit Facetten-
   Shading stempeln -- ein "facettierter Radius" ueber cos(k*theta) erzeugt
   Bluetenformen statt Bruchsteinen (in der ersten Fassung passiert).
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th15"
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


# ------------------------------------------------ 1) Wasser (Hafenbecken)
def wasser():
    # Domain-Warp aus periodischen Feldern -> Wellen laufen nicht schnurgerade
    wA = (noise(4, 1501) - 0.5); wB = (noise(4, 1502) - 0.5)
    X = xx + wA * 24.0 + (noise(6, 1503) - 0.5) * 9.0
    Y = yy + wB * 24.0 + (noise(6, 1504) - 0.5) * 9.0

    # Duenungsfeld: viele Richtungen, ausschliesslich ganzzahlige Frequenzen
    wellen = [(3, 1, 1.00, 0.30), (2, 3, 0.86, 1.90), (4, -2, 0.70, 2.70),
              (-2, 5, 0.58, 0.80), (6, 3, 0.46, 4.10), (3, -7, 0.40, 5.20),
              (9, 2, 0.30, 1.10), (2, -10, 0.26, 3.30), (13, 5, 0.19, 2.20),
              (-6, 12, 0.17, 4.80), (17, 4, 0.12, 0.55), (5, -19, 0.10, 2.95)]
    h = np.zeros((N, N), dtype=np.float32); tot = 0.0
    for fx_, fy_, amp, ph in wellen:
        h += amp * np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph)
        tot += amp
    h /= tot
    # Kapillarkraeuselung: viele hochfrequente Richtungen (KEINE gerichtete
    # feinstruktur -- die hat Kammspuren wie gebuerstetes Metall erzeugt).
    X2 = xx + (noise(5, 1520) - 0.5) * 9.0
    Y2 = yy + (noise(5, 1521) - 0.5) * 9.0
    rip = np.zeros((N, N), dtype=np.float32)
    for fx_, fy_, amp, phr in [(19, 7, 1.00, 0.4), (-7, 23, 0.92, 2.1),
                               (29, -13, 0.76, 3.9), (11, 31, 0.64, 1.5),
                               (37, 5, 0.50, 5.0), (-17, -27, 0.46, 0.9)]:
        rip += amp * np.sin(2 * np.pi * (fx_ * X2 + fy_ * Y2) / N + phr)
    rip = blur(rip / 4.3, 1)                       # entkoernt -> Welle statt Punkte
    h += rip * 0.26
    h += (noise(7, 1505) - 0.5) * 0.18

    # Kaustik-Netz: breite Lichtbaender auf der Oberflaeche (typisch Wasser)
    wc = (noise(4, 1522) - 0.5) * 4.5
    netz = np.clip(1 - np.abs(np.sin(2 * np.pi * (5 * X + 3 * Y) / N + wc)) * 2.8, 0, 1)
    netz += np.clip(1 - np.abs(np.sin(2 * np.pi * (-3 * X + 8 * Y) / N + wc * 1.3)) * 3.2, 0, 1)
    netz += np.clip(1 - np.abs(np.sin(2 * np.pi * (9 * X - 2 * Y) / N + wc * 0.8)) * 3.6, 0, 1)
    netz = blur(np.clip(netz, 0, 2), 2) * 0.5

    # Kaemme aufsteilen (Gerstner-Anmutung: Kamm scharf, Tal breit und weich)
    hn = (h - h.min()) / (h.max() - h.min() + 1e-6)
    hs = hn ** 1.35
    kamm = np.clip((hn - 0.62) / 0.38, 0, 1)

    lit = relief(blur(h, 3), 5.0)                  # Hauptduenung
    fein = relief(blur(h, 1), 6.0)                 # Kraeuselung
    spek = np.clip(lit - 0.58, 0, 1) ** 1.3 * 1.5
    spek += np.clip(fein - 0.62, 0, 1) ** 1.4 * 1.15
    spek += netz * (0.20 + hn * 0.45)

    # Schaumspitzen: kleine Kronen AUF den hoechsten Kaemmen, nicht runde Kleckse
    krone = np.clip((fein - 0.70) * 3.2, 0, 1) * np.clip((hn - 0.72) / 0.28, 0, 1)
    spritz = np.clip(noise(8, 1508) * 1.7 - 0.72, 0, 1) * 2.2
    schaum = np.clip(krone * spritz * 2.6, 0, 1)
    schaum = np.clip(schaum * 0.8 + blur(schaum, 1) * 1.1, 0, 1)

    # Tiefenfarbe: dunkles Petrol im Tal, mittleres Blau auf der Flaeche
    gross = noise(3, 1510)
    rr = 0.028 + hs * 0.095 + gross * 0.030
    gg = 0.175 + hs * 0.245 + gross * 0.055
    bb = 0.305 + hs * 0.300 + gross * 0.060
    # Himmelsreflex auf den Wellenflanken
    rr += spek * 0.30 + kamm * 0.040
    gg += spek * 0.42 + kamm * 0.080
    bb += spek * 0.46 + kamm * 0.100
    # Schaum weiss-blaeulich
    rr = rr * (1 - schaum) + schaum * 0.92
    gg = gg * (1 - schaum) + schaum * 0.96
    bb = bb * (1 - schaum) + schaum * 0.99
    speichern("wasser", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 2) Gleisschotter (Bahnkoerper)
def gleisschotter():
    r = np.random.default_rng(1511)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    # dicht gepackt: erst Fuellsplitt, dann die grossen Brocken obenauf
    K1, K2 = 1000, 470
    K = K1 + K2
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = np.concatenate([4.0 + r.random(K1).astype(np.float32) ** 1.4 * 5.5,
                          9.0 + r.random(K2).astype(np.float32) ** 1.2 * 12.0])
    z = np.concatenate([r.random(K1).astype(np.float32) * 2.2,
                        2.6 + r.random(K2).astype(np.float32) * 3.4])
    ani = 0.72 + r.random(K).astype(np.float32) * 0.55
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 8, K)
    ang0 = r.random(K).astype(np.float32) * 6.283

    for i in range(K):
        roff = 0.72 + r.random(int(nf[i])).astype(np.float32) * 0.46
        poly_stamp(H, ID, FS, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], z[i], flach=0.30, kuppe=0.46)

    stein = H > -1e5
    Hc = np.where(stein, H, -1.5).astype(np.float32)
    lit = relief(blur(Hc, 1), 0.55)
    ao = np.clip(Hc - blur(Hc, 8), -6, 6) * 0.050

    tint = r.random(K).astype(np.float32)[ID]
    warm = r.random(K).astype(np.float32)[ID]
    rau = (feinstruktur(1512, 1, 1) - 0.5) * 0.15 + (noise(8, 1513) - 0.5) * 0.11
    face = 0.30 + tint * 0.40 + rau
    face = face * FS * (0.80 + (lit - 0.5) * 0.70) + ao
    face += np.clip(noise(8, 1514) - 0.76, 0, 1) * 0.40        # frische Bruchkanten
    face -= np.clip(noise(6, 1515) - 0.70, 0, 1) * 0.24        # Staub/Schatten

    # Feinanteil / Bettung in den wenigen Luecken
    fein = 0.150 + noise(6, 1516) * 0.10 + (feinstruktur(1517, 1, 1) - 0.5) * 0.11
    v = np.where(stein, face, fein)
    # grossflaechige Verschmutzung (Bremsstaub) bricht die Wiederholung
    v *= (0.90 + noise(3, 1518) * 0.24)
    v = np.clip(v, 0.03, 1.0)

    rr = v * (1.00 + warm * 0.060)
    gg = v * (0.985 + warm * 0.015)
    bb = v * (0.960 - warm * 0.060)
    speichern("gleisschotter", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 3) Kies fein (Parkweg)
def kies_fein():
    r = np.random.default_rng(1521)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    K = 7200                                   # dicht gepackt -> echter Kiesweg
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = 2.2 + r.random(K).astype(np.float32) ** 1.7 * 4.6
    z = r.random(K).astype(np.float32) * 1.5
    ani = 0.78 + r.random(K).astype(np.float32) * 0.45
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 8, K)
    ang0 = r.random(K).astype(np.float32) * 6.283

    for i in range(K):
        roff = 0.80 + r.random(int(nf[i])).astype(np.float32) * 0.34
        poly_stamp(H, ID, FS, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], z[i], flach=0.42, kuppe=0.55)

    korn = H > -1e5
    Hc = np.where(korn, H, -0.8).astype(np.float32)
    lit = relief(blur(Hc, 1), 1.1)
    ao = np.clip(Hc - blur(Hc, 5), -4, 4) * 0.075

    tint = r.random(K).astype(np.float32)[ID]
    warm = r.random(K).astype(np.float32)[ID]
    v = 0.58 + tint * 0.30
    v = v * FS * (0.84 + (lit - 0.5) * 0.62) + ao
    v += (feinstruktur(1522, 1, 1) - 0.5) * 0.09 + (noise(8, 1523) - 0.5) * 0.06

    # Sandbett in den Restluecken (heller Kalksand, kaum sichtbar)
    bett = 0.50 + noise(7, 1524) * 0.12 + (feinstruktur(1525, 1, 1) - 0.5) * 0.13
    v = np.where(korn, v, bett)
    # begangener Weg: verdichtete helle Spur / feuchte dunkle Stellen
    v *= (0.92 + noise(3, 1526) * 0.20)
    v -= np.clip(noise(4, 1527) - 0.70, 0, 1) * 0.20
    v = np.clip(v, 0.06, 1.0)

    # Kies ist nie einfarbig: warme, graue und rosa Koerner mischen
    kalt = (r.random(K).astype(np.float32)[ID] > 0.62).astype(np.float32) * korn
    rosa = (r.random(K).astype(np.float32)[ID] > 0.86).astype(np.float32) * korn
    rr = v * (1.000 + warm * 0.045 - kalt * 0.055 + rosa * 0.045)
    gg = v * (0.962 + warm * 0.012 - kalt * 0.010 - rosa * 0.030)
    bb = v * (0.878 - warm * 0.060 + kalt * 0.090 - rosa * 0.030)
    speichern("kies_fein", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 4) Acker mit Furchen
def acker_furchen():
    F = 6                                    # 6 Furchen je Kachel (85.3 px)
    warp = (noise(3, 1531) - 0.5) * 44.0 + (noise(5, 1532) - 0.5) * 15.0
    # Viertelversatz -> die Kachelgrenze liegt auf der FLANKE, weder in der
    # Furchensohle noch auf dem Kamm (Naht faellt nicht auf)
    u = xx + warp + N / (4.0 * F)
    ph = 2 * np.pi * u * F / N
    s = 0.5 + 0.5 * np.cos(ph)
    tiefe = 0.42 + noise(3, 1533) * 1.05      # Kaemme unterschiedlich hoch
    # Profil etwas hoeher als die Schollen, sonst verschwindet die Furche --
    # aber nicht uebertreiben, sonst sieht es aus wie Cordstoff
    h = (s ** 0.80) * 4.4 * tiefe             # breiter Kamm, flache Sohle
    h -= np.clip(1.0 - s * 2.4, 0, 1) ** 2 * 1.4

    # --- Schollen/Krumen als gestempelte Erdbrocken (das eigentliche Motiv)
    r = np.random.default_rng(1534)
    Hc = np.full((N, N), -1e6, dtype=np.float32)
    IDc = np.zeros((N, N), dtype=np.int32)
    FSc = np.ones((N, N), dtype=np.float32)
    K = 2600
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = 3.0 + r.random(K).astype(np.float32) ** 1.6 * 9.5
    ani = 0.70 + r.random(K).astype(np.float32) * 0.65
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 9, K)
    ang0 = r.random(K).astype(np.float32) * 6.283
    zz = r.random(K).astype(np.float32) * 1.4
    for i in range(K):
        roff = 0.76 + r.random(int(nf[i])).astype(np.float32) * 0.40
        poly_stamp(Hc, IDc, FSc, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], zz[i], flach=0.55, kuppe=0.42)
    # In der Furchensohle sammelt sich feine Krume -> dort Schollen daempfen
    # Schollen liegen UEBERALL (auch in der Sohle) -- glatte Furchenbaender
    # sahen sonst aus wie Cordstoff-Rillen
    kamm_m = np.clip(s * 1.4 - 0.22, 0, 1)
    scholl = np.where(Hc > -1e5, Hc, 0.0).astype(np.float32)
    w_f = 0.82 + kamm_m * 0.18
    FSc = FSc * w_f + (1 - w_f)
    h = h + scholl * (0.95 + kamm_m * 0.45)
    h += (noise(7, 1535) - 0.5) * 0.55
    h += (feinstruktur(1536, 1, 1) - 0.5) * 0.30

    lit = relief(blur(h, 1), 0.85)                            # Schollen
    weit = relief(blur(h, 13), 0.24)                          # Furchenflanken
    ao = np.clip(h - blur(h, 9), -4, 4) * 0.070

    tint = r.random(K).astype(np.float32)[IDc]
    v = 0.37 + np.clip(s, 0, 1) * 0.07 + tint * 0.11
    v = v * FSc * (0.86 + (lit - 0.5) * 0.62 + (weit - 0.5) * 0.20) + ao
    v += (noise(8, 1537) - 0.5) * 0.08
    v -= np.clip(noise(4, 1538) - 0.54, 0, 1) * 0.22          # feuchte dunkle Zonen
    v = np.clip(v, 0.03, 1.0)

    trock = np.clip(s * 1.3 - 0.30, 0, 1)                     # Kamm trocknet ab
    lehm = noise(4, 1543)                                     # Bodenart wechselt
    rr = v * (0.86 + trock * 0.15 + lehm * 0.10)
    gg = v * (0.690 + trock * 0.110 + lehm * 0.045)
    bb = v * (0.520 + trock * 0.090 - lehm * 0.035)

    # Strohreste / Ernterueckstaende: wenige helle kurze Striche auf den Kaemmen
    stroh = np.zeros((N, N), dtype=np.float32)
    Ks = 220
    py = r.random(Ks) * N; px = r.random(Ks) * N
    laenge = 5 + r.random(Ks) * 11
    winkel = r.random(Ks) * np.pi
    for i in range(Ks):
        R = int(laenge[i]) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        ca = np.cos(winkel[i]); sa = np.sin(winkel[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        m = (np.abs(ux) < laenge[i]) & (np.abs(uy) < 0.9)
        sub = stroh[np.ix_(ys, xs)]
        stroh[np.ix_(ys, xs)] = np.where(m, 1.0, sub)
    stroh = np.clip(stroh * 0.8 + blur(stroh, 1) * 0.6, 0, 1) * (0.35 + trock * 0.75)
    rr = rr * (1 - stroh) + stroh * 0.64
    gg = gg * (1 - stroh) + stroh * 0.56
    bb = bb * (1 - stroh) + stroh * 0.36
    speichern("acker_furchen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 5) Blumenwiese
def wiese_blumen():
    # Halme: pixelfeines Rauschen in mehrere Richtungen verschmiert
    h1 = feinstruktur(1551, wy=4, wx=0)
    h2 = feinstruktur(1552, wy=3, wx=1)
    h3 = feinstruktur(1553, wy=1, wx=3)
    buesch = feinstruktur(1554, 1, 1)
    v = 0.60 + (h1 - 0.5) * 0.52 + (h2 - 0.5) * 0.30 + (h3 - 0.5) * 0.20 \
        + (buesch - 0.5) * 0.22
    # Wuchsdichte gross moduliert (sonst wirkt die Wiese wie Filz)
    v += (noise(3, 1555) - 0.5) * 0.30 + (noise(5, 1556) - 0.5) * 0.18
    v -= np.clip(noise(5, 1557) - 0.64, 0, 1) * 0.34          # Schattenluecken
    v = np.clip(v, 0.12, 1.40)

    trocken = np.clip(noise(4, 1558) - 0.54, 0, 1) * 1.7      # vertrocknete Halme
    frisch = np.clip(noise(4, 1563) - 0.56, 0, 1) * 1.6       # frische Triebe
    rr = v * (0.290 + trocken * 0.46 + noise(7, 1559) * 0.085)
    gg = v * (0.800 + trocken * 0.14 + frisch * 0.12)
    bb = v * (0.235 + trocken * 0.12)
    # Klee/dunkelgruene Inseln
    klee = np.clip(noise(4, 1560) - 0.60, 0, 1) * 1.6
    rr -= klee * 0.045; gg -= klee * 0.070; bb -= klee * 0.012

    # --- Bluetchen: weiss (Gaensebluemchen), gelb (Hahnenfuss), lila (Glockenblume)
    pal = np.array([[0.98, 0.97, 0.94],
                    [0.99, 0.85, 0.14],
                    [0.70, 0.44, 0.88]], dtype=np.float32)
    kern = np.array([[0.99, 0.79, 0.10],
                     [0.96, 0.58, 0.05],
                     [0.97, 0.91, 0.48]], dtype=np.float32)
    r = np.random.default_rng(1561)
    # Bluetchen wachsen in Nestern -> nicht gleichmaessig gestreut
    NC = 34
    ny = r.random(NC) * N; nx = r.random(NC) * N
    nart = r.integers(0, 3, NC)
    K = 340
    grp = r.integers(0, NC, K)
    py = (ny[grp] + r.normal(0, 26, K)) % N
    px = (nx[grp] + r.normal(0, 26, K)) % N
    art = np.where(r.random(K) < 0.75, nart[grp], r.integers(0, 3, K))
    rad = 2.2 + r.random(K) * 3.0
    blatt = r.integers(5, 9, K)
    pha = r.random(K) * 6.283
    helle = 0.84 + r.random(K) * 0.24

    for i in range(K):
        R = int(rad[i] * 2.2) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        d = np.sqrt(dy * dy + dx * dx)
        th = np.arctan2(dy, dx)
        re = rad[i] * (0.70 + 0.36 * np.abs(np.cos(blatt[i] * 0.5 * th + pha[i])))
        m = d < re
        if not m.any():
            continue
        c = pal[art[i]] * helle[i]
        kc = kern[art[i]] * helle[i]
        km = d < rad[i] * 0.34
        f = 0.84 + 0.24 * np.clip((re - d) / 1.6, 0, 1)
        for ch in (0, 1, 2):
            tgt = (rr, gg, bb)[ch]
            sub = tgt[np.ix_(ys, xs)]
            neu = np.where(km, kc[ch], c[ch] * f)
            tgt[np.ix_(ys, xs)] = np.where(m, neu, sub)

    speichern("wiese_blumen", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 6) Herbstlaub (Waldboden)
def herbstlaub():
    # Waldboden darunter: dunkle Humuserde mit Krumen
    boden = 0.22 + noise(6, 1571) * 0.16 + (feinstruktur(1572, 1, 1) - 0.5) * 0.16
    rr = boden * 0.92; gg = boden * 0.70; bb = boden * 0.48

    # gedaempfte, natuerliche Herbstpalette (die erste Fassung wirkte wie Konfetti)
    pal = np.array([
        [0.56, 0.20, 0.11],   # feuerrot, gedaempft
        [0.68, 0.34, 0.12],   # orangebraun
        [0.66, 0.50, 0.19],   # goldocker
        [0.50, 0.30, 0.13],   # rostbraun
        [0.41, 0.27, 0.14],   # lehmbraun
        [0.60, 0.42, 0.20],   # helles ocker
        [0.45, 0.15, 0.10],   # dunkelrot
        [0.32, 0.23, 0.13],   # altbraun
        [0.44, 0.40, 0.19],   # welkgruen
        [0.55, 0.44, 0.26],   # sandbeige
    ], dtype=np.float32)

    r = np.random.default_rng(1573)
    K = 760
    H = np.full((N, N), -1e6, dtype=np.float32)
    py = r.random(K) * N; px = r.random(K) * N
    a = 16.0 + r.random(K) * 16.0                   # halbe Laenge
    br = 0.40 + r.random(K) * 0.26                  # Breitenverhaeltnis
    rot = r.random(K) * np.pi * 2
    idx = r.integers(0, len(pal), K)
    helle = 0.80 + r.random(K) * 0.34
    lapp = r.integers(3, 7, K)
    pha = r.random(K) * 6.283
    z = r.random(K) * 3.0
    fein_n = noise(8, 1574)
    korn = feinstruktur(1575, 1, 1)

    for i in range(K):
        R = int(a[i] * 1.35) + 2
        ys, xs, dy, dx = patch(py[i], px[i], R)
        ca = np.cos(rot[i]); sa = np.sin(rot[i])
        ux = dx * ca + dy * sa; uy = -dx * sa + dy * ca
        # echte Blattkontur: breiter Fuss, gezaehnter Rand, Spitze bei sx=+1
        # (runde Ovale sahen in Fassung 2 aus wie Bohnen/Kiesel)
        sx = np.clip(ux / a[i], -1.0, 1.0)
        halb = 0.945 * np.sqrt(np.maximum(1 - sx, 0)) * np.maximum(1 + sx, 0) ** 0.9
        halb = halb * (1.0 + 0.13 * np.cos(lapp[i] * 3.0 * sx + pha[i]))
        W = np.maximum(halb, 0) * a[i] * br[i]
        m = (np.abs(ux) < a[i]) & (np.abs(uy) < W)
        # Blattstiel
        m = m | ((ux < -a[i] * 0.92) & (ux > -a[i] * 1.24) & (np.abs(uy) < 0.9))
        if not m.any():
            continue
        e = np.abs(uy) / np.maximum(W, 1e-3)        # 0 = Mittelrippe, 1 = Rand
        hh = z[i] + (1.0 - np.clip(e, 0, 1)) * 1.2
        hh = np.where(m, hh, -1e6).astype(np.float32)
        subH = H[np.ix_(ys, xs)]
        upd = hh > subH
        if not upd.any():
            continue
        H[np.ix_(ys, xs)] = np.where(upd, hh, subH)

        # Woelbung des Blattes + Mittelrippe + Seitenadern + trockener Rand
        woelb = 0.80 + 0.34 * np.cos(np.clip(uy / np.maximum(W, 1e-3), -1, 1) * 1.9)
        rippe = np.clip(1 - np.abs(uy) / 1.1, 0, 1)
        adern = np.clip(1 - np.abs(np.sin(ux * 0.40 + np.abs(uy) * 1.15 + pha[i])) * 9.0,
                        0, 1) * 0.45
        rand = np.clip((1 - e) / 0.22, 0, 1)
        f = woelb * (0.66 + rand * 0.34) + rippe * 0.14 + adern * 0.08
        f = f * (0.90 + fein_n[np.ix_(ys, xs)] * 0.20) * helle[i]
        c = pal[idx[i]]
        for ch in (0, 1, 2):
            tgt = (rr, gg, bb)[ch]
            sub = tgt[np.ix_(ys, xs)]
            tgt[np.ix_(ys, xs)] = np.where(upd, c[ch] * f, sub)

    # Kontaktschatten zwischen den Blattlagen + Streulicht
    Hc = np.where(H > -1e5, H, -0.8).astype(np.float32)
    ao = np.clip(Hc - blur(Hc, 6), -3, 3) * 0.10
    lit = (relief(blur(Hc, 1), 0.45) - 0.5) * 0.40
    s = 1.0 + ao + lit + (korn - 0.5) * 0.09
    rr = rr * s; gg = gg * s; bb = bb * s
    # feuchte, dunkle Zonen + Streulicht-Flecken (Waldboden ist nie gleichmaessig)
    d = np.clip(noise(3, 1576) - 0.48, 0, 1) * 0.85
    rr *= (1 - d * 0.46); gg *= (1 - d * 0.48); bb *= (1 - d * 0.44)
    l = np.clip(noise(3, 1577) - 0.62, 0, 1) * 1.4
    rr += l * 0.075; gg += l * 0.062; bb += l * 0.030
    # leicht entsaettigen -> Laub statt Konfetti
    lum = rr * 0.30 + gg * 0.59 + bb * 0.11
    rr = rr * 0.90 + lum * 0.10
    gg = gg * 0.90 + lum * 0.10
    bb = bb * 0.90 + lum * 0.10
    speichern("herbstlaub", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 7) Schnee (Decke mit Verwehungen)
def schnee():
    # Verwehungen: grosse, weiche Duenen (KEINE feinen Diagonalriffel -- die
    # sahen in der ersten Fassung aus wie Stoffgewebe)
    d1 = noise(3, 1581); d2 = noise(4, 1582); d3 = noise(6, 1590)
    warp = (noise(3, 1583) - 0.5) * 44.0
    # breite, gekruemmte Windriffel (Frequenz 4 ueber die Kachel)
    riffel = np.sin(2 * np.pi * (xx * 3 + yy * 4) / N + warp * 0.30
                    + (noise(4, 1591) - 0.5) * 5.0)
    h = d1 * 1.00 + d2 * 0.42 + d3 * 0.13
    h += (0.5 + 0.5 * riffel) * 0.26 * (0.35 + d1 * 0.9)
    # zweite, feinere Riffelschar quer dazu (Sastrugi-Kaemme)
    h += (0.5 + 0.5 * np.sin(2 * np.pi * (xx * 9 - yy * 6) / N
                             + (noise(4, 1592) - 0.5) * 7.0)) * 0.075

    # Firnkoernung -- separat gehalten, damit sie sichtbar shaded wird
    r0 = np.random.default_rng(1594).random((N, N)).astype(np.float32)
    fein_h = (feinstruktur(1584, 1, 1) - 0.5) * 1.0 + (noise(8, 1585) - 0.5) * 0.9 \
        + (r0 - 0.5) * 0.55
    dell = np.clip(noise(7, 1593) - 0.58, 0, 1) * 1.7      # Windnarben/Dellen
    h = h - dell * 0.070

    lit = relief(blur(h, 1), 8.0)
    weit = relief(blur(h, 7), 2.4)
    grob = relief(fein_h, 0.95)                            # sichtbares Schneekorn
    ao = np.clip(h - blur(h, 12), -1, 1)

    v = 0.840 + (lit - 0.5) * 0.34 + (weit - 0.5) * 0.15 + ao * 0.45
    v += (grob - 0.5) * 0.26 + (r0 - 0.5) * 0.035
    v -= dell * 0.055
    v = np.clip(v, 0.44, 1.0)

    # Schatten im Schnee sind blau, Licht ist neutralweiss
    sch = np.clip(0.88 - v, 0, 1)
    rr = v * 0.975 - sch * 0.185
    gg = v * 0.990 - sch * 0.095
    bb = v * 1.000 + sch * 0.055

    # Eiskristall-Funkeln: sehr wenige, sehr kleine Spitzlichter
    r = np.random.default_rng(1587)
    fk = (r.random((N, N)).astype(np.float32) > 0.9985).astype(np.float32)
    fk = fk * (0.45 + r.random((N, N)).astype(np.float32) * 0.55)
    fk = np.clip(fk + blur(fk, 1) * 1.5, 0, 1) * np.clip((v - 0.80) * 4.0, 0, 1)
    rr += fk * 0.22; gg += fk * 0.23; bb += fk * 0.25
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

    # Laengsmaserung (Faser laeuft in y), nur leicht gewellt -> kein Marmor-Look
    w1 = (noise(3, 1592) - 0.5) * 13.0 + (noise(5, 1593) - 0.5) * 6.0
    gx = xx + w1 + ph
    m1 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 92 / N)
    m2 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 34 / N + 1.1)
    m3 = 0.5 + 0.5 * np.sin(2 * np.pi * gx * 188 / N + 2.4)
    laengs = feinstruktur(1594, wy=10, wx=0)
    fein = feinstruktur(1595, wy=3, wx=0)

    ringe = m1 ** 3.2 * 0.10 + m2 ** 2.8 * 0.075 + m3 ** 5.0 * 0.040
    ringe = blur(ringe, 1, 0)
    v = 0.78 + to * 0.13 - (1 - to) * 0.07
    v -= ringe
    v += (laengs - 0.5) * 0.26 + (fein - 0.5) * 0.09
    v += (noise(4, 1596) - 0.5) * 0.11

    # Schuesselung der Diele (Rand hoch, Mitte tief) -> plastisch statt flach
    woelb = np.cos(2 * np.pi * (bf - 0.5)) * 0.5 + 0.5
    v += (woelb - 0.5) * (0.09 + cup * 0.10)

    # Witterungsrisse laengs (Trockenrisse), duenn und unregelmaessig
    riss = np.clip(np.abs(np.sin(2 * np.pi * (gx * 23 / N) + (noise(4, 1597) - 0.5) * 5.0)), 0, 1)
    rissm = np.clip(1 - riss / 0.030, 0, 1) * np.clip(noise(4, 1598) * 1.6 - 0.60, 0, 1) * 2.0
    rissm = np.clip(rissm, 0, 1) * np.clip(feinstruktur(1599, 9, 0) * 1.7 - 0.55, 0, 1) * 2.2
    v -= np.clip(rissm, 0, 1) * 0.34

    # Astloecher
    ast = np.clip(noise(7, 1600) - 0.80, 0, 1) * 1.9
    v -= ast * 0.30

    # Fugen zwischen den Dielen + Fasenlicht
    kant = np.minimum(bf, 1 - bf) * bw
    fuge = np.clip(1 - kant / 2.4, 0, 1)
    fase = np.clip(1 - np.abs(kant - 4.5) / 3.2, 0, 1)
    v = v * (1 - fuge * 0.72) + fase * 0.075

    # Stossfugen der Dielenenden alle 256 px, je Diele versetzt
    ys = (yy + yo) % 256.0
    stoss = np.clip(1 - np.minimum(ys, 256 - ys) / 1.5, 0, 1)
    v = v * (1 - stoss * 0.48)

    # Schrauben paarweise vor jedem Stoss
    for sy in (11.0, 245.0):
        for sx in (0.30, 0.70):
            ds = np.sqrt(((ys - sy + 128) % 256 - 128) ** 2 + ((bf - sx) * bw) ** 2)
            v = np.where(ds < 2.1, v * 0.50, v)
            v = np.where((ds >= 2.1) & (ds < 3.2), v * 1.16, v)

    # silbrig-graue Patina, fleckig ueber die Dielen hinweg
    pat = np.clip(noise(4, 1601) - 0.36, 0, 1) * 1.35
    v += np.clip(noise(3, 1603) - 0.5, -1, 1) * 0.09
    v = np.clip(v, 0.04, 1.10)

    warmton = np.clip((1 - pat) * (0.45 + to * 0.55), 0, 1)
    rr = v * (0.760 + warmton * 0.175)
    gg = v * (0.745 + warmton * 0.110)
    bb = v * (0.715 + warmton * 0.015)
    # gruener Algenanflug entlang der Fugen
    alg = np.clip(noise(5, 1602) - 0.56, 0, 1) * 1.8 * np.clip(fuge * 2.2 + 0.15, 0, 1)
    rr -= alg * 0.060; gg -= alg * 0.022; bb -= alg * 0.075
    speichern("holzdeck", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 9) Ziegelmauer rot (Laeuferverband)
def ziegelmauer_rot():
    RW, CL = 8, 4                             # 8 Schichten a 64 px, 4 Steine a 128 px
    bh = N / RW; bwid = N / CL
    # handvermauert: Fugen laufen sichtbar unregelmaessig
    X = xx + (noise(4, 1611) - 0.5) * 5.5 + (noise(7, 1612) - 0.5) * 2.6
    Y = yy + (noise(4, 1613) - 0.5) * 4.0 + (noise(7, 1614) - 0.5) * 1.8

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
    jy = 0.068; jx = 0.034                    # halbe Fugenbreite (~4.3 px)
    face = np.clip((dy_ - jy) / 0.011, 0, 1) * np.clip((dx_ - jx) / 0.006, 0, 1)

    r = np.random.default_rng(1615)
    t = r.random((RW, CL)).astype(np.float32)[iy, ix]          # 2-D-Fancy-Indexing!
    hue = r.random((RW, CL)).astype(np.float32)[iy, ix]
    sorte = r.random((RW, CL)).astype(np.float32)[iy, ix]
    brand = (sorte > 0.80).astype(np.float32)                  # dunkle Brandsteine
    hell = (sorte < 0.14).astype(np.float32)                   # helle Sandsteine

    # Ziegel muessen KOERNIG sein -- glatte Verlaeufe sehen aus wie Plastik
    sand = (feinstruktur(1616, 1, 1) - 0.5) * 0.30
    sand += (np.random.default_rng(1628).random((N, N)).astype(np.float32) - 0.5) * 0.15
    sand += (feinstruktur(1629, 0, 2) - 0.5) * 0.16          # Strangpress-Riefen
    wolke = noise(8, 1617); grob = noise(7, 1618)
    stein = 0.66 + t * 0.20 + (wolke - 0.5) * 0.30 + (grob - 0.5) * 0.20 + sand
    stein -= brand * 0.24
    stein += hell * 0.13
    # Poren, Ausbrueche, abgeplatzte Kanten
    poren = (np.random.default_rng(1619).random((N, N)).astype(np.float32) > 0.9860) * 0.36
    poren += (np.random.default_rng(1630).random((N, N)).astype(np.float32) > 0.9970) * 0.30
    stein -= poren
    stein -= np.clip(noise(7, 1620) - 0.74, 0, 1) * 0.70
    kante_n = np.clip(1 - np.minimum(dy_ / jy, dx_ / jx) / 1.55, 0, 1)
    stein -= kante_n * np.clip(noise(8, 1624) - 0.55, 0, 1) * 1.1
    # Fase: Lichtkante oben/links, Schatten unten/rechts
    stein += np.clip(1 - np.abs(fy - (jy + 0.030)) / 0.030, 0, 1) * 0.090
    stein -= np.clip(1 - np.abs(fy - (1 - jy - 0.030)) / 0.030, 0, 1) * 0.080
    stein += np.clip(1 - np.abs(fx - (jx + 0.016)) / 0.016, 0, 1) * 0.055
    stein -= np.clip(1 - np.abs(fx - (1 - jx - 0.016)) / 0.016, 0, 1) * 0.048

    # Moertel: Kalkmoertel, sandig-rau, zurueckversetzt (nicht reinweiss)
    mortel = 0.62 + noise(6, 1621) * 0.20 + sand * 1.5
    mortel += (feinstruktur(1625, 1, 1) - 0.5) * 0.26
    mortel -= np.clip(noise(8, 1631) - 0.66, 0, 1) * 0.55    # Ausbrueche in der Fuge
    mortel -= np.clip((fy - (1 - jy)) / jy, 0, 1) * 0.30       # Schatten unter dem Stein
    mortel -= np.clip((fx - (1 - jx)) / jx, 0, 1) * 0.12
    mortel += np.clip((jy - fy) / jy, 0, 1) * 0.07

    v = mortel * (1 - face) + stein * face
    v -= np.clip(1 - np.maximum(dy_ / jy, dx_ / jx), 0, 1) * (1 - face) * 0.12
    v = np.clip(v, 0.05, 1.20)

    ziegel = face > 0.5
    rr = np.where(ziegel, v * (0.895 + hue * 0.095 - brand * 0.04), v * 0.955)
    gg = np.where(ziegel, v * (0.355 + hue * 0.105 + hell * 0.07), v * 0.935)
    bb = np.where(ziegel, v * (0.270 + hue * 0.055 + brand * 0.05), v * 0.880)

    # --- grossflaechige Verwitterung bricht die 4x8-Wiederholung auf
    eff = np.clip(noise(3, 1622) - 0.56, 0, 1) * 1.9          # Salzausblueh
    rr += eff * 0.20; gg += eff * 0.195; bb += eff * 0.185
    russ = np.clip(noise(3, 1626) - 0.50, 0, 1) * 1.4         # Russ/Alterung
    rr *= (1 - russ * 0.26); gg *= (1 - russ * 0.28); bb *= (1 - russ * 0.24)
    fahne = np.clip(feinstruktur(1623, 14, 0) - 0.55, 0, 1) * 1.9   # Regenfahnen
    rr *= (1 - fahne * 0.16); gg *= (1 - fahne * 0.15); bb *= (1 - fahne * 0.12)
    moos = np.clip(noise(5, 1627) - 0.70, 0, 1) * 1.8         # Moosanflug
    rr -= moos * 0.055; gg -= moos * 0.010; bb -= moos * 0.060
    speichern("ziegelmauer_rot", np.stack([rr, gg, bb], -1))


# ------------------------------------------------ 10) Wellblech (verzinkt)
def wellblech():
    P = 64.0                                  # 8 Wellen je Kachel
    # Viertelversatz -> die Kachelgrenze liegt auf der Flanke, nicht im Wellental
    u = (xx + P * 0.25)
    ph = 2 * np.pi * u / P
    h = np.cos(ph)
    beule = (noise(3, 1631) - 0.5) * 0.55 + (noise(5, 1632) - 0.5) * 0.22
    h = h + beule * 0.30

    lit = relief(blur(h, 1, 0), 3.6)
    v = 0.36 + (0.5 + 0.5 * np.cos(ph)) ** 1.15 * 0.40 + (lit - 0.5) * 0.78
    v += np.clip(1 - np.abs(((u % P) - P * 0.5)) / 3.5, 0, 1) * 0.20     # Glanzgrat
    v -= np.clip(1 - np.abs(((u + P * 0.5) % P) - P * 0.5) / 6.0, 0, 1) * 0.14

    # Zink-Spangle: viele kleine Kristallzellen, nur ganz dezent (die erste
    # Fassung sah mit 110 grossen Zellen aus wie Tarnfleck)
    r = np.random.default_rng(1633)
    K = 620
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
    rand = np.clip(1 - (np.sqrt(best2) - np.sqrt(best)) / 1.6, 0, 1)
    v += (zell - 0.5) * 0.032 + rand * 0.022
    v += (feinstruktur(1634, 1, 1) - 0.5) * 0.070
    v += (noise(7, 1635) - 0.5) * 0.055
    v -= np.clip(noise(3, 1640) - 0.55, 0, 1) * 0.16          # Schmutzschleier

    # Ueberlappungsstoss der Bahnen: bei x = 128 und 384 (NICHT am Kachelrand)
    for sx in (128.0, 384.0):
        d = ((xx - sx + N * 0.5) % N) - N * 0.5
        v -= np.clip(1 - np.abs(d) / 2.2, 0, 1) * 0.20
        v += np.clip(1 - np.abs(d - 3.2) / 2.2, 0, 1) * 0.10

    # Schraubenreihen alle 128 px auf den Rippenscheiteln
    ym = (yy + 40.0) % 128.0
    scheitel = np.clip(1 - np.abs(((u % P) - P * 0.5)) / 6.0, 0, 1)
    ds = np.sqrt(((ym - 64.0)) ** 2 + (((u % P) - P * 0.5)) ** 2)
    v = np.where(ds < 3.2, 0.34 + np.clip((3.2 - ds) / 3.2, 0, 1) * 0.42, v)
    v = np.where((ds >= 3.2) & (ds < 4.4), v * 0.70, v)

    v = np.clip(v, 0.05, 1.15)
    rr = v * 0.960; gg = v * 0.985; bb = v * 1.000

    # --- Rost: sichtbare Laufspuren unter den Schrauben + Saum an den Stoessen
    # Rost muss FLECKIG sein: Rostnester + daraus laufende Schlieren.
    # (Reine feinstruktur-Schlieren sahen aus wie gekaemmte Haare.)
    lauf = np.clip((ym - 63.0) / 10.0, 0, 1) * np.clip(1 - (ym - 63.0) / 54.0, 0, 1)
    lauf = np.clip(lauf, 0, 1) * (0.30 + scheitel * 0.95)
    nest = np.clip(noise(6, 1636) * 1.35 - 0.86, 0, 1) * 3.2
    nest = np.clip(nest * 0.8 + blur(nest, 1) * 0.5, 0, 1)
    schlier = np.clip(feinstruktur(1637, 18, 0) - 0.48, 0, 1) * 2.2
    fahn = np.zeros_like(nest)                              # nach unten gelaufen
    for dd in range(0, 34):
        fahn = np.maximum(fahn, np.roll(nest, dd, axis=0) * (1.0 - dd / 34.0))
    rost = np.maximum(nest, fahn * (0.20 + schlier * 0.70))
    rost = np.maximum(rost, np.clip(lauf * 2.0 * (0.3 + schlier), 0, 1))
    for sx in (128.0, 384.0):
        d = np.abs(((xx - sx + N * 0.5) % N) - N * 0.5)
        rost = np.maximum(rost, np.clip(1 - d / 6.0, 0, 1)
                          * np.clip(noise(5, 1639) - 0.56, 0, 1) * 2.4)
    rost = np.clip(rost, 0, 1)
    rost = np.clip(rost * (0.35 + noise(7, 1638) * 0.85), 0, 0.85)
    rost *= (0.30 + 0.75 * np.clip(noise(3, 1641) * 1.5 - 0.40, 0, 1))
    rost = np.clip(rost * 0.8 + blur(rost, 1) * 0.35, 0, 0.85)

    # Rostton: gedaempftes Braunorange, kein Signalorange
    ton = np.clip(noise(5, 1642), 0, 1)
    rf = 0.55 + v * 0.42
    r_r = rf * (0.42 + ton * 0.28)
    r_g = rf * (0.22 + ton * 0.14)
    r_b = rf * (0.13 + ton * 0.07)
    rr = rr * (1 - rost) + rost * r_r
    gg = gg * (1 - rost) + rost * r_g
    bb = bb * (1 - rost) + rost * r_b
    speichern("wellblech", np.stack([rr, gg, bb], -1))


ALLE = (wasser, gleisschotter, kies_fein, acker_furchen, wiese_blumen,
        herbstlaub, schnee, holzdeck, ziegelmauer_rot, wellblech)


if __name__ == "__main__":
    print("Textur-Charge 7 (th15, Hafen/Park/Bahn/Bauernhof):")
    for fn in ALLE:
        fn()
    print("fertig ->", OUT)
