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

    # noindex-Seiten (Lieferseiten, Dashboards, 404) brauchen kein canonical/OG/Description —
    # für SEO-Discovery-Checks überspringen (sonst Falsch-Alarme).
    noindex = bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', s, re.I))

    if "<title" not in low:
        add("high", "SEO: <title> fehlt", "kein Seitentitel")
    if not noindex and 'name="description"' not in low:
        add("medium", "SEO: Meta-Description fehlt", "kein <meta name=description>")
    if not noindex and 'rel="canonical"' not in low:
        add("high", "SEO: canonical fehlt", "kein <link rel=canonical>")
    if not noindex and 'property="og:title"' not in low:
        add("medium", "SEO: OG-Title fehlt", "kein og:title")
    if not noindex and 'property="og:description"' not in low:
        add("medium", "SEO: OG-Description fehlt", "kein og:description")
    if not re.search(r"<html[^>]*\blang=", s, re.I):
        add("medium", "a11y: lang-Attribut fehlt", "kein lang am <html>")
    if 'name="viewport"' not in low:
        add("medium", "Mobil: viewport-Meta fehlt", "kein <meta name=viewport>")

    # Mixed Content: unsichere http://-Ressourcen. xmlns/namespace-URLs sind kein
    # src/href und werden bewusst nicht erfasst (nur echte Ressourcen-Loads).
    mixed = re.findall(r'\bsrc=["\']http://', s, re.I) + re.findall(r'<link\b[^>]*\bhref=["\']http://', s, re.I)
    if mixed:
        add("high", "Security: unsichere http://-Ressource", f"{len(mixed)} (Mixed Content)")

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

    # Hype-Wörter (nur sichtbarer Text, Tags entfernt).
    # Ausnahme: Seiten, die Hype-Floskeln absichtlich ZITIEREN, um sie zu entlarven
    # (Newsletter-Archiv + Anti-Hype-/Brand-Seiten) — sonst Falsch-Alarme.
    HYPE_EXEMPT = ("archive/", "anti-hype-texten.html", "brand.html", "hype-watch")
    if not any(x in rel for x in HYPE_EXEMPT):
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


def scan_internal_links(findings: list):
    """Prüft interne .html-Links auf existierende Zieldateien (deterministisch, ohne Netz).

    Fängt umbenannte/gelöschte Seiten. Externe Links (http), Anker, mailto/tel und
    erweiterungslose Pretty-URLs (über _redirects) werden bewusst übersprungen.
    """
    href_rx = re.compile(r'href=["\']([^"\'#?]+\.html)(?:[#?][^"\']*)?["\']', re.I)
    skip = ("http://", "https://", "//", "mailto:", "tel:", "data:")
    for p in html_files():
        rel = str(p.relative_to(ROOT))
        s = p.read_text(encoding="utf-8", errors="replace")
        seen = set()
        for href in href_rx.findall(s):
            if href in seen or href.lower().startswith(skip):
                continue
            seen.add(href)
            if href.startswith("/"):
                target = (ROOT / href.lstrip("/"))
            else:
                target = (p.parent / href)
            try:
                target = target.resolve()
                inside = ROOT.resolve() in target.parents or target == ROOT.resolve()
            except Exception:
                inside = False
            if inside and not target.exists():
                findings.append(("high", "Interner Link tot", rel, f"→ {href}"))


def _fix_noopener_in_tag(tag: str) -> str:
    """Ergänzt rel=noopener in einem <a target=_blank>-Tag (idempotent, sicher)."""
    if not re.search(r'target=["\']_blank["\']', tag, re.I):
        return tag
    if "noopener" in tag.lower():
        return tag
    m = re.search(r'\brel=(["\'])(.*?)\1', tag, re.I)
    if m:
        newrel = (m.group(2) + " noopener noreferrer").strip()
        return tag[:m.start(2)] + newrel + tag[m.end(2):]
    return tag[:-1].rstrip() + ' rel="noopener noreferrer">'


def fix_noopener() -> int:
    """Wendet den sicheren noopener-Fix auf alle Seiten an. Gibt Anzahl geänderter Dateien zurück."""
    arx = re.compile(r"<a\b[^>]*>", re.I)
    changed = 0
    for p in html_files():
        s = p.read_text(encoding="utf-8", errors="replace")
        new = arx.sub(lambda m: _fix_noopener_in_tag(m.group(0)), s)
        if new != s:
            p.write_text(new, encoding="utf-8")
            changed += 1
            print(f"  fixed: {p.relative_to(ROOT)}")
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=12, help="Beispiele je Kategorie im Report")
    ap.add_argument("--out", default=str(ROOT / "reports" / "IMPROVEMENT-REPORT.md"))
    ap.add_argument("--fix", action="store_true",
                    help="Sichere mechanische Fixes anwenden (rel=noopener bei target=_blank).")
    args = ap.parse_args()

    if args.fix:
        n = fix_noopener()
        print(f"noopener-Fix: {n} Datei(en) geändert.")
        return

    findings: list = []
    n_pages = 0
    for p in html_files():
        n_pages += 1
        try:
            scan_page(p, findings)
        except Exception as ex:
            findings.append(("high", "Scan-Fehler", str(p.relative_to(ROOT)), str(ex)[:80]))
    scan_sitemap(findings)
    scan_internal_links(findings)

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
