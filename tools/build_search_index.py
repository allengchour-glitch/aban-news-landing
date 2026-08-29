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
#  Ausgeschlossen: noindex-Seiten, /archive/ (alte Ausgaben), _site/, node_modules/.
#
#  SPRACHEN: en/ fr/ it/ bekommen je einen EIGENEN Index (site-index-en.json …).
#  Gemischte Treffer wären für beide Seiten Rauschen — wer auf /fr/ sucht, will
#  keine deutschen Seiten. Die Dateinamen dort sind aus dem Deutschen abgeleitet
#  (ki-*), der Inhalt ist übersetzt; die Kategorie-Erkennung greift deshalb auch.
#  Aufruf:  python3 tools/build_search_index.py
# =============================================================================

import json, re, os, glob, html as htmlmod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "site-index.json")
SKIP = {"404.html", "google.html"}

# Sprachordner -> (Index-Datei, Unterordner mit Kategorie)
SPRACHEN = {
    "en": [("maerkte", "markt"), ("dossier", "dossier")],
    "fr": [],
    "it": [],
}

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


def pick(html, pat, gruppe=1):
    m = re.search(pat, html, re.I | re.S)
    return (m.group(gruppe).strip() if m else "")


# ⚠️ GEMESSEN 2026-08-26: das alte Muster war content=["\'](.*?)["\'] — es akzeptierte
# JEDES Anführungszeichen als Ende. Bei content="L'IA pour les pizzerias …" endete der
# Treffer damit am Apostroph, und die Beschreibung war "L". Betroffen: 364 von 380
# französischen und 364 von 377 italienischen Seiten — also fast der gesamte Text, auf
# dem die neue Sprachsuche sucht. Die Rückreferenz \1 erzwingt dasselbe Zeichen zum
# Schliessen; deutsche Seiten waren zufällig unauffällig, weil sie kaum Apostrophe haben.
# Das Anführungszeichen als eigene Zeichenklasse — so bleibt der Ausdruck lesbar,
# statt in verschachtelten Escapes zu ertrinken.
Q = "[\"']"
DESC = '<meta[^>]+name=' + Q + 'description' + Q + '[^>]+content=(' + Q + ')(.*?)\\1'


def eintrag(path, url, kat):
    """Liest eine Seite und liefert den Index-Eintrag — oder None (noindex/kein Titel)."""
    try:
        html = open(path, encoding="utf-8", errors="ignore").read()
    except Exception:
        return None
    if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', html, re.I):
        return None
    # ⚠️ NUR "&amp;" VON HAND ZU ERSETZEN REICHT NICHT. Genau das stand hier, und
    # alles andere landete roh im Index: gemessen 75 unaufgeloeste Entities im
    # deutschen und 6 im englischen Index — "Buchhaltungs-Software f&uuml;r
    # Selbstst&auml;ndige", "aban API &mdash; KI-Texte". In den Suchergebnissen stand
    # das woertlich da, und schlimmer: wer "fuer" tippt, findet "f&uuml;r" nicht.
    # Der Index haelt KLARTEXT; die Suchseite escaped beim Anzeigen selbst (esc/hi),
    # deshalb ist das vollstaendige Aufloesen hier sicher und richtig.
    title = htmlmod.unescape(pick(html, r"<title>(.*?)</title>")).replace("\n", " ")
    title = re.sub(r"\s+", " ", title).strip()
    if not title:
        return None
    desc = htmlmod.unescape(pick(html, DESC, 2))
    desc = re.sub(r"\s+", " ", desc).strip()
    e = {"u": url, "t": title[:120], "d": desc[:180]}
    if kat:
        e["k"] = kat
    return e


def sammeln(basis, unterordner):
    """Alle Seiten eines Bereichs: Top-Ebene + genannte Unterordner."""
    treffer, proK = [], {}
    verz = os.path.join(ROOT, basis) if basis else ROOT
    prefix = "/" + basis + "/" if basis else "/"
    for path in sorted(glob.glob(os.path.join(verz, "*.html"))):
        name = os.path.basename(path)
        if name in SKIP:
            continue
        e = eintrag(path, prefix + name, kategorie_root(name))
        if e:
            treffer.append(e)
            proK[e.get("k", "seite")] = proK.get(e.get("k", "seite"), 0) + 1
    for ordner, kat in unterordner:
        for path in sorted(glob.glob(os.path.join(verz, ordner, "*.html"))):
            name = os.path.basename(path)
            if name in SKIP:
                continue
            e = eintrag(path, prefix + ordner + "/" + name, kat)
            if e:
                treffer.append(e)
                proK[kat] = proK.get(kat, 0) + 1
    return treffer, proK


def schreiben(datei, eintraege, proK, was):
    os.makedirs(os.path.dirname(datei), exist_ok=True)
    json.dump(eintraege, open(datei, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    verteilung = "  ".join(f"{k}:{v}" for k, v in sorted(proK.items(), key=lambda x: -x[1]))
    print(f"✔ {len(eintraege):5} Seiten → {os.path.relpath(datei, ROOT)} "
          f"({os.path.getsize(datei)/1024:.0f} KB)  {was}")
    if verteilung:
        print(f"        {verteilung}")


def main():
    entries, proK = [], {}
    entries, proK = sammeln("", UNTERORDNER)
    schreiben(OUT, entries, proK, "deutsch")
    for sprache, unter in SPRACHEN.items():
        e2, k2 = sammeln(sprache, unter)
        schreiben(os.path.join(ROOT, "data", f"site-index-{sprache}.json"), e2, k2, sprache)


if __name__ == "__main__":
    main()
