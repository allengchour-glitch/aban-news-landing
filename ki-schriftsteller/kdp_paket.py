#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KDP-Paket - erzeugt druckfertige Amazon-KDP-Dateien fuer die Trilogie-Omnibus:

  ausgabe/kdp/innenteil-5x8.pdf   Druck-Innenteil (Taschenbuch, 5x8", korrekte
                                  Raender, Titelei, Seitenzahlen, Initialen) OHNE
                                  Cover (KDP fuegt den Umschlag separat hinzu).
  ausgabe/kdp/umschlag-5x8.pdf    Wrap-Umschlag (Rueckseite+Klappentext, Buchruecken,
                                  Vorderseite) auf Basis der Seitenzahl, mit 3 mm
                                  Beschnitt, Barcode-Bereich frei.
  ausgabe/kdp/metadaten.md        Alle Felder zum Reinkopieren + Klick-Anleitung.

Das Kindle-eBook braucht KEIN KDP-Paket: dafuer die fertige ePub + das Cover
(img/covers/...-gesamt.jpg) hochladen.

Verwendung:
  python3 kdp_paket.py --roman roman-drama-trilogie.json
Dep:
  pip install reportlab pillow
"""
import argparse
import os
import sys

try:
    from reportlab.lib.units import inch, mm
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame,
                                    Paragraph, Spacer, PageBreak, NextPageTemplate)
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("! Pakete fehlen. Installiere:  pip install reportlab pillow")

from roman_util import lade_roman, slugify, baende_aus_roman, ist_trilogie
from buch_bauen import lies_kapitel, teile_kapitel, _ueberschrift_fuer
from pdf_fonts import register_serif, canvas_maker

HIER = os.path.dirname(os.path.abspath(__file__))

# Einbettbarer Serif (KDP verlangt eingebettete Fonts). Fallback: Times-* (nicht
# eingebettet) - dann warnt build_interior.
F = register_serif()

AMBER = HexColor("#d97706")
AMBER_DK = HexColor("#b45309")
INK = HexColor("#1f2937")
MUTED = HexColor("#6b7280")

# ---- Texte (Rueckseite / Metadaten) ----
KLAPPENTEXT = (
    "Ein abgelegenes Schweizer Bergtal, ein Stausee – und ein Tod, der vor "
    "sechzig Jahren als Unfall in die Akten kam. Über drei Generationen trägt "
    "eine Familie eine verschwiegene Schuld weiter: die Großmutter, die schweigt; "
    "der Sohn, der die Wahrheit findet und verkauft; die Enkelin, die im "
    "Dürresommer zurückkehrt, als der sinkende See freigibt, was er so lange "
    "verborgen hat.\n\n"
    "Ein leises, genaues Generationendrama über Schweigen, Geld und die Frage, "
    "was bleibt, wenn das Wasser sinkt."
)


# ==================================================================
# Druck-Innenteil (Taschenbuch)
# ==================================================================
def _styles():
    ss = getSampleStyleSheet()
    s = {}
    s["body"] = ParagraphStyle("B", parent=ss["Normal"], fontName=F["roman"],
                               fontSize=10.5, leading=15.2, alignment=TA_JUSTIFY,
                               firstLineIndent=4.2 * mm, textColor=INK)
    s["first"] = ParagraphStyle("F", parent=s["body"], firstLineIndent=0)
    s["orn"] = ParagraphStyle("ORN", parent=ss["Normal"], fontName=F["roman"],
                              fontSize=11, leading=13, textColor=AMBER, alignment=TA_CENTER,
                              spaceBefore=2 * mm, spaceAfter=1 * mm)
    s["h2"] = ParagraphStyle("H", parent=ss["Heading2"], fontName=F["bold"],
                             fontSize=14, leading=18, textColor=AMBER_DK, alignment=TA_CENTER,
                             spaceBefore=2 * mm, spaceAfter=6 * mm, keepWithNext=True)
    s["bl"] = ParagraphStyle("BL", parent=ss["Normal"], fontName=F["roman"],
                             fontSize=11, leading=15, textColor=AMBER_DK, alignment=TA_CENTER)
    s["band"] = ParagraphStyle("BD", parent=ss["Heading1"], fontName=F["bold"],
                               fontSize=22, leading=27, textColor=AMBER, alignment=TA_CENTER)
    s["epoch"] = ParagraphStyle("EP", parent=ss["Normal"], fontName=F["italic"],
                                fontSize=11, leading=15, textColor=MUTED, alignment=TA_CENTER)
    s["htitle"] = ParagraphStyle("HT", parent=ss["Title"], fontName=F["bold"],
                                 fontSize=26, leading=31, textColor=AMBER, alignment=TA_CENTER)
    s["sub"] = ParagraphStyle("S", parent=ss["Normal"], fontName=F["italic"],
                              fontSize=13, leading=17, textColor=INK, alignment=TA_CENTER)
    s["aut"] = ParagraphStyle("A", parent=ss["Normal"], fontName=F["roman"],
                              fontSize=12, leading=16, textColor=INK, alignment=TA_CENTER)
    s["fine"] = ParagraphStyle("FN", parent=ss["Normal"], fontName=F["roman"],
                               fontSize=9, leading=13, textColor=MUTED, alignment=TA_CENTER)
    return s


def _esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_interior(roman, kapitel_dir, out_pdf, autor):
    s = _styles()
    titel = roman["titel"]
    genre = roman.get("genre", "")
    baende = baende_aus_roman(roman)
    LABELS = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}

    TRIM = (5 * inch, 8 * inch)

    def deco(c, d):
        c.saveState()
        c.setFont(F["roman"], 9)
        c.setFillColor(MUTED)
        c.drawCentredString(TRIM[0] / 2.0, 11 * mm, str(c.getPageNumber()))
        c.setFont(F["italic"], 8.5)
        c.drawCentredString(TRIM[0] / 2.0, TRIM[1] - 12 * mm, titel)
        c.restoreState()

    doc = BaseDocTemplate(out_pdf, pagesize=TRIM,
                          title=titel, author=autor)
    # Raender: innen/aussen 0.5", oben/unten 0.6-0.7" (>= KDP-Minima fuer < 151 Seiten).
    fm = Frame(0.5 * inch, 0.6 * inch, TRIM[0] - 1.0 * inch, TRIM[1] - 1.3 * inch, id="fm")
    main = Frame(0.5 * inch, 0.6 * inch, TRIM[0] - 1.0 * inch, TRIM[1] - 1.3 * inch, id="main")
    doc.addPageTemplates([
        PageTemplate(id="fm", frames=[fm]),                  # Titelei ohne Deko
        PageTemplate(id="main", frames=[main], onPage=deco),
    ])

    st = []
    # Schmutztitel
    st += [Spacer(1, 60 * mm), Paragraph(_esc(titel), s["htitle"]), PageBreak()]
    # Titelseite
    st += [Spacer(1, 48 * mm), Paragraph(_esc(titel), s["htitle"]), Spacer(1, 4 * mm)]
    if genre:
        st += [Paragraph(_esc(genre), s["sub"])]
    st += [Spacer(1, 22 * mm), Paragraph(_esc(autor), s["aut"]), PageBreak()]
    # Impressum
    st += [Spacer(1, 70 * mm),
           Paragraph("© 2026 aban news · Allen Chour, Belp (CH)", s["fine"]),
           Paragraph("abannews.com", s["fine"]),
           Paragraph("Ein Schreib-Experiment, Kapitel für Kapitel mit Claude Opus "
                     "verfasst und redigiert.", s["fine"]),
           Paragraph("Dies ist ein fiktionales Werk. Orte, Figuren und Handlung "
                     "sind frei erfunden.", s["fine"]),
           NextPageTemplate("main"), PageBreak()]

    for b in baende:
        kaps = lies_kapitel(kapitel_dir, b, not ist_trilogie(roman))
        if not kaps:
            continue
        st += [Spacer(1, 55 * mm),
               Paragraph(LABELS.get(b["nummer"], "Band %d" % b["nummer"]).upper(), s["bl"]),
               Paragraph(_esc(b["titel"]), s["band"])]
        if b.get("untertitel"):
            st += [Paragraph(_esc(b["untertitel"]), s["epoch"])]
        st += [PageBreak()]
        for kap in kaps:
            ueb = _ueberschrift_fuer(kap)
            _, absaetze = teile_kapitel(kap["text"])
            st += [Paragraph("·  ·  ·", s["orn"]), Paragraph(_esc(ueb), s["h2"])]
            for i, a in enumerate(absaetze):
                if i == 0 and a:
                    st += [Paragraph('<font size="28" color="#b45309"><b>%s</b></font>%s'
                                     % (_esc(a[0]), _esc(a[1:])), s["first"])]
                else:
                    st += [Paragraph(_esc(a), s["body"])]
            st += [PageBreak()]

    _cm = canvas_maker()
    if _cm:
        doc.build(st, canvasmaker=_cm)
    else:
        doc.build(st)
    return doc.page  # Gesamtseitenzahl


# ==================================================================
# Wrap-Umschlag (Rueckseite + Ruecken + Vorderseite)
# ==================================================================
def _font(size, kind="bold"):
    import glob
    serif = {"bold": ["DejaVuSerif-Bold.ttf", "LiberationSerif-Bold.ttf"],
             "regular": ["DejaVuSerif.ttf", "LiberationSerif-Regular.ttf"],
             "italic": ["DejaVuSerif-Italic.ttf", "LiberationSerif-Italic.ttf"]}[kind]
    for n in serif:
        for c in glob.glob("/usr/share/fonts/**/%s" % n, recursive=True):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _wrap(d, t, f, maxw):
    out, cur = [], ""
    for w in t.split():
        test = (cur + " " + w).strip()
        if d.textbbox((0, 0), test, font=f)[2] <= maxw:
            cur = test
        else:
            out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


def build_cover(front_art, pages, out_pdf, titel, autor):
    DPI = 300
    bleed = 0.125
    tw, th = 5.0, 8.0
    spine = pages * 0.002252  # weisses Papier
    full_w = bleed + tw + spine + tw + bleed
    full_h = th + 2 * bleed
    W, H = int(round(full_w * DPI)), int(round(full_h * DPI))
    BG = (12, 15, 22)
    CREAM = (250, 243, 228)

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # --- Vorderseite (rechtes Panel) = vorhandenes Cover-Art, inkl. Beschnitt ---
    front_x = int(round((bleed + tw + spine) * DPI))
    front_w = W - front_x
    art = Image.open(front_art).convert("RGB").resize((front_w, H), Image.LANCZOS)
    img.paste(art, (front_x, 0))

    # --- Buchruecken ---
    spine_x0 = int(round((bleed + tw) * DPI))
    spine_px = int(round(spine * DPI))
    if spine_px >= 66:  # ~0.22" -> Ruecken-Text erlaubt/sinnvoll
        txt = "%s   ·   %s" % (titel, autor)
        sf = _font(min(spine_px - 16, 40), "bold")
        tmp = Image.new("RGBA", (H, spine_px), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        bb = td.textbbox((0, 0), txt, font=sf)
        td.text(((H - (bb[2] - bb[0])) / 2, (spine_px - (bb[3] - bb[1])) / 2 - bb[1]),
                txt, font=sf, fill=CREAM)
        img.paste(tmp.rotate(90, expand=True), (spine_x0, 0), tmp.rotate(90, expand=True))

    # --- Rueckseite (linkes Panel) ---
    safe = int(0.5 * DPI)
    bx0 = int(round(bleed * DPI)) + safe
    bx1 = spine_x0 - safe
    bw = bx1 - bx0
    # Logline oben
    lf = _font(46, "italic")
    y = int(0.9 * DPI)
    for ln in _wrap(d, "Über drei Generationen. Eine verschwiegene Schuld. Ein Tal, das nicht redet.", lf, bw):
        d.text((bx0, y), ln, font=lf, fill=(217, 119, 6))
        y += 58
    y += 30
    bf = _font(40, "regular")
    for para in KLAPPENTEXT.split("\n\n"):
        for ln in _wrap(d, para, bf, bw):
            d.text((bx0, y), ln, font=bf, fill=CREAM)
            y += 52
        y += 26
    # Imprint unten links (Barcode-Bereich unten rechts bleibt frei fuer KDP)
    nf = _font(40, "bold")
    d.text((bx0, H - int(0.9 * DPI)), "aban news", font=nf, fill=CREAM)
    sf2 = _font(28, "regular")
    d.text((bx0, H - int(0.9 * DPI) + 54), "Roman · abannews.com", font=sf2, fill=(150, 160, 172))

    img.save(out_pdf, "PDF", resolution=float(DPI))
    return full_w, full_h, spine


# ==================================================================
def write_metadata(out_md, titel, autor, pages, full_w, full_h, spine, sprache="Deutsch"):
    slug = slugify(titel)
    if sprache.lower().startswith("en"):
        txt = """# KDP Metadata & Guide — "{titel}"

**The simplest way to upload. Two products, both free to create.**

---

## A) Kindle eBook (fastest — no KDP print package needed)
1. kdp.amazon.com → **Create** → **Kindle eBook**.
2. **Language:** English · **Title:** {titel} · **Subtitle:** A Generational Drama in Three Volumes
3. **Author:** {autor}
4. **Description:** (see below, section "Description")
5. **Keywords:** (see "7 Keywords")
6. **Categories:** (see "Categories")
7. **Manuscript:** upload the file **{slug}.epub**.
8. **Cover:** upload **img/covers/{slug}-gesamt.jpg** (1600×2560).
9. **AI content:** When asked about "AI-generated content" → answer **Yes** (text **and** images) — KDP requires this.
10. Set price (e.g. $0.99 or free via price matching) → **Publish**.

## B) Paperback (Print)
1. Under the same title → **Paperback** (or new: Create → Paperback).
2. **Trim size:** 5 × 8 inches (12.7 × 20.32 cm)
3. **Paper:** White · **Bleed:** with bleed · **Cover finish:** matte
4. **Interior file:** **innenteil-5x8.pdf**  (length: {pages} pages)
5. **Cover file:** **umschlag-5x8.pdf**  (full wrap: {fw:.3f} × {fh:.3f} inches, spine {spine:.3f} inches)
6. **AI content:** also answer **Yes**.
7. Check preview → set price → **Publish**.

> Tip: Upload eBook (A) first, then Paperback (B) — KDP links them automatically to the same book page.

---

## Fields to Copy-Paste

**Title:** {titel}
**Subtitle:** A Generational Drama in Three Volumes
**Author:** {autor}
**Language:** English
**Series:** The Valley Holds Its Breath (3 volumes, here as complete edition)

### Description
A remote Swiss mountain valley, a reservoir — and a death recorded sixty years ago as an accident. Across three generations, a family carries a concealed guilt forward: the grandmother who stays silent; the son who finds the truth and uses it instead of opening it; the granddaughter who returns in a drought summer as a hydrologist — and the sinking lake releases what it has hidden for sixty years.

A quiet, precise generational drama about silence, money, and what remains when the water falls. Written and edited chapter by chapter with Claude Opus.

### 7 Keywords
generational saga; family secret; Swiss Alps drama; guilt and silence; reservoir drama; literary family fiction; contemporary literary fiction

### Categories (2)
1. Fiction › Literary Fiction
2. Fiction › Family Life / Multigenerational

### Pricing suggestion
eBook $0.99–$2.99 · Paperback $7.99–$9.99 (KDP will show minimum prices after print costs).

### Transparency note (important)
KDP asks about **AI-generated content** at upload. Answer **Yes** — for both text and cover. This is required and fits the brand (anti-hype, transparent).
""".format(titel=titel, autor=autor, pages=pages, fw=full_w, fh=full_h, spine=spine, slug=slug)
    else:
        txt = """# KDP-Metadaten & Anleitung — „{titel}"

**So lädst du am einfachsten hoch. Zwei Produkte, beide kostenlos anlegbar.**

---

## A) Kindle-eBook (am schnellsten — kein KDP-Paket nötig)
1. kdp.amazon.com → **Create** → **Kindle eBook**.
2. **Sprache:** Deutsch · **Titel:** {titel} · **Untertitel:** Ein Generationendrama in drei Bänden
3. **Verfasser:** {autor}
4. **Beschreibung:** (siehe unten, Abschnitt „Beschreibung")
5. **Schlüsselwörter:** (siehe „7 Keywords")
6. **Kategorien:** (siehe „Kategorien")
7. **Manuskript:** die Datei **{slug}.epub** hochladen.
8. **Cover:** **img/covers/{slug}-gesamt.jpg** hochladen (1600×2560).
9. **KI-Inhalte:** Auf die Frage „AI-generated content" → **Ja** angeben (Text **und** Bilder), so verlangt es KDP.
10. Preis setzen (z. B. 0,99 € oder kostenlos via Preisangleichung) → **Veröffentlichen**.

## B) Taschenbuch (Print)
1. Bei demselben Titel → **Paperback** (oder neu: Create → Paperback).
2. **Maße / Trim Size:** 5 × 8 Zoll (12,7 × 20,32 cm)
3. **Papier:** Weiß · **Bleed:** mit Beschnitt · **Cover-Finish:** matt
4. **Innenteil hochladen:** **innenteil-5x8.pdf**  (Umfang: {pages} Seiten)
5. **Umschlag hochladen:** **umschlag-5x8.pdf**  (fertiger Wrap: {fw:.3f} × {fh:.3f} Zoll, Rücken {spine:.3f} Zoll)
6. **KI-Inhalte:** ebenfalls **Ja** angeben.
7. Vorschau prüfen → Preis → **Veröffentlichen**.

> Tipp: Erst das eBook (A), dann das Taschenbuch (B) — KDP verknüpft beide automatisch zur selben Buchseite.

---

## Felder zum Reinkopieren

**Titel:** {titel}
**Untertitel:** Ein Generationendrama in drei Bänden
**Verfasser:** {autor}
**Sprache:** Deutsch
**Reihe:** Das Tal hält den Atem an (3 Bände, hier als Gesamtausgabe)

### Beschreibung
Ein abgelegenes Schweizer Bergtal, ein Stausee – und ein Tod, der vor sechzig Jahren als Unfall in die Akten kam. Über drei Generationen trägt eine Familie eine verschwiegene Schuld weiter: die Großmutter, die schweigt; der Sohn, der die Wahrheit findet und sie benutzt, statt sie zu öffnen; die Enkelin, die im Dürresommer als Hydrologin zurückkehrt – und der sinkende See gibt frei, was er sechzig Jahre verborgen hat.

Ein leises, genaues Generationendrama über Schweigen, Geld und die Frage, was bleibt, wenn das Wasser sinkt. Kapitel für Kapitel mit Claude Opus geschrieben und redigiert.

### 7 Keywords
Generationenroman; Familiengeheimnis; Schweizer Bergtal; Schuld und Schweigen; Stausee Drama; literarische Familiensaga; Roman Gegenwartsliteratur

### Kategorien (2)
1. Belletristik › Literarische Fiktion
2. Belletristik › Familienleben / Generationen

### Preisempfehlung
eBook 0,99–2,99 € · Taschenbuch 7,99–9,99 € (KDP zeigt dir die Mindestpreise nach Druckkosten an).

### Ehrlichkeits-Hinweis (wichtig)
KDP fragt beim Hochladen nach **KI-generierten Inhalten**. Gib **Ja** an — für Text und für das Cover. Das ist Pflicht und passt zur Marke (anti-hype, transparent).
""".format(titel=titel, autor=autor, pages=pages, fw=full_w, fh=full_h, spine=spine, slug=slug)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write(txt)


def main():
    p = argparse.ArgumentParser(description="Erzeugt das KDP-Paket (Taschenbuch + Anleitung).")
    p.add_argument("--roman", default=os.path.join(HIER, "roman-drama-trilogie.json"))
    p.add_argument("--kapitel-dir", default=os.path.join(HIER, "kapitel"))
    p.add_argument("--cover-dir", default=os.path.join(HIER, "..", "img", "covers"))
    p.add_argument("--out", default=os.path.join(HIER, "ausgabe", "kdp"))
    args = p.parse_args()

    roman = lade_roman(args.roman)
    autor = roman.get("autor", "aban news")
    slug = slugify(roman["titel"])
    os.makedirs(args.out, exist_ok=True)

    if F.get("embedded"):
        print("   Font eingebettet: %s (KDP-konform)" % F.get("family", F["roman"]))
    else:
        print("   ! WARNUNG: kein TrueType-Serif gefunden - PDF nutzt nicht "
              "eingebettete Standardfonts. KDP verlangt eingebettete Fonts. "
              "Installiere z. B. 'fonts-liberation' und baue neu.")

    innen = os.path.join(args.out, "innenteil-5x8.pdf")
    pages = build_interior(roman, args.kapitel_dir, innen, autor)
    print("OK Innenteil: %s (%d Seiten)" % (innen, pages))

    front = os.path.join(args.cover_dir, "%s-gesamt.jpg" % slug)
    umschlag = os.path.join(args.out, "umschlag-5x8.pdf")
    fw, fh, spine = build_cover(front, pages, umschlag, roman["titel"], autor)
    print("OK Umschlag: %s (%.3f x %.3f Zoll, Ruecken %.3f Zoll)" % (umschlag, fw, fh, spine))

    meta = os.path.join(args.out, "metadaten.md")
    sprache = roman.get("sprache", "Deutsch")
    write_metadata(meta, roman["titel"], autor, pages, fw, fh, spine, sprache=sprache)
    print("OK Metadaten/Anleitung: %s" % meta)
    print("== KDP-Paket fertig in %s ==" % args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
