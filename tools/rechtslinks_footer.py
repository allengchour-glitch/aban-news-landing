#!/usr/bin/env python3
# =============================================================================
#  rechtslinks_footer.py — ergänzt fehlende Impressum-/Datenschutz-Links
# -----------------------------------------------------------------------------
#  ⚠️ GEMESSEN 2026-08-27: 116 öffentliche Seiten verlinkten WEDER Impressum NOCH
#  Datenschutz — anders als die übrigen 2476. Darunter Rechner, Vorlagen und alle
#  Minispiele. In der Schweiz gehört ein Impressum auf jede geschäftlich genutzte
#  Seite; unabhängig davon ist eine Seite ohne diese Verweise eine Sackgasse.
#
#  Zwei Fälle, die der erste Blick unterschied:
#    79 Seiten HABEN eine Fusszeile (ohne Rechtslinks) -> Links hineinsetzen
#    37 Seiten haben GAR KEINE Fusszeile               -> schlichte Fusszeile anlegen
#  20 weitere Seiten sind `noindex` (Dashboards, interne Werkzeuge, Spiel-Prototypen)
#  und bleiben unberührt — sie sind nicht für Besucher bestimmt.
#
#  Aufruf:  python3 tools/rechtslinks_footer.py [--fix]
# =============================================================================

import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEREICHE = ["", "vergleich", "maerkte", "themen", "dossier", "hype-watch",
            "minispiele", "en", "fr", "it"]
# Bereich -> (Such-URL, Suchtext, Impressumtext, Datenschutztext)
TEXTE = {
    "en": ("/en/search.html", "Search", "Imprint", "Privacy"),
    "fr": ("/fr/recherche.html", "Recherche", "Mentions légales", "Confidentialité"),
    "it": ("/it/ricerca.html", "Ricerca", "Note legali", "Privacy"),
}
DEUTSCH = ("/suchmaschine.html", "Suche", "Impressum", "Datenschutz")
# ⚠️ GEMESSEN nach dem ersten Lauf: die Pruefung war '<a href="/impressum.html"' —
# mrr.html verlinkt sein Impressum aber ABSOLUT (https://abannews.com/impressum, ohne
# .html) und galt deshalb als "fehlt". Ergebnis war ein zweiter, ueberfluessiger
# Linksatz. Erkannt wird jetzt jede Schreibweise.
HAT_IMPRESSUM = re.compile(r'href="[^"]*(?:/|^)impressum(?:\.html)?"', re.I)
NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', re.I)
# ⚠️ VOLLBILD-SEITEN AUSNEHMEN. Der erste Durchlauf hängte auch an traumhaus.html und
# 17 weitere Spiele eine Fusszeile — deren `body` hat `overflow:hidden`, die Zeile wäre
# also unsichtbar UND unerreichbar gewesen. Auffallen wäre es nie: der Diff sah sauber
# aus. Solche Seiten brauchen ihre Rechtslinks in der eigenen Oberfläche (Startbildschirm),
# und das ist eine Gestaltungsentscheidung pro Spiel, keine Sache eines Sammel-Skripts.
BODY_REGEL = re.compile(r"body\s*\{[^}]*\}", re.I)
OHNE_SCROLL = re.compile(r"overflow\s*:\s*hidden", re.I)


def vollbild(html):
    m = BODY_REGEL.search(html)
    return bool(m and OHNE_SCROLL.search(m.group(0)))
HAT_FOOTER = re.compile(r"<footer\b", re.I)
# Schlichte Fusszeile für Seiten ohne jede — bewusst mit Inline-Stil: die 37 Seiten
# bringen zehn verschiedene Stylesheets mit, eine Klasse träfe nur einen Teil davon.
# `color:inherit` statt Browser-Blau: die 19 Seiten bringen kein Link-Design für
# Fusszeilen mit, und im Screenshot stachen die Verweise als grelle blaue Standard-
# links heraus. Geerbt passt die Farbe auf jedem Untergrund.
NEUE_FUSSZEILE = ('<footer style="margin:2.5rem auto 1.5rem;padding:1rem;text-align:center;'
                  'font-size:.85rem;line-height:1.7;opacity:.75">'
                  '<style>footer a{{color:inherit}}</style>{links}</footer>\n')


def teile(bereich):
    return TEXTE.get(bereich, DEUTSCH)


def linkzeile(bereich):
    url, such, imp, ds = teile(bereich)
    return (f'<a href="{url}">{such}</a> · '
            f'<a href="/impressum.html">{imp}</a> · '
            f'<a href="/datenschutz.html">{ds}</a>')


def main():
    fix = "--fix" in sys.argv
    hinein = angelegt = uebersprungen = 0
    vollbild_n = []
    for bereich in BEREICHE:
        verz = os.path.join(ROOT, bereich) if bereich else ROOT
        for pfad in sorted(glob.glob(os.path.join(verz, "*.html"))):
            name = os.path.basename(pfad)
            if name in {"404.html", "google.html"}:
                continue
            html = open(pfad, encoding="utf-8", errors="ignore").read()
            if HAT_IMPRESSUM.search(html):
                continue
            if NOINDEX.search(html):
                uebersprungen += 1
                continue
            if vollbild(html):
                vollbild_n.append(os.path.relpath(pfad, ROOT))
                continue
            zeile = linkzeile(bereich)
            if HAT_FOOTER.search(html):
                # In die vorhandene Fusszeile, vor deren Schluss. Steht dort ein
                # Container, gehört der Text hinein — sonst sitzt er ausserhalb des
                # Layouts und bricht die Zentrierung.
                i = html.rfind("</footer>")
                if i < 0:
                    continue
                # ⚠️ Das </div> muss INNERHALB der Fusszeile liegen. Der erste Lauf
                # suchte nur "irgendein </div> vor </footer>" — in minispiele/index.html
                # landeten die Links dadurch im Spiele-Raster (<div class="grid">), das
                # JavaScript anschliessend neu befuellt. Die Zeile war damit weg.
                fo = html.rfind("<footer", 0, i)
                j = html.rfind("</div>", fo, i) if fo >= 0 else -1
                if j > fo:
                    stelle, trenner = j, " · "
                else:
                    stelle, trenner = i, " "
                if fix:
                    html = html[:stelle] + trenner + zeile + html[stelle:]
                    open(pfad, "w", encoding="utf-8").write(html)
                hinein += 1
            else:
                i = html.rfind("</body>")
                if i < 0:
                    continue
                if fix:
                    html = html[:i] + NEUE_FUSSZEILE.format(links=zeile) + html[i:]
                    open(pfad, "w", encoding="utf-8").write(html)
                angelegt += 1
    gesamt = hinein + angelegt
    print(f"{uebersprungen} noindex-Seiten übersprungen (Dashboards, interne Werkzeuge)")
    if vollbild_n:
        print(f"{len(vollbild_n)} Vollbild-Seiten übersprungen (body overflow:hidden — "
              f"eine Fusszeile wäre dort unsichtbar): {', '.join(vollbild_n[:4])} …")
    if not gesamt:
        print("✔ alle öffentlichen Seiten verlinken Impressum und Datenschutz")
        return 0
    was = "ergänzt" if fix else "ohne Rechtslinks"
    print(f"{'✔' if fix else '⚠'} {gesamt} Seiten {was}: "
          f"{hinein} in vorhandene Fusszeile, {angelegt} neue Fusszeile")
    return 0 if fix else 1


if __name__ == "__main__":
    sys.exit(main())
