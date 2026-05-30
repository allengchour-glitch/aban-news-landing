"""
aban news — eBook Generator
Generiert downloads/anti-hype-ebook.pdf

"Anti-Hype — Wie deutsche Solopreneure KI ohne Bullshit einsetzen."
Self-contained (keine Imports aus generate_pdfs.py), gleiche Brand-Optik.

Run:  python3 generate_ebook.py
Dep:  pip install reportlab
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem,
)

# Brand colors (identisch zu generate_pdfs.py)
AMBER = HexColor("#d97706")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(OUT_DIR, exist_ok=True)

FILENAME = "anti-hype-ebook.pdf"
TITLE = "Anti-Hype"
SUBTITLE = "Wie deutsche Solopreneure KI ohne Bullshit einsetzen"


def footer_canvas(canvas_obj, doc):
    """Footer + Seitenzahl auf jeder Seite (Cover wird via doc.page>1 ausgespart)."""
    if doc.page <= 1:
        return
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.setStrokeColor(LIGHT_GRAY)
    canvas_obj.line(1.5 * cm, 1.5 * cm, A4[0] - 1.5 * cm, 1.5 * cm)
    canvas_obj.drawString(1.5 * cm, 1.0 * cm, "aban news  ·  2026  ·  abannews.com")
    canvas_obj.drawRightString(A4[0] - 1.5 * cm, 1.0 * cm, f"Seite {doc.page}")
    canvas_obj.restoreState()


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


def cover_page(story, styles):
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("&#9749;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=60,
        alignment=TA_CENTER, textColor=AMBER)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=16,
        alignment=TA_CENTER, textColor=DARK, spaceAfter=24)))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(TITLE, styles["CoverTitle"]))
    story.append(Paragraph(SUBTITLE, styles["CoverSub"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph("Das eBook · 1. Auflage, 2026", styles["CoverMeta"]))
    story.append(Paragraph("Von Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())


def bullets(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(t, styles["Bull"]), value="•", leftIndent=10)
         for t in items],
        bulletType="bullet", bulletColor=AMBER, leftIndent=14, spaceAfter=10,
    )


def toc(story, styles, chapters):
    story.append(Paragraph("Inhalt", styles["Chapter"]))
    for i, (title, _) in enumerate(chapters, 1):
        story.append(Paragraph(
            f'<font color="#d97706"><b>{i:02d}</b></font>&nbsp;&nbsp;{title}',
            styles["TocItem"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(
        "Lies es nicht von vorne bis hinten durch wie eine Pflichtlektüre. "
        "Spring zu dem Kapitel, das dein heutiges Problem löst. Der Rest läuft "
        "dir nicht weg.", styles["Lead"]))
    story.append(PageBreak())


# ============================================================
# Inhalt — Aban-Voice, keine Forbidden-Phrases
# ============================================================
def chapter_intro(story, styles):
    story.append(Paragraph("Warum dieses eBook existiert", styles["Chapter"]))
    story.append(Paragraph(
        "Die meisten KI-Ratgeber verkaufen dir ein Gefühl. Dieser hier nicht.",
        styles["Lead"]))
    story.append(Paragraph(
        "Seit 2024 schreibe ich jeden Werktag einen Newsletter über KI für "
        "Leute, die damit Geld verdienen — nicht darüber reden. In der Zeit "
        "habe ich hunderte Tools getestet, dutzende wieder gelöscht und gemerkt: "
        "Das meiste, was als „Must-have 2026“ verkauft wird, löst ein "
        "Problem, das du gar nicht hast.", styles["Body"]))
    story.append(Paragraph(
        "Dieses eBook ist die Essenz aus 200+ Ausgaben, destilliert für eine "
        "Person: den deutschsprachigen Solopreneur, der einen Tag mit 24 Stunden hat "
        "und keinen davon an Tool-Demos verschwenden will. Kein Affiliate-Link, keine "
        "erfundene Erfolgsgeschichte, keine „In 6 Monaten zur 6-stelligen "
        "Marke“-Masche.", styles["Body"]))
    story.append(Paragraph("Was du hier NICHT findest", styles["H2"]))
    story.append(bullets([
        "Prompts, die angeblich „dein Business automatisieren“, in Wahrheit "
        "aber nur einen netten Absatz produzieren.",
        "Tool-Listen mit 50 Einträgen, von denen du 47 nie öffnest.",
        "Das Versprechen, dass KI dich reich macht, während du schläfst.",
        "Den Satz „KI ersetzt keine Menschen, sondern Menschen mit KI ersetzen "
        "Menschen ohne KI“. (Du hast ihn jetzt trotzdem gelesen. Tut mir leid.)",
    ], styles))
    story.append(Paragraph(
        "Was du findest: ein Denkmodell, das zwischen Substanz und Show unterscheidet, "
        "und ein paar konkrete Abläufe, die bei mir und anderen Operatorn "
        "tatsächlich Stunden sparen.", styles["Callout"]))
    story.append(PageBreak())


def chapter_filter(story, styles):
    story.append(Paragraph("Der 3-Fragen-Bullshit-Filter", styles["Chapter"]))
    story.append(Paragraph(
        "Bevor du ein KI-Tool, einen Kurs oder einen Trend ernst nimmst, jag ihn "
        "durch drei Fragen. Übersteht er alle drei, lohnt sich ein zweiter Blick.",
        styles["Body"]))
    story.append(Paragraph("1. Was genau wird hier ersetzt?", styles["H2"]))
    story.append(Paragraph(
        "Nicht „was kann es“, sondern: welche konkrete Aufgabe, die du heute "
        "manuell machst, fällt weg? Wenn die Antwort vage bleibt („es macht "
        "dich produktiver“), ist es Show. Wenn sie konkret ist („es schreibt "
        "den ersten Entwurf deiner Angebots-Mails“), ist es Substanz.",
        styles["Body"]))
    story.append(Paragraph("2. Was kostet es mich, wenn es falsch liegt?", styles["H2"]))
    story.append(Paragraph(
        "KI halluziniert. Immer. Die Frage ist nur, wie teuer ein Fehler ist. Einen "
        "Social-Post-Entwurf gegenlesen kostet 30 Sekunden — niedriges Risiko, "
        "delegier es. Eine Rechtsauskunft oder Steuerzahl ungeprüft übernehmen "
        "kostet dich echtes Geld — hohes Risiko, lass die Finger davon oder "
        "verifizier jede Zeile.", styles["Body"]))
    story.append(Paragraph("3. Funktioniert es ohne mich — oder mit mir?", styles["H2"]))
    story.append(Paragraph(
        "„Vollautomatisch“ ist fast immer eine Lüge. Die Tools, die "
        "wirklich tragen, sind Beschleuniger: Du bleibst der Kopf, KI macht die "
        "stumpfe Arbeit dazwischen. Wer dir Autopilot verkauft, verkauft dir meist "
        "den Crash gleich mit.", styles["Body"]))
    story.append(Paragraph(
        "Merksatz: KI ist ein Praktikant mit perfektem Gedächtnis und null "
        "Urteilsvermögen. Behandle sie so — und du wirst selten "
        "enttäuscht.", styles["Callout"]))
    story.append(PageBreak())


def chapter_stack(story, styles):
    story.append(Paragraph("Dein minimaler KI-Stack", styles["Chapter"]))
    story.append(Paragraph(
        "Du brauchst keine 20 Abos. Du brauchst vier Bausteine — und die Disziplin, "
        "nicht ständig das fünfte glitzernde Tool dazuzukaufen.", styles["Lead"]))
    story.append(Paragraph("1. Ein gutes Sprachmodell (Pflicht)", styles["H2"]))
    story.append(Paragraph(
        "Claude oder ChatGPT, Bezahlversion. Das ist dein Arbeitspferd für Texten, "
        "Sortieren, Zusammenfassen, Code-Schnipsel. ~20 €/Monat. Eines reicht — "
        "wechsle nicht ständig, lern lieber eines richtig kennen.", styles["Body"]))
    story.append(Paragraph("2. Ein Automations-Hub (optional, aber stark)", styles["H2"]))
    story.append(Paragraph(
        "Make.com oder n8n. Hier klebst du Dienste zusammen: „Wenn Mail mit "
        "Betreff X reinkommt, fass sie zusammen und leg eine Aufgabe an.“ Erst "
        "einbauen, wenn du eine Aufgabe wirklich dreimal die Woche manuell machst.",
        styles["Body"]))
    story.append(Paragraph("3. Ein Ort für dein Wissen", styles["H2"]))
    story.append(Paragraph(
        "Notion, Obsidian, egal — Hauptsache durchsuchbar. KI ist nur so gut wie "
        "der Kontext, den du ihr gibst. Sammle Prompts, die funktioniert haben, und "
        "deine eigene Schreibstimme als Referenz.", styles["Body"]))
    story.append(Paragraph("4. DSGVO-Klarheit (nicht verhandelbar)", styles["H2"]))
    story.append(Paragraph(
        "Bevor du Kundendaten in irgendein Tool kippst: Wo stehen die Server? Gibt es "
        "einen Auftragsverarbeitungsvertrag? Anonymisier, was du kannst. Ein DSGVO-"
        "Verstoß ist teurer als jeder Produktivitätsgewinn.", styles["Body"]))
    story.append(Paragraph(
        "Faustregel: Erst der Ablauf, dann das Tool. Wer mit dem Tool anfängt, "
        "baut sich eine Lösung für ein Problem, das er noch sucht.",
        styles["Callout"]))
    story.append(PageBreak())


def chapter_workflows(story, styles):
    story.append(Paragraph("Fünf Abläufe, die echt Zeit sparen", styles["Chapter"]))
    story.append(Paragraph(
        "Kein Hexenwerk — nur Routine-Arbeit, die du delegierst. Jeder Ablauf hier "
        "spart mir persönlich pro Woche messbar Zeit.", styles["Body"]))

    flows = [
        ("Posteingang vorsortieren",
         "Lass KI eingehende Mails in drei Körbe werfen: jetzt antworten, später, "
         "ignorieren. Du entscheidest weiter selbst — aber die Vorsortierung nimmt "
         "dir den Berg am Morgen."),
        ("Aus einem Long-Form drei Formate machen",
         "Ein Newsletter, ein langer Post, eine Sprachnotiz — ein Input, mehrere "
         "Outputs. KI zieht daraus den LinkedIn-Post, die Kurzfassung und die "
         "Betreffzeile. Du redigierst, statt bei Null anzufangen."),
        ("Angebote schneller schreiben",
         "Eine Vorlage plus die Eckdaten des Kunden, KI baut den ersten Entwurf. Du "
         "passt Preis und Ton an. Aus 45 Minuten werden 10."),
        ("Recherche bündeln",
         "Statt zehn Tabs: ein klarer Auftrag mit Quellenpflicht. „Fass den Stand "
         "zu X zusammen, nenn Quellen, sag, wo Daten fehlen.“ Dann selbst die "
         "Quellen prüfen — nie blind übernehmen."),
        ("Die eigene Woche spiegeln",
         "Freitags deine Aufgabenliste reinkippen und fragen: Was war Busywork, was "
         "hat bewegt? KI als nüchterner Spiegel, nicht als Coach mit Konfetti."),
    ]
    for i, (t, d) in enumerate(flows, 1):
        story.append(Paragraph(f"{i}. {t}", styles["H2"]))
        story.append(Paragraph(d, styles["Body"]))
    story.append(Paragraph(
        "Wichtig: Jeder dieser Abläufe hat dich als letzte Instanz. KI liefert den "
        "Rohstoff, dein Urteil macht das Produkt.", styles["Callout"]))
    story.append(PageBreak())


def chapter_traps(story, styles):
    story.append(Paragraph("Sieben Hype-Fallen", styles["Chapter"]))
    story.append(bullets([
        "<b>Die Tool-Sammelsucht.</b> Jedes neue Tool kostet Einarbeitung. Zehn halb "
        "gelernte Tools sind langsamer als eins, das du beherrschst.",
        "<b>Der Autopilot-Mythos.</b> „Läuft von allein“ heißt meist "
        "„bricht von allein, wenn du nicht hinschaust“.",
        "<b>Prompt-Pakete für 47 €.</b> Ein guter Prompt ist eine klare "
        "Aufgabe. Die kannst du selbst formulieren — kostenlos.",
        "<b>Der Vanity-Output.</b> 30 Posts pro Tag generieren fühlt sich produktiv "
        "an. Reichweite ohne Substanz ist trotzdem Leere.",
        "<b>KI als Strategie-Ersatz.</b> Ein Modell kann deine Positionierung "
        "formulieren, aber nicht für dich entscheiden, wer du sein willst.",
        "<b>Blindes Vertrauen in Zahlen.</b> KI nennt selbstbewusst Statistiken, die "
        "sie erfindet. Jede Zahl, die zählt, selbst prüfen.",
        "<b>FOMO als Geschäftsmodell.</b> Wer dir Angst macht, etwas zu verpassen, "
        "verkauft dir meist die Lösung gleich mit. Atme durch.",
    ], styles))
    story.append(Paragraph(
        "Die unbequeme Wahrheit: Die meisten Leute, die laut über KI reden, "
        "verdienen ihr Geld mit dem Reden — nicht mit der KI.", styles["Callout"]))
    story.append(PageBreak())


def chapter_outro(story, styles):
    story.append(Paragraph("Wie es weitergeht", styles["Chapter"]))
    story.append(Paragraph(
        "Wenn du bis hier gelesen hast, hast du schon den wichtigsten Skill: Geduld "
        "für Substanz statt Reflex für Hype.", styles["Body"]))
    story.append(Paragraph(
        "Dieses eBook ist ein Schnappschuss. KI ändert sich wöchentlich, "
        "Tools kommen und gehen, Preise halbieren sich über Nacht. Was bleibt, "
        "ist die Denkweise: konkret fragen, Risiko abschätzen, selbst urteilen.",
        styles["Body"]))
    story.append(Paragraph(
        "Genau das mache ich jeden Werktag im Newsletter — die drei "
        "KI-Entwicklungen, die dein Business heute betreffen, in fünf Minuten, "
        "ohne Bullshit.", styles["Body"]))
    story.append(Paragraph("Kostenlos abonnieren", styles["H2"]))
    story.append(Paragraph(
        '<font color="#d97706"><b>abannews.com</b></font> — Mo bis Fr, 7:30 Uhr, '
        "ein Tool, drei Updates, kein Spam. Abmeldung jederzeit per Klick.",
        styles["Body"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        "Danke fürs Lesen. Schreib mir, wenn etwas davon dir wirklich Zeit "
        "gespart hat — hallo@abannews.com.", styles["Lead"]))
    story.append(Paragraph("— Aban", styles["Body"]))


def build():
    styles = make_styles()
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, FILENAME), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2.2 * cm,
        title=f"{TITLE} — {SUBTITLE}",
        author="Aban / aban news",
        subject="KI ohne Hype für DACH-Solopreneure",
        keywords="KI, AI, Anti-Hype, Solopreneur, DACH, Newsletter, Produktivität",
        creator="aban news — abannews.com",
    )
    chapters = [
        ("Warum dieses eBook existiert", chapter_intro),
        ("Der 3-Fragen-Bullshit-Filter", chapter_filter),
        ("Dein minimaler KI-Stack", chapter_stack),
        ("Fünf Abläufe, die echt Zeit sparen", chapter_workflows),
        ("Sieben Hype-Fallen", chapter_traps),
        ("Wie es weitergeht", chapter_outro),
    ]
    story = []
    cover_page(story, styles)
    toc(story, styles, chapters)
    for _, fn in chapters:
        fn(story, styles)
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print(f"✓ {os.path.join('downloads', FILENAME)} erstellt")


if __name__ == "__main__":
    build()
