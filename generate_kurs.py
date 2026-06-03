#!/usr/bin/env python3
"""
aban news — Kurs-Generator: "Die KI-Werkstatt".

Erzeugt das vollständige Kurs-PDF, das Käufer von kurs.html bekommen.
Inhalt liegt modular als JSON in kurs_content/ (eine Datei pro Abschnitt,
nach Dateiname sortiert). So lässt sich der Kurs beliebig erweitern, ohne
den Generator anzufassen.

Block-Format je Abschnitt-JSON:
  {"title": str, "kicker": str, "toc": bool, "kind": "front|modul|bonus|back",
   "blocks": [["lead"|"h3"|"p"|"callout"|"code"|"ul"|"ol"|"space", payload], ...]}
  payload ist ein String, bei "ul"/"ol" eine Liste von Strings.

Output:  downloads/ki-werkstatt-kurs.pdf
Run:     python3 generate_kurs.py
Dep:     pip install reportlab
"""
import json
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem,
)

AMBER = HexColor("#d97706")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "downloads")
CONTENT_DIR = os.path.join(ROOT, "kurs_content")
os.makedirs(OUT_DIR, exist_ok=True)

TITLE = "Die KI-Werkstatt"
SUBTITLE = "Wie du als Solo-Profi im DACH-Raum KI im Arbeitsalltag nutzt — ohne Hype."


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold",
        fontSize=40, leading=44, textColor=AMBER, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverSub", fontName="Helvetica",
        fontSize=15, leading=20, textColor=DARK, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverMeta", fontName="Helvetica-Oblique",
        fontSize=10, leading=14, textColor=MID_GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="Chapter", fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=AMBER, spaceBefore=4, spaceAfter=6))
    styles.add(ParagraphStyle(name="Kicker", fontName="Helvetica-Bold",
        fontSize=10, leading=13, textColor=MID_GRAY, spaceAfter=2))
    styles.add(ParagraphStyle(name="H2", fontName="Helvetica-Bold",
        fontSize=14, leading=18, textColor=DARK, spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=DARK, alignment=TA_LEFT, spaceAfter=8))
    styles.add(ParagraphStyle(name="Lead", fontName="Helvetica-Oblique",
        fontSize=12, leading=17, textColor=MID_GRAY, spaceAfter=12))
    styles.add(ParagraphStyle(name="Bull", fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=DARK))
    styles.add(ParagraphStyle(name="Callout", fontName="Helvetica-Bold",
        fontSize=11, leading=15, textColor=DARK, backColor=CREAM,
        borderColor=AMBER, borderWidth=0.5, borderPadding=8,
        leftIndent=2, rightIndent=2, spaceBefore=6, spaceAfter=10))
    styles.add(ParagraphStyle(name="CodeBox", fontName="Courier",
        fontSize=9.5, leading=13, textColor=DARK, backColor=LIGHT_GRAY,
        borderColor=HexColor("#d1d5db"), borderWidth=0.5, borderPadding=8,
        leftIndent=2, rightIndent=2, spaceBefore=4, spaceAfter=10))
    styles.add(ParagraphStyle(name="TocItem", fontName="Helvetica",
        fontSize=11, leading=18, textColor=DARK))
    return styles


def footer_canvas(canvas_obj, doc):
    if doc.page <= 1:
        return
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.setStrokeColor(LIGHT_GRAY)
    canvas_obj.line(1.5 * cm, 1.5 * cm, A4[0] - 1.5 * cm, 1.5 * cm)
    canvas_obj.drawString(1.5 * cm, 1.0 * cm, "Die KI-Werkstatt  ·  aban news  ·  abannews.com")
    canvas_obj.drawRightString(A4[0] - 1.5 * cm, 1.0 * cm, "%d" % doc.page)
    canvas_obj.restoreState()


def render_blocks(story, styles, blocks):
    for kind, payload in blocks:
        if kind == "lead":
            story.append(Paragraph(payload, styles["Lead"]))
        elif kind == "h3":
            story.append(Paragraph(payload, styles["H2"]))
        elif kind == "p":
            story.append(Paragraph(payload, styles["Body"]))
        elif kind == "callout":
            story.append(Paragraph(payload, styles["Callout"]))
        elif kind == "code":
            story.append(Paragraph(payload.replace("\n", "<br/>"), styles["CodeBox"]))
        elif kind == "ul":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Bull"]), value="•", leftIndent=10)
                 for t in payload],
                bulletType="bullet", bulletColor=AMBER, leftIndent=14, spaceAfter=10,
            ))
        elif kind == "ol":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Bull"]), leftIndent=10) for t in payload],
                bulletType="1", bulletColor=AMBER, leftIndent=16, spaceAfter=10,
            ))
        elif kind == "space":
            story.append(Spacer(1, 0.3 * cm))


def load_sections():
    files = sorted(f for f in os.listdir(CONTENT_DIR) if f.endswith(".json"))
    sections = []
    for f in files:
        with open(os.path.join(CONTENT_DIR, f), encoding="utf-8") as fh:
            sections.append(json.load(fh))
    return sections


def build():
    styles = make_styles()
    sections = load_sections()
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, "ki-werkstatt-kurs.pdf"), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2.2 * cm,
        title="%s — %s" % (TITLE, SUBTITLE),
        author="Aban / aban news",
        subject="KI-Kurs für deutschsprachige Solo-Profis",
        keywords="KI, Kurs, DACH, Solopreneure, DSGVO, Prompten, Automatisierung",
        creator="aban news — abannews.com",
    )
    story = []
    # Cover
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("&#128296;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=58, alignment=TA_CENTER, textColor=AMBER)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=16,
        alignment=TA_CENTER, textColor=DARK, spaceAfter=24)))
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph(TITLE, styles["CoverTitle"]))
    story.append(Paragraph(SUBTITLE, styles["CoverSub"]))
    story.append(Spacer(1, 1.5 * cm))
    n_modul = sum(1 for s in sections if s.get("kind") == "modul")
    n_bonus = sum(1 for s in sections if s.get("kind") == "bonus")
    story.append(Paragraph("Ein Kurs in %d Modulen + %d Bonus-Paketen" % (n_modul, n_bonus),
                           styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())
    # Inhalt (TOC)
    story.append(Paragraph("Inhalt", styles["Chapter"]))
    modn = 0
    for s in sections:
        if not s.get("toc", True):
            continue
        if s.get("kind") == "modul":
            modn += 1
            label = "%02d" % modn
        elif s.get("kind") == "bonus":
            label = "B"
        else:
            label = "·"
        kicker = (" <font color='#6b7280'>%s</font>" % s["kicker"]) if s.get("kicker") else ""
        story.append(Paragraph(
            "<font color='#d97706'><b>%s</b></font>&nbsp;&nbsp;%s%s" % (label, s["title"], kicker),
            styles["TocItem"]))
    story.append(PageBreak())
    # Abschnitte
    for s in sections:
        if s.get("kicker"):
            story.append(Paragraph(s["kicker"], styles["Kicker"]))
        story.append(Paragraph(s["title"], styles["Chapter"]))
        render_blocks(story, styles, s["blocks"])
        story.append(PageBreak())
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    pages = doc.page
    print("✓ downloads/ki-werkstatt-kurs.pdf erstellt (%d Abschnitte, %d Module, %d Bonus, ~%d Seiten)"
          % (len(sections), n_modul, n_bonus, pages))


if __name__ == "__main__":
    build()
