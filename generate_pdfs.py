"""
aban news — PDF Lead-Magnet Generator
Generiert 5 PDFs in downloads/
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Brand colors
AMBER = HexColor("#d97706")
AMBER_LIGHT = HexColor("#fbbf24")
DARK = HexColor("#1f2937")
CREAM = HexColor("#fef3c7")
LIGHT_GRAY = HexColor("#f3f4f6")
MID_GRAY = HexColor("#6b7280")

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(OUT_DIR, exist_ok=True)


def footer_canvas(canvas_obj, doc):
    """Footer + Page-Number auf jeder Seite (ausser Cover)"""
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(MID_GRAY)
    # Footer line
    canvas_obj.setStrokeColor(LIGHT_GRAY)
    canvas_obj.line(1.5 * cm, 1.5 * cm, A4[0] - 1.5 * cm, 1.5 * cm)
    canvas_obj.drawString(1.5 * cm, 1.0 * cm, "aban news  ·  2026  ·  abannews.com")
    canvas_obj.drawRightString(A4[0] - 1.5 * cm, 1.0 * cm, f"Seite {doc.page}")
    canvas_obj.restoreState()


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=32,
        leading=38,
        textColor=AMBER,
        alignment=TA_CENTER,
        spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        name="CoverSub",
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        textColor=DARK,
        alignment=TA_CENTER,
        spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="CoverMeta",
        fontName="Helvetica-Oblique",
        fontSize=10,
        leading=14,
        textColor=MID_GRAY,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="H1Amber",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=AMBER,
        spaceBefore=12,
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="H2",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=DARK,
        spaceBefore=10,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="H3Amber",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=AMBER,
        spaceBefore=8,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="Body",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=DARK,
        alignment=TA_LEFT,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BodySmall",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MID_GRAY,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="CodeBox",
        fontName="Courier",
        fontSize=9,
        leading=12,
        textColor=DARK,
        backColor=CREAM,
        borderColor=AMBER,
        borderWidth=0.5,
        borderPadding=6,
        leftIndent=4,
        rightIndent=4,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="ItalicMute",
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=MID_GRAY,
        spaceAfter=4,
    ))
    return styles


def cover_page(story, styles, title, subtitle, date_str="Stand: 2026"):
    """Generiert Coverpage"""
    story.append(Spacer(1, 5 * cm))
    story.append(Paragraph("&#9749;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=64,
        alignment=TA_CENTER, textColor=AMBER,
    )))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=18,
        alignment=TA_CENTER, textColor=DARK, spaceAfter=20,
    )))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(title, styles["CoverTitle"]))
    story.append(Paragraph(subtitle, styles["CoverSub"]))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(date_str, styles["CoverMeta"]))
    story.append(Paragraph("abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())


def new_doc(filename, title, subject, keywords):
    return SimpleDocTemplate(
        os.path.join(OUT_DIR, filename),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
        title=title,
        author="Aban / aban news",
        subject=subject,
        keywords=keywords,
        creator="aban news — abannews.com",
    )


# ============================================================
# PDF 1: 30 Prompts für Solopreneure
# ============================================================
def build_pdf_prompts():
    styles = make_styles()
    doc = new_doc(
        "30-prompts-fuer-solopreneure.pdf",
        "30 Prompts für DACH-Solopreneure",
        "Praxis-Prompts für Marketing, Recherche, Texten, Automation, Outreach, Strategie",
        "Prompts, AI, ChatGPT, Claude, Solopreneur, DACH, Marketing"
    )
    story = []
    cover_page(story, styles,
               "30 Prompts für DACH-Solopreneure",
               "Direkt einsetzbar. Ohne Hype. 2026.")

    story.append(Paragraph("So nutzt du diese Sammlung", styles["H1Amber"]))
    story.append(Paragraph(
        "30 erprobte Prompts in 6 Kategorien. Kopiere den Codeblock, "
        "ersetze die <font color='#d97706'>[Platzhalter]</font> mit deinen Daten "
        "und schick es an Claude, ChatGPT oder Gemini. Jeder Prompt hat einen klaren Use-Case "
        "und einen erwarteten Output. Keine Magie. Keine Buzzwords.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.4 * cm))

    categories = [
        ("Marketing", [
            ("Cold-Email-Opener",
             "Du brauchst einen Opener, der nicht nach Spam klingt.",
             "Schreibe 3 Cold-Email-Opener-Varianten an [Zielpersona] in der [Branche]. Direkt, respektvoll, ohne Floskeln. Maximal 2 Sätze. Bezug auf [konkrete Pain-Point]. Kein 'Hope this finds you well'.",
             "3 unterschiedliche Opener mit klarem Pain-Point-Bezug."),
            ("Social-Post-aus-Newsletter",
             "Newsletter erschienen — du brauchst 1 Post draus.",
             "Hier ist mein Newsletter-Inhalt: [Text einfügen]. Mache daraus 1 LinkedIn-Post (max. 1200 Zeichen), der EINE konkrete Erkenntnis hervorhebt. Keine Emojis am Anfang jeder Zeile. Klare Pointe am Ende.",
             "Ein scharfer Post mit klarem Take, kein Listicle-Spam."),
            ("USP-Sharpening",
             "Dein USP klingt wie alle anderen — schärfen.",
             "Hier ist mein aktueller USP: [USP]. Was sagen 5 andere in meiner Nische [Nische] ähnlich? Was wäre ein USP, der NUR auf mich zutrifft? Frage zurück, wenn dir Daten fehlen.",
             "Konkurrenz-Liste + 3 differenzierte USP-Vorschläge."),
            ("Email-Subject-Line-Tester",
             "5 Subject-Lines, von denen 1 funktioniert.",
             "Generiere 5 Subject-Lines für eine Email an [Zielgruppe] über [Thema]. Maximal 55 Zeichen. Eine pragmatisch, eine neugierig-machend, eine mit Zahl, eine mit Frage, eine direkt. Keine Clickbait-Muster.",
             "5 Subjects mit verschiedenen Tonalitäten zum Testen."),
            ("Headline-Generator",
             "Landing-Page braucht eine Headline, die nicht generisch ist.",
             "Mein Produkt: [Produkt]. Zielgruppe: [Zielgruppe]. Was sie wirklich wollen: [echtes Bedürfnis]. Generiere 5 Headlines, jeweils mit Sub-Headline. Maximal 8 Wörter pro Headline. Klar > clever.",
             "5 Headline+Sub-Pairs, davon mind. 1 brauchbar."),
        ]),
        ("Recherche", [
            ("Konkurrenz-Scan",
             "Schnellüberblick über 5 Wettbewerber in deiner Nische.",
             "Liste 5 ernstzunehmende Konkurrenten zu [meinem Angebot] in [Region]. Für jeden: Pricing, USP, Schwäche, Zielgruppe. Sortiert nach Marktdruck. Quellen verlinken.",
             "Sortierte Wettbewerber-Tabelle mit Lücken."),
            ("Marktanalyse-Snapshot",
             "Du erwägst eine neue Nische — lohnt es sich?",
             "Bewerte den Markt für [Nische] in [Region]. Marktgröße, Wachstum, Trends, dominante Player, typische Margen, Zugangshürden. Quellen nennen. Wenn Daten fehlen: sagen, statt erfinden.",
             "Faktenbasis für Go/No-Go-Entscheidung."),
            ("Trend-Spotting",
             "Schwache Signale früh erkennen.",
             "Welche 5 sich abzeichnenden Trends im Bereich [Bereich] sehen wir in 2026, die noch unter dem Radar sind? Nicht 'AI' allgemein. Konkret. Mit Indikatoren (Suche, Investitionen, Adoption).",
             "5 spezifische Trends mit Belegen."),
            ("Customer-Interview-Fragen",
             "20 Min Call — was fragst du?",
             "Ich interviewe [Persona] über [Problem]. Generiere 10 offene Fragen, die Mom-Test-konform sind (nach Vergangenheit, nicht Zukunft). Keine Suggestion. Reihenfolge: warm-up zu specific.",
             "10 nutzbare Interview-Fragen ohne Bias."),
            ("FAQ-Mining",
             "Echte Kundenfragen statt erfundene FAQs.",
             "Hier ist mein Produkt: [Produkt]. Such auf Reddit, Quora, Foren, Reviews konkret nach Fragen, die Menschen über [Thema] stellen. 15 Fragen mit Quellen. Keine Halluzinationen — wenn keine Quelle, weglassen.",
             "15 echte Fragen mit verlinkten Quellen."),
        ]),
        ("Texten", [
            ("Text-Refinement",
             "Dein Entwurf ist okay, könnte aber schärfer sein.",
             "Hier ist mein Text: [Text]. Mach ihn 30% kürzer ohne Information zu verlieren. Streiche Füllwörter. Ersetze Passiv durch Aktiv. Behalte meinen Ton (direkt, respektvoll). Zeige Diff.",
             "Gekürzte Version mit klar markierten Änderungen."),
            ("Edit-für-Ton",
             "Text klingt zu formell/zu locker — anpassen.",
             "Hier ist mein Text: [Text]. Schreibe ihn um in den Ton von [Beispiel-URL oder Beschreibung]. Erhalte alle Fakten. Ändere NUR: Wortwahl, Satzlänge, Anrede. Keine neuen Claims.",
             "Tonal angepasste Variante, faktentreu."),
            ("Übersetzung DE↔EN",
             "Übersetzung ohne maschinellen Klang.",
             "Übersetze ins [DE/EN]: [Text]. Idiomatisch, nicht wörtlich. Marketing-Begriffe natürlich anpassen, nicht 1:1. Erhalte Brand-Voice. Wenn ein Begriff im Zielsprachraum nicht funktioniert: alternative vorschlagen.",
             "Saubere Übersetzung + Anmerkungen zu kniffligen Stellen."),
            ("Zusammenfassung-mit-Pointe",
             "Langer Artikel — 1 Absatz mit echter Erkenntnis.",
             "Fasse [Artikel/URL] in maximal 150 Wörtern zusammen. Struktur: 1 Satz Kontext, 3 Sätze Kerninhalt, 1 Satz: Was bedeutet das für [meine Zielgruppe]? Keine Buzzwords.",
             "150 Wörter mit klarer 'so what?'-Pointe."),
            ("Hook-Generator",
             "Erster Satz, der zum Weiterlesen zwingt.",
             "Mein Artikel handelt von [Thema] für [Zielgruppe]. Generiere 5 Hook-Varianten (erster Satz): 1 Frage, 1 kontroverse These, 1 konkrete Zahl, 1 Anekdote-Start, 1 direkte Adressierung. Maximal 20 Wörter pro Hook.",
             "5 Hook-Varianten zum A/B-Testen."),
        ]),
        ("Automation", [
            ("Make-Workflow-Skizze",
             "Idee → konkrete Automation-Spec.",
             "Ich möchte: [Trigger] → [Aktion]. Skizziere einen Make.com-Workflow: Module, Bedingungen, Fehlerbehandlung, geschätzte Operations pro Run, Edge-Cases. Wo manuelle Prüfung sinnvoll bleibt.",
             "Workflow-Skizze + Aufwand + Risiko-Liste."),
            ("Zapier-Idee",
             "Trigger und Action vorschlagen.",
             "Mein Workflow heute: [manueller Ablauf]. Welche Zapier-Zaps würden das halbautomatisieren? Pro Zap: Trigger-App, Action-App, Filter-Logik, Datenfelder-Mapping, monatliche Kosten.",
             "3-5 Zap-Ideen mit Cost/Effort-Schätzung."),
            ("Email-Trigger-Plan",
             "Welche Emails sollen wann automatisch raus?",
             "Mein Funnel: [kurze Beschreibung]. Schlage einen Email-Sequenz-Plan vor: Welcome-Series (3 Emails), Nurture (4 Emails), Re-Engagement (2 Emails). Pro Email: Trigger, Tag, Subject, Kerninhalt-Bullet.",
             "Strukturierter Sequenz-Plan mit allen Trigger-Punkten."),
            ("Daily-Routine-Optimierung",
             "Wo verlierst du Zeit?",
             "Hier ist meine typische Arbeitswoche: [Aufgaben + Stunden]. Identifiziere 3 Aktivitäten zum Automatisieren, 3 zum Outsourcen, 3 zum Streichen. Mit Reasoning. Kein 'einfach mehr Tools'.",
             "9 konkrete Empfehlungen mit Begründung."),
            ("Reporting-Setup",
             "KPIs einmal pro Woche automatisch.",
             "Ich tracke: [Metriken]. Skizziere ein wöchentliches Auto-Report (Google Sheet / Notion). Datenquellen, Refresh-Logik, welche Charts, wer bekommt es. Inkl. Setup-Schritte für Beehiiv/Plausible/Tally.",
             "Report-Spec, sofort umsetzbar."),
        ]),
        ("Outreach", [
            ("Sponsor-Pitch",
             "Newsletter-Sponsoring anbieten ohne zu betteln.",
             "Mein Newsletter: [Stats — Subscriber, Open-Rate, Nische]. Sponsor-Target: [Firma]. Schreibe einen Pitch (max. 150 Wörter): Warum diese Firma + dieser Newsletter passen, was sie bekommen, Pricing-Anker, klarer CTA. Direkt, nicht unterwürfig.",
             "Versandfertiger Sponsor-Pitch."),
            ("Newsletter-Swap-Anfrage",
             "Mit einem ähnlich grossen Newsletter tauschen.",
             "Mein Newsletter: [Beschreibung + Stats]. Target-Newsletter: [URL]. Schreibe eine Cross-Promo-Anfrage. Wert beidseitig klarmachen. Schlage konkretes Format vor (Mention, Empfehlung, vollwertiger Swap).",
             "Faire Swap-Anfrage mit Format-Vorschlag."),
            ("Podcast-Pitch",
             "Du als Gast.",
             "Podcast: [URL/Name]. Letzte 5 Folgen handelten von [Themen]. Mein Expertise: [Bereich + Belege]. Schreibe einen Pitch (max. 120 Wörter): Bezug zu konkreter Folge, 3 mögliche Themen, warum Hörer profitieren. Kein 'I'm a thought leader'.",
             "Konkreter Pitch mit Episode-Bezug."),
            ("Cold-DM",
             "LinkedIn/X — direkt aber nicht slimy.",
             "Target: [Person + Rolle]. Mein Ziel: [Was willst du wirklich]. Schreibe eine DM (max. 50 Wörter): kein Verkaufspitch, klarer Bezug zu ihrem Content, konkrete Frage oder Wert-Angebot. Kein 'I'd love to connect'.",
             "Versandfertige DM, nicht generisch."),
            ("Follow-up nach 7 Tagen",
             "Keine Antwort — nochmal nachhaken.",
             "Originale Email: [Text]. Schreibe einen Follow-up (max. 60 Wörter), der nicht passiv-aggressiv klingt. Variante 1: andere Angle. Variante 2: Wert-Add (kostenlose Ressource). Variante 3: graceful exit.",
             "3 Follow-up-Optionen je nach Situation."),
        ]),
        ("Strategie", [
            ("90-Tage-Plan",
             "Vom Ziel zum Wochenfokus.",
             "Mein Ziel in 90 Tagen: [konkret + messbar]. Heute habe ich: [Ressourcen]. Generiere einen 90-Tage-Plan, runtergebrochen auf 12 Wochen, mit jeweils EINEM Hauptfokus pro Woche. Realistisch, nicht ambitioniert.",
             "12 Wochen × 1 Fokus = klarer Plan."),
            ("Pricing-Decision",
             "Was darf das wirklich kosten?",
             "Mein Angebot: [Beschreibung]. Vergleichbare am Markt: [Beispiele]. Generiere 3 Pricing-Szenarien (low/mid/high) mit jeweils: Zielgruppe, Conversion-Annahme, Margen-Rechnung, Repositioning falls nötig. Kein 'value-based pricing'-Geschwurbel.",
             "3 Szenarien mit Zahlen."),
            ("Niche-Validation",
             "Bevor du Zeit investierst — geht das auf?",
             "Idee: [Nische]. Bewerte gegen 5 Kriterien: 1) Schmerz-Intensität bei Zielgruppe, 2) Existierende Lösungen (gut/schlecht?), 3) Zahlungsbereitschaft, 4) erreichbar in 6 Mt., 5) passt zu meinen Skills. Skala 1-5 + Begründung.",
             "Strukturierte Bewertung mit klarem Go/No-Go."),
            ("Quick-Win-Identifikation",
             "Was kann ich in 7 Tagen erreichen?",
             "Mein Geschäft heute: [Status]. Was sind 5 Quick-Wins (≤7 Tage Aufwand), die direkt Umsatz/Reach/Leads bringen? Kein 'Content-Strategy entwickeln'. Konkrete Aktionen mit erwartbarer Wirkung.",
             "5 sofort umsetzbare Aktionen mit Impact-Schätzung."),
            ("Stop-doing-Liste",
             "Weniger ist mehr — was streichen?",
             "Hier sind alle meine aktuellen Aktivitäten: [Liste]. Welche 3 sollte ich SOFORT stoppen, weil ROI fehlt oder ich falsche Hebel ziehe? Mit Reasoning. Was ersetzt sie?",
             "3 Stop-Items + Ersatz-Empfehlungen."),
        ]),
    ]

    prompt_counter = 1
    for cat_name, prompts in categories:
        story.append(Paragraph(cat_name, styles["H1Amber"]))
        story.append(Spacer(1, 0.2 * cm))
        for title, use_case, prompt, expected in prompts:
            block = []
            block.append(Paragraph(f"<b>{prompt_counter}. {title}</b>", styles["H2"]))
            block.append(Paragraph(f"<i>Use-Case:</i> {use_case}", styles["BodySmall"]))
            block.append(Paragraph(prompt.replace("[", "<font color='#d97706'>[").replace("]", "]</font>"), styles["CodeBox"]))
            block.append(Paragraph(f"<i>Erwartet:</i> {expected}", styles["BodySmall"]))
            block.append(Spacer(1, 0.3 * cm))
            story.append(KeepTogether(block))
            prompt_counter += 1
        story.append(Spacer(1, 0.4 * cm))

    # Outro
    story.append(PageBreak())
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph("Mehr in der nächsten Ausgabe.", styles["H1Amber"]))
    story.append(Paragraph(
        "aban news — täglich kurz, mit Stand-der-Dinge-Briefing für DACH-Solopreneure. "
        "Ohne Hype. Ohne Affiliate. Ohne Newsletter-Pflicht.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("<b>abannews.com</b>", styles["H2"]))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print(f"OK: 30-prompts-fuer-solopreneure.pdf  ({prompt_counter - 1} prompts)")


# ============================================================
# PDF 2: Anti-Hype-Glossar
# ============================================================
def build_pdf_glossar():
    styles = make_styles()
    doc = new_doc(
        "anti-hype-glossar.pdf",
        "Anti-Hype-Glossar — AI-Begriffe ehrlich erklärt",
        "Was die Begriffe wirklich bedeuten, gegen Marketing-Definitionen",
        "AI, Glossar, Anti-Hype, LLM, GPT, Claude, Marketing"
    )
    story = []
    cover_page(story, styles,
               "Anti-Hype-Glossar",
               "Was die Begriffe WIRKLICH bedeuten")

    story.append(Paragraph("Wie dieses Glossar zu lesen ist", styles["H1Amber"]))
    story.append(Paragraph(
        "Drei Zeilen pro Begriff: was das Marketing sagt, was es tatsächlich bedeutet, "
        "und ein konkretes Beispiel — oft als Anti-Example. "
        "Ziel: damit du im nächsten Sales-Pitch oder LinkedIn-Post sofort erkennst, was Substanz hat und was Bullshit ist.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.5 * cm))

    entries = [
        ("Agent",
         "Autonome KI, die selbständig komplexe Aufgaben für dich erledigt.",
         "Ein LLM mit Tool-Use und einer Schleife. Erledigt manchmal Aufgaben. Bricht oft ab. Braucht klare Specs.",
         "Cursor's Agent-Mode editiert Dateien — supervised, mit Approval-Schritten. Nicht 'autonom'."),
        ("AGI",
         "Künstliche Intelligenz auf menschlichem Niveau, kommt 2026/2027.",
         "Ein unscharfer Marketing-Begriff ohne wissenschaftliche Definition.",
         "Wenn jemand 'AGI ist nah' verkauft, frag: 'Definiert nach welcher Metrik?' — meist Stille."),
        ("AI-Agent",
         "Siehe Agent. Gerne mit 'autonom' und 'agentic' kombiniert.",
         "Marketing-Verdopplung. Sagt nichts mehr als 'Agent'.",
         "'Wir haben 50 AI-Agents im Einsatz' = wir haben 50 Prompt-Templates."),
        ("Anthropic",
         "Safety-fokussierte AI-Firma, Hersteller von Claude.",
         "AI-Lab gegründet 2021 von Ex-OpenAI-Researchers. Bekannt für Claude und Constitutional AI.",
         "Anthropic veröffentlicht Modelle wie Claude Sonnet 4.7. Sitz: San Francisco. Investoren u.a. Google."),
        ("Bias",
         "Vorurteil im Modell, das wir bekämpfen.",
         "Statistische Verzerrung der Trainingsdaten. Lässt sich reduzieren, nicht eliminieren.",
         "GPT-Modelle stereotypisierten Berufe (CEO=männlich). Mitigation: Diverse Trainingsdaten + RLHF."),
        ("Bullshit-Detektor",
         "Tool, das Fake-Inhalte erkennt.",
         "Ein heuristischer Filter mit Falsch-Positiven und Falsch-Negativen. Keine Wahrheitsmaschine.",
         "GPTZero erkennt manche AI-Texte. Andere überlistet. Niemals 100% verlässlich."),
        ("Chain-of-Thought",
         "Das Modell denkt nach wie ein Mensch.",
         "Prompting-Technik: Modell explizit auffordern, Zwischenschritte zu zeigen. Verbessert Reasoning bei manchen Tasks.",
         "Prompt: 'Denke Schritt für Schritt'. Funktioniert gut bei Mathe. Weniger bei kreativen Tasks."),
        ("Claude",
         "Der bessere ChatGPT.",
         "LLM-Familie von Anthropic. Aktuell: Sonnet 4.7, Opus 4.7. Stärken: Long Context, weniger Halluzinationen, Code-Tasks.",
         "Claude Sonnet 4.7 ist Default-Modell in Claude Code. Context-Window: 200k Token."),
        ("Context-Window",
         "Wie viel das Modell sich merkt.",
         "Maximale Tokenanzahl, die das Modell pro Request verarbeiten kann — Input + Output zusammen.",
         "Claude Sonnet 4.7: 200k Tokens (~150k Wörter). Heisst NICHT, dass es alles 'versteht'."),
        ("Embedding",
         "AI versteht Texte als Zahlen.",
         "Ein Vektor (Liste Zahlen), der semantische Ähnlichkeit kodiert. Basis für Search/Retrieval.",
         "Du erstellst Embeddings für deine Docs, speicherst sie in Pinecone/Qdrant, fragst per Vector-Search."),
        ("Few-Shot",
         "Du gibst dem Modell ein paar Beispiele und es lernt.",
         "Prompting-Technik: 2-5 Input/Output-Beispiele im Prompt einbetten. Verbessert Konsistenz.",
         "Wenn du JSON-Output willst: Zeig 3 Beispiele im Prompt. Funktioniert besser als nur 'Gib mir JSON'."),
        ("Fine-Tuning",
         "Du trainierst das AI auf deine Daten.",
         "Du passt Modellgewichte mit eigenen Daten an. Aufwändig, teuer, oft nicht nötig.",
         "Vor Fine-Tuning: Probier RAG. Fine-Tuning lohnt für: konsistente Formate, spezifische Klassifikation."),
        ("Function-Calling",
         "Das AI ruft selbständig Tools auf.",
         "Ein strukturiertes Output-Format, mit dem das Modell anzeigt, dass es ein Tool nutzen will. Du führst aus.",
         "Das Modell sagt: 'Call get_weather(city=\"Bern\")'. Dein Code führt die Funktion aus, gibt Ergebnis zurück."),
        ("GPT",
         "OpenAI's Modell. Best in class.",
         "Familie von LLMs (Generative Pretrained Transformer) von OpenAI. Aktuell GPT-5.",
         "GPT-4o ist anders als GPT-5. 'GPT' alleine ist ungenau. Modell und Version immer mit angeben."),
        ("Hallucination",
         "Das AI lügt manchmal.",
         "Plausibel klingende, aber faktisch falsche Outputs. Strukturelles Verhalten, nicht Bug.",
         "Frag ein LLM nach erfundenen Personen — es gibt dir Bio, Bücher, Quotes. Alles erfunden."),
        ("Inference",
         "Wenn das AI eine Antwort gibt.",
         "Der Prozess, mit dem ein trainiertes Modell Output erzeugt. Kostet Compute (GPU-Zeit).",
         "Jedes Token kostet $$. Inference-Cost = was Anthropic/OpenAI dir in Rechnung stellen."),
        ("LLM",
         "Eine sehr smarte AI.",
         "Large Language Model — neuronales Netz, trainiert auf Text, sagt das nächste Wort voraus.",
         "Claude, GPT, Gemini, Llama, Mistral sind alles LLMs. Kein einziges 'denkt' wirklich."),
        ("Marketing-Sprech",
         "Klarsprache.",
         "Worte ohne Substanz, die Kompetenz simulieren. Vermeide sie in deinen Texten.",
         "'Disruptive AI-powered synergy at scale' = 'wir benutzen ChatGPT'."),
        ("Model",
         "Die AI selbst.",
         "Eine spezifische trainierte Instanz mit Gewichten, Architektur und Capabilities.",
         "GPT-5, Claude Sonnet 4.7, Gemini 2.5 Pro sind verschiedene Models. Auch dasselbe LLM in verschiedenen Versionen."),
        ("Multimodal",
         "AI kann sehen und hören.",
         "Modell, das mehr als Text verarbeitet — auch Bilder, Audio, Video.",
         "Claude kann Bilder analysieren. GPT-4o kann Audio. Nicht jedes Modell jeder Hersteller-Familie."),
        ("OpenAI",
         "Erfinder der AI.",
         "AI-Firma, gegründet 2015. Hersteller von GPT und ChatGPT. Inzwischen profitorientiert.",
         "Sam Altman ist CEO. Microsoft ist grösster Investor. Konkurrenz zu Anthropic, Google, Meta."),
        ("Parameters",
         "Wie smart das Modell ist.",
         "Anzahl der trainierbaren Gewichte im Netzwerk. Korreliert NICHT 1:1 mit Qualität.",
         "70B Parameter heisst nicht automatisch besser als 7B. Architektur und Training-Daten entscheiden mehr."),
        ("Prompt",
         "Was du in den Chat schreibst.",
         "Der Input-Text an ein LLM. Klare Prompts = bessere Outputs.",
         "Ein Prompt ist eine Anweisung. Spezifisch ('Schreibe 3 Cold-Email-Opener für SaaS-Marketers'), nicht vage ('Schreib was')."),
        ("Prompt-Engineering",
         "Eine neue, hoch bezahlte Disziplin.",
         "Die Praxis, gute Prompts zu schreiben. Lernbar in 2-3 Wochen. Kein 6-stelliges Gehalt nötig.",
         "Promptengineering = klar denken + strukturieren. Keine eigene Wissenschaft."),
        ("RAG",
         "AI greift auf deine Daten zu.",
         "Retrieval-Augmented Generation: Vor LLM-Call relevante Docs aus Vector-DB abrufen, in Prompt einfügen.",
         "Du lädst Firmendokumente in Pinecone. User-Frage → Vector-Search → relevante Chunks → LLM antwortet faktentreu."),
        ("Reasoning",
         "Das AI denkt nach.",
         "Modell-Verhalten, bei dem Zwischenschritte sichtbar sind. Kein echtes 'Denken' im menschlichen Sinn.",
         "OpenAI o3 / Claude Sonnet 4.7 mit Thinking-Mode zeigen Reasoning-Steps. Nützlich. Kein Bewusstsein."),
        ("Sonnet",
         "Das mittlere Claude-Modell.",
         "Anthropic-Modellvariante zwischen Haiku (schnell, billig) und Opus (teuer, capable).",
         "Claude Sonnet 4.7: gutes Preis/Performance-Ratio für die meisten Use-Cases."),
        ("Token",
         "Ein Wort.",
         "Texteinheit für LLM. ~0.75 Wörter pro Token. Pricing wird in Tokens berechnet.",
         "1000 Tokens ≈ 750 Wörter. Claude Input: $3 / 1M Tokens. Rechnen, bevor du Volumen-Tasks startest."),
        ("Tool-Use",
         "Die AI nutzt Tools.",
         "LLM gibt strukturiertes Output an, dass es Tool nutzen will. Deine Code-Logik führt Tool aus.",
         "Claude sagt: 'search_web(\"DSGVO 2026\")'. Du führst Search aus, gibst Ergebnis zurück, Claude antwortet."),
        ("Transformer",
         "Die magische AI-Architektur.",
         "Neuronale-Netzwerk-Architektur, vorgestellt 2017 ('Attention Is All You Need'). Basis aller modernen LLMs.",
         "Alle relevanten LLMs sind Transformers. Stand-der-Technik seit 2018."),
        ("Zero-Shot",
         "AI macht es ohne Training.",
         "Prompting ohne Beispiele. Modell muss aus Anweisung allein erschliessen.",
         "Frag Claude 'Übersetze ins Französisch: Hallo Welt' — Zero-Shot. Funktioniert für simple Tasks gut."),
    ]

    for term, marketing, real, example in entries:
        block = []
        block.append(Paragraph(term, styles["H3Amber"]))
        block.append(Paragraph(f"<b>Marketing sagt:</b> {marketing}", styles["Body"]))
        block.append(Paragraph(f"<b>Tatsächlich heisst das:</b> {real}", styles["Body"]))
        block.append(Paragraph(f"<b>Beispiel:</b> <i>{example}</i>", styles["BodySmall"]))
        block.append(Spacer(1, 0.3 * cm))
        story.append(KeepTogether(block))

    # Forbidden phrases
    story.append(PageBreak())
    story.append(Paragraph("Diese Wörter benutzt aban news NIEMALS", styles["H1Amber"]))
    story.append(Paragraph(
        "Wenn wir das in einem Newsletter-Entwurf finden, fliegt es raus. Nicht weil die Begriffe immer falsch sind — "
        "sondern weil sie Substanz simulieren, wo keine ist.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.3 * cm))
    forbidden = [
        "Game-changer", "Revolutionär", "Bahnbrechend", "Disruptive",
        "Synergy", "Leverage (als Verb)", "Best-in-class", "Cutting-edge",
        "World-class", "State-of-the-art (ungeprüft)", "Next-level",
        "10x", "Skyrocketing", "Mind-blowing", "Game-changing",
        "AI-powered (ohne zu sagen wie)", "Smart (als Adjektiv ohne Spec)",
        "Effortless (oft eine Lüge)", "Seamless (selten wahr)",
        "Magic / Magisch", "Boost (ohne Zahl)", "Unlock (Floskel)",
        "Empowerment", "Holistic", "Strategic Imperative",
    ]
    for word in forbidden:
        story.append(Paragraph(f"&#9888;  <b>{word}</b>", styles["Body"]))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        "Wir benutzen stattdessen: konkrete Zahlen, klare Verben, normale Worte. "
        "Wenn etwas wirklich 'game-changing' ist — sag, was sich geändert hat. "
        "Wenn etwas 'AI-powered' ist — sag welches Modell, was es macht.",
        styles["ItalicMute"]
    ))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print(f"OK: anti-hype-glossar.pdf  ({len(entries)} Einträge)")


# ============================================================
# PDF 3: DSGVO-AI-Checkliste
# ============================================================
def build_pdf_dsgvo():
    styles = make_styles()
    doc = new_doc(
        "dsgvo-ki-checkliste.pdf",
        "DSGVO-AI-Checkliste für DACH-Solopreneure",
        "20 Punkte zur DSGVO-Konformität beim AI-Einsatz",
        "DSGVO, AI, KI, Compliance, DACH, Datenschutz, Solopreneur"
    )
    story = []
    cover_page(story, styles,
               "DSGVO-AI-Checkliste",
               "20 Punkte für DACH-Solopreneure")

    story.append(Paragraph("Vorbemerkung", styles["H1Amber"]))
    story.append(Paragraph(
        "Diese Checkliste ist eine Praxishilfe — keine Rechtsberatung. Sie deckt die häufigsten Stolpersteine "
        "beim AI-Einsatz für Solo-Selbständige in DE, AT und CH ab. "
        "Bei kritischen Punkten (Konzern-Anfragen, Behörden-Auskunft, Klagen): Anwalt einbeziehen.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.4 * cm))

    categories = [
        ("Subprocessor-Audit", [
            ("Liste aller AI-Anbieter, die du nutzt",
             "Spreadsheet: Tool-Name, Anbieter, Sitz, was sie verarbeiten.",
             "Vergessen: Browser-Plugins, IDE-Extensions, automatische Transkripte."),
            ("Auftragsverarbeitungsverträge (AVV/DPA) abgeschlossen",
             "Bei jedem Anbieter, der personenbezogene Daten verarbeitet, AVV abschliessen.",
             "OpenAI hat DPA-Template. Anthropic hat DPA. Beide MUSST du aktiv abschliessen."),
            ("US-Übermittlungen geprüft (EU-US Data Privacy Framework)",
             "Anbieter zertifiziert? Standardvertragsklauseln (SCC) im AVV?",
             "Nicht alle US-Anbieter sind DPF-zertifiziert. Liste prüfen auf dataprivacyframework.gov."),
            ("Subdienstleister deiner Subdienstleister bekannt",
             "Anbieter listet sub-processors. Du musst sie kennen (z.B. AWS, GCP).",
             "Übersehen: Anthropic nutzt AWS und GCP. Beides musst du in deinem Verzeichnis listen."),
        ]),
        ("Datenfluss", [
            ("Welche personenbezogenen Daten gehen an AI?",
             "Pro Tool dokumentieren: Kunden-Emails? Namen? Adressen? Gesundheitsdaten?",
             "Wenn du Kunden-Texte in ChatGPT pastest, gehen personenbezogene Daten an OpenAI."),
            ("Pseudonymisierung wo möglich",
             "Vor AI-Upload: Namen ersetzen durch [Kunde-1], Emails durch [Email-1] etc.",
             "Hier verlierst du wenig Qualität. Aber massive Reduktion des Risikos."),
            ("Sensitive Daten (Art. 9 DSGVO) NIEMALS ohne Einwilligung",
             "Gesundheit, Religion, politische Meinung, Sexualleben: separater Rechtsgrund nötig.",
             "Coaches: NIEMALS Therapie-Notizen in normale LLMs. Auch nicht 'anonymisiert'."),
            ("Datenfluss-Diagramm existiert",
             "Eine A4-Seite: Wo entstehen Daten → wo werden sie verarbeitet → wo gelöscht.",
             "Vorlage: draw.io oder Excalidraw. Behörde fragt im Ernstfall danach."),
        ]),
        ("Einwilligung", [
            ("Cookie-Banner DSGVO-konform",
             "Opt-in vor Tracking (nicht nur Banner anzeigen). Granular pro Kategorie. Ablehnen so einfach wie zustimmen.",
             "'OK'-Knopf riesig, 'Ablehnen' versteckt = Abmahnrisiko. CNIL-Bussgelder in FR sind hoch."),
            ("Datenschutzerklärung erwähnt AI-Verarbeitung",
             "Welche AI-Tools? Welche Daten? Warum? Rechtsgrund? Speicherdauer?",
             "Generische Texte ohne AI-Erwähnung sind veraltet. Spezifisch sein."),
            ("Newsletter-Einwilligung trennt Marketing von AI-Nutzung",
             "Wenn du Newsletter-Daten an AI gibst (z.B. für Personalisierung): separate Einwilligung.",
             "'Wir nutzen AI zur Personalisierung deines Newsletters' — als Checkbox + Erklärung."),
            ("Widerrufbarkeit der Einwilligung dokumentiert",
             "Wie kann jemand widerrufen? Klick im Footer reicht oft nicht. Email-Adresse + Self-Service.",
             "Wenn niemand jemals widerrufen hat: das ist verdächtig, nicht erfolgreich."),
        ]),
        ("Speicherdauer", [
            ("Pro Datenkategorie Speicherdauer festgelegt",
             "Newsletter-Subscriber: bis Widerruf. Kundendaten: 10 Jahre nach §147 AO. AI-Logs?",
             "AI-Anbieter speichern Logs meist 30 Tage. Frag, ob du das verkürzen kannst (Enterprise)."),
            ("Löschroutinen automatisiert oder dokumentiert",
             "Make/Zapier-Workflow oder Kalendererinnerung: einmal pro Monat Löschungen prüfen.",
             "Manuell vergessen ist Standardproblem. Automatisierung lohnt sich hier."),
            ("Backup-Strategie berücksichtigt Löschung",
             "Wenn du löschst, aber Backup behält: Verstoss. Backup-Rotation < 90 Tage hilft.",
             "Wer mit Cloud-Backups arbeitet: prüfen, wie Anbieter mit Löschanfragen umgeht."),
        ]),
        ("Auskunft", [
            ("Auskunftsanfrage-Prozess existiert",
             "Email an dich → wo greifst du nach Daten? Welche Tools, welche Logs, welche Backups?",
             "Frist: 30 Tage. Ohne Prozess wird das schnell stressig."),
            ("Berichtigung / Löschung umsetzbar",
             "Pro System dokumentiert: wo, wer, wie wird gelöscht / berichtigt.",
             "Daten in AI-Trainingsdaten: kannst du nicht löschen. Daher von vornherein nicht uploaden."),
            ("Datenportabilität (Art. 20) geklärt",
             "Auf Anfrage: maschinenlesbares Export-Format (CSV, JSON).",
             "Beehiiv exportiert CSV. Tally exportiert JSON. Notion exportiert HTML/CSV/JSON."),
        ]),
        ("Sicherheit", [
            ("API-Keys nicht im Code / Browser-Storage",
             "Secrets in Env-Vars, Vault, oder Cloud-Secret-Managern. Niemals committen.",
             ".env in .gitignore. Pre-commit-Hooks wie gitleaks finden vergessene Keys."),
            ("Zugriffsrechte minimal (Need-to-know)",
             "Wer hat Zugriff auf welche Daten? Solo = du. Aber Freelancer, VAs, Cloud-Backups?",
             "Wenn du eine VA einsetzt: AVV mit ihr. Read-only-Zugriff wo möglich."),
            ("Meldepflicht-Plan bei Datenpanne (72h)",
             "Bei DSGVO-Verstoss: 72h zur Meldung an Aufsichtsbehörde. Was machst du, wenn ein Laptop weg ist?",
             "Vorlage: Beim Schweiz (EDÖB) und DE-Aufsichtsbehörden online. Im Vorfeld lesen."),
        ]),
    ]

    item_n = 1
    for cat_name, items in categories:
        story.append(Paragraph(cat_name, styles["H1Amber"]))
        for what, how, mistake in items:
            block = []
            block.append(Paragraph(f"<b>&#9744; {item_n}. {what}</b>", styles["H2"]))
            block.append(Paragraph(f"<b>Wie:</b> {how}", styles["BodySmall"]))
            block.append(Paragraph(f"<b>Häufiger Fehler:</b> <i>{mistake}</i>", styles["BodySmall"]))
            block.append(Spacer(1, 0.25 * cm))
            story.append(KeepTogether(block))
            item_n += 1
        story.append(Spacer(1, 0.2 * cm))

    # Outro
    story.append(PageBreak())
    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph("Brauchst du Hilfe?", styles["H1Amber"]))
    story.append(Paragraph(
        "DSGVO-Compliance ist nicht kompliziert — aber lückenhaft kann teuer werden. "
        "Wenn dir bei einem dieser Punkte unklar ist, was du tun sollst: schreib mir.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("<b>aban news</b> — abannews.com", styles["H2"]))
    story.append(Paragraph(
        "<i>Diese Checkliste ist Praxishilfe, keine Rechtsberatung. "
        "Bei spezifischen Risiken: Datenschutzanwalt oder Datenschutzbeauftragten einbeziehen.</i>",
        styles["BodySmall"]
    ))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print(f"OK: dsgvo-ki-checkliste.pdf  ({item_n - 1} Punkte)")


# ============================================================
# PDF 4: AI-Tool-Stack 2026
# ============================================================
def build_pdf_toolstack():
    styles = make_styles()
    doc = new_doc(
        "ai-tool-stack-2026.pdf",
        "AI-Tool-Stack 2026 — was Aban täglich nutzt",
        "12 Tools mit Pricing, Use-Case, Alternative, Worth-it-Score",
        "AI, Tools, Stack, 2026, Solopreneur, Claude, Make"
    )
    story = []
    cover_page(story, styles,
               "AI-Tool-Stack 2026",
               "Was ich täglich nutze und was es kostet")

    story.append(Paragraph("Warum diese Liste", styles["H1Amber"]))
    story.append(Paragraph(
        "12 Tools, die ich täglich oder wöchentlich nutze, um aban news zu bauen — "
        "Newsletter, Landing-Pages, Compliance, Outreach. "
        "Pro Tool ein ehrlicher Worth-it-Score (1-10), eine Alternative, "
        "und was ich konkret damit tue (mit Zahlen wo möglich).",
        styles["Body"]
    ))
    story.append(Paragraph(
        "<i>Keine Affiliate-Links. Keine Sponsoring-Deals. Reines Erfahrungswissen.</i>",
        styles["BodySmall"]
    ))
    story.append(Spacer(1, 0.5 * cm))

    tools = [
        ("Claude Pro", "Anthropic", "$20/Monat",
         "LLM-Chat-Interface von Anthropic.",
         "Tägliche Recherche, Texte, Code-Reviews, Newsletter-Drafts. Im Schnitt 30-50 Chats/Tag.",
         "ChatGPT Plus ($20). Besser für Image-Generation, schlechter für lange Kontexte.",
         "9/10"),
        ("Claude Code", "Anthropic", "Über Claude Pro inkl.",
         "Claude im Terminal. Editiert Dateien, führt Code aus, baut Apps.",
         "Komplette aban news Pipeline gebaut. Diese PDFs generiert. Landing-Page deployed.",
         "Cursor ($20). Cursor stärker bei IDE-Integration; CC stärker bei Agenten-Workflows.",
         "10/10"),
        ("Granola", "Granola.ai", "$10/Monat",
         "AI-Meeting-Transkription mit Notes-Editing.",
         "Notizen aus Calls. Selten — ich habe wenige Calls. Aber wenn, dann Goldwert.",
         "Otter.ai ($17). Granola hat besseres Editing; Otter mehr Integrations.",
         "7/10"),
        ("Cap.so", "Cap.so", "$0 (Free) / $9 Pro",
         "Open-Source Loom-Alternative. Screen-Recording + Cloud-Hosting.",
         "Loom-Replacement für asynchrone Demos. 2-3 Recordings/Woche.",
         "Loom ($15). Loom mit besserem Editor; Cap ist privacy-friendly.",
         "8/10"),
        ("Make.com", "Make (Celonis)", "$0 (Free, 1000 Ops/Mt.)",
         "Workflow-Automation via No-Code.",
         "RSS → Claude → Gmail-Draft. Daily Newsletter-Pipeline. ~600 Ops/Monat.",
         "Zapier ($30/Mt.). Make viel günstiger; Zapier mehr Integrations.",
         "9/10"),
        ("eustella", "eustella.ai", "Beta (kostenlos)",
         "RSS-Aggregator mit AI-Filterung für Newsletter-Curation.",
         "Source-Filter für RSS-Feeds. Reduziert Noise um ~70%.",
         "Feedly Pro ($8). Feedly etablierter; eustella spezialisiert auf Newsletter.",
         "7/10"),
        ("Cal.com", "Cal.com", "$0 (Free) / $15 Pro",
         "Open-Source Calendly-Alternative.",
         "Booking-Page für Sponsor-Calls. Selten benutzt aber gut wenn.",
         "Calendly ($12). Cal.com privacy-besser; Calendly etablierter.",
         "8/10"),
        ("Notion", "Notion Labs", "$0 (Free) / $10 Plus",
         "Workspace für Notizen, Docs, Datenbanken.",
         "Newsletter-Backlog, Sponsor-CRM, Compliance-Checkliste. Single source of truth.",
         "Obsidian ($0). Obsidian für Personal Knowledge; Notion für strukturierte Daten.",
         "8/10"),
        ("Plausible", "Plausible Insights", "$9/Monat",
         "Privacy-friendly Web-Analytics, DSGVO-konform ohne Cookies.",
         "Traffic-Analyse für abannews.com. Keine Cookie-Banner nötig.",
         "GA4 (kostenlos). GA4 mehr Features aber DSGVO-Albtraum.",
         "9/10"),
        ("Tally", "Tally.so", "$0 (Free) / $24 Pro",
         "Typeform-Alternative für Forms.",
         "Newsletter-Signup-Form. DSGVO-Settings out-of-the-box.",
         "Typeform ($25). Tally günstiger, schnellere Forms.",
         "9/10"),
        ("Beehiiv", "Beehiiv", "$0 (Free, 2.5k Subs)",
         "Newsletter-Plattform.",
         "Newsletter-Versand, Subscriber-Management, Web-Archive.",
         "Substack ($0 + 10% rev share). Beehiiv keine Rev-Share, bessere Free-Tier.",
         "9/10"),
        ("GitHub Pages", "GitHub", "$0",
         "Static-Site-Hosting via Git-Push.",
         "abannews.com läuft hier. Push to main = deploy.",
         "Cloudflare Pages ($0). Cloudflare schneller; GitHub einfacher fürs Dev-Workflow.",
         "10/10"),
    ]

    for name, company, pricing, what, how, alt, score in tools:
        block = []
        block.append(Paragraph(f"&#9749; <b>{name}</b>  <font color='#6b7280' size='9'>— {company}  ·  {pricing}</font>", styles["H2"]))
        block.append(Paragraph(f"<b>Was es macht:</b> {what}", styles["Body"]))
        block.append(Paragraph(f"<b>Wofür ich es nutze:</b> {how}", styles["Body"]))
        block.append(Paragraph(f"<b>Alternative:</b> {alt}", styles["BodySmall"]))
        # Score-Badge
        block.append(Paragraph(f"<b>Worth-it-Score:</b> <font color='#d97706'><b>{score}</b></font>", styles["Body"]))
        block.append(Spacer(1, 0.3 * cm))
        story.append(KeepTogether(block))

    # Outro
    story.append(PageBreak())
    story.append(Paragraph("Worauf ich verzichte (und warum)", styles["H1Amber"]))
    story.append(Paragraph(
        "<b>Buffer / Hootsuite:</b> Ich poste manuell auf X/LinkedIn. Konsistenz statt Automation.<br/><br/>"
        "<b>Hubspot / Salesforce:</b> Notion + ein Sheet reicht für Solo-CRM.<br/><br/>"
        "<b>Mailchimp:</b> Beehiiv hat besseres Newsletter-DNA. Mailchimp ist Email-Marketing für Shops.<br/><br/>"
        "<b>Webflow / Framer:</b> Static-HTML deployed via GitHub Pages ist schneller, billiger, mein.<br/><br/>"
        "<b>Adobe-Suite:</b> Figma + Cap.so + Inline-SVGs reichen für meinen Output.<br/><br/>"
        "<b>Slack:</b> Ich bin solo. Tasks in Notion, Kommunikation in Email.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        "<b>Monatliche Kosten:</b> Claude Pro $20 + Granola $10 + Plausible $9 = $39/Monat Hard-Cost. "
        "Rest läuft auf Free-Tiers oder Self-Hosting.",
        styles["ItalicMute"]
    ))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print(f"OK: ai-tool-stack-2026.pdf  ({len(tools)} Tools)")


# ============================================================
# PDF 5: 5 Cold-Email-Templates
# ============================================================
def build_pdf_coldemails():
    styles = make_styles()
    doc = new_doc(
        "cold-email-templates.pdf",
        "5 Cold-Email-Templates für Solopreneure",
        "Direkt-respektvoll, keine Floskeln, mit Follow-up-Varianten",
        "Cold Email, Outreach, Templates, Solopreneur, DACH"
    )
    story = []
    cover_page(story, styles,
               "5 Cold-Email-Templates",
               "Direkt-respektvoll. Keine Floskeln.")

    story.append(Paragraph("Wie diese Templates funktionieren", styles["H1Amber"]))
    story.append(Paragraph(
        "Jedes Template hat: Use-Case, eine kurze Vor-Versand-Checkliste, Subject-Line (≤55 Zeichen), "
        "Email-Body mit <font color='#d97706'>[Platzhaltern]</font>, "
        "und zwei Follow-up-Varianten (Tag 7 + Tag 14). "
        "Anpassen ist erlaubt — kopieren-pasten ohne Personalisierung führt zu Spam-Klassifikation.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.4 * cm))

    templates = [
        {
            "use_case": "1. Sponsor-Pitch — Newsletter-Sponsoring anfragen",
            "checklist": [
                "Letzte 5 Ausgaben des Newsletters gelesen — du kennst Tonalität und Zielgruppe.",
                "Sponsor passt thematisch zu Newsletter (kein Mismatch).",
                "Du hast Pricing-Anker im Kopf — wirst nicht überrumpelt.",
                "Du nennst Subscriber-Zahl und Open-Rate ehrlich.",
                "Du schreibst an die Person, nicht eine info@-Adresse.",
            ],
            "subject": "Sponsoring-Anfrage für [Newsletter-Name]",
            "body": (
                "Hi [Vorname],<br/><br/>"
                "ich lese [Newsletter-Name] seit [Zeitraum] und das letzte Mal in Ausgabe vom [Datum], "
                "in der du über [konkretes Thema] geschrieben hast — das hat mich an meine eigene Arbeit erinnert.<br/><br/>"
                "Kurzform: ich betreibe [eigenes Angebot] für [Zielgruppe]. Eure Leser könnten "
                "echtes Interesse haben, weil [konkreter Grund].<br/><br/>"
                "Hättest du Interesse an einer Platzierung in einer kommenden Ausgabe? "
                "Mein Budget für eine erste Test-Platzierung liegt bei [Betrag €]. "
                "Wenn das in deine Range fällt, schick mir gern deine Specs.<br/><br/>"
                "Falls nicht der richtige Zeitpunkt: alles gut, ich abonniere weiter.<br/><br/>"
                "Beste Grüsse,<br/>"
                "[Vorname]"
            ),
            "fup7": "Hi [Vorname], kurze Nachfrage falls meine Mail von letzter Woche untergegangen ist. "
                    "Kein Druck — wenn es nicht passt, sag das gern direkt. Beste Grüsse, [Vorname]",
            "fup14": "Hi [Vorname], letzter Versuch. Ich verstehe wenn das Timing nicht passt. "
                    "Ich melde mich nochmal in [3 Monaten] — vielleicht passt es dann besser. "
                    "Beste Grüsse, [Vorname]",
        },
        {
            "use_case": "2. Newsletter-Swap — Cross-Promo anbieten",
            "checklist": [
                "Newsletter ähnlich gross (max. 3x Unterschied in Subs).",
                "Themen-Überschneidung relevant (>50% Audience-Overlap denkbar).",
                "Du hast vorbereitet, WAS genau du tauschen willst (Mention, Empfehlung, Swap).",
                "Du kennst die Tonalität — passt deine?",
                "Du schreibst an Autor:in persönlich, nicht an info@.",
            ],
            "subject": "Swap-Idee zwischen [Dein Newsletter] und [Ihrer]",
            "body": (
                "Hi [Vorname],<br/><br/>"
                "ich bin [Vorname] und schreibe [Dein Newsletter] (~[X] Subs, ~[Y]% Open-Rate, Thema: [Thema]).<br/><br/>"
                "Ich lese [Ihren Newsletter] seit einer Weile und glaube unsere Audiences überlappen "
                "stark bei [Thema]. Hättest du Interesse an einem Cross-Promo?<br/><br/>"
                "Mein Vorschlag: wir empfehlen uns gegenseitig in einer Ausgabe — kein gezwungener "
                "Werbeblock, sondern ehrliche Empfehlung im Stil deiner üblichen Edits. "
                "Wenn dir lieber ist, können wir auch nur Mention statt vollem Swap machen.<br/><br/>"
                "Klingt das interessant? Bin flexibel beim Timing.<br/><br/>"
                "Beste Grüsse,<br/>"
                "[Vorname]"
            ),
            "fup7": "Hi [Vorname], wollte nur kurz nachhören — vielleicht ist meine Mail von "
                    "letzter Woche untergegangen. Falls Swap-Idee gerade nicht passt, kein Problem. "
                    "Beste Grüsse, [Vorname]",
            "fup14": "Hi [Vorname], ich melde mich ein letztes Mal. Wenn du in den nächsten "
                    "Wochen Lust auf Cross-Promo hast — sag Bescheid. Ansonsten: weiterhin "
                    "gerne dein Subscriber. Beste Grüsse, [Vorname]",
        },
        {
            "use_case": "3. Podcast-Pitch — Du als Gast",
            "checklist": [
                "Letzte 3 Folgen gehört — du kennst Themen und Format.",
                "Du hast eine konkrete Episode-Idee, die zur Show passt.",
                "Deine Expertise ist relevant und belegbar (Erfahrung, Projekt, Daten).",
                "Du erwähnst keinen generischen Pitch wie 'I'd love to share my expertise'.",
                "Du machst es Host:in einfach: 3 Themenoptionen, klare Bio.",
            ],
            "subject": "Möglicher Gast für [Podcast-Name]",
            "body": (
                "Hi [Vorname],<br/><br/>"
                "ich höre [Podcast-Name] regelmässig. Deine Folge mit [vorheriger Gast] über "
                "[konkretes Thema] hat mich besonders interessiert.<br/><br/>"
                "Kurz zu mir: ich bin [Vorname] und arbeite seit [Zeitraum] an [konkrete Domain]. "
                "Konkrete Erfahrungen, über die ich gerne sprechen würde:<br/>"
                "1) [Spezifisches Thema 1] — z.B. [Mini-Insight]<br/>"
                "2) [Spezifisches Thema 2] — z.B. [Mini-Insight]<br/>"
                "3) [Spezifisches Thema 3] — z.B. [Mini-Insight]<br/><br/>"
                "Bin flexibel beim Timing und kann mich gut an dein Format anpassen. "
                "Falls das nicht passt: kein Problem, ich höre weiter zu.<br/><br/>"
                "Beste Grüsse,<br/>"
                "[Vorname]"
            ),
            "fup7": "Hi [Vorname], kurz noch eine Erinnerung an meine Mail von letzter Woche. "
                    "Falls die Themen nicht passen, gerne ehrliches Feedback — ich pitche andere "
                    "Shows. Beste Grüsse, [Vorname]",
            "fup14": "Hi [Vorname], ich nehme an, das Timing passt gerade nicht. "
                    "Wenn sich das ändert, melde dich gern. Höre weiter zu. Beste Grüsse, [Vorname]",
        },
        {
            "use_case": "4. Kunden-Akquise — kalte Anfrage für dein Angebot",
            "checklist": [
                "Person ist tatsächlich Entscheider für dein Angebot.",
                "Du hast 2 Min recherchiert (LinkedIn, Webseite, jüngster Post).",
                "Dein Bezug zum Pain-Point ist konkret, nicht generisch.",
                "Du verkaufst nichts in der ersten Mail — du fragst.",
                "Maximal 100 Wörter Body.",
            ],
            "subject": "[Konkrete Beobachtung über ihre Firma]",
            "body": (
                "Hi [Vorname],<br/><br/>"
                "ich habe auf [LinkedIn/Webseite/Artikel] gesehen, dass [konkrete Beobachtung — "
                "neuer Hire, neuer Service, Wachstum, Statement]. Gratuliere.<br/><br/>"
                "Eine Frage: wie löst ihr aktuell [konkretes Problem, das du löst]?<br/><br/>"
                "Hintergrund — ich helfe [ähnliche Firmen] bei genau dem. Wenn ihr da gerade "
                "Optimierungsbedarf seht: würde gerne 15 Min hören, was ihr versucht habt.<br/><br/>"
                "Falls nicht relevant: kein Problem, danke fürs Lesen.<br/><br/>"
                "Beste Grüsse,<br/>"
                "[Vorname]"
            ),
            "fup7": "Hi [Vorname], möglicherweise war meine Mail letzte Woche im Spam. "
                    "Falls das Thema gerade nicht prio ist: gerne kurz Bescheid sagen. "
                    "Beste Grüsse, [Vorname]",
            "fup14": "Hi [Vorname], letzter Touchpoint von mir. Wenn das Thema in 6 Monaten "
                    "wieder aufkommt — gern melden. Bis dahin: viel Erfolg. Beste Grüsse, [Vorname]",
        },
        {
            "use_case": "5. Re-Engagement — alten Kontakt wieder aktivieren",
            "checklist": [
                "Letzter Kontakt > 3 Monate her.",
                "Du hast einen echten Aufhänger (neue Entwicklung bei dir oder ihnen).",
                "Du startest nicht mit 'sorry I haven't reached out'.",
                "Du fragst, wie es ihnen geht — nicht nur, ob sie kaufen wollen.",
                "Kein Druck im CTA — offene Frage funktioniert besser.",
            ],
            "subject": "Hattest du das gesehen?",
            "body": (
                "Hi [Vorname],<br/><br/>"
                "wir hatten zuletzt [Datum/Anlass] gesprochen. Damals ging es um [Kontext].<br/><br/>"
                "Wollte mich kurz melden, weil [aktueller Aufhänger — Artikel, Tool, Insight, "
                "deine Entwicklung]. Hat mich an unser Gespräch erinnert.<br/><br/>"
                "Wie steht es bei euch mit [Thema von damals]? Bin neugierig, ob ihr das "
                "weiterverfolgt habt.<br/><br/>"
                "Falls Kaffee/Call mal Sinn macht: jederzeit gerne.<br/><br/>"
                "Beste Grüsse,<br/>"
                "[Vorname]"
            ),
            "fup7": "Hi [Vorname], kurz nachgefragt — falls die Mail letzte Woche untergegangen ist. "
                    "Beste Grüsse, [Vorname]",
            "fup14": "Hi [Vorname], wenn der Zeitpunkt gerade nicht passt: alles gut. "
                    "Ich bleibe in Reichweite. Beste Grüsse, [Vorname]",
        },
    ]

    for tpl in templates:
        story.append(Paragraph(tpl["use_case"], styles["H1Amber"]))
        story.append(Paragraph("<b>Vor-Versand-Checkliste:</b>", styles["H2"]))
        for c in tpl["checklist"]:
            story.append(Paragraph(f"&#9744;  {c}", styles["BodySmall"]))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(f"<b>Subject-Line:</b> <font color='#d97706'>{tpl['subject']}</font>", styles["Body"]))
        story.append(Paragraph("<b>Email-Body:</b>", styles["H2"]))
        story.append(Paragraph(tpl["body"], styles["CodeBox"]))
        story.append(Paragraph("<b>Follow-up Tag 7:</b>", styles["H3Amber"]))
        story.append(Paragraph(tpl["fup7"], styles["CodeBox"]))
        story.append(Paragraph("<b>Follow-up Tag 14:</b>", styles["H3Amber"]))
        story.append(Paragraph(tpl["fup14"], styles["CodeBox"]))
        story.append(PageBreak())

    # Outro
    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph("Wichtigste Regel", styles["H1Amber"]))
    story.append(Paragraph(
        "Versende kein einziges Template ohne Personalisierung. Cold-Email "
        "funktioniert nicht, weil dein Pitch gut ist — sondern weil "
        "Empfänger:innen merken, dass du sie wahrnimmst.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("<b>aban news</b> — abannews.com", styles["H2"]))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print(f"OK: cold-email-templates.pdf  ({len(templates)} Templates)")


# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    build_pdf_prompts()
    build_pdf_glossar()
    build_pdf_dsgvo()
    build_pdf_toolstack()
    build_pdf_coldemails()
    print("\nDONE — alle 5 PDFs in downloads/")
    # Sizes
    for f in os.listdir(OUT_DIR):
        if f.endswith(".pdf"):
            size_kb = os.path.getsize(os.path.join(OUT_DIR, f)) / 1024
            print(f"  {f}  ({size_kb:.1f} KB)")
