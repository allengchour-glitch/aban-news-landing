#!/usr/bin/env python3
# =============================================================================
#  build_search_index.py — baut data/site-index.json für die eigene Seitensuche
# -----------------------------------------------------------------------------
#  Scannt die indexierbaren Top-Level-HTML-Seiten (KI-Hubs, Kaufberater, Haupt-
#  seiten), zieht Titel + Meta-Description + URL und schreibt einen kompakten
#  JSON-Index für die clientseitige Volltextsuche (suchmaschine.html).
#
#  Ausgeschlossen: noindex-Seiten, _site/, node_modules/, das grosse /archive/.
#  Aufruf:  python3 tools/build_search_index.py
# =============================================================================

import json, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "site-index.json")
SKIP = {"404.html", "google.html"}


def pick(html, pat):
    m = re.search(pat, html, re.I | re.S)
    return (m.group(1).strip() if m else "")


def main():
    entries = []
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(path)
        if name in SKIP:
            continue
        try:
            html = open(path, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', html, re.I):
            continue
        title = pick(html, r"<title>(.*?)</title>").replace("&amp;", "&").replace("\n", " ")
        title = re.sub(r"\s+", " ", title).strip()
        if not title:
            continue
        desc = pick(html, r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']')
        desc = re.sub(r"\s+", " ", desc.replace("&amp;", "&")).strip()
        entries.append({"u": "/" + name, "t": title[:120], "d": desc[:180]})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(entries, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"✔ {len(entries)} Seiten → data/site-index.json ({os.path.getsize(OUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
