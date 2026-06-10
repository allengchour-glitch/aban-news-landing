#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Branchen-Lead-Magnete: 1-seitige „KI-Schnellstart"-PDFs.

Baut pro ausgewählter Branche ein ehrliches 1-Seiten-PDF aus den ECHTEN
Anwendungsfällen der jeweiligen ki-fuer-*.html (keine erfundenen Inhalte) und
verlinkt es idempotent im Hub (Marker data-aban-leadmagnet) + Newsletter-CTA.
Anmelde-Geschenk → höhere Opt-in-Rate. Reine reportlab + stdlib.

    python3 automation/generate_branchen_pdfs.py [--slugs aerzte,anwaelte] [--dry]
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

REPO = Path(__file__).resolve().parent.parent
OUTDIR = REPO / "downloads" / "branchen"
AMBER = colors.HexColor("#b45309")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")

PREFERRED = ["aerzte", "anwaelte", "steuerberater", "handwerker", "gastronomie",
             "immobilienmakler", "zahnaerzte", "physiotherapie", "architekten",
             "coaches", "onlineshops", "friseure"]

TAG_RE = re.compile(r"<[^>]+>")
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
USECASE_RE = re.compile(r"<h2[^>]*>\s*(\d+\.\s*[^<]+?)\s*</h2>", re.I)
MARKER = "data-aban-leadmagnet"
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


SEKTION_RE = re.compile(
    r'<h2[^>]*>\s*(?:Sinnvolle Anwendungsf[äa]lle|[^<]*use cases[^<]*)\s*</h2>(.*?)(?=<h2)',
    re.S | re.I)
H3_RE = re.compile(r'<h3[^>]*>(.*?)</h3>', re.S | re.I)


def _txt(s: str) -> str:
    return TAG_RE.sub("", s).replace("&amp;", "&").strip()


def extract_cases(html: str) -> list[str]:
    """Anwendungsfälle aus dem Hub ziehen — zwei Layout-Varianten unterstützt."""
    m = SEKTION_RE.search(html)               # Variante A: h3 unter „Sinnvolle Anwendungsfälle"
    if m:
        cases = [_txt(x) for x in H3_RE.findall(m.group(1)) if _txt(x)]
        if cases:
            return cases[:8]
    h2cases = [_txt(c) for c in USECASE_RE.findall(html)]   # Variante B: nummerierte h2
    if h2cases:
        return h2cases[:8]
    # Variante C: nummerierte h3 (1., 2., …) irgendwo — fängt branchenspezifische
    # Sonder-Überschriften ab (z.B. „Wo KI ruhig zur Hand gehen kann").
    h3num = re.findall(r'<h3[^>]*>\s*(\d+\.\s*[^<]+?)\s*</h3>', html, re.I)
    return [_txt(c) for c in h3num][:8]


def branche(html: str, slug: str) -> str:
    m = TITLE_RE.search(html)
    if m:
        t = _txt(m.group(1)).split("|")[0]
        t = re.split(r"\s[—–-]\s", t, 1)[0]
        for pre in ("KI für ", "KI fürs ", "KI im ", "KI in der ", "KI in "):
            t = t.replace(pre, "")
        t = re.sub(r"\(20\d\d\)", "", t).strip()
        if t:
            return t
    return slug.replace("-", " ").title()


STR = {
    "de": {"brand": "☕ aban news", "title": "KI-Schnellstart für {label}",
           "sub": "Die realistischen KI-Anwendungen auf einer Seite — kein Hype, mit klaren Grenzen.",
           "limit": "<b>Grenze:</b> KI liefert Entwürfe, keine Gewähr. Die fachliche und "
                    "rechtliche Endkontrolle bleibt immer bei dir.",
           "foot": "Mehr davon? aban news ist ein werktäglicher KI-Newsletter für DACH-Profis "
                   "(3–5 Minuten, kein Hype): <b>abannews.com</b> · Gratis abonnieren: "
                   "abannews.beehiiv.com/subscribe",
           "doctitle": "KI-Schnellstart für {label}", "file": "ki-schnellstart-{slug}.pdf"},
    "en": {"brand": "☕ aban news", "title": "AI Quickstart for {label}",
           "sub": "The realistic AI use cases on one page — no hype, with clear limits.",
           "limit": "<b>Limit:</b> AI gives you drafts, no guarantees. The professional and "
                    "legal final check always stays with you.",
           "foot": "Want more? aban news is a weekday AI newsletter for professionals "
                   "(3–5 minutes, no hype): <b>abannews.com</b> · Subscribe free: "
                   "abannews.beehiiv.com/subscribe",
           "doctitle": "AI Quickstart for {label}", "file": "ki-quickstart-{slug}.pdf"},
}


def build_pdf(slug: str, label: str, hook: str, cases: list[str], dry: bool, lang: str = "de") -> Path | None:
    t = STR.get(lang, STR["de"])
    outdir = OUTDIR if lang == "de" else OUTDIR / lang
    out = outdir / t["file"].format(slug=slug)
    if dry:
        return out
    outdir.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    h = ParagraphStyle("h", parent=styles["Title"], textColor=INK, fontSize=22, leading=26, spaceAfter=4)
    sub = ParagraphStyle("sub", parent=styles["Normal"], textColor=AMBER, fontSize=11, leading=15, spaceAfter=10)
    body = ParagraphStyle("b", parent=styles["Normal"], textColor=INK, fontSize=11.5, leading=17, spaceAfter=7)
    foot = ParagraphStyle("f", parent=styles["Normal"], textColor=MUTED, fontSize=9.5, leading=13)
    doc = SimpleDocTemplate(str(out), pagesize=A4, topMargin=20 * mm, bottomMargin=18 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm, title=t["doctitle"].format(label=label))
    flow = [Paragraph(t["brand"], sub),
            Paragraph(t["title"].format(label=label), h),
            Paragraph(t["sub"], sub),
            HRFlowable(width="100%", color=colors.HexColor("#ece3d4"), spaceAfter=10)]
    if hook:
        flow.append(Paragraph(hook, body))
    for c in cases:
        flow.append(Paragraph(f"☑ {c}", body))
    flow.append(Spacer(1, 6))
    flow.append(Paragraph(t["limit"], body))
    flow.append(HRFlowable(width="100%", color=colors.HexColor("#ece3d4"), spaceBefore=8, spaceAfter=8))
    flow.append(Paragraph(t["foot"], foot))
    doc.build(flow)
    return out


def link_in_hub(hub: Path, slug: str, label: str, dry: bool, lang: str = "de") -> str:
    s = hub.read_text(encoding="utf-8")
    if lang == "en":
        h2, intro = "📄 Free cheat sheet (PDF)", f"The key AI use cases for {label} on one page — printable."
        pdf_href, dl, more = f"/downloads/branchen/en/ki-quickstart-{slug}.pdf", "Download PDF →", "… more every weekday →"
    else:
        h2, intro = "📄 Gratis-Spickzettel als PDF", f"Die wichtigsten KI-Anwendungen für {label} auf einer Seite — zum Ausdrucken."
        pdf_href, dl, more = f"/downloads/branchen/ki-schnellstart-{slug}.pdf", "PDF herunterladen →", "… werktäglich mehr →"
    block = (
        f'<aside {MARKER} style="max-width:760px;margin:1.5rem auto;padding:1.1rem 1.3rem;'
        'border:1px dashed #e0b878;border-radius:14px;background:#fffaf0">\n'
        f'  <h2 style="margin:0 0 .4rem;font-size:1.08rem;color:#1f2937">{h2}</h2>\n'
        f'  <p style="margin:0 0 .8rem;color:#374151;font-size:.95rem;line-height:1.6">{intro}</p>\n'
        f'  <p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">\n'
        f'    <a href="{pdf_href}" style="display:inline-block;'
        f'background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">{dl}</a>\n'
        f'    <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:transparent;'
        f'color:#b45309;border:1px solid #fde9c8;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">{more}</a>\n'
        '  </p>\n</aside>\n')
    if MARKER in s:
        new = EXISTING.sub(lambda _m: block, s, count=1)
        action = "unchanged" if new == s else "updated"
    else:
        idx = s.rfind("</main>")
        if idx == -1:
            return "skipped"
        new = s[:idx] + block + s[idx:]
        action = "inserted"
    if not dry and action != "unchanged":
        hub.write_text(new, encoding="utf-8")
    return action


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slugs", default="")
    ap.add_argument("--all", action="store_true", help="alle ki-fuer-*-Hubs (sonst PREFERRED-Set)")
    ap.add_argument("--lang", default="de", choices=["de", "en"], help="de = Root-Hubs, en = en/-Hubs")
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()
    base = REPO if args.lang == "de" else REPO / args.lang
    if args.all:
        slugs = sorted(p.name[len("ki-fuer-"):-len(".html")] for p in base.glob("ki-fuer-*.html"))
    else:
        slugs = [s.strip() for s in args.slugs.split(",") if s.strip()] or PREFERRED

    made = linked = skipped = 0
    for slug in slugs:
        hub = base / f"ki-fuer-{slug}.html"
        if not hub.exists():
            continue
        html = hub.read_text(encoding="utf-8")
        cases = extract_cases(html)
        if not cases:
            skipped += 1
            continue
        label = branche(html, slug)
        m = H1_RE.search(html)
        hook = _txt(m.group(1)) if m else ""
        build_pdf(slug, label, hook, cases, args.dry, args.lang)
        made += 1
        act = link_in_hub(hub, slug, label, args.dry, args.lang)
        if act in ("inserted", "updated"):
            linked += 1
    print(f"{'[dry] ' if args.dry else ''}[{args.lang}] {made} PDFs, {linked} Hubs verlinkt, "
          f"{skipped} ohne Anwendungsfälle übersprungen ({len(slugs)} Branchen geprüft).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
