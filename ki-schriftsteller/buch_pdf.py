#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Buch-PDF - rendert die geschriebenen Kapitel als hochwertige PDF-Buecher (reportlab).

Premium-Satz: Vollbild-Cover (falls vorhanden), Titelseite mit Autor,
Band-Trennseiten mit Label/Epoche, Versal-Initiale am Kapitelanfang, laufende
Kopfzeile + Seitenzahlen, Kolophon. Liest Kapitel ueber dieselben Helfer wie
buch_bauen (eine Quelle der Wahrheit).

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
                                    Paragraph, Spacer, PageBreak, Image,
                                    NextPageTemplate)
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
    s = {}
    s["body"] = ParagraphStyle("Body", parent=ss["Normal"], fontName="Times-Roman",
                               fontSize=11, leading=16.5, alignment=TA_JUSTIFY,
                               firstLineIndent=5 * mm, textColor=INK)
    s["first"] = ParagraphStyle("First", parent=s["body"], firstLineIndent=0, spaceBefore=2)
    s["orn"] = ParagraphStyle("Orn", parent=ss["Normal"], fontName="Times-Roman",
                              fontSize=12, leading=14, textColor=AMBER, alignment=TA_CENTER,
                              spaceBefore=2 * mm, spaceAfter=1 * mm)
    s["h2"] = ParagraphStyle("Kapitel", parent=ss["Heading2"], fontName="Times-Bold",
                             fontSize=15, leading=19, textColor=AMBER_DK, alignment=TA_CENTER,
                             spaceBefore=2 * mm, spaceAfter=7 * mm, keepWithNext=True)
    s["bandlabel"] = ParagraphStyle("BandLabel", parent=ss["Normal"], fontName="Times-Roman",
                                    fontSize=12, leading=16, textColor=AMBER_DK, alignment=TA_CENTER)
    s["band"] = ParagraphStyle("Band", parent=ss["Heading1"], fontName="Times-Bold",
                               fontSize=24, leading=30, textColor=AMBER, alignment=TA_CENTER)
    s["epoch"] = ParagraphStyle("Epoch", parent=ss["Normal"], fontName="Times-Italic",
                                fontSize=12, leading=16, textColor=MUTED, alignment=TA_CENTER)
    s["title"] = ParagraphStyle("Titel", parent=ss["Title"], fontName="Times-Bold",
                                fontSize=30, leading=35, textColor=AMBER, alignment=TA_CENTER)
    s["sub"] = ParagraphStyle("Sub", parent=ss["Normal"], fontName="Times-Italic",
                              fontSize=14, leading=19, textColor=INK, alignment=TA_CENTER)
    s["author"] = ParagraphStyle("Autor", parent=ss["Normal"], fontName="Times-Roman",
                                 fontSize=12, leading=16, textColor=INK, alignment=TA_CENTER)
    s["fine"] = ParagraphStyle("Fine", parent=ss["Normal"], fontName="Times-Roman",
                               fontSize=9.5, leading=14, textColor=MUTED, alignment=TA_CENTER)
    return s


def baue_pdf(gesamttitel, genre, gruppen, pfad, autor="aban news", cover_pfad=None):
    s = _styles()
    has_cover = bool(cover_pfad and os.path.exists(cover_pfad))

    def deco(c, d):
        """Laufende Kopfzeile (ab Seite 3) + Seitenzahl unten."""
        c.saveState()
        c.setFont("Times-Roman", 8)
        c.setFillColor(MUTED)
        c.drawCentredString(A5[0] / 2.0, 10 * mm, str(c.getPageNumber()))
        if c.getPageNumber() >= 3:
            c.setFont("Times-Italic", 8)
            c.drawCentredString(A5[0] / 2.0, A5[1] - 12 * mm, gesamttitel)
            c.setStrokeColor(HexColor("#e5e7eb"))
            c.line(22 * mm, A5[1] - 14 * mm, A5[0] - 22 * mm, A5[1] - 14 * mm)
        c.restoreState()

    def draw_cover(c, d):
        try:
            c.drawImage(cover_pfad, 0, 0, width=A5[0], height=A5[1])
        except Exception:
            pass

    doc = BaseDocTemplate(pfad, pagesize=A5,
                          leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=18 * mm, bottomMargin=16 * mm,
                          title=gesamttitel, author=autor)
    plain_frame = Frame(0, 0, A5[0], A5[1], id="plain",
                        leftPadding=20 * mm, rightPadding=20 * mm,
                        topPadding=24 * mm, bottomPadding=24 * mm)
    main_frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    cover_frame = Frame(0, 0, A5[0], A5[1], id="cover",
                        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    templates = []
    if has_cover:
        templates.append(PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover))
    templates.append(PageTemplate(id="plain", frames=[plain_frame]))   # Titelseite (kein Deko)
    templates.append(PageTemplate(id="main", frames=[main_frame], onPage=deco))
    doc.addPageTemplates(templates)

    story = []
    # --- Cover (Vollbild, per Canvas gezeichnet) ---
    if has_cover:
        story.append(NextPageTemplate("plain"))
        story.append(PageBreak())   # Seite 1 = Cover (von draw_cover gezeichnet)

    # --- Titelseite ---
    story.append(Spacer(1, 52 * mm))
    story.append(Paragraph(_esc(gesamttitel), s["title"]))
    story.append(Spacer(1, 5 * mm))
    if genre:
        story.append(Paragraph(_esc(genre), s["sub"]))
    story.append(Spacer(1, 26 * mm))
    story.append(Paragraph(_esc(autor), s["author"]))
    story.append(Paragraph("geschrieben mit Claude Opus · aban news", s["fine"]))
    story.append(NextPageTemplate("main"))
    story.append(PageBreak())

    for g in gruppen:
        if g["bandtitel"]:
            story.append(Spacer(1, 52 * mm))
            if g.get("label"):
                story.append(Paragraph(_esc(g["label"]).upper(), s["bandlabel"]))
            story.append(Paragraph(_esc(g["bandtitel"]), s["band"]))
            if g.get("epoch"):
                story.append(Paragraph(_esc(g["epoch"]), s["epoch"]))
            story.append(PageBreak())
        for kap in g["kapitel"]:
            ueberschrift = _ueberschrift_fuer(kap)
            _, absaetze = teile_kapitel(kap["text"])
            story.append(Paragraph("·  ·  ·", s["orn"]))
            story.append(Paragraph(_esc(ueberschrift), s["h2"]))
            for i, a in enumerate(absaetze):
                if i == 0 and a:
                    # Versal-Initiale: erster Buchstabe gross + amber.
                    markup = ('<font size="30" color="#b45309"><b>%s</b></font>%s'
                              % (_esc(a[0]), _esc(a[1:])))
                    story.append(Paragraph(markup, s["first"]))
                else:
                    story.append(Paragraph(_esc(a), s["body"]))
            story.append(PageBreak())

    # --- Kolophon ---
    story.append(Spacer(1, 70 * mm))
    story.append(Paragraph("Über dieses Buch", s["bandlabel"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("<i>%s</i>" % _esc(gesamttitel), s["fine"]))
    story.append(Paragraph("Ein Schreib-Experiment von aban news, Kapitel für Kapitel "
                           "mit Claude Opus verfasst und redigiert.", s["fine"]))
    story.append(Paragraph("Riedmatt, der Stausee und alle Figuren sind erfunden; "
                           "Ähnlichkeiten mit realen Orten oder Personen sind Zufall.", s["fine"]))
    story.append(Paragraph("© 2026 aban news · Allen Chour, Belp (CH) · abannews.com", s["fine"]))

    doc.build(story)


def schreibe_pdf(out_dir, slug, gesamttitel, genre, gruppen, autor="aban news", cover_pfad=None):
    pfad = os.path.join(out_dir, "%s.pdf" % slug)
    baue_pdf(gesamttitel, genre, gruppen, pfad, autor, cover_pfad)
    cov = " (+Cover)" if cover_pfad and os.path.exists(cover_pfad) else ""
    print("OK PDF geschrieben: %s%s" % (pfad, cov))


def main():
    p = argparse.ArgumentParser(description="Rendert die Kapitel als PDF-Buecher.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"))
    p.add_argument("--kapitel-dir", default=os.path.join(HIER, "kapitel"))
    p.add_argument("--out", default=os.path.join(HIER, "ausgabe"))
    p.add_argument("--cover-dir", default=os.path.join(HIER, "..", "img", "covers"))
    args = p.parse_args()

    roman = lade_roman(args.roman)
    baende = baende_aus_roman(roman)
    einzelbuch = not ist_trilogie(roman)
    slug = slugify(roman["titel"])
    genre = roman.get("genre", "")
    autor = roman.get("autor", "aban news")
    LABELS = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}

    def cover_fuer(artslug):
        c = os.path.join(args.cover_dir, "%s.jpg" % artslug)
        return c if os.path.exists(c) else None

    band_kapitel = {b["nummer"]: lies_kapitel(args.kapitel_dir, b, einzelbuch)
                    for b in baende}
    if sum(len(v) for v in band_kapitel.values()) == 0:
        print("Noch keine Kapitel gefunden - nichts zu bauen.")
        return 0
    os.makedirs(args.out, exist_ok=True)

    if einzelbuch:
        gruppen = [{"bandtitel": None, "kapitel": band_kapitel[baende[0]["nummer"]]}]
        schreibe_pdf(args.out, slug, roman["titel"], genre, gruppen, autor, cover_fuer(slug))
        return 0

    for b in baende:
        kaps = band_kapitel[b["nummer"]]
        if not kaps:
            continue
        bandslug = "%s-band-%02d" % (slug, b["nummer"])
        gruppen = [{"bandtitel": None, "kapitel": kaps}]
        schreibe_pdf(args.out, bandslug, "%s - %s" % (roman["titel"], b["titel"]),
                     genre, gruppen, autor, cover_fuer(bandslug))

    omnibus = [{"bandtitel": b["titel"],
                "label": LABELS.get(b["nummer"], "Band %d" % b["nummer"]),
                "epoch": b.get("untertitel", ""),
                "kapitel": band_kapitel[b["nummer"]]}
               for b in baende if band_kapitel[b["nummer"]]]
    schreibe_pdf(args.out, "%s-gesamt" % slug, roman["titel"], genre, omnibus,
                 autor, cover_fuer("%s-gesamt" % slug))
    print("== %s: PDF(s) erzeugt ==" % roman["titel"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
