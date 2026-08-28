#!/usr/bin/env python3
# =============================================================================
#  verwaiste_seiten.py — Seiten, die von KEINER anderen Seite verlinkt sind
# -----------------------------------------------------------------------------
#  Eine Seite ohne eingehenden Link ist für Besucher unerreichbar: man kommt nur
#  hin, wenn man die Adresse kennt oder sie über die Suche findet. Suchmaschinen
#  bewerten solche Seiten schwach, weil kein interner Link auf sie zeigt.
#
#  Gezählt werden nur ECHTE Inhaltsverweise: Links, die eine Seite auf eine andere
#  setzt. Selbstverweise (canonical, hreflang, die eigene URL) zählen nicht — sonst
#  gilt jede Seite als verlinkt und die Auswertung ist wertlos.
#
#  Aufruf:  python3 tools/verwaiste_seiten.py [--alle]
# =============================================================================

import os, re, sys, collections, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NICHT_SCANNEN = {"node_modules", "_site", ".git", "_manuscripts", "spiele-dev", "dropship", "data"}
LINK = re.compile(r'href\s*=\s*(["\'])(.*?)\1', re.I)
# ⚠️ Die EIGENE Domain ist NICHT extern. Der erste Lauf meldete sechs englische
# Werkzeug-Seiten als verwaist — sie sind laengst verlinkt, aber per absolutem
# hreflang (https://abannews.com/en/…), und genau das verwarf dieser Regex.
EIGEN = re.compile(r'^https?://(www\.)?abannews\.com', re.I)
EXTERN = re.compile(r'^(https?:|mailto:|tel:|data:|javascript:|about:|#|//)', re.I)
UNSICHTBAR = re.compile(r"<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>", re.I | re.S)
BAUSTEIN = re.compile(r'[\'"+{}$\\]|\s')


def seiten():
    for verz, unter, dateien in os.walk(ROOT):
        unter[:] = [u for u in unter if u not in NICHT_SCANNEN and not u.startswith(".")]
        for d in dateien:
            if d.endswith(".html"):
                yield os.path.join(verz, d)


def main():
    alle, eingehend = set(), collections.Counter()
    for pfad in seiten():
        rel = "/" + os.path.relpath(pfad, ROOT).replace(os.sep, "/")
        alle.add(rel)
    for pfad in seiten():
        rel = "/" + os.path.relpath(pfad, ROOT).replace(os.sep, "/")
        html = UNSICHTBAR.sub(" ", open(pfad, encoding="utf-8", errors="ignore").read())
        for _, ziel in LINK.findall(html):
            ziel = ziel.strip().split("#")[0].split("?")[0]
            if EIGEN.match(ziel):                 # eigene Domain -> auf den Pfad kuerzen
                ziel = "/" + EIGEN.sub("", ziel).lstrip("/")
            if not ziel or EXTERN.match(ziel) or BAUSTEIN.search(ziel):
                continue
            if not ziel.startswith("/"):
                ziel = urllib.parse.urljoin(rel, ziel)
            ziel = urllib.parse.unquote(ziel)
            if ziel.endswith("/"):
                ziel += "index.html"
            elif ziel not in alle and ziel + ".html" in alle:
                ziel += ".html"
            if ziel == rel:            # Selbstverweis zählt nicht
                continue
            if ziel in alle:
                eingehend[ziel] += 1
    verwaist = sorted(s for s in alle if not eingehend[s])
    print(f"{len(alle)} Seiten · {len(verwaist)} ohne eingehenden Link")
    if not verwaist:
        return 0
    proO = collections.Counter(s.strip("/").split("/")[0] if s.count("/") > 1 else "ROOT"
                               for s in verwaist)
    for k, v in proO.most_common():
        print(f"   {v:4}  {k}")
    zeigen = verwaist if "--alle" in sys.argv else verwaist[:30]
    print()
    for s in zeigen:
        print("  ", s)
    if len(zeigen) < len(verwaist):
        print(f"\n   … {len(verwaist)-len(zeigen)} weitere (mit --alle)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
