#!/usr/bin/env python3
"""KDP daily-planner interior generator — 6x9", BW white paper, no bleed.

Produces a print-ready interior PDF: title, copyright, "belongs to", how-to,
tips, intention page, N undated daily pages (Top 3 / time-blocks / body-doubling /
dopamine wins / brain-dump / footer checks), and a few notes pages.

KDP notes baked in:
  * 6x9 trim, generous 0.6" side margins (safe for the binding gutter either side).
  * All fonts embedded; reportlab's default Helvetica is remapped to embedded DejaVu.
  * >=100 pages so a spine is meaningful (cover may still skip spine text if thin).

Usage:
    from planner_interior import build_interior, ADHD
    build_interior(ADHD, "/path/interior.pdf")
    python3 planner_interior.py     # builds the ADHD example to ./out/
"""
import os
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

PAGE_W, PAGE_H = 6 * inch, 9 * inch
ML = MR = 0.6 * inch
MT, MB = 0.55 * inch, 0.5 * inch
CW = PAGE_W - ML - MR
GREY = HexColor("#666666"); LGREY = HexColor("#BBBBBB")
XLGREY = HexColor("#E6E6E6"); INK = HexColor("#1A1A1A")
F, FB = "DJR", "DJB"


def _fonts():
    if F not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(F, "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
        pdfmetrics.registerFont(TTFont(FB, "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))


def _remap_helvetica(path):
    import pikepdf
    pdf = pikepdf.open(path, allow_overwriting_input=True)
    for page in pdf.pages:
        res = page.get("/Resources"); fonts = res.get("/Font") if res else None
        if not fonts:
            continue
        dj = None
        for _, f in fonts.items():
            if "DejaVuSans" in str(f.get("/BaseFont", "")) and "Bold" not in str(f.get("/BaseFont", "")):
                dj = f; break
        for k in list(fonts.keys()):
            if "Helvetica" in str(fonts[k].get("/BaseFont", "")) and dj is not None:
                fonts[k] = dj
    pdf.save(path)


def build_interior(cfg, out_pdf):
    _fonts()
    DAYS = cfg.get("days", 90)
    ACC = HexColor(cfg.get("accent", "#138086"))
    TITLE, SUB, AUTHOR = cfg["title"], cfg["subtitle"], cfg["author"]
    c = canvas.Canvas(out_pdf, pagesize=(PAGE_W, PAGE_H))

    def center(txt, y, font=FB, size=20, color=INK):
        c.setFillColor(color); c.setFont(font, size); c.drawCentredString(PAGE_W / 2, y, txt)

    def wrap(txt, x, y, font, size, leading, maxw, color=INK):
        c.setFont(font, size); c.setFillColor(color)
        words, line = txt.split(), ""
        for w in words:
            t = (line + " " + w).strip()
            if pdfmetrics.stringWidth(t, font, size) <= maxw:
                line = t
            else:
                c.drawString(x, y, line); y -= leading; line = w
        if line:
            c.drawString(x, y, line); y -= leading
        return y

    def line(x1, y, x2, color=LGREY, w=0.8):
        c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

    # title
    c.setFillColor(ACC); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont(FB, 28)
    y = PAGE_H - 2.6 * inch
    for ln in cfg["title_lines"]:
        c.drawCentredString(PAGE_W / 2, y, ln); y -= 0.5 * inch
    c.setFont(F, 13); wrap(SUB, ML, y - 0.2 * inch, F, 13, 18, CW, color=HexColor("#EAFBFB"))
    c.setFont(FB, 14); c.drawCentredString(PAGE_W / 2, 0.9 * inch, AUTHOR)
    c.showPage()

    # copyright
    yy = PAGE_H - MT - 30; c.setFillColor(GREY); c.setFont(F, 9)
    for t in [TITLE, SUB, "", f"Copyright © {cfg.get('year', 2026)} {AUTHOR}",
              "All rights reserved.", "",
              "No part of this planner may be reproduced without prior written",
              "permission, except brief quotations in reviews.", "",
              "Not a substitute for professional medical or psychological advice.",
              "", f"First edition, {cfg.get('year', 2026)}."]:
        c.drawString(ML, yy, t); yy -= 13
    c.showPage()

    # belongs
    center("This planner belongs to", PAGE_H - 2.2 * inch, FB, 16)
    line(ML + 0.4 * inch, PAGE_H - 2.9 * inch, PAGE_W - MR - 0.4 * inch)
    center("If found, please return to:", PAGE_H - 3.5 * inch, F, 11, GREY)
    line(ML + 0.4 * inch, PAGE_H - 4.1 * inch, PAGE_W - MR - 0.4 * inch)
    line(ML + 0.4 * inch, PAGE_H - 4.7 * inch, PAGE_W - MR - 0.4 * inch)
    c.showPage()

    # how-to (from cfg["how_to"] = list of (head, body))
    y = PAGE_H - MT - 10; center("How to use this planner", y, FB, 18); y -= 34
    y = wrap(cfg.get("intro", ""), ML, y, F, 11, 15, CW, GREY) - 14
    for head, body in cfg.get("how_to", []):
        c.setFillColor(ACC); c.setFont(FB, 12); c.drawString(ML, y, head); y -= 16
        y = wrap(body, ML, y, F, 10.5, 14, CW, INK) - 12
    c.showPage()

    # daily pages
    def daily(n):
        y = PAGE_H - MT
        c.setFillColor(ACC); c.setFont(FB, 13); c.drawString(ML, y - 12, f"DAY {n}")
        c.setFillColor(GREY); c.setFont(F, 9); c.drawString(ML + 0.7 * inch, y - 12, f"of {DAYS}")
        c.setFont(F, 10); c.setFillColor(INK)
        c.drawRightString(ML + CW, y - 12, "DATE:  ____ / ____ / ______")
        y -= 22
        c.setFont(F, 9); c.setFillColor(GREY); gap = CW / 7
        for i, dd in enumerate(["M", "T", "W", "T", "F", "S", "S"]):
            cx = ML + gap * i + gap / 2
            c.setStrokeColor(LGREY); c.setLineWidth(0.8); c.circle(cx, y - 6, 7, stroke=1, fill=0)
            c.drawCentredString(cx, y - 9, dd)
        y -= 24; line(ML, y, ML + CW, XLGREY, 1); y -= 16

        def sect(t):
            nonlocal y
            c.setFillColor(ACC); c.setFont(FB, 11); c.drawString(ML, y, t.upper()); y -= 16

        sect("Today's Top 3")
        for _ in range(3):
            c.setStrokeColor(GREY); c.setLineWidth(1); c.rect(ML, y - 2, 11, 11, stroke=1, fill=0)
            line(ML + 20, y - 2, ML + CW, LGREY); y -= 22
        y -= 6
        sect("Time Blocks")
        for h in ["7", "8", "9", "10", "11", "12", "1", "2", "3", "4", "5", "6", "7", "8"]:
            c.setFont(F, 8); c.setFillColor(GREY); c.drawRightString(ML + 20, y - 2, h)
            line(ML + 26, y - 4, ML + CW, XLGREY, 0.8); y -= 17.0
        y -= 4
        box_top, box_h, half = y, 64, (CW - 14) / 2
        for label, sub_, x0 in [("BODY DOUBLING", "Who / where / when", ML),
                                ("DOPAMINE WINS", "Small wins today", ML + half + 14)]:
            c.setStrokeColor(LGREY); c.setLineWidth(0.8)
            c.rect(x0, box_top - box_h, half, box_h, stroke=1, fill=0)
            c.setFillColor(ACC); c.setFont(FB, 8.5); c.drawString(x0 + 6, box_top - 13, label)
            c.setFillColor(GREY); c.setFont(F, 7.5); c.drawString(x0 + 6, box_top - 25, sub_)
        y = box_top - box_h - 14
        sect("Brain Dump")
        while y > MB + 40:
            line(ML, y, ML + CW, XLGREY, 0.8); y -= 16
        fy = MB + 18; line(ML, fy + 14, ML + CW, XLGREY, 1)
        c.setFont(F, 8.5); c.setFillColor(GREY)
        c.drawString(ML, fy, "☐ Water   ☐ Meds   ☐ Moved   ☐ Ate   Sleep ____h   Mood ____")
        c.showPage()

    for dn in range(1, DAYS + 1):
        daily(dn)

    for _ in range(cfg.get("notes_pages", 6)):
        y = PAGE_H - MT - 10; center("Notes", y, FB, 16); y -= 30
        while y > MB + 20:
            line(ML, y, ML + CW, XLGREY, 0.8); y -= 18
        c.showPage()

    c.save()
    _remap_helvetica(out_pdf)
    pages = 4 + DAYS + cfg.get("notes_pages", 6)
    return {"out": out_pdf, "pages": pages}


ADHD = dict(
    title="ADHD Daily Planner for Adults",
    title_lines=["ADHD Daily", "Planner", "for Adults"],
    subtitle="A 90-Day Planner Built for an ADHD Brain",
    author="Marcus Reilly", days=90, accent="#138086",
    intro=("Your brain is not broken — it just runs on a different operating system. "
           "This planner uses four simple tools, one page a day, to work with it."),
    how_to=[
        ("1. Today's Top 3", "Three things. If you only finish these, the day counts as a win."),
        ("2. Time Blocks", "Give each task a slot — turn invisible time into something you can hold."),
        ("3. Body Doubling", "Note who you'll work alongside, and when. Focus borrows from presence."),
        ("4. Dopamine Wins", "Write down small wins as they happen, so momentum builds."),
    ],
)

if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    info = build_interior(ADHD, "out/interior-adhd-6x9.pdf")
    print(info)
