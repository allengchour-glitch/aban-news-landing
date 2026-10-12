#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""versand_band_wache.py — der Versandsatz im Produkttext muss zur Kasse passen (12.10.2026).

ANLASS. Das Abendkleid «Sirène» kostet 49,90 CHF und schrieb «Versand CHF 7, ab CHF 50 gratis — mit einem
zweiten Artikel ist er bei diesem Kleid also inklusive». Die Kasse rechnet anders: gemessen am 12.10. mit
draftOrderCalculate (nur lesend, nichts angelegt): 44,90 CHF → Standard 7,00 · 45,00 CHF → «Kostenloser Versand»
· 49,90 / 49,99 / 50,00 → gratis. Die Schwelle der Kasse ist also 45 CHF für eine Einzelbestellung (Tarif, seit
02.10.), die öffentliche Zusage bleibt «gratis ab CHF 50» (Betreiber 02.10., «Versprechen = CHF 50»).
Ein Satz «Versand CHF 7» ist damit für Preise 45–49,99 CHF FALSCH: der Kunde sieht 7 CHF, die Kasse
verlangt keine.

GEFUNDEN 12.10. (Voll-Export 53'568 aktive Produkte): 1'464 in der Spanne 45–49,99 CHF; davon 2 mit dem
falschen Satz (Sirène, Wecker-Armband mit «darunter kostet der Versand CHF 7» in der FAQ). Kontrolle: unter
45 CHF 10 Treffer (richtig), ab 50 CHF 2 (kein Satz zum Versandbetrag).

REGEL. Preis 45 ≤ p < 50 → kein Versandbetrag in Produkt- oder FAQ-Text. Ersetzt wird NUR ein Satz aus
RUECKSCHREIBEN, der wörtlich und genau einmal im HTML steht. Alles andere wird nur gemeldet.

  python3 automation/versand_band_wache.py           # Trockenlauf (Standard): nur Befunde
  SCHARF=1 python3 automation/versand_band_wache.py  # schreibt, liest zurück, Ledger dropship/_versand_band.tsv
Der Voll-Export läuft über bulkOperationRunQuery; fremde Exporte werden NIE abgebrochen (Lehre 07.10.).
"""
import os, re, sys, time, json, urllib.request
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from seo_autopilot import gql  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_versand_band.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
UNTER, OBEN = 45.0, 50.0

# Exakte Ersetzungen. Jede Zeile: (alter Satz, neuer Satz). Nur was hier steht, wird geschrieben.
RUECKSCHREIBEN = [
    ("Versand CHF 7, ab CHF 50 gratis — mit einem zweiten Artikel ist er bei diesem Kleid also inklusive.",
     "Versand bei diesem Kleid gratis."),
    ("darunter kostet der Versand CHF 7.",
     "bei diesem Artikel ist der Versand gratis."),
]

INNER = ('{ products(query: "status:active") { edges { node { id handle priceRangeV2 { minVariantPrice { amount } } '
         'descriptionHtml } } } }')


def voll_export():
    """Aktive Produkte über den Bulk-Export. Startet nur den EIGENEN Vorgang und liest seine ID zurück."""
    d = gql('mutation($q:String!){ bulkOperationRunQuery(query:$q){ bulkOperation{ id status } userErrors{ field message } } }',
            {"q": INNER})["bulkOperationRunQuery"]
    if d["userErrors"]:
        raise RuntimeError(f"Bulk-Start abgelehnt: {d['userErrors']}")
    oid = d["bulkOperation"]["id"]
    while True:
        op = gql('query($i:ID!){ node(id:$i){ ... on BulkOperation { status errorCode objectCount url } } }',
                 {"i": oid})["node"]
        if op["status"] in ("COMPLETED", "FAILED", "CANCELED", "EXPIRED"):
            break
        time.sleep(15)
    if op["status"] != "COMPLETED" or not op.get("url"):
        raise RuntimeError(f"Bulk nicht abgeschlossen: {op}")
    zeilen = []
    with urllib.request.urlopen(op["url"], timeout=300) as f:
        for raw in f:
            o = json.loads(raw)
            if str(o.get("id", "")).startswith("gid://shopify/Product/"):
                zeilen.append(o)
    return zeilen


def preis(o):
    try:
        return float(((o.get("priceRangeV2") or {}).get("minVariantPrice") or {}).get("amount") or 0)
    except (TypeError, ValueError):
        return 0.0


def befunde(zeilen):
    """Produkte in der Spanne 45–49,99 CHF mit mindestens einem falschen Versandsatz."""
    treffer = []
    for o in zeilen:
        p = preis(o)
        if not (UNTER <= p < OBEN):
            continue
        html = o.get("descriptionHtml") or ""
        gefunden = [(alt, neu) for alt, neu in RUECKSCHREIBEN if html.count(alt) >= 1]
        if gefunden:
            treffer.append((o, p, gefunden))
    return treffer


def schreiben(o, gefunden):
    """Ersetzt die Sätze, prüft am HTML des Lesezugriffs. Gibt (ok, Grund) zurück."""
    html = o["descriptionHtml"]
    neu = html
    for alt, ers in gefunden:
        if neu.count(alt) != 1:
            return False, f"Satz nicht genau einmal ({neu.count(alt)}x)"
        neu = neu.replace(alt, ers)
    d = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id descriptionHtml } userErrors{ field message } } }',
            {"i": {"id": o["id"], "descriptionHtml": neu}})["productUpdate"]
    if d["userErrors"]:
        return False, f"Shopify: {d['userErrors']}"
    zurueck = d["product"]["descriptionHtml"]
    for alt, ers in gefunden:
        if alt in zurueck or ers not in zurueck:
            return False, "Rücklesen stimmt nicht"
    return True, "zurückgelesen"


def ledger(zeile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join(zeile) + "\n")


def main():
    zeilen = voll_export()
    print(f"Voll-Export: {len(zeilen)} aktive Produkte")
    treffer = befunde(zeilen)
    print(f"Spanne 45–49,99 CHF mit falschem Versandsatz: {len(treffer)}")
    for o, p, gefunden in treffer:
        print(f"  {p:6.2f}  {o['handle'][:60]}  ({len(gefunden)} Satz/Sätze)")
    if not SCHARF:
        print("Trockenlauf — nichts geschrieben. SCHARF=1 zum Schreiben.")
        return 0
    ok = fehl = 0
    for o, p, gefunden in treffer:
        gut, grund = schreiben(o, gefunden)
        ledger([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), o["handle"], f"{p:.2f}",
                "ok" if gut else "fehler", grund])
        ok += gut
        fehl += not gut
    print(f"geschrieben: {ok} · Fehler: {fehl}")
    return 0 if fehl == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
