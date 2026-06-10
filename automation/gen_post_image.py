#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LuxeStyle — gen_post_image.py  (MASTERPIECE-Edition)

Erzeugt aus der kuratierten Produktliste (``automation/good_products.csv``) **edle, editorial-
hafte Bild-Posts als JPG** für Instagram / Facebook / Threads:
  - ``<name>-portrait.jpg``  1080 x 1350  (IG/FB-Feed, Hauptformat)
  - ``<name>-square.jpg``    1080 x 1080  (Square-Feed)

Design (Masterpiece): vollflächiges Produktfoto mit dezenter Veredelung (Kontrast/Sättigung/
Schärfe), sanfte Verlaufs-Scrims oben/unten (kein flaches Band), Serifen-Wortmarke mit Sperrung,
Gold-Akzentlinien, grosse Serifen-Headline mit Schatten und ein edles Rabatt-„Pill".

JPG ist Pflicht (Meta-API lehnt .webp ab) — Quell-WebP wird re-encodiert.
Pro Lauf ``BATCH`` (Default 5) Produkte rotierend; Queue ``social/posts_image.csv`` (status=ready).

ENV: BATCH (Default 5) · OUT_BASE_URL (Default https://abannews.com) · ONLY (Komma-Liste von names,
     nur diese rendern, Queue/Pointer unberührt — für Re-Render bestehender Bilder).
"""

import csv
import os
import io
import re
import ssl
import math
import urllib.request
from datetime import date

from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

# --- LuxeStyle-Marken-Farben ------------------------------------------------
INK = (28, 28, 30)
GOLD = (193, 154, 91)        # etwas wärmeres, edleres Gold
GOLD_SOFT = (212, 178, 120)
WHITE = (255, 255, 255)
CREAM = (245, 240, 232)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GOOD = os.path.join(HERE, "good_products.csv")
OUT_DIR = os.path.join(ROOT, "social", "static")
QUEUE = os.path.join(ROOT, "social", "posts_image.csv")
POINTER = os.path.join(HERE, ".image_pointer")

BATCH = max(1, int(os.environ.get("BATCH", "5")))
OUT_BASE_URL = os.environ.get("OUT_BASE_URL", "https://abannews.com").rstrip("/")
ONLY = [s.strip() for s in os.environ.get("ONLY", "").split(",") if s.strip()]

QUEUE_COLS = ["id", "scheduled_date", "image_url", "caption", "platforms", "status", "posted_at", "post_url"]

CAPTIONS = [
    "Designer-Look zum fairen Preis 👀 {label} bei LuxeStyle. Code WELCOME10 = -10% → luxestyle.ch",
    "{label} ✨ Schweizer Shop · Gratis-Versand ab CHF 65 · -10% mit WELCOME10 → luxestyle.ch",
    "Neu entdeckt: {label} 🤍 Jetzt mit Code WELCOME10 = -10% → luxestyle.ch",
    "Dein Sommer-Liebling? {label} 🌿 -10% mit WELCOME10 · 30 Tage Rückgabe → luxestyle.ch",
    "{label} — premium & bezahlbar. Code WELCOME10 = -10% → luxestyle.ch",
]
HASHTAGS = [
    "#schweizmode #ootdschweiz #sommerkleid #fashionschweiz #luxestyle",
    "#swissfashion #sommeroutfit #ootd #fashionschweiz #luxestylech",
    "#sommermode2026 #ootdschweiz #schweizmode #fashiontiktok #luxestyle",
]

_FONTS = {
    "serif-bold": ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"],
    "serif": ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"],
    "sans-bold": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"],
    "sans": ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"],
}


def font(size, fam="sans"):
    for p in _FONTS.get(fam, []):
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def tw(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt); return b[2] - b[0]


def th(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt); return b[3] - b[1]


def spaced_width(draw, text, fnt, tracking):
    return sum(tw(draw, ch, fnt) for ch in text) + tracking * max(0, len(text) - 1)


def draw_spaced(draw, xy, text, fnt, fill, tracking=0, anchor="la", shadow=None):
    """Zeichnet Text mit manueller Sperrung (tracking). anchor: la|ma|ra (x-Bezug)."""
    x, y = xy
    total = spaced_width(draw, text, fnt, tracking)
    if anchor == "ma": x -= total / 2
    elif anchor == "ra": x -= total
    cx = x
    for ch in text:
        if shadow:
            sc, off = shadow
            draw.text((cx + off, y + off), ch, font=fnt, fill=sc)
        draw.text((cx, y), ch, font=fnt, fill=fill)
        cx += tw(draw, ch, fnt) + tracking


def wrap(draw, text, fnt, maxw, maxlines=2):
    words = text.split()
    if not words: return []
    lines, cur = [], words[0]
    for w in words[1:]:
        if tw(draw, cur + " " + w, fnt) <= maxw:
            cur += " " + w
        else:
            lines.append(cur); cur = w
            if len(lines) == maxlines - 1: break
    lines.append(cur)
    if len(lines) == maxlines:
        while tw(draw, lines[-1] + "…", fnt) > maxw and len(lines[-1]) > 4:
            lines[-1] = lines[-1][:-1]
    return lines[:maxlines]


def fit_font(draw, text, maxw, start, fam="serif-bold", floor=34):
    size = start; f = font(size, fam)
    while tw(draw, text, f) > maxw and size > floor:
        size -= 2; f = font(size, fam)
    return f


def cover_crop(img, tw_, th_):
    img = img.convert("RGB")
    iw, ih = img.size
    scale = max(tw_ / iw, th_ / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw_) // 2; top = (nh - th_) // 2
    return img.crop((left, top, left + tw_, top + th_))


def enhance(img):
    """Dezente Editorial-Veredelung: etwas mehr Kontrast, Sättigung, Schärfe."""
    img = ImageEnhance.Color(img).enhance(1.08)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img = ImageEnhance.Brightness(img).enhance(1.015)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    return img


def scrims(width, height):
    """RGBA-Overlay: weicher Verlauf oben (für Wortmarke) + unten (für Text)."""
    ov = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    top_h = int(height * 0.20)
    for y in range(top_h):
        a = int(180 * (1 - y / top_h) ** 1.3)
        d.line([(0, y), (width, y)], fill=(18, 18, 20, a))
    bot_h = int(height * 0.56)
    y0 = height - bot_h
    for y in range(bot_h):
        t = y / bot_h
        a = int(225 * (t ** 1.5))
        d.line([(0, y0 + y), (width, y0 + y)], fill=(14, 14, 16, a))
    return ov


def place_hero(product_img, W, H):
    """Adaptive Produkt-Platzierung gegen Unschärfe:
    - Hochauflösende Quelle (kurze Seite ≥ ~1.18× der Zielkante) → immersives Full-Bleed.
    - Niedrig aufgelöste Quelle (typische CJ-Fotos ~750–800px) → Produkt in NAHEZU nativer,
      scharfer Grösse zentriert auf einen unscharfen, abgedunkelten Marken-Hintergrund
      (kein 2–2.5× Hochskalieren mehr → bleibt scharf, Produkt vollständig sichtbar)."""
    src = product_img.convert("RGB")
    iw, ih = src.size
    # Tatsächlicher Hochskalier-Faktor beim Full-Bleed-Cover. ≤1.4 = noch scharf → immersiv;
    # darüber (kleine ~750–800px-Quadrate skalieren 2–2.5×) → scharf-gerahmt.
    cover_scale = max(W / iw, H / ih)
    if cover_scale <= 1.4:
        return enhance(cover_crop(src, W, H))
    bg = cover_crop(src, W, H).filter(ImageFilter.GaussianBlur(46))
    bg = ImageEnhance.Brightness(bg).enhance(0.5).convert("RGB")
    # Produkt soll Breite gut füllen, aber NICHT überlaufen und max ~1.35× hochskaliert werden.
    target_long = min(int(W * 0.92), int(H * 0.50), int(max(iw, ih) * 1.35))
    s = target_long / max(iw, ih)
    fg = src.resize((max(1, int(iw * s)), max(1, int(ih * s))), Image.LANCZOS)
    fg = ImageEnhance.Sharpness(fg).enhance(1.15)
    fx = (W - fg.width) // 2
    fy = int(H * 0.30) - fg.height // 2 + 70
    bg.paste(fg, (fx, fy))
    return bg


def render_card(product_img, label, width, height):
    hero = place_hero(product_img, width, height)
    canvas = hero.convert("RGBA")
    canvas.alpha_composite(scrims(width, height))
    draw = ImageDraw.Draw(canvas)
    pad = int(width * 0.066)
    shadow = ((0, 0, 0, 170), 2)

    # — Kopf: gesperrte Serifen-Wortmarke, zentriert, mit Goldlinie —
    wm = font(int(width * 0.030), "serif")
    draw_spaced(draw, (width / 2, int(height * 0.052)), "LUXESTYLE", wm, WHITE,
                tracking=int(width * 0.012), anchor="ma", shadow=shadow)
    gw = int(width * 0.12)
    gy = int(height * 0.052) + int(width * 0.030) + 18
    draw.rectangle([(width / 2 - gw / 2, gy), (width / 2 + gw / 2, gy + 2)], fill=GOLD)
    tag = font(int(width * 0.020), "sans-bold")
    draw_spaced(draw, (width / 2, gy + 14), "SOMMER 2026", tag, GOLD_SOFT,
                tracking=int(width * 0.006), anchor="ma", shadow=((0, 0, 0, 150), 1))

    # — Fuss: Produktname (Serif), Goldlinie, Rabatt-Pill + Domain —
    # Rating-Klammer & ★ aus der Headline entfernen (Serifen-Font hat kein ★-Glyph → Tofu-Box);
    # die Bewertung bleibt in der Caption erhalten.
    disp = re.sub(r"\s*\(\s*\d[.,]\d+\s*★?\s*\)", "", label).replace("★", "").strip()
    name_f = fit_font(draw, disp, width - 2 * pad, int(width * 0.066), "serif-bold", floor=36)
    lines = wrap(draw, disp, name_f, width - 2 * pad, maxlines=2)
    line_h = int(name_f.size * 1.16)
    block_h = line_h * len(lines)
    pill_h = int(height * 0.052)
    base_y = height - int(height * 0.085) - pill_h - 22 - block_h
    ny = base_y
    for ln in lines:
        draw.text((pad, ny), ln, font=name_f, fill=WHITE)
        ny += line_h
    ly = base_y + block_h + 10
    draw.rectangle([(pad, ly), (pad + int(width * 0.16), ly + 3)], fill=GOLD)

    py = ly + 22
    pill_text = "−10 %   CODE  WELCOME10"
    pf = font(int(width * 0.030), "sans-bold")
    ptw = spaced_width(draw, pill_text, pf, 1)
    pill_w = ptw + int(width * 0.07)
    draw.rounded_rectangle([(pad, py), (pad + pill_w, py + pill_h)],
                           radius=pill_h // 2, fill=GOLD)
    draw_spaced(draw, (pad + int(width * 0.035), py + (pill_h - th(draw, "W", pf)) / 2 - 2),
                pill_text, pf, (26, 22, 16), tracking=1, anchor="la")
    site_f = font(int(width * 0.027), "sans")
    draw_spaced(draw, (width - pad, py + (pill_h - th(draw, "l", site_f)) / 2 - 2),
                "luxestyle.ch", site_f, WHITE, tracking=int(width * 0.004),
                anchor="ra", shadow=shadow)

    return canvas.convert("RGB")


def render_story(product_img, label, width=1080, height=1920, rating=None, rating_count=None):
    """Echtes 1080×1920 Instagram-/Facebook-Story-Format mit Safe-Zones:
    Wortmarke unter dem IG-Story-Header (oben ~200px frei), Produktname + Pill
    ÜBER der Antwortleiste (unten ~300px frei) → Text wird NIE abgeschnitten,
    wenn die Story 9:16 gepostet wird (kein Hochskalieren/Seiten-Crop mehr).
    Bei niedrig aufgelösten Produktfotos → scharf-gerahmt (place_hero) statt unscharf."""
    canvas = place_hero(product_img, width, height).convert("RGBA")
    canvas.alpha_composite(scrims(width, height))
    draw = ImageDraw.Draw(canvas)
    pad = int(width * 0.066)
    shadow = ((0, 0, 0, 185), 2)

    # — Kopf: Wortmarke unterhalb der IG-Header-Safe-Zone (Profil/Zeit/Schliessen) —
    top_y = 208
    wm = font(int(width * 0.032), "serif")
    draw_spaced(draw, (width / 2, top_y), "LUXESTYLE", wm, WHITE,
                tracking=int(width * 0.013), anchor="ma", shadow=shadow)
    gw = int(width * 0.13)
    gy = top_y + int(width * 0.032) + 20
    draw.rectangle([(width / 2 - gw / 2, gy), (width / 2 + gw / 2, gy + 2)], fill=GOLD)
    tag = font(int(width * 0.021), "sans-bold")
    draw_spaced(draw, (width / 2, gy + 16), "SOMMER 2026", tag, GOLD_SOFT,
                tracking=int(width * 0.006), anchor="ma", shadow=((0, 0, 0, 150), 1))

    # — Fuss: Produktname + Goldlinie + Pill, ANKER über der Antwortleiste —
    bottom_safe = 300                 # untere Story-UI (Antwortleiste/Swipe) frei lassen
    pill_h = 88
    disp = re.sub(r"\s*\(\s*\d[.,]\d+\s*★?\s*\)", "", label).replace("★", "").strip()
    name_f = fit_font(draw, disp, width - 2 * pad, int(width * 0.072), "serif-bold", floor=40)
    lines = wrap(draw, disp, name_f, width - 2 * pad, maxlines=2)
    line_h = int(name_f.size * 1.16)
    block_h = line_h * len(lines)

    py = height - bottom_safe - pill_h        # Pill-Oberkante
    ly = py - 24                              # Goldlinie über der Pill
    base_y = ly - 16 - block_h                # Titel-Block über der Goldlinie

    # — Social-Proof-Badge über dem Titel (nur wenn bewertet) —
    if rating:
        rb_f = font(int(width * 0.026), "sans-bold")
        cnt = f"   {rating_count} Bewertungen" if rating_count else ""
        bh = int(rb_f.size * 1.75)
        sx0 = pad + int(width * 0.024)
        bw = int(width * 0.024) + tw(draw, f"★ {rating}{cnt}", rb_f) + int(width * 0.024)
        by = base_y - bh - 18
        draw.rounded_rectangle([(pad, by), (pad + bw, by + bh)], radius=bh // 2,
                               fill=(0, 0, 0, 150))
        ty = by + (bh - th(draw, "4", rb_f)) // 2 - 3
        draw.text((sx0, ty), "★", font=rb_f, fill=GOLD)          # Stern (DejaVuSans hat ★)
        draw.text((sx0 + tw(draw, "★ ", rb_f), ty), f"{rating}{cnt}", font=rb_f, fill=WHITE)

    ny = base_y
    for ln in lines:
        draw.text((pad + 2, ny + 2), ln, font=name_f, fill=(0, 0, 0))   # Schatten = lesbar
        draw.text((pad, ny), ln, font=name_f, fill=WHITE)
        ny += line_h
    draw.rectangle([(pad, ly), (pad + int(width * 0.16), ly + 3)], fill=GOLD)

    pill_text = "−10 %   CODE  WELCOME10"
    pf = font(int(width * 0.032), "sans-bold")
    ptw = spaced_width(draw, pill_text, pf, 1)
    pill_w = ptw + int(width * 0.07)
    draw.rounded_rectangle([(pad, py), (pad + pill_w, py + pill_h)],
                           radius=pill_h // 2, fill=GOLD)
    draw_spaced(draw, (pad + int(width * 0.035), py + (pill_h - th(draw, "W", pf)) / 2 - 2),
                pill_text, pf, (26, 22, 16), tracking=1, anchor="la")
    site_f = font(int(width * 0.030), "sans")
    draw_spaced(draw, (width - pad, py + (pill_h - th(draw, "l", site_f)) / 2 - 2),
                "luxestyle.ch", site_f, WHITE, tracking=int(width * 0.004),
                anchor="ra", shadow=shadow)

    return canvas.convert("RGB")


# Format-Liste: portrait+square = Feed, story = 9:16 (manuell als Story posten).
RATIOS = (("portrait", (1080, 1350)), ("square", (1080, 1080)), ("story", (1080, 1920)))


def render_variant(src, label, ratio, w, h):
    return render_story(src, label, w, h) if ratio == "story" else render_card(src, label, w, h)


def _excludes():
    """Begriffe aus DO-NOT-POST.txt (vom User ausgeschlossene Produkte) — case-insensitive."""
    p = os.path.join(HERE, "DO-NOT-POST.txt")
    terms = []
    if os.path.exists(p):
        for ln in open(p, encoding="utf-8"):
            ln = ln.strip()
            if ln and not ln.startswith("#"):
                terms.append(ln.lower())
    return terms


def read_good():
    out = []
    ex = _excludes()
    with open(GOOD, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("image_url") and row.get("label"):
                name, label = row["name"].strip(), row["label"].strip()
                if any(t in (name + " " + label).lower() for t in ex):
                    print(f"⏭️  ausgeschlossen (DO-NOT-POST): {name}")
                    continue
                out.append((name, row["image_url"].strip(), label))
    return out


def download(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 LuxeStyle"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return Image.open(io.BytesIO(r.read()))


def render_for(name, url, label):
    src = download(url)
    for ratio, (w, h) in RATIOS:
        out = os.path.join(OUT_DIR, f"{name}-{ratio}.jpg")
        render_variant(src, label, ratio, w, h).save(out, "JPEG", quality=90, optimize=True)
        print(f"[{ratio}] {out}")


def load_pointer(n):
    try:
        return int(open(POINTER).read().strip()) % n
    except Exception:
        return 0


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    products = read_good()
    if not products:
        print("good_products.csv leer — nichts zu tun."); return

    if ONLY:
        by_name = {n: (n, u, l) for (n, u, l) in products}
        for name in ONLY:
            if name in by_name:
                try:
                    render_for(*by_name[name])
                except Exception as e:
                    print(f"⚠️  {name}: {e}")
            else:
                print(f"⏭️  {name} nicht in good_products.csv")
        print(f"✅ ONLY-Re-Render fertig ({len(ONLY)} Produkte). Queue unberührt.")
        return

    start = load_pointer(len(products))
    today = date.today().isoformat()
    new_rows = []
    made = 0
    for k in range(BATCH):
        name, url, label = products[(start + k) % len(products)]
        try:
            src = download(url)
        except Exception as e:
            print(f"⚠️  Download fehlgeschlagen {name}: {e}"); continue
        for ratio, (w, h) in RATIOS:
            out = os.path.join(OUT_DIR, f"{name}-{ratio}.jpg")
            render_variant(src, label, ratio, w, h).save(out, "JPEG", quality=90, optimize=True)
            print(f"[{ratio}] {out}")
        cap = CAPTIONS[(start + k) % len(CAPTIONS)].format(label=label)
        tags = HASHTAGS[(start + k) % len(HASHTAGS)]
        pub_url = f"{OUT_BASE_URL}/social/static/{name}-portrait.jpg"
        new_rows.append([f"{name}-{today}", today, pub_url, f"{cap}\n{tags}",
                         "instagram,facebook,threads", "ready", "", ""])
        made += 1
    with open(POINTER, "w") as f:
        f.write(str((start + BATCH) % len(products)))
    exists = os.path.exists(QUEUE) and os.path.getsize(QUEUE) > 0
    with open(QUEUE, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(QUEUE_COLS)
        for r in new_rows:
            w.writerow(r)
    print(f"✅ {made} Masterpiece-Bild-Posts gerendert + ready in {QUEUE} (Pointer → {(start + BATCH) % len(products)}).")


if __name__ == "__main__":
    main()
