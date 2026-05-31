#!/usr/bin/env python3
"""SEO-/Meta-Auditor für alle veröffentlichten HTML-Seiten.

Rein lesender Report: pro Seite, welche Such-/Social-Bausteine fehlen oder
außerhalb der sinnvollen Länge liegen (Title, Meta-Description, Canonical,
Open-Graph, genau eine H1, JSON-LD, hreflang). Seiten mit robots=noindex
(z.B. launch.html, preview.html, 404) werden erkannt und von den
Indexier-Erwartungen ausgenommen — die will man nicht in Google.

Ergänzt validate_site.py: das prüft Korrektheit (kaputte Links, ungültiges
JSON-LD), dies hier prüft SEO-Vollständigkeit. Beides rein lesend.

    python3 automation/audit_seo.py
"""
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Längen-Fenster (Zeichen), an denen sich Google/Social grob orientieren.
TITLE_MIN, TITLE_MAX = 15, 65
DESC_MIN, DESC_MAX = 70, 160

# Seiten, die bewusst nicht in den Index sollen oder kein Marketing-Content sind.
SKIP = {"launch-manual.html"}

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
H1_RE = re.compile(r"<h1[\s>]", re.I)
META_DESC_RE = re.compile(r'<meta[^>]+name=["\']description["\'][^>]*>', re.I)
DESC_CONTENT_RE = re.compile(
    r'<meta[^>]+name=["\']description["\'][^>]*content=["\'](.*?)["\']', re.I | re.S)
ROBOTS_NOINDEX_RE = re.compile(
    r'<meta[^>]+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', re.I)


def has(t, needle):
    return needle in t


def audit_page(path):
    """Liste von (level, msg). level: 'err' fehlt hart, 'warn' Länge/Social."""
    t = path.read_text(encoding="utf-8", errors="ignore")
    noindex = bool(ROBOTS_NOINDEX_RE.search(t))
    issues = []

    # Auf noindex-Seiten sind fehlende Title/Description kein harter Fehler —
    # die sollen ohnehin nicht in den Index.
    hard = "warn" if noindex else "err"

    m = TITLE_RE.search(t)
    title = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    if not title:
        issues.append((hard, "kein <title>"))
    elif not (TITLE_MIN <= len(title) <= TITLE_MAX):
        issues.append(("warn", f"Title {len(title)} Zeichen (gut: {TITLE_MIN}–{TITLE_MAX})"))

    dm = DESC_CONTENT_RE.search(t)
    if not META_DESC_RE.search(t):
        issues.append((hard, "keine Meta-Description"))
    else:
        dlen = len(re.sub(r"\s+", " ", dm.group(1)).strip()) if dm else 0
        if dlen and not (DESC_MIN <= dlen <= DESC_MAX):
            issues.append(("warn", f"Description {dlen} Zeichen (gut: {DESC_MIN}–{DESC_MAX})"))

    h1n = len(H1_RE.findall(t))
    if h1n == 0:
        issues.append(("warn", "keine <h1>"))
    elif h1n > 1:
        issues.append(("warn", f"{h1n}× <h1> (genau eine ist ideal)"))

    # Indexier-spezifische Bausteine nur für Seiten, die in Google sollen.
    if not noindex:
        if not has(t, 'rel="canonical"'):
            issues.append(("err", "kein canonical"))
        for prop, lbl in (("og:title", "og:title"), ("og:description", "og:description"),
                          ("og:image", "og:image")):
            if not has(t, prop):
                issues.append(("warn", f"kein {lbl}"))
        if "application/ld+json" not in t:
            issues.append(("warn", "kein JSON-LD"))
        if "hreflang" not in t:
            issues.append(("warn", "kein hreflang"))

    return noindex, title, issues


def main():
    files = sorted(
        p for p in (Path(f) for f in glob.glob(str(ROOT / "*.html")))
        if p.name not in SKIP)

    n = len(files)
    print(f"=== SEO-/Meta-Audit · {n} Seiten (Top-Level) ===\n")

    counts = {"err": 0, "warn": 0}
    clean, noindexed = 0, 0
    gap_tally = {}
    for p in files:
        noindex, title, issues = audit_page(p)
        if noindex:
            noindexed += 1
        if not issues:
            clean += 1
            continue
        tag = " ·noindex" if noindex else ""
        print(f"{p.name}{tag}")
        for level, msg in issues:
            counts[level] += 1
            key = msg.split(" ")[0] + (" " + msg.split(" ")[1] if msg.startswith(("Title", "Description")) else "")
            gap_tally[msg.split(" (")[0].split(" ")[0]] = gap_tally.get(
                msg.split(" (")[0].split(" ")[0], 0) + 1
            mark = "✗" if level == "err" else "·"
            print(f"   {mark} {msg}")
        print()

    print("— Zusammenfassung —")
    print(f"  sauber:        {clean}/{n}")
    print(f"  noindex:       {noindexed} (von Indexier-Checks ausgenommen)")
    print(f"  harte Lücken:  {counts['err']} (Title/Description/Canonical)")
    print(f"  Hinweise:      {counts['warn']} (Länge/Social/JSON-LD/hreflang)")
    print("\nRein lesend — nichts geändert. "
          "Harte Lücken zuerst schließen (✗), dann die Hinweise (·).")


if __name__ == "__main__":
    main()
