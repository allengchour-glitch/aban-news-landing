# -*- coding: utf-8 -*-
"""Textur-Charge 2 (th6) fuer die Riesenstadt: Fassaden + Strassenbelaege.
512x512, nahtlos kachelbar. Nur numpy + bpy (kein PIL, kein cv2, kein Netz,
kein Blender-Binary -- bpy laeuft als Modul unter /usr/bin/python3).

STAND: ueberarbeitet auf das Niveau von th15/th28. Die erste Fassung dieser
Charge war flau/wolkig (Airbrush statt Material) und hatte an vier Stellen
Nahtwerte weit ueber 1.5. Neu gebaut wurden: asphalt, dachpappe, marmor,
metallgitter, acker, sand.
UNVERAENDERT (waren bereits sauber, Naht 0.00/0.01, klare Geometrie):
glasfassade, betonfassade -- Code steht unten Zeichen fuer Zeichen wie vorher.

FALLEN (aus th12/th15/th28 uebernommen, gelten hier unveraendert):
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
   Die alte Fassung verstiess genau hier: metallgitter hatte Teilung 26 px
   (512/26 = 19.7 -- echte Naht, Messwert 13.0), marmor/sand benutzten
   gebrochene sin-Frequenzen (1.8 bzw. 4.8 Perioden -- Messwert 8.3 / 1.7).
 * STRUKTUR-RASTER IMMER UM EINE HALBE EINHEIT VERSETZEN, damit die Kachel-
   grenze nicht in einer Fuge/Naht/Rille des Motivs liegt -- sonst sieht die
   (mathematisch korrekte) Naht wie ein Fehler aus und die Metrik schlaegt
   grundlos aus. Genau das war bei dachpappe der Fall (Messwert 6.6, aber der
   Sprung an der Kachelgrenze war exakt so gross wie an jeder anderen
   Bahnenfuge = Messartefakt, keine kaputte Kachelung).
   Betrifft jetzt: dachpappe (halbe Bahn), metallgitter (halbe Masche),
   acker (halbe Furche).
 * Streuobjekte (Splitt/Schollen/Muscheln) IMMER als konvexe Polygone mit
   Facetten-Shading stempeln -- ein "facettierter Radius" ueber cos(k*theta)
   erzeugt Bluetenformen statt Bruchsteinen.
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th6"
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
    (wy/wx = Fensterradius) -> bleibt nahtlos, liefert Korn/Fasern/Schlieren."""
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


# --------------------------------------------------- 1) Glasfassade (Hochhaus)
# UNVERAENDERT gegenueber der Erstfassung (Naht 0.00, saubere Geometrie).
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
# UNVERAENDERT gegenueber der Erstfassung (Naht 0.01, saubere Geometrie).
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
    """Splittmastix: Edelsplitt im Bitumenmoertel. Die Koerner sind echte
    Polygone (poly_stamp), teils im Moertel versunken -- die alte Fassung war
    reines Wolkenrauschen mit weissen Salzkoernern."""
    r = np.random.default_rng(6301)
    H = np.full((N, N), -1e6, dtype=np.float32)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)

    # Zweiphasige Koernung: Fuellsplitt unten, Edelsplitt obenauf.
    K1, K2 = 2700, 780
    K = K1 + K2
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = np.concatenate([1.9 + r.random(K1).astype(np.float32) ** 1.5 * 2.9,
                          3.8 + r.random(K2).astype(np.float32) ** 1.3 * 5.0])
    # z streut weit ins Negative -> viele Koerner liegen UNTER dem Moertel
    z = np.concatenate([-1.4 + r.random(K1).astype(np.float32) * 2.6,
                        -0.7 + r.random(K2).astype(np.float32) * 3.0])
    ani = 0.70 + r.random(K).astype(np.float32) * 0.60
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 8, K)
    ang0 = r.random(K).astype(np.float32) * 6.283
    for i in range(K):
        roff = 0.74 + r.random(int(nf[i])).astype(np.float32) * 0.44
        poly_stamp(H, ID, FS, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], z[i], flach=0.28, kuppe=0.42)

    # Bitumenmoertel als Fuellniveau (leicht welliger Belag, Spurrinnen)
    moertel = (noise(3, 6302) - 0.5) * 1.5 + (noise(5, 6303) - 0.5) * 0.7
    Hc = np.maximum(H, moertel)
    korn = Hc > (moertel + 0.10)

    lit = relief(blur(Hc, 1), 0.85)
    fein_lit = relief(Hc, 0.30)
    ao = np.clip(Hc - blur(Hc, 5), -4, 4) * 0.045

    # Gestein: ueberwiegend dunkler Basalt/Diabas, ein paar helle Quarzite
    tint = r.random(K).astype(np.float32)[ID]
    warm = r.random(K).astype(np.float32)[ID]
    hell = (r.random(K).astype(np.float32)[ID] > 0.86).astype(np.float32)
    rau = (feinstruktur(6304, 1, 1) - 0.5) * 0.10 + (noise(8, 6305) - 0.5) * 0.07
    face = 0.250 + tint * 0.175 + hell * 0.150 + rau
    face = face * FS * (0.86 + (lit - 0.5) * 0.50) + ao
    face += np.clip(noise(8, 6306) - 0.80, 0, 1) * 0.28        # frische Bruchkanten

    # Moertel: schwarzes Bitumen mit Brechsandkorn
    bit = 0.145 + noise(7, 6307) * 0.050
    bit += (feinstruktur(6308, 1, 1) - 0.5) * 0.080
    bit += (fein_lit - 0.5) * 0.10
    v = np.where(korn, face, bit)

    # Risse: schmales Netz, per Domain-Warp gebogen (ganzzahlige Frequenzen)
    W1 = xx + (noise(4, 6309) - 0.5) * 26.0
    W2 = yy + (noise(4, 6310) - 0.5) * 26.0
    riss = np.zeros((N, N), dtype=np.float32)
    for a_, b_, ph in ((5, 3, 0.4), (-4, 7, 2.6), (9, -2, 4.5)):
        s = np.abs(np.sin(2 * np.pi * (a_ * W1 + b_ * W2) / N + ph))
        riss = np.maximum(riss, np.clip(1 - s / 0.016, 0, 1))
    riss *= np.clip(noise(5, 6311) * 1.9 - 0.98, 0, 1) * 2.6
    v -= np.clip(riss, 0, 1) * 0.075

    # abgefahrene Spuren (poliert = heller), Oelflecken, Flickstellen
    v *= (0.88 + noise(3, 6312) * 0.26)
    v += np.clip(noise(4, 6313) - 0.58, 0, 1) * 0.16
    oel = np.clip(noise(5, 6314) - 0.70, 0, 1) * 2.4
    v -= np.clip(oel, 0, 1) * 0.045
    v = np.clip(v, 0.03, 1.0)

    rr = v * (1.000 + warm * 0.030)
    gg = v * (1.002 + warm * 0.008)
    bb = v * (1.045 - warm * 0.020)
    speichern("asphalt", np.stack([rr, gg, bb], -1))


# --------------------------------------------------- 4) Dachpappe (Flachdach)
def dachpappe():
    """Bitumen-Schweissbahn mit Schieferbesplittung. 4 Bahnen a 128 px,
    HALBER VERSATZ -> die Kachelgrenze laeuft mitten durch eine Bahn, nicht
    durch die Ueberlappungsnaht (das war der Grund fuer den alten Messwert
    6.6 -- die Kachelung selbst war in Ordnung)."""
    BAHN = 4
    bh = N / BAHN                                   # 128 px
    # Bahnen liegen nicht schnurgerade -> leichter Wellenverlauf
    Y = yy + (noise(3, 6401) - 0.5) * 5.5 + (noise(6, 6402) - 0.5) * 1.8
    cy = (Y + bh * 0.5) / bh                        # halber Versatz
    ib = np.floor(cy).astype(int) % BAHN
    fy = cy % 1.0

    ue = 0.085                                      # Ueberlappung ~11 px
    # Hoehenprofil: die naechste Bahn liegt am unteren Rand oben drauf
    stufe = np.clip((fy - (1 - ue)) / 0.012, 0, 1)          # Aufkantung
    naht = np.clip(1 - np.abs(fy - (1 - ue)) / 0.020, 0, 1)  # Quellnaht (Bitumenwulst)
    H = stufe * 1.30 + naht * 0.55

    # Schrumpfwellen/Blasen quer zur Bahn (Bitumen arbeitet in der Sonne)
    welle = np.sin(2 * np.pi * (7 * xx + 2 * yy) / N + (noise(4, 6403) - 0.5) * 6.0)
    H += welle * 0.16 + (noise(5, 6404) - 0.5) * 0.45
    blase = np.clip(noise(6, 6405) - 0.66, 0, 1) * 3.0
    H += np.clip(blase, 0, 1) * 0.75

    # Besplittung: dichtes Schiefergranulat, 1-2 px Korn
    gk = np.random.default_rng(6406).random((N, N)).astype(np.float32)
    gk = blur(gk, 1) * 1.6 + (feinstruktur(6407, 0, 1) - 0.5) * 0.28
    H += (gk - gk.mean()) * 0.80

    lit = relief(blur(H, 1), 0.75)
    grob_lit = relief(blur(H, 4), 0.85)
    sch = schlagschatten(H, 5, 0.26)

    # Farbe: dunkles Anthrazit, Granulat in Schiefergruen/-braun gesprenkelt
    ton = np.random.default_rng(6408).random((N, N)).astype(np.float32)
    ton = blur(ton, 1) * 1.7 - 0.35
    v = 0.200 + (gk - gk.mean()) * 0.48
    v += (lit - 0.5) * 0.32 + (grob_lit - 0.5) * 0.30
    v -= sch * 0.14
    v -= naht * 0.045                                # Wulst glaenzt, Fuge dunkel
    v += stufe * 0.030

    # Bahn zu Bahn minimal anderer Rollenton + Bewitterung
    tb = np.random.default_rng(6409).random(BAHN).astype(np.float32)[ib]
    v *= (0.93 + tb * 0.13)
    v *= (0.90 + noise(3, 6410) * 0.24)              # Pfuetzenraender/Ausbleichen
    v -= np.clip(noise(5, 6411) - 0.66, 0, 1) * 0.10  # Moos/Schmutzzonen
    kahl = np.clip(noise(6, 6412) - 0.70, 0, 1) * 2.2  # abgeschwemmtes Granulat
    v = v * (1 - np.clip(kahl, 0, 1) * 0.45) + np.clip(kahl, 0, 1) * 0.100
    v = np.clip(v, 0.02, 1.0)

    rr = v * (1.030 + ton * 0.075)
    gg = v * (1.000 + ton * 0.020)
    bb = v * (0.945 - ton * 0.060)

    # Nagelkoepfe/Dachpappstifte entlang der Ueberlappung
    # cy = (Y + bh/2)/bh, die Naht liegt bei fy = 1-ue  ->  Y = bh*(i + 0.5 - ue)
    rn = np.random.default_rng(6413)
    for i in range(BAHN):
        ny_ = bh * (i + 0.5 - ue)                        # Nahtlinie dieser Bahn
        for k in range(12):
            px_ = (k + 0.25 + rn.random() * 0.5) * (N / 12.0)
            jy = ny_ + (rn.random() - 0.5) * 2.2
            ys, xs, dy, dx = patch(jy % N, px_ % N, 6)
            d = np.sqrt(dy * dy + dx * dx)
            kopf = np.clip((3.1 - d) / 1.1, 0, 1)
            gl = np.clip((2.0 - d + (dx - dy) * 0.42) / 1.5, 0, 1) * kopf
            ring = np.clip(1 - np.abs(d - 3.4) / 1.2, 0, 1)        # Schattenkante
            for tgt, f in ((rr, 1.00), (gg, 1.00), (bb, 1.06)):
                sub = tgt[np.ix_(ys, xs)]
                tgt[np.ix_(ys, xs)] = (sub * (1 - kopf * 0.70) + kopf * 0.255 * f
                                       + gl * 0.30 * f - ring * sub * 0.30)
    speichern("dachpappe", np.stack([rr, gg, bb], -1))


# --------------------------------------------------- 5) Marmor (Rathaus/Foyer)
def marmor():
    """Carrara-Art: verzweigtes Adernetz mit dunklem Kern und weichem Hof,
    Kristallkorn und Polierglanz. Alle Frequenzen sind GANZZAHLIG (die alte
    Fassung hatte 1.8 bzw. 3.5 Perioden ueber N = echte Naht, Messwert 8.3)."""
    # Domain-Warp aus periodischen Feldern -> Adern maeandern, statt gerade zu laufen
    wA = (noise(3, 6501) - 0.5); wB = (noise(3, 6502) - 0.5)
    X = xx + wA * 70.0 + (noise(5, 6503) - 0.5) * 26.0 + (noise(7, 6504) - 0.5) * 7.0
    Y = yy + wB * 70.0 + (noise(5, 6505) - 0.5) * 26.0 + (noise(7, 6506) - 0.5) * 7.0

    def ader(fx_, fy_, ph, breit, staerke):
        s = np.abs(np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph))
        return np.clip(1 - s / breit, 0, 1) * staerke

    # Hauptadern: wenige, kraeftig, alle in aehnlicher Zugrichtung (Gestein!)
    haupt = np.zeros((N, N), dtype=np.float32)
    for fx_, fy_, ph, br, st in ((2, 1, 0.6, 0.055, 1.00),
                                 (3, 2, 3.1, 0.045, 0.86),
                                 (1, 2, 5.0, 0.050, 0.74)):
        haupt = np.maximum(haupt, ader(fx_, fy_, ph, br, st))
    # Nebenadern: dichter, feiner, leicht andere Richtung
    neben = np.zeros((N, N), dtype=np.float32)
    for fx_, fy_, ph, br, st in ((5, 3, 1.4, 0.024, 0.66),
                                 (4, 6, 4.2, 0.022, 0.58),
                                 (7, 2, 2.2, 0.020, 0.50),
                                 (3, -5, 0.2, 0.022, 0.54)):
        neben = np.maximum(neben, ader(fx_, fy_, ph, br, st))
    # Haarrisse: sehr fein, unterbrochen
    haar = np.zeros((N, N), dtype=np.float32)
    for fx_, fy_, ph in ((11, 5, 0.9), (-6, 13, 3.7), (9, 9, 5.5), (14, -3, 1.8)):
        haar = np.maximum(haar, np.clip(1 - np.abs(
            np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph)) / 0.010, 0, 1))
    haar *= np.clip(noise(5, 6507) * 1.8 - 0.80, 0, 1) * 2.0

    # Adern nur dort, wo das Gestein "gestoert" ist -> keine Tapete
    maske = np.clip((noise(4, 6508) - 0.34) * 2.3, 0, 1)
    haupt *= np.clip(maske * 1.25, 0, 1)
    neben *= np.clip(maske * 1.05 + 0.12, 0, 1)

    kern = np.clip(haupt + neben * 0.75 + np.clip(haar, 0, 1) * 0.45, 0, 1.4)
    hof = blur(kern, 5) * 1.5 + blur(kern, 13) * 0.9      # trueber Saum um die Ader

    # Kristallkorn: Calcitkoerner, fein und dicht (kein Wolkenrauschen)
    korn = (feinstruktur(6509, 1, 1) - 0.5) * 0.085
    korn += (np.random.default_rng(6510).random((N, N)).astype(np.float32) - 0.5) * 0.045
    korn += (noise(8, 6511) - 0.5) * 0.055
    # Wolkige Trueb-/Grauzonen, aber schwach dosiert
    truebe = (noise(4, 6512) - 0.5) * 0.055 + (noise(6, 6513) - 0.5) * 0.035

    v = 0.905 + korn + truebe
    v -= np.clip(kern, 0, 1) * 0.30
    v -= np.clip(hof, 0, 1) * 0.115
    v -= np.clip(haar, 0, 1) * 0.16
    # Politur: flaches Relief auf dem Adernrelief -> Glanzkante an den Adern
    hh = -blur(kern, 2) - blur(hof, 3) * 0.4 + korn * 1.2
    gl = relief(hh, 1.3)
    v += (gl - 0.5) * 0.085
    v += np.clip(gl - 0.62, 0, 1) ** 1.4 * 0.22          # Spiegelnder Streiflicht-Saum
    v = np.clip(v, 0.05, 1.0)

    # leicht warmer Weisston, Adern kippen ins Graugruene
    ad = np.clip(kern + hof * 0.6, 0, 1)
    rr = v * (1.000 - ad * 0.010)
    gg = v * (0.990 + ad * 0.006)
    bb = v * (0.962 + ad * 0.020)
    speichern("marmor", np.stack([rr, gg, bb], -1))


# --------------------------------------------------- 6) Metallgitter (Zaun/Rost)
def metallgitter():
    """Geschweisstes Rundstahl-Gitter, verzinkt. Teilung 32 px (512/32 = 16,
    teilt N sauber -- die alte Teilung 26 px ergab 19.7 Maschen und damit eine
    echte Naht, Messwert 13.0). HALBER VERSATZ: die Staebe sitzen auf x=16 /
    y=16, die Kachelgrenze laeuft durch die Maschenmitte."""
    P = 32.0
    dx_ = (xx % P) - P * 0.5            # 0 auf dem Stab bei x=16, 48, ...
    dy_ = (yy % P) - P * 0.5
    rw = 4.3                            # Stabradius

    # Rundprofil (echte Woelbung, keine Kastenkante)
    px_ = np.clip(1 - (dx_ / rw) ** 2, 0, 1)
    py_ = np.clip(1 - (dy_ / rw) ** 2, 0, 1)
    hv = np.sqrt(px_) * 3.6             # senkrechter Stab
    hh_ = np.sqrt(py_) * 3.6            # waagerechter Stab

    # Verwebung: an jeder zweiten Kreuzung liegt der andere Stab obenauf
    ci = np.floor(xx / P).astype(int); cj = np.floor(yy / P).astype(int)
    oben_v = ((ci + cj) % 2 == 0)
    H = np.where(oben_v, np.maximum(hv, hh_ * 0.80), np.maximum(hh_, hv * 0.80))
    metall = np.clip(np.maximum(px_, py_) * 6.0, 0, 1)

    # Schweisspunkt an den Kreuzungen: kleine Wulst
    kreuz = np.clip(px_ * py_ * 3.0, 0, 1)
    H += kreuz * 0.9
    # Walzriefen laengs des jeweiligen Stabes
    riefe = (feinstruktur(6601, 3, 0) - 0.5) * np.clip(px_ * 3, 0, 1)
    riefe += (feinstruktur(6602, 0, 3) - 0.5) * np.clip(py_ * 3, 0, 1)
    H += riefe * 0.20

    lit = relief(blur(H, 1), 1.15)
    fein_lit = relief(H, 0.42)
    sch = schlagschatten(H, 8, 0.24)

    # verzinkter Stahl: matt, Zinkblume, ein paar Kratzer
    zink = (noise(7, 6603) - 0.5) * 0.11 + (noise(4, 6604) - 0.5) * 0.09
    korn = (feinstruktur(6605, 1, 1) - 0.5) * 0.10
    m = 0.470 + zink + korn + riefe * 0.10
    m += (lit - 0.5) * 0.34 + (fein_lit - 0.5) * 0.14
    # Glanzkante oben links auf der Stabwoelbung (schmal, nicht flaechig)
    m += np.clip(np.sqrt(np.maximum(px_, py_)) - 0.78, 0, 1) * 0.30
    # Stabflanken laufen zur Kante hin dunkel aus -> Rundung wird lesbar
    m -= np.clip(0.55 - np.maximum(px_, py_), 0, 1) * 0.30
    m += kreuz * 0.030
    m -= sch * 0.18
    # der jeweils untenliegende Stab liegt im Halbschatten des oberen
    unten = np.where(oben_v, np.clip(py_ - px_, 0, 1), np.clip(px_ - py_, 0, 1))
    m -= unten * 0.14
    m -= np.clip(noise(4, 6606) - 0.52, 0, 1) * 0.20        # Schmutz/Anlauf
    m += np.clip(noise(3, 6607) - 0.62, 0, 1) * 0.13        # blank gescheuert
    m = np.clip(m, 0.05, 0.98)

    # Hintergrund hinter dem Gitter: dunkel, mit angedeuteter Tiefe
    tiefe = np.clip(np.minimum(np.abs(dx_) - rw, np.abs(dy_) - rw) / 6.0, 0, 1)
    grund = 0.085 + noise(5, 6608) * 0.055 + (feinstruktur(6609, 1, 1) - 0.5) * 0.030
    grund = grund * (0.45 + (1 - tiefe) * 1.05)
    grund -= schlagschatten(H, 9, 0.16) * 0.030

    v = grund * (1 - metall) + m * metall
    v = np.clip(v, 0.01, 1.15)

    rr = v * 0.990; gg = v * 0.998; bb = v * 1.014
    # Flugrost an den Schweisspunkten (dort steht Wasser)
    rost = np.clip(noise(5, 6610) - 0.50, 0, 1) * 2.0 * (0.15 + kreuz * 1.6)
    rost = np.clip(rost * (0.35 + noise(7, 6611) * 1.0), 0, 0.75) * metall
    base = np.clip(v * 1.05, 0, 1)
    rr = rr * (1 - rost) + rost * base * 0.92
    gg = gg * (1 - rost) + rost * base * 0.46
    bb = bb * (1 - rost) + rost * base * 0.22
    speichern("metallgitter", np.stack([rr, gg, bb], -1))


# --------------------------------------------------- 7) Acker / Erde
def acker():
    """Gepfluegter Acker: Furchen mit echten Erdschollen (poly_stamp), Steinen
    und Stoppeln. Furchenteilung 32 px (16 Furchen), HALBER VERSATZ -> die
    Kachelgrenze liegt auf einem Furchenruecken, nicht in der Rille."""
    P = 64.0                                     # 8 Furchen, 512/64 = 8 (teilt N)
    # Furchen maeandern deutlich (Pflug faehrt nicht mit dem Lineal)
    Yw = yy + (noise(3, 6701) - 0.5) * 17.0 + (noise(5, 6702) - 0.5) * 6.0
    d = (Yw % P) - P * 0.5                       # 0 = Rille bei y=32, 96, ...
    t = d / (P * 0.5)                            # -1 .. 1
    furche = -np.cos(np.pi * t)                  # +1 auf dem Ruecken, -1 in der Rille
    H = furche * 6.2

    r = np.random.default_rng(6703)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)
    Hs = np.full((N, N), -1e6, dtype=np.float32)

    # Erdschollen: bevorzugt auf den Ruecken, wenige in den Rillen
    K1, K2, KS = 820, 300, 55
    K = K1 + K2 + KS
    cy = r.random(K).astype(np.float32) * N
    cx = r.random(K).astype(np.float32) * N
    rad = np.concatenate([2.4 + r.random(K1).astype(np.float32) ** 1.5 * 4.6,
                          6.0 + r.random(K2).astype(np.float32) ** 1.2 * 7.5,
                          1.8 + r.random(KS).astype(np.float32) ** 1.6 * 2.8])  # Steine
    ist_stein = np.zeros(K, dtype=bool); ist_stein[K1 + K2:] = True
    # Hoehe folgt der Furche am Ort der Scholle
    hfu = -np.cos(np.pi * (((cy % P) - P * 0.5) / (P * 0.5))) * 6.2
    z = hfu + np.concatenate([r.random(K1).astype(np.float32) * 1.5,
                              0.4 + r.random(K2).astype(np.float32) * 2.0,
                              r.random(KS).astype(np.float32) * 1.2])
    ani = 0.68 + r.random(K).astype(np.float32) * 0.70
    rot = r.random(K).astype(np.float32) * np.pi * 2
    nf = r.integers(5, 9, K)
    ang0 = r.random(K).astype(np.float32) * 6.283
    for i in range(K):
        roff = 0.70 + r.random(int(nf[i])).astype(np.float32) * 0.50
        poly_stamp(Hs, ID, FS, i, cy[i], cx[i], rad[i], roff, ang0[i],
                   ani[i], rot[i], z[i],
                   flach=0.55 if not ist_stein[i] else 0.30,
                   kuppe=0.30 if not ist_stein[i] else 0.45)

    scholle = Hs > -1e5
    Hc = np.where(scholle, np.maximum(Hs, H), H).astype(np.float32)
    # Feinkrume zwischen den Schollen + Pflugriefen laengs der Furche
    Hc += (noise(7, 6704) - 0.5) * 0.45
    Hc += (feinstruktur(6710, 0, 4) - 0.5) * 0.30     # Pflugriefen (quer gezogen)
    Hc += (feinstruktur(6711, 1, 1) - 0.5) * 0.85     # Feinkrume, koernig
    lit = relief(blur(Hc, 1), 0.55)
    grob = relief(blur(Hc, 5), 0.60)
    ao = np.clip(Hc - blur(Hc, 9), -5, 5) * 0.040
    sch = schlagschatten(Hc, 6, 0.45)

    tint = r.random(K).astype(np.float32)[ID]
    stein_m = np.where(scholle, ist_stein[ID], False)

    rau = (feinstruktur(6705, 1, 1) - 0.5) * 0.13 + (noise(8, 6706) - 0.5) * 0.09
    erde = 0.335 + tint * 0.115 + rau
    erde = erde * FS * (0.86 + (lit - 0.5) * 0.55) + ao
    erde += (grob - 0.5) * 0.16
    erde -= sch * 0.13
    # Rillen bleiben feucht und dunkel, Ruecken trocknen hell ab
    feucht = np.clip(-furche * 0.5 + 0.5, 0, 1)
    erde *= (1.21 - feucht * 0.50)
    erde *= (0.90 + noise(3, 6707) * 0.24)          # Bodenwechsel im Schlag

    # Steine sind grau und kuehl, aber kein Weiss (sonst Salzkorn-Effekt)
    v = np.where(stein_m, (0.355 + tint * 0.135 + rau) * FS * (0.88 + (lit - 0.5) * 0.5) + ao, erde)
    v = np.clip(v, 0.03, 1.0)

    warm = np.where(stein_m, 0.22, 1.0)
    rr = v * (1.000 + warm * 0.055)
    gg = v * (0.985 - warm * 0.215)
    bb = v * (0.975 - warm * 0.440)

    # Stoppeln/Strohreste: helle kurze Fasern, ueberwiegend in den Rillen
    stroh = np.clip(feinstruktur(6708, 0, 3) - 0.60, 0, 1) * 4.0
    stroh *= np.clip(noise(6, 6709) * 1.6 - 0.72, 0, 1) * 2.2
    stroh = np.clip(stroh * (0.35 + feucht * 0.9), 0, 1) * 0.55
    rr = rr * (1 - stroh) + stroh * 0.66
    gg = gg * (1 - stroh) + stroh * 0.58
    bb = bb * (1 - stroh) + stroh * 0.36
    speichern("acker", np.stack([rr, gg, bb], -1))


# --------------------------------------------------- 8) Sand / Strand
def sand():
    """Windrippel im Strandsand: asymmetrisches Profil (Luvseite flach,
    Leeseite steil), echtes Quarzkorn mit Mikroschatten, dazu Muschelbruch
    und Kiesel. Alle Frequenzen ganzzahlig (die alte Fassung lief mit 4.8
    Perioden ueber N -> echte Naht, Messwert 1.7)."""
    # Domain-Warp -> Rippel laufen gebogen, wie am echten Strand
    X = xx + (noise(3, 6801) - 0.5) * 34.0 + (noise(5, 6802) - 0.5) * 12.0
    Y = yy + (noise(3, 6803) - 0.5) * 34.0 + (noise(5, 6804) - 0.5) * 12.0

    h = np.zeros((N, N), dtype=np.float32); tot = 0.0
    for fx_, fy_, amp, ph in ((3, 7, 1.00, 0.5), (4, 9, 0.62, 2.4),
                              (2, 5, 0.48, 4.1), (6, 13, 0.30, 1.2),
                              (5, 11, 0.24, 5.3)):
        h += amp * np.sin(2 * np.pi * (fx_ * X + fy_ * Y) / N + ph)
        tot += amp
    h /= tot
    hn = (h - h.min()) / (h.max() - h.min() + 1e-6)
    # Asymmetrie: Kamm scharf, Mulde breit
    h = (hn ** 1.7) * 2.0 - 0.6
    # grosse Duenenwoelbung + Trittmulden
    h += (noise(3, 6805) - 0.5) * 1.5 + (noise(5, 6806) - 0.5) * 0.55

    # Quarzkorn: einzelne Koerner, per Blur auf ~1.5 px Korngroesse
    kg = np.random.default_rng(6807).random((N, N)).astype(np.float32)
    kg = blur(kg, 1) * 1.55 + (feinstruktur(6808, 1, 1) - 0.5) * 0.55
    h += (kg - kg.mean()) * 0.75

    # Muschelbruch und Kiesel als flache Polygone
    r = np.random.default_rng(6809)
    ID = np.zeros((N, N), dtype=np.int32)
    FS = np.ones((N, N), dtype=np.float32)
    Hs = np.full((N, N), -1e6, dtype=np.float32)
    K = 150
    for i in range(K):
        rad = 1.6 + r.random() ** 1.6 * 4.6
        nf = int(r.integers(5, 9))
        roff = 0.72 + r.random(nf).astype(np.float32) * 0.46
        poly_stamp(Hs, ID, FS, i, r.random() * N, r.random() * N, rad, roff,
                   r.random() * 6.283, 0.55 + r.random() * 0.85,
                   r.random() * 6.283, 0.30 + r.random() * 0.55,
                   flach=0.22, kuppe=0.30)
    stueck = Hs > -1e5
    H = np.where(stueck, np.maximum(Hs, h), h).astype(np.float32)

    lit = relief(blur(H, 1), 0.85)
    fein_lit = relief(H, 0.32)
    grob_lit = relief(blur(H, 5), 1.05)
    ao = np.clip(H - blur(H, 8), -4, 4) * 0.045
    sch = schlagschatten(H, 5, 0.42)

    v = 0.700 + (kg - kg.mean()) * 0.50
    v += (lit - 0.5) * 0.34 + (fein_lit - 0.5) * 0.22 + (grob_lit - 0.5) * 0.42
    v += ao - sch * 0.14
    # Rippelkamm: dort liegt trockenes, helles Grobkorn
    kamm = np.clip((hn - 0.66) / 0.34, 0, 1)
    v += kamm * 0.045
    # feuchte/trockene Zonen (Spuelsaum) und dunkle Schwermineralschlieren
    nass = np.clip(noise(3, 6810) - 0.52, 0, 1) * 2.0
    v -= np.clip(nass, 0, 1) * 0.115
    schwer = np.clip(noise(6, 6811) - 0.66, 0, 1) * 2.4
    v -= np.clip(schwer, 0, 1) * 0.085
    v *= (0.94 + noise(4, 6812) * 0.14)

    # Muschel/Kiesel heller und kaelter als der Sand
    tint = r.random(K).astype(np.float32)[ID]
    stk = np.where(stueck, 1.0, 0.0).astype(np.float32)
    vs = (0.775 + tint * 0.110) * FS * (0.88 + (lit - 0.5) * 0.55) + ao
    v = v * (1 - stk) + vs * stk
    v = np.clip(v, 0.05, 1.0)

    warm = 1.0 - stk * 0.55
    rr = v * (1.000)
    gg = v * (0.995 - warm * 0.075)
    bb = v * (0.955 - warm * 0.215)
    # Glitzern einzelner Quarzflaechen in der Sonne
    fun = np.clip(fein_lit - 0.70, 0, 1) ** 1.3 * 1.6
    fun *= (np.random.default_rng(6813).random((N, N)).astype(np.float32) > 0.90)
    rr += fun * 0.22; gg += fun * 0.21; bb += fun * 0.17
    speichern("sand", np.stack([rr, gg, bb], -1))


ALLE = (glasfassade, betonfassade, asphalt, dachpappe, marmor,
        metallgitter, acker, sand)


def nahtpruefung():
    """Referenzmetrik: mittlere Randdifferenz (beide Kanten) geteilt durch die
    mittlere Nachbardifferenz (ueber beide Achsen gepoolt). Ziel <= 1.5."""
    print("\nNahtpruefung (Rand/Nachbar, Ziel <= 1.5):")
    for name, a in BILDER.items():
        g = a.mean(axis=2)
        nb = (np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean()) / 2
        dv = np.abs(g[:, 0] - g[:, -1]).mean() / (nb + 1e-9)
        dh = np.abs(g[0, :] - g[-1, :]).mean() / (nb + 1e-9)
        print("  %-16s links/rechts %5.2f  oben/unten %5.2f  ->  %5.2f"
              % (name, dv, dh, (dv + dh) / 2))


if __name__ == "__main__":
    print("Textur-Charge 2 (th6, Riesenstadt):")
    for fn in ALLE:
        fn()
    nahtpruefung()
    print("fertig ->", OUT)
