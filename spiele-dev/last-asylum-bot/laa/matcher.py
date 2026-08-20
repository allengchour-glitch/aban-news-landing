"""Template-Matching (normalisierte Kreuzkorrelation) – grob-zu-fein.

Ablauf pro Suche:
1. Bild + Template stark verkleinern, dort mit Stichproben-Pixeln grob suchen.
2. Die besten Kandidaten in voller Auflösung mit dem kompletten Template nachrechnen.

Ohne numpy läuft alles in reinem Python (langsamer, aber lauffähig);
mit numpy wird der Grob-Durchlauf vektorisiert.
"""

from __future__ import annotations

import math
from typing import List, NamedTuple, Optional, Sequence, Tuple

from .image import Image

try:  # numpy ist optional – nur Beschleunigung
    import numpy as _np
except Exception:  # pragma: no cover - abhängig von der Umgebung
    _np = None

HAVE_NUMPY = _np is not None

COARSE_WIDTH = 180  # Zielbreite des Grob-Durchlaufs
MAX_SAMPLES = 64  # Stichproben-Pixel im Grob-Durchlauf (nur ohne numpy)
CANDIDATES = 6  # so viele Grob-Treffer werden fein nachgerechnet
SICHER_GENUG = 0.97  # ab hier lohnt kein weiterer Kandidat mehr


class Match(NamedTuple):
    score: float
    x: int
    y: int
    w: int
    h: int

    @property
    def center(self) -> Tuple[int, int]:
        return (self.x + self.w // 2, self.y + self.h // 2)


def resolve_region(region: Optional[Sequence[float]], width: int, height: int):
    """Region als (l, t, r, b) – Werte <= 1.0 gelten als relativ."""
    if not region:
        return (0, 0, width, height)
    l, t, r, b = region

    def px(v, size):
        return int(round(v * size)) if abs(v) <= 1.0 else int(round(v))

    box = (px(l, width), px(t, height), px(r, width), px(b, height))
    l, t, r, b = box
    l = max(0, min(l, width - 1))
    t = max(0, min(t, height - 1))
    r = max(l + 1, min(r, width))
    b = max(t + 1, min(b, height))
    return (l, t, r, b)


def find(
    screen: Image,
    template: Image,
    threshold: float = 0.85,
    region: Optional[Sequence[float]] = None,
    scale: float = 1.0,
) -> Optional[Match]:
    """Bester Treffer oder None. Koordinaten beziehen sich auf das Vollbild."""
    matches = find_all(screen, template, threshold, region, scale, limit=1)
    return matches[0] if matches else None


def find_all(
    screen: Image,
    template: Image,
    threshold: float = 0.85,
    region: Optional[Sequence[float]] = None,
    scale: float = 1.0,
    limit: int = 8,
) -> List[Match]:
    gray = screen.to_gray()
    tpl = template.to_gray()
    if scale != 1.0:
        tpl = tpl.box_scale(
            max(4, int(round(tpl.width * scale))), max(4, int(round(tpl.height * scale)))
        )
    if tpl.width > gray.width or tpl.height > gray.height:
        return []

    l, t, r, b = resolve_region(region, gray.width, gray.height)
    # Suchfenster: die Region plus Platz für das Template selbst.
    sub_l, sub_t = l, t
    sub_r = min(gray.width, r + tpl.width - 1)
    sub_b = min(gray.height, b + tpl.height - 1)
    # Deckt der Ausschnitt ohnehin das ganze Bild ab, KEINE Kopie anlegen.
    # crop() liefert sonst bei jeder Regel ein frisches Objekt - und damit ist
    # der Verkleinerungs-Puffer am Bild wertlos, weil er an einem Objekt haengt,
    # das gleich wieder weggeworfen wird. Gemessen kostet das Verkleinern des
    # Bildschirms 0.2 s; bei 29 Regeln also fast sechs Sekunden fuer immer
    # dasselbe Ergebnis.
    if sub_l == 0 and sub_t == 0 and sub_r == gray.width and sub_b == gray.height:
        sub = gray
    else:
        sub = gray.crop(sub_l, sub_t, sub_r - sub_l, sub_b - sub_t)
    if tpl.width > sub.width or tpl.height > sub.height:
        return []

    # Bei Mehrfach-Suche mehr Kandidaten vorschlagen, sonst fallen Treffer hinten runter.
    # ALLE Kandidaten verfeinern, erst dann sortieren und kuerzen. Vorher brach
    # die Schleife beim ersten Treffer ueber der Schwelle ab - bei limit=1 also
    # immer beim erstbesten Grob-Kandidaten. Der grobe Durchlauf rechnet aber
    # auf einem stark verkleinerten Bild; welcher Kandidat dort vorn liegt, sagt
    # wenig darueber, wo der beste Treffer wirklich sitzt. Das abschliessende
    # sort() war damit wirkungslos - es sortierte eine einelementige Liste.
    # KEIN Vorfilter auf den groben Wert - ausprobiert und wieder verworfen.
    #
    # Die Idee war: liegt schon der beste GROBE Wert weit unter allem, was je
    # ein Treffer war, spare man sich das teure Nachrechnen. Gemessen an 120
    # Vergleichen ueber zwei echte Bildschirme sah das sauber aus - echte
    # Treffer ab Grob-Wert 0.847, Fehlschlaege bis 0.839 - und eine Schranke
    # bei 0.55 schien reichlich Abstand zu haben.
    #
    # Fuenf bestehende Tests haben es widerlegt: bei einem Muster ohne grosse
    # Flaechen faellt der grobe Wert deutlich tiefer, obwohl der Treffer echt
    # ist. Der Vorfilter warf ihn weg. Ein stumm ausfallender Treffer ist der
    # teuerste Fehler in diesem Bot - er sieht von aussen aus wie "da war
    # nichts". Vier gesparte Zehntelsekunden wiegen das nicht auf.
    candidates = _coarse_candidates(sub, tpl, limit)
    gefunden: List[Match] = []
    for cx, cy, radius in candidates:
        best = _refine(sub, tpl, cx, cy, radius)
        if best is None or best[0] < threshold:
            continue
        score, x, y = best
        gefunden.append(Match(score, x + sub_l, y + sub_t, tpl.width, tpl.height))
        # Ein nahezu perfekter Treffer wird von keinem spaeteren Kandidaten
        # mehr geschlagen - dann lohnt das Weiterrechnen nicht. Gemessen kostet
        # das Verfeinern aller sechs Kandidaten 0.213 s gegenueber 0.035 s fuer
        # einen; bei einem eindeutigen Bild ist das reine Wartezeit.
        # ABSICHTLICH hoch angesetzt: in den mehrdeutigen Faellen, um die es bei
        # der Korrektur ging, liegen die Werte deutlich darunter, dort wird
        # weiterhin alles nachgerechnet.
        if len(gefunden) >= limit and score >= SICHER_GENUG:
            break

    gefunden.sort(key=lambda m: -m.score)
    results: List[Match] = []
    for m in gefunden:
        if any(_overlaps(m, o) for o in results):
            continue
        results.append(m)
        if len(results) >= limit:
            break
    return results


def _overlaps(a: Match, b: Match) -> bool:
    return (
        abs(a.x - b.x) < max(4, a.w // 2) and abs(a.y - b.y) < max(4, a.h // 2)
    )


# --------------------------------------------------------------- Grob-Durchlauf
def _coarse_candidates(sub: Image, tpl: Image, limit: int = 1,
                       mit_wert: bool = False):
    """Liste von (x, y, Suchradius) in Voll-Koordinaten des Suchfensters.

    Mit `mit_wert` zusaetzlich der beste Grob-Wert. Der taugt als Vorfilter:
    an 120 Vergleichen ueber zwei echte Bildschirme gemessen begannen ECHTE
    Treffer bei einem Grob-Wert von 0.847, waehrend Fehlschlaege bei 0.839
    endeten. Die Luecke ist real, aber viel zu schmal zum Draufsetzen - darum
    liegt die Schranke weit darunter (siehe GROB_AUSSICHTSLOS).
    """
    factor = min(1.0, COARSE_WIDTH / float(sub.width))
    # Template darf beim Verkleinern nicht verschwinden.
    # Nicht unter 14 px schrumpfen lassen: bei 6 px bleibt von einer kleinen
    # Vorlage im groben Durchlauf kein Muster mehr uebrig, und der richtige Ort
    # taucht in der Kandidatenliste gar nicht erst auf.
    factor = max(factor, 14.0 / max(4, min(tpl.width, tpl.height)))
    factor = min(1.0, factor)
    # KEINE Leiter fuer den Verkleinerungs-Faktor - ausprobiert und verworfen.
    # Die Idee war, die 20 verschiedenen Faktoren auf eine Handvoll Stufen
    # einzurasten, damit der Verkleinerungs-Puffer am Bild greift. Gemessen
    # brachte das nichts (6.70 s statt 6.58 s) UND es riss ein Loch: eine
    # Vorlage rastete von 0.70 auf 1.00 - damit greift der Zweig "gar nicht
    # verkleinern", und der Feinlauf durchsucht das VOLLE Bild. Ein Durchlauf
    # dauerte danach 124 Sekunden statt fuenf.
    if factor >= 0.95:
        leer = [(0, 0, max(sub.width, sub.height))]
        return (leer, 1.0) if mit_wert else leer

    csub = sub.box_scaled_by(factor)
    ctpl = tpl.box_scaled_by(factor)
    if ctpl.width < 2 or ctpl.height < 2 or ctpl.width > csub.width or ctpl.height > csub.height:
        leer = [(0, 0, max(sub.width, sub.height))]
        return (leer, 1.0) if mit_wert else leer

    wieviele = max(CANDIDATES, limit * 4)
    scores = _score_map(csub, ctpl, wieviele)
    if not scores:
        leer = [(0, 0, max(sub.width, sub.height))]
        return (leer, 1.0) if mit_wert else leer
    top = sorted(scores, key=lambda s: -s[0])[:wieviele]
    radius = int(math.ceil(1.0 / factor)) + 2
    liste = [(int(x / factor), int(y / factor), radius) for _, x, y in top]
    return (liste, top[0][0]) if mit_wert else liste


def _score_map(img: Image, tpl: Image, wieviele: int = CANDIDATES) -> List[Tuple[float, int, int]]:
    if HAVE_NUMPY:
        return _score_map_numpy(img, tpl, wieviele)
    return _score_map_python(img, tpl, wieviele)


def _score_map_numpy(img: Image, tpl: Image, wieviele: int = CANDIDATES):  # pragma: no cover - nur mit numpy
    """NCC-Karte über Integralbilder – Speicherbedarf bleibt bei O(Bildgrösse).

    (Ein Fenster-Stapel via sliding_window_view wäre hier hundertfach grösser.)
    """
    a = _np.frombuffer(bytes(img.data), dtype=_np.uint8).reshape(
        img.height, img.width
    ).astype(_np.float64)
    t = _np.frombuffer(bytes(tpl.data), dtype=_np.uint8).reshape(
        tpl.height, tpl.width
    ).astype(_np.float64)
    th, tw = tpl.height, tpl.width
    oh, ow = img.height - th + 1, img.width - tw + 1
    if oh < 1 or ow < 1:
        return []

    tc = t - t.mean()
    tden = float(_np.sqrt((tc * tc).sum()))
    if tden < 1e-6:
        return []

    ii = _np.zeros((img.height + 1, img.width + 1))
    ii[1:, 1:] = a.cumsum(0).cumsum(1)
    ii2 = _np.zeros((img.height + 1, img.width + 1))
    ii2[1:, 1:] = (a * a).cumsum(0).cumsum(1)

    def boxsum(integral):
        return (
            integral[th:, tw:]
            - integral[:oh, tw:]
            - integral[th:, :ow]
            + integral[:oh, :ow]
        )

    n = th * tw
    s = boxsum(ii)
    ss = boxsum(ii2)
    var = _np.maximum(ss - s * s / n, 1e-9)

    # Zähler: Summe(Bild * zentriertes Template) – tw*th kleine Array-Additionen.
    acc = _np.zeros((oh, ow))
    for j in range(th):
        row = tc[j]
        for i in range(tw):
            w = row[i]
            if w:
                acc += a[j : j + oh, i : i + ow] * w

    with _np.errstate(divide="ignore", invalid="ignore"):
        score = _np.nan_to_num(
            acc / (tden * _np.sqrt(var)), nan=-1.0, posinf=-1.0, neginf=-1.0
        )
    k = min(max(wieviele * 3, CANDIDATES * 4), score.size)
    idx = _np.argpartition(score.ravel(), -k)[-k:]
    ys, xs = _np.unravel_index(idx, score.shape)
    return [(float(score[y, x]), int(x), int(y)) for y, x in zip(ys, xs)]


def _score_map_python(img: Image, tpl: Image, wieviele: int = CANDIDATES):
    pts = _sample_points(tpl, MAX_SAMPLES)
    if pts is None:
        return []
    coords, values, mt, tden, n = pts
    data = img.data
    iw = img.width
    # Stichproben-Koordinaten in Byte-Offsets des *Bildes* umrechnen.
    offsets = [dy * iw + dx for dy, dx in coords]
    out = []
    for y in range(img.height - tpl.height + 1):
        base = y * iw
        for x in range(iw - tpl.width + 1):
            p = base + x
            s = 0
            ss = 0
            dot = 0
            for k in range(n):
                v = data[p + offsets[k]]
                s += v
                ss += v * v
                dot += v * values[k]
            var = ss - (s * s) / n
            if var <= 1e-6:
                continue
            score = (dot - s * mt) / (tden * math.sqrt(var))
            out.append((score, x, y))
    if not out:
        return []
    out.sort(key=lambda s: -s[0])
    return out[: max(wieviele * 3, CANDIDATES * 4)]


def _sample_points(tpl: Image, budget: int):
    """((dy,dx)-Koordinaten, Werte, Mittelwert, Nenner, Anzahl) einer Template-Stichprobe."""
    total = tpl.width * tpl.height
    step = max(1, int(math.ceil(total / float(budget))))
    coords: List[Tuple[int, int]] = []
    values: List[int] = []
    idx = 0
    for y in range(tpl.height):
        for x in range(tpl.width):
            if idx % step == 0:
                coords.append((y, x))
                values.append(tpl.data[y * tpl.width + x])
            idx += 1
    if len(values) < 4:
        return None
    n = len(values)
    mean = sum(values) / n
    den = math.sqrt(sum((v - mean) ** 2 for v in values))
    if den < 1e-6:
        return None
    return coords, values, mean, den, n


# ---------------------------------------------------------------- Fein-Prüfung
REFINE_SAMPLES = 400  # Stichprobe für die Fein-Prüfung ohne numpy


def _refine(sub: Image, tpl: Image, cx: int, cy: int, radius: int):
    max_x = sub.width - tpl.width
    max_y = sub.height - tpl.height
    if max_x < 0 or max_y < 0:
        return None
    x0 = max(0, min(cx - radius, max_x))
    x1 = max(0, min(cx + radius, max_x))
    y0 = max(0, min(cy - radius, max_y))
    y1 = max(0, min(cy + radius, max_y))
    if HAVE_NUMPY:
        return _refine_numpy(sub, tpl, x0, x1, y0, y1)
    return _refine_python(sub, tpl, x0, x1, y0, y1)


def _refine_numpy(sub: Image, tpl: Image, x0, x1, y0, y1):  # pragma: no cover - nur mit numpy
    a = _np.frombuffer(bytes(sub.data), dtype=_np.uint8).reshape(sub.height, sub.width)
    t = _np.frombuffer(bytes(tpl.data), dtype=_np.uint8).reshape(tpl.height, tpl.width)
    tf = t.astype(_np.float32).ravel()
    tstd = float(tf.std())
    if tstd < 1e-6:
        return None
    tnorm = (tf - tf.mean()) / tstd
    th, tw = tpl.height, tpl.width
    best = None
    for y in range(y0, y1 + 1):  # zeilenweise – begrenzt den Speicherbedarf
        strip = a[y : y + th, x0 : x1 + tw]
        if strip.shape[0] < th:
            continue
        win = _np.lib.stride_tricks.sliding_window_view(strip, (th, tw))[0]
        flat = win.reshape(win.shape[0], -1).astype(_np.float32)
        mean = flat.mean(axis=1, keepdims=True)
        std = flat.std(axis=1)
        num = ((flat - mean) * tnorm).sum(axis=1)
        with _np.errstate(divide="ignore", invalid="ignore"):
            score = _np.nan_to_num(num / (std * tf.size), nan=-1.0, posinf=-1.0, neginf=-1.0)
        idx = int(score.argmax())
        if best is None or score[idx] > best[0]:
            best = (float(score[idx]), x0 + idx, y)
    return best


def _refine_python(sub: Image, tpl: Image, x0, x1, y0, y1):
    """Ohne numpy: Stichprobe statt aller Template-Pixel – sonst dauert es ewig."""
    pts = _sample_points(tpl, REFINE_SAMPLES)
    if pts is None:
        return None
    coords, values, tmean, tden, n = pts
    iw = sub.width
    offsets = [dy * iw + dx for dy, dx in coords]
    idata = sub.data
    best = None
    for y in range(y0, y1 + 1):
        row = y * iw
        for x in range(x0, x1 + 1):
            p = row + x
            s = 0
            ss = 0
            dot = 0
            for k in range(n):
                v = idata[p + offsets[k]]
                s += v
                ss += v * v
                dot += v * values[k]
            var = ss - (s * s) / n
            if var <= 1e-6:
                continue
            score = (dot - s * tmean) / (tden * math.sqrt(var))
            if best is None or score > best[0]:
                best = (score, x, y)
    return best


# ------------------------------------------------------------------ Pixel-Test
def pixel_matches(screen: Image, x: int, y: int, rgb: Sequence[int], tolerance: int = 20) -> bool:
    """Prüft eine einzelne Bildstelle auf eine Farbe (x/y relativ oder absolut)."""
    px = int(round(x * screen.width)) if abs(x) <= 1.0 else int(x)
    py = int(round(y * screen.height)) if abs(y) <= 1.0 else int(y)
    px = max(0, min(px, screen.width - 1))
    py = max(0, min(py, screen.height - 1))
    got = screen.pixel(px, py)
    if isinstance(got, int):
        got = (got, got, got)
    return all(abs(a - b) <= tolerance for a, b in zip(got, rgb))


# --------------------------------------------------- Knopf-Suche ueber Farbe
def find_color_button(
    screen: Image,
    rgb: Sequence[int],
    tolerance: int = 45,
    min_w: float = 0.12,
    max_w: float = 0.8,
    min_h: float = 0.015,
    max_h: float = 0.06,
    region: Optional[Sequence[float]] = None,
    min_fuellung: float = 0.6,
    limit: int = 4,
) -> List[Match]:
    """Findet farbige Knopf-Flaechen, ohne ein Template zu kennen.

    Gedacht fuer Knoepfe, deren Beschriftung wechselt ("Abholen", "Sammeln",
    "Bestaetigen" sind alle derselbe gruene Knopf). Sucht waagrechte Baender
    passender Farbe und darin zusammenhaengende Spalten – Knoepfe sind
    achsenparallele Rechtecke, dafuer reicht das und es ist schnell.
    """
    l, t, r, b = resolve_region(region, screen.width, screen.height)
    w_min = int(min_w * screen.width) if min_w <= 1 else int(min_w)
    w_max = int(max_w * screen.width) if max_w <= 1 else int(max_w)
    h_min = int(min_h * screen.height) if min_h <= 1 else int(min_h)
    h_max = int(max_h * screen.height) if max_h <= 1 else int(max_h)
    if w_min < 4 or h_min < 3:
        return []

    maske = _farb_maske(screen, rgb, tolerance, (l, t, r, b))
    if maske is None:
        return []
    zeilen, breite = maske
    treffer: List[Match] = []
    for x0, y0, x1, y1, gefuellt in _flaechen(zeilen, breite, max(4, int(w_min * 0.05))):
        bw, bh = x1 - x0, y1 - y0
        if not (w_min <= bw <= w_max and h_min <= bh <= h_max):
            continue
        fuellung = gefuellt / float(bw * bh)
        if fuellung < min_fuellung:
            continue
        treffer.append(Match(fuellung, l + x0, t + y0, bw, bh))
    treffer.sort(key=lambda m: (-m.score, -m.w * m.h))
    return treffer[:limit]


def _flaechen(zeilen, breite: int, min_lauf: int):
    """Zusammenhaengende Farbflaechen ueber Lauflaengen-Verbund.

    Pro Zeile die waagrechten Laeufe bestimmen und Laeufe benachbarter Zeilen
    verbinden, wenn sie sich in x ueberlappen. Damit bleiben zwei Knoepfe auf
    gleicher Hoehe getrennt – eine reine Zeilen-Projektion verklebt sie.

    `min_lauf` muss klein bleiben: durch die Knopfmitte laeuft weisse Schrift,
    dort zerfaellt die Zeile in kurze Stuecke. Filtert man die weg, reisst der
    Knopf in zwei Haelften.
    """
    eltern: List[int] = []

    def wurzel(i: int) -> int:
        while eltern[i] != i:
            eltern[i] = eltern[eltern[i]]
            i = eltern[i]
        return i

    def verbinde(a: int, b: int) -> None:
        ra, rb = wurzel(a), wurzel(b)
        if ra != rb:
            eltern[rb] = ra

    laeufe: List[Tuple[int, int, int, int]] = []  # (x0, x1, y, id)
    vorige: List[int] = []
    for y, reihe in enumerate(zeilen):
        aktuelle: List[int] = []
        x = 0
        while x < breite:
            if not reihe[x]:
                x += 1
                continue
            x0 = x
            while x < breite and reihe[x]:
                x += 1
            if x - x0 < min_lauf:
                continue
            idx = len(laeufe)
            laeufe.append((x0, x, y, idx))
            eltern.append(idx)
            for j in vorige:
                if laeufe[j][0] < x and x0 < laeufe[j][1]:
                    verbinde(j, idx)
            aktuelle.append(idx)
        vorige = aktuelle

    kisten = {}
    for x0, x1, y, idx in laeufe:
        w = wurzel(idx)
        k = kisten.get(w)
        if k is None:
            kisten[w] = [x0, y, x1, y + 1, x1 - x0]
        else:
            k[0] = min(k[0], x0)
            k[1] = min(k[1], y)
            k[2] = max(k[2], x1)
            k[3] = max(k[3], y + 1)
            k[4] += x1 - x0
    for k in kisten.values():
        yield (k[0], k[1], k[2], k[3], k[4])


def _farb_maske(screen: Image, rgb, tolerance: int, box):
    l, t, r, b = box
    if r - l < 4 or b - t < 4:
        return None
    aus = screen.crop(l, t, r - l, b - t)
    if aus.mode != "RGB":
        return None
    breite, hoehe = aus.width, aus.height
    if HAVE_NUMPY:
        a = _np.frombuffer(bytes(aus.data), dtype=_np.uint8).reshape(hoehe, breite, 3).astype(_np.int16)
        ziel = _np.array(rgb[:3], dtype=_np.int16)
        m = (_np.abs(a - ziel).max(axis=2) <= tolerance).astype(_np.uint8)
        return [row.tolist() for row in m], breite
    data = aus.data
    zeilen = []
    for y in range(hoehe):
        base = y * breite * 3
        reihe = [0] * breite
        for x in range(breite):
            p = base + x * 3
            if (
                abs(data[p] - rgb[0]) <= tolerance
                and abs(data[p + 1] - rgb[1]) <= tolerance
                and abs(data[p + 2] - rgb[2]) <= tolerance
            ):
                reihe[x] = 1
        zeilen.append(reihe)
    return zeilen, breite


def best_score(
    screen: Image,
    template: Image,
    region: Optional[Sequence[float]] = None,
    scale: float = 1.0,
) -> Optional[Match]:
    """Bester Treffer ohne Schwelle – Grundlage fuers Lernen."""
    hits = find_all(screen, template, threshold=-1.0, region=region, scale=scale, limit=1)
    return hits[0] if hits else None
