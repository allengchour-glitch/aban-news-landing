#!/usr/bin/env python3
# =============================================================================
#  link_check.py — findet tote interne Links über den ganzen Auftritt
# -----------------------------------------------------------------------------
#  Prüft jeden internen href/src gegen den echten Dateibestand. Berücksichtigt:
#    * Verzeichnis-URLs (/en/ -> en/index.html)
#    * Pretty URLs ohne .html (/impressum -> impressum.html)
#    * die Regeln aus _redirects (sonst gäbe es hunderte Fehlalarme)
#    * Anker (#…) und Query (?…) werden abgeschnitten
#  Externe Links (http, mailto, tel), data:-URIs und javascript: bleiben aussen vor —
#  die kann nur ein Netzabruf prüfen, und der gehört nicht in einen Build.
#
#  Aufruf:  python3 tools/link_check.py [--alle]
#           --alle zeigt jeden Fund statt der Top-Liste
# =============================================================================

import os, re, sys, collections, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# ⚠️ ZWEI VERSCHIEDENE LISTEN — beim ersten Versuch war es eine, und das kostete
# prompt zwei Fehlalarme: data/ wurde ausgeschlossen und damit auch data/glossary.json
# aus dem Dateibestand entfernt, obwohl die Datei existiert und verlinkt wird.
# NICHT_SCANNEN = Seiten, die nicht als QUELLE zählen.
# NICHT_INVENTAR = Verzeichnisse, deren Dateien es auch als ZIEL nicht gibt.
NICHT_INVENTAR = {"node_modules", "_site", ".git"}
NICHT_SCANNEN = NICHT_INVENTAR | {"_manuscripts", "spiele-dev",
                                  # Shopify-Theme-Bausteine eines fremden Shops
                                  "dropship",
                                  # Newsletter-Entwürfe mit Platzhaltern wie [NEWS_1_URL]
                                  "data"}
LINK = re.compile(r'(?:href|src)\s*=\s*(["\'])(.*?)\1', re.I)
EXTERN = re.compile(r'^(https?:|mailto:|tel:|data:|javascript:|about:|blob:|#|//)', re.I)
# ⚠️ Der Regex findet auch hrefs INNERHALB von JavaScript-Zeichenketten, etwa
#    '<a href="/'+esc(it.u)+'">'  ->  Ziel "/'+esc(it.u)+'"
# Beim ersten Lauf waren 60 der 81 „toten Ziele" von dieser Sorte. Solche Stücke
# enthalten immer Anführungszeichen, Pluszeichen oder geschweifte Klammern —
# echte URLs nie. Sonst meldet das Werkzeug lauter Phantome und wird ignoriert.
BAUSTEIN = re.compile(r'[\'"+{}$\\]|\s')


def funktionsrouten():
    """Cloudflare-Pages-Functions sind echte URLs ohne Datei im Repo:
       functions/go/ebay.js -> /go/ebay. Ohne sie meldete der erste Lauf die
       164 Affiliate-Links auf /go/ebay als tot — sie funktionieren einwandfrei."""
    routen = set()
    basis = os.path.join(ROOT, "functions")
    if not os.path.isdir(basis):
        return routen
    for verz, _u, dateien in os.walk(basis):
        for d in dateien:
            if not d.endswith(".js") or d.startswith("_") or ".test." in d:
                continue
            rel = os.path.relpath(os.path.join(verz, d), basis).replace(os.sep, "/")
            routen.add("/" + rel[:-3])
    return routen


def redirects():
    """Quellen aus _redirects — Ziel egal, Hauptsache die URL ist nicht tot."""
    ziele = set()
    pfad = os.path.join(ROOT, "_redirects")
    if not os.path.exists(pfad):
        return ziele
    for zeile in open(pfad, encoding="utf-8"):
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#"):
            continue
        teile = zeile.split()
        if teile:
            ziele.add(teile[0].rstrip("/") or "/")
    return ziele


# ⚠️ Kommentare und Skripte VORHER entfernen. Zwei ganze Fehlerklassen kamen daher:
#  * <!-- Vorlage zum Kopieren: <a href="AFFILIATE-URL"> --> in deals.html/kurse.html
#  * el("code").textContent = '<link href="/favicon-32.png">' in favicon-generator.html
# Beides sind Beispiele für Leser, keine Verweise. Echte Navigation steht nie in
# einem <script>; was JavaScript zur Laufzeit baut, kann dieses Werkzeug ohnehin
# nicht prüfen — es meldete davon nur Bruchstücke.
UNSICHTBAR = re.compile(r"<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>", re.I | re.S)


def seiten():
    for verz, unter, dateien in os.walk(ROOT):
        unter[:] = [u for u in unter if u not in NICHT_SCANNEN and not u.startswith(".")]
        for d in dateien:
            if d.endswith(".html"):
                yield os.path.join(verz, d)


def main():
    weiterleitungen = redirects()
    routen = funktionsrouten()
    vorhanden = set()
    for verz, unter, dateien in os.walk(ROOT):
        unter[:] = [u for u in unter if u not in NICHT_INVENTAR and not u.startswith(".")]
        for d in dateien:
            rel = os.path.relpath(os.path.join(verz, d), ROOT).replace(os.sep, "/")
            vorhanden.add("/" + rel)

    def erreichbar(ziel):
        if ziel in vorhanden:
            return True
        if ziel.endswith("/") and ziel + "index.html" in vorhanden:
            return True
        if ziel == "/":
            return "/index.html" in vorhanden
        if ziel + ".html" in vorhanden:          # Pretty URL
            return True
        if ziel + "/index.html" in vorhanden:    # Verzeichnis ohne Schrägstrich
            return True
        if ziel.rstrip("/") in weiterleitungen:
            return True
        return ziel.rstrip("/") in routen

    tot = collections.Counter()
    quellen = collections.defaultdict(set)
    geprueft = seiten_n = 0
    for pfad in seiten():
        rel = "/" + os.path.relpath(pfad, ROOT).replace(os.sep, "/")
        seiten_n += 1
        try:
            html = UNSICHTBAR.sub(" ", open(pfad, encoding="utf-8", errors="ignore").read())
        except Exception:
            continue
        for _, ziel in LINK.findall(html):
            ziel = ziel.strip()
            if not ziel or EXTERN.match(ziel):
                continue
            ziel = ziel.split("#")[0].split("?")[0]
            if not ziel or BAUSTEIN.search(ziel):
                continue
            if not ziel.startswith("/"):        # relativ zur eigenen Seite auflösen
                ziel = urllib.parse.urljoin(rel, ziel)
            ziel = urllib.parse.unquote(ziel)
            geprueft += 1
            if not erreichbar(ziel):
                tot[ziel] += 1
                quellen[ziel].add(rel)

    print(f"{seiten_n} Seiten · {geprueft} interne Links geprüft")
    if not tot:
        print("✔ keine toten internen Links")
        return 0
    summe = sum(tot.values())
    print(f"⚠ {len(tot)} tote Ziele in {summe} Verweisen:\n")
    zeigen = tot.most_common() if "--alle" in sys.argv else tot.most_common(25)
    for ziel, n in zeigen:
        bsp = sorted(quellen[ziel])[:2]
        print(f"  {n:5}×  {ziel}")
        print(f"          z. B. {', '.join(bsp)}")
    if len(zeigen) < len(tot):
        print(f"\n  … {len(tot)-len(zeigen)} weitere (mit --alle zeigen)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
