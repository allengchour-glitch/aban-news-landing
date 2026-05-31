"""
aban news — Pro-Prompt-Pack Generator

Baut aus der bestehenden prompts-bibliothek/data/prompts.json ein sauberes
A4-PDF-Produkt: "Pro-Prompt-Pack — 50+ deutsche KI-Prompts fuer den Arbeitsalltag".

Datenquelle (nur lesen): prompts-bibliothek/data/prompts.json (50 echte Prompts).
Ergaenzt um eine kurze Werkstatt mit selbst geschriebenen Bonus-Prompts und
einer kompakten Anleitung. Nichts Erfundenes, keine Hype-Sprache.

Output:
  downloads/pro-prompt-pack.pdf

Run:  python3 generate_prompt_pack.py
Dep:  pip install reportlab
"""
import os
import json
from collections import OrderedDict

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem,
    Table, TableStyle, KeepTogether,
)

AMBER = HexColor("#d97706")
AMBER_DK = HexColor("#b45309")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")
LINE = HexColor("#e5e7eb")

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "downloads")
DATA = os.path.join(BASE, "prompts-bibliothek", "data", "prompts.json")
os.makedirs(OUT_DIR, exist_ok=True)


# ============================================================
# Styling
# ============================================================
def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverBrand", fontName="Helvetica-Bold",
        fontSize=16, leading=20, textColor=DARK, alignment=TA_CENTER, spaceAfter=24))
    styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold",
        fontSize=38, leading=44, textColor=AMBER, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverSub", fontName="Helvetica",
        fontSize=15, leading=21, textColor=DARK, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverMeta", fontName="Helvetica-Oblique",
        fontSize=10, leading=14, textColor=MID_GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="Chapter", fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=AMBER, spaceBefore=4, spaceAfter=10))
    styles.add(ParagraphStyle(name="SectionH", fontName="Helvetica-Bold",
        fontSize=17, leading=21, textColor=AMBER_DK, spaceBefore=6, spaceAfter=4))
    styles.add(ParagraphStyle(name="H2", fontName="Helvetica-Bold",
        fontSize=13, leading=17, textColor=DARK, spaceBefore=10, spaceAfter=5))
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=DARK, alignment=TA_LEFT, spaceAfter=8))
    styles.add(ParagraphStyle(name="Lead", fontName="Helvetica-Oblique",
        fontSize=11.5, leading=16, textColor=MID_GRAY, spaceAfter=10))
    styles.add(ParagraphStyle(name="Bull", fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=DARK))
    styles.add(ParagraphStyle(name="PromptTitle", fontName="Helvetica-Bold",
        fontSize=12.5, leading=16, textColor=DARK, spaceBefore=2, spaceAfter=2))
    styles.add(ParagraphStyle(name="PromptMeta", fontName="Helvetica-Bold",
        fontSize=8.5, leading=12, textColor=AMBER_DK, spaceAfter=4))
    styles.add(ParagraphStyle(name="PromptText", fontName="Courier",
        fontSize=9.5, leading=13.5, textColor=DARK))
    styles.add(ParagraphStyle(name="Hint", fontName="Helvetica",
        fontSize=9.5, leading=13.5, textColor=MID_GRAY, spaceBefore=3))
    styles.add(ParagraphStyle(name="TocCat", fontName="Helvetica-Bold",
        fontSize=11.5, leading=18, textColor=DARK))
    styles.add(ParagraphStyle(name="TocItem", fontName="Helvetica",
        fontSize=10, leading=15, textColor=MID_GRAY, leftIndent=14))
    return styles


def footer_canvas(canvas_obj, doc):
    if doc.page <= 1:
        return
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.setStrokeColor(LINE)
    canvas_obj.line(1.8 * cm, 1.5 * cm, A4[0] - 1.8 * cm, 1.5 * cm)
    canvas_obj.drawString(1.8 * cm, 1.0 * cm,
                          "aban news  ·  Pro-Prompt-Pack  ·  abannews.com")
    canvas_obj.drawRightString(A4[0] - 1.8 * cm, 1.0 * cm, "%d" % doc.page)
    canvas_obj.restoreState()


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


# ============================================================
# Inhalt: Rahmen-Texte (Aban-Voice, du-Form, anti-hype)
# ============================================================
INTRO_BLOCKS = [
    ("lead", "50+ Prompts, die du sofort kopieren und anpassen kannst. "
             "Keine Theorie, kein Hype — nur Vorlagen fuer Aufgaben, die im "
             "Arbeitsalltag wirklich anfallen."),
    ("h2", "Wie du dieses Pack benutzt"),
    ("p", "Jeder Prompt steht so da, dass du ihn direkt in ChatGPT, Claude, Gemini "
          "oder ein anderes Modell einfuegen kannst. Die Stellen in [eckigen Klammern] "
          "fuellst du selbst aus — mit deinen echten Angaben, nicht mit Platzhaltern. "
          "Je konkreter du wirst, desto brauchbarer ist die Antwort."),
    ("ul", [
        "<b>Suchen statt scrollen:</b> Geh ueber das Inhaltsverzeichnis zur passenden "
        "Kategorie. Die Prompts sind nach Berufen und Aufgaben sortiert.",
        "<b>Anpassen, nicht uebernehmen:</b> Ersetze jede Klammer durch deine echten "
        "Daten. Ein Prompt mit deinem Kontext schlaegt jeden generischen Prompt.",
        "<b>Nachhaken:</b> Die erste Antwort ist ein Entwurf. Sag dem Modell, was fehlt "
        "oder was du anders willst — zwei, drei Runden bringen meist das beste Ergebnis.",
        "<b>Selbst pruefen:</b> Lies jede Ausgabe gegen, bevor du sie verschickst. "
        "Das Modell liefert einen Vorschlag, die Verantwortung bleibt bei dir.",
    ]),
    ("callout", "Faustregel: Rolle, Aufgabe, Kontext, Format. Sag dem Modell, wer es "
                "sein soll, was es tun soll, mit welchen Infos und in welcher Form du "
                "das Ergebnis brauchst. Die meisten Prompts hier folgen genau diesem Muster."),
    ("h2", "Was drin ist"),
    ("p", "Die Prompts stammen aus der offenen Prompt-Bibliothek von aban news und sind "
          "alle selbst geschrieben. In diesem Pack sind sie kuratiert, sauber gesetzt und "
          "um eine kleine Werkstatt am Ende ergaenzt. Du darfst sie privat und im eigenen "
          "Betrieb frei nutzen."),
]

# Selbst geschriebene Bonus-Prompts fuer die Werkstatt (ehrlich, keine Fuellware).
WERKSTATT = [
    {
        "titel": "Einen Prompt aus einer vagen Idee bauen",
        "aufgabe": "Meta",
        "prompt_text": "Ich will eine Aufgabe an ein KI-Modell geben, kann sie aber noch "
                       "nicht praezise formulieren. Hier ist, was ich grob erreichen will: "
                       "[Ziel in einem Satz]. Stell mir maximal fuenf kurze Rueckfragen, die "
                       "noetig sind, um daraus einen guten Prompt zu bauen. Warte meine "
                       "Antworten ab und formuliere danach den fertigen Prompt mit Rolle, "
                       "Aufgabe, Kontext und gewuenschtem Format.",
        "erklaerung": "Wenn du weisst, was du willst, aber nicht, wie du es sagst.",
        "tipp": "Antworte ehrlich und knapp — die Rueckfragen sind das eigentliche Werkzeug.",
    },
    {
        "titel": "Eine Ausgabe gezielt verbessern",
        "aufgabe": "Meta",
        "prompt_text": "Hier ist deine letzte Antwort: [Antwort einfuegen]. Sie ist mir "
                       "[zu lang / zu werblich / zu allgemein / am Thema vorbei]. Schreibe sie "
                       "neu und halte dich an genau diese Vorgaben: [konkrete Vorgabe, z. B. "
                       "hoechstens 150 Woerter, sachlicher Ton, du-Form]. Aendere nichts an "
                       "den Fakten, nur an Laenge und Ton.",
        "erklaerung": "Statt von vorn anzufangen, schaerfst du die vorhandene Antwort.",
        "tipp": "Nenne nur ein bis zwei Aenderungen pro Runde, sonst verwaessert das Ergebnis.",
    },
    {
        "titel": "Fakten in einer Antwort markieren lassen",
        "aufgabe": "Meta",
        "prompt_text": "Beantworte meine Frage und markiere danach in einer kurzen Liste, "
                       "welche Aussagen du sicher belegen kannst und welche Annahmen oder "
                       "Schaetzungen sind. Wenn du etwas nicht weisst, sag es offen, statt zu "
                       "raten. Meine Frage: [Frage].",
        "erklaerung": "Hilft dir einzuschaetzen, was du nachpruefen musst.",
        "tipp": "Pruefe die als sicher markierten Aussagen trotzdem stichprobenartig nach.",
    },
    {
        "titel": "Ein wiederkehrendes Format als Vorlage festhalten",
        "aufgabe": "Meta",
        "prompt_text": "Ich erstelle regelmaessig [Dokumenttyp, z. B. Angebote, "
                       "Statusberichte]. Hier ist ein gelungenes Beispiel: [Beispiel "
                       "einfuegen]. Leite daraus eine wiederverwendbare Vorlage ab: nenne die "
                       "festen Bausteine, markiere die variablen Stellen in eckigen Klammern "
                       "und schreibe einen kurzen Prompt, mit dem ich kuenftig neue Versionen "
                       "erzeugen kann.",
        "erklaerung": "Aus einem guten Einzelfall wird ein Ablauf, den du wiederholen kannst.",
        "tipp": "Speichere die fertige Vorlage in einer Textdatei — dann hast du sie immer griffbereit.",
    },
]


def render_intro(story, styles, blocks):
    for kind, payload in blocks:
        if kind == "lead":
            story.append(Paragraph(payload, styles["Lead"]))
        elif kind == "h2":
            story.append(Paragraph(payload, styles["H2"]))
        elif kind == "p":
            story.append(Paragraph(payload, styles["Body"]))
        elif kind == "callout":
            story.append(_callout(payload))
        elif kind == "ul":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Bull"]), value="•", leftIndent=10)
                 for t in payload],
                bulletType="bullet", bulletColor=AMBER, leftIndent=14, spaceAfter=10))


def _callout(text):
    p = Paragraph(text, ParagraphStyle(
        name="CalloutInner", fontName="Helvetica", fontSize=10, leading=14,
        textColor=DARK))
    t = Table([[p]], colWidths=[A4[0] - 3.6 * cm - 0.6 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.5, AMBER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def prompt_box(styles, p, number):
    """Ein Prompt als zusammenhaengender Block (Titel, Meta, Prompt-Kasten, Tipp)."""
    flow = []
    flow.append(Paragraph("%02d · %s" % (number, esc(p["titel"])),
                          styles["PromptTitle"]))
    meta = "%s  •  %s" % (esc(p["kategorie"]), esc(p["aufgabe"]))
    flow.append(Paragraph(meta.upper(), styles["PromptMeta"]))
    if p.get("erklaerung"):
        flow.append(Paragraph(esc(p["erklaerung"]), styles["Hint"]))
    # Prompt-Text im Kasten
    pt = Paragraph(esc(p["prompt_text"]), styles["PromptText"])
    box = Table([[pt]], colWidths=[A4[0] - 3.6 * cm - 0.5 * cm])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, AMBER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    flow.append(Spacer(1, 0.15 * cm))
    flow.append(box)
    if p.get("tipp"):
        flow.append(Paragraph("<b>Tipp:</b> " + esc(p["tipp"]), styles["Hint"]))
    flow.append(Spacer(1, 0.5 * cm))
    return KeepTogether(flow)


# ============================================================
# Build
# ============================================================
def load_prompts():
    with open(DATA, "r", encoding="utf-8") as f:
        return json.load(f)


def group_by_category(prompts):
    groups = OrderedDict()
    for p in prompts:
        groups.setdefault(p["kategorie"], []).append(p)
    return groups


def build():
    data = load_prompts()
    prompts = data["prompts"]
    groups = group_by_category(prompts)
    styles = make_styles()

    total = len(prompts) + len(WERKSTATT)
    out = os.path.join(OUT_DIR, "pro-prompt-pack.pdf")
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        topMargin=1.8 * cm, bottomMargin=2.0 * cm,
        title="Pro-Prompt-Pack — %d deutsche KI-Prompts" % total,
        author="Aban (Allen Chour) / aban news",
        subject="Kuratierte deutsche KI-Prompts fuer den Arbeitsalltag",
        keywords="KI-Prompts, ChatGPT, Solopreneure, DACH, aban news",
        creator="aban news — abannews.com",
    )

    story = []

    # --- Cover ---
    story.append(Spacer(1, 4.0 * cm))
    story.append(Paragraph("&#9749; aban news", styles["CoverBrand"]))
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("Pro-Prompt-Pack", styles["CoverTitle"]))
    story.append(Paragraph(
        "%d deutsche KI-Prompts fuer deinen Arbeitsalltag" % total,
        styles["CoverSub"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        "Kopieren, Klammern ausfuellen, loslegen. Kein Hype, kein Kurs — "
        "Vorlagen fuer Aufgaben, die wirklich anfallen.",
        ParagraphStyle(name="CoverDesc", fontName="Helvetica-Oblique",
                       fontSize=11, leading=16, textColor=MID_GRAY,
                       alignment=TA_CENTER, spaceAfter=10)))
    story.append(Spacer(1, 1.6 * cm))
    story.append(Paragraph("Ausgabe 2026", styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())

    # --- Inhaltsverzeichnis ---
    story.append(Paragraph("Inhalt", styles["Chapter"]))
    story.append(Spacer(1, 0.2 * cm))
    n = 1
    for cat, items in groups.items():
        story.append(Paragraph("%s  <font color='#6b7280' size='9'>(%d)</font>"
                               % (esc(cat), len(items)), styles["TocCat"]))
        for p in items:
            story.append(Paragraph("%02d · %s" % (n, esc(p["titel"])),
                                   styles["TocItem"]))
            n += 1
        story.append(Spacer(1, 0.25 * cm))
    story.append(Paragraph("Werkstatt: Prompts ueber Prompts  "
                           "<font color='#6b7280' size='9'>(%d)</font>"
                           % len(WERKSTATT), styles["TocCat"]))
    for p in WERKSTATT:
        story.append(Paragraph("%02d · %s" % (n, esc(p["titel"])),
                               styles["TocItem"]))
        n += 1
    story.append(PageBreak())

    # --- Einleitung ---
    story.append(Paragraph("Bevor du loslegst", styles["Chapter"]))
    render_intro(story, styles, INTRO_BLOCKS)
    story.append(PageBreak())

    # --- Prompts nach Kategorie ---
    n = 1
    for cat, items in groups.items():
        story.append(Paragraph(esc(cat), styles["SectionH"]))
        story.append(Spacer(1, 0.25 * cm))
        for p in items:
            story.append(prompt_box(styles, p, n))
            n += 1
        story.append(PageBreak())

    # --- Werkstatt ---
    story.append(Paragraph("Werkstatt: Prompts ueber Prompts", styles["SectionH"]))
    story.append(Paragraph(
        "Vier Prompts, die dir helfen, aus jedem anderen mehr herauszuholen — "
        "und eigene Vorlagen zu bauen.", styles["Lead"]))
    story.append(Spacer(1, 0.2 * cm))
    for p in WERKSTATT:
        p2 = dict(p)
        p2["kategorie"] = "Werkstatt"
        story.append(prompt_box(styles, p2, n))
        n += 1

    # --- Abschluss ---
    story.append(Spacer(1, 0.4 * cm))
    story.append(_callout(
        "Das war es — fuer den Moment. Wenn du taeglich mitbekommen willst, was "
        "sich bei KI wirklich bewegt: aban news, Mo bis Fr, fuenf Minuten, "
        "abannews.com. Kein Hype, kein Spam."))

    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print("✓ downloads/pro-prompt-pack.pdf erstellt (%d Prompts)" % total)


if __name__ == "__main__":
    build()
