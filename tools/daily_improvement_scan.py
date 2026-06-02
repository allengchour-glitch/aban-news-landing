#!/usr/bin/env python3
"""Täglicher Verbesserungs-Scan für abannews.com — findet konkrete, verifizierbare
Schwachstellen über alle HTML-Seiten + die sitemap und schreibt einen priorisierten
Report. Deterministisch, reine Python-stdlib, erfindet nichts.

Geprüft je Seite: <title>, Meta-Description, canonical, OG-Tags, lang-Attribut,
<img alt>, Mehrfach-Ausrufezeichen, Aban-Sperrliste (Hype-Wörter), JSON-LD-Validität,
externe target=_blank-Links ohne rel="noopener". Plus: sitemap-Einträge, die auf
fehlende Dateien zeigen.

Nutzung:
    python3 tools/daily_improvement_scan.py            # Report nach reports/IMPROVEMENT-REPORT.md
    python3 tools/daily_improvement_scan.py --top 20   # mehr Beispiele je Kategorie
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, timezone, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_PARTS = ("/dist/", "/node_modules/", "/ki-schriftsteller/", "/reports/",
                 "/.git/", "/automatisierung-radar/", "/data/")  # Generate-Output & Entwürfe aus

# Spiegel der Aban-Sperrliste (Quelle: automation/brand-voice-validator-api.py).
HYPE = [
    r"\brevolution(?:aer|aere|ar|ary)?\w*", r"\bdisrupt(?:iv|ive|s|ed|ion)?\w*",
    r"\bgame[- ]?changer\w*", r"\bbahnbrech(?:end|ende|ender)\w*",
    r"\beinzigartig\w*", r"\bunglaublich\w*", r"\bwahnsinnig\w*",
    r"\bnext[- ]?level\w*", r"\bcutting[- ]?edge\w*", r"\bworld[- ]?class\w*",
    r"\bskyrocket\w*", r"\b10x\b", r"\bnie[- ]?dagewes\w*", r"\bturbo\b",
    r"\bkrass\b", r"\bmehrwert\b",
]
HYPE_RX = re.compile("|".join(HYPE), re.IGNORECASE)
EXCL_RX = re.compile("!{2,}")
JSONLD_RX = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)
IMG_RX = re.compile(r"<img\b[^>]*>", re.I)
ABLANK_RX = re.compile(r'<a\b[^>]*target=["\']_blank["\'][^>]*>', re.I)


def html_files():
    for p in ROOT.rglob("*.html"):
        rel = "/" + str(p.relative_to(ROOT))
        if any(x in rel for x in EXCLUDE_PARTS):
            continue
        yield p


def scan_page(p: Path, findings: list):
    s = p.read_text(encoding="utf-8", errors="replace")
    rel = str(p.relative_to(ROOT))
    low = s.lower()

    def add(sev, cat, detail):
        findings.append((sev, cat, rel, detail))

    if "<title" not in low:
        add("high", "SEO: <title> fehlt", "kein Seitentitel")
    if 'name="description"' not in low:
        add("medium", "SEO: Meta-Description fehlt", "kein <meta name=description>")
    if 'rel="canonical"' not in low:
        add("high", "SEO: canonical fehlt", "kein <link rel=canonical>")
    if 'property="og:title"' not in low:
        add("medium", "SEO: OG-Title fehlt", "kein og:title")
    if 'property="og:description"' not in low:
        add("medium", "SEO: OG-Description fehlt", "kein og:description")
    if not re.search(r"<html[^>]*\blang=", s, re.I):
        add("medium", "a11y: lang-Attribut fehlt", "kein lang am <html>")

    # Bilder ohne alt
    noalt = [m.group(0)[:60] for m in IMG_RX.finditer(s) if not re.search(r"\balt=", m.group(0), re.I)]
    if noalt:
        add("medium", "a11y: <img> ohne alt", f"{len(noalt)} Bild(er) ohne alt-Text")

    # externe _blank ohne noopener (Security/Tabnabbing)
    noopener = [m.group(0)[:70] for m in ABLANK_RX.finditer(s)
                if "noopener" not in m.group(0).lower()]
    if noopener:
        add("medium", "Security: target=_blank ohne rel=noopener", f"{len(noopener)} Link(s)")

    # Mehrfach-Ausrufezeichen
    if EXCL_RX.search(re.sub(r"<[^>]+>", " ", s)):
        add("low", "Voice: Mehrfach-Ausrufezeichen", "!! im Text")

    # Hype-Wörter (nur sichtbarer Text, Tags entfernt)
    text = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    hits = sorted(set(m.group(0) for m in HYPE_RX.finditer(text)))
    if hits:
        add("low", "Voice: Hype-Wörter", ", ".join(hits[:6]))

    # JSON-LD-Validität
    for block in JSONLD_RX.findall(s):
        try:
            json.loads(block.strip())
        except Exception as ex:
            add("high", "JSON-LD ungültig", str(ex)[:80])
            break


def scan_sitemap(findings: list):
    sm = ROOT / "sitemap.xml"
    if not sm.exists():
        return
    locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", sm.read_text(encoding="utf-8"))
    for loc in locs:
        path = re.sub(r"^https?://[^/]+", "", loc).split("?")[0]
        if not path.endswith(".html"):
            continue
        f = ROOT / path.lstrip("/")
        if not f.exists():
            findings.append(("high", "Sitemap: Ziel fehlt", "sitemap.xml",
                             f"{path} → Datei nicht vorhanden"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=12, help="Beispiele je Kategorie im Report")
    ap.add_argument("--out", default=str(ROOT / "reports" / "IMPROVEMENT-REPORT.md"))
    args = ap.parse_args()

    findings: list = []
    n_pages = 0
    for p in html_files():
        n_pages += 1
        try:
            scan_page(p, findings)
        except Exception as ex:
            findings.append(("high", "Scan-Fehler", str(p.relative_to(ROOT)), str(ex)[:80]))
    scan_sitemap(findings)

    sev_rank = {"high": 0, "medium": 1, "low": 2}
    by_cat: dict = {}
    for sev, cat, rel, detail in findings:
        by_cat.setdefault((sev_rank[sev], sev, cat), []).append((rel, detail))

    counts = {"high": 0, "medium": 0, "low": 0}
    for sev, *_ in findings:
        counts[sev] += 1

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Täglicher Verbesserungs-Report — abannews.com",
        "",
        f"> Automatisch erzeugt: **{now}** · {n_pages} HTML-Seiten geprüft · "
        f"reine Heuristik, manuell verifizieren.",
        "",
        f"**Befunde:** 🔴 {counts['high']} hoch · 🟡 {counts['medium']} mittel · "
        f"🟢 {counts['low']} niedrig (Tonalität)",
        "",
        "Ergänzend: `python3 tools/link_checker.py` prüft kaputte Links separat.",
        "",
    ]
    if not findings:
        lines.append("✅ Keine Befunde. Sauber.")
    icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}
    for (rank, sev, cat) in sorted(by_cat):
        items = by_cat[(rank, sev, cat)]
        lines.append(f"## {icon[sev]} {cat} — {len(items)}")
        for rel, detail in items[:args.top]:
            lines.append(f"- `{rel}` — {detail}")
        if len(items) > args.top:
            lines.append(f"- … und {len(items) - args.top} weitere")
        lines.append("")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"{n_pages} Seiten geprüft · {counts['high']} hoch / {counts['medium']} mittel / "
          f"{counts['low']} niedrig → {out.relative_to(ROOT)}")
    # Exit 0: Report-Tool, kein CI-Blocker.


if __name__ == "__main__":
    main()
