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
#  Nicht gemeldet werden Seiten, die selbst sagen, dass sie nicht gefunden werden
#  wollen: noindex-Seiten (Danke-, Zugangs-, Admin-, 404-Seiten) und erklärte
#  Dubletten (canonical auf eine andere URL). Ohne diese beiden Regeln bestand die
#  Auswertung zu 100 % aus Fehlalarm.
#
#  Aufruf:  python3 tools/verwaiste_seiten.py [--alle]
# =============================================================================

import os, re, sys, collections, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NICHT_SCANNEN = {"node_modules", "_site", ".git", "_manuscripts", "spiele-dev", "dropship", "data",
                 # Vorschau-Dateien aus der Videoproduktion, kein Teil des Auftritts
                 "video-prototypes"}
# Seiten, die BEWUSST ohne eingehenden Link leben. links.html ist die
# Link-in-Bio-Seite: sie wird aus Social-Profilen aufgerufen, nicht aus dem Auftritt.
GEWOLLT_OHNE_LINK = {"/links.html"}
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
    def kopf(pfad):
        try:
            return open(os.path.join(ROOT, pfad.lstrip("/")), encoding="utf-8", errors="ignore").read(4000)
        except Exception:
            return ""

    # Eine Seite, die auf eine ANDERE URL kanonisiert, ist eine erklaerte Dublette —
    # sie BRAUCHT keine eingehenden Links (gefunden an presse.html -> press.html).
    def dublette(pfad):
        m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', kopf(pfad), re.I)
        return bool(m and m.group(1).rstrip("/").split("/")[-1] != pfad.split("/")[-1])

    # ⚠️ EINE noindex-SEITE IST KEINE VERWAISTE SEITE. Sie sagt selbst, dass sie nicht
    # gefunden werden will: Danke-Seiten nach der Anmeldung, Zugangsseiten nach dem Kauf,
    # Admin-Werkzeuge, der interne Ops-Tracker, die 404-Seite. Ein eingehender Link waere
    # dort ein FEHLER, kein Ziel.
    # GEMESSEN am 29.08.2026: von 14 Befunden waren 14 solche Seiten — die Auswertung
    # bestand zu 100 % aus Fehlalarm, ein echter Verwaister waere darin untergegangen.
    # Das ist keine willkuerliche Ausnahmeliste, sondern die Regel, die die Seiten selbst
    # aufstellen; darum wird sie aus dem Dokument gelesen und nicht hier gepflegt.
    NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', re.I)

    def unsichtbar(pfad):
        return bool(NOINDEX.search(kopf(pfad)))

    verwaist = sorted(s for s in alle
                      if not eingehend[s] and s not in GEWOLLT_OHNE_LINK
                      and not dublette(s) and not unsichtbar(s))
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
