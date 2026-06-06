#!/usr/bin/env python3
"""Erzeugt das Anmelde-Geschenk: downloads/10-ki-prompts.pdf
10 erprobte, ehrliche KI-Prompts für DACH-Profis. Reine reportlab, keine Fake-Inhalte.
Aufruf: python3 automation/generate_prompts_pdf.py
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, HRFlowable)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUT = Path(__file__).resolve().parent.parent / "downloads" / "10-ki-prompts.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

AMBER = colors.HexColor("#b45309")
INK = colors.HexColor("#1f2937")
MUT = colors.HexColor("#6b7280")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], textColor=INK, fontSize=22, spaceAfter=4, alignment=0)
SUB = ParagraphStyle("SUB", parent=ss["Normal"], textColor=MUT, fontSize=10.5, spaceAfter=14)
PT = ParagraphStyle("PT", parent=ss["Heading2"], textColor=AMBER, fontSize=12.5, spaceBefore=12, spaceAfter=3)
PROMPT = ParagraphStyle("PROMPT", parent=ss["Normal"], textColor=INK, fontSize=10.5, leading=15,
                        backColor=colors.HexColor("#fff7ec"), borderColor=colors.HexColor("#f3d8ab"),
                        borderWidth=0.6, borderPadding=7, spaceAfter=4)
USE = ParagraphStyle("USE", parent=ss["Normal"], textColor=MUT, fontSize=9, leading=12, spaceAfter=6)
FOOT = ParagraphStyle("FOOT", parent=ss["Normal"], textColor=MUT, fontSize=9, alignment=1)

prompts = [
 ("1 · Angebots-Mail in deiner Stimme",
  "Du bist mein Vertriebsassistent. Schreib eine kurze Angebots-Mail (max. 120 Wörter, du-Form, sachlich, kein Marketing-Sprech). Kontext: [Kunde, Anlass, was angeboten wird]. Mengen und Preise lasse ich frei — setze [Platzhalter].",
  "Mengen/Preise immer selbst einsetzen und prüfen — die KI kalkuliert nicht."),
 ("2 · Kalte Mail entschärfen",
  "Hier ist mein Entwurf für eine Erstansprache. Mach ihn konkreter und weniger generisch: ein klarer Aufhänger, ein konkreter Nutzen, eine einfache Frage am Ende. Keine Floskeln. [Entwurf einfügen]",
  "Funktioniert auch für LinkedIn-Nachrichten."),
 ("3 · Meeting-Notizen sortieren",
  "Fass diese Notizen in drei Blöcken zusammen: 1) Entscheidungen, 2) offene Punkte, 3) To-dos mit Verantwortlichem. Kurz, keine Floskeln. [Notizen einfügen]",
  "Keine echten Personennamen in Gratis-Tools — Initialen reichen."),
 ("4 · Online-Bewertung beantworten",
  "Formuliere eine sachliche, freundliche Antwort auf diese Bewertung. Kein Rechtfertigen, kein Streit, biete eine Lösung an, max. 80 Wörter. [Bewertung einfügen]",
  "Drüberlesen, zu deiner Stimme machen, selbst posten."),
 ("5 · Text entbuzzworden (Klartext)",
  "Schreib diesen Text so um, dass ein vielbeschäftigter Mensch ihn in 20 Sekunden versteht. Streiche Buzzwords und Füllwörter, kurze Sätze, konkret. [Text einfügen]",
  "Top für Website-Texte und Angebote."),
 ("6 · Social-Post aus einem Fachartikel",
  "Mach aus diesem Artikel einen LinkedIn-Post: ein Gedanke, 3–5 kurze Absätze, ein konkreter Tipp, kein Hype, eine Frage am Ende. [Artikel/Link-Inhalt einfügen]",
  "Erst Mehrwert, dann erst dezent dein Link."),
 ("7 · E-Mail kürzen und höflicher machen",
  "Kürze diese E-Mail auf die Hälfte, ohne dass sie unhöflich wirkt. Klare Bitte am Anfang, Details danach. [E-Mail einfügen]",
  "Spart dem Empfänger Zeit — und dir Rückfragen."),
 ("8 · Stellenanzeige entwerfen",
  "Entwirf eine ehrliche Stellenanzeige für [Rolle]: was die Person wirklich macht, was wir bieten, wer passt. Keine Übertreibungen, du-Form. Aufgaben als Stichpunkte.",
  "Ehrliche Anzeigen ziehen passendere Bewerbungen an."),
 ("9 · Freundliche Zahlungserinnerung",
  "Schreib eine freundliche, bestimmte Zahlungserinnerung. Sachlich, kein Vorwurf, klare Frist und Betrag als [Platzhalter]. Max. 90 Wörter.",
  "Für die zweite Mahnung den Ton eine Stufe verbindlicher."),
 ("10 · Woche priorisieren",
  "Hier sind meine Aufgaben für die Woche. Gruppiere sie nach 1) wichtig+dringend, 2) wichtig, 3) kann warten. Nenne die eine Sache, mit der ich morgen früh starten sollte. [Aufgaben einfügen]",
  "Du entscheidest — die KI macht nur den Vorschlag sichtbar."),
]

def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=16*mm,
                            title="10 erprobte KI-Prompts für DACH-Profis", author="aban news")
    flow = [
        Paragraph("☕ 10 erprobte KI-Prompts für DACH-Profis", H1),
        Paragraph("Von aban news — ehrlich, ohne Hype. Kopieren, [Platzhalter] füllen, fertig. "
                  "Faustregel: keine vollständigen Personendaten in Gratis-Tools.", SUB),
        HRFlowable(width="100%", color=colors.HexColor("#ece6db"), spaceAfter=6),
    ]
    for title, prompt, use in prompts:
        flow += [Paragraph(title, PT),
                 Paragraph("„" + prompt + "“", PROMPT),
                 Paragraph("So nutzt du ihn: " + use, USE)]
    flow += [Spacer(1, 10),
             HRFlowable(width="100%", color=colors.HexColor("#ece6db"), spaceAfter=8),
             Paragraph("Mehr davon? Das tägliche 5-Minuten-Briefing: abannews.com — "
                       "Mo–Fr, 3 Updates · 1 Tool · 1 Prompt. Gratis, ohne Tracking.", FOOT)]
    doc.build(flow)
    print("PDF erzeugt:", OUT, f"({OUT.stat().st_size} Bytes)")

if __name__ == "__main__":
    build()
