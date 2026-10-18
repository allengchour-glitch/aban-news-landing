#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/preis_auszeichnung.py — den sichtbaren Preis auch maschinenlesbar machen.

Auf 23 Verkaufsseiten steht ein Preis-Kasten (`<div class="price">9 €<small>
/ Monat …</small></div>`), aber die strukturierten Daten derselben Seite
nennen keinen Preis: sie beschreiben nur einen `Service` bzw. ein `Book`.
Suchmaschinen und KI-Antworten lesen diese Daten — ohne `offers` wissen sie
nicht, dass es hier etwas zu kaufen gibt und was es kostet.

Die Zahl wird NICHT eingetippt, sondern aus dem Preis-Kasten derselben Seite
gelesen. Damit kann die Auszeichnung dem, was die Leserin sieht, gar nicht
widersprechen — der teuerste Fehler in diesem Feld (Seite sagt 9, Auszeichnung
sagt 19) ist dadurch ausgeschlossen, nicht nur unwahrscheinlich.

Steht „/ Monat" im Kasten, wird ein Monatspreis ausgezeichnet
(`UnitPriceSpecification` mit `referenceQuantity` 1 MON), sonst ein
einmaliger Preis. Seiten ohne Preis-Kasten, ohne passenden JSON-LD-Knoten
oder mit bereits vorhandenem `offers` bleiben unberührt.

Aufruf:  python3 tools/preis_auszeichnung.py [--dry]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Knoten-Typen, die laut schema.org ein `offers` tragen dürfen. Bewusst eng:
# an eine Organization oder eine WebSite gehört kein Preis.
TRAEGT_OFFERS = {"Service", "Product", "Book", "SoftwareApplication",
                 "WebApplication", "Course", "Event"}

PREIS_KASTEN = re.compile(
    r'<div class="price">\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*€\s*<small>(.*?)</small>',
    re.S)
# Zum Zählen, nicht zum Lesen: trifft jeden Kasten, auch einen mit <span> darin.
KASTEN_ANFANG = re.compile(r'<div class="price">')
LDJSON = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
CANONICAL = re.compile(r'<link rel="canonical" href="([^"]+)"')
TITEL = re.compile(r'<title>(.*?)</title>', re.S)
BESCHREIBUNG = re.compile(r'<meta name="description" content="([^"]*)"')
KOPF_ENDE = re.compile(r'</head>')
# Der Marken-Zusatz gehört in den Seitentitel, nicht in den Produktnamen.
MARKE = re.compile(r'\s*[·|]\s*aban news\s*$')


def preis_der_seite(h: str) -> tuple[str, bool] | None:
    """(Preis als Zeichenkette, ist_monatlich) aus dem Preis-Kasten der Seite.

    Trägt eine Seite MEHRERE Preis-Kästen, gibt es keinen „den" Preis:
    ki-tools-datensatz.html etwa nennt 19 € einmalig UND 9 €/Monat im Abo.
    Welcher davon der Preis des ausgezeichneten Produkts ist, kann das Skript
    nicht wissen — also zeichnet es gar nichts aus, statt zu raten. Genau so
    entsteht sonst der Fehler, den diese Auszeichnung verhindern soll.
    """
    if len(KASTEN_ANFANG.findall(h)) != 1:
        return None
    m = PREIS_KASTEN.search(h)
    if not m:
        return None
    zahl = m.group(1).replace(",", ".")
    monatlich = "/ Monat" in m.group(2) or "/Monat" in m.group(2)
    return zahl, monatlich


def angebot(preis: str, monatlich: bool, url: str) -> dict:
    o = {
        "@type": "Offer",
        "price": preis,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
    }
    if url:
        o["url"] = url
    if monatlich:
        # Ohne diese Angabe liest ein Dienst „9 €" als Gesamtpreis statt als
        # Monatspreis — aus einem Abo würde ein Einmalkauf.
        o["priceSpecification"] = {
            "@type": "UnitPriceSpecification",
            "price": preis,
            "priceCurrency": "EUR",
            "referenceQuantity": {
                "@type": "QuantitativeValue", "value": "1", "unitCode": "MON",
            },
        }
    return o


def produkt_knoten(h: str, preis: str, monatlich: bool, url: str) -> dict | None:
    """Ein Product aus dem, was die Seite selbst schon sagt.

    Drei Verkaufsseiten (ki-compliance-aerzte/-anwaelte/-steuerberater, je
    39 €) tragen ÜBERHAUPT keine strukturierten Daten — für Suchmaschinen gibt
    es dort kein Produkt und keinen Preis. Name und Beschreibung werden aus
    dem Seitentitel und der Meta-Beschreibung derselben Seite übernommen;
    erfunden wird nichts. Fehlt eines davon, entsteht kein Knoten.
    """
    tm, bm = TITEL.search(h), BESCHREIBUNG.search(h)
    if not tm or not bm:
        return None
    name = MARKE.sub("", html_entschaerfen(tm.group(1).strip()))
    beschreibung = html_entschaerfen(bm.group(1).strip())
    if not name or not beschreibung:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": beschreibung,
        "brand": {"@type": "Organization", "name": "aban news"},
        "offers": angebot(preis, monatlich, url),
    }


def html_entschaerfen(t: str) -> str:
    return (t.replace("&amp;", "&").replace("&quot;", '"')
             .replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">"))


def umbauen(h: str) -> str:
    """Idempotent: ein vorhandenes `offers` wird nie überschrieben."""
    p = preis_der_seite(h)
    if not p:
        return h
    preis, monatlich = p
    km = CANONICAL.search(h)
    url = km.group(1) if km else ""

    getan = False
    schon_da = False   # ein Knoten, der einen Preis tragen KANN, ist vorhanden

    def ersetze(m: re.Match) -> str:
        nonlocal getan, schon_da
        if getan:
            return m.group(0)
        roh = m.group(2)
        try:
            daten = json.loads(roh)
        except ValueError:
            return m.group(0)
        if not isinstance(daten, dict):
            return m.group(0)
        if daten.get("@type") not in TRAEGT_OFFERS:
            return m.group(0)
        # Hier IST ein passender Knoten — auch wenn er schon ein Angebot hat.
        # Ohne dieses Merken legte der zweite Lauf einen ZWEITEN Knoten an:
        # der Ersetzer ging leer aus, und der Zweig unten hielt die Seite für
        # unausgezeichnet. Der erste Lauf sah richtig aus, der zweite verdoppelte.
        schon_da = True
        if "offers" in daten:
            return m.group(0)
        daten["offers"] = angebot(preis, monatlich, url)
        getan = True
        return m.group(1) + json.dumps(daten, ensure_ascii=False) + m.group(3)

    neu = LDJSON.sub(ersetze, h)
    if getan or schon_da:
        return neu
    knoten = produkt_knoten(h, preis, monatlich, url)
    if not knoten:
        return h
    block = ('  <script type="application/ld+json">'
             + json.dumps(knoten, ensure_ascii=False) + '</script>\n')
    return KOPF_ENDE.sub(block + '</head>', h, count=1)


def seiten() -> list[Path]:
    return sorted(p for p in ROOT.glob("*.html")
                  if preis_der_seite(p.read_text(encoding="utf-8", errors="replace")))


def ausgezeichnet() -> list[Path]:
    """Seiten, die dieses Skript tatsächlich auszeichnet (bzw. ausgezeichnet hat).

    Nicht jede Seite mit Preis-Kasten gehört dazu: drei ki-compliance-Seiten
    etwa hatten gar keinen JSON-LD-Block, für sie legt das Skript einen an —
    und eine Seite ohne Titel oder Beschreibung bekäme auch das nicht.
    """
    raus = []
    for p in seiten():
        h = p.read_text(encoding="utf-8", errors="replace")
        if '"offers"' in h or umbauen(h) != h:
            raus.append(p)
    return raus


def main(argv: list[str]) -> int:
    dry = "--dry" in argv
    n = 0
    for p in seiten():
        alt = p.read_text(encoding="utf-8")
        neu = umbauen(alt)
        if neu != alt:
            n += 1
            print(("[dry] " if dry else "") + p.name)
            if not dry:
                p.write_text(neu, encoding="utf-8")
    print(f"{n} Seite(n) mit Preis-Auszeichnung versehen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
