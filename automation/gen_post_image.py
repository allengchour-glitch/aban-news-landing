#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LuxeStyle — gen_post_image.py

Erzeugt aus der kuratierten Produktliste (``automation/good_products.csv``) markenkonforme
**Bild-Posts als JPG** für Instagram / Facebook / Threads:
  - ``<name>-portrait.jpg``  1080 x 1350  (IG/FB-Feed, Hauptformat)
  - ``<name>-square.jpg``    1080 x 1080  (Square-Feed)
Ausgabe nach ``social/static/``. JPG ist Pflicht (Meta-API lehnt .webp ab) — Quell-WebP wird
re-encodiert, daher sind auch WebP-Produktbilder als Post nutzbar (anders als bei Reels).

Pro Lauf werden ``BATCH`` (Default 5) Produkte rotierend gewählt (Pointer ``.image_pointer``),
die Karten gerendert und als ``status=ready`` an ``social/posts_image.csv`` angehängt
(Caption mit Preis-Anker + WELCOME10 + luxestyle.ch, rotierende Hashtags). Der Autopilot
``social-autopost-meta.mjs`` postet sie dann gestaffelt.

Reines Pillow + stdlib. Helfer (font/wrap_text/gradient) aus ``generate_cover_variants.py``.

ENV: BATCH (Default 5) · OUT_BASE_URL (Default https://abannews.com) — öffentliche Pages-Host-Basis;
die JPGs liegen im Repo unter social/static/ und werden via GitHub Pages serviert (wie die Reels).
"""

import csv
import os
import io
import ssl
import urllib.request
from datetime import date

from PIL import Image, ImageDraw, ImageFont

# --- LuxeStyle-Marken-Farben (identisch zur Reel-Engine) --------------------
OFFWHITE = (244, 243, 241)   # #f4f3f1
INK = (44, 44, 44)           # #2c2c2c
GOLD = (184, 145, 90)        # #b8915a
WHITE = (255, 255, 255)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GOOD = os.path.join(HERE, "good_products.csv")
OUT_DIR = os.path.join(ROOT, "social", "static")
QUEUE = os.path.join(ROOT, "social", "posts_image.csv")
POINTER = os.path.join(HERE, ".image_pointer")

BATCH = max(1, int(os.environ.get("BATCH", "5")))
OUT_BASE_URL = os.environ.get("OUT_BASE_URL", "https://abannews.com").rstrip("/")

QUEUE_COLS = ["id", "scheduled_date", "image_url", "caption", "platforms", "status", "posted_at", "post_url"]

# Caption-Templates (Preis-Anker schlug generisch ~20:1 lt. TikTok-Analyse) — {label} wird ersetzt.
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
    "bold": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"],
    "regular": ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"],
}


def font(size, weight="regular"):
    for p in _FONTS.get(weight, []):
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def tw(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt); return b[2] - b[0]


def wrap(draw, text, fnt, maxw):
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for w in words[1:]:
        cand = cur + " " + w
        if tw(draw, cand, fnt) <= maxw:
            cur = cand
        else:
            lines.append(cur); cur = w
    lines.append(cur); return lines


def fit_font(draw, text, maxw, start, weight="bold", floor=30):
    size = start; f = font(size, weight)
    while tw(draw, text, f) > maxw and size > floor:
        size -= 2; f = font(size, weight)
    return f


def cover_crop(img, tw_, th_):
    """Skaliert+beschneidet ``img`` mittig, sodass es ``tw_ x th_`` füllt (cover)."""
    img = img.convert("RGB")
    iw, ih = img.size
    scale = max(tw_ / iw, th_ / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw_) // 2; top = (nh - th_) // 2
    return img.crop((left, top, left + tw_, top + th_))


def download(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # Sandbox-TLS-Proxy; in CI normal gültig
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 LuxeStyle"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return Image.open(io.BytesIO(r.read()))


def render_card(product_img, label, width, height):
    """Karte: Produktbild oben (cover), unten Marken-Band mit Name + Preis-Anker + Trust-Row."""
    band_h = int(height * 0.22)
    img_h = height - band_h
    canvas = Image.new("RGB", (width, height), OFFWHITE)
    hero = cover_crop(product_img, width, img_h)
    canvas.paste(hero, (0, 0))
    draw = ImageDraw.Draw(canvas)

    # Marken-Wortmarke oben links auf dezentem Scrim.
    wm = font(int(width * 0.030), "bold")
    draw.rectangle([(0, 0), (int(width * 0.46), int(height * 0.060))], fill=(0, 0, 0))
    draw.text((int(width * 0.035), int(height * 0.014)), "LUXESTYLE", font=wm, fill=WHITE)

    # Band unten.
    by0 = img_h
    draw.rectangle([(0, by0), (width, height)], fill=OFFWHITE)
    # Gold-Akzentlinie oben am Band.
    draw.rectangle([(0, by0), (width, by0 + max(4, int(height * 0.005)))], fill=GOLD)

    pad = int(width * 0.055)
    # Produktname (umgebrochen, max 2 Zeilen).
    name_f = fit_font(draw, label, width - 2 * pad, int(width * 0.058), "bold", floor=34)
    lines = wrap(draw, label, name_f, width - 2 * pad)[:2]
    ny = by0 + int(band_h * 0.16)
    for ln in lines:
        draw.text((pad, ny), ln, font=name_f, fill=INK)
        ny += int(name_f.size * 1.18)

    # Trust-/CTA-Row unten im Band.
    cta_f = font(int(width * 0.034), "bold")
    sub_f = font(int(width * 0.030), "regular")
    cta = "−10%  CODE WELCOME10"
    draw.text((pad, height - int(band_h * 0.34)), cta, font=cta_f, fill=GOLD)
    site = "luxestyle.ch"
    sw = tw(draw, site, sub_f)
    draw.text((width - pad - sw, height - int(band_h * 0.33)), site, font=sub_f, fill=INK)
    return canvas


def read_good():
    out = []
    with open(GOOD, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("image_url") and row.get("label"):
                out.append((row["name"].strip(), row["image_url"].strip(), row["label"].strip()))
    return out


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
            render_card(src, label, w, h).save(out, "JPEG", quality=88, optimize=True)
            print(f"[{ratio}] {out}")
        # Queue-Zeile: Portrait als Post-Bild (IG/FB-Feed bevorzugt 4:5).
        cap = CAPTIONS[(start + k) % len(CAPTIONS)].format(label=label)
        tags = HASHTAGS[(start + k) % len(HASHTAGS)]
        pub_url = f"{OUT_BASE_URL}/social/static/{name}-portrait.jpg"
        new_rows.append([f"{name}-{today}", today, pub_url, f"{cap}\n{tags}",
                         "instagram,facebook,threads", "ready", "", ""])
        made += 1
    # Pointer weiterdrehen.
    with open(POINTER, "w") as f:
        f.write(str((start + BATCH) % len(products)))
    # An Queue anhängen (Header anlegen, falls nötig).
    exists = os.path.exists(QUEUE) and os.path.getsize(QUEUE) > 0
    with open(QUEUE, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(QUEUE_COLS)
        for r in new_rows:
            w.writerow(r)
    print(f"✅ {made} Bild-Posts gerendert + als ready in {QUEUE} eingereiht (Pointer → {(start + BATCH) % len(products)}).")


if __name__ == "__main__":
    main()
