#!/usr/bin/env python3
"""Lead-Magnet: Finanz-Spickzettel für Selbstständige (DACH).

Erzeugt downloads/finanz-spickzettel.pdf — eine kompakte 1-Blick-Übersicht der
6 Finanz-Grundlagen plus Richtwerte und der „Reihenfolge bei 0 Einnahmen".
Bewusst DACH-allgemein gehalten (Leserschaft DE/AT/CH); länderabhängige Sätze
sind als Richtwerte markiert, keine Steuerberatung.

Nutzt die vorhandenen reportlab-Helfer aus generate_pdfs.py (DRY).
Bauen:  pip install reportlab && python3 generate_finanz_spickzettel.py
"""

from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors

from generate_pdfs import (make_styles, new_doc, cover_page, footer_canvas,
                           AMBER, DARK, CREAM, MID_GRAY)


def p(story, styles, text, style="Body"):
    story.append(Paragraph(text, styles[style]))


def rule_table(styles, rows):
    """Zwei-Spalten-Richtwert-Tabelle (Begriff | Richtwert)."""
    data = [[Paragraph(f"<b>{a}</b>", styles["Body"]), Paragraph(b, styles["Body"])]
            for a, b in rows]
    t = Table(data, colWidths=[6 * cm, 11 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.5, AMBER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def build():
    styles = make_styles()
    doc = new_doc("finanz-spickzettel.pdf",
                  title="Finanz-Spickzettel für Selbstständige",
                  subject="Die 6 Finanz-Grundlagen für Selbstständige (DACH) — kompakt.",
                  keywords="Finanzen, Selbstständige, Stundensatz, Steuer-Rücklage, Cashflow, DACH")
    story = []
    cover_page(story, styles,
               "Finanz-Spickzettel",
               "Die 6 Grundlagen für Selbstständige — auf einen Blick",
               "Stand: 2026 · DACH")

    p(story, styles, "Die 6 Finanz-Grundlagen", "H1Amber")
    p(story, styles, "Du musst kein Finanzprofi werden. Diese sechs Dinge reichen, damit am "
      "Monatsende genug übrig bleibt. Ehrlich, ohne Hype.", "Body")

    skills = [
        ("1. Preis richtig kalkulieren",
         "Nicht Wunschgehalt ÷ 160 h. Nur 4–6 Stunden pro Tag sind verrechenbar. Rechne "
         "rückwärts: Ziel-Netto + Steuern + Betriebskosten ÷ realistisch fakturierbare Stunden."),
        ("2. Steuern sofort zurücklegen",
         "Von <b>jeder</b> Einnahme am Tag des Eingangs einen festen Anteil auf ein getrenntes "
         "Konto. Richtwert grob 30–40 % (länderabhängig). Dann erschlägt dich keine Nachzahlung."),
        ("3. Geschäft und Privat trennen",
         "Eigenes Geschäftskonto. Zahl dir selbst ein festes Gehalt aufs Privatkonto. "
         "Macht Buchhaltung, Steuer und Übersicht deutlich einfacher."),
        ("4. Rechnungen &amp; Cashflow steuern",
         "Gewinn auf dem Papier zahlt keine Miete. Rechnung sofort raus, klares Zahlungsziel, "
         "freundliche Erinnerung bei Verzug, bei großen Projekten Anzahlung."),
        ("5. Puffer aufbauen",
         "3–6 Monate Fixkosten auf einem getrennten Konto. Das ist deine Ruhe — und nimmt "
         "Druck aus jeder Preisverhandlung. In der Schweiz besonders wichtig: keine ALV."),
        ("6. Früh an Vorsorge denken",
         "Niemand sorgt automatisch für dich vor. Früh + regelmäßig schlägt spät + viel. "
         "Kleiner automatischer Dauerauftrag genügt zum Start; Beratung: lieber Honorar als Provision."),
    ]
    for title, body in skills:
        p(story, styles, title, "H3Amber")
        p(story, styles, body, "Body")

    story.append(Spacer(1, 0.4 * cm))
    p(story, styles, "Richtwerte zum Merken", "H2")
    story.append(rule_table(styles, [
        ("Steuer-Rücklage", "grob 30–40 % je Einnahme (DE/AT); CH oft etwas weniger — mit Treuhänder klären"),
        ("Verrechenbare Zeit", "4–6 h pro Arbeitstag, nicht 8"),
        ("Notfall-Puffer", "3–6 Monate Fixkosten, getrenntes Konto"),
        ("MwSt-Grenze (CH)", "Pflicht erst ab CHF 100'000 Jahresumsatz"),
        ("Konten", "mindestens 3: Privat · Geschäft · Rücklage"),
    ]))

    story.append(Spacer(1, 0.4 * cm))
    p(story, styles, "Die Reihenfolge bei 0 Einnahmen", "H2")
    p(story, styles, "1. Getrennte Konten (kostet nichts) &nbsp;→&nbsp; 2. Steuer-Rücklage "
      "&nbsp;→&nbsp; 3. Preis korrigieren &nbsp;→&nbsp; 4. Puffer &nbsp;→&nbsp; 5. Vorsorge.",
      "CodeBox")

    story.append(Spacer(1, 0.5 * cm))
    p(story, styles, "Rechne deine Zahlen aus", "H2")
    p(story, styles, "Stundensatz, Steuer-Rücklage und Puffer kostenlos im Browser ausrechnen "
      "(kein Tracking): <b>abannews.com/finanz-rechner</b>", "Body")
    p(story, styles, "Mehr Hintergrund: abannews.com/finanz-skills", "BodySmall")

    story.append(Spacer(1, 0.6 * cm))
    p(story, styles, "Dieser Spickzettel ist allgemeine Orientierung, keine Steuer-, Rechts- oder "
      "Anlageberatung. Sätze unterscheiden sich nach Land (DE/AT/CH) und Situation — kläre "
      "konkrete Fragen mit einem Steuerberater bzw. Treuhänder. © 2026 aban news, abannews.com.",
      "ItalicMute")

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer_canvas)
    print("OK -> downloads/finanz-spickzettel.pdf")


if __name__ == "__main__":
    build()
