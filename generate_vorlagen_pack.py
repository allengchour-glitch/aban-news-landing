#!/usr/bin/env python3
"""
generate_vorlagen_pack.py — erzeugt das **Profi-Vorlagen-Pack** (Geschäftsdokumente
für Selbstständige im DACH-Raum) als PDF, plus eine kostenlose Leseprobe.

Ausgabe:
  downloads/vorlagen-pack.pdf          (vollständig — bezahlt, git-ignored)
  downloads/vorlagen-pack-sample.pdf   (Leseprobe — committet)

Selbst gesetzt mit reportlab (kein Stock, keine externen Fonts). Idempotent.
Aban-Voice: ehrlich, praktisch, anti-hype. KEINE Rechts-/Steuerberatung — Hinweis im Pack.

Run:  python3 generate_vorlagen_pack.py        (pip install reportlab)
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak)

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "downloads")

AMBER = colors.HexColor("#b45309")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#d8cfc0")
CREAM = colors.HexColor("#fef3c7")


def styles():
    ss = getSampleStyleSheet()
    s = {}
    s["h1"] = ParagraphStyle("h1", parent=ss["Title"], textColor=INK, fontSize=26,
                             leading=30, spaceAfter=6)
    s["h2"] = ParagraphStyle("h2", parent=ss["Heading2"], textColor=AMBER, fontSize=16,
                             leading=20, spaceBefore=4, spaceAfter=8)
    s["lead"] = ParagraphStyle("lead", parent=ss["Normal"], textColor=INK, fontSize=11,
                               leading=16, spaceAfter=6)
    s["body"] = ParagraphStyle("body", parent=ss["Normal"], textColor=INK, fontSize=10,
                               leading=15, spaceAfter=4)
    s["small"] = ParagraphStyle("small", parent=ss["Normal"], textColor=MUTED, fontSize=8.5,
                                leading=12)
    s["ph"] = ParagraphStyle("ph", parent=ss["Normal"], textColor=INK, fontSize=10,
                             leading=15, spaceAfter=2)
    return s


# ── Inhalt: jede Vorlage = (Titel, Intro, [Felder/Bloecke]) ───────────────────
# Block-Typen: ("p", text) Absatz · ("f", label, platzhalter) Feldzeile ·
#              ("table", [[..]]) · ("note", text) Hinweis · ("space", mm)

def tpl_angebot():
    return ("Angebot / Offerte",
            "Für ein verbindliches Angebot an Kund:innen. Platzhalter in [eckigen Klammern] ersetzen.",
            [("f", "Von", "[Dein Name / Firma, Adresse, Steuer-/USt-IdNr]"),
             ("f", "An", "[Kunde, Ansprechperson, Adresse]"),
             ("f", "Angebotsnummer", "[2026-A-001]"),
             ("f", "Datum / gültig bis", "[TT.MM.JJJJ] / [TT.MM.JJJJ]"),
             ("p", "<b>Betreff:</b> Angebot für [Projekt / Leistung]"),
             ("p", "Sehr geehrte [Anrede], gern unterbreite ich Ihnen folgendes Angebot:"),
             ("table", [["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Summe"],
                        ["1", "[Leistung 1]", "[1]", "[0.00]", "[0.00]"],
                        ["2", "[Leistung 2]", "[1]", "[0.00]", "[0.00]"],
                        ["", "", "", "Netto", "[0.00]"],
                        ["", "", "", "MwSt [8.1] %", "[0.00]"],
                        ["", "", "", "Gesamt", "[0.00]"]]),
             ("p", "<b>Leistungszeitraum:</b> [Zeitraum] · <b>Zahlungsziel:</b> [30 Tage]"),
             ("p", "Dieses Angebot ist freibleibend und gültig bis [Datum]. Bei Zusage genügt eine kurze Bestätigung per E-Mail."),
             ("p", "Mit freundlichen Grüßen<br/>[Name]")])


def tpl_auftrag():
    return ("Auftragsbestätigung",
            "Bestätigt einen erteilten Auftrag schriftlich — schützt beide Seiten.",
            [("f", "Von / An", "[Du] / [Kunde]"),
             ("f", "Auftragsnummer / Datum", "[2026-O-001] / [TT.MM.JJJJ]"),
             ("p", "Vielen Dank für Ihren Auftrag. Hiermit bestätige ich die Beauftragung wie folgt:"),
             ("table", [["Leistung", "Umfang", "Preis"],
                        ["[Leistung]", "[Beschreibung / Umfang]", "[0.00]"]]),
             ("f", "Liefer-/Fertigstellungstermin", "[Datum]"),
             ("f", "Zahlungsbedingungen", "[z. B. 50 % Anzahlung, Rest nach Lieferung]"),
             ("p", "Sollten Angaben nicht zutreffen, bitte innert 3 Tagen melden. Andernfalls gilt der Auftrag als bestätigt."),
             ("p", "Mit freundlichen Grüßen<br/>[Name]")])


def tpl_rechnung():
    return ("Rechnung",
            "Druckfertige Rechnungs-Vorlage. Tipp: die Live-Version gibt es gratis auf abannews.com/rechnung.",
            [("f", "Von", "[Name, Adresse, Steuer-/USt-IdNr, Kontakt]"),
             ("f", "An", "[Kunde, Adresse]"),
             ("f", "Rechnungsnummer / Datum", "[2026-001] / [TT.MM.JJJJ]"),
             ("f", "Leistungszeitraum", "[Monat / Zeitraum]"),
             ("table", [["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Summe"],
                        ["1", "[Leistung]", "[1]", "[0.00]", "[0.00]"],
                        ["", "", "", "Netto", "[0.00]"],
                        ["", "", "", "MwSt [8.1] %", "[0.00]"],
                        ["", "", "", "Gesamtbetrag", "[0.00]"]]),
             ("p", "<b>Zahlbar bis [Datum]</b> auf: IBAN [CH.. / DE..], Bank [Name]."),
             ("note", "Kleinunternehmer? Statt MwSt-Zeile: „Gemäß §19 UStG wird keine Umsatzsteuer berechnet.“")])


def tpl_mahnung():
    return ("Zahlungserinnerung & Mahnung",
            "Freundliche Erinnerung (Stufe 1) und bestimmtere Mahnung (Stufe 2) auf einer Seite.",
            [("p", "<b>Stufe 1 — Zahlungserinnerung</b>"),
             ("p", "Sehr geehrte [Anrede], sicher ist es nur entgangen: Die Rechnung [Nr.] vom [Datum] über [Betrag] ist seit [Datum] offen. Bitte gleichen Sie den Betrag bis [neues Datum] aus. Falls bereits geschehen, betrachten Sie dieses Schreiben als gegenstandslos."),
             ("space", 6),
             ("p", "<b>Stufe 2 — Mahnung</b>"),
             ("p", "Trotz Erinnerung ist die Rechnung [Nr.] über [Betrag] weiterhin offen. Ich bitte um Zahlung bis spätestens [Datum]. Nach Fristablauf behalte ich mir Mahngebühren und Verzugszinsen vor."),
             ("f", "Offener Betrag / Frist", "[0.00] / [TT.MM.JJJJ]"),
             ("p", "Mit freundlichen Grüßen<br/>[Name]")])


def tpl_lieferschein():
    return ("Lieferschein / Leistungsnachweis",
            "Dokumentiert gelieferte Ware oder erbrachte Leistung — ohne Preise.",
            [("f", "Von / An", "[Du] / [Kunde]"),
             ("f", "Lieferschein-Nr. / Datum", "[2026-L-001] / [TT.MM.JJJJ]"),
             ("table", [["Pos.", "Beschreibung", "Menge", "Erledigt am"],
                        ["1", "[Position]", "[1]", "[TT.MM.]"],
                        ["2", "[Position]", "[1]", "[TT.MM.]"]]),
             ("f", "Empfang bestätigt (Ort, Datum, Unterschrift)", "______________________")])


def tpl_stundenzettel():
    return ("Stundenzettel",
            "Für Abrechnung nach Aufwand — saubere Basis für die Rechnung.",
            [("f", "Kunde / Projekt / Monat", "[Kunde] / [Projekt] / [Monat]"),
             ("table", [["Datum", "Tätigkeit", "Von–Bis", "Stunden"],
                        ["[TT.MM.]", "[Tätigkeit]", "[09:00–12:00]", "[3.0]"],
                        ["[TT.MM.]", "[Tätigkeit]", "[13:00–17:00]", "[4.0]"],
                        ["", "", "Summe", "[0.0]"]]),
             ("f", "Stundensatz / Betrag", "[0.00] / [0.00]")])


def cheatsheet():
    return ("Pflichtangaben & Tipps",
            "Was auf eine Rechnung gehört — und ein paar Fallen.",
            [("p", "<b>Pflichtangaben einer Rechnung</b> (DE §14 UStG; AT/CH sinngemäß):"),
             ("p", "• voller Name + Anschrift von dir und Kund:in<br/>"
                   "• deine Steuernummer oder USt-IdNr<br/>"
                   "• Ausstellungsdatum + fortlaufende, einmalige Rechnungsnummer<br/>"
                   "• Menge und Art der Leistung<br/>"
                   "• Zeitpunkt/Zeitraum der Leistung<br/>"
                   "• Entgelt, aufgeschlüsselt nach Steuersätzen<br/>"
                   "• Steuersatz + -betrag — oder Hinweis auf Steuerbefreiung"),
             ("p", "<b>Kleinunternehmer:</b> keine MwSt ausweisen, dafür Hinweis „Gemäß §19 UStG wird keine Umsatzsteuer berechnet.“"),
             ("p", "<b>Tipps:</b> Rechnungsnummern lückenlos fortlaufend · Rechnungen 10 Jahre aufbewahren · "
                   "Zahlungsziel konkret datieren (nicht „bald“) · bei Auslandskunden Reverse-Charge prüfen."),
             ("note", "Das ist eine praktische Orientierung, keine Rechts- oder Steuerberatung. "
                      "Im Zweifel kurz mit Steuerberatung gegenprüfen.")])


FULL = [tpl_angebot, tpl_auftrag, tpl_rechnung, tpl_mahnung, tpl_lieferschein,
        tpl_stundenzettel, cheatsheet]
SAMPLE = [tpl_angebot, cheatsheet]  # kostenlose Leseprobe


def render_blocks(blocks, s):
    flow = []
    for b in blocks:
        t = b[0]
        if t == "p":
            flow.append(Paragraph(b[1], s["body"]))
        elif t == "f":
            flow.append(Paragraph('<b>%s:</b> %s' % (b[1], b[2]), s["ph"]))
        elif t == "note":
            tbl = Table([[Paragraph(b[1], s["small"])]], colWidths=[165 * mm])
            tbl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CREAM),
                                     ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                                     ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                     ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                                     ("TOPPADDING", (0, 0), (-1, -1), 6),
                                     ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
            flow.append(Spacer(1, 4))
            flow.append(tbl)
        elif t == "space":
            flow.append(Spacer(1, b[1]))
        elif t == "table":
            data = [[Paragraph(str(c), s["small"]) for c in row] for row in b[1]]
            ncol = len(b[1][0])
            tbl = Table(data, colWidths=[165 * mm / ncol] * ncol)
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
            flow.append(Spacer(1, 6))
            flow.append(tbl)
    return flow


def cover(s, title, sub):
    flow = [Spacer(1, 40 * mm),
            Paragraph("aban news", s["h2"]),
            Paragraph(title, s["h1"]),
            Spacer(1, 4),
            Paragraph(sub, s["lead"]),
            Spacer(1, 10 * mm)]
    return flow


def build(templates, path, title, sub):
    s = styles()
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm,
                            topMargin=20 * mm, bottomMargin=18 * mm,
                            title=title, author="aban news")
    flow = cover(s, title, sub)
    flow.append(Paragraph("Enthalten:", s["body"]))
    for fn in templates:
        flow.append(Paragraph("• " + fn()[0], s["body"]))
    flow.append(PageBreak())
    for i, fn in enumerate(templates):
        t, intro, blocks = fn()
        flow.append(Paragraph(t, s["h2"]))
        flow.append(Paragraph(intro, s["small"]))
        flow.append(Spacer(1, 6))
        flow += render_blocks(blocks, s)
        if i < len(templates) - 1:
            flow.append(PageBreak())
    doc.build(flow)
    print("✓", os.path.relpath(path, ROOT))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build(FULL, os.path.join(OUT_DIR, "vorlagen-pack.pdf"),
          "Profi-Vorlagen-Pack",
          "7 fertige Geschäftsdokumente für Selbstständige: Angebot, Auftragsbestätigung, "
          "Rechnung, Mahnung, Lieferschein, Stundenzettel — plus Pflichtangaben-Spickzettel. "
          "Platzhalter ausfüllen, fertig.")
    build(SAMPLE, os.path.join(OUT_DIR, "vorlagen-pack-sample.pdf"),
          "Profi-Vorlagen-Pack — Leseprobe",
          "Zwei Vorlagen aus dem Pack zum Reinschauen: Angebot + Pflichtangaben-Spickzettel.")


if __name__ == "__main__":
    main()
