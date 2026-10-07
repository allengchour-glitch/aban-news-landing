#!/usr/bin/env python3
"""fremdtext.py — zählt montierten Text (englische Infografik-Wörter) in einem Produktbild (07.10.2026).

ANLASS: Betreiber zum IG-Karussell «Bodenstativ mit LED-Ringlicht», Slide 6/8: «das bild ist verzogen?».
GEMESSEN: Das Shopify-Bild ist 800x800, unser Generator hält das Seitenverhältnis — der Lieferant hatte eine hohe
englische Infografik («Storage of three major functions») auf das Quadrat gepresst. Von den 8 Bildern trugen die
5 Infografiken 9–32 Wörter, die 3 Studiofotos 0. Gestauchte Bilder sind fast immer solche Infografiken; wer den
Fremdtext sperrt, sperrt die Stauchung mit. Betreiber danach: «bleiben, für die nächsten verbessern» → jede
Stelle, die Lieferantenbilder in Social-Posts bringt, fragt dieses Modul (Karussell, Einzelbild-Post, Story, Bild-Reel).

Zwei OCR-Durchgänge (tesseract eng, psm 11): Graustufen, und Schwellwert >200 für weisse Schrift auf Farbe
(ohne ihn las Bild 2 «MULTI FUNCTION, LIVE» 0 Wörter, mit ihm 13). Gezählt: Wörter >= 3 Buchstaben, Konfidenz
>= 70, mit Vokal, keine Buchstabenwiederholung («eee»). Ab GRENZE (4) = montierter Text; Aufdruck auf der Ware
(«Happy Birthday») bleibt darunter. Stichprobe 40 neueste aktive × 3 Bilder: 25/120 markiert, Grenzfälle 4–6
Wörter per Kontaktbogen 8/8 echter Werbetext («Chewing sound», «17.7 Inch - For Medium to Large Dogs»).

  python3 automation/fremdtext.py <pfad|url> [...]   # je Zeile: Wortzahl (oder -1 = nicht prüfbar) TAB Quelle
  python3 automation/fremdtext.py --selbsttest
Aus Python: from fremdtext import woerter, montiert, woerter_url
"""
import os, re, subprocess, sys, tempfile

GRENZE = 4


def woerter(pfad):
    """Lesbare lateinische Wörter im Bild; None = OCR/Bild nicht verfügbar (Aufrufer entscheidet, meist: zulassen)."""
    try:
        import pytesseract
        from PIL import Image
        g = Image.open(pfad).convert("L")
        best = 0
        for x in (g, g.point(lambda v: 0 if v > 200 else 255)):
            d = pytesseract.image_to_data(x, lang="eng", config="--psm 11", output_type=pytesseract.Output.DICT)
            n = sum(1 for t, c in zip(d["text"], d["conf"])
                    if float(c) >= 70 and re.fullmatch(r"[A-Za-z]{3,}", (t or "").strip())
                    and re.search(r"[aeiouyAEIOUY]", t) and not re.fullmatch(r"(.)\1+", t.strip().lower()))
            best = max(best, n)
        return best
    except Exception:
        return None


def montiert(pfad):
    n = woerter(pfad)
    return n is not None and n >= GRENZE


def woerter_url(url):
    """Lädt das Bild (Shopify-CDN: 800 px genügen) und zählt; None bei Ladefehler."""
    if os.path.exists(url):
        return woerter(url)
    u = url
    if "cdn.shopify.com" in u and "width=" not in u:
        u += ("&" if "?" in u else "?") + "width=800"
    fd, z = tempfile.mkstemp(suffix=".img")
    os.close(fd)
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "40", "-o", z, u], capture_output=True)
        if r.returncode != 0 or os.path.getsize(z) < 2000:
            return None
        return woerter(z)
    finally:
        try:
            os.remove(z)
        except OSError:
            pass


def selbsttest():
    from PIL import Image, ImageDraw, ImageFont
    leer = "/tmp/_ft_leer.png"; text = "/tmp/_ft_text.png"; dunkel = "/tmp/_ft_dunkel.png"
    Image.new("RGB", (800, 800), "white").save(leer)
    try:
        fo = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44)
    except Exception:
        fo = ImageFont.load_default()
    im = Image.new("RGB", (800, 800), (40, 70, 140)); d = ImageDraw.Draw(im)
    d.text((40, 60), "MULTI FUNCTION LIVE", fill="white", font=fo)
    d.text((40, 140), "Storage of three major functions", fill="white", font=fo)
    im.save(text)
    im = Image.new("RGB", (800, 800), "white"); d = ImageDraw.Draw(im)
    d.text((40, 60), "Linking different scenes", fill="black", font=fo)
    d.text((40, 140), "easy to move the camera", fill="black", font=fo)
    im.save(dunkel)
    a, b, c = woerter(leer), woerter(text), woerter(dunkel)
    t = [(a == 0, f"leeres Bild → 0 (gemessen {a})"),
         (b is not None and b >= GRENZE, f"weisse Schrift auf Blau → >= {GRENZE} (gemessen {b})"),
         (c is not None and c >= GRENZE, f"schwarze Schrift auf Weiss → >= {GRENZE} (gemessen {c})")]
    for ok, n in t:
        print(("✓ " if ok else "✗ ") + n)
    print(f"{sum(o for o, _ in t)}/{len(t)}")
    return all(o for o, _ in t)


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    for q in sys.argv[1:]:
        n = woerter_url(q)
        print(f"{-1 if n is None else n}\t{q}")
