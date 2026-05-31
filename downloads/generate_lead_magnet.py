#!/usr/bin/env python3
"""Lead-Magnet generator — "Die 30 besten KI-Tools für DACH 2026".

Builds a branded PDF from data/tools.json (top 30 by worth_it_score, then DACH
relevance). This is the LinkedIn/newsletter opt-in incentive from the marketing
playbook ("specific + number beats generic"). Honest, no hype; links to the
newsletter at the end.

Requires reportlab (already used by the repo's other PDF generators).

Usage:
    python downloads/generate_lead_magnet.py
    -> writes downloads/top-30-ki-tools-dach-2026.pdf
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)

# Aban brand tokens.
AMBER = colors.HexColor("#d97706")
AMBER_D = colors.HexColor("#b45309")
DARK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")
CREAM = colors.HexColor("#fef3c7")
NEWSLETTER = "https://abannews.de"

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "data" / "tools.json"
OUT = Path(__file__).resolve().parent / "top-30-ki-tools-dach-2026.pdf"


def price_str(t: dict) -> str:
    p = t.get("pricing", {})
    if p.get("paid_from_eur"):
        return f"ab {p['paid_from_eur']} {p.get('currency', 'EUR')}"
    return "kostenlos" if p.get("free_tier") else "—"


def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("AbanH1", parent=s["Title"], textColor=AMBER_D,
                         fontSize=26, leading=30, spaceAfter=4))
    s.add(ParagraphStyle("AbanSub", parent=s["Normal"], textColor=MUTED,
                         fontSize=11, leading=15, spaceAfter=14))
    s.add(ParagraphStyle("AbanBody", parent=s["Normal"], textColor=DARK,
                         fontSize=10, leading=14))
    s.add(ParagraphStyle("AbanNote", parent=s["Normal"], textColor=MUTED,
                         fontSize=8.5, leading=11))
    s.add(ParagraphStyle("AbanName", parent=s["Normal"], textColor=DARK,
                         fontSize=10.5, leading=13, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("AbanCTA", parent=s["Normal"], textColor=AMBER_D,
                         fontSize=12, leading=16, fontName="Helvetica-Bold"))
    return s


def build():
    tools = json.loads(DATA.read_text(encoding="utf-8"))["tools"]
    top = sorted(tools, key=lambda t: (t.get("worth_it_score", 0),
                                       t.get("dach_relevance", 0)), reverse=True)[:30]
    st = styles()
    doc = SimpleDocTemplate(str(OUT), pagesize=A4,
                            topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm,
                            title="Die 30 besten KI-Tools für DACH 2026",
                            author="Aban News")
    flow = []
    flow.append(Paragraph("Die 30 besten KI-Tools für DACH 2026", st["AbanH1"]))
    flow.append(Paragraph(
        "Ehrlich bewertet, mit Preisen und DSGVO-Blick — kuratiert von Aban News. "
        "Kein Hype, nur was sich im Alltag bewährt.", st["AbanSub"]))
    flow.append(HRFlowable(width="100%", color=CREAM, thickness=2, spaceAfter=10))

    # Table header
    head = [Paragraph("<b>#</b>", st["AbanBody"]),
            Paragraph("<b>Tool</b>", st["AbanBody"]),
            Paragraph("<b>Was &amp; warum</b>", st["AbanBody"]),
            Paragraph("<b>Preis</b>", st["AbanBody"]),
            Paragraph("<b>Score</b>", st["AbanBody"])]
    rows = [head]
    for i, t in enumerate(top, 1):
        note = t.get("aban_note") or ", ".join(t.get("use_cases", [])[:3]) or "—"
        name = f'{t["name"]}'
        vendor = t.get("vendor", "")
        name_cell = Paragraph(f'{name}<br/><font size=7 color="#6b7280">{vendor}</font>',
                              st["AbanName"])
        rows.append([
            Paragraph(str(i), st["AbanBody"]),
            name_cell,
            Paragraph(note[:160], st["AbanNote"]),
            Paragraph(price_str(t), st["AbanBody"]),
            Paragraph(f'{t.get("worth_it_score", "—")}/10', st["AbanBody"]),
        ])
    tbl = Table(rows, colWidths=[8 * mm, 34 * mm, 92 * mm, 22 * mm, 16 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AMBER),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fffbf5")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    flow.append(tbl)

    flow.append(Spacer(1, 14))
    flow.append(HRFlowable(width="100%", color=CREAM, thickness=2, spaceAfter=8))
    flow.append(Paragraph("Willst du solche Einschätzungen jede Woche?", st["AbanCTA"]))
    flow.append(Paragraph(
        f'Aban News ist der deutschsprachige KI-Newsletter — kuratiert, 3–5 Minuten, kein Hype. '
        f'Kostenlos abonnieren: <a href="{NEWSLETTER}" color="#b45309">{NEWSLETTER}</a>',
        st["AbanBody"]))
    flow.append(Spacer(1, 6))
    flow.append(Paragraph(
        f"Stand: {date.today().strftime('%m/%Y')} · Bewertungen sind redaktionell und unabhängig. "
        "Preise/Funktionen ändern sich — bitte beim Anbieter prüfen. © Aban, Alleng Chour.",
        st["AbanNote"]))

    doc.build(flow)
    print(f"Built lead magnet → {OUT.name} ({len(top)} tools)")


if __name__ == "__main__":
    build()
