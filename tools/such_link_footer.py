#!/usr/bin/env python3
# =============================================================================
#  such_link_footer.py — verlinkt die Seitensuche aus jeder Fusszeile
# -----------------------------------------------------------------------------
#  ⚠️ GEMESSEN 2026-08-27: die Suche deckt 2632 Seiten ab, war aber nur von
#  10 Seiten aus verlinkt (4 im Deutschen, je 2 in en/fr/it). Wer sie nicht
#  kannte, fand sie nicht — der teuerste Fehler bei einer Funktion, die es gibt.
#
#  Anker ist der Impressum-Link, den 2476 der 2612 Seiten in der Fusszeile führen.
#  Gewählt wird das LETZTE Vorkommen: 13 Seiten haben ihn zweimal (Kopf UND Fuss),
#  und in die Fusszeile gehört der Verweis. Gematcht wird auf die href, nicht auf
#  den Text — der heisst je nach Sprache „Mentions légales" oder „Note legali".
#
#  Aufruf:  python3 tools/such_link_footer.py [--fix]
# =============================================================================

import os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANKER = '<a href="/impressum.html"'
# Bereich -> (Ziel der Suche, Beschriftung)
SUCHE = {
    "en": ("/en/search.html", "Search"),
    "fr": ("/fr/recherche.html", "Recherche"),
    "it": ("/it/ricerca.html", "Ricerca"),
}
DEUTSCH = ("/suchmaschine.html", "Suche")
BEREICHE = ["", "vergleich", "maerkte", "themen", "dossier", "hype-watch", "en", "fr", "it"]


def ziel_fuer(bereich):
    return SUCHE.get(bereich, DEUTSCH)


def main():
    fix = "--fix" in sys.argv
    gesamt = geaendert = schon = ohne_anker = 0
    pro = {}
    for bereich in BEREICHE:
        verz = os.path.join(ROOT, bereich) if bereich else ROOT
        url, text = ziel_fuer(bereich)
        n = 0
        for pfad in sorted(glob.glob(os.path.join(verz, "*.html"))):
            name = os.path.basename(pfad)
            if name in {"404.html", "google.html"}:
                continue
            gesamt += 1
            html = open(pfad, encoding="utf-8", errors="ignore").read()
            # Die Suchseite selbst braucht keinen Verweis auf sich.
            if os.path.relpath(pfad, ROOT).replace(os.sep, "/") == url.lstrip("/"):
                continue
            if f'href="{url}"' in html:
                schon += 1
                continue
            i = html.rfind(ANKER)
            if i < 0:
                ohne_anker += 1
                continue
            # ⚠️ TRENNZEICHEN AUS DER SEITE ABLESEN, nicht annehmen. Der erste
            # Durchlauf setzte ueberall „ · " — die franzoesische Fusszeile reiht ihre
            # Links aber ohne Trenner aneinander (der Abstand kommt aus dem CSS).
            # Ergebnis war ein einzelnes „Recherche · Mentions légales" zwischen
            # trennerlosen Nachbarn. Also: das Zeichen VOR dem Anker uebernehmen.
            davor = html[:i].rstrip()
            if davor.endswith(("·", "|", "•", "–", "—", "/")):
                einschub = f'<a href="{url}">{text}</a> {davor[-1]} '
            else:
                # Trennerlose Fusszeile: nur ein Zeilenumbruch mit gleicher Einrueckung.
                # ⚠️ NUR DIE LEERZEICHEN UEBERNEHMEN, NICHT DIE GANZE ZEILE. Hier stand
                # der komplette Zeilenanfang, und der enthaelt auf manchen Seiten schon
                # ein offenes Tag: aus
                #     <span class="footbar-links"><a href="/impressum.html">…
                # wurde
                #     <span class="footbar-links"><a href="/suchmaschine.html">Suche</a>
                #     <span class="footbar-links"><a href="/impressum.html">…
                # — das aeussere <span> blieb offen. html-validate meldete auf der
                # STARTSEITE sieben close-order-Fehler; betroffen waren index.html und
                # maerkte.html.
                zeile = html[:i].split("\n")[-1]
                einzug = zeile[: len(zeile) - len(zeile.lstrip())]
                einschub = f'<a href="{url}">{text}</a>\n{einzug}'
            if fix:
                html = html[:i] + einschub + html[i:]
                open(pfad, "w", encoding="utf-8").write(html)
            geaendert += 1
            n += 1
        if n:
            pro[bereich or "ROOT"] = n
    print(f"{gesamt} Seiten geprüft · {schon} hatten den Link schon · "
          f"{ohne_anker} ohne Fusszeilen-Anker")
    if not geaendert:
        print("✔ alle Seiten verlinken die Suche")
        return 0
    verteilung = "  ".join(f"{k}:{v}" for k, v in sorted(pro.items(), key=lambda x: -x[1]))
    if fix:
        print(f"✔ {geaendert} Seiten ergänzt   {verteilung}")
        return 0
    print(f"⚠ {geaendert} Seiten ohne Such-Link   {verteilung}\n   → mit --fix ergänzen")
    return 1


if __name__ == "__main__":
    sys.exit(main())
