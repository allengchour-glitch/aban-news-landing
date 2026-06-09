#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — „Anti-Hype"-Buchcover via Gemini-Art + Pillow-Typo.

Gemini (Imagen/Gemini-Bild) malt den TEXTFREIEN Hintergrund (Modul-Guardrail: kein Text),
Pillow setzt Titel/Untertitel/Autor sauber drüber. Robust: ohne KI-Bild → edler
Verlaufs-Hintergrund, damit immer ein „neues geiles Cover" rauskommt.

Ausgabe:
  buch-cover.png   Hochformat 1200x1600 (Buchcover für die Seite)
  og-buch.png      1200x630 (Social-/Share-Karte)

ENV (optional): GEMINI_API_KEY, GEMINI_IMAGE_MODEL, COVER_THEME
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

AMBER = (224, 132, 30)
AMBER_LT = (253, 233, 200)
INK = (18, 15, 12)
WHITE = (250, 247, 242)
MUTED = (190, 180, 166)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(bold, size):
    p = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()


def cover_fit(im, w, h):
    iw, ih = im.size
    s = max(w / iw, h / ih)
    im = im.resize((int(iw * s) + 1, int(ih * s) + 1), Image.LANCZOS)
    x = (im.width - w) // 2
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def gradient(w, h, top, bottom):
    base = Image.new("RGB", (w, h), bottom)
    d = ImageDraw.Draw(base)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=c)
    return base


def darken_bottom(im, start=0.42, max_alpha=232):
    """Dunkler Verlauf von unten für Text-Lesbarkeit."""
    w, h = im.size
    ov = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(ov)
    for y in range(h):
        t = (y / h - start) / (1 - start)
        a = 0 if t < 0 else int(max_alpha * (t ** 1.4))
        d.line([(0, y), (w, y)], fill=min(a, max_alpha))
    black = Image.new("RGB", (w, h), (8, 6, 4))
    return Image.composite(black, im, ov)


def spaced(draw, xy, text, fnt, fill, ls=0, anchor_left=True):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + ls
    return x


def _discover_models(api_key):
    """Fragt die für DIESEN Key verfügbaren Bild-Modelle ab (ListModels) und liefert
    eine priorisierte Liste — robust gegen umbenannte/abgeschaltete Modelle."""
    import json
    import urllib.request
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}&pageSize=1000"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            models = json.loads(r.read().decode("utf-8")).get("models", [])
    except Exception as e:  # noqa: BLE001
        print("ListModels fehlgeschlagen:", e)
        return []
    imagen, gemini = [], []
    for m in models:
        name = m.get("name", "").split("/")[-1]
        methods = m.get("supportedGenerationMethods", [])
        low = name.lower()
        if "predict" in methods and "imagen" in low:
            imagen.append(name)
        elif "generateContent" in methods and "image" in low:
            gemini.append(name)
    print("Bild-Modelle (Imagen):", imagen or "—", "| (Gemini-Image):", gemini or "—")
    return imagen + gemini  # Imagen zuerst (höhere Qualität fürs Cover)


def gemini_bg(aspect):
    """Textfreies KI-Hintergrundbild; None bei fehlendem Key/Fehler."""
    try:
        import gen_image_gemini as g
    except Exception as e:
        print("gen_image_gemini nicht ladbar:", e)
        return None
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    theme = os.environ.get("COVER_THEME", "").strip() or (
        "Anti-Hype: ehrliches, ruhiges Signal im Lärm — eine schrumpfende, halb geplatzte "
        "Seifenblase über einer ruhigen Kaffeetasse, sehr dunkler Hintergrund mit warmen "
        "Bernstein- und Karamell-Lichtakzenten, edel, kontraststark, minimalistisch, bold editorial")
    out = "/tmp/buch_bg.png"
    forced = os.environ.get("GEMINI_IMAGE_MODEL", "").strip()
    models = ([forced] if forced else []) + _discover_models(api_key)
    seen = set()
    for model in models:
        if not model or model in seen:
            continue
        seen.add(model)
        try:
            g.MODEL = model
            g.set_aspect(aspect)
            r = g.make_image(theme, out)
            if r and os.path.exists(out):
                print(f"✓ KI-Hintergrund via {model}")
                return Image.open(out).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"Modell {model} fehlgeschlagen: {e}")
    return None


def build_cover(art):
    W, H = 1200, 1600
    bg = cover_fit(art, W, H) if art else gradient(W, H, (44, 30, 16), (12, 9, 6))
    bg = darken_bottom(bg, start=0.30, max_alpha=238)
    d = ImageDraw.Draw(bg)
    # Kicker oben
    spaced(d, (96, 108), "ABAN NEWS", font(True, 34), AMBER, ls=8)
    d.rectangle([98, 160, 98 + 318, 164], fill=(120, 90, 50))
    # Titel unten
    tf = font(True, 190)
    ty = 884
    spaced(d, (88, ty), "ANTI-", tf, WHITE, ls=2)
    spaced(d, (88, ty + 200), "HYPE", tf, AMBER, ls=2)
    # Amber-Linie
    ry = ty + 200 + 208
    d.rectangle([92, ry, 92 + 240, ry + 14], fill=AMBER)
    # Untertitel
    sy = ry + 54
    d.text((92, sy), "KI ohne Bullshit einsetzen.", font=font(True, 50), fill=WHITE)
    d.text((92, sy + 66), "Für DACH-Solopreneure.", font=font(False, 40), fill=MUTED)
    # Autor unten
    d.text((92, H - 104), "Allen Chour · abannews.com", font=font(False, 34), fill=MUTED)
    bg.save(ROOT / "buch-cover.png")
    print("✓ buch-cover.png (1200x1600)")
    return bg


def build_og(art):
    W, H = 1200, 630
    bg = cover_fit(art, W, H) if art else gradient(W, H, (44, 30, 16), (12, 9, 6))
    # linkes dunkles Panel
    panel = Image.new("RGB", (W, H), (10, 8, 6))
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    for x in range(W):
        a = 255 if x < 560 else max(0, int(255 * (1 - (x - 560) / 360)))
        md.line([(x, 0), (x, H)], fill=a)
    bg = Image.composite(panel, bg, mask)
    d = ImageDraw.Draw(bg)
    spaced(d, (70, 86), "ABAN NEWS", font(True, 28), AMBER, ls=6)
    spaced(d, (66, 150), "ANTI-", font(True, 120), WHITE, ls=1)
    spaced(d, (66, 150 + 118), "HYPE", font(True, 120), AMBER, ls=1)
    d.rectangle([70, 408, 70 + 150, 418], fill=AMBER)
    d.text((70, 442), "KI ohne Bullshit einsetzen", font=font(True, 38), fill=WHITE)
    d.text((70, 494), "Das Buch · gratis, pay what you want", font=font(False, 30), fill=MUTED)
    bg.save(ROOT / "og-buch.png")
    print("✓ og-buch.png (1200x630)")


def main():
    art_p = gemini_bg("3:4")
    art_l = gemini_bg("16:9") if art_p is not None else None
    build_cover(art_p)
    build_og(art_l if art_l is not None else art_p)
    print("Fertig.")


if __name__ == "__main__":
    main()
