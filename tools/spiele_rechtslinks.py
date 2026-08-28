#!/usr/bin/env python3
# =============================================================================
#  spiele_rechtslinks.py — Rechtslinks für die Vollbild-Spiele
# -----------------------------------------------------------------------------
#  Die 18 Vollbild-Seiten (body overflow:hidden) können keine Fusszeile tragen —
#  rechtslinks_footer.py lässt sie deshalb bewusst aus. Ohne Ersatz sind sie
#  trotzdem Sackgassen ohne Impressum.
#
#  ⚠️ ES GIBT KEINEN GEMEINSAMEN ANKER: nur 2 von 11 Minispielen haben eine
#  Topbar, nur 3 von 7 grossen Spielen ein Start-Overlay. Ein Einschub „an die
#  passende Stelle" müsste also raten — und genau das ist beim Fusszeilen-Werkzeug
#  schiefgegangen (die Links landeten im Spiele-Raster von minispiele/index.html).
#
#  Darum strukturunabhängig: eine kleine, feste Ecke unten links, halbtransparent,
#  über allem (z-index), mit `pointer-events` nur auf sich selbst — der Rest der
#  Seite bleibt vollständig bedienbar. Jede Seite wird danach im Bild geprüft.
#
#  Aufruf:  python3 tools/spiele_rechtslinks.py [--fix]
# =============================================================================

import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKE = "aban-recht"           # damit der Lauf wiederholbar bleibt
BODY_REGEL = re.compile(r"body\s*\{[^}]*\}", re.I)
OHNE_SCROLL = re.compile(r"overflow\s*:\s*hidden", re.I)
HAT_IMPRESSUM = re.compile(r'href="[^"]*(?:/|^)impressum(?:\.html)?"', re.I)
NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', re.I)

# ⚠️ GEMESSEN, nicht geraten: in traumhaus.html liegt im Querformat der Joystick
# unten links (12..124 x 266..378) — die Ecke sass genau darauf. Ein Rastertest über
# acht Randpositionen im laufenden Spiel ergab: unten links = Joystick, oben links =
# Geldanzeige, oben Mitte = Uhr, oben rechts = Stufenbox; unten Mitte und unten rechts
# sind frei. UNTEN RECHTS war trotzdem falsch: dort reicht der Zoom-Knopf (786..834 x
# 332..380) in den Streifen und wurde zu einem Drittel verdeckt — der Rastertest hatte
# nur die Mitte der Kandidatenflaeche geprueft, nicht ihre Raender. Unten MITTE ist frei,
# auch wenn die Auftrags-Knoepfe erscheinen (die sitzen bei bottom:66px und hoeher).
# Seiten ohne Eintrag bekommen unten links.
POSITION = {"traumhaus.html": "left:50%;transform:translateX(-50%);bottom:4px",
            # ballon-pump teilt den Schirm in zwei Tippflaechen (half0/half1);
            # frei bleibt nur der schmale Streifen unten in der Mitte.
            "minispiele/ballon-pump.html": "left:50%;transform:translateX(-50%);bottom:4px"}
STANDARD = "left:6px;bottom:4px"

ECKE = ('<div id="' + MARKE + '" style="position:fixed;{pos};z-index:99999;'
        'font:11px/1.5 system-ui,sans-serif;opacity:.45;pointer-events:auto;'
        'background:rgba(0,0,0,.35);color:#fff;padding:2px 7px;border-radius:7px">'
        '<a href="/impressum.html" style="color:inherit;text-decoration:none">Impressum</a> · '
        '<a href="/datenschutz.html" style="color:inherit;text-decoration:none">Datenschutz</a>'
        '</div>\n')


def vollbild(html):
    m = BODY_REGEL.search(html)
    return bool(m and OHNE_SCROLL.search(m.group(0)))


def main():
    fix = "--fix" in sys.argv
    offen, schon = [], 0
    for pfad in sorted(glob.glob(os.path.join(ROOT, "*.html")) +
                       glob.glob(os.path.join(ROOT, "minispiele", "*.html"))):
        html = open(pfad, encoding="utf-8", errors="ignore").read()
        if not vollbild(html) or NOINDEX.search(html):
            continue
        rel = os.path.relpath(pfad, ROOT)
        if MARKE in html or HAT_IMPRESSUM.search(html):
            schon += 1
            continue
        i = html.rfind("</body>")
        if i < 0:
            print(f"   ⚠ {rel}: kein </body> — übersprungen")
            continue
        if fix:
            ecke = ECKE.replace("{pos}", POSITION.get(rel, STANDARD))
            open(pfad, "w", encoding="utf-8").write(html[:i] + ecke + html[i:])
        offen.append(rel)
    if not offen:
        print(f"✔ alle {schon} Vollbild-Spiele haben ihre Rechtslinks")
        return 0
    print(f"{'✔' if fix else '⚠'} {len(offen)} Vollbild-Spiele "
          f"{'ergänzt' if fix else 'ohne Rechtslinks'} ({schon} hatten sie schon)")
    for r in offen:
        print("   ", r)
    return 0 if fix else 1


if __name__ == "__main__":
    sys.exit(main())
