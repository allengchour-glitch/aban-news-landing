"""
aban news — eBook Generator (mehrsprachig: de/en/fr/it)

"Anti-Hype — Wie deutsche Solopreneure KI ohne Bullshit einsetzen."
Datengetrieben: ein Content-Dict pro Sprache, ein generischer Renderer.

Output:
  downloads/anti-hype-ebook.pdf        (de)
  downloads/anti-hype-ebook-en.pdf     (en)
  downloads/anti-hype-ebook-fr.pdf     (fr)
  downloads/anti-hype-ebook-it.pdf     (it)

Run:  python3 generate_ebook.py            # alle Sprachen
      python3 generate_ebook.py de en      # nur ausgewählte
Dep:  pip install reportlab
"""
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem,
    Image as RLImage,
)
from reportlab.lib.utils import ImageReader

AMBER = HexColor("#d97706")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(OUT_DIR, exist_ok=True)


# ============================================================
# Styling
# ============================================================
def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold",
        fontSize=44, leading=48, textColor=AMBER, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverSub", fontName="Helvetica",
        fontSize=15, leading=20, textColor=DARK, alignment=TA_CENTER, spaceAfter=14))
    styles.add(ParagraphStyle(name="CoverMeta", fontName="Helvetica-Oblique",
        fontSize=10, leading=14, textColor=MID_GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="Chapter", fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=AMBER, spaceBefore=4, spaceAfter=12))
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
    styles.add(ParagraphStyle(name="TocItem", fontName="Helvetica",
        fontSize=11, leading=18, textColor=DARK))
    styles.add(ParagraphStyle(name="Source", fontName="Helvetica",
        fontSize=9.5, leading=13.5, textColor=MID_GRAY))
    styles.add(ParagraphStyle(name="Caption", fontName="Helvetica-Oblique",
        fontSize=9, leading=12, textColor=MID_GRAY, alignment=TA_CENTER, spaceBefore=3))
    return styles


def footer_canvas(canvas_obj, doc):
    if doc.page <= 1:
        return
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.setStrokeColor(LIGHT_GRAY)
    canvas_obj.line(1.5 * cm, 1.5 * cm, A4[0] - 1.5 * cm, 1.5 * cm)
    canvas_obj.drawString(1.5 * cm, 1.0 * cm, "aban news  ·  2026  ·  abannews.com")
    canvas_obj.drawRightString(A4[0] - 1.5 * cm, 1.0 * cm, "%d" % doc.page)
    canvas_obj.restoreState()


# ============================================================
# Generic block renderer
# blocks: ("lead", str) | ("h3", str) | ("p", str) | ("ul", [str,...]) | ("callout", str)
#         | ("img", {"src": dateiname_in_downloads, "alt"/"cap": str})
#         | ("src", [str,...])  -> Quellen-Liste (wie ul, etwas kleiner)
# Bild-Pfade werden relativ zu OUT_DIR aufgelöst.
# ============================================================
def render_blocks(story, styles, blocks, img_max_w=None):
    # img_max_w: maximale Bildbreite in pt (Print: schmale 5x8"-Seite).
    # Default = A4-Inhaltsbreite, gedeckelt auf 15.5 cm.
    for kind, payload in blocks:
        if kind == "lead":
            story.append(Paragraph(payload, styles["Lead"]))
        elif kind == "h3":
            story.append(Paragraph(payload, styles["H2"]))
        elif kind == "p":
            story.append(Paragraph(payload, styles["Body"]))
        elif kind == "callout":
            story.append(Paragraph(payload, styles["Callout"]))
        elif kind == "ul":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Bull"]), value="•", leftIndent=10)
                 for t in payload],
                bulletType="bullet", bulletColor=AMBER, leftIndent=14, spaceAfter=10,
            ))
        elif kind == "src":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Source"]), value="•", leftIndent=10)
                 for t in payload],
                bulletType="bullet", bulletColor=MID_GRAY, leftIndent=14, spaceAfter=10,
            ))
        elif kind == "img":
            path = os.path.join(OUT_DIR, payload["src"])
            if os.path.exists(path):
                iw, ih = ImageReader(path).getSize()
                max_w = img_max_w if img_max_w else min(A4[0] - 4 * cm, 15.5 * cm)
                disp_w = max_w
                disp_h = disp_w * ih / iw
                story.append(Spacer(1, 0.2 * cm))
                story.append(RLImage(path, width=disp_w, height=disp_h))
                if payload.get("cap"):
                    story.append(Paragraph(payload["cap"], styles["Caption"]))
                story.append(Spacer(1, 0.3 * cm))


def build_lang(lang, data):
    styles = make_styles()
    suffix = "" if lang == "de" else "-" + lang
    filename = "anti-hype-ebook%s.pdf" % suffix
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, filename), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2.2 * cm,
        title="%s — %s" % (data["title"], data["subtitle"]),
        author="Aban / aban news",
        subject=data["subject"],
        keywords=data["keywords"],
        creator="aban news — abannews.com",
    )
    story = []
    # Cover
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("&#9749;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=60, alignment=TA_CENTER, textColor=AMBER)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=16,
        alignment=TA_CENTER, textColor=DARK, spaceAfter=24)))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(data["title"], styles["CoverTitle"]))
    story.append(Paragraph(data["subtitle"], styles["CoverSub"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(data["edition"], styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())
    # TOC
    story.append(Paragraph(data["toc_title"], styles["Chapter"]))
    for i, ch in enumerate(data["chapters"], 1):
        story.append(Paragraph(
            '<font color="#d97706"><b>%02d</b></font>&nbsp;&nbsp;%s' % (i, ch["title"]),
            styles["TocItem"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(data["toc_note"], styles["Lead"]))
    story.append(PageBreak())
    # Chapters
    for ch in data["chapters"]:
        story.append(Paragraph(ch["title"], styles["Chapter"]))
        render_blocks(story, styles, ch["blocks"])
        story.append(PageBreak())
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print("✓ downloads/%s erstellt" % filename)


# ============================================================
# ePub builder (reine stdlib: ePub = ZIP aus XHTML)
# ============================================================
import zipfile
import html as _html


def _esc(s):
    """Nur & escapen; <b>…</b> aus den Content-Packs bleibt valides XHTML."""
    return s.replace("&", "&amp;")


def blocks_to_xhtml(blocks):
    out = []
    for kind, payload in blocks:
        if kind in ("ul", "src"):
            cls = ' class="src"' if kind == "src" else ""
            out.append("<ul%s>" % cls)
            for it in payload:
                out.append("<li>%s</li>" % _esc(it))
            out.append("</ul>")
        elif kind == "img":
            cap = payload.get("cap")
            out.append('<figure><img src="%s" alt="%s"/>%s</figure>' % (
                _esc(payload["src"]), _esc(payload.get("alt", "")),
                ("<figcaption>%s</figcaption>" % _esc(cap)) if cap else ""))
        else:
            tag = {"lead": "p class=\"lead\"", "h3": "h3", "p": "p",
                   "callout": "p class=\"callout\""}.get(kind, "p")
            close = tag.split(" ")[0]
            out.append("<%s>%s</%s>" % (tag, _esc(payload), close))
    return "\n".join(out)


EPUB_CSS = """body{font-family:Georgia,'Times New Roman',serif;line-height:1.6;margin:5%;color:#1f2937}
h1{color:#b45309;font-size:1.8em;line-height:1.2}
h2{color:#b45309;font-size:1.4em;margin-top:1.6em}
h3{font-size:1.1em;margin-top:1.2em}
p.lead{font-style:italic;color:#555}
p.callout{background:#fef3c7;border-left:4px solid #d97706;padding:.7em 1em;font-weight:bold}
ul{margin:0 0 1em 1.2em}.cover{text-align:center;margin-top:30%}
.cover .t{font-size:2.6em;font-weight:bold;color:#d97706}
.cover .s{font-size:1.2em;color:#1f2937;margin-top:.4em}
.cover .m{color:#6b7280;margin-top:2em;font-size:.9em}
figure{margin:1.4em 0;text-align:center}
figure img{max-width:100%;height:auto}
figcaption{font-size:.82em;font-style:italic;color:#6b7280;margin-top:.4em}
ul.src{font-size:.9em;color:#555}"""


def build_epub(lang, data):
    suffix = "" if lang == "de" else "-" + lang
    filename = "anti-hype-ebook%s.epub" % suffix
    path = os.path.join(OUT_DIR, filename)
    bookid = "urn:abannews:anti-hype:%s" % lang

    # XHTML-Dateien
    files = {}
    files["cover.xhtml"] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
        '<head><meta charset="utf-8"/><title>%s</title>'
        '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
        '<body><div class="cover"><div class="t">%s</div>'
        '<div class="s">%s</div><div class="m">%s<br/>Aban (Allen Chour) · abannews.com</div>'
        '</div></body></html>' % (lang, _esc(data["title"]), _esc(data["title"]),
                                   _esc(data["subtitle"]), _esc(data["edition"]))
    )
    spine_ids = ["cover"]
    nav_items = []
    images = set()  # referenzierte Bild-Dateinamen (liegen in OUT_DIR)
    for ch in data["chapters"]:
        for kind, payload in ch["blocks"]:
            if kind == "img":
                images.add(payload["src"])
    for i, ch in enumerate(data["chapters"], 1):
        cid = "ch%d" % i
        spine_ids.append(cid)
        nav_items.append('<li><a href="%s.xhtml">%s</a></li>' % (cid, _esc(ch["title"])))
        files["%s.xhtml" % cid] = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
            '<head><meta charset="utf-8"/><title>%s</title>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            '<body><h2>%s</h2>\n%s</body></html>'
            % (lang, _esc(ch["title"]), _esc(ch["title"]), blocks_to_xhtml(ch["blocks"]))
        )

    nav = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" lang="%s">'
        '<head><meta charset="utf-8"/><title>%s</title></head><body>'
        '<nav epub:type="toc" id="toc"><h1>%s</h1><ol>%s</ol></nav></body></html>'
        % (lang, _esc(data["toc_title"]), _esc(data["toc_title"]), "".join(nav_items))
    )

    manifest = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                '<item id="css" href="style.css" media-type="text/css"/>']
    for idx, imgname in enumerate(sorted(images), 1):
        manifest.append('<item id="img%d" href="%s" media-type="image/png"/>' % (idx, imgname))
    spine = []
    for sid in spine_ids:
        manifest.append('<item id="%s" href="%s.xhtml" media-type="application/xhtml+xml"/>' % (sid, sid))
        spine.append('<itemref idref="%s"/>' % sid)
    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="BookID">%s</dc:identifier>'
        '<dc:title>%s — %s</dc:title>'
        '<dc:language>%s</dc:language>'
        '<dc:creator>Aban (Allen Chour)</dc:creator>'
        '<dc:publisher>aban news</dc:publisher>'
        '<dc:description>%s</dc:description>'
        '<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>'
        '</metadata><manifest>%s</manifest><spine>%s</spine></package>'
        % (bookid, _esc(data["title"]), _esc(data["subtitle"]), lang,
           _esc(data["subject"]), "".join(manifest), "".join(spine))
    )

    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
                 '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                 '<rootfiles><rootfile full-path="OEBPS/content.opf" '
                 'media-type="application/oebps-package+xml"/></rootfiles></container>')

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        # mimetype zuerst, unkomprimiert (ePub-Spec)
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container)
        z.writestr("OEBPS/content.opf", opf)
        z.writestr("OEBPS/nav.xhtml", nav)
        z.writestr("OEBPS/style.css", EPUB_CSS)
        for name, content in files.items():
            z.writestr("OEBPS/%s" % name, content)
        for imgname in sorted(images):
            src_path = os.path.join(OUT_DIR, imgname)
            if os.path.exists(src_path):
                with open(src_path, "rb") as fh:
                    z.writestr("OEBPS/%s" % imgname, fh.read())
    print("✓ downloads/%s erstellt" % filename)


# ============================================================
# Content packs
# ============================================================
CONTENT = {
"de": {
  "title": "Anti-Hype",
  "subtitle": "Wie deutsche Solopreneure KI ohne Bullshit einsetzen",
  "edition": "Erweiterte Ausgabe · 2026",
  "subject": "KI ohne Hype für DACH-Solopreneure",
  "keywords": "KI, AI, Anti-Hype, Solopreneur, DACH, Newsletter, Produktivität",
  "toc_title": "Inhalt",
  "toc_note": "Lies es nicht von vorne bis hinten durch wie eine Pflichtlektüre. Spring zu dem Kapitel, das dein heutiges Problem löst. Die hinteren Kapitel sind die Werkstatt: Vorlagen zum Kopieren, ein durchgerechneter Arbeitstag und eine Werkzeug-nach-Aufgabe-Übersicht.",
  "chapters": [
    {"title": "Warum dieses eBook existiert", "blocks": [
      ("lead", "Die meisten KI-Ratgeber verkaufen dir ein Gefühl. Dieser hier nicht."),
      ("p", "Seit 2024 schreibe ich jeden Werktag einen Newsletter über KI für Leute, die damit Geld verdienen — nicht darüber reden. In der Zeit habe ich hunderte Tools getestet, dutzende wieder gelöscht und gemerkt: Das meiste, was als „Must-have 2026“ verkauft wird, löst ein Problem, das du gar nicht hast."),
      ("p", "Dieses eBook ist die Essenz für eine Person: den deutschsprachigen Solopreneur, der einen Tag mit 24 Stunden hat und keinen davon an Tool-Demos verschwenden will."),
      ("p", "Ein Beispiel, das ich oft sehe: Jemand kauft ein 200-€-Abo für ein „KI-Content-System“, weil ein Video versprochen hat, das mache 30 Posts pro Woche. Nach drei Wochen sind es null Posts — weil das Problem nie das Schreiben war, sondern die fehlende Entscheidung, worüber überhaupt zu schreiben ist. Kein Tool der Welt nimmt dir diese Entscheidung ab."),
      ("h3", "Was du hier NICHT findest"),
      ("ul", ["Prompts, die angeblich „dein Business automatisieren“, in Wahrheit aber nur einen netten Absatz produzieren.",
              "Tool-Listen mit 50 Einträgen, von denen du 47 nie öffnest.",
              "Das Versprechen, dass KI dich reich macht, während du schläfst."]),
      ("h3", "Wie du dieses eBook benutzt"),
      ("p", "Kurze, eigenständige Kapitel, jedes in unter zehn Minuten gelesen. Lies das, was dein heutiges Problem trifft, probier eine einzige Sache aus und komm wieder, wenn die nächste Frage auftaucht. Wissen, das du nicht anwendest, ist nur teurer gewordener Konsum."),
      ("callout", "Was du findest: ein Denkmodell, das zwischen Substanz und Show unterscheidet — und ein paar konkrete Abläufe, die Stunden sparen."),
    ]},
    {"title": "Der 3-Fragen-Bullshit-Filter", "blocks": [
      ("p", "Bevor du ein KI-Tool, einen Kurs oder einen Trend ernst nimmst, jag ihn durch drei Fragen. Übersteht er alle drei, lohnt sich ein zweiter Blick."),
      ("h3", "1. Was genau wird hier ersetzt?"),
      ("p", "Nicht „was kann es“, sondern: welche konkrete Aufgabe, die du heute manuell machst, fällt weg? Bleibt die Antwort vage, ist es Show. Ist sie konkret, ist es Substanz."),
      ("p", "Test: Beschreib die Aufgabe in einem Satz, der mit „Statt X mache ich jetzt Y“ anfängt. „Statt jeden Beleg von Hand abzutippen, fotografiere ich ihn und lasse die Daten extrahieren“ ist konkret. „Es macht meine Buchhaltung smarter“ ist Marketing."),
      ("h3", "2. Was kostet es mich, wenn es falsch liegt?"),
      ("p", "KI halluziniert. Immer. Die Frage ist nur, wie teuer ein Fehler ist. Einen Post-Entwurf gegenlesen kostet 30 Sekunden — delegier es. Eine Steuerzahl ungeprüft übernehmen kostet echtes Geld — verifizier jede Zeile."),
      ("p", "Sortier deine Aufgaben grob in zwei Töpfe: reversibel und teuer-irreversibel. Eine Überschrift, die nicht zündet, korrigierst du in Minuten — lass die KI zehn Varianten liefern. Ein an 4.000 Leute rausgeschickter Newsletter mit falscher Zahl ist nicht mehr einzufangen. Je teurer der Fehler, desto mehr eigene Prüfung."),
      ("h3", "3. Funktioniert es ohne mich — oder mit mir?"),
      ("p", "„Vollautomatisch“ ist fast immer eine Lüge. Die Tools, die wirklich tragen, sind Beschleuniger: Du bleibst der Kopf, KI macht die stumpfe Arbeit dazwischen."),
      ("h3", "Der häufigste Denkfehler"),
      ("p", "Die meisten fragen „Was kann dieses Tool alles?“ und sind beeindruckt von der langen Antwort. Die bessere Frage ist „Welche eine Aufgabe aus meiner Woche nimmt es mir zuverlässig ab?“. Ein Tool, das eine Sache wirklich erledigt, schlägt zehn, die alles ein bisschen können."),
      ("callout", "KI ist ein Praktikant mit perfektem Gedächtnis und null Urteilsvermögen. Behandle sie so — und du wirst selten enttäuscht."),
    ]},
    {"title": "Was KI gut kann — und wo sie zuverlässig scheitert", "blocks": [
      ("lead", "Bevor du KI einsetzt, solltest du wissen, wofür sie gebaut ist — und wofür nicht. Das erspart dir die meisten Enttäuschungen."),
      ("p", "Ein Sprachmodell ist im Kern eine Maschine, die das nächste Wort vorhersagt. Das klingt unspektakulär, erklärt aber fast alles: warum es glänzend formuliert und im selben Atemzug Fakten erfindet, warum es nie merkt, dass es falsch liegt, und warum derselbe Auftrag zweimal leicht andere Antworten bringt. Es rechnet nicht mit Wahrheit, sondern mit Wahrscheinlichkeit."),
      ("h3", "Wo KI heute stark ist"),
      ("ul", ["<b>Umformen:</b> aus langem Text kurzen machen, aus Stichpunkten Fließtext, aus förmlich locker. Ihre Paradedisziplin.",
              "<b>Erste Entwürfe:</b> die leere Seite füllen, damit du etwas zum Redigieren hast statt zum Erfinden.",
              "<b>Sortieren und Zusammenfassen:</b> große Textmengen auf das Wesentliche eindampfen.",
              "<b>Sprache erklären:</b> ein Fachbegriff, eine Fehlermeldung, ein Vertragsabsatz — in verständlichen Worten.",
              "<b>Varianten liefern:</b> zehn Überschriften, fünf Betreffzeilen, drei Tonlagen, und du wählst aus."]),
      ("h3", "Wo sie zuverlässig scheitert"),
      ("ul", ["<b>Fakten und Zahlen:</b> sie nennt Quellen, Daten und Statistiken mit voller Überzeugung, auch wenn sie sie gerade erfunden hat.",
              "<b>Aktuelles:</b> das Modell kennt die Welt nur bis zu einem Stichtag; was letzte Woche geschah, weiß es nicht von allein.",
              "<b>Rechnen und Zählen:</b> bei mehrstufiger Mathematik oder beim Zählen liegt sie öfter daneben, als du denkst.",
              "<b>Urteilen:</b> was richtig, fair oder strategisch klug ist, entscheidet sie nicht — sie ahmt nur nach, wie Menschen darüber schreiben."]),
      ("p", "Die Grenze verläuft also nicht zwischen leicht und schwer, sondern zwischen Sprache und Wahrheit. Solange es um Form geht, ist KI ein starker Partner. Sobald es um Tatsachen geht, ist sie eine Behauptungsmaschine, die du prüfen musst."),
      ("callout", "Nutze KI für alles, was du selbst gegenlesen und korrigieren kannst. Nutze sie nie als letzte Instanz für etwas, das stimmen muss."),
    ]},
    {"title": "Dein minimaler KI-Stack", "blocks": [
      ("lead", "Du brauchst keine 20 Abos. Du brauchst vier Bausteine."),
      ("h3", "1. Ein gutes Sprachmodell (Pflicht)"),
      ("p", "Claude oder ChatGPT, Bezahlversion. Dein Arbeitspferd für Texten, Sortieren, Zusammenfassen. Eines reicht — lern es richtig kennen, statt ständig zu wechseln."),
      ("p", "Die rund 20 bis 25 € im Monat für die Bezahlversion sind selten das Thema: Wer damit eine Stunde pro Woche spart, hat sie bei jedem realistischen Stundensatz schon am ersten Tag wieder drin. Das eigentlich Knappe ist deine Zeit, sie sauber bedienen zu lernen — nicht das Budget."),
      ("h3", "2. Ein Automations-Hub (optional)"),
      ("p", "Make.com oder n8n. Hier klebst du Dienste zusammen. Erst einbauen, wenn du eine Aufgabe wirklich dreimal die Woche manuell machst."),
      ("h3", "3. Ein Ort für dein Wissen"),
      ("p", "Notion, Obsidian, egal — Hauptsache durchsuchbar. KI ist nur so gut wie der Kontext, den du ihr gibst."),
      ("p", "Konkret heißt das: Leg dir eine simple Textdatei an mit deiner Zielgruppe, deinem Ton, deinen drei häufigsten Aufgaben und ein paar Formulierungen, die nach dir klingen. Diesen Block kopierst du vorne in jeden längeren Auftrag. Der Unterschied zwischen einer generischen Antwort und einer, die nach dir klingt, ist fast immer nur dieser Kontext — nicht das Modell."),
      ("h3", "4. DSGVO-Klarheit (nicht verhandelbar)"),
      ("p", "Bevor du Kundendaten in ein Tool kippst: Wo stehen die Server? Gibt es einen AV-Vertrag? Ein DSGVO-Verstoß ist teurer als jeder Produktivitätsgewinn."),
      ("p", "Do: anonymisiere, was du nicht brauchst — „Kunde A in Branche B“ reicht für einen Angebotsentwurf völlig. Don't: ganze Mail-Verläufe mit Klarnamen, Adressen und Vertragsdetails in ein x-beliebiges Gratis-Tool kippen, nur weil es gerade praktisch ist."),
      ("callout", "Faustregel: Erst der Ablauf, dann das Tool. Wer mit dem Tool anfängt, sucht sich ein Problem dazu."),
    ]},
    {"title": "Wie du mit KI redest, dass etwas Brauchbares rauskommt", "blocks": [
      ("lead", "Die meisten schlechten KI-Antworten liegen nicht am Modell, sondern am Auftrag. Vier Handgriffe ändern fast alles."),
      ("p", "Ein gutes Sprachmodell ist wie ein fähiger Praktikant: Je klarer der Auftrag, desto weniger musst du nacharbeiten. Ein vager Auftrag bringt den Durchschnitt aus dem halben Internet — korrekt, aber beliebig. Diese vier Handgriffe heben die Qualität mehr als jeder Tool-Wechsel."),
      ("h3", "1. Sag, wer du bist und für wen der Text ist"),
      ("p", "„Schreib einen Text über Steuern“ ist ein Würfelwurf. „Ich bin Steuerberaterin und schreibe für selbstständige Handwerker, die wenig Zeit haben — erklär die Kleinunternehmerregelung in einfachen Worten“ liefert etwas Brauchbares. Kontext ist kein Beiwerk, er ist der halbe Auftrag."),
      ("h3", "2. Gib das Format vor"),
      ("p", "Sag, was hinten rauskommen soll: fünf Stichpunkte, eine Tabelle, ein Absatz unter hundert Wörtern, eine E-Mail mit Betreff. Ohne Formatvorgabe bekommst du Fließtext, den du erst wieder zerlegen musst."),
      ("h3", "3. Zeig ein Beispiel"),
      ("p", "Ein einziges Beispiel deines Stils wirkt stärker als drei Absätze Erklärung. Häng einen alten Post, eine frühere Mail oder eine Formulierung an, die nach dir klingt, und sag: „in diesem Ton“. Das Modell ahmt nach — gib ihm also etwas Gutes zum Nachahmen."),
      ("h3", "4. Iterier, statt neu zu würfeln"),
      ("p", "Die erste Antwort ist ein Entwurf, kein Endprodukt. Sag konkret, was nicht passt: „zu werblich“, „kürzer“, „der zweite Punkt ist falsch, lass ihn weg“. Zwei, drei gezielte Korrekturen bringen dich weiter als zehnmal „mach nochmal“."),
      ("h3", "Der Unterschied an einem Beispiel"),
      ("p", "Schwach: „Schreib mir einen Newsletter über KI.“ Stark: „Schreib die Einleitung für meinen Newsletter an deutsche Solopreneure. Nüchterner Ton, du-Form, kein Hype, höchstens achtzig Wörter, erster Satz macht neugierig ohne zu übertreiben. Thema: warum die meisten KI-Tools ein Problem lösen, das man gar nicht hat.“ Derselbe Aufwand beim Tippen — ein Unterschied wie Tag und Nacht beim Ergebnis."),
      ("callout", "Kontext, Format, Beispiel, Korrektur. Wer diese vier Dinge mitliefert, braucht kein Prompt-Paket für 47 €."),
    ]},
    {"title": "Fünf Abläufe, die echt Zeit sparen", "blocks": [
      ("p", "Kein Hexenwerk — nur Routine-Arbeit, die du delegierst."),
      ("ul", ["<b>Posteingang vorsortieren:</b> KI wirft Mails in drei Körbe — jetzt, später, ignorieren. Du entscheidest weiter selbst.",
              "<b>Aus einem Long-Form drei Formate machen:</b> Ein Input, mehrere Outputs. Du redigierst, statt bei Null anzufangen.",
              "<b>Angebote schneller schreiben:</b> Vorlage plus Eckdaten, KI baut den Entwurf. Aus 45 Minuten werden 10.",
              "<b>Recherche bündeln:</b> Ein klarer Auftrag mit Quellenpflicht — dann selbst die Quellen prüfen.",
              "<b>Die eigene Woche spiegeln:</b> KI als nüchterner Spiegel, nicht als Coach mit Konfetti."]),
      ("h3", "Ein Ablauf konkret durchgespielt"),
      ("p", "Nimm das Angebot. Statt mit leerem Dokument zu starten, hast du eine feste Vorlage: Begrüßung, Leistung, Umfang, Preis, Zeitrahmen, nächster Schritt. Du gibst der KI nur die fünf Eckdaten dieses Falls und die Vorlage und lässt sie den Entwurf füllen. Dann liest du einmal drüber, korrigierst Preis und Ton — fertig. Die Denkarbeit (was kostet das, was verspreche ich) bleibt bei dir; nur das Tippen und Formatieren fällt weg."),
      ("p", "Realistisch ist dabei eher eine Ersparnis von etwa der Hälfte der Zeit als der „10x“-Sprung aus den Anzeigen — und das auch erst, nachdem du die Vorlage einmal sauber gebaut hast. Das klingt unspektakulär, summiert sich über ein Jahr aber auf ganze Arbeitswochen."),
      ("callout", "Jeder Ablauf hat dich als letzte Instanz. KI liefert den Rohstoff, dein Urteil macht das Produkt."),
    ]},
    {"title": "Sieben Hype-Fallen", "blocks": [
      ("ul", ["<b>Die Tool-Sammelsucht.</b> Zehn halb gelernte Tools sind langsamer als eins, das du beherrschst.",
              "<b>Der Autopilot-Mythos.</b> „Läuft von allein“ heißt meist „bricht von allein, wenn du nicht hinschaust“.",
              "<b>Prompt-Pakete für 47 €.</b> Ein guter Prompt ist eine klare Aufgabe — die formulierst du selbst, kostenlos.",
              "<b>Der Vanity-Output.</b> Reichweite ohne Substanz ist trotzdem Leere.",
              "<b>KI als Strategie-Ersatz.</b> Ein Modell entscheidet nicht für dich, wer du sein willst.",
              "<b>Blindes Vertrauen in Zahlen.</b> KI nennt selbstbewusst Statistiken, die sie erfindet.",
              "<b>FOMO als Geschäftsmodell.</b> Wer dir Angst macht, etwas zu verpassen, verkauft dir die Lösung gleich mit."]),
      ("h3", "Woran du eine Hype-Falle erkennst"),
      ("p", "Drei Warnsignale tauchen fast immer zusammen auf: eine Frist („nur noch heute“), eine runde Zahl ohne Quelle („spart dir 20 Stunden pro Woche“) und ein Versprechen, das deine Arbeit komplett wegnimmt statt sie zu beschleunigen. Wenn alle drei in einer Anzeige stehen, kannst du sie ziemlich gefahrlos wegklicken."),
      ("p", "Das heißt nicht, dass du alles ignorieren sollst. Es heißt: warte die zweite Welle ab. Was nach vier Wochen immer noch geteilt wird, weil es Leuten wirklich hilft — und nicht nur, weil es neu war — verdient deine Aufmerksamkeit. Den Rest verpasst du gefahrlos."),
      ("callout", "Die unbequeme Wahrheit: Viele, die laut über KI reden, verdienen ihr Geld mit dem Reden — nicht mit der KI."),
    ]},
    {"title": "Datenschutz in fünf Minuten", "blocks": [
      ("lead", "Die DSGVO ist kein Grund, KI zu meiden — aber ein Grund, vor dem ersten Klick kurz nachzudenken. Hier ist die Prüfung, die fünf Minuten dauert und teure Fehler verhindert."),
      ("p", "Der häufigste Fehler ist nicht böse Absicht, sondern Bequemlichkeit: ein Kundengespräch schnell in ein Gratis-Transkriptionstool ziehen, einen ganzen Mailverlauf mit Klarnamen einfügen, weil es gerade praktisch ist. Genau hier entstehen die Probleme, die später teuer werden. Diese fünf Fragen gehst du einmal pro Tool durch — danach weißt du, woran du bist."),
      ("h3", "1. Wo stehen die Server?"),
      ("p", "Datenverarbeitung in der EU ist der einfache Weg. Bei US-Anbietern brauchst du eine tragfähige Rechtsgrundlage; viele große Tools bieten inzwischen EU-Datenresidenz oder geschäftliche Tarife mit besseren Garantien. Steht dazu nichts auf der Seite, ist auch das eine Antwort."),
      ("h3", "2. Gibt es einen AV-Vertrag?"),
      ("p", "Sobald du personenbezogene Daten verarbeitest, brauchst du mit dem Anbieter einen Vertrag zur Auftragsverarbeitung. Seriöse Anbieter stellen ihn als Standarddokument bereit. Findest du keinen, gehören dort keine Kundendaten hinein."),
      ("h3", "3. Werden meine Eingaben zum Training benutzt?"),
      ("p", "Bei vielen Gratis-Stufen ja, bei Geschäftstarifen oft nicht — aber nur, wenn du es aktiv einstellst oder den richtigen Tarif wählst. Prüf diese Einstellung einmal bewusst, statt es zu hoffen."),
      ("h3", "4. Was muss überhaupt rein?"),
      ("p", "Die beste Datenschutzmaßnahme ist Weglassen. „Kunde A, Branche Bau, Auftrag X“ reicht für einen Angebotsentwurf vollkommen. Namen, Adressen und Vertragsnummern brauchst du dafür nicht — also lass sie draußen."),
      ("h3", "5. Würde ich das meinem Kunden so erklären?"),
      ("p", "Ein einfacher Test: Wenn du deinem Kunden offen sagen könntest, wie du sein Anliegen mit KI bearbeitest, ist es meist in Ordnung. Müsstest du es verstecken, stimmt etwas nicht."),
      ("callout", "Anonymisieren, was geht. AV-Vertrag, wo nötig. Und im Zweifel die Sache, die wirklich stimmen muss, selbst erledigen. Datenschutz ist hier kein Bremsklotz, sondern dein Geschäftsschutz."),
    ]},
    {"title": "Wie es weitergeht", "blocks": [
      ("p", "Wenn du bis hier gelesen hast, hast du schon den wichtigsten Skill: Geduld für Substanz statt Reflex für Hype."),
      ("p", "Dieses eBook ist ein Schnappschuss. KI ändert sich wöchentlich. Was bleibt, ist die Denkweise: konkret fragen, Risiko abschätzen, selbst urteilen."),
      ("h3", "Dein erster Schritt für diese Woche"),
      ("p", "Such dir nicht fünf Dinge aus, sondern eines. Nimm die eine Aufgabe, die sich diese Woche am meisten nach stumpfer Wiederholung angefühlt hat, und probier genau dafür einen der Abläufe aus Kapitel 4. Miss grob, wie lange es vorher gedauert hat und wie lange jetzt. Dieser eine ehrliche Vergleich bringt dich weiter als zehn gelesene Tool-Listen."),
      ("p", "Genau das mache ich jeden Werktag im Newsletter — die drei KI-Entwicklungen, die dein Business heute betreffen, in fünf Minuten, ohne Bullshit. Keine Frist, kein Druck, jederzeit abbestellbar."),
      ("lead", "Kostenlos abonnieren: abannews.com — danke fürs Lesen. — Aban"),
    ]},
    {"title": "Vorlagen zum Kopieren", "blocks": [
      ("lead", "Sieben Bausteine, die du direkt in dein Sprachmodell einfügst. Ersetz die Platzhalter in eckigen Klammern, dann läuft es."),
      ("p", "Eine Regel vorweg: Je mehr Kontext oben im Auftrag steht, desto weniger musst du hinterher korrigieren. Sag immer, wer du bist, für wen der Text ist und in welchem Ton — sonst bekommst du den Durchschnitt aus dem ganzen Internet."),
      ("h3", "1. Langes Dokument zusammenfassen"),
      ("ul", ["<b>Fasse den folgenden Text in maximal fünf Stichpunkten zusammen.</b> Schreib zusätzlich einen Satz, was ich konkret tun oder entscheiden muss. Nenne offene Fragen separat. Erfinde nichts, was nicht im Text steht. Hier der Text: [TEXT EINFÜGEN]"]),
      ("h3", "2. Notizen in einen Post verwandeln"),
      ("ul", ["<b>Aus diesen rohen Notizen mach einen LinkedIn-Post für [ZIELGRUPPE].</b> Ton: nüchtern, kein Hype, keine Ausrufezeichen-Ketten, du-Form. Erster Satz muss neugierig machen, ohne zu übertreiben. Max. 1.200 Zeichen. Notizen: [NOTIZEN]"]),
      ("h3", "3. Angebot entwerfen"),
      ("ul", ["<b>Schreib den Entwurf eines Angebots.</b> Struktur: Begrüßung, Aufgabe in einem Satz, Leistung, Umfang, Preis, Zeitrahmen, nächster Schritt. Sachlich, kein Verkaufssprech. Eckdaten: Kunde [BRANCHE], Aufgabe [AUFGABE], Preis [BETRAG], Lieferung bis [DATUM]."]),
      ("h3", "4. Kalte E-Mail, die nicht nach Spam klingt"),
      ("ul", ["<b>Schreib eine kurze kalte E-Mail an [ROLLE] bei einer Firma in [BRANCHE].</b> Max. 90 Wörter, ein konkreter Bezug zu ihrem Geschäft, ein einziger Call-to-Action (15-Minuten-Gespräch). Keine Schmeichelei, keine Buzzwords. Mein Angebot: [EIN SATZ]."]),
      ("h3", "5. Text kürzen, ohne den Sinn zu verlieren"),
      ("ul", ["<b>Kürz den folgenden Text um die Hälfte.</b> Behalte die Kernaussage und die Zahlen, streich Füllwörter und Wiederholungen. Gleicher Ton wie das Original. Text: [TEXT]"]),
      ("h3", "6. Gegenargumente finden, bevor es andere tun"),
      ("ul", ["<b>Ich behaupte: [DEINE THESE].</b> Nenn mir die drei stärksten Gegenargumente und je eine kurze Antwort darauf. Sei hart, nicht höflich — ich will die Lücken sehen, bevor ein Kunde sie findet."]),
      ("h3", "7. E-Mail-Antwort vorformulieren"),
      ("ul", ["<b>Formulier eine höfliche, klare Antwort auf die folgende Mail.</b> Mein Ziel: [WAS DU ERREICHEN WILLST]. Kurz, freundlich, ohne Unterwürfigkeit, du-/Sie-Form wie im Original. Mail: [EINGEGANGENE MAIL]"]),
      ("callout", "Speicher die zwei, drei Vorlagen, die du wöchentlich brauchst, als Textbausteine ab. Eine Vorlage, die du nicht wiederfindest, benutzt du nicht."),
    ]},
    {"title": "Ein Tag, durchgespielt", "blocks": [
      ("lead", "Ein realistischer Dienstag einer freien Texterin — einmal ohne, einmal mit KI. Keine erfundene Wunderzahl, nur eine ehrliche Rechnung."),
      ("p", "Maria ist selbstständige Texterin und betreut fünf Kunden. Ihr Dienstag besteht aus drei wiederkehrenden Blöcken: Posteingang, ein Kundenangebot, ein Blogtext aus Stichpunkten. So lief er früher, so läuft er heute."),
      ("h3", "Vorher: der manuelle Dienstag"),
      ("ul", ["<b>Posteingang (40 Min.):</b> 30 Mails einzeln lesen, sortieren, drei beantworten.",
              "<b>Angebot (50 Min.):</b> leeres Dokument, Struktur neu überlegen, Formulierungen suchen, formatieren.",
              "<b>Blogtext (90 Min.):</b> aus zwölf Stichpunkten 800 Wörter schreiben, zweimal umstellen.",
              "<b>Summe: rund drei Stunden</b>, davon viel stumpfes Aufsetzen und Formatieren."]),
      ("h3", "Nachher: derselbe Dienstag mit KI"),
      ("ul", ["<b>Posteingang (20 Min.):</b> KI sortiert nach „jetzt / später / ignorieren“ und schlägt drei Antwortentwürfe vor. Maria liest, korrigiert, sendet.",
              "<b>Angebot (20 Min.):</b> ihre feste Vorlage plus fünf Eckdaten, KI füllt den Entwurf. Maria prüft Preis und Ton.",
              "<b>Blogtext (55 Min.):</b> KI baut aus den Stichpunkten einen Rohtext, Maria schreibt Einstieg und Schluss selbst und schärft die Aussagen.",
              "<b>Summe: rund anderthalb Stunden</b> — die Denkarbeit bleibt bei ihr, das Aufsetzen fällt weg."]),
      ("h3", "Was die Rechnung ehrlich macht"),
      ("p", "Das ist grob die Hälfte der Zeit — nicht das „10x“ aus den Anzeigen. Und der Sprung kam nicht am ersten Tag: Maria hat erst eine Woche gebraucht, um ihre Vorlage und ihren Kontext-Block sauber zu bauen. Die gesparte Zeit steckt sie nicht in mehr Output, sondern in zwei Dinge, die KI nicht kann: Neukunden ansprechen und Texte schärfer redigieren."),
      ("p", "Genauso wichtig: An den Stellen, wo ein Fehler teuer wäre — Preis im Angebot, Fakten im Blogtext — prüft sie weiterhin jede Zeile selbst. Die Zeitersparnis kommt aus dem Aufsetzen, nicht aus dem Weglassen der Kontrolle."),
      ("callout", "Der Gewinn ist nicht „mehr in derselben Zeit“, sondern „dieselbe Qualität in weniger Zeit — und den Rest für das, was nur du kannst“."),
    ]},
    {"title": "Werkzeug nach Aufgabe", "blocks": [
      ("lead", "Nicht „welches Tool ist das beste“, sondern „was nehme ich für welche Aufgabe“. Mit ehrlichen Notizen zu Kosten und DSGVO."),
      ("p", "Die Namen unten sind Beispiele, keine Empfehlungen gegen Bezahlung. Preise sind grobe Größenordnungen von Anfang 2026 und ändern sich; prüf vor dem Abo den aktuellen Stand. Affiliate-Links gibt es hier keine."),
      ("h3", "Schreiben und Redigieren"),
      ("ul", ["<b>Wofür:</b> Texte, Zusammenfassungen, Umformulieren, Sortieren.",
              "<b>Beispiele:</b> Claude, ChatGPT (beide ca. 20-25 € im Monat in der Bezahlversion).",
              "<b>DSGVO:</b> EU-Datenresidenz und AV-Vertrag prüfen; keine echten Kundennamen ohne Not eingeben."]),
      ("h3", "Recherche mit Quellen"),
      ("ul", ["<b>Wofür:</b> Überblick zu einem Thema, mit nachprüfbaren Links.",
              "<b>Beispiele:</b> Perplexity (Gratis-Stufe vorhanden, Pro ca. 20 € im Monat).",
              "<b>Ehrlich:</b> immer die genannten Quellen selbst öffnen — auch „mit Quellen“ heißt nicht „korrekt“."]),
      ("h3", "Automatisierung"),
      ("ul", ["<b>Wofür:</b> Dienste verbinden, wiederkehrende Abläufe ohne Klickarbeit.",
              "<b>Beispiele:</b> Make.com (Gratis-Kontingent, dann ab wenigen Euro), n8n (Open Source, selbst gehostet kostenlos).",
              "<b>Ehrlich:</b> erst ab drei manuellen Wiederholungen pro Woche sinnvoll; vorher ist es Bastelei."]),
      ("h3", "Bilder"),
      ("ul", ["<b>Wofür:</b> Illustrationen, einfache Grafiken, Social-Bilder.",
              "<b>Beispiele:</b> Canva (Gratis-Stufe, KI-Funktionen im Bezahlplan ab ca. 12 € im Monat).",
              "<b>Ehrlich:</b> Rechte und Markenzeichen prüfen; generierte Bilder nicht blind als eigene Marke verwenden."]),
      ("h3", "Transkription und Notizen"),
      ("ul", ["<b>Wofür:</b> Gespräche, Sprachnotizen, Calls in Text verwandeln.",
              "<b>Beispiele:</b> Whisper (Open Source, lokal kostenlos), diverse Web-Dienste (oft ab ca. 10 € im Monat).",
              "<b>DSGVO:</b> bei Kundengesprächen Einwilligung einholen; lokale Verarbeitung ist datenschutzfreundlicher."]),
      ("p", "Faustregel über allem: Fang mit einem guten Sprachmodell an. Erst wenn dir dort dieselbe Aufgabe regelmäßig zu lange dauert, lohnt sich ein zweites, spezialisiertes Werkzeug."),
      ("callout", "Ein Werkzeug, das du beherrschst, schlägt fünf, die du nur installiert hast. Erweitere den Stack erst, wenn dich eine konkrete Aufgabe dazu zwingt."),
    ]},
    {"title": "Klartext-Glossar: zehn Begriffe ohne Nebel", "blocks": [
      ("lead", "Damit dich kein Verkäufer mit Fachwörtern einschüchtert. Zehn Begriffe, die in jeder zweiten KI-Diskussion fallen — in einem Satz erklärt."),
      ("ul", ["<b>Sprachmodell (LLM):</b> das Programm hinter ChatGPT oder Claude, das aus Text das jeweils wahrscheinlichste nächste Wort bildet.",
              "<b>Prompt:</b> dein Auftrag an das Modell. Je klarer er ist, desto besser die Antwort.",
              "<b>Token:</b> die kleinen Häppchen, in die das Modell Text zerlegt — grob ein Wortteil. Abrechnung und Längenlimits laufen darüber.",
              "<b>Kontextfenster:</b> wie viel Text das Modell gleichzeitig im Blick hat. Ist es voll, fällt der Anfang hinten raus.",
              "<b>Halluzination:</b> eine erfundene, aber selbstbewusst vorgetragene Antwort. Kein Ausrutscher, sondern die Kehrseite der Funktionsweise.",
              "<b>Fine-Tuning:</b> ein Modell mit eigenen Daten nachtrainieren. Für die meisten Solopreneure unnötig — guter Kontext im Prompt reicht.",
              "<b>RAG:</b> dem Modell vor der Antwort passende eigene Dokumente mitgeben, damit es daraus zitiert statt zu raten.",
              "<b>Agent:</b> ein Modell, das nicht nur antwortet, sondern Schritte selbst ausführt. Klingt groß, bricht in der Praxis schnell — eng halten.",
              "<b>API:</b> die Schnittstelle, über die andere Programme das Modell ansprechen. Relevant erst, wenn du etwas automatisierst.",
              "<b>Open Source / lokal:</b> Modelle, die du selbst betreiben kannst. Mehr Kontrolle und Datenschutz, dafür mehr Aufwand."]),
      ("callout", "Du musst keinen dieser Begriffe beherrschen, um KI sinnvoll zu nutzen. Aber wer sie kennt, lässt sich nichts verkaufen, das er nicht braucht."),
    ]},
  ],
},
"en": {
  "title": "Anti-Hype",
  "subtitle": "How solopreneurs put AI to work without the bullshit",
  "edition": "Expanded edition · 2026",
  "subject": "AI without the hype, for solopreneurs",
  "keywords": "AI, anti-hype, solopreneur, newsletter, productivity",
  "toc_title": "Contents",
  "toc_note": "Don't read it cover to cover like homework. Jump to the chapter that solves today's problem. The later chapters are the workshop: templates to copy, one fully worked day, and a tool-by-task overview.",
  "chapters": [
    {"title": "Why this eBook exists", "blocks": [
      ("lead", "Most AI guides sell you a feeling. This one doesn't."),
      ("p", "Since 2024 I've written a daily newsletter about AI for people who make money with it — not talk about it. Along the way I've tested hundreds of tools, deleted dozens, and noticed: most of what gets sold as a “2026 must-have” solves a problem you don't actually have."),
      ("p", "This eBook is the distilled version for one person: the solopreneur whose day has 24 hours and who won't waste any of them on tool demos."),
      ("p", "An example I see often: someone buys a 200-dollar subscription to an “AI content system” because a video promised 30 posts a week. Three weeks later there are zero posts — because the problem was never the writing, it was the missing decision about what to write at all. No tool on earth makes that decision for you."),
      ("h3", "What you will NOT find here"),
      ("ul", ["Prompts that supposedly “automate your business” but really just produce a nice paragraph.",
              "Tool lists with 50 entries, 47 of which you'll never open.",
              "The promise that AI makes you rich while you sleep."]),
      ("h3", "How to use this eBook"),
      ("p", "Short, self-contained chapters, each read in under ten minutes. Read the one that hits today's problem, try a single thing, and come back when the next question shows up. Knowledge you don't apply is just consumption that got more expensive."),
      ("callout", "What you will find: a way of thinking that separates substance from show — and a few concrete routines that save hours."),
    ]},
    {"title": "The 3-question bullshit filter", "blocks": [
      ("p", "Before you take an AI tool, course or trend seriously, run it through three questions. If it survives all three, it's worth a second look."),
      ("h3", "1. What exactly does it replace?"),
      ("p", "Not “what can it do”, but: which concrete task you do manually today disappears? If the answer stays vague, it's show. If it's concrete, it's substance."),
      ("p", "Test: describe the task in one sentence that starts with “Instead of X, I now do Y.” “Instead of typing every receipt by hand, I photograph it and have the data extracted” is concrete. “It makes my bookkeeping smarter” is marketing."),
      ("h3", "2. What does it cost me when it's wrong?"),
      ("p", "AI hallucinates. Always. The only question is how expensive a mistake is. Proofreading a draft post costs 30 seconds — delegate it. Copying a tax figure unchecked costs real money — verify every line."),
      ("p", "Sort your tasks roughly into two buckets: reversible and expensive-irreversible. A headline that falls flat you fix in minutes — let AI hand you ten variants. A newsletter sent to 4,000 people with a wrong number can't be pulled back. The more expensive the mistake, the more of your own checking it deserves."),
      ("h3", "3. Does it work without me — or with me?"),
      ("p", "“Fully automatic” is almost always a lie. The tools that actually carry their weight are accelerators: you stay the head, AI does the dull work in between."),
      ("h3", "The most common thinking error"),
      ("p", "Most people ask “what can this tool do?” and get impressed by the long answer. The better question is “which single task from my week does it reliably take off my hands?” One tool that truly does one thing beats ten that do everything a little."),
      ("callout", "AI is an intern with a perfect memory and zero judgement. Treat it that way — and you'll rarely be disappointed."),
    ]},
    {"title": "What AI is good at — and where it reliably fails", "blocks": [
      ("lead", "Before you put AI to work, you should know what it was built for — and what it wasn't. That spares you most of the disappointments."),
      ("p", "A language model is at its core a machine that predicts the next word. That sounds unspectacular, but it explains almost everything: why it phrases things brilliantly and invents facts in the same breath, why it never notices it's wrong, and why the same job gives slightly different answers twice. It doesn't compute truth, it computes probability."),
      ("h3", "Where AI is strong today"),
      ("ul", ["<b>Reshaping:</b> long text into short, bullet points into prose, formal into casual. Its signature discipline.",
              "<b>First drafts:</b> filling the blank page so you have something to edit instead of invent.",
              "<b>Sorting and summarising:</b> boiling large amounts of text down to the essentials.",
              "<b>Explaining language:</b> a technical term, an error message, a contract clause — in plain words.",
              "<b>Delivering variants:</b> ten headlines, five subject lines, three tones, and you pick."]),
      ("h3", "Where it reliably fails"),
      ("ul", ["<b>Facts and figures:</b> it cites sources, dates and statistics with full confidence, even when it just made them up.",
              "<b>Anything current:</b> the model only knows the world up to a cut-off date; what happened last week it doesn't know on its own.",
              "<b>Maths and counting:</b> on multi-step maths or counting it's wrong more often than you'd think.",
              "<b>Judging:</b> what is right, fair or strategically smart it does not decide — it only imitates how people write about it."]),
      ("p", "So the line doesn't run between easy and hard, but between language and truth. As long as it's about form, AI is a strong partner. The moment it's about facts, it's a claim machine you have to check."),
      ("callout", "Use AI for anything you can proofread and correct yourself. Never use it as the final instance for something that has to be right."),
    ]},
    {"title": "Your minimal AI stack", "blocks": [
      ("lead", "You don't need 20 subscriptions. You need four building blocks."),
      ("h3", "1. One good language model (required)"),
      ("p", "Claude or ChatGPT, paid tier. Your workhorse for writing, sorting, summarising. One is enough — learn it properly instead of constantly switching."),
      ("p", "The roughly 20 to 25 euros a month for the paid tier is rarely the issue: if it saves you one hour a week, it has paid for itself on day one at any realistic hourly rate. What's actually scarce is your time to learn to drive it well — not the budget."),
      ("h3", "2. An automation hub (optional)"),
      ("p", "Make.com or n8n. This is where you glue services together. Only add it once you genuinely do a task manually three times a week."),
      ("h3", "3. A place for your knowledge"),
      ("p", "Notion, Obsidian, whatever — as long as it's searchable. AI is only as good as the context you give it."),
      ("p", "Concretely: keep a simple text file with your audience, your tone, your three most common tasks and a few phrasings that sound like you. Paste that block at the top of every longer job. The difference between a generic answer and one that sounds like you is almost always just this context — not the model."),
      ("h3", "4. GDPR clarity (non-negotiable)"),
      ("p", "Before you dump customer data into a tool: where are the servers? Is there a data-processing agreement? A GDPR breach costs more than any productivity gain."),
      ("p", "Do: anonymise what you don't need — “client A in industry B” is plenty for a draft proposal. Don't: paste whole mail threads with real names, addresses and contract details into some random free tool just because it's handy right now."),
      ("callout", "Rule of thumb: process first, tool second. Whoever starts with the tool goes looking for a problem to fit it."),
    ]},
    {"title": "How to talk to AI so something useful comes out", "blocks": [
      ("lead", "Most bad AI answers aren't the model's fault, they're the brief's. Four moves change almost everything."),
      ("p", "A good language model is like a capable intern: the clearer the brief, the less you fix afterwards. A vague brief gives you the average of half the internet — correct, but interchangeable. These four moves lift quality more than any tool switch."),
      ("h3", "1. Say who you are and who the text is for"),
      ("p", "“Write a text about taxes” is a dice roll. “I'm a tax advisor writing for self-employed tradespeople who are short on time — explain the small-business rule in plain words” gives you something usable. Context isn't decoration, it's half the brief."),
      ("h3", "2. Specify the format"),
      ("p", "Say what should come out: five bullet points, a table, a paragraph under a hundred words, an email with a subject line. Without a format you get prose you then have to take apart again."),
      ("h3", "3. Show an example"),
      ("p", "A single example of your style works harder than three paragraphs of explanation. Attach an old post, an earlier email or a phrasing that sounds like you, and say: “in this tone”. The model imitates — so give it something good to imitate."),
      ("h3", "4. Iterate instead of re-rolling"),
      ("p", "The first answer is a draft, not a finished product. Say concretely what's off: “too salesy”, “shorter”, “the second point is wrong, drop it”. Two or three targeted corrections get you further than ten rounds of “do it again”."),
      ("h3", "The difference in one example"),
      ("p", "Weak: “Write me a newsletter about AI.” Strong: “Write the intro for my newsletter to German-speaking solopreneurs. Sober tone, informal, no hype, at most eighty words, the first sentence should spark curiosity without overselling. Topic: why most AI tools solve a problem you don't have.” The same effort to type — a night-and-day difference in the result."),
      ("callout", "Context, format, example, correction. Whoever supplies these four needs no €47 prompt pack."),
    ]},
    {"title": "Five routines that actually save time", "blocks": [
      ("p", "No magic — just routine work you delegate."),
      ("ul", ["<b>Pre-sort your inbox:</b> AI drops mails into three buckets — now, later, ignore. You still decide.",
              "<b>Turn one long-form into three formats:</b> one input, several outputs. You edit instead of starting from zero.",
              "<b>Write proposals faster:</b> a template plus the key facts, AI builds the draft. 45 minutes become 10.",
              "<b>Bundle research:</b> one clear brief with a sources requirement — then check the sources yourself.",
              "<b>Mirror your own week:</b> AI as a sober mirror, not a coach throwing confetti."]),
      ("h3", "One routine walked through"),
      ("p", "Take the proposal. Instead of starting with a blank document, you keep a fixed template: greeting, deliverable, scope, price, timeline, next step. You hand AI only the five key facts of this case plus the template and let it fill the draft. Then you read it once, fix the price and the tone — done. The thinking (what does this cost, what am I promising) stays with you; only the typing and formatting fall away."),
      ("p", "Realistically that's closer to saving about half the time than the “10x” jump from the ads — and only after you've built the template cleanly once. It sounds unspectacular, but over a year it adds up to whole working weeks."),
      ("callout", "Every routine keeps you as the final instance. AI delivers the raw material; your judgement makes the product."),
    ]},
    {"title": "Seven hype traps", "blocks": [
      ("ul", ["<b>Tool-collecting addiction.</b> Ten half-learned tools are slower than one you've mastered.",
              "<b>The autopilot myth.</b> “Runs by itself” usually means “breaks by itself when you're not watching”.",
              "<b>Prompt packs for €47.</b> A good prompt is a clear task — you can write it yourself, for free.",
              "<b>Vanity output.</b> Reach without substance is still emptiness.",
              "<b>AI as a strategy substitute.</b> A model won't decide for you who you want to be.",
              "<b>Blind trust in numbers.</b> AI confidently states statistics it invented.",
              "<b>FOMO as a business model.</b> Whoever scares you about missing out is selling you the cure too."]),
      ("h3", "How to spot a hype trap"),
      ("p", "Three warning signs almost always show up together: a deadline (“today only”), a round number with no source (“saves you 20 hours a week”) and a promise that takes your work away entirely instead of speeding it up. When all three sit in one ad, you can click it away fairly safely."),
      ("p", "That doesn't mean ignore everything. It means wait for the second wave. What's still being shared after four weeks because it genuinely helps people — and not just because it was new — has earned your attention. The rest you can miss without harm."),
      ("callout", "The uncomfortable truth: many who talk loudly about AI earn their money from the talking — not from the AI."),
    ]},
    {"title": "Data protection in five minutes", "blocks": [
      ("lead", "GDPR isn't a reason to avoid AI — but a reason to think for a moment before the first click. Here's the check that takes five minutes and prevents expensive mistakes."),
      ("p", "The most common mistake isn't ill will, it's convenience: quickly dropping a client call into a free transcription tool, pasting a whole mail thread with real names because it's handy right now. This is exactly where the problems that get expensive later begin. Run these five questions once per tool — then you know where you stand."),
      ("h3", "1. Where are the servers?"),
      ("p", "Data processing in the EU is the easy path. With US providers you need a solid legal basis; many large tools now offer EU data residency or business tiers with better guarantees. If the page says nothing about it, that too is an answer."),
      ("h3", "2. Is there a data-processing agreement?"),
      ("p", "As soon as you process personal data, you need a data-processing agreement with the provider. Reputable providers offer it as a standard document. If you can't find one, no client data belongs in there."),
      ("h3", "3. Are my inputs used for training?"),
      ("p", "On many free tiers yes, on business tiers often not — but only if you actively set it or pick the right plan. Check that setting once, deliberately, instead of hoping."),
      ("h3", "4. What actually needs to go in?"),
      ("p", "The best data-protection measure is leaving things out. “Client A, construction sector, job X” is plenty for a draft proposal. Names, addresses and contract numbers you don't need for it — so leave them out."),
      ("h3", "5. Could I explain this to my client?"),
      ("p", "A simple test: if you could openly tell your client how you handle their matter with AI, it's usually fine. If you'd have to hide it, something is off."),
      ("callout", "Anonymise what you can. A data-processing agreement where needed. And when in doubt, do the thing that really has to be right yourself. Here, data protection isn't a brake — it's protection for your business."),
    ]},
    {"title": "Where to go from here", "blocks": [
      ("p", "If you've read this far, you already have the most important skill: patience for substance over the reflex for hype."),
      ("p", "This eBook is a snapshot. AI changes weekly. What stays is the mindset: ask concretely, weigh the risk, judge for yourself."),
      ("h3", "Your first step this week"),
      ("p", "Don't pick five things — pick one. Take the single task that felt most like dull repetition this week and try exactly one routine from chapter 4 on it. Roughly measure how long it took before and how long now. That one honest comparison gets you further than ten tool lists you've read."),
      ("p", "That's exactly what I do every weekday in the newsletter — the three AI developments that affect your business today, in five minutes, no bullshit. No deadline, no pressure, unsubscribe any time."),
      ("lead", "Subscribe for free: abannews.com — thanks for reading. — Aban"),
    ]},
    {"title": "Templates to copy", "blocks": [
      ("lead", "Seven building blocks you paste straight into your language model. Replace the placeholders in square brackets and it runs."),
      ("p", "One rule first: the more context sits at the top of the job, the less you fix afterwards. Always say who you are, who the text is for and in which tone — otherwise you get the average of the whole internet."),
      ("h3", "1. Summarise a long document"),
      ("ul", ["<b>Summarise the following text in at most five bullet points.</b> Add one sentence on what I concretely need to do or decide. List open questions separately. Invent nothing that isn't in the text. Here is the text: [PASTE TEXT]"]),
      ("h3", "2. Turn notes into a post"),
      ("ul", ["<b>Turn these raw notes into a LinkedIn post for [AUDIENCE].</b> Tone: sober, no hype, no chains of exclamation marks. The first line must spark curiosity without overselling. Max 1,200 characters. Notes: [NOTES]"]),
      ("h3", "3. Draft a proposal"),
      ("ul", ["<b>Write the draft of a proposal.</b> Structure: greeting, the task in one sentence, deliverable, scope, price, timeline, next step. Factual, no sales talk. Key facts: client [INDUSTRY], task [TASK], price [AMOUNT], delivery by [DATE]."]),
      ("h3", "4. A cold email that doesn't read like spam"),
      ("ul", ["<b>Write a short cold email to a [ROLE] at a company in [INDUSTRY].</b> Max 90 words, one concrete reference to their business, a single call to action (a 15-minute call). No flattery, no buzzwords. My offer: [ONE SENTENCE]."]),
      ("h3", "5. Shorten a text without losing the point"),
      ("ul", ["<b>Cut the following text in half.</b> Keep the core message and the numbers, drop filler words and repetition. Same tone as the original. Text: [TEXT]"]),
      ("h3", "6. Find counter-arguments before others do"),
      ("ul", ["<b>I claim: [YOUR THESIS].</b> Give me the three strongest counter-arguments and a short answer to each. Be hard, not polite — I want to see the gaps before a client finds them."]),
      ("h3", "7. Pre-draft an email reply"),
      ("ul", ["<b>Draft a polite, clear reply to the following email.</b> My goal: [WHAT YOU WANT TO ACHIEVE]. Short, friendly, without grovelling, same level of formality as the original. Email: [INCOMING EMAIL]"]),
      ("callout", "Save the two or three templates you need weekly as text snippets. A template you can't find again is one you won't use."),
    ]},
    {"title": "A day, walked through", "blocks": [
      ("lead", "A realistic Tuesday for a freelance copywriter — once without, once with AI. No invented miracle number, just an honest sum."),
      ("p", "Maria is a freelance copywriter with five clients. Her Tuesday has three recurring blocks: the inbox, one client proposal, one blog post from notes. Here is how it ran before, and how it runs now."),
      ("h3", "Before: the manual Tuesday"),
      ("ul", ["<b>Inbox (40 min):</b> read 30 mails one by one, sort, answer three.",
              "<b>Proposal (50 min):</b> blank document, rethink the structure, hunt for phrasings, format.",
              "<b>Blog post (90 min):</b> turn twelve bullet points into 800 words, reorder twice.",
              "<b>Total: about three hours</b>, much of it dull setup and formatting."]),
      ("h3", "After: the same Tuesday with AI"),
      ("ul", ["<b>Inbox (20 min):</b> AI sorts into “now / later / ignore” and proposes three reply drafts. Maria reads, fixes, sends.",
              "<b>Proposal (20 min):</b> her fixed template plus five key facts, AI fills the draft. Maria checks price and tone.",
              "<b>Blog post (55 min):</b> AI builds a rough draft from the bullets, Maria writes the intro and ending herself and sharpens the claims.",
              "<b>Total: about an hour and a half</b> — the thinking stays with her, the setup falls away."]),
      ("h3", "What keeps the sum honest"),
      ("p", "That's roughly half the time — not the “10x” from the ads. And the jump didn't come on day one: Maria first needed a week to build her template and context block cleanly. She doesn't pour the saved time into more output, but into two things AI can't do: reaching out to new clients and editing texts more sharply."),
      ("p", "Just as important: where a mistake would be expensive — the price in the proposal, the facts in the blog post — she still checks every line herself. The time saving comes from the setup, not from dropping the control."),
      ("callout", "The gain isn't “more in the same time”, it's “the same quality in less time — and the rest for what only you can do”."),
    ]},
    {"title": "Tool by task", "blocks": [
      ("lead", "Not “which tool is best”, but “what do I use for which task”. With honest notes on cost and GDPR."),
      ("p", "The names below are examples, not paid recommendations. Prices are rough orders of magnitude from early 2026 and change; check the current state before subscribing. There are no affiliate links here."),
      ("h3", "Writing and editing"),
      ("ul", ["<b>For:</b> text, summaries, rewriting, sorting.",
              "<b>Examples:</b> Claude, ChatGPT (both around 20-25 euros a month on the paid tier).",
              "<b>GDPR:</b> check EU data residency and a data-processing agreement; don't enter real client names without need."]),
      ("h3", "Research with sources"),
      ("ul", ["<b>For:</b> an overview of a topic, with checkable links.",
              "<b>Examples:</b> Perplexity (free tier available, Pro around 20 euros a month).",
              "<b>Honest:</b> always open the cited sources yourself — “with sources” does not mean “correct”."]),
      ("h3", "Automation"),
      ("ul", ["<b>For:</b> connecting services, recurring routines without click-work.",
              "<b>Examples:</b> Make.com (free quota, then from a few euros), n8n (open source, free when self-hosted).",
              "<b>Honest:</b> only worth it from three manual repetitions a week; before that it's tinkering."]),
      ("h3", "Images"),
      ("ul", ["<b>For:</b> illustrations, simple graphics, social images.",
              "<b>Examples:</b> Canva (free tier, AI features on the paid plan from around 12 euros a month).",
              "<b>Honest:</b> check rights and trademarks; don't use generated images blindly as your own brand."]),
      ("h3", "Transcription and notes"),
      ("ul", ["<b>For:</b> turning conversations, voice notes and calls into text.",
              "<b>Examples:</b> Whisper (open source, free locally), various web services (often from around 10 euros a month).",
              "<b>GDPR:</b> get consent for client calls; local processing is friendlier for data protection."]),
      ("p", "The rule above all: start with one good language model. Only when the same task there regularly takes too long is a second, specialised tool worth it."),
      ("callout", "One tool you've mastered beats five you've merely installed. Extend the stack only when a concrete task forces you to."),
    ]},
    {"title": "Plain-talk glossary: ten terms without fog", "blocks": [
      ("lead", "So no salesperson can intimidate you with jargon. Ten terms that come up in every other AI conversation — explained in one sentence."),
      ("ul", ["<b>Language model (LLM):</b> the program behind ChatGPT or Claude that builds the most likely next word from text.",
              "<b>Prompt:</b> your brief to the model. The clearer it is, the better the answer.",
              "<b>Token:</b> the little chunks the model splits text into — roughly a word part. Billing and length limits run on these.",
              "<b>Context window:</b> how much text the model holds in view at once. When it's full, the beginning falls off the back.",
              "<b>Hallucination:</b> an invented but confidently delivered answer. Not a glitch, but the flip side of how it works.",
              "<b>Fine-tuning:</b> retraining a model on your own data. Unnecessary for most solopreneurs — good context in the prompt is enough.",
              "<b>RAG:</b> handing the model your own relevant documents before it answers, so it quotes from them instead of guessing.",
              "<b>Agent:</b> a model that doesn't just answer but carries out steps itself. Sounds big, breaks fast in practice — keep it narrow.",
              "<b>API:</b> the interface other programs use to talk to the model. Relevant only once you automate something.",
              "<b>Open source / local:</b> models you can run yourself. More control and privacy, but more effort."]),
      ("callout", "You don't need to master any of these terms to use AI sensibly. But whoever knows them won't be sold something they don't need."),
    ]},
  ],
},
"fr": {
  "title": "Anti-Hype",
  "subtitle": "Comment les indépendants utilisent l'IA sans bullshit",
  "edition": "Édition augmentée · 2026",
  "subject": "L'IA sans le battage, pour les indépendants",
  "keywords": "IA, anti-hype, indépendant, solopreneur, newsletter, productivité",
  "toc_title": "Sommaire",
  "toc_note": "Ne le lis pas d'un bout à l'autre comme un devoir. Va au chapitre qui résout ton problème du jour. Les derniers chapitres sont l'atelier : des modèles à copier, une journée entièrement déroulée et un aperçu outil par tâche.",
  "chapters": [
    {"title": "Pourquoi ce eBook existe", "blocks": [
      ("lead", "La plupart des guides IA te vendent une sensation. Pas celui-ci."),
      ("p", "Depuis 2024 j'écris chaque jour ouvré une newsletter sur l'IA pour des gens qui en gagnent leur vie — pas qui en parlent. En chemin j'ai testé des centaines d'outils, supprimé des dizaines, et constaté : la plupart de ce qu'on vend comme « indispensable 2026 » résout un problème que tu n'as pas."),
      ("p", "Ce eBook est la version concentrée pour une personne : l'indépendant dont la journée fait 24 heures et qui n'en gaspillera aucune en démos d'outils."),
      ("p", "Un exemple que je vois souvent : quelqu'un paie un abonnement à 200 € pour un « système de contenu IA » parce qu'une vidéo a promis 30 posts par semaine. Trois semaines plus tard, zéro post — parce que le problème n'a jamais été d'écrire, mais l'absence de décision sur quoi écrire. Aucun outil au monde ne prend cette décision à ta place."),
      ("h3", "Ce que tu ne trouveras PAS ici"),
      ("ul", ["Des prompts qui « automatisent ton activité » mais ne produisent qu'un joli paragraphe.",
              "Des listes de 50 outils dont tu n'en ouvriras jamais 47.",
              "La promesse que l'IA te rend riche pendant que tu dors."]),
      ("h3", "Comment utiliser ce eBook"),
      ("p", "Des chapitres courts et autonomes, chacun lu en moins de dix minutes. Lis celui qui touche ton problème du jour, essaie une seule chose, et reviens quand la question suivante apparaît. Le savoir que tu n'appliques pas n'est qu'une consommation devenue plus chère."),
      ("callout", "Ce que tu trouveras : une façon de penser qui sépare le fond du spectacle — et quelques routines concrètes qui font gagner des heures."),
    ]},
    {"title": "Le filtre anti-bullshit en 3 questions", "blocks": [
      ("p", "Avant de prendre au sérieux un outil, une formation ou une tendance IA, passe-le par trois questions. S'il survit aux trois, il mérite un second regard."),
      ("h3", "1. Qu'est-ce qui est remplacé, exactement ?"),
      ("p", "Pas « que sait-il faire », mais : quelle tâche concrète que tu fais à la main aujourd'hui disparaît ? Si la réponse reste floue, c'est du spectacle. Si elle est concrète, c'est du fond."),
      ("p", "Test : décris la tâche en une phrase qui commence par « Au lieu de X, je fais maintenant Y ». « Au lieu de retaper chaque reçu à la main, je le photographie et je fais extraire les données » est concret. « Ça rend ma comptabilité plus intelligente » est du marketing."),
      ("h3", "2. Combien ça me coûte quand il se trompe ?"),
      ("p", "L'IA hallucine. Toujours. La seule question, c'est le coût d'une erreur. Relire un brouillon de post coûte 30 secondes — délègue. Reprendre un chiffre fiscal sans vérifier coûte de l'argent réel — vérifie chaque ligne."),
      ("p", "Range tes tâches en gros dans deux paniers : réversible et coûteux-irréversible. Un titre qui ne fait pas mouche, tu le corriges en quelques minutes — laisse l'IA t'en proposer dix. Une newsletter envoyée à 4 000 personnes avec un chiffre faux ne se rattrape plus. Plus l'erreur coûte cher, plus ta propre vérification compte."),
      ("h3", "3. Ça marche sans moi — ou avec moi ?"),
      ("p", "« Entièrement automatique » est presque toujours un mensonge. Les outils qui tiennent la route sont des accélérateurs : tu restes la tête, l'IA fait le travail ingrat entre les deux."),
      ("h3", "L'erreur de raisonnement la plus fréquente"),
      ("p", "La plupart demandent « qu'est-ce que cet outil sait faire ? » et se laissent impressionner par la longue réponse. La meilleure question est « quelle tâche unique de ma semaine me retire-t-il de façon fiable ? ». Un outil qui fait vraiment une chose bat dix outils qui font tout un peu."),
      ("callout", "L'IA est un stagiaire à la mémoire parfaite et au jugement nul. Traite-la ainsi — et tu seras rarement déçu."),
    ]},
    {"title": "Ce que l'IA sait faire — et où elle échoue de façon fiable", "blocks": [
      ("lead", "Avant de mettre l'IA au travail, il faut savoir pour quoi elle est faite — et pour quoi elle ne l'est pas. Ça t'épargne la plupart des déceptions."),
      ("p", "Un modèle de langage est, au fond, une machine qui prédit le mot suivant. Ça paraît anodin, mais ça explique presque tout : pourquoi il formule brillamment et invente des faits dans la même phrase, pourquoi il ne remarque jamais qu'il se trompe, et pourquoi la même demande donne deux fois des réponses légèrement différentes. Il ne calcule pas la vérité, mais la probabilité."),
      ("h3", "Là où l'IA est forte aujourd'hui"),
      ("ul", ["<b>Reformuler :</b> du long en court, des points en texte suivi, du formel en décontracté. Sa discipline reine.",
              "<b>Premiers brouillons :</b> remplir la page blanche pour que tu aies quelque chose à éditer plutôt qu'à inventer.",
              "<b>Trier et résumer :</b> réduire de grandes quantités de texte à l'essentiel.",
              "<b>Expliquer la langue :</b> un terme technique, un message d'erreur, une clause de contrat — en mots clairs.",
              "<b>Fournir des variantes :</b> dix titres, cinq objets d'e-mail, trois tons, et tu choisis."]),
      ("h3", "Là où elle échoue de façon fiable"),
      ("ul", ["<b>Faits et chiffres :</b> elle cite des sources, des dates et des statistiques avec aplomb, même quand elle vient de les inventer.",
              "<b>L'actualité :</b> le modèle ne connaît le monde que jusqu'à une date limite ; ce qui s'est passé la semaine dernière, il ne le sait pas de lui-même.",
              "<b>Calculer et compter :</b> sur des maths à plusieurs étapes ou pour compter, il se trompe plus souvent que tu ne crois.",
              "<b>Juger :</b> ce qui est juste, équitable ou stratégiquement malin, il ne le décide pas — il imite seulement la façon dont les gens en parlent."]),
      ("p", "La frontière ne passe donc pas entre facile et difficile, mais entre langue et vérité. Tant qu'il s'agit de forme, l'IA est un partenaire solide. Dès qu'il s'agit de faits, c'est une machine à affirmer que tu dois vérifier."),
      ("callout", "Utilise l'IA pour tout ce que tu peux relire et corriger toi-même. Ne l'utilise jamais comme dernière instance pour ce qui doit être exact."),
    ]},
    {"title": "Ton stack IA minimal", "blocks": [
      ("lead", "Tu n'as pas besoin de 20 abonnements. Tu as besoin de quatre briques."),
      ("h3", "1. Un bon modèle de langage (obligatoire)"),
      ("p", "Claude ou ChatGPT, version payante. Ton cheval de trait pour rédiger, trier, résumer. Un seul suffit — apprends-le bien plutôt que d'en changer sans cesse."),
      ("p", "Les 20 à 25 € par mois de la version payante sont rarement le sujet : si tu gagnes une heure par semaine, c'est rentabilisé dès le premier jour à n'importe quel taux horaire réaliste. Ce qui est vraiment rare, c'est ton temps pour apprendre à bien t'en servir — pas le budget."),
      ("h3", "2. Un hub d'automatisation (optionnel)"),
      ("p", "Make.com ou n8n. C'est là que tu relies tes services. À ajouter seulement quand tu fais vraiment une tâche à la main trois fois par semaine."),
      ("h3", "3. Un endroit pour ton savoir"),
      ("p", "Notion, Obsidian, peu importe — du moment que c'est cherchable. L'IA ne vaut que le contexte que tu lui donnes."),
      ("p", "Concrètement : tiens un simple fichier texte avec ta cible, ton ton, tes trois tâches les plus fréquentes et quelques tournures qui te ressemblent. Tu colles ce bloc en tête de chaque travail un peu long. La différence entre une réponse générique et une qui te ressemble, c'est presque toujours ce contexte — pas le modèle."),
      ("h3", "4. Clarté RGPD (non négociable)"),
      ("p", "Avant de verser des données clients dans un outil : où sont les serveurs ? Y a-t-il un contrat de sous-traitance ? Une violation RGPD coûte plus cher que tout gain de productivité."),
      ("p", "À faire : anonymise ce dont tu n'as pas besoin — « client A dans le secteur B » suffit largement pour un brouillon d'offre. À éviter : verser des fils de mails entiers avec noms réels, adresses et détails de contrat dans un outil gratuit quelconque, juste parce que c'est pratique sur le moment."),
      ("callout", "Règle : le processus d'abord, l'outil ensuite. Qui commence par l'outil cherche ensuite un problème à lui coller."),
    ]},
    {"title": "Comment parler à l'IA pour en tirer quelque chose d'utile", "blocks": [
      ("lead", "La plupart des mauvaises réponses de l'IA ne viennent pas du modèle, mais de la demande. Quatre gestes changent presque tout."),
      ("p", "Un bon modèle de langage est comme un stagiaire compétent : plus la demande est claire, moins tu corriges ensuite. Une demande vague donne la moyenne de la moitié de l'internet — correcte, mais interchangeable. Ces quatre gestes améliorent la qualité plus que tout changement d'outil."),
      ("h3", "1. Dis qui tu es et à qui s'adresse le texte"),
      ("p", "« Écris un texte sur les impôts » est un coup de dé. « Je suis comptable et j'écris pour des artisans indépendants pressés — explique le régime de la micro-entreprise en mots simples » donne quelque chose d'utilisable. Le contexte n'est pas un accessoire, c'est la moitié de la demande."),
      ("h3", "2. Impose le format"),
      ("p", "Dis ce qui doit sortir : cinq points, un tableau, un paragraphe de moins de cent mots, un e-mail avec objet. Sans format, tu obtiens du texte suivi que tu devras ensuite redécouper."),
      ("h3", "3. Montre un exemple"),
      ("p", "Un seul exemple de ton style pèse plus que trois paragraphes d'explication. Ajoute un ancien post, un e-mail précédent ou une tournure qui te ressemble, et dis : « sur ce ton ». Le modèle imite — donne-lui donc quelque chose de bon à imiter."),
      ("h3", "4. Itère au lieu de relancer les dés"),
      ("p", "La première réponse est un brouillon, pas un produit fini. Dis concrètement ce qui ne va pas : « trop commercial », « plus court », « le deuxième point est faux, enlève-le ». Deux ou trois corrections ciblées t'avancent plus que dix « refais-le »."),
      ("h3", "La différence sur un exemple"),
      ("p", "Faible : « Écris-moi une newsletter sur l'IA. » Fort : « Écris l'intro de ma newsletter pour des indépendants francophones. Ton sobre, tutoiement, sans hype, quatre-vingts mots maximum, la première phrase doit éveiller la curiosité sans en faire trop. Sujet : pourquoi la plupart des outils IA résolvent un problème qu'on n'a pas. » Le même effort à la frappe — une différence du tout au tout dans le résultat."),
      ("callout", "Contexte, format, exemple, correction. Qui fournit ces quatre choses n'a pas besoin d'un pack de prompts à 47 €."),
    ]},
    {"title": "Cinq routines qui font vraiment gagner du temps", "blocks": [
      ("p", "Pas de magie — juste du travail répétitif que tu délègues."),
      ("ul", ["<b>Pré-trier ta boîte mail :</b> l'IA range les mails en trois paniers — maintenant, plus tard, ignorer. C'est toi qui décides.",
              "<b>Faire trois formats d'un long contenu :</b> une entrée, plusieurs sorties. Tu édites au lieu de partir de zéro.",
              "<b>Rédiger des offres plus vite :</b> un modèle plus les données clés, l'IA fait le brouillon. 45 minutes deviennent 10.",
              "<b>Grouper la recherche :</b> un brief clair avec obligation de sources — puis vérifie les sources toi-même.",
              "<b>Faire le miroir de ta semaine :</b> l'IA comme miroir lucide, pas comme coach à confettis."]),
      ("h3", "Une routine déroulée concrètement"),
      ("p", "Prends l'offre. Au lieu de partir d'un document vide, tu gardes un modèle fixe : salutation, prestation, périmètre, prix, délai, prochaine étape. Tu ne donnes à l'IA que les cinq données clés du cas et le modèle, et tu la laisses remplir le brouillon. Ensuite tu relis une fois, tu corriges le prix et le ton — fini. La réflexion (combien ça coûte, qu'est-ce que je promets) reste chez toi ; seules la frappe et la mise en forme disparaissent."),
      ("p", "Dans les faits, c'est plutôt un gain d'environ la moitié du temps que le « 10x » des publicités — et seulement après avoir construit le modèle proprement une fois. Ça paraît modeste, mais sur une année ça finit par représenter des semaines entières de travail."),
      ("callout", "Chaque routine te garde comme dernière instance. L'IA fournit la matière ; ton jugement fait le produit."),
    ]},
    {"title": "Sept pièges du hype", "blocks": [
      ("ul", ["<b>La collectionnite d'outils.</b> Dix outils à moitié appris sont plus lents qu'un seul maîtrisé.",
              "<b>Le mythe du pilote automatique.</b> « Ça tourne tout seul » veut souvent dire « ça casse tout seul quand tu ne regardes pas ».",
              "<b>Les packs de prompts à 47 €.</b> Un bon prompt est une tâche claire — tu peux l'écrire toi-même, gratuitement.",
              "<b>La production de vanité.</b> De la portée sans fond reste du vide.",
              "<b>L'IA comme substitut de stratégie.</b> Un modèle ne décidera pas pour toi qui tu veux être.",
              "<b>La confiance aveugle dans les chiffres.</b> L'IA énonce avec assurance des statistiques qu'elle invente.",
              "<b>La FOMO comme modèle économique.</b> Qui te fait peur de rater quelque chose te vend aussi le remède."]),
      ("h3", "À quoi reconnaître un piège du hype"),
      ("p", "Trois signaux d'alerte apparaissent presque toujours ensemble : une échéance (« aujourd'hui seulement »), un chiffre rond sans source (« te fait gagner 20 heures par semaine ») et une promesse qui supprime entièrement ton travail au lieu de l'accélérer. Quand les trois figurent dans une même pub, tu peux la fermer sans grand risque."),
      ("p", "Ça ne veut pas dire tout ignorer. Ça veut dire : attends la deuxième vague. Ce qui est encore partagé au bout de quatre semaines parce que ça aide vraiment les gens — et pas seulement parce que c'était nouveau — mérite ton attention. Le reste, tu le rates sans dommage."),
      ("callout", "La vérité qui dérange : beaucoup de ceux qui parlent fort d'IA gagnent leur argent en parlant — pas avec l'IA."),
    ]},
    {"title": "La protection des données en cinq minutes", "blocks": [
      ("lead", "Le RGPD n'est pas une raison d'éviter l'IA — mais une raison de réfléchir un instant avant le premier clic. Voici la vérification qui prend cinq minutes et évite les erreurs coûteuses."),
      ("p", "L'erreur la plus fréquente n'est pas la mauvaise volonté, mais la facilité : glisser vite un appel client dans un outil de transcription gratuit, coller tout un fil de mails avec des noms réels parce que c'est pratique sur le moment. C'est exactement là que naissent les problèmes qui coûtent cher plus tard. Passe ces cinq questions une fois par outil — ensuite tu sais où tu en es."),
      ("h3", "1. Où sont les serveurs ?"),
      ("p", "Le traitement des données dans l'UE est la voie simple. Avec des fournisseurs américains, il te faut une base légale solide ; beaucoup de grands outils proposent désormais une résidence des données en UE ou des offres pro avec de meilleures garanties. Si la page n'en dit rien, c'est déjà une réponse."),
      ("h3", "2. Y a-t-il un contrat de sous-traitance ?"),
      ("p", "Dès que tu traites des données personnelles, il te faut un contrat de sous-traitance avec le fournisseur. Les fournisseurs sérieux le proposent comme document standard. Si tu n'en trouves pas, aucune donnée client n'a sa place là."),
      ("h3", "3. Mes saisies servent-elles à l'entraînement ?"),
      ("p", "Sur beaucoup de niveaux gratuits oui, sur les offres pro souvent non — mais seulement si tu le règles activement ou choisis la bonne formule. Vérifie ce réglage une fois, sciemment, au lieu de l'espérer."),
      ("h3", "4. Qu'est-ce qui doit vraiment entrer ?"),
      ("p", "La meilleure mesure de protection, c'est d'en mettre moins. « Client A, secteur du bâtiment, mission X » suffit largement pour un brouillon d'offre. Les noms, adresses et numéros de contrat ne te servent pas pour ça — alors laisse-les dehors."),
      ("h3", "5. Pourrais-je l'expliquer à mon client ?"),
      ("p", "Un test simple : si tu pouvais dire ouvertement à ton client comment tu traites son dossier avec l'IA, c'est en général correct. Si tu devais le cacher, quelque chose cloche."),
      ("callout", "Anonymise ce que tu peux. Un contrat de sous-traitance là où il le faut. Et dans le doute, fais toi-même ce qui doit vraiment être exact. Ici, la protection des données n'est pas un frein, mais la protection de ton activité."),
    ]},
    {"title": "Et maintenant ?", "blocks": [
      ("p", "Si tu as lu jusqu'ici, tu as déjà la compétence la plus importante : la patience du fond plutôt que le réflexe du hype."),
      ("p", "Ce eBook est un instantané. L'IA change chaque semaine. Ce qui reste, c'est l'état d'esprit : demander concrètement, peser le risque, juger soi-même."),
      ("h3", "Ton premier pas cette semaine"),
      ("p", "Ne choisis pas cinq choses, mais une seule. Prends la tâche qui t'a le plus donné cette semaine l'impression d'une répétition stupide, et essaie dessus exactement une routine du chapitre 4. Mesure grossièrement le temps que ça prenait avant et le temps que ça prend maintenant. Cette seule comparaison honnête t'avance plus que dix listes d'outils lues."),
      ("p", "C'est exactement ce que je fais chaque jour ouvré dans la newsletter — les trois évolutions IA qui touchent ton activité aujourd'hui, en cinq minutes, sans bullshit. Pas d'échéance, pas de pression, désabonnement à tout moment."),
      ("lead", "Abonne-toi gratuitement : abannews.com — merci de ta lecture. — Aban"),
    ]},
    {"title": "Modèles à copier", "blocks": [
      ("lead", "Sept briques que tu colles directement dans ton modèle de langage. Remplace les espaces réservés entre crochets, et ça tourne."),
      ("p", "Une règle d'abord : plus il y a de contexte en haut de la demande, moins tu corriges ensuite. Dis toujours qui tu es, à qui s'adresse le texte et sur quel ton — sinon tu obtiens la moyenne de tout l'internet."),
      ("h3", "1. Résumer un long document"),
      ("ul", ["<b>Résume le texte suivant en cinq points maximum.</b> Ajoute une phrase sur ce que je dois concrètement faire ou décider. Liste les questions ouvertes à part. N'invente rien qui ne soit pas dans le texte. Voici le texte : [COLLER LE TEXTE]"]),
      ("h3", "2. Transformer des notes en post"),
      ("ul", ["<b>Transforme ces notes brutes en un post LinkedIn pour [CIBLE].</b> Ton : sobre, sans hype, sans chaînes de points d'exclamation. La première ligne doit éveiller la curiosité sans en faire trop. Max 1 200 caractères. Notes : [NOTES]"]),
      ("h3", "3. Rédiger une offre"),
      ("ul", ["<b>Écris le brouillon d'une offre.</b> Structure : salutation, la tâche en une phrase, prestation, périmètre, prix, délai, prochaine étape. Factuel, sans discours de vente. Données clés : client [SECTEUR], tâche [TÂCHE], prix [MONTANT], livraison pour [DATE]."]),
      ("h3", "4. Un e-mail à froid qui ne sent pas le spam"),
      ("ul", ["<b>Écris un court e-mail à froid à un(e) [POSTE] dans une entreprise du secteur [SECTEUR].</b> Max 90 mots, une référence concrète à leur activité, un seul appel à l'action (un échange de 15 minutes). Pas de flatterie, pas de buzzwords. Mon offre : [UNE PHRASE]."]),
      ("h3", "5. Raccourcir un texte sans en perdre le sens"),
      ("ul", ["<b>Réduis de moitié le texte suivant.</b> Garde le message central et les chiffres, supprime les mots de remplissage et les répétitions. Même ton que l'original. Texte : [TEXTE]"]),
      ("h3", "6. Trouver les contre-arguments avant les autres"),
      ("ul", ["<b>J'affirme : [TA THÈSE].</b> Donne-moi les trois contre-arguments les plus solides et une réponse courte à chacun. Sois dur, pas poli — je veux voir les failles avant qu'un client les trouve."]),
      ("h3", "7. Préparer une réponse à un e-mail"),
      ("ul", ["<b>Rédige une réponse polie et claire à l'e-mail suivant.</b> Mon objectif : [CE QUE TU VEUX OBTENIR]. Court, aimable, sans servilité, même niveau de formalité que l'original. E-mail : [E-MAIL REÇU]"]),
      ("callout", "Enregistre comme modèles de texte les deux ou trois trames dont tu te sers chaque semaine. Une trame que tu ne retrouves pas, tu ne l'utilises pas."),
    ]},
    {"title": "Une journée, déroulée", "blocks": [
      ("lead", "Un mardi réaliste d'une rédactrice indépendante — une fois sans, une fois avec l'IA. Aucun chiffre miracle inventé, juste un calcul honnête."),
      ("p", "Maria est rédactrice indépendante avec cinq clients. Son mardi a trois blocs récurrents : la boîte mail, une offre client, un article de blog à partir de notes. Voici comment ça se passait avant, et comment ça se passe maintenant."),
      ("h3", "Avant : le mardi à la main"),
      ("ul", ["<b>Boîte mail (40 min) :</b> lire 30 mails un par un, trier, en répondre à trois.",
              "<b>Offre (50 min) :</b> document vide, repenser la structure, chercher des tournures, mettre en forme.",
              "<b>Article (90 min) :</b> transformer douze points en 800 mots, réorganiser deux fois.",
              "<b>Total : environ trois heures</b>, dont beaucoup de mise en place et de mise en forme ingrate."]),
      ("h3", "Après : le même mardi avec l'IA"),
      ("ul", ["<b>Boîte mail (20 min) :</b> l'IA trie en « maintenant / plus tard / ignorer » et propose trois brouillons de réponse. Maria lit, corrige, envoie.",
              "<b>Offre (20 min) :</b> son modèle fixe plus cinq données clés, l'IA remplit le brouillon. Maria vérifie le prix et le ton.",
              "<b>Article (55 min) :</b> l'IA fait un brouillon à partir des points, Maria écrit elle-même l'intro et la fin et affûte les affirmations.",
              "<b>Total : environ une heure et demie</b> — la réflexion lui reste, la mise en place disparaît."]),
      ("h3", "Ce qui garde le calcul honnête"),
      ("p", "C'est à peu près la moitié du temps — pas le « 10x » des publicités. Et le gain n'est pas venu le premier jour : Maria a d'abord eu besoin d'une semaine pour construire proprement son modèle et son bloc de contexte. Le temps gagné, elle ne le met pas dans plus de production, mais dans deux choses que l'IA ne sait pas faire : démarcher de nouveaux clients et éditer ses textes plus finement."),
      ("p", "Tout aussi important : là où une erreur coûterait cher — le prix dans l'offre, les faits dans l'article — elle vérifie encore chaque ligne elle-même. Le gain de temps vient de la mise en place, pas de l'abandon du contrôle."),
      ("callout", "Le gain n'est pas « plus dans le même temps », mais « la même qualité en moins de temps — et le reste pour ce que toi seul sais faire »."),
    ]},
    {"title": "L'outil selon la tâche", "blocks": [
      ("lead", "Pas « quel outil est le meilleur », mais « lequel pour quelle tâche ». Avec des notes honnêtes sur le coût et le RGPD."),
      ("p", "Les noms ci-dessous sont des exemples, pas des recommandations payées. Les prix sont des ordres de grandeur approximatifs début 2026 et évoluent ; vérifie l'état actuel avant de t'abonner. Il n'y a ici aucun lien d'affiliation."),
      ("h3", "Rédiger et éditer"),
      ("ul", ["<b>Pour :</b> textes, résumés, reformulation, tri.",
              "<b>Exemples :</b> Claude, ChatGPT (tous deux autour de 20-25 euros par mois en version payante).",
              "<b>RGPD :</b> vérifie la résidence des données en UE et un contrat de sous-traitance ; n'entre pas de vrais noms de clients sans nécessité."]),
      ("h3", "Recherche avec sources"),
      ("ul", ["<b>Pour :</b> un aperçu d'un sujet, avec des liens vérifiables.",
              "<b>Exemples :</b> Perplexity (niveau gratuit disponible, Pro autour de 20 euros par mois).",
              "<b>Honnête :</b> ouvre toujours toi-même les sources citées — « avec sources » ne veut pas dire « exact »."]),
      ("h3", "Automatisation"),
      ("ul", ["<b>Pour :</b> relier des services, des routines récurrentes sans clics.",
              "<b>Exemples :</b> Make.com (quota gratuit, puis à partir de quelques euros), n8n (open source, gratuit auto-hébergé).",
              "<b>Honnête :</b> utile seulement à partir de trois répétitions manuelles par semaine ; avant, c'est du bricolage."]),
      ("h3", "Images"),
      ("ul", ["<b>Pour :</b> illustrations, graphiques simples, visuels pour les réseaux.",
              "<b>Exemples :</b> Canva (niveau gratuit, fonctions IA dans le plan payant à partir d'environ 12 euros par mois).",
              "<b>Honnête :</b> vérifie les droits et les marques ; n'utilise pas aveuglément des images générées comme ta propre marque."]),
      ("h3", "Transcription et notes"),
      ("ul", ["<b>Pour :</b> transformer en texte des conversations, des notes vocales, des appels.",
              "<b>Exemples :</b> Whisper (open source, gratuit en local), divers services web (souvent à partir d'environ 10 euros par mois).",
              "<b>RGPD :</b> demande le consentement pour les appels clients ; le traitement local respecte mieux la protection des données."]),
      ("p", "La règle au-dessus de tout : commence avec un bon modèle de langage. Ce n'est que lorsque la même tâche y prend régulièrement trop de temps qu'un second outil spécialisé en vaut la peine."),
      ("callout", "Un outil que tu maîtrises bat cinq que tu as seulement installés. N'élargis ton stack que lorsqu'une tâche concrète t'y oblige."),
    ]},
    {"title": "Glossaire clair : dix termes sans brouillard", "blocks": [
      ("lead", "Pour qu'aucun vendeur ne t'intimide avec du jargon. Dix termes qui reviennent dans une conversation IA sur deux — expliqués en une phrase."),
      ("ul", ["<b>Modèle de langage (LLM) :</b> le programme derrière ChatGPT ou Claude, qui construit à partir du texte le mot suivant le plus probable.",
              "<b>Prompt :</b> ta demande au modèle. Plus elle est claire, meilleure est la réponse.",
              "<b>Token :</b> les petits morceaux en lesquels le modèle découpe le texte — en gros un bout de mot. La facturation et les limites de longueur passent par là.",
              "<b>Fenêtre de contexte :</b> la quantité de texte que le modèle garde en vue à la fois. Quand elle est pleine, le début tombe par l'arrière.",
              "<b>Hallucination :</b> une réponse inventée mais énoncée avec aplomb. Pas un bug, mais l'envers de son fonctionnement.",
              "<b>Fine-tuning :</b> réentraîner un modèle avec tes propres données. Inutile pour la plupart des indépendants — un bon contexte dans le prompt suffit.",
              "<b>RAG :</b> donner au modèle tes documents pertinents avant la réponse, pour qu'il en cite plutôt que de deviner.",
              "<b>Agent :</b> un modèle qui ne se contente pas de répondre mais exécute lui-même des étapes. Ça sonne grand, ça casse vite en pratique — garde-le étroit.",
              "<b>API :</b> l'interface par laquelle d'autres programmes s'adressent au modèle. Pertinent seulement quand tu automatises quelque chose.",
              "<b>Open source / local :</b> des modèles que tu peux faire tourner toi-même. Plus de contrôle et de confidentialité, mais plus d'efforts."]),
      ("callout", "Tu n'as besoin de maîtriser aucun de ces termes pour utiliser l'IA intelligemment. Mais qui les connaît ne se fait pas vendre ce dont il n'a pas besoin."),
    ]},
  ],
},
"it": {
  "title": "Anti-Hype",
  "subtitle": "Come i liberi professionisti usano l'IA senza bullshit",
  "edition": "Edizione ampliata · 2026",
  "subject": "L'IA senza il clamore, per chi lavora in proprio",
  "keywords": "IA, anti-hype, libero professionista, solopreneur, newsletter, produttività",
  "toc_title": "Indice",
  "toc_note": "Non leggerlo dall'inizio alla fine come un compito. Salta al capitolo che risolve il problema di oggi. Gli ultimi capitoli sono il laboratorio: modelli da copiare, una giornata svolta per intero e una panoramica strumento per compito.",
  "chapters": [
    {"title": "Perché esiste questo eBook", "blocks": [
      ("lead", "La maggior parte delle guide sull'IA ti vende una sensazione. Questa no."),
      ("p", "Dal 2024 scrivo ogni giorno feriale una newsletter sull'IA per chi ci guadagna — non per chi ne parla. Nel frattempo ho provato centinaia di strumenti, ne ho cancellati dozzine e ho notato: gran parte di ciò che viene venduto come “imprescindibile 2026” risolve un problema che non hai."),
      ("p", "Questo eBook è la versione concentrata per una persona: chi lavora in proprio, ha una giornata di 24 ore e non ne sprecherà nessuna in demo di strumenti."),
      ("p", "Un esempio che vedo spesso: qualcuno paga un abbonamento da 200 € per un “sistema di contenuti IA” perché un video ha promesso 30 post a settimana. Tre settimane dopo, zero post — perché il problema non è mai stato scrivere, ma la decisione mancante su cosa scrivere. Nessuno strumento al mondo prende quella decisione al posto tuo."),
      ("h3", "Cosa NON troverai qui"),
      ("ul", ["Prompt che “automatizzano la tua attività” ma in realtà producono solo un bel paragrafo.",
              "Liste di 50 strumenti, di cui 47 non aprirai mai.",
              "La promessa che l'IA ti rende ricco mentre dormi."]),
      ("h3", "Come usare questo eBook"),
      ("p", "Capitoli brevi e autonomi, ognuno letto in meno di dieci minuti. Leggi quello che tocca il problema di oggi, prova una sola cosa e torna quando spunta la domanda successiva. La conoscenza che non applichi è solo consumo diventato più caro."),
      ("callout", "Cosa troverai: un modo di pensare che separa la sostanza dalla scena — e qualche routine concreta che fa risparmiare ore."),
    ]},
    {"title": "Il filtro anti-bullshit in 3 domande", "blocks": [
      ("p", "Prima di prendere sul serio uno strumento, un corso o un trend di IA, passalo per tre domande. Se sopravvive a tutte e tre, merita un secondo sguardo."),
      ("h3", "1. Cosa viene sostituito, esattamente?"),
      ("p", "Non “cosa sa fare”, ma: quale compito concreto che oggi fai a mano sparisce? Se la risposta resta vaga, è scena. Se è concreta, è sostanza."),
      ("p", "Prova: descrivi il compito in una frase che inizia con “Invece di X, ora faccio Y”. “Invece di ribattere ogni ricevuta a mano, la fotografo e faccio estrarre i dati” è concreto. “Rende la mia contabilità più intelligente” è marketing."),
      ("h3", "2. Quanto mi costa quando sbaglia?"),
      ("p", "L'IA allucina. Sempre. L'unica domanda è quanto costa un errore. Rileggere una bozza di post costa 30 secondi — delega. Copiare un dato fiscale senza controllo costa soldi veri — verifica ogni riga."),
      ("p", "Dividi i compiti grossolanamente in due cesti: reversibile e costoso-irreversibile. Un titolo che non funziona lo correggi in pochi minuti — fatti dare dall'IA dieci varianti. Una newsletter inviata a 4.000 persone con un numero sbagliato non si recupera più. Più l'errore è costoso, più conta il tuo controllo."),
      ("h3", "3. Funziona senza di me — o con me?"),
      ("p", "“Completamente automatico” è quasi sempre una bugia. Gli strumenti che reggono davvero sono acceleratori: tu resti la testa, l'IA fa il lavoro noioso nel mezzo."),
      ("h3", "L'errore di ragionamento più comune"),
      ("p", "La maggior parte chiede “cosa sa fare questo strumento?” e resta colpita dalla risposta lunga. La domanda migliore è “quale singolo compito della mia settimana mi toglie in modo affidabile?”. Uno strumento che fa davvero una cosa batte dieci che fanno tutto un po'."),
      ("callout", "L'IA è uno stagista con memoria perfetta e giudizio zero. Trattala così — e raramente resterai deluso."),
    ]},
    {"title": "Cosa sa fare l'IA — e dove fallisce in modo affidabile", "blocks": [
      ("lead", "Prima di mettere l'IA al lavoro, dovresti sapere per cosa è fatta — e per cosa no. Ti risparmia gran parte delle delusioni."),
      ("p", "Un modello linguistico è in fondo una macchina che predice la parola successiva. Sembra poco, ma spiega quasi tutto: perché formula in modo brillante e inventa fatti nello stesso respiro, perché non si accorge mai di sbagliare e perché lo stesso compito dà due volte risposte leggermente diverse. Non calcola la verità, ma la probabilità."),
      ("h3", "Dove l'IA è forte oggi"),
      ("ul", ["<b>Riformulare:</b> da lungo a breve, da punti a testo continuo, da formale a informale. La sua disciplina principe.",
              "<b>Prime bozze:</b> riempire la pagina bianca così hai qualcosa da editare invece che da inventare.",
              "<b>Ordinare e riassumere:</b> ridurre grandi quantità di testo all'essenziale.",
              "<b>Spiegare la lingua:</b> un termine tecnico, un messaggio d'errore, una clausola di contratto — in parole chiare.",
              "<b>Fornire varianti:</b> dieci titoli, cinque oggetti per email, tre toni, e scegli tu."]),
      ("h3", "Dove fallisce in modo affidabile"),
      ("ul", ["<b>Fatti e numeri:</b> cita fonti, date e statistiche con piena sicurezza, anche quando le ha appena inventate.",
              "<b>L'attualità:</b> il modello conosce il mondo solo fino a una data di taglio; cosa è successo la settimana scorsa non lo sa da sé.",
              "<b>Calcolare e contare:</b> con la matematica a più passaggi o nel contare sbaglia più spesso di quanto pensi.",
              "<b>Giudicare:</b> cosa è giusto, equo o strategicamente intelligente non lo decide — imita solo come ne scrivono le persone."]),
      ("p", "Il confine quindi non passa tra facile e difficile, ma tra lingua e verità. Finché si tratta di forma, l'IA è un partner forte. Appena si tratta di fatti, è una macchina di affermazioni che devi verificare."),
      ("callout", "Usa l'IA per tutto ciò che puoi rileggere e correggere da te. Non usarla mai come ultima istanza per qualcosa che deve essere giusto."),
    ]},
    {"title": "Il tuo stack IA minimo", "blocks": [
      ("lead", "Non ti servono 20 abbonamenti. Ti servono quattro mattoni."),
      ("h3", "1. Un buon modello linguistico (obbligatorio)"),
      ("p", "Claude o ChatGPT, versione a pagamento. Il tuo cavallo da lavoro per scrivere, ordinare, riassumere. Uno basta — imparalo bene invece di cambiare in continuazione."),
      ("p", "I 20-25 € al mese della versione a pagamento sono raramente il punto: se ti fanno risparmiare un'ora a settimana, si ripagano già il primo giorno a qualsiasi tariffa oraria realistica. Ciò che scarseggia davvero è il tuo tempo per imparare a usarlo bene — non il budget."),
      ("h3", "2. Un hub di automazione (opzionale)"),
      ("p", "Make.com o n8n. Qui colleghi i servizi tra loro. Da aggiungere solo quando un compito lo fai davvero a mano tre volte a settimana."),
      ("h3", "3. Un posto per la tua conoscenza"),
      ("p", "Notion, Obsidian, non importa — basta che sia ricercabile. L'IA vale solo quanto il contesto che le dai."),
      ("p", "In concreto: tieni un semplice file di testo con il tuo pubblico, il tuo tono, i tuoi tre compiti più frequenti e qualche formulazione che suona come te. Incolli quel blocco in testa a ogni lavoro un po' lungo. La differenza tra una risposta generica e una che suona come te è quasi sempre solo questo contesto — non il modello."),
      ("h3", "4. Chiarezza GDPR (non negoziabile)"),
      ("p", "Prima di riversare dati dei clienti in uno strumento: dove sono i server? C'è un contratto di trattamento dati? Una violazione GDPR costa più di qualsiasi guadagno di produttività."),
      ("p", "Fai: anonimizza ciò che non ti serve — “cliente A nel settore B” basta e avanza per una bozza di offerta. Non fare: riversare interi scambi di mail con nomi reali, indirizzi e dettagli di contratto in un qualsiasi strumento gratuito, solo perché al momento è comodo."),
      ("callout", "Regola: prima il processo, poi lo strumento. Chi parte dallo strumento poi cerca un problema da incastrarci."),
    ]},
    {"title": "Come parlare all'IA perché ne esca qualcosa di utile", "blocks": [
      ("lead", "La maggior parte delle risposte scadenti dell'IA non dipende dal modello, ma dalla richiesta. Quattro mosse cambiano quasi tutto."),
      ("p", "Un buon modello linguistico è come uno stagista capace: più la richiesta è chiara, meno correggi dopo. Una richiesta vaga dà la media di mezzo internet — corretta, ma intercambiabile. Queste quattro mosse alzano la qualità più di qualsiasi cambio di strumento."),
      ("h3", "1. Di' chi sei e a chi è rivolto il testo"),
      ("p", "« Scrivi un testo sulle tasse » è un tiro di dadi. « Sono una commercialista e scrivo per artigiani autonomi che hanno poco tempo — spiega il regime forfettario in parole semplici » dà qualcosa di utilizzabile. Il contesto non è un accessorio, è metà della richiesta."),
      ("h3", "2. Imposta il formato"),
      ("p", "Di' cosa deve uscire: cinque punti, una tabella, un paragrafo sotto le cento parole, un'email con oggetto. Senza un formato ottieni testo continuo che poi devi di nuovo smontare."),
      ("h3", "3. Mostra un esempio"),
      ("p", "Un solo esempio del tuo stile vale più di tre paragrafi di spiegazione. Allega un vecchio post, un'email precedente o una formulazione che suona come te, e di': « in questo tono ». Il modello imita — quindi dagli qualcosa di buono da imitare."),
      ("h3", "4. Itera invece di ritirare i dadi"),
      ("p", "La prima risposta è una bozza, non un prodotto finito. Di' concretamente cosa non va: « troppo commerciale », « più corto », « il secondo punto è sbagliato, toglilo ». Due o tre correzioni mirate ti portano più avanti di dieci « rifallo »."),
      ("h3", "La differenza in un esempio"),
      ("p", "Debole: « Scrivimi una newsletter sull'IA. » Forte: « Scrivi l'introduzione della mia newsletter per liberi professionisti italiani. Tono sobrio, informale, niente hype, al massimo ottanta parole, la prima frase deve incuriosire senza esagerare. Tema: perché la maggior parte degli strumenti IA risolve un problema che non hai. » Lo stesso sforzo nel digitare — una differenza dal giorno alla notte nel risultato."),
      ("callout", "Contesto, formato, esempio, correzione. Chi fornisce queste quattro cose non ha bisogno di un pacchetto di prompt da 47 €."),
    ]},
    {"title": "Cinque routine che fanno davvero risparmiare tempo", "blocks": [
      ("p", "Niente magia — solo lavoro di routine che deleghi."),
      ("ul", ["<b>Pre-ordina la posta:</b> l'IA mette le mail in tre cestini — ora, dopo, ignora. Decidi sempre tu.",
              "<b>Da un contenuto lungo tre formati:</b> un input, più output. Tu editi invece di partire da zero.",
              "<b>Scrivere offerte più in fretta:</b> un modello più i dati chiave, l'IA fa la bozza. 45 minuti diventano 10.",
              "<b>Raggruppare la ricerca:</b> un brief chiaro con obbligo di fonti — poi controlla le fonti tu stesso.",
              "<b>Specchiare la tua settimana:</b> l'IA come specchio lucido, non come coach con i coriandoli."]),
      ("h3", "Una routine svolta nel concreto"),
      ("p", "Prendi l'offerta. Invece di partire da un documento vuoto, tieni un modello fisso: saluto, prestazione, ambito, prezzo, tempi, prossimo passo. Dai all'IA solo i cinque dati chiave del caso e il modello, e la lasci riempire la bozza. Poi rileggi una volta, correggi prezzo e tono — fatto. Il ragionamento (quanto costa, cosa prometto) resta a te; spariscono solo la digitazione e la formattazione."),
      ("p", "Nei fatti è più un risparmio di circa metà del tempo che il “10x” delle pubblicità — e solo dopo aver costruito il modello bene una volta. Sembra poco appariscente, ma nell'arco di un anno si somma a intere settimane di lavoro."),
      ("callout", "Ogni routine ti tiene come ultima istanza. L'IA fornisce la materia prima; il tuo giudizio fa il prodotto."),
    ]},
    {"title": "Sette trappole dell'hype", "blocks": [
      ("ul", ["<b>La collezione compulsiva di strumenti.</b> Dieci strumenti imparati a metà sono più lenti di uno padroneggiato.",
              "<b>Il mito del pilota automatico.</b> “Va da solo” di solito significa “si rompe da solo quando non guardi”.",
              "<b>I pacchetti di prompt a 47 €.</b> Un buon prompt è un compito chiaro — puoi scriverlo da te, gratis.",
              "<b>L'output di vanità.</b> Portata senza sostanza resta vuoto.",
              "<b>L'IA come sostituto della strategia.</b> Un modello non deciderà per te chi vuoi essere.",
              "<b>La fiducia cieca nei numeri.</b> L'IA enuncia con sicurezza statistiche che inventa.",
              "<b>La FOMO come modello di business.</b> Chi ti spaventa di perderti qualcosa ti vende anche la cura."]),
      ("h3", "Come riconoscere una trappola dell'hype"),
      ("p", "Tre segnali d'allarme compaiono quasi sempre insieme: una scadenza (“solo oggi”), un numero tondo senza fonte (“ti fa risparmiare 20 ore a settimana”) e una promessa che ti toglie del tutto il lavoro invece di accelerarlo. Quando tutti e tre stanno in una stessa pubblicità, puoi chiuderla senza troppi rischi."),
      ("p", "Non significa ignorare tutto. Significa: aspetta la seconda ondata. Ciò che dopo quattro settimane viene ancora condiviso perché aiuta davvero le persone — e non solo perché era nuovo — si è guadagnato la tua attenzione. Il resto te lo perdi senza danni."),
      ("callout", "La verità scomoda: molti di quelli che parlano forte di IA guadagnano parlando — non con l'IA."),
    ]},
    {"title": "La protezione dei dati in cinque minuti", "blocks": [
      ("lead", "Il GDPR non è un motivo per evitare l'IA — ma un motivo per riflettere un attimo prima del primo clic. Ecco il controllo che richiede cinque minuti ed evita errori costosi."),
      ("p", "L'errore più comune non è la malafede, ma la comodità: infilare in fretta una chiamata con un cliente in uno strumento di trascrizione gratuito, incollare un intero scambio di mail con nomi reali perché al momento è comodo. È esattamente qui che nascono i problemi che poi costano cari. Passa queste cinque domande una volta per strumento — poi sai a che punto sei."),
      ("h3", "1. Dove sono i server?"),
      ("p", "Il trattamento dei dati nell'UE è la via semplice. Con i fornitori statunitensi serve una base giuridica solida; molti grandi strumenti offrono ormai residenza dei dati nell'UE o piani business con garanzie migliori. Se la pagina non dice nulla in proposito, anche questa è una risposta."),
      ("h3", "2. C'è un contratto di trattamento dei dati?"),
      ("p", "Appena tratti dati personali, ti serve con il fornitore un contratto di trattamento (responsabile esterno). I fornitori seri lo offrono come documento standard. Se non ne trovi uno, lì non vanno dati dei clienti."),
      ("h3", "3. I miei input vengono usati per l'addestramento?"),
      ("p", "Su molti livelli gratuiti sì, sui piani business spesso no — ma solo se lo imposti attivamente o scegli il piano giusto. Controlla quell'impostazione una volta, di proposito, invece di sperarci."),
      ("h3", "4. Cosa deve davvero entrare?"),
      ("p", "La migliore misura di protezione è lasciare fuori. « Cliente A, settore edilizia, lavoro X » basta e avanza per una bozza di offerta. Nomi, indirizzi e numeri di contratto non ti servono per questo — quindi lasciali fuori."),
      ("h3", "5. Lo spiegherei così al mio cliente?"),
      ("p", "Un test semplice: se potessi dire apertamente al tuo cliente come tratti la sua pratica con l'IA, di solito va bene. Se dovessi nasconderlo, qualcosa non torna."),
      ("callout", "Anonimizza ciò che puoi. Un contratto di trattamento dove serve. E nel dubbio, fai da te ciò che deve essere davvero giusto. Qui la protezione dei dati non è un freno, ma la protezione della tua attività."),
    ]},
    {"title": "Come si prosegue", "blocks": [
      ("p", "Se sei arrivato fin qui, hai già la competenza più importante: la pazienza per la sostanza invece del riflesso per l'hype."),
      ("p", "Questo eBook è un'istantanea. L'IA cambia ogni settimana. Ciò che resta è la mentalità: chiedere concreto, pesare il rischio, giudicare da sé."),
      ("h3", "Il tuo primo passo questa settimana"),
      ("p", "Non scegliere cinque cose, ma una sola. Prendi il compito che questa settimana ti è sembrato più ripetizione stupida e provaci esattamente una routine del capitolo 4. Misura grossolanamente quanto ci voleva prima e quanto ci vuole ora. Quell'unico confronto onesto ti porta più avanti di dieci liste di strumenti lette."),
      ("p", "È esattamente ciò che faccio ogni giorno feriale nella newsletter — i tre sviluppi IA che toccano la tua attività oggi, in cinque minuti, senza bullshit. Nessuna scadenza, nessuna pressione, disiscrizione in qualsiasi momento."),
      ("lead", "Iscriviti gratis: abannews.com — grazie per aver letto. — Aban"),
    ]},
    {"title": "Modelli da copiare", "blocks": [
      ("lead", "Sette mattoni che incolli direttamente nel tuo modello linguistico. Sostituisci i segnaposto tra parentesi quadre e funziona."),
      ("p", "Una regola prima di tutto: più contesto metti in cima alla richiesta, meno correggi dopo. Di' sempre chi sei, a chi è rivolto il testo e in che tono — altrimenti ottieni la media di tutto internet."),
      ("h3", "1. Riassumere un documento lungo"),
      ("ul", ["<b>Riassumi il testo seguente in al massimo cinque punti.</b> Aggiungi una frase su cosa devo concretamente fare o decidere. Elenca le domande aperte a parte. Non inventare nulla che non sia nel testo. Ecco il testo: [INCOLLA IL TESTO]"]),
      ("h3", "2. Trasformare appunti in un post"),
      ("ul", ["<b>Trasforma questi appunti grezzi in un post LinkedIn per [PUBBLICO].</b> Tono: sobrio, niente hype, niente catene di punti esclamativi. La prima riga deve incuriosire senza esagerare. Max 1.200 caratteri. Appunti: [APPUNTI]"]),
      ("h3", "3. Abbozzare un'offerta"),
      ("ul", ["<b>Scrivi la bozza di un'offerta.</b> Struttura: saluto, il compito in una frase, prestazione, ambito, prezzo, tempi, prossimo passo. Concreto, niente linguaggio da vendita. Dati chiave: cliente [SETTORE], compito [COMPITO], prezzo [IMPORTO], consegna entro [DATA]."]),
      ("h3", "4. Un'email a freddo che non sa di spam"),
      ("ul", ["<b>Scrivi una breve email a freddo a un/una [RUOLO] in un'azienda del settore [SETTORE].</b> Max 90 parole, un riferimento concreto alla loro attività, una sola call to action (una chiamata di 15 minuti). Niente adulazione, niente buzzword. La mia offerta: [UNA FRASE]."]),
      ("h3", "5. Accorciare un testo senza perderne il senso"),
      ("ul", ["<b>Dimezza il testo seguente.</b> Mantieni il messaggio centrale e i numeri, togli parole di riempimento e ripetizioni. Stesso tono dell'originale. Testo: [TESTO]"]),
      ("h3", "6. Trovare le obiezioni prima degli altri"),
      ("ul", ["<b>Sostengo: [LA TUA TESI].</b> Dammi le tre obiezioni più forti e una breve risposta a ciascuna. Sii duro, non gentile — voglio vedere le falle prima che le trovi un cliente."]),
      ("h3", "7. Preparare una risposta a un'email"),
      ("ul", ["<b>Scrivi una risposta cortese e chiara all'email seguente.</b> Il mio obiettivo: [COSA VUOI OTTENERE]. Breve, gentile, senza servilismo, stesso livello di formalità dell'originale. Email: [EMAIL RICEVUTA]"]),
      ("callout", "Salva come blocchi di testo i due o tre modelli che ti servono ogni settimana. Un modello che non ritrovi è un modello che non usi."),
    ]},
    {"title": "Una giornata, svolta", "blocks": [
      ("lead", "Un martedì realistico di una copywriter freelance — una volta senza, una volta con l'IA. Nessun numero miracoloso inventato, solo un conto onesto."),
      ("p", "Maria è una copywriter freelance con cinque clienti. Il suo martedì ha tre blocchi ricorrenti: la posta, un'offerta per un cliente, un articolo di blog a partire da appunti. Ecco com'era prima e com'è adesso."),
      ("h3", "Prima: il martedì a mano"),
      ("ul", ["<b>Posta (40 min):</b> leggere 30 mail una per una, ordinare, risponderne a tre.",
              "<b>Offerta (50 min):</b> documento vuoto, ripensare la struttura, cercare formulazioni, impaginare.",
              "<b>Articolo (90 min):</b> trasformare dodici punti in 800 parole, riordinare due volte.",
              "<b>Totale: circa tre ore</b>, gran parte fatta di impostazione e formattazione noiose."]),
      ("h3", "Dopo: lo stesso martedì con l'IA"),
      ("ul", ["<b>Posta (20 min):</b> l'IA ordina in « ora / dopo / ignora » e propone tre bozze di risposta. Maria legge, corregge, invia.",
              "<b>Offerta (20 min):</b> il suo modello fisso più cinque dati chiave, l'IA riempie la bozza. Maria controlla prezzo e tono.",
              "<b>Articolo (55 min):</b> l'IA crea una bozza grezza dai punti, Maria scrive da sé apertura e chiusura e affina le affermazioni.",
              "<b>Totale: circa un'ora e mezza</b> — il ragionamento resta a lei, l'impostazione sparisce."]),
      ("h3", "Cosa rende onesto il conto"),
      ("p", "È più o meno la metà del tempo — non il « 10x » delle pubblicità. E il salto non è arrivato il primo giorno: a Maria è servita prima una settimana per costruire bene il modello e il blocco di contesto. Il tempo risparmiato non lo mette in più produzione, ma in due cose che l'IA non sa fare: contattare nuovi clienti e rivedere i testi con più precisione."),
      ("p", "Altrettanto importante: dove un errore costerebbe caro — il prezzo nell'offerta, i fatti nell'articolo — continua a controllare ogni riga da sé. Il risparmio di tempo viene dall'impostazione, non dal togliere il controllo."),
      ("callout", "Il guadagno non è « di più nello stesso tempo », ma « la stessa qualità in meno tempo — e il resto per ciò che solo tu sai fare »."),
    ]},
    {"title": "Lo strumento per ogni compito", "blocks": [
      ("lead", "Non « quale strumento è il migliore », ma « cosa uso per quale compito ». Con note oneste su costi e GDPR."),
      ("p", "I nomi qui sotto sono esempi, non raccomandazioni a pagamento. I prezzi sono ordini di grandezza approssimativi di inizio 2026 e cambiano; verifica lo stato attuale prima di abbonarti. Qui non ci sono link di affiliazione."),
      ("h3", "Scrivere e rivedere"),
      ("ul", ["<b>Per:</b> testi, riassunti, riformulazione, ordinamento.",
              "<b>Esempi:</b> Claude, ChatGPT (entrambi intorno ai 20-25 euro al mese nella versione a pagamento).",
              "<b>GDPR:</b> verifica residenza dei dati in UE e contratto di trattamento; non inserire nomi reali dei clienti senza necessità."]),
      ("h3", "Ricerca con fonti"),
      ("ul", ["<b>Per:</b> una panoramica su un tema, con link verificabili.",
              "<b>Esempi:</b> Perplexity (livello gratuito disponibile, Pro intorno ai 20 euro al mese).",
              "<b>Onesto:</b> apri sempre tu stesso le fonti citate — « con fonti » non significa « corretto »."]),
      ("h3", "Automazione"),
      ("ul", ["<b>Per:</b> collegare servizi, routine ricorrenti senza lavoro di clic.",
              "<b>Esempi:</b> Make.com (quota gratuita, poi da pochi euro), n8n (open source, gratuito se auto-ospitato).",
              "<b>Onesto:</b> conviene solo da tre ripetizioni manuali a settimana; prima è bricolage."]),
      ("h3", "Immagini"),
      ("ul", ["<b>Per:</b> illustrazioni, grafiche semplici, immagini per i social.",
              "<b>Esempi:</b> Canva (livello gratuito, funzioni IA nel piano a pagamento da circa 12 euro al mese).",
              "<b>Onesto:</b> verifica diritti e marchi; non usare immagini generate alla cieca come marchio tuo."]),
      ("h3", "Trascrizione e appunti"),
      ("ul", ["<b>Per:</b> trasformare in testo conversazioni, note vocali, chiamate.",
              "<b>Esempi:</b> Whisper (open source, gratuito in locale), vari servizi web (spesso da circa 10 euro al mese).",
              "<b>GDPR:</b> chiedi il consenso per le chiamate con i clienti; l'elaborazione locale rispetta di più la protezione dei dati."]),
      ("p", "La regola sopra a tutte: parti con un buon modello linguistico. Solo quando lì lo stesso compito richiede regolarmente troppo tempo vale la pena di un secondo strumento specializzato."),
      ("callout", "Uno strumento che padroneggi batte cinque che hai solo installato. Allarga lo stack solo quando un compito concreto te lo impone."),
    ]},
    {"title": "Glossario in chiaro: dieci termini senza nebbia", "blocks": [
      ("lead", "Così nessun venditore ti intimidisce con il gergo. Dieci termini che spuntano in una discussione di IA su due — spiegati in una frase."),
      ("ul", ["<b>Modello linguistico (LLM):</b> il programma dietro ChatGPT o Claude, che dal testo costruisce la parola successiva più probabile.",
              "<b>Prompt:</b> la tua richiesta al modello. Più è chiara, migliore è la risposta.",
              "<b>Token:</b> i pezzetti in cui il modello divide il testo — grossomodo un pezzo di parola. Fatturazione e limiti di lunghezza passano di qui.",
              "<b>Finestra di contesto:</b> quanto testo il modello tiene davanti contemporaneamente. Quando è piena, l'inizio cade dal fondo.",
              "<b>Allucinazione:</b> una risposta inventata ma esposta con sicurezza. Non un difetto, ma il rovescio del suo funzionamento.",
              "<b>Fine-tuning:</b> riaddestrare un modello con i tuoi dati. Inutile per la maggior parte di chi lavora in proprio — basta un buon contesto nel prompt.",
              "<b>RAG:</b> dare al modello i tuoi documenti rilevanti prima della risposta, così cita da quelli invece di tirare a indovinare.",
              "<b>Agente:</b> un modello che non si limita a rispondere ma esegue da sé dei passi. Suona grande, in pratica si rompe in fretta — tienilo stretto.",
              "<b>API:</b> l'interfaccia con cui altri programmi parlano al modello. Rilevante solo quando automatizzi qualcosa.",
              "<b>Open source / locale:</b> modelli che puoi far girare da te. Più controllo e privacy, ma più fatica."]),
      ("callout", "Non devi padroneggiare nessuno di questi termini per usare l'IA con criterio. Ma chi li conosce non si fa vendere ciò di cui non ha bisogno."),
    ]},
  ],
},
}


# ============================================================
# Augmentierung zur Build-Zeit: Diagramme + Quellen-Kapitel.
# Hält das große CONTENT-Dict unangetastet; alles DRY über alle Sprachen.
# Diagramme werden per Kapitel-INDEX zugeordnet (Reihenfolge ist in allen
# Sprachen identisch): 1=Filter, 3=Stack, 10=Arbeitstag.
# Quellen sind ECHT/verifizierbar (Aban-Voice: keine erfundenen Quellen).
# ============================================================
import ebook_diagrams

# Kapitel-Index (0-basiert) -> (diagramm-key, caption-key)
_FIG_AT = {1: "stack", 4: "filter", 10: "day"}  # nach Augment: siehe _augment

_CAPTIONS = {
    "de": {"filter": "Abb. 1 — Der 3-Fragen-Filter auf einen Blick.",
           "stack": "Abb. 2 — Vier Bausteine, mehr brauchst du nicht.",
           "day": "Abb. 3 — Ehrliche Halbierung statt „10x“."},
    "en": {"filter": "Fig. 1 — The 3-question filter at a glance.",
           "stack": "Fig. 2 — Four building blocks, no more.",
           "day": "Fig. 3 — An honest halving, not “10x”."},
    "fr": {"filter": "Fig. 1 — Le filtre en 3 questions d'un coup d'œil.",
           "stack": "Fig. 2 — Quatre briques, pas plus.",
           "day": "Fig. 3 — Une vraie réduction de moitié, pas du « 10x »."},
    "it": {"filter": "Fig. 1 — Il filtro in 3 domande a colpo d'occhio.",
           "stack": "Fig. 2 — Quattro mattoni, non di più.",
           "day": "Fig. 3 — Un dimezzamento onesto, non il “10x”."},
}

# Quellen-Kapitel (echte, stabile Primärquellen — keine fragilen Deep-Links).
_SOURCES = {
    "de": {"title": "Quellen & weiterlesen", "blocks": [
        ("lead", "Dieses eBook ist Erfahrung, kein Forschungsbericht. Wo es um Recht und Fakten geht, prüf bei der Quelle selbst — hier die wichtigsten, alle offiziell und kostenlos."),
        ("h3", "Recht & Datenschutz (für das Datenschutz-Kapitel)"),
        ("src", ["<b>DSGVO-Volltext</b> — EUR-Lex, Verordnung (EU) 2016/679. Such bei eur-lex.europa.eu nach „2016/679“. Maßgeblich für Art. 6 (Rechtsgrundlagen) und Art. 28 (Auftragsverarbeitung).",
                 "<b>EU-KI-Verordnung (AI Act)</b> — Verordnung (EU) 2024/1689, ebenfalls über EUR-Lex. Regelt Risikoklassen und Transparenzpflichten für KI-Systeme.",
                 "<b>Deine Datenschutzbehörde</b> — in DE der/die Landesdatenschutzbeauftragte, in AT die DSB (dsb.gv.at), in CH der EDÖB (edoeb.admin.ch). Erste Anlaufstelle bei konkreten Fragen."]),
        ("h3", "Wie die Tools wirklich mit Daten umgehen"),
        ("src", ["<b>Anbieter-Doku selbst lesen</b> — „Trust Center“, „Data Processing Addendum (DPA)“ oder „Privacy“ auf der Anbieter-Seite. Nur das zählt, nicht ein Blogpost darüber.",
                 "<b>Trainings-Einstellung prüfen</b> — bei ChatGPT/Claude in den Konto-Einstellungen, ob deine Eingaben zum Training genutzt werden. Einmal bewusst setzen."]),
        ("p", "Faustregel bleibt: Was stimmen muss, verifizierst du an der Primärquelle — nicht bei der KI und nicht in diesem Buch."),
    ]},
    "en": {"title": "Sources & further reading", "blocks": [
        ("lead", "This eBook is experience, not a research paper. Where law and facts are involved, check the source yourself — here are the key ones, all official and free."),
        ("h3", "Law & data protection (for the data-protection chapter)"),
        ("src", ["<b>GDPR full text</b> — EUR-Lex, Regulation (EU) 2016/679. Search eur-lex.europa.eu for “2016/679”. Relevant for Art. 6 (legal bases) and Art. 28 (processors).",
                 "<b>EU AI Act</b> — Regulation (EU) 2024/1689, also on EUR-Lex. Governs risk classes and transparency duties for AI systems.",
                 "<b>Your data-protection authority</b> — the national/state DPA where you operate. First port of call for concrete questions."]),
        ("h3", "How the tools really handle data"),
        ("src", ["<b>Read the provider's own docs</b> — “Trust Center”, “Data Processing Addendum (DPA)” or “Privacy” on the provider's site. That's what counts, not a blog post about it.",
                 "<b>Check the training setting</b> — in ChatGPT/Claude account settings, whether your inputs are used for training. Set it once, deliberately."]),
        ("p", "The rule of thumb stays: whatever has to be correct, you verify at the primary source — not with the AI and not in this book."),
    ]},
    "fr": {"title": "Sources & pour aller plus loin", "blocks": [
        ("lead", "Ce eBook est de l'expérience, pas un rapport de recherche. Quand il s'agit de droit et de faits, vérifie à la source — voici les principales, toutes officielles et gratuites."),
        ("h3", "Droit & protection des données (pour le chapitre RGPD)"),
        ("src", ["<b>Texte intégral du RGPD</b> — EUR-Lex, règlement (UE) 2016/679. Cherche « 2016/679 » sur eur-lex.europa.eu. Pertinent pour l'art. 6 (bases légales) et l'art. 28 (sous-traitants).",
                 "<b>Règlement IA de l'UE (AI Act)</b> — règlement (UE) 2024/1689, également sur EUR-Lex. Encadre les classes de risque et les obligations de transparence.",
                 "<b>Ton autorité de protection des données</b> — la CNIL en France, l'APD en Belgique, etc. Premier point de contact pour les questions concrètes."]),
        ("h3", "Comment les outils traitent vraiment les données"),
        ("src", ["<b>Lis la doc du fournisseur</b> — « Trust Center », « Data Processing Addendum (DPA) » ou « Privacy » sur son site. C'est ça qui compte, pas un article de blog.",
                 "<b>Vérifie le réglage d'entraînement</b> — dans les paramètres de ton compte ChatGPT/Claude, si tes saisies servent à l'entraînement. Règle-le une fois, sciemment."]),
        ("p", "La règle reste : ce qui doit être exact, tu le vérifies à la source primaire — pas auprès de l'IA, pas dans ce livre."),
    ]},
    "it": {"title": "Fonti & per approfondire", "blocks": [
        ("lead", "Questo eBook è esperienza, non un rapporto di ricerca. Dove si parla di diritto e fatti, verifica alla fonte — ecco le principali, tutte ufficiali e gratuite."),
        ("h3", "Diritto & protezione dei dati (per il capitolo GDPR)"),
        ("src", ["<b>Testo integrale del GDPR</b> — EUR-Lex, regolamento (UE) 2016/679. Cerca « 2016/679 » su eur-lex.europa.eu. Rilevante per l'art. 6 (basi giuridiche) e l'art. 28 (responsabili).",
                 "<b>Regolamento UE sull'IA (AI Act)</b> — regolamento (UE) 2024/1689, anch'esso su EUR-Lex. Disciplina classi di rischio e obblighi di trasparenza.",
                 "<b>La tua autorità per la protezione dei dati</b> — in Italia il Garante Privacy (garanteprivacy.it). Primo riferimento per domande concrete."]),
        ("h3", "Come gli strumenti trattano davvero i dati"),
        ("src", ["<b>Leggi la doc del fornitore</b> — « Trust Center », « Data Processing Addendum (DPA) » o « Privacy » sul suo sito. Conta quello, non un articolo di blog.",
                 "<b>Controlla l'impostazione di addestramento</b> — nelle impostazioni dell'account ChatGPT/Claude, se i tuoi input servono all'addestramento. Impostalo una volta, di proposito."]),
        ("p", "La regola resta: ciò che deve essere corretto, lo verifichi alla fonte primaria — non con l'IA e non in questo libro."),
    ]},
}


def _augment(lang, data):
    """Gibt eine angereicherte Kopie von data zurück: Diagramme in passende
    Kapitel eingefügt + Quellen-Kapitel angehängt. Mutiert das Original NICHT."""
    figs = ebook_diagrams.ensure_diagrams(OUT_DIR, lang)
    caps = _CAPTIONS.get(lang, _CAPTIONS["en"])
    # Diagramm nach Kapitel-Titel-Schlüsselwort zuordnen (robuster als Index).
    want = [
        ("filter", figs["filter"], caps["filter"]),
        ("stack", figs["stack"], caps["stack"]),
        ("day", figs["day"], caps["day"]),
    ]
    # Schlüsselwörter pro Diagramm und Sprache zum Finden des Ziel-Kapitels:
    keys = {
        "filter": ("3-fragen", "3-question", "3 questions", "3 domande"),
        "stack": ("stack",),
        "day": ("durchgespielt", "walked through", "déroulée", "svolta"),
    }
    new = dict(data)
    chapters = [dict(ch) for ch in data["chapters"]]
    for figkey, fname, cap in want:
        kws = keys[figkey]
        for ch in chapters:
            t = ch["title"].lower()
            if any(k in t for k in kws):
                # Bild direkt nach dem ersten Block (meist lead/p) einsetzen.
                blocks = list(ch["blocks"])
                insert_at = 1 if blocks else 0
                blocks.insert(insert_at, ("img", {"src": fname, "alt": cap, "cap": cap}))
                ch["blocks"] = blocks
                break
    # Quellen-Kapitel anhängen (vor dem letzten Werkstatt-Block? -> ans Ende).
    src_ch = _SOURCES.get(lang, _SOURCES["en"])
    chapters.append(src_ch)
    new["chapters"] = chapters
    return new


def build(langs=None):
    langs = langs or list(CONTENT.keys())
    for lang in langs:
        if lang not in CONTENT:
            print("! unbekannte Sprache: %s" % lang); continue
        data = _augment(lang, CONTENT[lang])
        build_lang(lang, data)
        build_epub(lang, data)


if __name__ == "__main__":
    build(sys.argv[1:] or None)
