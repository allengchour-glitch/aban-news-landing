"""
Premium-Buchcover-Generator fuer die Nordsee-Saga "Marsch" / "The Reclaimed Land".

Erzeugt hochkant-Cover (1600x2560) je Band + Gesamtausgabe, gezeichnet mit Pillow,
voll deterministisch (Seed je Band -> git-stabil), ohne externe Aufrufe:

  Weiter Kuestenhimmel mit Gradient, eine flache Marsch-Silhouette mit Deichlinie,
  ein einzelnes Siel/Sieltor, Priele im Watt als helle Adern, ein Schwarm
  Watvoegel, Wasserspiegelung und feines Korn. Pro Band eine eigene Stimmung:
  Band 1 (1901-18) kuehles Morgengrau, Band 2 (1934-53) stuermisches Abendrot,
  Band 3 (Gegenwart) klares, kaltes Watt-Licht.

Schreibt nach img/covers/marsch-band-0N.jpg / marsch-gesamt.jpg (DE) und
the-reclaimed-land-*.jpg (EN). Eingebettet ins EPUB/PDF (buch_bauen/buch_pdf).

Run:  python3 generate_marsch_covers.py          (DE+EN)
      python3 generate_marsch_covers.py --en      (nur EN)
Dep:  pip install pillow
"""
import glob
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
BIBEL = os.path.join(ROOT, "ki-schriftsteller", "roman-marsch.json")
OUT = os.path.join(ROOT, "img", "covers")

W, H = 1600, 2560
CREAM = (250, 243, 228)
MUTED = (150, 158, 168)


def font(size, kind="bold"):
    serif = {
        "bold": ["DejaVuSerif-Bold.ttf", "LiberationSerif-Bold.ttf"],
        "regular": ["DejaVuSerif.ttf", "LiberationSerif-Regular.ttf"],
        "italic": ["DejaVuSerif-Italic.ttf", "LiberationSerif-Italic.ttf"],
    }[kind]
    sans = {"bold": "DejaVuSans-Bold.ttf", "regular": "DejaVuSans.ttf",
            "italic": "DejaVuSans-Oblique.ttf"}[kind]
    cands = []
    for n in serif + [sans]:
        cands += glob.glob("/usr/share/fonts/**/%s" % n, recursive=True)
    for c in cands:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _w(d, t, f):
    b = d.textbbox((0, 0), t, font=f)
    return b[2] - b[0]


def _center(d, y, t, f, fill, tracking=0):
    if tracking:
        total = sum(_w(d, ch, f) + tracking for ch in t) - tracking
        x = (W - total) / 2
        for ch in t:
            d.text((x, y), ch, font=f, fill=fill)
            x += _w(d, ch, f) + tracking
    else:
        d.text(((W - _w(d, t, f)) / 2, y), t, font=f, fill=fill)


def _wrap(d, t, f, maxw):
    words, lines, cur = t.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if _w(d, test, f) <= maxw:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _vgrad(top, bot, y0, y1):
    h = max(1, y1 - y0)
    img = Image.new("RGB", (W, h))
    px = img.load()
    for y in range(h):
        c = _lerp(top, bot, y / h)
        for x in range(W):
            px[x, y] = c
    return img


def _grain(seed, strength=11):
    r = random.Random(seed)
    g = Image.new("L", (W // 2, H // 2))
    g.putdata([r.randint(128 - strength, 128 + strength) for _ in range((W // 2) * (H // 2))])
    g = g.resize((W, H))
    return Image.merge("RGBA", (g, g, g, Image.new("L", (W, H), 26)))


def cover(slug, sky_top, sky_bot, accent, band_label, band_title, epoch, seed,
          main_title="Marsch", series_subtitle="Eine Nordsee-Saga",
          colophon="Roman · geschrieben mit Claude Opus"):
    r = random.Random(seed)
    horizon = int(H * 0.62)          # sehr tiefer Horizont, viel Himmel = Weite der Marsch

    # --- Himmel ---
    base = Image.new("RGB", (W, H), sky_bot)
    base.paste(_vgrad(sky_top, sky_bot, 0, horizon), (0, 0))
    # Wasser/Watt unter dem Horizont
    water_top = _lerp(sky_bot, (8, 12, 16), 0.5)
    base.paste(_vgrad(water_top, (5, 8, 11), horizon, H), (0, horizon))
    d = ImageDraw.Draw(base, "RGBA")

    # --- tiefe Sonne / Lichtbank am Horizont ---
    sx, sy = int(W * 0.5), horizon
    glow = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(glow)
    for i in range(48, 0, -1):
        a = int(5 * (i / 48.0))
        rr = i * 22
        gd.ellipse([sx - rr * 1.6, sy - rr, sx + rr * 1.6, sy + rr], fill=accent + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(24))
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- Wolkenbaender (waagerecht, weit) ---
    for _ in range(7):
        cy = r.randint(int(H * 0.10), int(horizon * 0.85))
        cw = r.randint(int(W * 0.4), int(W * 0.95))
        cx = r.randint(-100, W)
        ch = r.randint(14, 40)
        a = r.randint(20, 55)
        cl = Image.new("RGBA", (W, H))
        cd = ImageDraw.Draw(cl)
        cd.ellipse([cx, cy, cx + cw, cy + ch], fill=_lerp(sky_top, CREAM, 0.4) + (a,))
        cl = cl.filter(ImageFilter.GaussianBlur(18))
        base = Image.alpha_composite(base.convert("RGBA"), cl).convert("RGB")
        d = ImageDraw.Draw(base, "RGBA")

    # --- Spiegelung der Sonne im Watt ---
    for yy in range(horizon, H, 6):
        a = max(0, 40 - (yy - horizon) // 8)
        ww = int(120 - (yy - horizon) * 0.05)
        d.line([(sx - ww, yy), (sx + ww, yy)], fill=accent + (a,), width=3)

    # --- Deichlinie + flache Marsch-Silhouette ---
    sil = (10, 16, 14)
    dl = int(horizon - 6)
    # leicht geschwungener Deich
    pts = [(0, dl)]
    for x in range(0, W + 1, 40):
        y = dl - int(18 * math.sin(x / W * math.pi))
        pts.append((x, y))
    pts += [(W, horizon + 80), (0, horizon + 80)]
    d.polygon(pts, fill=sil)

    # --- Priele im Watt (helle, verzweigte Adern) ---
    for _ in range(3):
        x = r.randint(int(W * 0.2), int(W * 0.8))
        y = H - 10
        pri = Image.new("RGBA", (W, H))
        pd = ImageDraw.Draw(pri)
        while y > horizon + 30:
            nx = x + r.randint(-30, 30)
            ny = y - r.randint(20, 45)
            pd.line([(x, y), (nx, ny)], fill=_lerp(water_top, accent, 0.4) + (60,),
                    width=max(1, int((y - horizon) / 120)))
            x, y = nx, ny
        pri = pri.filter(ImageFilter.GaussianBlur(2))
        base = Image.alpha_composite(base.convert("RGBA"), pri).convert("RGB")
        d = ImageDraw.Draw(base, "RGBA")

    # --- ein einzelnes Siel/Sieltor auf dem Deich, leicht rechts ---
    tx = int(W * 0.60)
    d.rectangle([tx - 26, dl - 70, tx + 26, dl], fill=(6, 10, 9))
    d.polygon([(tx - 34, dl - 70), (tx + 34, dl - 70), (tx, dl - 104)], fill=(6, 10, 9))
    # kleines Licht im Sieltor
    d.rectangle([tx - 8, dl - 46, tx + 8, dl - 20], fill=accent + (210,))

    # --- Schwarm Watvoegel (kleine V/Striche am Himmel) ---
    for _ in range(22):
        bx = r.randint(int(W * 0.15), int(W * 0.7))
        by = r.randint(int(H * 0.16), int(H * 0.34))
        s = r.choice([5, 6, 8])
        d.line([(bx - s, by), (bx, by - s // 2)], fill=(20, 24, 28, 180), width=2)
        d.line([(bx, by - s // 2), (bx + s, by)], fill=(20, 24, 28, 180), width=2)

    # --- Korn ---
    base = Image.alpha_composite(base.convert("RGBA"), _grain(seed, 11)).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- Typografie ---
    y = 150
    _center(d, y, band_label.upper(), font(33, "regular"), accent, tracking=14)
    d.line([(W / 2 - 64, y + 58), (W / 2 + 64, y + 58)], fill=accent, width=2)
    _center(d, y + 82, band_title, font(56, "bold"), CREAM)
    if epoch:
        _center(d, y + 160, epoch, font(33, "italic"), MUTED)

    tf = font(150, "bold")
    lines = _wrap(d, main_title, tf, W - 240)
    ty = 600 - (len(lines) - 1) * 70
    for ln in lines:
        _center(d, ty + 3, ln, tf, (0, 0, 0, 150))
        _center(d, ty, ln, tf, _lerp(accent, CREAM, 0.42))
        ty += 168
    _center(d, ty + 10, series_subtitle, font(44, "italic"), CREAM)

    _center(d, H - 250, "aban news", font(46, "bold"), CREAM)
    d.line([(W / 2 - 90, H - 188), (W / 2 + 90, H - 188)], fill=accent, width=1)
    _center(d, H - 168, colophon, font(29, "regular"), MUTED)

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "%s.jpg" % slug)
    base.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    print("OK %s (%d KB)" % (os.path.relpath(path, ROOT), os.path.getsize(path) // 1024))


# Pro Band eigene Stimmung: (Himmel oben, Himmel unten, Akzent)
STIMMUNG = {
    1: ((92, 104, 116), (150, 150, 140), (210, 180, 120)),   # 1901-18: kuehles, weites Morgengrau
    2: ((74, 48, 44), (150, 96, 70), (224, 130, 80)),        # 1934-53: stuermisches Abendrot
    3: ((120, 140, 156), (176, 188, 188), (150, 186, 200)),  # heute: klares, kaltes Watt-Licht
}
LABELS_DE = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}
LABELS_EN = {1: "Volume One", 2: "Volume Two", 3: "Volume Three"}


def build_de():
    bibel = json.load(open(BIBEL, encoding="utf-8"))
    base = "marsch"
    for b in bibel["baende"]:
        n = b["nummer"]
        st, sb, ac = STIMMUNG.get(n, STIMMUNG[1])
        cover("%s-band-%02d" % (base, n), st, sb, ac, LABELS_DE.get(n, "Band %d" % n),
              b["titel"], b.get("untertitel", ""), seed=4100 + n)
    cover("%s-gesamt" % base, (96, 110, 120), (158, 162, 150), (210, 180, 120),
          "Die Trilogie", "Drei Bände", "Sankt Annen · 1901 bis heute", seed=4200)


def build_en():
    base = "the-reclaimed-land"
    en_titles = {1: "Reclaiming the Land", 2: "Storm Tide", 3: "Depoldering"}
    en_epoch = {1: "Sankt Annen, 1901–1918", 2: "Sankt Annen, 1934–1953", 3: "Sankt Annen, present day"}
    for n in (1, 2, 3):
        st, sb, ac = STIMMUNG[n]
        cover("%s-band-%02d" % (base, n), st, sb, ac, LABELS_EN[n],
              en_titles[n], en_epoch[n], seed=4100 + n,
              main_title="The Reclaimed Land", series_subtitle="A North Sea Saga",
              colophon="Novel · written with Claude Opus")
    cover("%s-gesamt" % base, (96, 110, 120), (158, 162, 150), (210, 180, 120),
          "The Trilogy", "Three Volumes", "Sankt Annen · 1901 to today", seed=4200,
          main_title="The Reclaimed Land", series_subtitle="A North Sea Saga",
          colophon="Novel · written with Claude Opus")


if __name__ == "__main__":
    import sys
    if "--en" in sys.argv:
        build_en()
    elif "--de" in sys.argv:
        build_de()
    else:
        build_de()
        build_en()
