"""Baut ein Instagram-Creative (1080×1350) aus einem echten Produktfoto.

ANLASS: Der Betreiber zeigte eine fremde Anzeige und sagte «mach besser». Was jene Anzeige
richtig macht: eine einzige grosse Aussage, ein Beleg, ein klarer Knopf. Was sie falsch macht:
winzige Schrift, überladene Screenshots, Fachjargon.

Für einen Endkunden-Shop kehrt sich das um — hier zählt das Produkt, nicht die Statistik.
Deshalb: **Foto gross, ein Satz, ein Preis, drei belegbare Vertrauenspunkte, ein Ziel.**

Alle Aussagen im Creative sind heute am lebenden Warenkorb überprüft:
  • CHF 7.00 Versand, gratis ab CHF 50   (Lieferprofil + Warenkorb-Test)
  • 30 Tage Rückgabe                     (Rückgabe-Richtlinie)
  • Kauf auf Rechnung: Klarna & TWINT    (Checkout aktiv)
Was NICHT drinsteht: «Blitzversand aus der Schweiz». Für CJ-Ware wäre das falsch — genau die
Behauptung, die heute aus 22 Captions und 19 Kollektionstexten entfernt wurde.

Aufruf:  python3 automation/creative_premium.py <bild.jpg> "<Titel>" <preis> <out.png>
"""
import os, sys, textwrap
from PIL import Image, ImageDraw, ImageFilter, ImageFont

B, H = 1080, 1350
DUNKEL = (13, 13, 16)
GOLD = (193, 146, 47)
WEISS = (255, 255, 255)
GRAU = (168, 168, 176)

FONTS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
FONTS_R = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
           "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]


def font(groesse, fett=True):
    for p in (FONTS if fett else FONTS_R):
        if os.path.exists(p):
            return ImageFont.truetype(p, groesse)
    return ImageFont.load_default()


def breite(d, text, f):
    x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
    return x1 - x0


def bauen(bildpfad, titel, preis, out):
    leinwand = Image.new("RGB", (B, H), DUNKEL)
    d = ImageDraw.Draw(leinwand)

    # --- Produktfoto oben, formatfüllend beschnitten -------------------------------------
    FOTO_H = 860
    foto = Image.open(bildpfad).convert("RGB")
    v = max(B / foto.width, FOTO_H / foto.height)
    foto = foto.resize((int(foto.width * v), int(foto.height * v)), Image.LANCZOS)
    links = (foto.width - B) // 2
    oben = max(0, (foto.height - FOTO_H) // 2)
    leinwand.paste(foto.crop((links, oben, links + B, oben + FOTO_H)), (0, 0))

    # Weicher Verlauf ins Dunkle: sonst schneidet das Foto hart ab und der Text wirkt aufgeklebt.
    verlauf = Image.new("L", (1, FOTO_H), 0)
    for y in range(FOTO_H):
        start = int(FOTO_H * 0.74)   # spät einblenden, sonst versinkt das Produkt im Verlauf
        verlauf.putpixel((0, y), 0 if y < start else int(255 * (y - start) / (FOTO_H - start)) ** 1)
    maske = verlauf.resize((B, FOTO_H))
    leinwand.paste(Image.new("RGB", (B, FOTO_H), DUNKEL), (0, 0), maske)

    # --- Markenzeile ---------------------------------------------------------------------
    f_marke = font(30)
    d.text((60, 52), "LUXESTYLE", font=f_marke, fill=WEISS)
    d.text((60 + breite(d, "LUXESTYLE", f_marke) + 10, 52), ".CH", font=f_marke, fill=GOLD)

    # --- Titel ---------------------------------------------------------------------------
    y = 900
    # Lange Katalogtitel brechen sonst mitten im Wort ab («… – 1 Karat» ohne «Moissanite»).
    # Deshalb zuerst am Gedankenstrich trennen und den Zusatz nur nehmen, wenn er noch passt.
    haupt, _, zusatz = titel.partition(' – ')
    f_t = font(56)
    zeilen = textwrap.wrap(haupt, width=28)[:2]
    if zusatz and len(zeilen) == 1:
        zeilen += textwrap.wrap(zusatz, width=30)[:1]
    for z in zeilen:
        d.text((60, y), z, font=f_t, fill=WEISS)
        y += 66

    # --- Preis ---------------------------------------------------------------------------
    y += 18
    f_p = font(96)
    d.text((60, y), f"CHF {preis}", font=f_p, fill=GOLD)
    y += 118

    # --- Vertrauenszeile (jede Aussage belegt) -------------------------------------------
    f_v = font(27, fett=False)
    punkte = ["Gratis-Versand ab CHF 50", "30 Tage Rückgabe", "Klarna & TWINT"]
    x = 60
    for i, p in enumerate(punkte):
        if i:
            d.text((x, y), "·", font=f_v, fill=GOLD); x += breite(d, "·", f_v) + 18
        d.text((x, y), p, font=f_v, fill=GRAU)
        x += breite(d, p, f_v) + 18
    y += 58

    # --- Handlungsaufforderung ------------------------------------------------------------
    f_c = font(38)
    txt = "Jetzt entdecken  →  luxestyle.ch"
    pb = breite(d, txt, f_c)
    d.rounded_rectangle([60, y, 60 + pb + 76, y + 82], radius=41, fill=GOLD)
    d.text((60 + 38, y + 20), txt, font=f_c, fill=(20, 18, 12))

    leinwand.save(out, quality=94)
    print(f"geschrieben: {out}  ({B}×{H})")


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)
    bauen(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
