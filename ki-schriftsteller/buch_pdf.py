#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Buch-PDF - rendert die geschriebenen Kapitel als lesbare PDF-Buecher (reportlab).

Ergaenzt buch_bauen.py (das Markdown + EPUB3 stdlib-only erzeugt) um eine
PDF-Ausgabe im Brand-Look (Serifenschrift, amberfarbene Ueberschriften,
Blocksatz). Liest Kapitel ueber dieselben Helfer wie buch_bauen (eine Quelle
der Wahrheit fuer Chapter-Reading und Band-Normalisierung).

Einzelbuch:  ausgabe/<slug>.pdf
Trilogie:    ausgabe/<slug>-band-0N.pdf je Band + ausgabe/<slug>-gesamt.pdf

Verwendung:
  python3 buch_pdf.py --roman roman-drama-trilogie.json
Dep:
  pip install reportlab
"""
import argparse
import os
import sys

try:
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame,
                                    Paragraph, Spacer, PageBreak)
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install reportlab")

from roman_util import lade_roman, slugify, baende_aus_roman, ist_trilogie
from buch_bauen import lies_kapitel, teile_kapitel, _ueberschrift_fuer

HIER = os.path.dirname(os.path.abspath(__file__))

AMBER = HexColor("#d97706")
AMBER_DK = HexColor("#b45309")
INK = HexColor("#1f2937")
MUTED = HexColor("#6b7280")


def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _styles():
    ss = getSampleStyleSheet()
    body = ParagraphStyle("Body", parent=ss["Normal"], fontName="Times-Roman",
                          fontSize=11, leading=16.5, alignment=TA_JUSTIFY,
                          firstLineIndent=5 * mm, textColor=INK, spaceAfter=0)
    h2 = ParagraphStyle("Kapitel", parent=ss["Heading2"], fontName="Times-Bold",
                        fontSize=15, leading=19, textColor=AMBER_DK,
                        spaceBefore=2 * mm, spaceAfter=6 * mm, keepWithNext=True)
    band = ParagraphStyle("Band", parent=ss["Heading1"], fontName="Times-Bold",
                          fontSize=22, leading=27, textColor=AMBER,
                          alignment=TA_CENTER)
    title = ParagraphStyle("Titel", parent=ss["Title"], fontName="Times-Bold",
                           fontSize=28, leading=33, textColor=AMBER, alignment=TA_CENTER)
    sub = ParagraphStyle("Sub", parent=ss["Normal"], fontName="Times-Italic",
                         fontSize=13, leading=18, textColor=INK, alignment=TA_CENTER)
    author = ParagraphStyle("Autor", parent=ss["Normal"], fontName="Times-Roman",
                            fontSize=11, leading=15, textColor=MUTED, alignment=TA_CENTER)
    return body, h2, band, title, sub, author


def _fuss(c, d):
    """Fusszeile: Seitenzahl, zentriert, dezent."""
    c.saveState()
    c.setFont("Times-Roman", 8)
    c.setFillColor(MUTED)
    c.drawCentredString(A5[0] / 2.0, 10 * mm, str(c.getPageNumber()))
    c.restoreState()


def baue_pdf(gesamttitel, genre, gruppen, pfad):
    """Baut ein PDF-Buch aus Gruppen ({bandtitel: str|None, kapitel: [...]})."""
    body, h2, band, title, sub, author = _styles()
    doc = BaseDocTemplate(pfad, pagesize=A5,
                          leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=18 * mm, bottomMargin=18 * mm,
                          title=gesamttitel, author="aban news")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_fuss)])

    story = []
    # --- Titelseite ---
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph(_esc(gesamttitel), title))
    story.append(Spacer(1, 6 * mm))
    if genre:
        story.append(Paragraph(_esc(genre), sub))
    story.append(Spacer(1, 24 * mm))
    story.append(Paragraph("von [Autor]", author))
    story.append(PageBreak())

    mehrband = any(g["bandtitel"] for g in gruppen)
    for g in gruppen:
        if g["bandtitel"]:
            story.append(Spacer(1, 60 * mm))
            story.append(Paragraph(_esc(g["bandtitel"]), band))
            story.append(PageBreak())
        for i, kap in enumerate(g["kapitel"]):
            ueberschrift = _ueberschrift_fuer(kap)
            _, absaetze = teile_kapitel(kap["text"])
            story.append(Paragraph(_esc(ueberschrift), h2))
            for a in absaetze:
                story.append(Paragraph(_esc(a), body))
            story.append(PageBreak())

    doc.build(story)


def schreibe_pdf(out_dir, slug, gesamttitel, genre, gruppen):
    pfad = os.path.join(out_dir, "%s.pdf" % slug)
    baue_pdf(gesamttitel, genre, gruppen, pfad)
    print("OK PDF geschrieben: %s" % pfad)


def main():
    p = argparse.ArgumentParser(description="Rendert die Kapitel als PDF-Buecher.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"))
    p.add_argument("--kapitel-dir", default=os.path.join(HIER, "kapitel"))
    p.add_argument("--out", default=os.path.join(HIER, "ausgabe"))
    args = p.parse_args()

    roman = lade_roman(args.roman)
    baende = baende_aus_roman(roman)
    einzelbuch = not ist_trilogie(roman)
    slug = slugify(roman["titel"])
    genre = roman.get("genre", "")

    band_kapitel = {b["nummer"]: lies_kapitel(args.kapitel_dir, b, einzelbuch)
                    for b in baende}
    if sum(len(v) for v in band_kapitel.values()) == 0:
        print("Noch keine Kapitel gefunden - nichts zu bauen.")
        return 0
    os.makedirs(args.out, exist_ok=True)

    if einzelbuch:
        gruppen = [{"bandtitel": None, "kapitel": band_kapitel[baende[0]["nummer"]]}]
        schreibe_pdf(args.out, slug, roman["titel"], genre, gruppen)
        return 0

    for b in baende:
        kaps = band_kapitel[b["nummer"]]
        if not kaps:
            continue
        gruppen = [{"bandtitel": None, "kapitel": kaps}]
        schreibe_pdf(args.out, "%s-band-%02d" % (slug, b["nummer"]),
                     "%s - %s" % (roman["titel"], b["titel"]), genre, gruppen)

    omnibus = [{"bandtitel": b["titel"], "kapitel": band_kapitel[b["nummer"]]}
               for b in baende if band_kapitel[b["nummer"]]]
    schreibe_pdf(args.out, "%s-gesamt" % slug, roman["titel"], genre, omnibus)
    print("== %s: PDF(s) erzeugt ==" % roman["titel"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
