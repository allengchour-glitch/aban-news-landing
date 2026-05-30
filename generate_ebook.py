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
)

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
# ============================================================
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
        elif kind == "ul":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, styles["Bull"]), value="•", leftIndent=10)
                 for t in payload],
                bulletType="bullet", bulletColor=AMBER, leftIndent=14, spaceAfter=10,
            ))


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
    in_list = False
    for kind, payload in blocks:
        if kind == "ul":
            out.append("<ul>")
            for it in payload:
                out.append("<li>%s</li>" % _esc(it))
            out.append("</ul>")
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
.cover .m{color:#6b7280;margin-top:2em;font-size:.9em}"""


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
    print("✓ downloads/%s erstellt" % filename)


# ============================================================
# Content packs
# ============================================================
CONTENT = {
"de": {
  "title": "Anti-Hype",
  "subtitle": "Wie deutsche Solopreneure KI ohne Bullshit einsetzen",
  "edition": "Das eBook · 1. Auflage, 2026",
  "subject": "KI ohne Hype für DACH-Solopreneure",
  "keywords": "KI, AI, Anti-Hype, Solopreneur, DACH, Newsletter, Produktivität",
  "toc_title": "Inhalt",
  "toc_note": "Lies es nicht von vorne bis hinten durch wie eine Pflichtlektüre. Spring zu dem Kapitel, das dein heutiges Problem löst.",
  "chapters": [
    {"title": "Warum dieses eBook existiert", "blocks": [
      ("lead", "Die meisten KI-Ratgeber verkaufen dir ein Gefühl. Dieser hier nicht."),
      ("p", "Seit 2024 schreibe ich jeden Werktag einen Newsletter über KI für Leute, die damit Geld verdienen — nicht darüber reden. In der Zeit habe ich hunderte Tools getestet, dutzende wieder gelöscht und gemerkt: Das meiste, was als „Must-have 2026“ verkauft wird, löst ein Problem, das du gar nicht hast."),
      ("p", "Dieses eBook ist die Essenz für eine Person: den deutschsprachigen Solopreneur, der einen Tag mit 24 Stunden hat und keinen davon an Tool-Demos verschwenden will."),
      ("h3", "Was du hier NICHT findest"),
      ("ul", ["Prompts, die angeblich „dein Business automatisieren“, in Wahrheit aber nur einen netten Absatz produzieren.",
              "Tool-Listen mit 50 Einträgen, von denen du 47 nie öffnest.",
              "Das Versprechen, dass KI dich reich macht, während du schläfst."]),
      ("callout", "Was du findest: ein Denkmodell, das zwischen Substanz und Show unterscheidet — und ein paar konkrete Abläufe, die Stunden sparen."),
    ]},
    {"title": "Der 3-Fragen-Bullshit-Filter", "blocks": [
      ("p", "Bevor du ein KI-Tool, einen Kurs oder einen Trend ernst nimmst, jag ihn durch drei Fragen. Übersteht er alle drei, lohnt sich ein zweiter Blick."),
      ("h3", "1. Was genau wird hier ersetzt?"),
      ("p", "Nicht „was kann es“, sondern: welche konkrete Aufgabe, die du heute manuell machst, fällt weg? Bleibt die Antwort vage, ist es Show. Ist sie konkret, ist es Substanz."),
      ("h3", "2. Was kostet es mich, wenn es falsch liegt?"),
      ("p", "KI halluziniert. Immer. Die Frage ist nur, wie teuer ein Fehler ist. Einen Post-Entwurf gegenlesen kostet 30 Sekunden — delegier es. Eine Steuerzahl ungeprüft übernehmen kostet echtes Geld — verifizier jede Zeile."),
      ("h3", "3. Funktioniert es ohne mich — oder mit mir?"),
      ("p", "„Vollautomatisch“ ist fast immer eine Lüge. Die Tools, die wirklich tragen, sind Beschleuniger: Du bleibst der Kopf, KI macht die stumpfe Arbeit dazwischen."),
      ("callout", "KI ist ein Praktikant mit perfektem Gedächtnis und null Urteilsvermögen. Behandle sie so — und du wirst selten enttäuscht."),
    ]},
    {"title": "Dein minimaler KI-Stack", "blocks": [
      ("lead", "Du brauchst keine 20 Abos. Du brauchst vier Bausteine."),
      ("h3", "1. Ein gutes Sprachmodell (Pflicht)"),
      ("p", "Claude oder ChatGPT, Bezahlversion. Dein Arbeitspferd für Texten, Sortieren, Zusammenfassen. Eines reicht — lern es richtig kennen, statt ständig zu wechseln."),
      ("h3", "2. Ein Automations-Hub (optional)"),
      ("p", "Make.com oder n8n. Hier klebst du Dienste zusammen. Erst einbauen, wenn du eine Aufgabe wirklich dreimal die Woche manuell machst."),
      ("h3", "3. Ein Ort für dein Wissen"),
      ("p", "Notion, Obsidian, egal — Hauptsache durchsuchbar. KI ist nur so gut wie der Kontext, den du ihr gibst."),
      ("h3", "4. DSGVO-Klarheit (nicht verhandelbar)"),
      ("p", "Bevor du Kundendaten in ein Tool kippst: Wo stehen die Server? Gibt es einen AV-Vertrag? Ein DSGVO-Verstoß ist teurer als jeder Produktivitätsgewinn."),
      ("callout", "Faustregel: Erst der Ablauf, dann das Tool. Wer mit dem Tool anfängt, sucht sich ein Problem dazu."),
    ]},
    {"title": "Fünf Abläufe, die echt Zeit sparen", "blocks": [
      ("p", "Kein Hexenwerk — nur Routine-Arbeit, die du delegierst."),
      ("ul", ["<b>Posteingang vorsortieren:</b> KI wirft Mails in drei Körbe — jetzt, später, ignorieren. Du entscheidest weiter selbst.",
              "<b>Aus einem Long-Form drei Formate machen:</b> Ein Input, mehrere Outputs. Du redigierst, statt bei Null anzufangen.",
              "<b>Angebote schneller schreiben:</b> Vorlage plus Eckdaten, KI baut den Entwurf. Aus 45 Minuten werden 10.",
              "<b>Recherche bündeln:</b> Ein klarer Auftrag mit Quellenpflicht — dann selbst die Quellen prüfen.",
              "<b>Die eigene Woche spiegeln:</b> KI als nüchterner Spiegel, nicht als Coach mit Konfetti."]),
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
      ("callout", "Die unbequeme Wahrheit: Viele, die laut über KI reden, verdienen ihr Geld mit dem Reden — nicht mit der KI."),
    ]},
    {"title": "Wie es weitergeht", "blocks": [
      ("p", "Wenn du bis hier gelesen hast, hast du schon den wichtigsten Skill: Geduld für Substanz statt Reflex für Hype."),
      ("p", "Dieses eBook ist ein Schnappschuss. KI ändert sich wöchentlich. Was bleibt, ist die Denkweise: konkret fragen, Risiko abschätzen, selbst urteilen."),
      ("p", "Genau das mache ich jeden Werktag im Newsletter — die drei KI-Entwicklungen, die dein Business heute betreffen, in fünf Minuten, ohne Bullshit."),
      ("lead", "Kostenlos abonnieren: abannews.com — danke fürs Lesen. — Aban"),
    ]},
  ],
},
"en": {
  "title": "Anti-Hype",
  "subtitle": "How solopreneurs put AI to work without the bullshit",
  "edition": "The eBook · 1st edition, 2026",
  "subject": "AI without the hype, for solopreneurs",
  "keywords": "AI, anti-hype, solopreneur, newsletter, productivity",
  "toc_title": "Contents",
  "toc_note": "Don't read it cover to cover like homework. Jump to the chapter that solves today's problem.",
  "chapters": [
    {"title": "Why this eBook exists", "blocks": [
      ("lead", "Most AI guides sell you a feeling. This one doesn't."),
      ("p", "Since 2024 I've written a daily newsletter about AI for people who make money with it — not talk about it. Along the way I've tested hundreds of tools, deleted dozens, and noticed: most of what gets sold as a “2026 must-have” solves a problem you don't actually have."),
      ("p", "This eBook is the distilled version for one person: the solopreneur whose day has 24 hours and who won't waste any of them on tool demos."),
      ("h3", "What you will NOT find here"),
      ("ul", ["Prompts that supposedly “automate your business” but really just produce a nice paragraph.",
              "Tool lists with 50 entries, 47 of which you'll never open.",
              "The promise that AI makes you rich while you sleep."]),
      ("callout", "What you will find: a way of thinking that separates substance from show — and a few concrete routines that save hours."),
    ]},
    {"title": "The 3-question bullshit filter", "blocks": [
      ("p", "Before you take an AI tool, course or trend seriously, run it through three questions. If it survives all three, it's worth a second look."),
      ("h3", "1. What exactly does it replace?"),
      ("p", "Not “what can it do”, but: which concrete task you do manually today disappears? If the answer stays vague, it's show. If it's concrete, it's substance."),
      ("h3", "2. What does it cost me when it's wrong?"),
      ("p", "AI hallucinates. Always. The only question is how expensive a mistake is. Proofreading a draft post costs 30 seconds — delegate it. Copying a tax figure unchecked costs real money — verify every line."),
      ("h3", "3. Does it work without me — or with me?"),
      ("p", "“Fully automatic” is almost always a lie. The tools that actually carry their weight are accelerators: you stay the head, AI does the dull work in between."),
      ("callout", "AI is an intern with a perfect memory and zero judgement. Treat it that way — and you'll rarely be disappointed."),
    ]},
    {"title": "Your minimal AI stack", "blocks": [
      ("lead", "You don't need 20 subscriptions. You need four building blocks."),
      ("h3", "1. One good language model (required)"),
      ("p", "Claude or ChatGPT, paid tier. Your workhorse for writing, sorting, summarising. One is enough — learn it properly instead of constantly switching."),
      ("h3", "2. An automation hub (optional)"),
      ("p", "Make.com or n8n. This is where you glue services together. Only add it once you genuinely do a task manually three times a week."),
      ("h3", "3. A place for your knowledge"),
      ("p", "Notion, Obsidian, whatever — as long as it's searchable. AI is only as good as the context you give it."),
      ("h3", "4. GDPR clarity (non-negotiable)"),
      ("p", "Before you dump customer data into a tool: where are the servers? Is there a data-processing agreement? A GDPR breach costs more than any productivity gain."),
      ("callout", "Rule of thumb: process first, tool second. Whoever starts with the tool goes looking for a problem to fit it."),
    ]},
    {"title": "Five routines that actually save time", "blocks": [
      ("p", "No magic — just routine work you delegate."),
      ("ul", ["<b>Pre-sort your inbox:</b> AI drops mails into three buckets — now, later, ignore. You still decide.",
              "<b>Turn one long-form into three formats:</b> one input, several outputs. You edit instead of starting from zero.",
              "<b>Write proposals faster:</b> a template plus the key facts, AI builds the draft. 45 minutes become 10.",
              "<b>Bundle research:</b> one clear brief with a sources requirement — then check the sources yourself.",
              "<b>Mirror your own week:</b> AI as a sober mirror, not a coach throwing confetti."]),
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
      ("callout", "The uncomfortable truth: many who talk loudly about AI earn their money from the talking — not from the AI."),
    ]},
    {"title": "Where to go from here", "blocks": [
      ("p", "If you've read this far, you already have the most important skill: patience for substance over the reflex for hype."),
      ("p", "This eBook is a snapshot. AI changes weekly. What stays is the mindset: ask concretely, weigh the risk, judge for yourself."),
      ("p", "That's exactly what I do every weekday in the newsletter — the three AI developments that affect your business today, in five minutes, no bullshit."),
      ("lead", "Subscribe for free: abannews.com — thanks for reading. — Aban"),
    ]},
  ],
},
"fr": {
  "title": "Anti-Hype",
  "subtitle": "Comment les indépendants utilisent l'IA sans bullshit",
  "edition": "Le eBook · 1re édition, 2026",
  "subject": "L'IA sans le battage, pour les indépendants",
  "keywords": "IA, anti-hype, indépendant, solopreneur, newsletter, productivité",
  "toc_title": "Sommaire",
  "toc_note": "Ne le lis pas d'un bout à l'autre comme un devoir. Va au chapitre qui résout ton problème du jour.",
  "chapters": [
    {"title": "Pourquoi ce eBook existe", "blocks": [
      ("lead", "La plupart des guides IA te vendent une sensation. Pas celui-ci."),
      ("p", "Depuis 2024 j'écris chaque jour ouvré une newsletter sur l'IA pour des gens qui en gagnent leur vie — pas qui en parlent. En chemin j'ai testé des centaines d'outils, supprimé des dizaines, et constaté : la plupart de ce qu'on vend comme « indispensable 2026 » résout un problème que tu n'as pas."),
      ("p", "Ce eBook est la version concentrée pour une personne : l'indépendant dont la journée fait 24 heures et qui n'en gaspillera aucune en démos d'outils."),
      ("h3", "Ce que tu ne trouveras PAS ici"),
      ("ul", ["Des prompts qui « automatisent ton activité » mais ne produisent qu'un joli paragraphe.",
              "Des listes de 50 outils dont tu n'en ouvriras jamais 47.",
              "La promesse que l'IA te rend riche pendant que tu dors."]),
      ("callout", "Ce que tu trouveras : une façon de penser qui sépare le fond du spectacle — et quelques routines concrètes qui font gagner des heures."),
    ]},
    {"title": "Le filtre anti-bullshit en 3 questions", "blocks": [
      ("p", "Avant de prendre au sérieux un outil, une formation ou une tendance IA, passe-le par trois questions. S'il survit aux trois, il mérite un second regard."),
      ("h3", "1. Qu'est-ce qui est remplacé, exactement ?"),
      ("p", "Pas « que sait-il faire », mais : quelle tâche concrète que tu fais à la main aujourd'hui disparaît ? Si la réponse reste floue, c'est du spectacle. Si elle est concrète, c'est du fond."),
      ("h3", "2. Combien ça me coûte quand il se trompe ?"),
      ("p", "L'IA hallucine. Toujours. La seule question, c'est le coût d'une erreur. Relire un brouillon de post coûte 30 secondes — délègue. Reprendre un chiffre fiscal sans vérifier coûte de l'argent réel — vérifie chaque ligne."),
      ("h3", "3. Ça marche sans moi — ou avec moi ?"),
      ("p", "« Entièrement automatique » est presque toujours un mensonge. Les outils qui tiennent la route sont des accélérateurs : tu restes la tête, l'IA fait le travail ingrat entre les deux."),
      ("callout", "L'IA est un stagiaire à la mémoire parfaite et au jugement nul. Traite-la ainsi — et tu seras rarement déçu."),
    ]},
    {"title": "Ton stack IA minimal", "blocks": [
      ("lead", "Tu n'as pas besoin de 20 abonnements. Tu as besoin de quatre briques."),
      ("h3", "1. Un bon modèle de langage (obligatoire)"),
      ("p", "Claude ou ChatGPT, version payante. Ton cheval de trait pour rédiger, trier, résumer. Un seul suffit — apprends-le bien plutôt que d'en changer sans cesse."),
      ("h3", "2. Un hub d'automatisation (optionnel)"),
      ("p", "Make.com ou n8n. C'est là que tu relies tes services. À ajouter seulement quand tu fais vraiment une tâche à la main trois fois par semaine."),
      ("h3", "3. Un endroit pour ton savoir"),
      ("p", "Notion, Obsidian, peu importe — du moment que c'est cherchable. L'IA ne vaut que le contexte que tu lui donnes."),
      ("h3", "4. Clarté RGPD (non négociable)"),
      ("p", "Avant de verser des données clients dans un outil : où sont les serveurs ? Y a-t-il un contrat de sous-traitance ? Une violation RGPD coûte plus cher que tout gain de productivité."),
      ("callout", "Règle : le processus d'abord, l'outil ensuite. Qui commence par l'outil cherche ensuite un problème à lui coller."),
    ]},
    {"title": "Cinq routines qui font vraiment gagner du temps", "blocks": [
      ("p", "Pas de magie — juste du travail répétitif que tu délègues."),
      ("ul", ["<b>Pré-trier ta boîte mail :</b> l'IA range les mails en trois paniers — maintenant, plus tard, ignorer. C'est toi qui décides.",
              "<b>Faire trois formats d'un long contenu :</b> une entrée, plusieurs sorties. Tu édites au lieu de partir de zéro.",
              "<b>Rédiger des offres plus vite :</b> un modèle plus les données clés, l'IA fait le brouillon. 45 minutes deviennent 10.",
              "<b>Grouper la recherche :</b> un brief clair avec obligation de sources — puis vérifie les sources toi-même.",
              "<b>Faire le miroir de ta semaine :</b> l'IA comme miroir lucide, pas comme coach à confettis."]),
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
      ("callout", "La vérité qui dérange : beaucoup de ceux qui parlent fort d'IA gagnent leur argent en parlant — pas avec l'IA."),
    ]},
    {"title": "Et maintenant ?", "blocks": [
      ("p", "Si tu as lu jusqu'ici, tu as déjà la compétence la plus importante : la patience du fond plutôt que le réflexe du hype."),
      ("p", "Ce eBook est un instantané. L'IA change chaque semaine. Ce qui reste, c'est l'état d'esprit : demander concrètement, peser le risque, juger soi-même."),
      ("p", "C'est exactement ce que je fais chaque jour ouvré dans la newsletter — les trois évolutions IA qui touchent ton activité aujourd'hui, en cinq minutes, sans bullshit."),
      ("lead", "Abonne-toi gratuitement : abannews.com — merci de ta lecture. — Aban"),
    ]},
  ],
},
"it": {
  "title": "Anti-Hype",
  "subtitle": "Come i liberi professionisti usano l'IA senza bullshit",
  "edition": "L'eBook · 1ª edizione, 2026",
  "subject": "L'IA senza il clamore, per chi lavora in proprio",
  "keywords": "IA, anti-hype, libero professionista, solopreneur, newsletter, produttività",
  "toc_title": "Indice",
  "toc_note": "Non leggerlo dall'inizio alla fine come un compito. Salta al capitolo che risolve il problema di oggi.",
  "chapters": [
    {"title": "Perché esiste questo eBook", "blocks": [
      ("lead", "La maggior parte delle guide sull'IA ti vende una sensazione. Questa no."),
      ("p", "Dal 2024 scrivo ogni giorno feriale una newsletter sull'IA per chi ci guadagna — non per chi ne parla. Nel frattempo ho provato centinaia di strumenti, ne ho cancellati dozzine e ho notato: gran parte di ciò che viene venduto come “imprescindibile 2026” risolve un problema che non hai."),
      ("p", "Questo eBook è la versione concentrata per una persona: chi lavora in proprio, ha una giornata di 24 ore e non ne sprecherà nessuna in demo di strumenti."),
      ("h3", "Cosa NON troverai qui"),
      ("ul", ["Prompt che “automatizzano la tua attività” ma in realtà producono solo un bel paragrafo.",
              "Liste di 50 strumenti, di cui 47 non aprirai mai.",
              "La promessa che l'IA ti rende ricco mentre dormi."]),
      ("callout", "Cosa troverai: un modo di pensare che separa la sostanza dalla scena — e qualche routine concreta che fa risparmiare ore."),
    ]},
    {"title": "Il filtro anti-bullshit in 3 domande", "blocks": [
      ("p", "Prima di prendere sul serio uno strumento, un corso o un trend di IA, passalo per tre domande. Se sopravvive a tutte e tre, merita un secondo sguardo."),
      ("h3", "1. Cosa viene sostituito, esattamente?"),
      ("p", "Non “cosa sa fare”, ma: quale compito concreto che oggi fai a mano sparisce? Se la risposta resta vaga, è scena. Se è concreta, è sostanza."),
      ("h3", "2. Quanto mi costa quando sbaglia?"),
      ("p", "L'IA allucina. Sempre. L'unica domanda è quanto costa un errore. Rileggere una bozza di post costa 30 secondi — delega. Copiare un dato fiscale senza controllo costa soldi veri — verifica ogni riga."),
      ("h3", "3. Funziona senza di me — o con me?"),
      ("p", "“Completamente automatico” è quasi sempre una bugia. Gli strumenti che reggono davvero sono acceleratori: tu resti la testa, l'IA fa il lavoro noioso nel mezzo."),
      ("callout", "L'IA è uno stagista con memoria perfetta e giudizio zero. Trattala così — e raramente resterai deluso."),
    ]},
    {"title": "Il tuo stack IA minimo", "blocks": [
      ("lead", "Non ti servono 20 abbonamenti. Ti servono quattro mattoni."),
      ("h3", "1. Un buon modello linguistico (obbligatorio)"),
      ("p", "Claude o ChatGPT, versione a pagamento. Il tuo cavallo da lavoro per scrivere, ordinare, riassumere. Uno basta — imparalo bene invece di cambiare in continuazione."),
      ("h3", "2. Un hub di automazione (opzionale)"),
      ("p", "Make.com o n8n. Qui colleghi i servizi tra loro. Da aggiungere solo quando un compito lo fai davvero a mano tre volte a settimana."),
      ("h3", "3. Un posto per la tua conoscenza"),
      ("p", "Notion, Obsidian, non importa — basta che sia ricercabile. L'IA vale solo quanto il contesto che le dai."),
      ("h3", "4. Chiarezza GDPR (non negoziabile)"),
      ("p", "Prima di riversare dati dei clienti in uno strumento: dove sono i server? C'è un contratto di trattamento dati? Una violazione GDPR costa più di qualsiasi guadagno di produttività."),
      ("callout", "Regola: prima il processo, poi lo strumento. Chi parte dallo strumento poi cerca un problema da incastrarci."),
    ]},
    {"title": "Cinque routine che fanno davvero risparmiare tempo", "blocks": [
      ("p", "Niente magia — solo lavoro di routine che deleghi."),
      ("ul", ["<b>Pre-ordina la posta:</b> l'IA mette le mail in tre cestini — ora, dopo, ignora. Decidi sempre tu.",
              "<b>Da un contenuto lungo tre formati:</b> un input, più output. Tu editi invece di partire da zero.",
              "<b>Scrivere offerte più in fretta:</b> un modello più i dati chiave, l'IA fa la bozza. 45 minuti diventano 10.",
              "<b>Raggruppare la ricerca:</b> un brief chiaro con obbligo di fonti — poi controlla le fonti tu stesso.",
              "<b>Specchiare la tua settimana:</b> l'IA come specchio lucido, non come coach con i coriandoli."]),
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
      ("callout", "La verità scomoda: molti di quelli che parlano forte di IA guadagnano parlando — non con l'IA."),
    ]},
    {"title": "Come si prosegue", "blocks": [
      ("p", "Se sei arrivato fin qui, hai già la competenza più importante: la pazienza per la sostanza invece del riflesso per l'hype."),
      ("p", "Questo eBook è un'istantanea. L'IA cambia ogni settimana. Ciò che resta è la mentalità: chiedere concreto, pesare il rischio, giudicare da sé."),
      ("p", "È esattamente ciò che faccio ogni giorno feriale nella newsletter — i tre sviluppi IA che toccano la tua attività oggi, in cinque minuti, senza bullshit."),
      ("lead", "Iscriviti gratis: abannews.com — grazie per aver letto. — Aban"),
    ]},
  ],
},
}


def build(langs=None):
    langs = langs or list(CONTENT.keys())
    for lang in langs:
        if lang not in CONTENT:
            print("! unbekannte Sprache: %s" % lang); continue
        build_lang(lang, CONTENT[lang])
        build_epub(lang, CONTENT[lang])


if __name__ == "__main__":
    build(sys.argv[1:] or None)
