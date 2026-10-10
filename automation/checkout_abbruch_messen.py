#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Checkout-Abbruch-Ampel — eine Zeile für den Aufseher (05.10.2026, dropship/CHECKOUT-ABBRUCH-2026-10-05.md).

Misst über die Shopify-Admin-API:
  * abandonedCheckoutsCount der letzten TAGE Tage (Standard 7),
  * den Trichter per ShopifyQL (Sitzungen → Checkout erreicht → Checkout abgeschlossen),
  * je Abbruch: Produkt, Korbsumme (ohne Personendaten) — und ob derselbe Kunde seither gekauft hat
    (numberOfOrders > 0 am Kundendatensatz).

Ausgabe: «CHECKOUT 7 T: n Abbrüche (echt e · Test t · eigen s · Wegwerf w) · Trichter … · unter CHF 45: k · später gekauft: m».
Bei Fehler «CHECKOUT: unklar (…)», nie «0 Abbrüche».

10.10.2026 (dropship/WARENKORB-MAIL-2026-10-10.md): 3 der 7 «fremden» Körbe vom 05.10. waren eigene Prüfkörbe
(…@example.com), 2 kamen von einer Wegwerf-Adresse. Deshalb zählt «echt» nur Körbe, die weder Test (Domain
example.*, Adresse beginnt mit test/qa), noch der Betreiber (eigene_kunden_id in dropship/_grow_bedingung.txt),
noch Wegwerf-/Zufallsadresse sind. Die Adresse wird nur gelesen, um die Art zu bestimmen — nie ausgegeben.

    python3 automation/checkout_abbruch_messen.py            # Ampel-Zeile
    TAGE=14 DETAIL=1 python3 automation/checkout_abbruch_messen.py   # plus eine Zeile je Korb (Produkt, CHF, Zeit)
"""
import os
import sys
import datetime as dt
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

TAGE = int(os.environ.get("TAGE", "7"))
DETAIL = os.environ.get("DETAIL") == "1"
GRATIS_RAPPEN = 4500  # Tarif «Kostenloser Versand» ab CHF 45 nach Rabatt (gemessen deliveryProfiles 05.10.2026)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DOMAIN = re.compile(r"(^|\.)(example\.(com|org|net)|test|invalid|localhost)$")
TEST_LOKAL = re.compile(r"^(test|qa)([._+-]|$)")
# Wegwerf-/Weiterleitungsdienste, gemessen an den Körben 25.09.–06.10. (Klaviyo: «USER_SUPPRESSED»/«HARD_BOUNCE»)
WEGWERF_DOMAIN = {"ilovemyemail.net", "mailinator.com", "guerrillamail.com", "yopmail.com", "10minutemail.com",
                  "tempmail.com", "trashmail.com", "sharklasers.com"}
ZUFALL_LOKAL = re.compile(r"^mail\d{6,}$")  # «mail0678498@…» — zweimal, beide Hard Bounce


def eigene_kunden_id():
    try:
        for l in open(os.path.join(REPO, "dropship", "_grow_bedingung.txt"), encoding="utf-8"):
            if l.startswith("eigene_kunden_id\t"):
                return l.split("\t", 1)[1].strip()
    except OSError:
        pass
    return None


def art(korb, eigen):
    """'test' | 'eigen' | 'wegwerf' | 'echt' (ohne Adresse: 'echt' — Shopify kennt dann nur den Korb)."""
    c = korb.get("customer") or {}
    if eigen and c.get("id") == eigen:
        return "eigen"
    mail = (c.get("email") or "").strip().lower()
    if "@" not in mail:
        return "echt"
    lokal, dom = mail.rsplit("@", 1)
    if TEST_DOMAIN.search(dom) or TEST_LOKAL.match(lokal):
        return "test"
    if dom in WEGWERF_DOMAIN or ZUFALL_LOKAL.match(lokal):
        return "wegwerf"
    return "echt"

Q_AC = """
query($q:String,$after:String){
 abandonedCheckoutsCount(query:$q){count}
 abandonedCheckouts(first:50, query:$q, after:$after, sortKey:CREATED_AT, reverse:true){
  pageInfo{hasNextPage endCursor}
  nodes{ name createdAt completedAt totalPriceSet{shopMoney{amount}} subtotalPriceSet{shopMoney{amount}}
         shippingAddress{countryCodeV2} customer{id email numberOfOrders}
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
    eigen = eigene_kunden_id()
    arten = {a: 0 for a in ("echt", "test", "eigen", "wegwerf")}
    for k in koerbe:
        k["_art"] = art(k, eigen)
        arten[k["_art"]] += 1
    echt = [k for k in koerbe if k["_art"] == "echt"]
    unter = sum(1 for k in echt if float(k["subtotalPriceSet"]["shopMoney"]["amount"]) * 100 < GRATIS_RAPPEN)
    spaeter = sum(1 for k in echt if int((k.get("customer") or {}).get("numberOfOrders") or 0) > 0 or k.get("completedAt"))
    print(f"CHECKOUT {TAGE} T: {n} Abbrüche (echt {arten['echt']} · Test {arten['test']} · eigen {arten['eigen']} · "
          f"Wegwerf {arten['wegwerf']}) · Trichter {r.get('sessions_that_reached_checkout', '?')} erreicht / "
          f"{r.get('sessions_that_completed_checkout', '?')} gekauft ({r.get('sessions', '?')} Sitzungen) · "
          f"echte unter CHF {GRATIS_RAPPEN // 100}: {unter} · echte Kundin kaufte später: {spaeter}")
    if DETAIL:
        for k in koerbe:
            li = k["lineItems"]["nodes"]
            prod = "; ".join(f"{x['quantity']}× {x['title'][:50]}" for x in li)
            land = (k.get("shippingAddress") or {}).get("countryCodeV2") or "—"
            print(f"  {k['createdAt'][:16]} [{k['_art']}] CHF {k['totalPriceSet']['shopMoney']['amount']:>6} (Ware {k['subtotalPriceSet']['shopMoney']['amount']}) "
                  f"{land} · {prod}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
