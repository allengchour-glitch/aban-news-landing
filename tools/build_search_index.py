#!/usr/bin/env python3
# =============================================================================
#  build_search_index.py — baut data/site-index.json für die eigene Seitensuche
# -----------------------------------------------------------------------------
#  Scannt ALLE indexierbaren deutschsprachigen Seiten: die Top-Ebene (KI-Guides,
#  Kaufberater, Rechner, Werkzeuge) UND die Inhalts-Unterordner. Pro Seite:
#  URL, Titel, Meta-Description und ein Kategorie-Kürzel für Filter + Badge.
#
#  ⚠️ GEMESSEN 2026-08-26: der Scan lief nur über ROOT/*.html. Damit waren
#  293 deutsche Seiten NICHT auffindbar — 197 Vergleiche, 42 Märkte, 21 Themen,
#  21 Minispiele, 7 Dossiers, 5 Hype-Watch. Wer eine neue Rubrik als Unterordner
#  anlegt, muss sie hier eintragen, sonst existiert sie für die Suche nicht.
#
#  Ausgeschlossen: noindex-Seiten, /archive/ (alte Ausgaben), _site/,
#  node_modules/ sowie en/ fr/ it/ — die Übersetzungen brauchen eine eigene
#  Suche in ihrer Sprache, gemischte Treffer wären für beide Seiten Rauschen.
#  Aufruf:  python3 tools/build_search_index.py
# =============================================================================

import json, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "site-index.json")
SKIP = {"404.html", "google.html"}

# Inhalts-Unterordner mit ihrem Kategorie-Kürzel (Reihenfolge = Anzeige-Reihenfolge)
UNTERORDNER = [
    ("vergleich", "vgl"),
    ("maerkte", "markt"),
    ("themen", "thema"),
    ("minispiele", "spiel"),
    ("dossier", "dossier"),
    ("hype-watch", "hype"),
]

# Kategorien der Top-Ebene aus dem Dateinamen — die Muster sind gezählt, nicht geraten:
# 458x ki-*, 270x *-kaufen-schweiz, 58x *rechner*, 24x *generator*.
def kategorie_root(name):
    if name.startswith("ki-"):
        return "ki"
    if name.endswith("-kaufen-schweiz.html"):
        return "kauf"
    if "rechner" in name:
        return "rechner"
    if "generator" in name:
        return "tool"
    return ""


def pick(html, pat):
    m = re.search(pat, html, re.I | re.S)
    return (m.group(1).strip() if m else "")


def eintrag(path, url, kat):
    """Liest eine Seite und liefert den Index-Eintrag — oder None (noindex/kein Titel)."""
    try:
        html = open(path, encoding="utf-8", errors="ignore").read()
    except Exception:
        return None
    if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', html, re.I):
        return None
    title = pick(html, r"<title>(.*?)</title>").replace("&amp;", "&").replace("\n", " ")
    title = re.sub(r"\s+", " ", title).strip()
    if not title:
        return None
    desc = pick(html, r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']')
    desc = re.sub(r"\s+", " ", desc.replace("&amp;", "&")).strip()
    e = {"u": url, "t": title[:120], "d": desc[:180]}
    if kat:
        e["k"] = kat
    return e


def main():
    entries, proK = [], {}
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(path)
        if name in SKIP:
            continue
        e = eintrag(path, "/" + name, kategorie_root(name))
        if e:
            entries.append(e)
            proK[e.get("k", "seite")] = proK.get(e.get("k", "seite"), 0) + 1
    for ordner, kat in UNTERORDNER:
        for path in sorted(glob.glob(os.path.join(ROOT, ordner, "*.html"))):
            name = os.path.basename(path)
            if name in SKIP:
                continue
            e = eintrag(path, "/" + ordner + "/" + name, kat)
            if e:
                entries.append(e)
                proK[kat] = proK.get(kat, 0) + 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(entries, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    verteilung = "  ".join(f"{k}:{v}" for k, v in sorted(proK.items(), key=lambda x: -x[1]))
    print(f"✔ {len(entries)} Seiten → data/site-index.json ({os.path.getsize(OUT)/1024:.0f} KB)")
    print(f"  {verteilung}")


if __name__ == "__main__":
    main()
