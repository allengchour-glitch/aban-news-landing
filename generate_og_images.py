"""
aban news — Social-/OG-Image-Generator (1200×630, Pillow).

Erzeugt die Open-Graph-Bilder für die Money-/eBook-Seiten. NEU: wenn Bild-Keys
vorhanden sind, legt Imagen (Google) einen warmen, lebhaften Hintergrund darunter
(menschenleer, ohne Text) — darüber kommt ein cremefarbener Schleier + die Marken-
Texte, damit alles lesbar bleibt. Ohne Keys: sauberer flacher Marken-Stil (Fallback).

Run:  python3 generate_og_images.py
Dep:  pip install pillow  (+ google-auth requests für Imagen-Hintergrund)
"""
import glob
import os
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "automation"))
try:
    import gen_image_gemini  # Imagen-Hintergrund (optional)
except Exception:  # noqa: BLE001
    gen_image_gemini = None

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)


def font(size, bold=True):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _imagen_bg(hook):
    """Warmer Imagen-Hintergrund (menschenleer, kein Text). Pfad oder None."""
    if not gen_image_gemini or not (os.environ.get("GCP_SA_KEY") or os.environ.get("GEMINI_API_KEY")):
        return None
    try:
        gen_image_gemini.set_aspect("16:9")
        tmp = os.path.join(tempfile.gettempdir(), f"ogbg-{abs(hash(hook)) % 99999}.png")
        r = gen_image_gemini.make_image(
            hook + " — warm amber tones, soft light, abstract, minimal, no text, no people", tmp)
        return r if (r and os.path.exists(r)) else None
    except Exception as e:  # noqa: BLE001
        print("Imagen-BG übersprungen:", e)
        return None


def _cover(img, W, H):
    """Bild formatfüllend skalieren + mittig beschneiden (cover)."""
    iw, ih = img.size
    scale = max(W / iw, H / ih)
    img = img.resize((int(iw * scale) + 1, int(ih * scale) + 1))
    iw, ih = img.size
    left, top = (iw - W) // 2, (ih - H) // 2
    return img.crop((left, top, left + W, top + H))


def make(out, badge, title, subs, foot, title_size=110, bg_hook=None):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    bgp = _imagen_bg(bg_hook) if bg_hook else None
    if bgp:
        try:
            bg = _cover(Image.open(bgp).convert("RGB"), W, H)
            img.paste(bg, (0, 0))
            # Cremefarbener Schleier für Textlesbarkeit (links stärker)
            scrim = Image.new("RGBA", (W, H), (255, 251, 245, 150))
            img = Image.alpha_composite(img.convert("RGBA"), scrim).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print("BG-Composite übersprungen:", e)
            bgp = None
    d = ImageDraw.Draw(img)
    if not bgp:
        d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 140, 70 + bw + 44, 140 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    d.text((70, 212), title, font=font(title_size), fill=INK)
    y = 212 + title_size + 30
    sf = font(44)
    for ln in subs:
        d.text((70, y), ln, font=sf, fill=AMBER_DK)
        y += 60
    d.text((70, H - 78), foot, font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, out), "PNG")
    print("✓ %s erstellt%s" % (out, " (Imagen-BG)" if bgp else ""))


def build():
    make("og-ebook.png", "GRATIS eBOOK", "Anti-Hype",
         ["Wie deutsche Solopreneure", "KI ohne Bullshit einsetzen"],
         "abannews.com  ·  3-Fragen-Filter · minimaler Stack · 7 Hype-Fallen",
         title_size=118, bg_hook="open book on warm wooden desk, soft morning light")
    make("og-ki-tools.png", "KI-TOOLS 2026", "Der ehrliche Stack",
         ["Was Selbstständige wirklich brauchen —", "und was nur Zeit kostet"],
         "abannews.com  ·  nach Nutzen, Preis & DSGVO sortiert", title_size=96,
         bg_hook="tidy minimal workshop tools on warm surface")
    make("og-chatgpt.png", "CHATGPT-GUIDE", "Echter Nutzen",
         ["ChatGPT für Solopreneure —", "7 Anwendungen, klare Grenzen"],
         "abannews.com  ·  ohne Prompt-Magie-Versprechen", title_size=96,
         bg_hook="abstract soft speech bubbles, warm amber, minimal")
    make("og-3d-druck.png", "3D-DRUCK & POD", "Mit KI Geld verdienen",
         ["Eigene Designs verkaufen —", "ohne eigene Maschine"],
         "abannews.com  ·  ehrlich gerechnet: Margen, Recht, Anbieter", title_size=92,
         bg_hook="3d printer in warm workshop light, minimal")


if __name__ == "__main__":
    build()
