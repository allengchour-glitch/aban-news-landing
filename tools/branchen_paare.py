#!/usr/bin/env python3
"""Verbindet die beiden Branchen-Seitenfamilien miteinander.

Gemessen am 18.10.2026: fuer 21 Branchen gibt es BEIDE Seiten — den
Ratgeber `ki-fuer-<branche>.html` (8-37 eingehende Links) und die
Verkaufsseite `ki-sichtbarkeit-<branche>.html` (2 eingehende Links,
9 EUR/Monat Monitor). **Keine einzige** verlinkte ihre Zwillingsseite,
in keiner Richtung. Wer den Ratgeber las, erfuhr nie, dass es fuer genau
seine Branche ein Angebot gibt.

Das Skript setzt in beide Richtungen einen markierten Block. Es ist
idempotent: ein vorhandener Block wird ersetzt, nicht verdoppelt.
Der Text wird nie erfunden — Branchenname und Preis kommen aus der
Zielseite selbst (<title> bzw. Preis-Kasten).
"""
from __future__ import annotations
import html as htmlmod
import pathlib
import re

WURZEL = pathlib.Path(__file__).resolve().parent.parent

# Exakte Slug-Treffer finden sich von selbst. Diese fuenf Paare heissen
# verschieden und sind einzeln an den <title>n beider Seiten geprueft.
HANDPAARE = {
    "kanzleien": "anwaelte",
    "praxen": "aerzte",
    "steuerberatung": "steuerberater",
    "physiotherapie": "physiotherapeuten",
    "handwerk": "handwerker",
}

MARKE_RAT = "ls-branche-angebot-v1"      # auf ki-fuer-… : Link zum Angebot
MARKE_VERK = "ls-branche-ratgeber-v1"    # auf ki-sichtbarkeit-… : Link zum Ratgeber

BLOCK_RAT = re.compile(
    r'\n?<aside data-aban-branchen-paar\b.*?</aside>', re.S)
BLOCK_VERK = re.compile(
    r'\n?<aside data-aban-branchen-ratgeber\b.*?</aside>', re.S)

TITEL = re.compile(r"<title>(.*?)</title>", re.S)
PREIS = re.compile(
    r'<div class="price">\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*€\s*<small>(.*?)</small>', re.S)
MARKE = re.compile(r"\s*[·|]\s*aban news\s*$")
# Die Verkaufsseiten heissen alle „Empfiehlt ChatGPT <Branche>?"
BRANCHE = re.compile(r"^Empfiehlt ChatGPT (.+?)\?", re.S)


def titel(h: str) -> str:
    m = TITEL.search(h)
    if not m:
        return ""
    return MARKE.sub("", htmlmod.unescape(" ".join(m.group(1).split()))).strip()


def branchenname(h: str) -> str | None:
    """Der Name, wie die Verkaufsseite ihn selbst schreibt."""
    m = BRANCHE.match(titel(h))
    return m.group(1).strip() if m else None


def preis(h: str) -> tuple[str, str] | None:
    m = PREIS.search(h)
    if not m:
        return None
    zusatz = htmlmod.unescape(" ".join(m.group(2).split()))
    return m.group(1), zusatz


def paare() -> list[tuple[pathlib.Path, pathlib.Path]]:
    """Alle Branchen, fuer die es beide Seiten gibt."""
    aus = []
    for verk in sorted(WURZEL.glob("ki-sichtbarkeit-*.html")):
        slug = verk.name[len("ki-sichtbarkeit-"):-len(".html")]
        rat = WURZEL / f"ki-fuer-{HANDPAARE.get(slug, slug)}.html"
        if rat.exists():
            aus.append((rat, verk))
    return aus


def stil(farbe: str) -> str:
    return ("max-width:760px;margin:22px auto;padding:16px 18px;"
            f"background:{farbe};border:1px solid #ece3d4;border-left:4px solid #b45309;"
            "border-radius:14px;color:#1f2937;font-size:.95rem;line-height:1.55")


def block_rat(name: str, ziel: str, p: tuple[str, str] | None) -> str:
    """Auf dem Ratgeber: Hinweis auf die Verkaufsseite derselben Branche."""
    if p and "/ Monat" in p[1].replace("/Monat", "/ Monat"):
        was = f"ab {p[0]} € im Monat, jederzeit kündbar"
    elif p:
        was = f"{p[0]} € einmalig"
    else:
        was = "ohne Login"
    n = htmlmod.escape(name)
    return (
        f'\n<!-- {MARKE_RAT} -->'
        f'<aside data-aban-branchen-paar'
        f' aria-label="KI-Sichtbarkeit für {n}"'
        f' style="{stil("#fffbf5")}">'
        f'<strong>Nennt dich die KI?</strong> Wer {n} sucht, fragt heute oft zuerst '
        f'ChatGPT. Auf der Seite für deine Branche siehst du, was die KI antwortet '
        f'und was du dagegen tun kannst — {htmlmod.escape(was)}.<br>'
        f'<a href="/{ziel}" style="display:inline-block;background:#b45309;color:#fff;'
        f'text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px;'
        f'margin:.7rem 0 .2rem">Empfiehlt ChatGPT {n}? →</a>'
        f'</aside>')


def block_verk(titel_rat: str, ziel: str) -> str:
    """Auf der Verkaufsseite: Link zum ausfuehrlichen Ratgeber."""
    t = htmlmod.escape(titel_rat)
    return (
        f'\n<!-- {MARKE_VERK} -->'
        f'<aside data-aban-branchen-ratgeber'
        f' aria-label="Ratgeber zur Branche"'
        f' style="{stil("#fff")}">'
        f'<strong>Erst lesen, dann entscheiden:</strong> Der ausführliche Ratgeber '
        f'„{t}“ zeigt gratis, wo KI im Alltag wirklich hilft — und wo nicht.'
        f' <a href="/{ziel}" style="color:#b45309;font-weight:700;'
        f'text-decoration:none">Zum Ratgeber →</a>'
        f'</aside>')


def setzen(h: str, muster: re.Pattern, block: str) -> str:
    """Block vor </main> setzen; vorhandenen ersetzen (idempotent)."""
    ohne = muster.sub("", h)
    ohne = re.sub(rf"\n?<!-- {MARKE_RAT} -->", "", ohne)
    ohne = re.sub(rf"\n?<!-- {MARKE_VERK} -->", "", ohne)
    if "</main>" not in ohne:
        return h
    # Beim Entfernen bleibt sonst eine Leerzeile stehen und jeder Lauf haengt
    # eine weitere an — die Datei aendert sich dann ewig, ohne neuen Inhalt.
    ohne = re.sub(r"\s*</main>", "\n</main>", ohne, count=1)
    return ohne.replace("</main>", block + "\n</main>", 1)


def lauf(schreiben: bool = True) -> list[str]:
    geaendert = []
    for rat, verk in paare():
        hv = verk.read_text(encoding="utf-8")
        hr = rat.read_text(encoding="utf-8")
        name = branchenname(hv)
        if not name:
            continue
        neu_r = setzen(hr, BLOCK_RAT, block_rat(name, verk.name, preis(hv)))
        neu_v = setzen(hv, BLOCK_VERK, block_verk(titel(hr), rat.name))
        for p, alt, neu in ((rat, hr, neu_r), (verk, hv, neu_v)):
            if neu != alt:
                if schreiben:
                    p.write_text(neu, encoding="utf-8")
                geaendert.append(p.name)
    return geaendert


if __name__ == "__main__":
    import sys
    trocken = "--dry" in sys.argv
    g = lauf(schreiben=not trocken)
    print(f"{len(paare())} Branchen-Paare, {len(g)} Seiten {'wären ' if trocken else ''}geändert")
    for n in g:
        print("  " + n)
