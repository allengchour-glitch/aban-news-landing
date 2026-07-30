# -*- coding: utf-8 -*-
"""Normal-Maps fuer die wichtigsten Boden- und Fassadentexturen des Stadtspiels.

Aus jeder Albedo-Textur `<name>.png` wird `<name>_n.png` im SELBEN Ordner erzeugt.

Verfahren
---------
1. PNG per `bpy.data.images.load()` lesen, Pixel als numpy-Array holen
   (bpy liefert bottom-up -> umdrehen; Colorspace 'Non-Color' = rohe Bytewerte).
2. Hoehenkarte: Luminanz -> Hochpass (lokaler Mittelwert abgezogen, alles per
   np.roll bzw. Wrap-Box-Blur => nahtlos). Der Albedo-Wert allein taugt nicht:
   ein dunkler *Fleck* ist keine Vertiefung. Deshalb zusaetzlich eine
   Chroma-Daempfung: wo die Helligkeitsaenderung durch eine FARB-aenderung
   erklaert wird (Fleck, Moos, Rost, Graffiti), wird die Hoehe abgeschwaecht.
   Danach leichtes Entrauschen (kleiner Blur) und robuste Normierung.
3. Normale ueber den Gradienten:  n = normalize(-dh/du, -dh/dv, 1/staerke),
   Kodierung  rgb = 0.5 + 0.5*n   (Tangent-Space, +Y nach oben = three.js/GL).
4. Alle Ableitungen laufen ueber np.roll -> die Normal-Map ist genauso
   nahtlos kachelbar wie das Original (keine Naht an den Raendern).
5. `staerke` (und Detailradius) pro Textur einzeln: Kopfstein/Schotter kraeftig,
   Asphalt/Beton fein.

Aufruf:  python3 tools/assets/mk_normalmaps.py
"""
import os
import bpy
import numpy as np

ROOT = "/home/user/aban-news-landing/textures"

# ---------------------------------------------------------------- Parameter
# name                      staerke  radius  chroma  bemerkung
# staerke : 1/z der Normalen -> gross = kraeftiges Relief
# radius  : Hochpass-Radius in px (= groesste beruecksichtigte Strukturgroesse)
# chroma  : wie stark rein farbige (nicht geometrische) Kontraste gedaempft werden
TEXTUREN = [
    ("th5/kopfstein",        1.60, 26, 0.55),  # runde Katzenkoepfe + tiefe Fugen -> kraeftig
    ("th5/dachziegel",       1.00, 22, 0.55),  # Ziegelwellen, deutlich aber nicht extrem
    ("th5/backstein_alt",    0.90, 20, 0.75),  # alte Mauer: viele Farbflecken -> stark daempfen
    ("th6/asphalt",          0.45, 10, 0.35),  # feine Koernung
    ("th6/betonfassade",     0.40, 30, 0.50),  # glatt, nur Schalungsstoss + Poren
    ("th9/burgmauer",        1.50, 34, 0.65),  # grobe Bruchsteine, tiefe Fugen -> kraeftig
    ("th9/betonwerkstein",   0.70, 26, 0.55),  # Werksteinplatten, feine Fasen
    ("th9/metallpaneel",     0.80, 24, 0.40),  # Blechsicken/Schrauben, sonst glatt
    ("th15/gleisschotter",   1.80, 18, 0.45),  # Schotter: kraeftigstes Relief
    ("th15/holzdeck",        0.90, 24, 0.60),  # Maserung fein, Dielenfugen deutlich
    ("th28/gehwegplatten",   0.90, 30, 0.50),  # Plattenfugen deutlich, Flaeche glatt
    ("th28/kopfstein_nass",  1.40, 26, 0.60),  # nass: Glanzflecken sind KEINE Geometrie
]

# Gradient-Normierung: das `NORM_PERZENTIL`-Perzentil der Steigung wird auf 1.0
# gelegt, damit `staerke` bei jeder Textur dasselbe bedeutet; `NORM_CLAMP`
# deckelt die Ausreisser (harte Fugenkanten wuerden sonst 90 Grad kippen).
NORM_PERZENTIL = 92.0
NORM_CLAMP = 2.5


# ---------------------------------------------------------------- Hilfsmittel
def lade_png(pfad):
    """PNG via bpy laden -> (H,W,3) float32 0..1, Zeile 0 = oben."""
    img = bpy.data.images.load(pfad, check_existing=False)
    try:
        img.colorspace_settings.name = 'Non-Color'   # rohe Werte, keine Transformation
    except Exception:
        pass
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    return buf.reshape(h, w, 4)[::-1, :, :3].copy()   # bpy-Origin ist unten links


def speichern_png(pfad, rgb):
    """(H,W,3) float 0..1 -> PNG (bpy erwartet bottom-up)."""
    h, w = rgb.shape[:2]
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., :3] = np.clip(rgb, 0.0, 1.0)
    name = os.path.basename(pfad)
    img = bpy.data.images.new(name, width=w, height=h)
    try:
        img.colorspace_settings.name = 'Non-Color'   # Normal-Map ist kein Farbbild
    except Exception:
        pass
    img.pixels.foreach_set(px[::-1].ravel())
    img.filepath_raw = pfad
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def wrap_box(a, r):
    """Box-Blur mit Wrap-Around (nahtlos), separabel ueber cumsum."""
    if r < 1:
        return a
    k = 2 * r + 1
    out = a
    for axis in (1, 0):
        x = out if axis == 1 else out.T
        pad = np.concatenate([x[:, -r:], x, x[:, :r]], axis=1)
        c = np.cumsum(pad, axis=1, dtype=np.float64)
        c = np.concatenate([np.zeros((x.shape[0], 1)), c], axis=1)
        x = ((c[:, k:] - c[:, :-k]) / k).astype(np.float32)
        out = x if axis == 1 else x.T
    return out


def wrap_blur(a, r, passes=3):
    """Drei Box-Durchgaenge ~ Gauss, weiterhin nahtlos."""
    for _ in range(passes):
        a = wrap_box(a, r)
    return a


def hoehenkarte(rgb, radius, chroma_daempfung):
    """Albedo -> Hoehenkarte (Struktur statt Farbe), nahtlos."""
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]).astype(np.float32)
    chroma = (rgb.max(axis=2) - rgb.min(axis=2)).astype(np.float32)

    # 1) Hochpass: lokalen Mittelwert abziehen -> grossflaechige Helligkeits-/
    #    Farbunterschiede (Verlaufe, Flecken, Vignetten) verschwinden.
    hp_l = lum - wrap_blur(lum, radius)
    hp_c = chroma - wrap_blur(chroma, radius)

    # 2) Chroma-Daempfung: wo die Helligkeitsaenderung von einer Farbaenderung
    #    begleitet wird (Fleck/Moos/Rost/Nasse Stelle), ist sie keine Geometrie.
    if chroma_daempfung > 0:
        daempf = np.clip(1.0 - chroma_daempfung * np.abs(hp_c) / (np.abs(hp_l) + 1e-4), 0.0, 1.0)
        hp_l = hp_l * daempf

    # 3) Entrauschen: Einzelpixel-Rauschen wuerde zu Salz-und-Pfeffer-Normalen fuehren.
    h = wrap_blur(hp_l, 1, passes=2)

    # 4) Robuste Normierung (Ausreisser abschneiden, dann auf +/-1 skalieren).
    lo, hi = np.percentile(h, 1.0), np.percentile(h, 99.0)
    spanne = max(hi - lo, 1e-5)
    h = np.clip((h - 0.5 * (lo + hi)) / (0.5 * spanne), -1.5, 1.5)
    return h.astype(np.float32)


def normalmap(h, staerke):
    """Gradient (wrappend) -> Tangent-Space-Normal-Map, +Y nach oben."""
    # Ableitungen mit np.roll => kein Rand, keine Naht.
    dh_du = 0.5 * (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1))   # u = x, nach rechts
    dh_dr = 0.5 * (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0))   # Zeilenindex, nach unten
    dh_dv = -dh_dr                                                   # v (UV) zeigt nach OBEN

    # Steigungen auf eine einheitliche Skala bringen (Perzentil -> 1.0),
    # damit `staerke` bei jeder Textur dasselbe bedeutet, Ausreisser deckeln.
    g = np.sqrt(dh_du ** 2 + dh_dv ** 2)
    bezug = max(float(np.percentile(g, NORM_PERZENTIL)), 1e-6)
    dh_du = dh_du / bezug
    dh_dv = dh_dv / bezug
    g = np.sqrt(dh_du ** 2 + dh_dv ** 2)
    deckel = np.minimum(1.0, NORM_CLAMP / np.maximum(g, 1e-9))
    dh_du = dh_du * deckel
    dh_dv = dh_dv * deckel

    nx = -dh_du
    ny = -dh_dv
    nz = np.full_like(nx, 1.0 / max(staerke, 1e-6))
    laenge = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / laenge, ny / laenge, nz / laenge

    return np.stack([0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz], axis=-1).astype(np.float32)


# ---------------------------------------------------------------- Abnahme
def naht_werte(a):
    """(global, lokal): Randdifferenz gegen mittlere Nachbardifferenz.

    global : Rand gegen den Mittelwert ALLER Nachbarpaare des Bildes.
    lokal  : Rand gegen die Nachbarpaare direkt daneben. Der lokale Wert ist
             der aussagekraeftige: liegt (wie bei Kopfstein/Backstein) die
             Mitte einer Fuge genau auf der Kachelgrenze, dann kippt die
             Normale dort voellig korrekt um - das ist Struktur, keine Naht.
    """
    glob, lok = 0.0, 0.0
    for achse in (1, 0):
        x = a if achse == 1 else np.swapaxes(a, 0, 1)
        rand = np.abs(x[:, 0] - x[:, -1]).mean()
        alle = np.abs(np.diff(x, axis=1)).mean()
        nahe = np.mean([np.abs(x[:, i + 1] - x[:, i]).mean() for i in (0, 1, -2, -3)])
        glob = max(glob, float(rand / max(alle, 1e-9)))
        lok = max(lok, float(rand / max(nahe, 1e-9)))
    return glob, lok


def wrap_probe(rgb, staerke, radius, chroma):
    """Beweis, dass die Kette nahtlos ist: das Ergebnis eines verschobenen
    Originals muss (zurueckgeschoben) exakt dem Ergebnis des Originals
    entsprechen. Nur eine Kette ohne Randbehandlung schafft 0.0."""
    a = normalmap(hoehenkarte(rgb, radius, chroma), staerke)
    v = np.roll(np.roll(rgb, 137, 0), 211, 1)
    b = normalmap(hoehenkarte(v, radius, chroma), staerke)
    b = np.roll(np.roll(b, -137, 0), -211, 1)
    return float(np.abs(a - b).max())


def main():
    print("Normal-Maps  (Original -> <name>_n.png)")
    print("-" * 92)
    print(f"{'Datei':28s} {'Staerke':>7s} {'MW R':>6s} {'MW G':>6s} {'MW B':>6s} "
          f"{'Naht_lok':>8s} {'Naht_glob':>9s} {'Wrap':>5s}  OK")
    ok_gesamt = True
    for rel, staerke, radius, chroma in TEXTUREN:
        quelle = os.path.join(ROOT, rel + ".png")
        ziel = os.path.join(ROOT, rel + "_n.png")
        rgb = lade_png(quelle)
        nm = normalmap(hoehenkarte(rgb, radius, chroma), staerke)
        speichern_png(ziel, nm)
        wrap = wrap_probe(rgb, staerke, radius, chroma)

        # aus der geschriebenen Datei zurueckgelesen pruefen (8-bit-Quantisierung inklusive)
        kontrolle = lade_png(ziel)
        r = float(kontrolle[..., 0].mean())
        g = float(kontrolle[..., 1].mean())
        b = float(kontrolle[..., 2].mean())
        n_glob, n_lok = naht_werte(kontrolle)
        ok = (b > 0.85) and (abs(r - 0.5) < 0.02) and (abs(g - 0.5) < 0.02) \
            and (n_lok <= 1.5) and (wrap < 1e-6)
        ok_gesamt &= ok
        print(f"{rel + '_n.png':28s} {staerke:7.2f} {r:6.3f} {g:6.3f} {b:6.3f} "
              f"{n_lok:8.2f} {n_glob:9.2f} {wrap:5.2f}  {'ja' if ok else 'NEIN'}")
    print("-" * 92)
    print("Abnahme:", "alle bestanden" if ok_gesamt else "siehe NEIN-Zeilen")


if __name__ == "__main__":
    main()
