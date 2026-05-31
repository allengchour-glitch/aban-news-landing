"""
aban news — OG-Bild-Generator für die SEO-/Money-/Branchen-Seiten (1200×630, Pillow).

Erzeugt pro Seite ein eigenes, markenkonformes Social-Vorschaubild nach img/og/<slug>.png.
Selbst gezeichnet (Amber/Cream, System-Stil) — keine Stockfotos, keine externen Fonts.
Idempotent: gleiche Daten -> gleiche Bilder.

Run:    python3 generate_seo_og.py
Check:  python3 generate_seo_og.py --check   (Exit 1 bei fehlenden/abweichenden Bildern)
Dep:    pip install pillow
"""
import argparse
import glob
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "img", "og")

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)

# slug -> (badge, titelzeilen[], unterzeile)
PAGES = {
    "chatgpt-vs-claude": ("TOOL-VERGLEICH", ["ChatGPT vs. Claude"],
        "Ehrlich verglichen — welches Tool für welche Aufgabe"),
    "geld-verdienen-mit-ki": ("KI & GELD", ["Geld verdienen", "mit KI"],
        "7 echte Wege — ohne „schnell reich“-Versprechen"),
    "gratis-ki-tools": ("GRATIS-STACK", ["30 KI-Tools", "kostenlos"],
        "Die besten Gratis-Tools für DACH, ehrlich sortiert"),
    "ki-automatisierung-selbststaendige": ("AUTOMATISIERUNG", ["KI-Automatisierung"],
        "Der ehrliche Leitfaden für Selbstständige"),
    "ki-dsgvo-konform": ("DSGVO & KI", ["KI DSGVO-konform", "nutzen"],
        "Praktischer Leitfaden — echte Quellen, klare Grenzen"),
    "ki-email-schreiben": ("E-MAIL & KI", ["E-Mails mit KI", "schreiben"],
        "Praktischer Leitfaden — Vorlagen statt Floskeln"),
    "ki-halluzinationen-erkennen": ("FAKTEN-CHECK", ["KI-Halluzinationen", "erkennen"],
        "Praktischer Leitfaden — wann du der KI nicht trauen darfst"),
    "ki-prompts-schreiben": ("PROMPTING", ["KI-Prompts", "schreiben"],
        "Praktischer Leitfaden — ohne Prompt-Magie-Versprechen"),
    "ki-ratgeber": ("RATGEBER-HUB", ["KI-Ratgeber", "für Selbstständige"],
        "Alle ehrlichen Guides an einem Ort"),
    # Branchen-Hubs
    "ki-fuer-aerzte": ("FÜR ÄRZTE", ["KI in der", "Arztpraxis"],
        "Wo sie Bürozeit spart — und wo Patientendaten Grenzen setzen"),
    "ki-fuer-anwaelte": ("FÜR KANZLEIEN", ["KI für", "Anwälte"],
        "Nützlich mit Haftungsblick — kein Hype"),
    "ki-fuer-coaches": ("FÜR COACHES", ["KI für", "Coaches & Berater"],
        "Content, Akquise, Orga — was wirklich Zeit spart"),
    "ki-fuer-gastronomie": ("FÜR GASTRO", ["KI in der", "Gastronomie"],
        "Speisekarte, Bewertungen, Social — bodenständig"),
    "ki-fuer-handwerker": ("FÜR HANDWERK", ["KI für", "Handwerker"],
        "Wo sie wirklich Zeit spart — und wo nicht"),
    "ki-fuer-immobilienmakler": ("FÜR MAKLER", ["KI für", "Immobilienmakler"],
        "Exposés, Anfragen, Texte — schneller erledigt"),
    "ki-fuer-onlineshops": ("FÜR SHOPS", ["KI für", "Onlineshops"],
        "Produkttexte, Support, SEO — ohne Floskeln"),
    "ki-fuer-steuerberater": ("FÜR KANZLEIEN", ["KI für", "Steuerberater"],
        "Sinnvoller Einsatz in der Kanzlei — mit Datenschutz"),
}


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


def render(badge, title_lines, sub):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # Deko: Cream-Kreis oben rechts, Amber-Kante links
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    # Marke
    d.text((70, 64), "☕  aban news", font=font(34), fill=AMBER_DK)
    # Badge-Pille
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 132, 70 + bw + 44, 132 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 144), badge, font=bf, fill=AMBER_DK)
    # Titel (1–2 Zeilen, Größe je nach Zeilenzahl)
    tsize = 104 if len(title_lines) == 1 else 92
    y = 208
    tf = font(tsize)
    for ln in title_lines:
        d.text((70, y), ln, font=tf, fill=INK)
        y += tsize + 12
    # Unterzeile
    y += 14
    d.text((70, y), sub, font=font(38, bold=False), fill=AMBER_DK)
    # Fuß
    d.text((70, H - 74), "abannews.com  ·  Mo–Fr, 5 Minuten, kein Hype",
           font=font(26, bold=False), fill=MUTED)
    return img


def build(check=False):
    os.makedirs(OUT_DIR, exist_ok=True)
    drift = 0
    for slug, (badge, lines, sub) in PAGES.items():
        path = os.path.join(OUT_DIR, slug + ".png")
        img = render(badge, lines, sub)
        if check:
            if not os.path.exists(path):
                print(f"FEHLT: img/og/{slug}.png")
                drift += 1
                continue
            import io
            buf = io.BytesIO()
            img.save(buf, "PNG")
            if buf.getvalue() != open(path, "rb").read():
                print(f"DRIFT: img/og/{slug}.png weicht ab")
                drift += 1
        else:
            img.save(path, "PNG")
            print(f"✓ img/og/{slug}.png")
    if check:
        if drift:
            print(f"{drift} Abweichung(en).")
            return 1
        print("Alle OG-Bilder aktuell.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="nur prüfen, nichts schreiben")
    args = ap.parse_args()
    sys.exit(build(check=args.check))
