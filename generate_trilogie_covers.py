"""
Premium-Buchcover-Generator fuer die Drama-Trilogie "Das Tal haelt den Atem an".

Erzeugt hochkant-Cover (1600x2560) je Band + Gesamtausgabe, gezeichnet mit Pillow,
voll deterministisch (Seed je Band -> git-stabil) und ohne externe Aufrufe:

  Nachthimmel mit Sternen, ein Mond mit Glanz, gestaffelte Bergketten, eine
  Nebelbank, eine Wasserlinie mit Ripples - und die Silhouette der versunkenen
  Kapelle (Dachreiter + Kreuz) mit Spiegelung und Mondpfad. Feines Korn ueber
  allem. Pro Band eine eigene Stimmung (Akzentfarbe).

Schreibt nach img/covers/<slug>-band-0N.png und <slug>-gesamt.png. Die Cover
werden ins EPUB/PDF eingebettet (buch_bauen.py / buch_pdf.py) und auf
trilogie.html gezeigt.

Run:  python3 generate_trilogie_covers.py
Dep:  pip install pillow
"""
import glob
import json
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
BIBEL = os.path.join(ROOT, "ki-schriftsteller", "roman-drama-trilogie.json")
OUT = os.path.join(ROOT, "img", "covers")

W, H = 1600, 2560

CREAM = (250, 243, 228)
MUTED = (158, 168, 180)


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


def _vgrad(top, bottom, y0, y1):
    """Vertikaler Verlauf als eigenes Bild (y0..y1 des Gesamtbildes)."""
    img = Image.new("RGB", (W, y1 - y0))
    px = img.load()
    h = max(1, y1 - y0 - 1)
    for y in range(y1 - y0):
        c = _lerp(top, bottom, y / h)
        for x in range(W):
            px[x, y] = c
    return img


def _grain(seed, alpha=12):
    """Feines Korn: kleines Rauschbild, hochskaliert, leicht ueberlagert."""
    r = random.Random(seed)
    small = Image.new("L", (W // 3, H // 3))
    sp = small.load()
    for y in range(small.height):
        for x in range(small.width):
            sp[x, y] = r.randint(100, 155)
    big = small.resize((W, H), Image.BILINEAR)
    layer = Image.new("RGBA", (W, H))
    lp = layer.load()
    gp = big.load()
    for y in range(0, H, 1):
        for x in range(0, W, 1):
            v = gp[x, y]
            lp[x, y] = (v, v, v, alpha)
    return layer


def _ridge(draw, y_base, amp, color, seed, step=80):
    """Eine gezackte Bergkette als gefuelltes Polygon ueber die Breite."""
    r = random.Random(seed)
    pts = [(-20, H)]
    x = -20
    y = y_base
    pts.append((x, y))
    while x < W + 20:
        x += step
        y = y_base + r.randint(-amp, amp)
        pts.append((x, y))
    pts.append((W + 20, H))
    draw.polygon(pts, fill=color)


def cover(slug, sky_top, sky_bot, accent, band_label, band_title, epoch, seed):
    r = random.Random(seed)
    waterline = int(H * 0.66)

    # --- Himmel + Wasser als Basis ---
    base = Image.new("RGB", (W, H), sky_bot)
    base.paste(_vgrad(sky_top, sky_bot, 0, waterline), (0, 0))
    water_top = _lerp(sky_bot, (5, 7, 12), 0.4)
    base.paste(_vgrad(water_top, (4, 6, 10), waterline, H), (0, waterline))
    d = ImageDraw.Draw(base, "RGBA")

    # --- Sterne (oberer Himmel) ---
    for _ in range(130):
        x = r.randint(0, W)
        y = r.randint(0, int(waterline * 0.7))
        s = r.choice([1, 1, 1, 2])
        a = r.randint(40, 150)
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 245, a))

    # --- Mond mit Glanz (oben rechts) ---
    mx, my, mr = int(W * 0.72), int(H * 0.17), 78
    glow = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(glow)
    for i in range(26, 0, -1):
        a = int(7 * (i / 26.0))
        gd.ellipse([mx - mr - i * 9, my - mr - i * 9, mx + mr + i * 9, my + mr + i * 9],
                   fill=accent + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=CREAM)
    d.ellipse([mx - mr + 22, my - mr - 8, mx + mr + 22, my + mr - 8], fill=sky_top + (235,))

    # --- Bergketten (gestaffelt, hinten heller) ---
    _ridge(d, int(waterline * 0.74), 70, _lerp(sky_bot, sky_top, 0.45) + (255,), seed + 1, 120)
    _ridge(d, int(waterline * 0.86), 95, _lerp(sky_bot, (8, 11, 17), 0.5) + (255,), seed + 2, 95)
    _ridge(d, int(waterline * 0.97), 60, (7, 9, 14, 255), seed + 3, 70)

    # --- Nebelbank am Fuss der Berge ---
    fog = Image.new("RGBA", (W, H))
    fd = ImageDraw.Draw(fog)
    f0 = int(waterline * 0.80)
    for y in range(f0, waterline):
        a = int(60 * (1 - abs((y - (f0 + waterline) / 2) / ((waterline - f0) / 2))))
        fd.line([(0, y), (W, y)], fill=_lerp(sky_top, CREAM, 0.3) + (max(0, a),))
    fog = fog.filter(ImageFilter.GaussianBlur(6))
    base = Image.alpha_composite(base.convert("RGBA"), fog).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- Wasserlinie + Mondpfad + Ripples ---
    d.line([(120, waterline), (W - 120, waterline)], fill=(90, 104, 120, 180), width=2)
    for i in range(40):
        yy = waterline + 8 + int(i * (H - waterline - 40) / 40.0)
        a = max(0, 70 - i)
        half = int((W * 0.4) * (1 - i / 44.0))
        d.line([(W / 2 - half, yy), (W / 2 + half, yy)], fill=(80, 92, 108, a), width=1)
    # Mondpfad (heller Streifen unter dem Mond)
    for i in range(0, H - waterline, 6):
        a = max(0, 38 - i // 8)
        d.line([(mx - 26, waterline + i), (mx + 26, waterline + i)], fill=accent + (a,))

    # --- Kapelle (Dachreiter + Kreuz) auf der Wasserlinie, mit Spiegelung ---
    cx = W / 2
    sil = (5, 7, 11)
    tw, th = 48, 156
    top = waterline - th
    d.rectangle([cx - tw / 2, top + 42, cx + tw / 2, waterline], fill=sil)
    d.polygon([(cx - tw / 2 - 7, top + 42), (cx + tw / 2 + 7, top + 42), (cx, top - 20)], fill=sil)
    d.rectangle([cx - 4, top - 74, cx + 4, top - 6], fill=accent)
    d.rectangle([cx - 24, top - 56, cx + 24, top - 47], fill=accent)
    refl = _lerp(sil, water_top, 0.5)
    d.rectangle([cx - tw / 2, waterline, cx + tw / 2, waterline + th * 0.55], fill=refl + (170,))
    d.polygon([(cx - tw / 2 - 7, waterline), (cx + tw / 2 + 7, waterline), (cx, waterline + 16)],
              fill=refl + (170,))

    # --- Korn ---
    base = Image.alpha_composite(base.convert("RGBA"), _grain(seed, 10)).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- Typografie ---
    y = 150
    _center(d, y, band_label.upper(), font(33, "regular"), accent, tracking=14)
    d.line([(W / 2 - 64, y + 58), (W / 2 + 64, y + 58)], fill=accent, width=2)
    _center(d, y + 82, band_title, font(56, "bold"), CREAM)
    if epoch:
        _center(d, y + 160, epoch, font(33, "italic"), MUTED)

    tf = font(118, "bold")
    lines = _wrap(d, "Das Tal hält den Atem an", tf, W - 250)
    ty = 690 - (len(lines) - 1) * 64
    for ln in lines:
        # leichter Schatten fuer Tiefe
        _center(d, ty + 3, ln, tf, (0, 0, 0, 150))
        _center(d, ty, ln, tf, _lerp(accent, CREAM, 0.35))
        ty += 138
    _center(d, ty + 14, "Ein Generationendrama", font(46, "italic"), CREAM)

    _center(d, H - 250, "aban news", font(46, "bold"), CREAM)
    d.line([(W / 2 - 90, H - 188), (W / 2 + 90, H - 188)], fill=accent, width=1)
    _center(d, H - 168, "Roman · geschrieben mit Claude Opus", font(29, "regular"), MUTED)

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "%s.jpg" % slug)
    base.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    print("✓ %s (%d KB)" % (os.path.relpath(path, ROOT), os.path.getsize(path) // 1024))


def build():
    bibel = json.load(open(BIBEL, encoding="utf-8"))
    base = "das-tal-haelt-den-atem-an"
    labels = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}
    # Pro Band eigene Himmel-/Akzent-Stimmung.
    stimmung = {
        1: ((26, 32, 50), (10, 12, 20), (214, 150, 70)),    # 1962: kuehle Daemmerung, warmer Akzent
        2: ((38, 30, 40), (14, 10, 14), (224, 122, 60)),    # 1991: Abendrot
        3: ((20, 30, 44), (8, 11, 18), (150, 186, 214)),    # heute: klar, kalt
    }
    for b in bibel["baende"]:
        n = b["nummer"]
        st, sb, ac = stimmung.get(n, ((24, 30, 46), (10, 12, 20), (214, 150, 70)))
        cover("%s-band-%02d" % (base, n), st, sb, ac, labels.get(n, "Band %d" % n),
              b["titel"], b.get("untertitel", ""), seed=1000 + n)
    cover("%s-gesamt" % base, (24, 30, 48), (9, 11, 19), (214, 150, 70),
          "Die Trilogie", "Drei Bände", "Riedmatt · 1961 bis heute", seed=2000)


if __name__ == "__main__":
    build()
