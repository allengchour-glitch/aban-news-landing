#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gratis_testkoerbe.py — Testkörbe für die Gratis-Schwelle CH per draftOrderCalculate (13.10.2026, Entscheid D).

Nichts wird angelegt (draftOrderCalculate rechnet nur). Jeder Fall: Zwischensumme nach Rabatt, günstigster Versand,
Gesamtbetrag. Mit PHASE=vorher|nachher landet das Ergebnis in dropship/_gratis_testkoerbe_<phase>.json; mit
--vergleich werden beide Dateien verglichen: niemand zahlt nachher mehr als vorher.

Fälle (Betreiber-Auftrag D): CH 40.49 / 40.50 / 49.90 Sirène + WELCOME10 (= 44.91) / 49.99 / Mischkorb CH-Lager + CJ
(nach −10 % zwischen 40.50 und 45) / LI 45.00. Eigene Positionen (Titel + Preis) laufen über das General profile.

  PHASE=vorher python3 tools/gratis_testkoerbe.py
  PHASE=nachher python3 tools/gratis_testkoerbe.py
  python3 tools/gratis_testkoerbe.py --vergleich
"""
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kaufwille_zeile import gql  # noqa: E402

ADR = {"CH": {"address1": "Bahnhofstrasse 1", "city": "Zürich", "zip": "8001", "countryCode": "CH"},
       "LI": {"address1": "Städtle 1", "city": "Vaduz", "zip": "9490", "countryCode": "LI"}}
GENERAL = "gid://shopify/DeliveryProfile/132124180865"
SIRENE_Q = 'title:*Sirène* status:active'


def rechne(zeilen, land, codes=None):
    eingabe = {"lineItems": zeilen, "shippingAddress": ADR[land], "acceptAutomaticDiscounts": True}
    if codes:
        eingabe["discountCodes"] = codes
    d = gql("""mutation($i:DraftOrderInput!){draftOrderCalculate(input:$i){calculatedDraftOrder{
        subtotalPriceSet{shopMoney{amount}} totalDiscountsSet{shopMoney{amount}}
        availableShippingRates{title price{amount}}} userErrors{field message}}}""", {"i": eingabe})["draftOrderCalculate"]
    if d["userErrors"]:
        return {"fehler": d["userErrors"]}
    c = d["calculatedDraftOrder"]
    sub = float(c["subtotalPriceSet"]["shopMoney"]["amount"])
    rates = sorted((float(r["price"]["amount"]), r["title"]) for r in c["availableShippingRates"])
    billig = rates[0][0] if rates else None
    return {"zwischensumme": sub, "rabatt": float(c["totalDiscountsSet"]["shopMoney"]["amount"]), "tarife": rates,
            "versand": billig, "gesamt": round(sub + billig, 2) if billig is not None else None}


def eigen(preis):
    return [{"title": f"Testposition {preis:.2f}", "originalUnitPriceWithCurrency": {"amount": f"{preis:.2f}",
             "currencyCode": "CHF"}, "quantity": 1, "requiresShipping": True}]


def sirene():
    n = gql('query($q:String!){products(first:5,query:$q){nodes{title variants(first:5){nodes{id price availableForSale '
            'deliveryProfile{id}}}}}}', {"q": SIRENE_Q})["products"]["nodes"]
    for p in n:
        for v in p["variants"]["nodes"]:
            if abs(float(v["price"]) - 49.90) < 0.001 and v["availableForSale"]:
                return v["id"], p["title"]
    return None, None


def mischkorb():
    """K = Variante im Profil CH-Lager (Tag profil-ch-lager), C = General-CJ; K + C nach −10 % in [40.50, 45)."""
    k = gql('{products(first:40,query:"tag:profil-ch-lager status:active published_status:published price:<30"){nodes{'
            'title variants(first:3){nodes{id price availableForSale deliveryProfile{name}}}}}}')["products"]["nodes"]
    c = gql('{products(first:60,query:"sku:CJ* status:active published_status:published price:>=10 price:<30"){nodes{'
            'title variants(first:1){nodes{id price availableForSale deliveryProfile{id}}}}}}')["products"]["nodes"]
    ks = [(v["id"], float(v["price"]), p["title"]) for p in k for v in p["variants"]["nodes"]
          if v["availableForSale"] and (v["deliveryProfile"] or {}).get("name") == "CH-Lager"]
    cs = [(v["id"], float(v["price"]), p["title"]) for p in c for v in p["variants"]["nodes"]
          if v["availableForSale"] and (v["deliveryProfile"] or {}).get("id") == GENERAL]
    for kv in ks:
        for cv in cs:
            if 40.6 <= round((kv[1] + cv[1]) * 0.9, 2) < 44.9:
                return kv, cv
    return None, None


def faelle():
    aus = [("CH 40.49", eigen(40.49), "CH", None), ("CH 40.50", eigen(40.50), "CH", None),
           ("CH 44.99", eigen(44.99), "CH", None), ("CH 49.99", eigen(49.99), "CH", None),
           ("LI 45.00", eigen(45.00), "LI", None), ("LI 40.50", eigen(40.50), "LI", None)]
    vid, titel = sirene()
    if vid:
        aus.insert(2, (f"CH Sirène 49.90 + WELCOME10 ({titel[:30]})", [{"variantId": vid, "quantity": 1}], "CH", ["WELCOME10"]))
        aus.insert(3, ("CH Sirène 49.90 ohne Code", [{"variantId": vid, "quantity": 1}], "CH", None))
    kv, cv = mischkorb()
    if kv:
        aus.append((f"CH Mischkorb CH-Lager {kv[1]:.2f} + CJ {cv[1]:.2f}",
                    [{"variantId": kv[0], "quantity": 1}, {"variantId": cv[0], "quantity": 1}], "CH", None))
        aus.append((f"LI Mischkorb CH-Lager {kv[1]:.2f} + CJ {cv[1]:.2f}",
                    [{"variantId": kv[0], "quantity": 1}, {"variantId": cv[0], "quantity": 1}], "LI", None))
        aus.append((f"CH nur CH-Lager {kv[1]:.2f}", [{"variantId": kv[0], "quantity": 1}], "CH", None))
    return aus


def lauf(phase):
    erg = []
    for name, zeilen, land, codes in faelle():
        r = rechne(zeilen, land, codes)
        r.update({"fall": name, "land": land, "codes": codes or [], "zeilen": zeilen})
        erg.append(r)
        print(f"  {name:58} " + (f"Zwischensumme {r['zwischensumme']:6.2f} (Rabatt {r['rabatt']:.2f}) · Versand "
                                  f"{r['versand']} · gesamt {r['gesamt']} · {r['tarife'][:3]}" if "fehler" not in r else f"FEHLER {r['fehler']}"))
    pfad = os.path.join(REPO, "dropship", f"_gratis_testkoerbe_{phase}.json")
    json.dump(erg, open(pfad, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("→", os.path.relpath(pfad, REPO))
    return erg


def vergleich():
    v = {r["fall"]: r for r in json.load(open(os.path.join(REPO, "dropship", "_gratis_testkoerbe_vorher.json")))}
    n = {r["fall"]: r for r in json.load(open(os.path.join(REPO, "dropship", "_gratis_testkoerbe_nachher.json")))}
    teurer = 0
    for f, a in v.items():
        b = n.get(f)
        if not b or a.get("gesamt") is None or b.get("gesamt") is None:
            print(f"  ? {f}: fehlt/Fehler"); teurer += 1; continue
        d = round(b["gesamt"] - a["gesamt"], 2)
        teurer += d > 0.001
        print(f"  {'✗ TEURER' if d > 0.001 else '✓'} {f:58} vorher {a['gesamt']:6.2f} (Versand {a['versand']:.2f}) → "
              f"nachher {b['gesamt']:6.2f} (Versand {b['versand']:.2f}) Δ {d:+.2f}")
    print(f"VERGLEICH: {len(v) - teurer}/{len(v)} gleich oder günstiger")
    return 1 if teurer else 0


if __name__ == "__main__":
    if "--vergleich" in sys.argv:
        sys.exit(vergleich())
    lauf(os.environ.get("PHASE", "probe"))
