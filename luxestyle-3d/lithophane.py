#!/usr/bin/env python3
# lithophane.py - Foto -> 3D-Lithophane (Relief-Anhaenger / Nachtlicht). LuxeStyle.
# ---------------------------------------------------------------------------
# Reines Python + Pillow (KEIN numpy - das System-numpy ist im Container kaputt).
# Dunkel = dick (blockt Licht), Hell = duenn (Licht scheint durch) -> backlit.
# Wasserdichtes Mesh: Relief-Oberseite + flache Rueckseite + 4 Waende. Optional
# Rahmen + Schluesselring-Lasche (washer, ueberlappt den Rahmen -> verschmilzt im Slicer).
#
# Lizenz: Kundenfoto = eigenes Recht des Kunden, kein fremdes IP -> sicher verkaufbar.
#
# Benutzen:
#   python3 lithophane.py foto.jpg out.stl --width 60 --min 0.8 --max 3.0 \
#       --pixels 200 --border 2 --ring
#   (Druck: flach, Rueckseite auf Platte, 0.12 mm Layer, 100% Infill, weisses PLA,
#    LED/Fenster dahinter. Anhaenger ~60 mm, Nachtlicht groesser.)
# ---------------------------------------------------------------------------
import sys, struct, argparse, math
from PIL import Image, ImageOps


def load_height(path, pixels, min_t, max_t, invert, gamma):
    im = Image.open(path).convert("L")
    im = ImageOps.autocontrast(im, cutoff=1)          # Kontrast spreizen
    w, h = im.size
    # auf Zielaufloesung skalieren (laengere Kante = pixels), Seitenverhaeltnis halten
    if w >= h:
        nx = pixels; ny = max(2, round(pixels * h / w))
    else:
        ny = pixels; nx = max(2, round(pixels * w / h))
    im = im.resize((nx, ny), Image.LANCZOS)
    px = im.load()
    span = max_t - min_t
    H = [[0.0] * nx for _ in range(ny)]
    for j in range(ny):
        for i in range(nx):
            lum = px[i, j] / 255.0
            if invert:
                lum = 1.0 - lum
            # gamma justiert die Tonkurve (1.0 = linear); dunkel -> dick
            t = (1.0 - lum) ** gamma
            H[j][i] = min_t + span * t
    return H, nx, ny


def build_mesh(H, nx, ny, cell, border, min_t, max_t):
    """Gibt Liste von Dreiecken (je 3 (x,y,z)-Tupel) zurueck. Wasserdicht."""
    tris = []
    # Gitter so legen, dass (0,0) die Mitte unten-links-naehe ist; y nach oben
    def vx(i): return i * cell
    def vy(j): return (ny - 1 - j) * cell          # Bild oben = y gross
    # --- Relief-Oberseite ---
    for j in range(ny - 1):
        for i in range(nx - 1):
            x0, x1 = vx(i), vx(i + 1)
            y0, y1 = vy(j), vy(j + 1)
            a = (x0, y0, H[j][i]);     b = (x1, y0, H[j][i + 1])
            c = (x1, y1, H[j + 1][i + 1]); d = (x0, y1, H[j + 1][i])
            tris.append((a, b, c)); tris.append((a, c, d))
    W = vx(nx - 1); Hh = vy(0)
    # --- flache Rueckseite als VOLLES Gitter (z=0), Normalen nach unten ---
    # (volles Gitter statt 2 Dreiecke -> Rand-Kanten teilen sich sauber mit den
    #  unterteilten Waenden; sonst T-Verbindungen = non-manifold.)
    for j in range(ny - 1):
        for i in range(nx - 1):
            x0, x1 = vx(i), vx(i + 1)
            y0, y1 = vy(j), vy(j + 1)
            a = (x0, y0, 0); b = (x1, y0, 0); c = (x1, y1, 0); d = (x0, y1, 0)
            tris.append((a, c, b)); tris.append((a, d, c))   # nach unten
    # --- 4 Waende (Rand der Platte) ---
    # untere/obere Kante
    for i in range(nx - 1):
        x0, x1 = vx(i), vx(i + 1)
        # vorne (y=0)
        z0, z1 = H[ny - 1][i], H[ny - 1][i + 1]
        tris.append(((x0, 0, 0), (x1, 0, z1), (x1, 0, 0)))
        tris.append(((x0, 0, 0), (x0, 0, z0), (x1, 0, z1)))
        # hinten (y=Hh)
        z0, z1 = H[0][i], H[0][i + 1]
        tris.append(((x0, Hh, 0), (x1, Hh, 0), (x1, Hh, z1)))
        tris.append(((x0, Hh, 0), (x1, Hh, z1), (x0, Hh, z0)))
    for j in range(ny - 1):
        y0, y1 = vy(j), vy(j + 1)
        # links (x=0)
        z0, z1 = H[j][0], H[j + 1][0]
        tris.append(((0, y0, 0), (0, y1, 0), (0, y1, z1)))
        tris.append(((0, y0, 0), (0, y1, z1), (0, y0, z0)))
        # rechts (x=W)
        z0, z1 = H[j][nx - 1], H[j + 1][nx - 1]
        tris.append(((W, y0, 0), (W, y1, z1), (W, y1, 0)))
        tris.append(((W, y0, 0), (W, y0, z0), (W, y1, z1)))
    return tris, W, Hh


def add_ring(tris, W, Hh, max_t):
    """Flache Oese (washer) oben mittig, ueberlappt den oberen Rand -> verschmilzt."""
    cx = W / 2.0
    cy = Hh + 2.0                      # ueberlappt den oberen Rand ~3 mm -> haengt fest
    ro, ri, z = 5.0, 2.4, max_t        # Aussen-/Innenradius, Dicke = max_t
    seg = 48
    def ring_pt(r, k):
        a = 2 * math.pi * k / seg
        return (cx + r * math.cos(a), cy + r * math.sin(a))
    for k in range(seg):
        o0 = ring_pt(ro, k); o1 = ring_pt(ro, k + 1)
        i0 = ring_pt(ri, k); i1 = ring_pt(ri, k + 1)
        # oben (z) und unten (0): Annulus-Flaeche
        tris.append(((o0[0], o0[1], z), (i0[0], i0[1], z), (i1[0], i1[1], z)))
        tris.append(((o0[0], o0[1], z), (i1[0], i1[1], z), (o1[0], o1[1], z)))
        tris.append(((o0[0], o0[1], 0), (i1[0], i1[1], 0), (i0[0], i0[1], 0)))
        tris.append(((o0[0], o0[1], 0), (o1[0], o1[1], 0), (i1[0], i1[1], 0)))
        # Aussenwand
        tris.append(((o0[0], o0[1], 0), (o1[0], o1[1], 0), (o1[0], o1[1], z)))
        tris.append(((o0[0], o0[1], 0), (o1[0], o1[1], z), (o0[0], o0[1], z)))
        # Innenwand (Loch)
        tris.append(((i0[0], i0[1], 0), (i1[0], i1[1], z), (i1[0], i1[1], 0)))
        tris.append(((i0[0], i0[1], 0), (i0[0], i0[1], z), (i1[0], i1[1], z)))


def write_stl(path, tris):
    with open(path, "wb") as f:
        f.write(b"\0" * 80)
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            ux, uy, uz = b[0]-a[0], b[1]-a[1], b[2]-a[2]
            vx_, vy_, vz_ = c[0]-a[0], c[1]-a[1], c[2]-a[2]
            nx_, ny_, nz_ = uy*vz_-uz*vy_, uz*vx_-ux*vz_, ux*vy_-uy*vx_
            ln = math.sqrt(nx_*nx_+ny_*ny_+nz_*nz_) or 1.0
            f.write(struct.pack("<3f", nx_/ln, ny_/ln, nz_/ln))
            for v in (a, b, c):
                f.write(struct.pack("<3f", *v))
            f.write(b"\0\0")


def main():
    ap = argparse.ArgumentParser(description="Foto -> 3D-Lithophane STL")
    ap.add_argument("image"); ap.add_argument("out")
    ap.add_argument("--width", type=float, default=60.0, help="Breite in mm (laengere Kante)")
    ap.add_argument("--min", type=float, default=0.8, help="duennste Stelle (hell) mm")
    ap.add_argument("--max", type=float, default=3.0, help="dickste Stelle (dunkel) mm")
    ap.add_argument("--pixels", type=int, default=200, help="Aufloesung (laengere Kante)")
    ap.add_argument("--gamma", type=float, default=1.0, help="Tonkurve (>1 dunkler, <1 heller)")
    ap.add_argument("--invert", action="store_true", help="hell=dick statt dunkel=dick")
    ap.add_argument("--ring", action="store_true", help="Schluesselring-Oese oben anfuegen")
    a = ap.parse_args()
    H, nx, ny = load_height(a.image, a.pixels, a.min, a.max, a.invert, a.gamma)
    cell = a.width / (max(nx, ny) - 1)
    tris, W, Hh = build_mesh(H, nx, ny, cell, 0, a.min, a.max)
    if a.ring:
        add_ring(tris, W, Hh, a.max)
    write_stl(a.out, tris)
    print("LITHO_DONE %s  %dx%d px  %.1fx%.1f mm  %d Dreiecke%s"
          % (a.out, nx, ny, W, Hh, len(tris), "  +Oese" if a.ring else ""))


if __name__ == "__main__":
    main()
