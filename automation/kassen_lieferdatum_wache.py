#!/usr/bin/env python3
"""kassen_lieferdatum_wache.py — verspricht die Kasse ein früheres Lieferdatum, als die Ware braucht? (10.10.2026)

ANLASS (Kaufweg-Test am Handy, tools/kaufweg_handy.mjs): Produktseite «Lieferung voraussichtlich 26. Okt. – 9. Nov.», Kasse
«Voraussichtliche Zustellung Di., 20. Okt». Das Kassen-Datum entsteht aus `deliveryPromiseSettings.processingTime` (stand P1D) +
Transitzeit des Tarifs. Die TikTok-Lernkampagne brachte 6 Besucherinnen bis in die Kasse, 0 kauften. Schreibbar ist die
Bearbeitungszeit NUR im Admin (Einstellungen → Versand und Zustellung) — auch `unstable` hat dafür keine Mutation.
NACHTRAG 10.10. 17:30 (Handy-Bilder des Betreibers): Modus stand auf «Automatisiert» = Prognose aus dem Fulfillment-Verlauf, ERSETZT die
Transportzeit. Richtig ist «Manuell» (Fulfillment-Zeit + Transportzeit 10–20 T). Der Modus ist per API NICHT lesbar; P3D belegt die Umstellung.

MISST: Bearbeitungszeit (Shopify) gegen die echte Versanddauer = Werktage von Bestellung bis zur ersten Sendung mit
Sendungsnummer, über die letzten Bestellungen mit CJ-Ware (SKU CJ…/Zusteller CJPacket/YunExpress; ohne Druck-auf-Bestellung,
ohne CH-Lager). Liegt die Einstellung unter dem Median, ist das Kassen-Datum zu früh.
Schreibt dropship/_kassen_lieferdatum.json (liest betreiber_ampel.kassen_lieferdatum). Ändert NICHTS im Shop.
  python3 automation/kassen_lieferdatum_wache.py
"""
import datetime as dt, json, os, re, sys
import numpy as np
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

STAND = os.path.join(REPO, "dropship", "_kassen_lieferdatum.json")
CJ_SKU = re.compile(r"^CJ", re.I)


def tage(iso):
    m = re.fullmatch(r"P(\d+)D", iso or "")
    return int(m.group(1)) if m else None


def main():
    s = gql('query{deliveryPromiseSettings{deliveryDatesEnabled processingTime}}')["deliveryPromiseSettings"]
    d = gql('''query{orders(first:60,query:"fulfillment_status:shipped",sortKey:CREATED_AT,reverse:true){nodes{name createdAt
             fulfillments{createdAt trackingInfo{company number}} lineItems(first:5){nodes{sku}}}}}''')["orders"]["nodes"]
    werte = []
    for o in d:
        skus = [l["sku"] or "" for l in o["lineItems"]["nodes"]]
        if not any(CJ_SKU.match(x) for x in skus):
            continue                                          # nur CJ-Ware (Druck/CH-Lager haben eigene Zeiten)
        mit_nummer = [f for f in o["fulfillments"] if any(t.get("number") for t in f["trackingInfo"])]
        if not mit_nummer:
            continue
        c = dt.datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00")).date()
        f = min(dt.datetime.fromisoformat(x["createdAt"].replace("Z", "+00:00")).date() for x in mit_nummer)
        werte.append((o["name"], int(np.busday_count(c, f))))
        if len(werte) >= 12:
            break
    zahlen = sorted(w for _, w in werte)
    median = float(np.median(zahlen)) if zahlen else None
    p80 = float(np.percentile(zahlen, 80)) if zahlen else None
    einstellung = tage(s.get("processingTime"))
    zu_frueh = bool(s.get("deliveryDatesEnabled") and einstellung is not None and median is not None and einstellung < median)
    stand = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "datum_in_kasse": s.get("deliveryDatesEnabled"),
             "bearbeitungszeit_tage": einstellung, "versand_werktage": werte, "median": median, "p80": p80,
             "empfohlen": int(np.ceil(p80)) if p80 is not None else None, "zu_frueh": zu_frueh}
    json.dump(stand, open(STAND, "w"), ensure_ascii=False, indent=1)
    print(f"KASSEN-DATUM: Bearbeitungszeit {einstellung} T · gemessen bis Versand Median {median} / 80 % {p80} Werktage "
          f"({len(werte)} CJ-Bestellungen) → {'⚠️ Kasse verspricht zu früh, empfohlen %s Werktage' % stand['empfohlen'] if zu_frueh else 'ok'}")


if __name__ == "__main__":
    main()
