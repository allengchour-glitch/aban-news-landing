#!/usr/bin/env python3
# =============================================================================
#  sitemap_luecken.py — findet Seiten, die es GIBT, die aber in der sitemap.xml
#  fehlen (und trägt sie auf Wunsch nach).
# -----------------------------------------------------------------------------
#  ⚠️ WARUM ES DAS GIBT (gemessen 2026-08-26): es existiert kein Generator, der
#  die sitemap.xml aus dem Dateibestand neu baut — `refresh_sitemap_lastmod.py`
#  aktualisiert nur die Daten vorhandener Einträge. Neue Seiten landen also nur
#  dann darin, wenn das anlegende Werkzeug daran gedacht hat. Ergebnis waren
#  29 deutsche Seiten, die Google nicht kannte: alle 21 Minispiele und 8 Märkte.
#
#  Aufruf:  python3 tools/sitemap_luecken.py          # nur berichten
#           python3 tools/sitemap_luecken.py --fix    # fehlende nachtragen
# =============================================================================

import os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
BASIS = "https://abannews.com/"
# Ordner, deren Seiten in die Sitemap gehören. /archive/ bleibt draussen (alte
# Ausgaben), node_modules/_site sowieso.
ORDNER = ["", "vergleich", "maerkte", "themen", "minispiele", "dossier", "hype-watch",
          "en", "fr", "it"]
SKIP = {"404.html", "google.html"}
# Wie oft ändert sich was — grob nach Rubrik, damit Crawler nicht täglich alles holen.
TAKT = {"maerkte": ("daily", "0.6"), "hype-watch": ("weekly", "0.6"),
        "minispiele": ("monthly", "0.6"), "vergleich": ("monthly", "0.7")}


def seiten():
    """Alle indexierbaren Seiten als URL-Pfad (ohne Domain)."""
    raus = []
    for d in ORDNER:
        verz = os.path.join(ROOT, d) if d else ROOT
        if not os.path.isdir(verz):
            continue
        for name in sorted(os.listdir(verz)):
            if not name.endswith(".html") or name in SKIP:
                continue
            pfad = os.path.join(verz, name)
            try:
                html = open(pfad, encoding="utf-8", errors="ignore").read(4000)
            except Exception:
                continue
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', html, re.I):
                continue
            raus.append((d + "/" + name if d else name, d))
    return raus


def dubletten_weg(xml):
    """Behaelt je URL den ERSTEN <url>-Block. Vorgefunden: 13 doppelte Eintraege
    (Kaufberater und Vorlagen) — doppelte <loc> sind kein Fehler, aber unnoetiges
    Rauschen fuer Crawler und ein Zeichen, dass zwei Werkzeuge dieselbe Seite
    eingetragen haben."""
    gesehen, weg = set(), 0

    def einer(m):
        nonlocal weg
        block = m.group(0)
        loc = re.search(r"<loc>(.*?)</loc>", block)
        if not loc:
            return block
        if loc.group(1) in gesehen:
            weg += 1
            return ""
        gesehen.add(loc.group(1))
        return block

    xml = re.sub(r"[ \t]*<url>.*?</url>\n?", einer, xml, flags=re.S)
    return xml, weg


def main():
    xml = open(SITEMAP, encoding="utf-8").read()
    alle = re.findall(r"<loc>(.*?)</loc>", xml)
    doppelt = len(alle) - len(set(alle))
    drin = set(re.findall(r"<loc>(.*?)</loc>", xml))
    # ⚠️ Startseiten stehen als Verzeichnis-URL drin (".../" statt ".../index.html").
    # Ohne diese Gleichsetzung meldete der erste Lauf index.html, en/index.html,
    # fr/ und it/ als fehlend — --fix haette vier Dubletten derselben Seite angelegt.
    def bekannt(pfad):
        if BASIS + pfad in drin:
            return True
        if pfad.endswith("index.html"):
            return BASIS + pfad[: -len("index.html")] in drin
        return False

    fehlt = [(p, d) for p, d in seiten() if not bekannt(p)]
    if not fehlt and not doppelt:
        print(f"✔ sitemap.xml vollständig und dublettenfrei ({len(drin)} URLs)")
        return 0
    if doppelt:
        print(f"⚠ {doppelt} doppelte Einträge in der sitemap.xml")
    if not fehlt and doppelt and "--fix" not in sys.argv:
        print("   → mit --fix bereinigen")
        return 1
    proO = {}
    if not fehlt and "--fix" in sys.argv:
        xml, weg = dubletten_weg(xml)
        open(SITEMAP, "w", encoding="utf-8").write(xml)
        print(f"✔ {weg} Dubletten entfernt → sitemap.xml")
        return 0
    for _, d in fehlt:
        proO[d or "ROOT"] = proO.get(d or "ROOT", 0) + 1
    print(f"⚠ {len(fehlt)} Seiten fehlen in der sitemap.xml:")
    for k, v in sorted(proO.items(), key=lambda x: -x[1]):
        print(f"   {v:4}  {k}")
    if "--fix" not in sys.argv:
        print("   → mit --fix nachtragen")
        return 1
    heute = datetime.date.today().isoformat()
    zeilen = []
    for p, d in fehlt:
        freq, prio = TAKT.get(d, ("monthly", "0.6"))
        zeilen.append(f"<url><loc>{BASIS}{p}</loc><lastmod>{heute}</lastmod>"
                      f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>")
    xml = xml.replace("</urlset>", "\n".join(zeilen) + "\n</urlset>")
    xml, weg = dubletten_weg(xml)
    open(SITEMAP, "w", encoding="utf-8").write(xml)
    print(f"✔ {len(zeilen)} Seiten nachgetragen, {weg} Dubletten entfernt → sitemap.xml")
    return 0


if __name__ == "__main__":
    sys.exit(main())
