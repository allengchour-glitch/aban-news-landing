"""
Premium-Buchcover-Generator fuer die Ruhrgebiet-Saga "Schicht".

Erzeugt hochkant-Cover (1600x2560) je Band + Gesamtausgabe, gezeichnet mit Pillow,
voll deterministisch (Seed je Band -> git-stabil), ohne externe Aufrufe:

  Verrauchter Industriehimmel mit Gradient, ferne Schlote und eine Halde,
  Dunst/Smog-Bank, und die Silhouette eines Foerderturms (Doppelbock mit
  Seilscheiben) ueber dem Zechengelaende, mit erleuchteten Fenstern der
  Maschinenhalle und feinem Russ-Korn. Pro Band eine eigene Stimmung:
  Band 1 (1905-23) kohlestaubiges Morgengrau/Amber, Band 2 (1929-48) Abendrot/Feuer,
  Band 3 (1962-89) kaltes Stahlblau der Daemmerung.

Schreibt nach img/covers/schicht-band-0N.jpg und schicht-gesamt.jpg. Die Cover
werden ins EPUB/PDF eingebettet (buch_bauen.py / buch_pdf.py).

Run:  python3 generate_schicht_covers.py
Dep:  pip install pillow
"""
import glob
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
BIBEL = os.path.join(ROOT, "ki-schriftsteller", "roman-schicht.json")
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


def _halde(d, base_y, peak_y, col, x0, x1):
    """Eine begrünte/kahle Halde (Abraumberg) als weiche Silhouette."""
    pts = [(x0, base_y)]
    span = x1 - x0
    steps = 14
    for i in range(steps + 1):
        x = x0 + span * i / steps
        t = i / steps
        # zwei ueberlagerte Boegen fuer eine glaubwuerdige Haldenform
        y = base_y - (peak_y) * (math.sin(t * math.pi) ** 1.3)
        pts.append((x, y))
    pts.append((x1, base_y))
    d.polygon(pts, fill=col)


def cover(slug, sky_top, sky_bot, accent, band_label, band_title, epoch, seed,
          main_title="Schicht", series_subtitle="Eine Ruhrgebiet-Saga",
          colophon="Roman · geschrieben mit Claude Opus"):
    r = random.Random(seed)
    ground = int(H * 0.70)

    # --- Himmel als Basis ---
    base = Image.new("RGB", (W, H), sky_bot)
    base.paste(_vgrad(sky_top, sky_bot, 0, ground), (0, 0))
    base.paste(_vgrad(sky_bot, _lerp(sky_bot, (6, 6, 8), 0.6), ground, H), (0, ground))
    d = ImageDraw.Draw(base, "RGBA")

    # --- diffuse Lichtquelle (tief stehende Sonne/Smog-Glut) ---
    sx, sy = int(W * 0.30), int(H * 0.30)
    glow = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(glow)
    for i in range(40, 0, -1):
        a = int(5 * (i / 40.0))
        rr = i * 26
        gd.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=accent + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(20))
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- ferne Halde rechts ---
    _halde(d, ground, int(H * 0.16), _lerp(sky_bot, (10, 14, 12), 0.5) + (255,),
           int(W * 0.42), int(W * 1.05))
    # --- ferne Schlote/Schornsteine ---
    for _ in range(5):
        cx = r.randint(int(W * 0.05), int(W * 0.95))
        ch = r.randint(int(H * 0.10), int(H * 0.20))
        cw = r.randint(10, 20)
        col = _lerp(sky_bot, (8, 8, 10), 0.55) + (255,)
        d.rectangle([cx, ground - ch, cx + cw, ground], fill=col)
        # duenne Rauchfahne
        smoke = Image.new("RGBA", (W, H))
        sd = ImageDraw.Draw(smoke)
        for k in range(18):
            yy = ground - ch - k * 22
            off = int(math.sin(k * 0.6 + cx) * 26) + k * 4
            a = max(0, 40 - k * 2)
            sd.ellipse([cx + off - 18, yy - 14, cx + off + 28, yy + 14],
                       fill=_lerp(sky_top, CREAM, 0.2) + (a,))
        smoke = smoke.filter(ImageFilter.GaussianBlur(7))
        base = Image.alpha_composite(base.convert("RGBA"), smoke).convert("RGB")
        d = ImageDraw.Draw(base, "RGBA")

    # --- Dunst-/Smogbank am Boden ---
    fog = Image.new("RGBA", (W, H))
    fd = ImageDraw.Draw(fog)
    f0 = int(ground * 0.86)
    for y in range(f0, ground + 60):
        a = int(70 * (1 - abs((y - (f0 + ground) / 2) / ((ground - f0) / 2 + 1))))
        fd.line([(0, y), (W, y)], fill=_lerp(sky_top, CREAM, 0.25) + (max(0, a),))
    fog = fog.filter(ImageFilter.GaussianBlur(9))
    base = Image.alpha_composite(base.convert("RGBA"), fog).convert("RGB")
    d = ImageDraw.Draw(base, "RGBA")

    # --- Foerderturm (Doppelbock) als Hauptmotiv, leicht links der Mitte ---
    sil = (6, 7, 10)
    cx = int(W * 0.52)
    top = int(H * 0.30)            # Hoehe der Seilscheiben
    base_y = ground + 30
    # Maschinenhaus / Sockel
    d.rectangle([cx - 150, base_y - 150, cx + 150, base_y], fill=sil)
    # erleuchtete Fenster der Halle
    for fx in range(cx - 130, cx + 120, 46):
        for fy in range(base_y - 130, base_y - 30, 50):
            d.rectangle([fx, fy, fx + 26, fy + 30], fill=accent + (210,))
    # senkrechter Foerdergeruest-Turm
    tw = 70
    d.polygon([(cx - tw, base_y - 150), (cx + tw, base_y - 150),
               (cx + tw - 14, top + 60), (cx - tw + 14, top + 60)], fill=sil)
    # Querverstrebungen (Fachwerk)
    for yy in range(top + 80, base_y - 150, 70):
        d.line([(cx - tw + 14, yy), (cx + tw - 14, yy - 26)], fill=_lerp(sil, sky_bot, 0.25), width=5)
        d.line([(cx - tw + 14, yy - 26), (cx + tw - 14, yy)], fill=_lerp(sil, sky_bot, 0.25), width=5)
    # Strebe nach hinten (charakteristische Schraege des Foerdergeruests)
    d.polygon([(cx + tw - 8, base_y - 150), (cx + 240, base_y),
               (cx + 300, base_y), (cx + tw + 6, top + 120)], fill=sil)
    # zwei Seilscheiben (Raeder) oben
    for dx, rad in ((-30, 96), (34, 96)):
        wx, wy = cx + dx, top
        d.ellipse([wx - rad, wy - rad, wx + rad, wy + rad], outline=sil, width=22)
        d.ellipse([wx - rad, wy - rad, wx + rad, wy + rad], outline=_lerp(accent, sil, 0.4), width=6)
        # Speichen
        for a in range(0, 360, 45):
            ex = wx + int(math.cos(math.radians(a)) * (rad - 14))
            ey = wy + int(math.sin(math.radians(a)) * (rad - 14))
            d.line([(wx, wy), (ex, ey)], fill=sil, width=10)
        d.ellipse([wx - 16, wy - 16, wx + 16, wy + 16], fill=sil)

    # --- Korn ---
    base = Image.alpha_composite(base.convert("RGBA"), _grain(seed, 12)).convert("RGB")
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
        _center(d, ty, ln, tf, _lerp(accent, CREAM, 0.4))
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
    1: ((58, 50, 40), (24, 20, 18), (214, 150, 70)),    # 1905-23: kohlestaubiges Morgengrau, warmer Amber
    2: ((70, 34, 26), (26, 12, 12), (224, 110, 54)),    # 1929-48: Abendrot/Feuer
    3: ((34, 44, 56), (14, 18, 24), (150, 186, 214)),   # 1962-89: kaltes Stahlblau
}
LABELS_DE = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}
LABELS_EN = {1: "Volume One", 2: "Volume Two", 3: "Volume Three"}


def build_de():
    bibel = json.load(open(BIBEL, encoding="utf-8"))
    base = "schicht"
    for b in bibel["baende"]:
        n = b["nummer"]
        st, sb, ac = STIMMUNG.get(n, STIMMUNG[1])
        cover("%s-band-%02d" % (base, n), st, sb, ac, LABELS_DE.get(n, "Band %d" % n),
              b["titel"], b.get("untertitel", ""), seed=3100 + n)
    cover("%s-gesamt" % base, (44, 42, 40), (18, 16, 16), (214, 150, 70),
          "Die Trilogie", "Drei Bände", "Voßlohe · 1905 bis 1989", seed=3200)


def build_en():
    base = "schicht-en"
    en_titles = {1: "Going Down", 2: "At the Face", 3: "Turning Away"}
    en_epoch = {1: "Voßlohe, 1905–1923", 2: "Voßlohe, 1929–1948", 3: "Voßlohe, 1962–1989"}
    for n in (1, 2, 3):
        st, sb, ac = STIMMUNG[n]
        cover("%s-band-%02d" % (base, n), st, sb, ac, LABELS_EN[n],
              en_titles[n], en_epoch[n], seed=3100 + n,
              main_title="The Seam", series_subtitle="A Ruhr Valley Saga",
              colophon="Novel · written with Claude Opus")
    cover("%s-gesamt" % base, (44, 42, 40), (18, 16, 16), (214, 150, 70),
          "The Trilogy", "Three Volumes", "Voßlohe · 1905 to 1989", seed=3200,
          main_title="The Seam", series_subtitle="A Ruhr Valley Saga",
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
