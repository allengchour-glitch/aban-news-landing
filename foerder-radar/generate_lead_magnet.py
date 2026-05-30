#!/usr/bin/env python3
"""Lead-Magnet generator — "Die wichtigsten Förderungen für DACH 2026".

Branded PDF from foerder-radar/foerderungen.json. Newsletter/LinkedIn opt-in
incentive for the funding audience. Honest: links to official sources, shows
"ohne Gewähr" — never invents amounts/deadlines.

Requires reportlab.

Usage:
    python foerder-radar/generate_lead_magnet.py
    -> writes foerder-radar/foerder-leitfaden-dach-2026.pdf
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

AMBER = colors.HexColor("#d97706")
AMBER_D = colors.HexColor("#b45309")
DARK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")
CREAM = colors.HexColor("#fef3c7")
NEWSLETTER = "https://abannews.de"
REGION = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz", "EU": "EU"}

HERE = Path(__file__).resolve().parent
DATA = HERE / "foerderungen.json"
OUT = HERE / "foerder-leitfaden-dach-2026.pdf"

# Curated selection for the magnet: the most broadly relevant programs for
# founders/SMEs across regions (kept honest — these all exist in the data).
PICK_IDS = [
    "kfw-gruenderkredit", "erp-gruenderkredit-startgeld", "digital-jetzt", "go-digital",
    "exist-gruenderstipendium", "forschungszulage", "zim", "gruendungszuschuss",
    "invest-wagniskapital", "mikrokreditfonds-deutschland", "high-tech-gruenderfonds",
    "mid-digitalisierung-nrw", "innovationsgutschein-bw", "digitalbonus-bayern",
    "aws-preseed-seed", "aws-erp-kredit", "ffg-basisprogramm",
    "innosuisse", "venture-kick", "horizon-europe", "eic-accelerator", "digital-europe",
]


def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("H1", parent=s["Title"], textColor=AMBER_D, fontSize=24, leading=28, spaceAfter=4))
    s.add(ParagraphStyle("Sub", parent=s["Normal"], textColor=MUTED, fontSize=11, leading=15, spaceAfter=12))
    s.add(ParagraphStyle("Body", parent=s["Normal"], textColor=DARK, fontSize=9.5, leading=13))
    s.add(ParagraphStyle("Note", parent=s["Normal"], textColor=MUTED, fontSize=8.5, leading=11))
    s.add(ParagraphStyle("Name", parent=s["Normal"], textColor=DARK, fontSize=10, leading=13, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("CTA", parent=s["Normal"], textColor=AMBER_D, fontSize=12, leading=16, fontName="Helvetica-Bold"))
    return s


def build():
    db = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in db["programme"]}
    picked = [by_id[i] for i in PICK_IDS if i in by_id]
    # group by region for a clean structure
    order = ["DE", "AT", "CH", "EU"]
    picked.sort(key=lambda p: (order.index(p["region"]) if p["region"] in order else 9, p["name"]))

    st = styles()
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm,
                            title="Die wichtigsten Förderungen für DACH 2026", author="Aban")
    flow = [Paragraph("Förder-Leitfaden DACH 2026", st["H1"]),
            Paragraph("Die wichtigsten Förderprogramme für Gründer und KMU in Deutschland, "
                      "Österreich, der Schweiz und der EU — kompakt erklärt, mit offiziellen Quellen.",
                      st["Sub"]),
            HRFlowable(width="100%", color=CREAM, thickness=2, spaceAfter=10)]

    head = [Paragraph("<b>Programm</b>", st["Body"]), Paragraph("<b>Region</b>", st["Body"]),
            Paragraph("<b>Art</b>", st["Body"]), Paragraph("<b>Wofür</b>", st["Body"])]
    rows = [head]
    for p in picked:
        rows.append([
            Paragraph(f'{p["name"]}<br/><font size=7 color="#6b7280">{p.get("traeger","")}</font>', st["Name"]),
            Paragraph(REGION.get(p["region"], p["region"]), st["Body"]),
            Paragraph(p.get("art", "—"), st["Body"]),
            Paragraph(p.get("kurz", "")[:150], st["Note"]),
        ])
    tbl = Table(rows, colWidths=[44 * mm, 20 * mm, 20 * mm, 88 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AMBER),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fffbf5")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    flow.append(tbl)
    flow.append(Spacer(1, 12))
    flow.append(HRFlowable(width="100%", color=CREAM, thickness=2, spaceAfter=8))
    flow.append(Paragraph("Mehr als 60 Programme — sortier- und filterbar:", st["CTA"]))
    flow.append(Paragraph(
        f'Der vollständige Förder-Radar (kostenlos): <a href="https://foerder.abannews.com" color="#b45309">foerder.abannews.com</a><br/>'
        f'KI- &amp; Förder-News jede Woche im Aban-News-Newsletter: <a href="{NEWSLETTER}" color="#b45309">{NEWSLETTER}</a>',
        st["Body"]))
    flow.append(Spacer(1, 6))
    flow.append(Paragraph(
        f"Stand: {date.today().strftime('%m/%Y')} · Angaben ohne Gewähr — Förderbedingungen, Fristen "
        "und Beträge ändern sich. Bitte immer auf der offiziellen Seite des Förderträgers prüfen. "
        "© Aban, Alleng Chour.", st["Note"]))
    doc.build(flow)
    print(f"Built funding lead magnet → {OUT.name} ({len(picked)} programs)")


if __name__ == "__main__":
    build()
