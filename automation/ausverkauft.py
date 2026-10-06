#!/usr/bin/env python3
"""ausverkauft.py — EINE Stelle, die Varianten wirklich unkaufbar macht (und wieder freigibt). 06.10.2026.

LEHRE 08.09.2026 (Journal «DENY allein tut gar nichts»), am 06.10. auf Betreiber-Hinweis «schaue memory das hatte ich mal»
wiedergefunden: `inventoryPolicy: DENY` wirkt NUR mit Bestandsführung (`tracked: true`) UND Menge 0. GEMESSEN 06.10.:
alle 227 geprüften aktiven CJ-Varianten `tracked: false` → DENY wirkungslos. `cj_varianten_wache.py` hatte seit 21.09.
219 Varianten «auf DENY» gesetzt — 177 von 179 geprüften waren weiter `availableForSale: true`.

  sperren(gql, pid, ids)    → tracked:true + DENY in einem productVariantsBulkUpdate; bleibt eine Variante kaufbar (alte Menge
                              > 0 überlebt das Einschalten), inventorySetQuantities 0 am Standort; Ergebnis = availableForSale je id.
  freigeben(gql, pid, ids)  → tracked:false (Ausgangszustand der CJ-Ware; Policy bleibt), Ergebnis = availableForSale je id.
⚠️ GEMESSEN 06.10. (Bulk aller DENY-Varianten): 427'616 aktive CJ-Varianten stehen ab Import auf DENY + tracked:false —
DENY ist bei CJ-Ware KEIN Sperr-Zeichen. Wer «ist gesperrt?» wissen will, liest availableForSale, nie inventoryPolicy.
Beide geben {variant_id: availableForSale} nach dem Rücklesen zurück — Erfolg heisst False bzw. True, nicht «keine userErrors».
"""
import json


def _lesen(gql, ids):
    r = gql('query($i:[ID!]!){nodes(ids:$i){... on ProductVariant{id availableForSale inventoryPolicy '
            'inventoryItem{id tracked inventoryLevels(first:5){nodes{location{id} quantities(names:["available"]){quantity}}}}}}}', {"i": ids})
    d = r.get("data", r) if isinstance(r, dict) else r
    return {n["id"]: n for n in (d.get("nodes") or []) if n}


def _mut(gql, q, v):
    r = gql(q, v)
    return r.get("data", r) if isinstance(r, dict) and "data" in r else r


def sperren(gql, pid, ids):
    if not ids:
        return {}
    x = _mut(gql, 'mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
             {"p": pid, "v": [{"id": i, "inventoryPolicy": "DENY", "inventoryItem": {"tracked": True}} for i in ids]})
    fehler = (x.get("productVariantsBulkUpdate") or {}).get("userErrors")
    if fehler:
        raise RuntimeError(f"sperren: {str(fehler)[:120]}")
    stand = _lesen(gql, ids)
    noch = [v for v in stand.values() if v["availableForSale"]]
    if noch:   # alte Menge > 0 hat das Einschalten überlebt → auf 0 setzen
        menge = []
        for v in noch:
            for lv in v["inventoryItem"]["inventoryLevels"]["nodes"]:
                menge.append({"inventoryItemId": v["inventoryItem"]["id"], "locationId": lv["location"]["id"], "quantity": 0})
        if menge:
            y = _mut(gql, 'mutation($i:InventorySetQuantitiesInput!){inventorySetQuantities(input:$i){userErrors{message}}}',
                     {"i": {"name": "available", "reason": "correction", "ignoreCompareQuantity": True, "quantities": menge}})
            if (y.get("inventorySetQuantities") or {}).get("userErrors"):
                raise RuntimeError(f"Menge 0: {str(y['inventorySetQuantities']['userErrors'])[:120]}")
        stand = _lesen(gql, ids)
    return {i: stand.get(i, {}).get("availableForSale") for i in ids}


def freigeben(gql, pid, ids):
    if not ids:
        return {}
    x = _mut(gql, 'mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
             {"p": pid, "v": [{"id": i, "inventoryItem": {"tracked": False}} for i in ids]})
    fehler = (x.get("productVariantsBulkUpdate") or {}).get("userErrors")
    if fehler:
        raise RuntimeError(f"freigeben: {str(fehler)[:120]}")
    stand = _lesen(gql, ids)
    return {i: stand.get(i, {}).get("availableForSale") for i in ids}


if __name__ == "__main__":
    print(__doc__)
