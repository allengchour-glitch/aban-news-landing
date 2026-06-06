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
    top_h = int(height * 0.18)
    for y in range(top_h):
        a = int(150 * (1 - y / top_h) ** 1.4)
        d.line([(0, y), (width, y)], fill=(18, 18, 20, a))
    bot_h = int(height * 0.56)
    y0 = height - bot_h
    for y in range(bot_h):
        t = y / bot_h
        a = int(225 * (t ** 1.5))
        d.line([(0, y0 + y), (width, y0 + y)], fill=(14, 14, 16, a))
    return ov


def render_card(product_img, label, width, height):
    hero = enhance(cover_crop(product_img, width, height))
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
                tracking=int(width * 0.006), anchor="ma")

    # — Fuss: Produktname (Serif), Goldlinie, Rabatt-Pill + Domain —
    name_f = fit_font(draw, label, width - 2 * pad, int(width * 0.066), "serif-bold", floor=36)
    lines = wrap(draw, label, name_f, width - 2 * pad, maxlines=2)
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


def read_good():
    out = []
    with open(GOOD, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("image_url") and row.get("label"):
                out.append((row["name"].strip(), row["image_url"].strip(), row["label"].strip()))
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
    for ratio, (w, h) in (("portrait", (1080, 1350)), ("square", (1080, 1080))):
        out = os.path.join(OUT_DIR, f"{name}-{ratio}.jpg")
        render_card(src, label, w, h).save(out, "JPEG", quality=90, optimize=True)
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
        for ratio, (w, h) in (("portrait", (1080, 1350)), ("square", (1080, 1080))):
            out = os.path.join(OUT_DIR, f"{name}-{ratio}.jpg")
            render_card(src, label, w, h).save(out, "JPEG", quality=90, optimize=True)
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
