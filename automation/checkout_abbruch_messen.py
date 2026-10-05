#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Checkout-Abbruch-Ampel — eine Zeile für den Aufseher (05.10.2026, dropship/CHECKOUT-ABBRUCH-2026-10-05.md).

Misst über die Shopify-Admin-API:
  * abandonedCheckoutsCount der letzten TAGE Tage (Standard 7),
  * den Trichter per ShopifyQL (Sitzungen → Checkout erreicht → Checkout abgeschlossen),
  * je Abbruch: Produkt, Korbsumme (ohne Personendaten) — und ob derselbe Kunde seither gekauft hat
    (numberOfOrders > 0 am Kundendatensatz).

Ausgabe: «CHECKOUT 7 T: n Abbrüche · Trichter 9 erreicht / 3 gekauft · unter CHF 45: k · später gekauft: m».
Bei Fehler «CHECKOUT: unklar (…)», nie «0 Abbrüche».

    python3 automation/checkout_abbruch_messen.py            # Ampel-Zeile
    TAGE=14 DETAIL=1 python3 automation/checkout_abbruch_messen.py   # plus eine Zeile je Korb (Produkt, CHF, Zeit)
"""
import os
import sys
import datetime as dt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

TAGE = int(os.environ.get("TAGE", "7"))
DETAIL = os.environ.get("DETAIL") == "1"
GRATIS_RAPPEN = 4500  # Tarif «Kostenloser Versand» ab CHF 45 nach Rabatt (gemessen deliveryProfiles 05.10.2026)

Q_AC = """
query($q:String,$after:String){
 abandonedCheckoutsCount(query:$q){count}
 abandonedCheckouts(first:50, query:$q, after:$after, sortKey:CREATED_AT, reverse:true){
  pageInfo{hasNextPage endCursor}
  nodes{ name createdAt completedAt totalPriceSet{shopMoney{amount}} subtotalPriceSet{shopMoney{amount}}
         shippingAddress{countryCodeV2} customer{numberOfOrders}
         lineItems(first:5){nodes{title quantity product{handle}}} } } }"""


def main():
    seit = (dt.datetime.utcnow() - dt.timedelta(days=TAGE)).strftime("%Y-%m-%d")
    try:
        koerbe, after, n = [], None, None
        while True:
            d = gql(Q_AC, {"q": f"created_at:>={seit}", "after": after})
            n = d["abandonedCheckoutsCount"]["count"] if n is None else n
            koerbe += d["abandonedCheckouts"]["nodes"]
            pi = d["abandonedCheckouts"]["pageInfo"]
            if not pi["hasNextPage"]:
                break
            after = pi["endCursor"]
        t = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}',
                {"q": "FROM sessions SHOW sessions, sessions_that_reached_checkout, sessions_that_completed_checkout "
                      f"WHERE human_or_bot_session = 'human' SINCE -{TAGE}d UNTIL today"})["shopifyqlQuery"]
        if t.get("parseErrors"):
            raise RuntimeError("ShopifyQL " + str(t["parseErrors"])[:80])
        r = (t.get("tableData") or {}).get("rows") or [{}]
        r = r[0]
    except Exception as e:  # noqa: BLE001
        print(f"CHECKOUT: unklar ({type(e).__name__}: {str(e)[:80]})")
        return 1
    unter = sum(1 for k in koerbe if float(k["subtotalPriceSet"]["shopMoney"]["amount"]) * 100 < GRATIS_RAPPEN)
    spaeter = sum(1 for k in koerbe if int((k.get("customer") or {}).get("numberOfOrders") or 0) > 0 or k.get("completedAt"))
    print(f"CHECKOUT {TAGE} T: {n} Abbrüche · Trichter {r.get('sessions_that_reached_checkout', '?')} erreicht / "
          f"{r.get('sessions_that_completed_checkout', '?')} gekauft ({r.get('sessions', '?')} Sitzungen) · "
          f"unter CHF {GRATIS_RAPPEN // 100}: {unter} · Kunde kaufte später: {spaeter}")
    if DETAIL:
        for k in koerbe:
            li = k["lineItems"]["nodes"]
            prod = "; ".join(f"{x['quantity']}× {x['title'][:50]}" for x in li)
            land = (k.get("shippingAddress") or {}).get("countryCodeV2") or "—"
            print(f"  {k['createdAt'][:16]} CHF {k['totalPriceSet']['shopMoney']['amount']:>6} (Ware {k['subtotalPriceSet']['shopMoney']['amount']}) "
                  f"{land} · {prod}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
