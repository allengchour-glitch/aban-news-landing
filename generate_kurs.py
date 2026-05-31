#!/usr/bin/env python3
"""
aban news — Kurs-Generator: "Die KI-Werkstatt".

Erzeugt das vollständige Kurs-PDF, das Käufer von kurs.html bekommen.
6 Module, ausgeschrieben, mit Übungen und Vorlagen. Anti-Hype, du-Form.

Output:  downloads/ki-werkstatt-kurs.pdf
Run:     python3 generate_kurs.py
Dep:     pip install reportlab
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

AMBER = HexColor("#d97706")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(OUT_DIR, exist_ok=True)


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


# ============================================================
# Kurs-Inhalt
# ============================================================
TITLE = "Die KI-Werkstatt"
SUBTITLE = "Wie du als Solo-Profi im DACH-Raum KI im Arbeitsalltag nutzt — ohne Hype."

INTRO = [
    ("lead", "Willkommen. Du hast diesen Kurs gekauft, weil du KI nicht bewundern, "
             "sondern nutzen willst. Genau darum geht es hier."),
    ("p", "Ich bin Aban. Ich schreibe den täglichen aban-news-Newsletter für deutschsprachige "
          "Solo-Profis und teste KI-Werkzeuge im echten Arbeitsalltag — nicht im Labor. Dieser "
          "Kurs ist die Essenz daraus: was funktioniert, was Geld spart, und wo du der Technik "
          "besser nicht traust."),
    ("h3", "So arbeitest du mit dem Kurs"),
    ("ul", [
        "<b>Sechs Module.</b> Jedes ist eine Lektion plus eine Übung. Rechne mit rund einer Stunde pro Modul.",
        "<b>Reihenfolge zählt.</b> Modul 1 und 2 legen das Fundament. Danach kannst du springen.",
        "<b>Mach mit.</b> Die Übungen sind der Punkt. Lesen allein verändert nichts an deinem Alltag.",
        "<b>Halte ein Werkzeug bereit.</b> Ein kostenloser KI-Chatbot-Zugang reicht für den Start.",
    ]),
    ("callout", "Regel des Kurses: Wenn ein Tipp dir nicht innerhalb einer Woche Zeit spart "
                "oder bessere Ergebnisse bringt, wirf ihn weg. Ehrliche Arbeit schlägt jedes Versprechen."),
    ("h3", "Was du am Ende kannst"),
    ("ul", [
        "Eine KI so anleiten, dass brauchbare Ergebnisse herauskommen — wiederholbar, nicht zufällig.",
        "Die richtigen Werkzeuge für deine Arbeit auswählen, statt Abos zu sammeln.",
        "Wiederkehrende Aufgaben halb automatisieren und so jede Woche Stunden sparen.",
        "KI im DACH-Raum einsetzen, ohne dir Datenschutz-Ärger einzuhandeln.",
    ]),
]

MODULES = [
    {
        "num": "Modul 1",
        "title": "Grundlagen ohne Hype",
        "blocks": [
            ("lead", "Bevor du ein Werkzeug benutzt, solltest du wissen, was es tut. Sonst "
                     "vertraust du blind — und blindes Vertrauen ist bei KI teuer."),
            ("h3", "Was ein Sprachmodell wirklich macht"),
            ("p", "Ein KI-Chatbot wie ChatGPT ist ein Sprachmodell. Es sagt das nächste "
                  "wahrscheinliche Wort voraus, wieder und wieder, bis ein Text entsteht. Es "
                  "versteht nicht im menschlichen Sinn — es rechnet, welche Worte gut zusammenpassen. "
                  "Das erklärt seine zwei Gesichter: Es schreibt erstaunlich flüssige Texte und "
                  "erfindet zugleich überzeugend klingenden Unsinn."),
            ("p", "Dieses Erfinden hat einen Namen: Halluzination. Das Modell behauptet eine "
                  "Quelle, ein Gesetz oder eine Zahl, die es nie gab — im selben sicheren Ton wie "
                  "bei korrekten Aussagen. Es lügt nicht absichtlich. Es hat schlicht kein Konzept "
                  "von wahr und falsch."),
            ("callout", "Merksatz: KI ist ein begnadeter Texter und ein lausiger Zeuge. Lass sie "
                        "formulieren, aber prüfe jede Tatsache selbst."),
            ("h3", "Wofür KI heute taugt — und wofür nicht"),
            ("p", "Spielt KI dir in die Hände, wenn die Aufgabe sprachlich ist und du das Ergebnis "
                  "selbst beurteilen kannst? Dann ja. Geht es um harte Fakten, Zahlen oder "
                  "Verantwortung, die bei dir liegt? Dann nur als Entwurf, nie als letztes Wort."),
            ("ul", [
                "<b>Gut:</b> Entwürfe für E-Mails, Texte umformulieren, Ideen sammeln, lange Texte zusammenfassen, Sprache vereinfachen, Übersetzungs-Rohfassung.",
                "<b>Mit Vorsicht:</b> Recherche (immer gegenprüfen), Rechtliches und Steuerliches (nur Orientierung), Fachtexte in deinem Spezialgebiet.",
                "<b>Finger weg:</b> verbindliche Auskünfte ohne Prüfung, medizinische oder rechtliche Diagnosen, alles wo eine erfundene Zahl Schaden anrichtet.",
            ]),
            ("h3", "Übung 1"),
            ("ol", [
                "Stell deinem KI-Chatbot eine Frage aus deinem Fachgebiet, deren Antwort du sicher kennst.",
                "Lies die Antwort kritisch: Was stimmt, was ist vage, was ist schlicht falsch?",
                "Notiere dir einen Satz: Wo würdest du dieser KI trauen, wo nicht?",
            ]),
            ("callout", "Ergebnis dieser Übung: ein realistisches Bauchgefühl. Das ist mehr wert "
                        "als jede Funktionsliste."),
        ],
    },
    {
        "num": "Modul 2",
        "title": "Dein Werkzeugkasten",
        "blocks": [
            ("lead", "Du brauchst nicht zwölf Tools. Du brauchst die zwei oder drei richtigen — "
                     "und den Mut, den Rest zu ignorieren."),
            ("h3", "Die vier Kategorien, die für dich zählen"),
            ("ul", [
                "<b>Text &amp; Assistenz:</b> ein guter Chatbot. Das ist dein Arbeitspferd für 80 Prozent.",
                "<b>Bild:</b> für Social-Grafiken, Blog-Bilder, Skizzen. Nur wenn du es wirklich brauchst.",
                "<b>Sprache &amp; Audio:</b> Diktat, Transkription, Vorlesen. Spart Tipparbeit.",
                "<b>Spezial:</b> ein Werkzeug für deine eine wiederkehrende Aufgabe (z. B. Untertitel, Tabellen).",
            ]),
            ("p", "Mehr als ein Tool pro Kategorie ist am Anfang Ballast. Erst wenn ein Werkzeug "
                  "dich regelmäßig ausbremst, suchst du Ersatz — gezielt, nicht aus Neugier."),
            ("h3", "Die drei Fragen vor jedem Abo"),
            ("ol", [
                "Welche konkrete Aufgabe in meiner Woche löst das Tool? Wenn du keine nennen kannst: nicht kaufen.",
                "Was kostet mich die Zeit, die es spart — und ist das mehr als der Preis?",
                "Wo liegen meine Daten? Steht der Anbieter zur DSGVO? (Mehr dazu in Modul 5.)",
            ]),
            ("callout", "Im KI-Tools-Radar auf radar.abannews.com findest du über 170 Werkzeuge "
                        "ehrlich bewertet — inklusive Preis und Datenschutz-Blick. Nutz ihn als Nachschlagewerk."),
            ("h3", "Dein Stack-Bogen"),
            ("p", "Schreib dir deinen Werkzeugkasten auf eine Seite. Diese Übersicht hält dich "
                  "davon ab, dieselbe Aufgabe mit drei Tools zu erledigen."),
            ("code", "Aufgabe            ->  Werkzeug        ->  Kosten/Monat\n"
                     "Texte &amp; E-Mails    ->  ______________  ->  ________\n"
                     "Bilder             ->  ______________  ->  ________\n"
                     "Audio/Transkript   ->  ______________  ->  ________\n"
                     "Spezial: ________  ->  ______________  ->  ________"),
            ("h3", "Übung 2"),
            ("ol", [
                "Liste alle KI-Tools auf, für die du gerade zahlst.",
                "Streiche jedes, das keine konkrete wöchentliche Aufgabe löst.",
                "Fülle den Stack-Bogen oben mit dem aus, was übrig bleibt.",
            ]),
        ],
    },
    {
        "num": "Modul 3",
        "title": "Prompten wie ein Profi",
        "blocks": [
            ("lead", "Der Unterschied zwischen einer mageren und einer brauchbaren Antwort liegt "
                     "fast nie am Werkzeug. Er liegt an deiner Anweisung."),
            ("h3", "Die RKAF-Struktur"),
            ("p", "Vergiss Zauberformeln. Ein guter Prompt hat vier Teile. Merke sie dir als RKAF:"),
            ("ul", [
                "<b>Rolle:</b> Wer soll die KI sein? &bdquo;Du bist eine erfahrene Texterin&ldquo;.",
                "<b>Kontext:</b> Was ist die Lage? Für wen, in welchem Ton, mit welchem Ziel?",
                "<b>Aufgabe:</b> Was genau soll herauskommen? Ein Satz, klar und konkret.",
                "<b>Format:</b> Wie soll die Antwort aussehen? Länge, Struktur, Stil.",
            ]),
            ("h3", "Schwach gegen stark — ein Beispiel"),
            ("p", "Schwacher Prompt: &bdquo;Schreib eine E-Mail an einen Kunden wegen einer "
                  "Rechnung.&ldquo; Das Ergebnis ist generisch und unbrauchbar."),
            ("code", "Du bist eine freundliche, klare Bueroleitung. (Rolle)\n"
                     "Ein Stammkunde hat eine Rechnung ueber 480 Euro seit\n"
                     "drei Wochen nicht bezahlt. Die Beziehung ist gut. (Kontext)\n"
                     "Schreib eine hoefliche Zahlungserinnerung. (Aufgabe)\n"
                     "Maximal 120 Woerter, du-Form, ein klarer naechster\n"
                     "Schritt am Ende. (Format)"),
            ("p", "Derselbe Chatbot, dieselbe Sekunde — aber jetzt bekommst du etwas, das du fast "
                  "ohne Änderung verschicken kannst."),
            ("h3", "Nachschärfen statt neu anfangen"),
            ("p", "Die erste Antwort ist ein Entwurf, kein Endprodukt. Schick die KI in Runden: "
                  "&bdquo;Kürzer.&ldquo; &bdquo;Weniger förmlich.&ldquo; &bdquo;Nimm den dritten "
                  "Absatz raus.&ldquo; Jede Runde bringt dich näher, ohne dass du von vorn beginnst."),
            ("callout", "Fertige Vorlagen für E-Mails, Angebote, Social Media und Recherche findest "
                        "du in der Prompt-Bibliothek auf prompts.abannews.com — zum Kopieren und Anpassen."),
            ("h3", "Übung 3"),
            ("ol", [
                "Nimm eine echte Aufgabe von heute (eine E-Mail, einen Text).",
                "Schreib den Prompt einmal nach RKAF — Rolle, Kontext, Aufgabe, Format.",
                "Schärfe das Ergebnis in zwei Runden nach. Vergleiche mit deinem ersten Versuch.",
            ]),
        ],
    },
    {
        "num": "Modul 4",
        "title": "Workflows, die Zeit sparen",
        "blocks": [
            ("lead", "Der größte Hebel ist nicht die einzelne gute Antwort. Es ist die Aufgabe, "
                     "die du einmal einrichtest und dann immer wieder gleich erledigst."),
            ("h3", "Finde deine Wiederholungen"),
            ("p", "Geh deine letzte Arbeitswoche durch. Welche Aufgaben kamen mehrfach vor und "
                  "liefen sprachlich ähnlich ab? Genau die sind Kandidaten. Typisch sind:"),
            ("ul", [
                "Standard-Antworten auf wiederkehrende Kundenfragen.",
                "Angebots- und Rechnungstexte nach immer gleichem Muster.",
                "Einen langen Inhalt in mehrere Formate bringen (Beitrag, Mail, Social).",
                "Notizen oder Telefonate in saubere Zusammenfassungen verwandeln.",
            ]),
            ("h3", "Bausteine statt jedes Mal neu"),
            ("p", "Speichere deine besten Prompts als Bausteine — in einer Notiz-App, einem "
                  "Dokument oder den gespeicherten Anweisungen deines Chatbots. Beim nächsten Mal "
                  "tauschst du nur die Details aus, statt den Prompt neu zu erfinden."),
            ("callout", "Eine Stunde, die du heute ins Einrichten eines Bausteins steckst, holst "
                        "du in zwei Wochen wieder rein — und danach läuft es."),
            ("h3", "Der Drei-Formate-Trick"),
            ("p", "Du hast einen guten Text geschrieben? Lass die KI daraus zwei weitere Formate "
                  "machen: eine kurze E-Mail-Fassung und einen Social-Post. Ein Inhalt, drei Wege "
                  "zu deinen Leuten — in Minuten statt Stunden."),
            ("h3", "Wo Automatisierung aufhört"),
            ("p", "Halb automatisieren heißt: Die KI macht den Entwurf, du prüfst und verschickst. "
                  "Voll automatisch ohne Kontrolle ist gefährlich — ein falscher Ton oder eine "
                  "erfundene Zahl geht sonst ungeprüft an einen Kunden. Behalte die letzte Taste."),
            ("h3", "Übung 4"),
            ("ol", [
                "Wähle eine wiederkehrende Aufgabe aus deiner Liste.",
                "Baue einen Baustein-Prompt dafür (nach RKAF) und speichere ihn.",
                "Nutze ihn diese Woche dreimal. Notiere, wie viel Zeit du gespart hast.",
            ]),
        ],
    },
    {
        "num": "Modul 5",
        "title": "DSGVO &amp; Recht im DACH-Raum",
        "blocks": [
            ("lead", "Datenschutz ist im DACH-Raum kein Beiwerk, sondern dein Schutz. Ein paar "
                     "klare Regeln halten dich auf der sicheren Seite."),
            ("p", "Wichtig vorweg: Das hier ist praktische Orientierung, keine Rechtsberatung. "
                  "Bei heiklen Fällen fragst du eine Fachperson. Aber die meisten Stolperfallen "
                  "vermeidest du mit gesundem Menschenverstand."),
            ("h3", "Die eine Frage vor jeder Eingabe"),
            ("callout", "Würde es mir schaden, wenn das, was ich hier eintippe, öffentlich würde? "
                        "Wenn ja — nicht eintippen."),
            ("h3", "Was du der KI nicht ungefragt gibst"),
            ("ul", [
                "Klarnamen und Kontaktdaten von Kunden, wenn es für die Aufgabe nicht nötig ist.",
                "Gesundheitsdaten, Vertragsdetails, alles Vertrauliche.",
                "Interne Zahlen, Passwörter, Zugangsdaten — niemals.",
            ]),
            ("p", "Brauchst du echte Daten, anonymisiere sie. Statt &bdquo;Frau Meier, "
                  "Lindenweg 4&ldquo; schreibst du &bdquo;die Kundin&ldquo;. Die KI formuliert "
                  "genauso gut, und nichts Persönliches verlässt dein Haus."),
            ("h3", "Anbieter und Standort"),
            ("ul", [
                "Schau, ob der Anbieter eine DSGVO-konforme Verarbeitung zusichert (Auftragsverarbeitung, EU-Server-Option).",
                "Schalte, wenn möglich, das Training mit deinen Eingaben ab (in den Einstellungen).",
                "Für sensible Arbeit bevorzuge Anbieter mit EU-Datenstandort.",
            ]),
            ("h3", "Kennzeichnung wird Pflicht"),
            ("p", "Ab August 2026 greift der EU AI Act stärker: KI-erzeugte Inhalte sollen als "
                  "solche erkennbar sein. Gewöhn dir früh an, bei rein KI-generierten Texten oder "
                  "Bildern einen kurzen Hinweis zu setzen. Das schafft Vertrauen statt Risiko."),
            ("h3", "Übung 5"),
            ("ol", [
                "Geh deine drei häufigsten KI-Aufgaben durch.",
                "Markiere, wo personenbezogene Daten im Spiel sind.",
                "Lege für jede eine Regel fest: anonymisieren, weglassen oder nur lokal arbeiten.",
            ]),
        ],
    },
    {
        "num": "Modul 6",
        "title": "Kunden gewinnen — ehrlich",
        "blocks": [
            ("lead", "KI kann dir bei der Akquise helfen, ohne dass du zum Spammer wirst. Der "
                     "Schlüssel ist: relevant statt massenhaft."),
            ("h3", "Warum die meisten Akquise-Mails sterben"),
            ("p", "Sie klingen nach Vorlage, drehen sich um den Absender und nennen keinen Grund, "
                  "warum gerade dieser Empfänger sie lesen sollte. KI macht das schlimmer, wenn du "
                  "sie auf Masse loslässt — und besser, wenn du sie auf Relevanz trimmst."),
            ("h3", "Die Recherche der KI überlassen, die Ansprache nicht"),
            ("p", "Nutze KI, um dich auf ein Gespräch vorzubereiten: Fasse die Website eines "
                  "Interessenten zusammen, finde den wahrscheinlichen Schmerzpunkt, sammle Fragen. "
                  "Die eigentliche Nachricht schreibst du persönlich — kurz, konkret, mit echtem Bezug."),
            ("code", "Du bist ein direkter, respektvoller Vertriebsprofi.\n"
                     "Hier ist die Selbstbeschreibung eines moeglichen Kunden:\n"
                     "[Text einfuegen].\n"
                     "Nenne mir die drei wahrscheinlichsten Probleme, bei denen\n"
                     "mein Angebot [dein Angebot] helfen koennte. Pro Problem\n"
                     "ein Satz, kein Marketing-Sprech."),
            ("p", "Aus diesen drei Punkten baust du eine Mail mit maximal acht Sätzen: ein Satz "
                  "Bezug, ein erkannter Schmerzpunkt, dein konkreter Nutzen, eine einfache Frage "
                  "als nächster Schritt. Fertig."),
            ("callout", "Fertige, nicht nach Spam klingende E-Mail-Vorlagen liegen als Arbeitsblatt "
                        "bei (cold-email-templates.pdf). Pass sie an deine Stimme an, statt sie blind zu kopieren."),
            ("h3", "Maß halten"),
            ("p", "Lieber zehn durchdachte Nachrichten als hundert generische. Zehn relevante "
                  "Mails bringen mehr echte Gespräche — und ruinieren nicht deinen Ruf."),
            ("h3", "Übung 6"),
            ("ol", [
                "Such dir einen realen Wunschkunden aus.",
                "Lass die KI die Recherche machen (Prompt oben), dann schreib die Mail selbst.",
                "Schick sie ab. Echte Akquise schlägt jede Theorie.",
            ]),
        ],
    },
]

CLOSING = [
    ("lead", "Du hast alle sechs Module durch. Jetzt zählt nur eins: dranbleiben."),
    ("p", "Such dir aus jedem Modul den einen Hebel, der dir am meisten bringt, und mach ihn zur "
          "Gewohnheit. Nicht alles auf einmal — ein Schritt, der hält, ist mehr wert als zehn, die "
          "du nach einer Woche vergisst."),
    ("h3", "Deine vier Arbeitsblätter"),
    ("p", "Diese kostenlosen PDFs vertiefen einzelne Module. Du findest sie auf "
          "abannews.com/resources.html:"),
    ("ul", [
        "<b>30 Prompts für Solopreneure</b> — vertieft Modul 3.",
        "<b>KI-Tool-Stack 2026</b> — vertieft Modul 2.",
        "<b>DSGVO-KI-Checkliste</b> — vertieft Modul 5.",
        "<b>Cold-Email-Templates</b> — vertieft Modul 6.",
    ]),
    ("h3", "Bleib auf dem Laufenden"),
    ("p", "Die Werkzeuge ändern sich, die Prinzipien bleiben. Im täglichen aban-news-Newsletter "
          "teste ich laufend Neues und sortiere für dich, was zählt. Wenn du noch nicht dabei bist: "
          "abannews.com."),
    ("callout", "Fragen zum Kurs? Schreib mir direkt an hallo@abannews.com. Ich lese und antworte selbst."),
    ("p", "Danke, dass du dir die Werkstatt geholt hast. Jetzt geh und bau dir etwas, das dir "
          "Zeit spart. — Aban"),
]


def build():
    styles = make_styles()
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
    story.append(Paragraph("Ein Kurs in 6 Modulen", styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())
    # Inhalt
    story.append(Paragraph("Inhalt", styles["Chapter"]))
    story.append(Paragraph('<font color="#d97706"><b>00</b></font>&nbsp;&nbsp;Bevor du anfängst', styles["TocItem"]))
    for i, m in enumerate(MODULES, 1):
        story.append(Paragraph(
            '<font color="#d97706"><b>%02d</b></font>&nbsp;&nbsp;%s' % (i, m["title"]),
            styles["TocItem"]))
    story.append(Paragraph('<font color="#d97706"><b>07</b></font>&nbsp;&nbsp;Wie es weitergeht', styles["TocItem"]))
    story.append(PageBreak())
    # Intro
    story.append(Paragraph("Bevor du anfängst", styles["Chapter"]))
    render_blocks(story, styles, INTRO)
    story.append(PageBreak())
    # Module
    for m in MODULES:
        story.append(Paragraph(m["num"], styles["Kicker"]))
        story.append(Paragraph(m["title"], styles["Chapter"]))
        render_blocks(story, styles, m["blocks"])
        story.append(PageBreak())
    # Closing
    story.append(Paragraph("Wie es weitergeht", styles["Chapter"]))
    render_blocks(story, styles, CLOSING)
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print("✓ downloads/ki-werkstatt-kurs.pdf erstellt")


if __name__ == "__main__":
    build()
