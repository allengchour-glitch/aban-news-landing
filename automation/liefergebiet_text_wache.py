#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Liefergebiet-Text-Wache — Seiten und Rechtstexte sagen dasselbe wie der Markt (10.10.2026).

Anlass: Liechtenstein wurde am 09.10. als Lieferland freigegeben (Markt «Switzerland» = [CH, LI]), aber Versand-, AGB- und
Rückgaberichtlinie sowie 6 Seiten sagten weiter «nur in die Schweiz»; die Seite «widerruf» erweckte den Eindruck, auch in
Liechtenstein gebe es kein gesetzliches Rücktrittsrecht (dort gilt das FAGG, 14 Tage). Der frühere Tageslauf
«liechtenstein_raus» hätte LI sogar täglich wieder entfernt.

10.10.2026 (OpenSEO-Audit): das THEME sagte weiter «Versand nur in der Schweiz» — Fusszeile auf jeder Seite, Google-Text
der Startseite, Ersatztext für Richtlinien und /collections/all. Die Wache las nur Seiten + Richtlinien; jetzt auch jede
Textdatei des MAIN-Themes (Kommentare zählen mit — ein Satz, der LI nennt, ist in Ordnung).

Prüft (nur lesen) alle Seiten + Richtlinien + Theme-Dateien gegen automation/data/liefergebiet_regel.json:
  * ein Satz «nur/ausschliesslich … Schweiz» ohne «Liechtenstein» im selben Satz = Befund,
  * Versandrichtlinie nennt Liechtenstein, CHF 14.90 und die Lieferzeit; Rückgaberichtlinie nennt das 14-Tage-Recht.

13.10.2026 (Kauf-Strecke Klasse 16): Kostüm-Seite — 4 von 7 Besuchern aus Deutschland, Leiste «Versand CHF 7 · gratis ab
CHF 50» ohne Land (für Liechtenstein falsch: CHF 14.90, kein Gratisversand). Zwei neue Prüfungen am Theme:
  * VERSANDPREIS OHNE LAND: ein sichtbarer Satz mit Versandpreis/Gratis-Schwelle (CHF …) ohne «Schweiz»/«Liechtenstein»/CH
    im selben Satz = Befund (Liquid-/CSS-/HTML-Kommentare, <script>/<style> und Liquid-Ausgaben zählen nicht),
  * LI IM JSON-LD: Organization-Markup (sections/header.liquid, automation/google_org_richtlinien.py) hat eine
    Versandregel mit addressCountry LI, und das Startseiten-Organization (layout/theme.liquid) nennt LI in areaServed.

    python3 automation/liefergebiet_text_wache.py    # Ampel-Zeile, Exit 0/1
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGEL = json.load(open(os.path.join(REPO, "automation", "data", "liefergebiet_regel.json"), encoding="utf-8"))
NUR_CH = re.compile(REGEL["nur_ch_satz"], re.I)


def saetze(html):
    t = re.sub(r"<[^>]+>", " ", html or "")
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n", re.sub(r"[ \t]+", " ", t)) if s.strip()]


KEIN_WIDERRUF = re.compile(r"Widerrufsrecht[^.]{0,60}gibt es in der Schweiz nicht", re.I)


def befunde_text(name, html):
    out = []
    t = re.sub(r"<[^>]+>", " ", html or "")
    for m in KEIN_WIDERRUF.finditer(t):   # CH: kein gesetzliches Recht — LI (EWR, FAGG): 14 Tage, muss daneben stehen
        if "Liechtenstein" not in t[m.end():m.end() + 300]:
            out.append(f"{name}: «kein Widerrufsrecht» ohne LI-Hinweis (FAGG 14 T)")
    for s in saetze(html):
        if NUR_CH.search(s) and not any(l in s for l in REGEL["laender_ausser_ch"]):
            out.append(f"{name}: «{s[:90]}»")
    return out


VERSANDPREIS = re.compile(r"gratis[- ]?versand|gratisversand|versand\s*(?:&nbsp;|\u00a0)?\s*CHF\s*\d|gratis\s+ab\s+CHF", re.I)
LAND = re.compile(r"Schweiz\b|Liechtenstein|\bCH\b(?!F)|\bLI\b")
NICHT_SICHTBAR = ("assets/", "locales/")


def sichtbarer_text(c):
    """Grob der Text, den Besucher sehen: ohne Kommentare, Skripte, Stile, Liquid-Tags und -Ausgaben, HTML-Tags."""
    c = c.replace("\\n", "\n")
    c = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", " ", c, flags=re.S)
    c = re.sub(r"/\*.*?\*/|<!--.*?-->", " ", c, flags=re.S)
    c = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", c, flags=re.S | re.I)
    c = re.sub(r"\{%.*?%\}|\{\{.*?\}\}", " ", c, flags=re.S)
    return re.sub(r"<[^>]+>", " ", c)


def versandpreis_ohne_land(name, body):
    if name.startswith(NICHT_SICHTBAR) or name in ("AGENTS.md", "config/settings_schema.json"):
        return []
    out = []
    for s in re.split(r"(?<=[.!?])\s+|\n", re.sub(r"[ \t]+", " ", sichtbarer_text(body))):
        if VERSANDPREIS.search(s) and re.search(r"CHF\s*\d", s) and not LAND.search(s):
            out.append(f"{name}: Versandpreis ohne Land «{s.strip()[:70]}»")
    return out


def li_im_jsonld(theme):
    out = []
    h = theme.get("sections/header.liquid", "")
    if '"hasShippingService"' not in h or '"addressCountry": "LI"' not in h:
        out.append("Organization-JSON-LD (header.liquid) ohne Versandregel LI → SCHARF=1 python3 automation/google_org_richtlinien.py")
    t = theme.get("layout/theme.liquid", "")
    if '"areaServed"' in t and not re.search(r'"areaServed":\s*\[[^\]]*"LI"', t):
        out.append("Startseiten-Organization (theme.liquid) areaServed ohne LI")
    return out


def theme_dateien():
    """Alle Textdateien des veröffentlichten Themes: {Dateiname: Inhalt}."""
    tid = gql("{themes(first:1,roles:[MAIN]){nodes{id}}}")["themes"]["nodes"][0]["id"]
    out, after = {}, None
    while True:
        d = gql('query($t:ID!,$a:String){theme(id:$t){files(first:100,after:$a){pageInfo{hasNextPage endCursor} '
                'nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"t": tid, "a": after})["theme"]["files"]
        for n in d["nodes"]:
            c = (n.get("body") or {}).get("content")
            if c:
                out[n["filename"]] = c.replace('\\"', '"')
        if not d["pageInfo"]["hasNextPage"]:
            return out
        after = d["pageInfo"]["endCursor"]


def main():
    try:
        seiten, after = [], None
        while True:
            d = gql('query($a:String){pages(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{handle body}}}',
                    {"a": after})["pages"]
            seiten += d["nodes"]
            if not d["pageInfo"]["hasNextPage"]:
                break
            after = d["pageInfo"]["endCursor"]
        pol = {p["type"]: p["body"] for p in gql("{shop{shopPolicies{type body}}}")["shop"]["shopPolicies"]}
        theme = theme_dateien()
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ LIEFERGEBIET-TEXTE: unklar ({type(e).__name__}: {str(e)[:80]})")
        return 1
    bef = []
    for p in seiten:
        bef += befunde_text(p["handle"], p["body"])
    for typ, body in pol.items():
        bef += befunde_text(typ, body)
    for fn, body in theme.items():
        bef += befunde_text(fn, body)
    preis = []
    for fn, body in theme.items():
        preis += versandpreis_ohne_land(fn, body)
    bef += li_im_jsonld(theme)
    for typ, pflicht in (("SHIPPING_POLICY", REGEL["pflicht_in_versandrichtlinie"]),
                         ("REFUND_POLICY", REGEL["pflicht_in_rueckgaberichtlinie"])):
        fehlt = [w for w in pflicht if w not in pol.get(typ, "")]
        if fehlt:
            bef.append(f"{typ} ohne {fehlt}")
    if bef or preis:
        dateien = sorted({p.split(":")[0] for p in preis})
        teil = (f" · Versandpreis ohne Land: {len(preis)} in {', '.join(dateien)}" if preis else "")
        print(f"⚠️ LIEFERGEBIET-TEXTE: {len(bef)} Befunde ({len(seiten)} Seiten + {len(pol)} Richtlinien + {len(theme)} Theme-Dateien)"
              + (": " + " | ".join(bef[:4]) if bef else "") + teil)
        if "-v" in sys.argv:
            print("\n".join(bef + preis))
        return 1
    print(f"LIEFERGEBIET-TEXTE: {len(seiten)} Seiten + {len(pol)} Richtlinien + {len(theme)} Theme-Dateien stimmen mit CH+LI überein, Versandpreise mit Land, LI im JSON-LD")
    return 0


if __name__ == "__main__":
    sys.exit(main())
