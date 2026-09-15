#!/usr/bin/env python3
"""versand_testkorb.py — beantwortet die Frage aus Cowork-Punkt 1 OHNE Browser.

Frage: Rechnet Shopifys Versandbedingung «Gesamtpreis ≥ X» VOR oder NACH dem automatischen
Rabatt? Davon haengt ab, ob die Gratis-Versand-Schwelle auf 45 bleiben muss (Shop verspricht 50).

Messung: zwei echte Warenkoerbe ueber die Storefront-API, beide rund CHF 52 —
  (a) ZWEI Artikel  → der automatische 10-%-Rabatt ab 2 Artikeln greift
  (b) EIN  Artikel  → kein Rabatt
Danach je Korb: Zwischentotal, Total, und die angebotenen Versandarten mit Preis.

  (a) Versand CHF 7 und (b) gratis  → Shopify rechnet NACH Rabatt → 45 muss bleiben.
  beide gratis                      → rechnet VOR Rabatt → Umstellung auf 50 ist gefahrlos.

Aufruf: python3 tools/versand_testkorb.py <varianten-gid> [<zweite-gid>]
Token: /tmp/sf_token.txt (Storefront), erzeugt per storefrontAccessTokenCreate.
"""
import json, sys, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
ADRESSE = {"address1": "Dorfstrasse 1", "city": "Belp", "zip": "3123", "country": "Switzerland", "province": "BE"}

def sf(q, v=None):
    tok = open("/tmp/sf_token.txt").read().strip()
    r = urllib.request.Request(f"https://{SHOP}/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Storefront-Access-Token": tok, "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(r, timeout=60))

CART = """mutation($lines:[CartLineInput!]!,$adr:MailingAddressInput!){
 cartCreate(input:{lines:$lines, buyerIdentity:{countryCode:CH,
   deliveryAddressPreferences:[{deliveryAddress:$adr}]}}){
  cart{ id
    cost{ subtotalAmount{amount currencyCode} totalAmount{amount} checkoutChargeAmount{amount} }
    discountAllocations{ discountedAmount{amount} }
    lines(first:10){ nodes{ quantity cost{ subtotalAmount{amount} totalAmount{amount} } } }
    deliveryGroups(first:5){ nodes{ deliveryOptions{ title estimatedCost{amount} } } } }
  userErrors{ field message } } }"""

def korb(gids, name):
    lines = [{"merchandiseId": g, "quantity": 1} for g in gids]
    d = sf(CART, {"lines": lines, "adr": ADRESSE})
    if d.get("errors"):
        print(name, "FEHLER:", json.dumps(d["errors"], ensure_ascii=False)[:300]); return
    c = d["data"]["cartCreate"]
    if c["userErrors"]:
        print(name, "userErrors:", c["userErrors"]); return
    k = c["cart"]
    zwischen = float(k["cost"]["subtotalAmount"]["amount"])
    total = float(k["cost"]["totalAmount"]["amount"])
    rabatt = sum(float(x["discountedAmount"]["amount"]) for x in k["discountAllocations"])
    zeilen = sum(float(x["cost"]["subtotalAmount"]["amount"]) for x in k["lines"]["nodes"])
    print(f"\n=== {name} ({len(gids)} Artikel) ===")
    print(f"  Zeilensumme vor Rabatt : CHF {zeilen:.2f}")
    print(f"  Zwischentotal (subtotal): CHF {zwischen:.2f}")
    print(f"  Rabatt auf den Korb    : CHF {rabatt:.2f}")
    print(f"  Total                  : CHF {total:.2f}")
    opts = []
    for g in k["deliveryGroups"]["nodes"]:
        for o in g["deliveryOptions"]:
            opts.append((o["title"], float(o["estimatedCost"]["amount"])))
    if not opts:
        print("  Versandarten           : KEINE zurueckgegeben (Adresse/Zone pruefen)")
    for t, p in opts:
        print(f"  Versand: {t:<38} CHF {p:.2f}" + ("   ← GRATIS" if p == 0 else ""))
    return zwischen, total, opts

if __name__ == "__main__":
    gids = sys.argv[1:]
    if not gids:
        print(__doc__); sys.exit(1)
    korb(gids, "Testkorb")
