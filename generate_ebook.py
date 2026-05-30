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
      ("p", "Ein Beispiel, das ich oft sehe: Jemand kauft ein 200-€-Abo für ein „KI-Content-System“, weil ein Video versprochen hat, das mache 30 Posts pro Woche. Nach drei Wochen sind es null Posts — weil das Problem nie das Schreiben war, sondern die fehlende Entscheidung, worüber überhaupt zu schreiben ist. Kein Tool der Welt nimmt dir diese Entscheidung ab."),
      ("h3", "Was du hier NICHT findest"),
      ("ul", ["Prompts, die angeblich „dein Business automatisieren“, in Wahrheit aber nur einen netten Absatz produzieren.",
              "Tool-Listen mit 50 Einträgen, von denen du 47 nie öffnest.",
              "Das Versprechen, dass KI dich reich macht, während du schläfst."]),
      ("h3", "Wie du dieses eBook benutzt"),
      ("p", "Sechs kurze Kapitel, jedes für sich lesbar in unter zehn Minuten. Lies das, was dein heutiges Problem trifft, probier eine einzige Sache aus und komm wieder, wenn die nächste Frage auftaucht. Wissen, das du nicht anwendest, ist nur teurer gewordener Konsum."),
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
    {"title": "Wie es weitergeht", "blocks": [
      ("p", "Wenn du bis hier gelesen hast, hast du schon den wichtigsten Skill: Geduld für Substanz statt Reflex für Hype."),
      ("p", "Dieses eBook ist ein Schnappschuss. KI ändert sich wöchentlich. Was bleibt, ist die Denkweise: konkret fragen, Risiko abschätzen, selbst urteilen."),
      ("h3", "Dein erster Schritt für diese Woche"),
      ("p", "Such dir nicht fünf Dinge aus, sondern eines. Nimm die eine Aufgabe, die sich diese Woche am meisten nach stumpfer Wiederholung angefühlt hat, und probier genau dafür einen der Abläufe aus Kapitel 4. Miss grob, wie lange es vorher gedauert hat und wie lange jetzt. Dieser eine ehrliche Vergleich bringt dich weiter als zehn gelesene Tool-Listen."),
      ("p", "Genau das mache ich jeden Werktag im Newsletter — die drei KI-Entwicklungen, die dein Business heute betreffen, in fünf Minuten, ohne Bullshit. Keine Frist, kein Druck, jederzeit abbestellbar."),
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
      ("p", "An example I see often: someone buys a 200-dollar subscription to an “AI content system” because a video promised 30 posts a week. Three weeks later there are zero posts — because the problem was never the writing, it was the missing decision about what to write at all. No tool on earth makes that decision for you."),
      ("h3", "What you will NOT find here"),
      ("ul", ["Prompts that supposedly “automate your business” but really just produce a nice paragraph.",
              "Tool lists with 50 entries, 47 of which you'll never open.",
              "The promise that AI makes you rich while you sleep."]),
      ("h3", "How to use this eBook"),
      ("p", "Six short chapters, each readable on its own in under ten minutes. Read the one that hits today's problem, try a single thing, and come back when the next question shows up. Knowledge you don't apply is just consumption that got more expensive."),
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
    {"title": "Where to go from here", "blocks": [
      ("p", "If you've read this far, you already have the most important skill: patience for substance over the reflex for hype."),
      ("p", "This eBook is a snapshot. AI changes weekly. What stays is the mindset: ask concretely, weigh the risk, judge for yourself."),
      ("h3", "Your first step this week"),
      ("p", "Don't pick five things — pick one. Take the single task that felt most like dull repetition this week and try exactly one routine from chapter 4 on it. Roughly measure how long it took before and how long now. That one honest comparison gets you further than ten tool lists you've read."),
      ("p", "That's exactly what I do every weekday in the newsletter — the three AI developments that affect your business today, in five minutes, no bullshit. No deadline, no pressure, unsubscribe any time."),
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
      ("p", "Un exemple que je vois souvent : quelqu'un paie un abonnement à 200 € pour un « système de contenu IA » parce qu'une vidéo a promis 30 posts par semaine. Trois semaines plus tard, zéro post — parce que le problème n'a jamais été d'écrire, mais l'absence de décision sur quoi écrire. Aucun outil au monde ne prend cette décision à ta place."),
      ("h3", "Ce que tu ne trouveras PAS ici"),
      ("ul", ["Des prompts qui « automatisent ton activité » mais ne produisent qu'un joli paragraphe.",
              "Des listes de 50 outils dont tu n'en ouvriras jamais 47.",
              "La promesse que l'IA te rend riche pendant que tu dors."]),
      ("h3", "Comment utiliser ce eBook"),
      ("p", "Six chapitres courts, chacun lisible seul en moins de dix minutes. Lis celui qui touche ton problème du jour, essaie une seule chose, et reviens quand la question suivante apparaît. Le savoir que tu n'appliques pas n'est qu'une consommation devenue plus chère."),
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
    {"title": "Et maintenant ?", "blocks": [
      ("p", "Si tu as lu jusqu'ici, tu as déjà la compétence la plus importante : la patience du fond plutôt que le réflexe du hype."),
      ("p", "Ce eBook est un instantané. L'IA change chaque semaine. Ce qui reste, c'est l'état d'esprit : demander concrètement, peser le risque, juger soi-même."),
      ("h3", "Ton premier pas cette semaine"),
      ("p", "Ne choisis pas cinq choses, mais une seule. Prends la tâche qui t'a le plus donné cette semaine l'impression d'une répétition stupide, et essaie dessus exactement une routine du chapitre 4. Mesure grossièrement le temps que ça prenait avant et le temps que ça prend maintenant. Cette seule comparaison honnête t'avance plus que dix listes d'outils lues."),
      ("p", "C'est exactement ce que je fais chaque jour ouvré dans la newsletter — les trois évolutions IA qui touchent ton activité aujourd'hui, en cinq minutes, sans bullshit. Pas d'échéance, pas de pression, désabonnement à tout moment."),
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
      ("p", "Un esempio che vedo spesso: qualcuno paga un abbonamento da 200 € per un “sistema di contenuti IA” perché un video ha promesso 30 post a settimana. Tre settimane dopo, zero post — perché il problema non è mai stato scrivere, ma la decisione mancante su cosa scrivere. Nessuno strumento al mondo prende quella decisione al posto tuo."),
      ("h3", "Cosa NON troverai qui"),
      ("ul", ["Prompt che “automatizzano la tua attività” ma in realtà producono solo un bel paragrafo.",
              "Liste di 50 strumenti, di cui 47 non aprirai mai.",
              "La promessa che l'IA ti rende ricco mentre dormi."]),
      ("h3", "Come usare questo eBook"),
      ("p", "Sei capitoli brevi, ognuno leggibile da solo in meno di dieci minuti. Leggi quello che tocca il problema di oggi, prova una sola cosa e torna quando spunta la domanda successiva. La conoscenza che non applichi è solo consumo diventato più caro."),
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
    {"title": "Come si prosegue", "blocks": [
      ("p", "Se sei arrivato fin qui, hai già la competenza più importante: la pazienza per la sostanza invece del riflesso per l'hype."),
      ("p", "Questo eBook è un'istantanea. L'IA cambia ogni settimana. Ciò che resta è la mentalità: chiedere concreto, pesare il rischio, giudicare da sé."),
      ("h3", "Il tuo primo passo questa settimana"),
      ("p", "Non scegliere cinque cose, ma una sola. Prendi il compito che questa settimana ti è sembrato più ripetizione stupida e provaci esattamente una routine del capitolo 4. Misura grossolanamente quanto ci voleva prima e quanto ci vuole ora. Quell'unico confronto onesto ti porta più avanti di dieci liste di strumenti lette."),
      ("p", "È esattamente ciò che faccio ogni giorno feriale nella newsletter — i tre sviluppi IA che toccano la tua attività oggi, in cinque minuti, senza bullshit. Nessuna scadenza, nessuna pressione, disiscrizione in qualsiasi momento."),
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
