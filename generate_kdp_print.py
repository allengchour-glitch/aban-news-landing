#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_kdp_print.py — Baut die druckfertige Buch-Innenseite (Interior) für
Amazon KDP als Taschenbuch.

Usage:
    python3 generate_kdp_print.py            # nur Deutsch (Standard)
    python3 generate_kdp_print.py de en      # bestimmte Sprachen

Output:
    downloads/anti-hype-print-de.pdf         (Standard, Deutsch)
    downloads/anti-hype-print-<lang>.pdf     (weitere Sprachen)

Trim-Size (Endformat): 5" x 8" (12,7 x 20,32 cm) — eine Standard-KDP-Trade-Größe.
Das ist bewusst KEIN A4. Die Seite ist 360 x 576 pt groß.

Ränder (KDP-Vorgabe für Bücher unter 150 Seiten: innen/Bund >= 0,375",
außen/oben/unten >= 0,25"). Hier werden großzügige, sichere Ränder verwendet:
innen (Bund) 0,6", außen 0,5", oben 0,6", unten 0,6". Die Ränder werden für
gerade/ungerade Seiten gespiegelt (mirror gutter), damit der Bund (die innere,
zur Bindung zeigende Kante) auf jeder Seite genug Platz behält.

WICHTIG — Cover: Das Cover (Wraparound mit Buchrücken/Spine) wird NICHT von
diesem Skript erzeugt. Es muss separat im KDP-Cover-Tool angelegt werden,
sobald die finale Seitenzahl feststeht (die Rückenbreite hängt von Seitenzahl
und Papiertyp ab). Dieses Skript baut ausschließlich das Interior (den
Buchinhalt) inkl. einfacher Titelseite, Inhaltsverzeichnis und Kapiteln.

Single Source of Truth: Der Buchinhalt wird aus generate_ebook.py importiert
(CONTENT + render_blocks), damit Print- und eBook-Version nie auseinanderdriften.
generate_ebook.py wird dabei NICHT verändert.

Abhängigkeiten: reportlab. Kein Netzwerkzugriff.
"""
import os
import sys

from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, Paragraph, Spacer, PageBreak, NextPageTemplate,
    Frame, PageTemplate,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Single Source of Truth: Inhalt + Block-Rendering aus dem eBook-Skript.
# WICHTIG: render_blocks(story, styles, blocks) mutiert die übergebene
# story-Liste und gibt None zurück (siehe generate_ebook.py).
# render_blocks erwartet die Style-Namen: Lead, H2, Body, Callout, Bull.
from generate_ebook import (
    CONTENT, render_blocks,
    AMBER, DARK, CREAM, MID_GRAY,
)
from generate_ebook import _esc  # nur "&" -> "&amp;", lässt <b>…</b> intakt

# ────────────────────────────────────────────────────────────────────────────
#  Trim-Size & Ränder (KDP Taschenbuch)
# ────────────────────────────────────────────────────────────────────────────
PAGE_W = 5 * inch          # 360 pt
PAGE_H = 8 * inch          # 576 pt
PAGESIZE = (PAGE_W, PAGE_H)

# Ränder (siehe Modul-Docstring). Bund = innen, pro Seite gespiegelt.
MARGIN_INNER  = 0.6 * inch   # Bund (gutter) — innere Kante
MARGIN_OUTER  = 0.5 * inch   # äußere Kante
MARGIN_TOP    = 0.6 * inch
MARGIN_BOTTOM = 0.6 * inch

AUTHOR = "Aban (Allen Chour)"


# ────────────────────────────────────────────────────────────────────────────
#  Styles — kleinere Schriftgrößen, passend für 5x8" (statt der A4-Styles aus
#  generate_ebook). Die Style-NAMEN entsprechen exakt denen, die render_blocks
#  erwartet (Lead, H2, Body, Callout, Bull), damit das Block-Handling 1:1
#  wiederverwendet werden kann. Zusätzliche Namen für Cover/TOC/Kapitelköpfe.
# ────────────────────────────────────────────────────────────────────────────
def make_print_styles():
    """Stylesheet für das 5x8"-Print-Interior (kleiner als die A4-Styles)."""
    styles = getSampleStyleSheet()

    def add(name, **kw):
        if name in styles.byName:
            st = styles[name]
            for k, v in kw.items():
                setattr(st, k, v)
        else:
            styles.add(ParagraphStyle(name=name, **kw))
        return styles[name]

    # Cover / Titelseite
    add("Title", fontName="Helvetica-Bold", fontSize=30, leading=34,
        textColor=AMBER, spaceAfter=10, alignment=TA_CENTER)
    add("Subtitle", fontName="Helvetica", fontSize=13, leading=18,
        textColor=DARK, spaceAfter=20, alignment=TA_CENTER)
    add("Author", fontName="Helvetica-Oblique", fontSize=11, leading=15,
        textColor=MID_GRAY, spaceAfter=4, alignment=TA_CENTER)

    # Kapitelköpfe + TOC
    add("ChapterNum", fontName="Helvetica-Bold", fontSize=10, leading=13,
        textColor=AMBER, spaceAfter=4, alignment=TA_LEFT)
    add("ChapterTitle", fontName="Helvetica-Bold", fontSize=18, leading=22,
        textColor=AMBER, spaceAfter=12, alignment=TA_LEFT)
    add("TOCItem", fontName="Helvetica", fontSize=10.5, leading=19,
        textColor=DARK, alignment=TA_LEFT)

    # Block-Styles, exakt die Namen, die render_blocks nutzt:
    add("Lead", fontName="Helvetica-Oblique", fontSize=11, leading=16,
        textColor=MID_GRAY, spaceAfter=10, alignment=TA_LEFT)
    add("H2", fontName="Helvetica-Bold", fontSize=12.5, leading=16,
        textColor=DARK, spaceBefore=12, spaceAfter=5, alignment=TA_LEFT)
    add("Body", fontName="Helvetica", fontSize=10, leading=14.5,
        textColor=DARK, spaceAfter=8, alignment=TA_JUSTIFY)
    add("Bull", fontName="Helvetica", fontSize=10, leading=14.5,
        textColor=DARK, alignment=TA_LEFT)
    add("Callout", fontName="Helvetica-Bold", fontSize=10.5, leading=15,
        textColor=DARK, backColor=CREAM, borderColor=AMBER, borderWidth=0.5,
        borderPadding=8, leftIndent=2, rightIndent=2, spaceBefore=6,
        spaceAfter=10, alignment=TA_LEFT)
    return styles


# ────────────────────────────────────────────────────────────────────────────
#  Fußzeile mit Seitenzahl (lokal adaptiert von generate_ebook.footer_canvas).
#  Die Seitenzahl steht außen (gespiegelt für gerade/ungerade Seiten), wie bei
#  gedruckten Büchern üblich. Die Titelseite bleibt ohne Zahl.
# ────────────────────────────────────────────────────────────────────────────
def footer_print_canvas(canvas, doc):
    page = canvas.getPageNumber()
    if page < 2:  # Titelseite ohne Seitenzahl
        return
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MID_GRAY)
    y = MARGIN_BOTTOM * 0.5
    # Ungerade Seiten = rechte Buchseite (Zahl außen rechts),
    # gerade Seiten = linke Buchseite (Zahl außen links).
    if page % 2 == 1:
        canvas.drawRightString(PAGE_W - MARGIN_OUTER, y, str(page))
    else:
        canvas.drawString(MARGIN_OUTER, y, str(page))
    canvas.restoreState()


# ────────────────────────────────────────────────────────────────────────────
#  Page-Templates mit gespiegeltem Bund (mirror gutter).
#  reportlab wechselt die Templates über NextPageTemplate(["odd","even",...]),
#  das die Liste zyklisch durchläuft — so bekommt jede Seite den korrekten
#  Frame (ungerade: Bund links, gerade: Bund rechts).
# ────────────────────────────────────────────────────────────────────────────
def _frame(left_margin, right_margin):
    width = PAGE_W - left_margin - right_margin
    height = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM
    return Frame(left_margin, MARGIN_BOTTOM, width, height,
                 leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)


def build_print_pdf(lang, content, out_path):
    """Baut ein druckfertiges 5x8"-Interior-PDF für eine Sprache."""
    styles = make_print_styles()

    doc = BaseDocTemplate(
        out_path, pagesize=PAGESIZE,
        title="%s — %s" % (content["title"], content["subtitle"]),
        author=AUTHOR,
        subject=content.get("subject", ""),
        keywords=content.get("keywords", ""),
        creator="aban news — abannews.com",
    )

    # Ungerade Seiten (rechts): Bund links. Gerade Seiten (links): Bund rechts.
    odd_frame = _frame(MARGIN_INNER, MARGIN_OUTER)
    even_frame = _frame(MARGIN_OUTER, MARGIN_INNER)
    doc.addPageTemplates([
        PageTemplate(id="odd", frames=[odd_frame], onPage=footer_print_canvas),
        PageTemplate(id="even", frames=[even_frame], onPage=footer_print_canvas),
    ])

    story = []
    # Ab Seite 2 zyklisch odd/even wechseln (Seite 1 = Titel nutzt "odd").
    story.append(NextPageTemplate(["even", "odd"]))

    # ── Titelseite (einfach) ─────────────────────────────────
    story.append(Spacer(1, 1.8 * inch))
    story.append(Paragraph(_esc(content["title"]), styles["Title"]))
    story.append(Paragraph(_esc(content["subtitle"]), styles["Subtitle"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(_esc(content.get("edition", "")), styles["Author"]))
    story.append(Paragraph(AUTHOR + " · abannews.com", styles["Author"]))
    story.append(PageBreak())

    # ── Inhaltsverzeichnis ───────────────────────────────────
    story.append(Paragraph(_esc(content.get("toc_title", "Inhalt")),
                           styles["ChapterTitle"]))
    for i, ch in enumerate(content["chapters"], 1):
        story.append(Paragraph(
            '<font color="#d97706"><b>%02d</b></font>&nbsp;&nbsp;%s'
            % (i, _esc(ch["title"])), styles["TOCItem"]))
    story.append(PageBreak())

    # ── Kapitel (Inhalt aus generate_ebook via render_blocks) ─
    # render_blocks mutiert die story-Liste in place und gibt None zurück.
    for i, ch in enumerate(content["chapters"], 1):
        story.append(Paragraph("Kapitel %d" % i, styles["ChapterNum"]))
        story.append(Paragraph(_esc(ch["title"]), styles["ChapterTitle"]))
        render_blocks(story, styles, ch["blocks"])
        story.append(PageBreak())

    doc.build(story)
    print("  ok  PDF  %s" % out_path)


def main():
    langs = [a for a in sys.argv[1:] if not a.startswith("-")] or ["de"]
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "downloads")
    os.makedirs(out_dir, exist_ok=True)

    for lang in langs:
        content = CONTENT.get(lang)
        if not content:
            print("  übersprungen: keine Inhalte für Sprache '%s'" % lang)
            continue
        out_path = os.path.join(out_dir, "anti-hype-print-%s.pdf" % lang)
        build_print_pdf(lang, content, out_path)


if __name__ == "__main__":
    main()
