#!/usr/bin/env python3
"""auswahl_besucht_liste.py — Vorrangliste für «Auswahl nachrüsten»: besuchte Produktseiten mit EINER Variante (09.10.2026).

ANLASS (Betreiber «verbessere mehr»): 30'000 aktive Produkte haben eine Variante. In der bisherigen Messung führt CJ bei 95 %
mehrere (Farbe/Grösse) — die Kundin kann nicht wählen, der Bestell-Automat stellt auf «manuell prüfen». Gemessen waren bis
heute nur die Klassenliste (Text verspricht eine Wahl) und ab heute die Neuimporte. GEMESSEN 09.10. 21:10 UTC: 802 besuchte
Produktseiten (90 T, ShopifyQL-Landeseiten) sind aktiv, haben eine Variante und eine CJ-SKU — 1'024 Sitzungen, 16 gemessen.
Wo Besucher landen, kostet die fehlende Auswahl Käufe; dort zuerst.

Schreibt dropship/_klassen/auswahl-besuchte-seiten.txt («<Produkt-ID>\t<Titel>\t<Sitzungen>», Sitzungen absteigend) —
Eingabe für `LISTE=… auswahl_fehlt_messen.py` und `VORRANG=… auswahl_nachruesten.py`. Nur lesen.
  python3 automation/auswahl_besucht_liste.py [TAGE=90]
"""
import os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
TAGE = int(os.environ.get("TAGE", "90"))
AUS = os.path.join(REPO, "dropship", "_klassen", "auswahl-besuchte-seiten.txt")


def main():
    import variant_value_clean as vvc
    from kaufwille_zeile import gql
    besuche = dict(vvc.besuchte_seiten(TAGE))
    if not besuche:
        print("AUSWAHL-BESUCHT: unklar (keine Landeseiten gelesen) — Liste bleibt unverändert"); return 1
    hs = [h for h in besuche if h]
    treffer = []
    for k in range(0, len(hs), 40):
        q = " OR ".join(f"handle:{h}" for h in hs[k:k + 40])
        r = gql('query($q:String!){products(first:50,query:$q){nodes{id handle title status variantsCount{count} '
                'variants(first:1){nodes{sku}}}}}', {"q": q})["products"]["nodes"]
        for p in r:
            sku = (p["variants"]["nodes"] or [{}])[0].get("sku") or ""
            if p["status"] == "ACTIVE" and p["variantsCount"]["count"] == 1 and sku.upper().startswith("CJ-"):
                treffer.append((p["id"], p["title"].replace("\t", " "), besuche.get(p["handle"], 0)))
    treffer.sort(key=lambda x: -x[2])
    os.makedirs(os.path.dirname(AUS), exist_ok=True)
    teil = AUS + ".teil"
    with open(teil, "w", encoding="utf-8") as f:
        f.write("".join(f"{i}\t{t}\t{s}\n" for i, t, s in treffer))
    os.replace(teil, AUS)
    print(f"AUSWAHL-BESUCHT: {len(treffer)} besuchte Seiten ({TAGE} T) mit einer Variante + CJ-SKU, "
          f"{sum(s for *_, s in treffer)} Sitzungen → {os.path.relpath(AUS, REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
