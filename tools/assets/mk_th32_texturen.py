# -*- coding: utf-8 -*-
"""Texturen fuer Charge 32 (Freizeitpark) -> textures/th32/*.png

Alle 512x512 und NAHTLOS kachelbar. Nahtlosigkeit entsteht hier nicht durch
Nachbearbeitung, sondern durch Wrap-Arithmetik: jedes Muster wird modulo N
gerechnet, jeder Blur rollt ueber den Rand. Wer stattdessen ein Bild spiegelt
oder ueberblendet, bekommt sichtbare Symmetrieachsen.

Geprueft wird mit `pruef_nahtlos()`: der Sprung an der Kachelgrenze darf nicht
groesser sein als der mittlere Sprung im Bildinneren (Kennzahl <= 1.5).
"""
import bpy, numpy as np, os

OUT = "/home/user/aban-news-landing/textures/th32"
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



def pruef_nahtlos(name, a):
    """Kachelgrenze gegen Bildinneres. Die Kennzahl ist der Sprung AM Rand geteilt
    durch den mittleren Sprung innen — ueber ~1.5 sieht man die Fuge."""
    g = a.mean(axis=2) if a.ndim == 3 else a
    rand = (np.abs(g[0, :] - g[-1, :]).mean() + np.abs(g[:, 0] - g[:, -1]).mean())/2
    innen = (np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean())/2
    q = rand/max(1e-6, innen)
    print("     Naht %-18s %.2f %s" % (name, q, "ok" if q <= 1.5 else "<-- PRUEFEN"))
    return q

# ------------------------------------------------ 1) Zeltbahn (Kirmes-Streifen)
def zeltbahn():
    """Rot-weisse Markisenbahn mit Webstruktur und weichem Faltenschatten.
    Die Streifenzahl muss N teilen, sonst schneidet die letzte Bahn am Rand ab."""
    STREIFEN = 8
    # Halbe Bahn Versatz: sonst liegt der Farbwechsel GENAU auf der Kachelkante.
    # Das kachelt zwar korrekt, doch die Textur ist dann nur noch gekachelt
    # brauchbar — einzeln aufgezogen sieht man eine harte Kante am Rand.
    t = ((xx + N/(4*STREIFEN))/(N/STREIFEN)) % 1.0
    stripe = (t < 0.5).astype(np.float32)
    kante = np.minimum(band((t - 0.5)*(N/STREIFEN), 2.0), 1.0)
    kante = np.maximum(kante, band(t*(N/STREIFEN), 2.0))
    gewebe = feinstruktur(11, 0, 3)*0.5 + feinstruktur(12, 3, 0)*0.5
    falte = 0.5 + 0.5*np.sin(xx/(N/STREIFEN)*np.pi*2 - np.pi/2)
    rot = np.stack([np.full((N,N),0.86), np.full((N,N),0.18), np.full((N,N),0.20)], -1)
    wei = np.stack([np.full((N,N),0.96), np.full((N,N),0.95), np.full((N,N),0.92)], -1)
    rgb = stripe[...,None]*rot + (1-stripe[...,None])*wei
    rgb *= (0.86 + 0.28*gewebe)[...,None]
    rgb *= (0.88 + 0.16*falte)[...,None]
    rgb *= (1.0 - 0.18*kante)[...,None]
    speichern("zeltbahn", rgb); pruef_nahtlos("zeltbahn", rgb)

# ------------------------------------------------ 2) Bohlenbelag (Bahnsteig, Steg)
def bohlen():
    """Laengsbohlen mit Fuge, Maserung und Astloechern. Die Fugen liegen im
    festen Raster, damit sie sich beim Kacheln fortsetzen."""
    BOHLEN = 8
    bh = N/BOHLEN
    reihe = ((yy + bh/2)/bh).astype(int) % BOHLEN   # Fuge nicht auf die Kante,
    # und der Index MUSS umlaufen: sonst hat die letzte Bohle einen anderen Ton
    # als die erste der Nachbarkachel und die Fuge wird sichtbar.
    t = ((yy + bh/2)/bh) % 1.0
    fuge = np.maximum(band(t*bh, 2.2), band((t-1.0)*bh, 2.2))
    versatz = (reihe*137) % N
    maser = feinstruktur(21, 0, 9)
    maser = 0.5 + 0.5*np.sin((xx + versatz)/9.0 + maser*7.0)
    grund = np.stack([np.full((N,N),0.60), np.full((N,N),0.43), np.full((N,N),0.25)], -1)
    ton = (0.90 + 0.14*((reihe*7919 % 13)/13.0))[...,None]
    rgb = grund*ton
    rgb *= (0.84 + 0.24*maser)[...,None]
    ast = np.zeros((N,N), np.float32)
    r = np.random.default_rng(22)
    for _ in range(9):
        dy, dx = wrap_d(r.integers(0,N), r.integers(0,N))
        ast = np.maximum(ast, np.clip(1.0 - np.hypot(dy, dx)/r.uniform(3.5,7.0), 0, 1))
    rgb *= (1.0 - 0.42*ast)[...,None]
    rgb *= (1.0 - 0.55*fuge)[...,None]
    speichern("bohlen", rgb); pruef_nahtlos("bohlen", rgb)

# ------------------------------------------------ 3) Riffelblech (Stege, Gitter)
def riffelblech():
    """Traenenblech: versetzte Doppelnoppen auf gebuerstetem Metall."""
    Z = 8
    cy, cx = (yy/(N/Z)) % 1.0, (xx/(N/Z)) % 1.0
    reihe = (yy/(N/Z)).astype(int)
    cx = (cx + 0.5*(reihe % 2)) % 1.0
    noppe = np.zeros((N,N), np.float32)
    for (oy, ox, ang) in ((0.32, 0.30, 0.6), (0.68, 0.70, -0.6)):
        u = (cy-oy)*np.cos(ang) + (cx-ox)*np.sin(ang)
        v = -(cy-oy)*np.sin(ang) + (cx-ox)*np.cos(ang)
        noppe = np.maximum(noppe, np.clip(1.0 - np.hypot(u/0.22, v/0.075), 0, 1))
    buerste = feinstruktur(31, 0, 7)
    g = 0.52 + 0.30*noppe + 0.16*buerste
    rgb = np.stack([g*1.00, g*1.02, g*1.06], -1)
    speichern("riffelblech", rgb); pruef_nahtlos("riffelblech", rgb)

# ------------------------------------------------ 4) Parkpflaster
def parkpflaster():
    """Gepflasterter Parkweg: unregelmaessige Platten mit Sandfuge."""
    # Z MUSS N teilen. Mit 6 ergibt 512/6 = 85,33 px — die letzte Plattenreihe
    # wird abgeschnitten und die Kachelkante reisst sichtbar auf (Kennzahl 20,3).
    Z = 8
    cell = N/Z
    iy, ix = ((yy + cell/2)/cell).astype(int), ((xx + cell/2)/cell).astype(int)
    r = np.random.default_rng(41)
    jit = r.random((Z, Z, 2)).astype(np.float32)*0.30 - 0.15
    oy = jit[iy % Z, ix % Z, 0]; ox = jit[iy % Z, ix % Z, 1]
    ty = ((yy + cell/2)/cell) % 1.0 - 0.5 - oy
    tx = ((xx + cell/2)/cell) % 1.0 - 0.5 - ox
    d = np.maximum(np.abs(ty), np.abs(tx))
    fuge = np.clip((d - 0.40)/0.07, 0, 1)
    ton = r.random((Z, Z)).astype(np.float32)[iy % Z, ix % Z]
    korn = noise(4, 42)
    g = 0.56 + 0.12*ton + 0.14*korn
    rgb = np.stack([g*1.02, g*1.00, g*0.95], -1)
    sand = np.stack([np.full((N,N),0.46), np.full((N,N),0.42), np.full((N,N),0.36)], -1)
    rgb = rgb*(1-fuge[...,None]) + sand*fuge[...,None]
    speichern("parkpflaster", rgb); pruef_nahtlos("parkpflaster", rgb)

# ------------------------------------------------ 5) Wasserbecken
def wasser():
    """Bewegte Wasseroberflaeche: zwei ueberlagerte Wellenzuege plus Kaustik.
    Die Frequenzen sind GANZZAHLIG, sonst bricht die Welle an der Kachelgrenze."""
    w1 = np.sin(2*np.pi*(3*xx + 2*yy)/N)
    w2 = np.sin(2*np.pi*(2*xx - 5*yy)/N + 1.3)
    w3 = np.sin(2*np.pi*(7*xx + 6*yy)/N + 2.1)
    h = 0.5 + 0.22*w1 + 0.16*w2 + 0.10*w3
    kaustik = np.clip(blur(np.clip(h - 0.62, 0, 1), 3)*6.0, 0, 1)
    g = 0.24 + 0.26*h
    rgb = np.stack([g*0.42, g*1.05, g*1.32], -1)
    rgb += kaustik[...,None]*np.array([0.30, 0.42, 0.46], np.float32)
    speichern("wasser", rgb); pruef_nahtlos("wasser", rgb)

# ------------------------------------------------ 6) Lichterband (Kirmes-Glueh)
def lichterband():
    """Leuchtband fuer Fassaden und Bogen: Gluehbirnen auf dunkler Schiene."""
    Z = 10
    cy = (yy/N) % 1.0
    cx = (xx/(N/Z)) % 1.0
    lampe = np.clip(1.0 - np.hypot((cy-0.5)/0.30, (cx-0.5)/0.30), 0, 1)
    glow = blur(lampe, 9)
    idx = (xx/(N/Z)).astype(int) % 3
    farben = np.array([[1.00,0.92,0.62],[1.00,0.46,0.42],[0.52,0.80,1.00]], np.float32)
    f = farben[idx]
    schiene = np.full((N,N,3), 0.13, np.float32)
    rgb = schiene + f*(lampe**0.6)[...,None] + f*glow[...,None]*0.55
    speichern("lichterband", rgb); pruef_nahtlos("lichterband", rgb)

# ------------------------------------------------ 7) Hausputz (Fassaden)
def hausputz():
    """Fassadenputz fuer die Wohnhaeuser. Ersetzt `textures/th/putz.jpg`: das Foto
    ist NICHT kachelbar und wird mit Wiederholung (4 x 2,5) auf jede Wand gelegt —
    dadurch laufen vier senkrechte Naehte ueber die Fassade, die im Spiel als
    "breite Striche" auffallen.
    Hier entsteht das Muster wie in der ganzen Charge per Wrap-Arithmetik: Korn,
    weiche Unebenheiten und feine Risse werden modulo N gezeichnet."""
    korn = feinstruktur(71, 1, 1)*0.55 + feinstruktur(72, 2, 2)*0.45
    wolke = blur(noise(5, 73), 3)
    # Risse: duenne, gekruemmte Linien — ueber wrap_d gezeichnet, also nahtlos
    riss = np.zeros((N, N), np.float32)
    r = np.random.default_rng(74)
    for _ in range(26):
        py, px = float(r.integers(0, N)), float(r.integers(0, N))
        ang = r.uniform(0, 2*np.pi)
        for step in range(int(r.uniform(14, 46))):
            py = (py + np.sin(ang)*2.0) % N
            px = (px + np.cos(ang)*2.0) % N
            ang += r.uniform(-0.35, 0.35)
            dy, dx = wrap_d(py, px)
            riss = np.maximum(riss, np.clip(1.0 - np.hypot(dy, dx)/1.6, 0, 1))
    riss = blur(riss, 1)
    g = 0.86 + 0.10*korn + 0.06*wolke - 0.16*riss
    rgb = np.stack([g*1.00, g*0.995, g*0.965], -1)   # leicht warmer Putzton
    speichern("hausputz", rgb); pruef_nahtlos("hausputz", rgb)

if __name__ == "__main__":
    print("Texturen Charge 32 (Freizeitpark):")
    for fn in (zeltbahn, bohlen, riffelblech, parkpflaster, wasser, lichterband, hausputz):
        fn()
    print("fertig")
