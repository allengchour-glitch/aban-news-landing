#!/usr/bin/env python3
"""testkorb_ausland.py — Kann eine NICHT-Schweizerin bei uns bestellen?

ANLASS 18.09.2026: Die Gegenprüfung des Cowork-Stands fand, dass das Standard-Versandprofil
(an dem der GANZE Katalog hängt) eine AKTIVE Zone «International — Rest of World, CHF 15.00
pauschal, ohne Bedingung» führt, und `shop { shipsToCountries }` meldet 237 Länder. Gleichzeitig
gibt es genau EINEN Markt: «Switzerland», Länder [CH]. Zwei Ebenen, die sich widersprechen.

Auf dem Papier sah das nach einer offenen Tür aus: ein Paket nach Übersee zu CHF 15 wäre die
#1004-Klasse (Versand teurer als Ware), nur schlimmer — und es stünde quer zu allem, was wir
sonst durchsetzen (202 Pinterest-Pins wurden am 16.09. beanstandet, weil sie «weltweiten
Versand» versprachen).

GEMESSEN 18.09. 20:20 UTC mit diesem Skript: CH bekommt 2 Versandoptionen, DE und US bekommen
NULL und einen leeren Korb (Total 0.00). **Die Markt-Ebene gewinnt, die Zone ist totes
Konfigurat.** Die alarmierende Lesart war falsch — aber erst die Messung konnte das zeigen.

⚠️ KANARIENVOGEL: Der CH-Korb läuft als erster Fall. Liefert ER keine Optionen, misst der Test
gar nichts, und die leeren DE/US-Antworten sind BEDEUTUNGSLOS — dann darf niemand daraus
«kein Auslandsversand» lesen. Eine Null ist erst ein Ergebnis, wenn das Werkzeug zeigen kann,
dass es auch etwas findet.

Rein lesend: cartCreate legt einen Warenkorb an, keine Bestellung.
Token: /tmp/sf_token.txt (Storefront). Aufruf: python3 tools/testkorb_ausland.py
"""
import json, sys, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/sf_token.txt").read().strip()

def sf(q, v=None):
    r = urllib.request.Request(f"https://{SHOP}/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Storefront-Access-Token": TOK, "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(r, timeout=60).read())

# Eine kaufbare Variante holen
d = sf('{ products(first:3, query:"available_for_sale:true"){nodes{title variants(first:1){nodes{id price{amount}}}}} }')
if d.get("errors"):
    sys.exit("Storefront-API: " + json.dumps(d["errors"])[:300])
nodes = d["data"]["products"]["nodes"]
var = None
for p in nodes:
    vs = p["variants"]["nodes"]
    if vs:
        var, titel, preis = vs[0]["id"], p["title"], vs[0]["price"]["amount"]
        break
if not var:
    sys.exit("keine kaufbare Variante gefunden")
print(f"Testartikel: {titel} · CHF {preis}\n")

CART = """mutation($lines:[CartLineInput!]!,$land:CountryCode!,$adr:MailingAddressInput!)
 @inContext(country:$land){
 cartCreate(input:{lines:$lines, buyerIdentity:{countryCode:$land,
   deliveryAddressPreferences:[{deliveryAddress:$adr}]}}){
  cart{ id cost{ totalAmount{amount currencyCode} }
    deliveryGroups(first:5){ nodes{ deliveryOptions{ title estimatedCost{amount currencyCode} } } } }
  userErrors{ field message } } }"""

FAELLE = [
    ("KANARIENVOGEL Schweiz", "CH", {"address1":"Dorfstrasse 1","city":"Belp","zip":"3123","country":"Switzerland","province":"BE"}),
    ("Deutschland",           "DE", {"address1":"Hauptstrasse 1","city":"Muenchen","zip":"80331","country":"Germany"}),
    ("USA",                   "US", {"address1":"1 Main St","city":"Austin","zip":"78701","country":"United States","province":"TX"}),
    # 19.09.2026 dazu: Liechtenstein ist an 13 SICHTBAREN Stellen zugesagt (7 veroeffentlichte
    # Seiten + 6x in den Rechtstexten, die im Checkout verlinkt sind) — und bekommt trotzdem
    # keine Versandoption. Der Fall gehoert dauerhaft in diesen Test, damit die Zusage und die
    # Wirklichkeit im selben Lauf nebeneinander stehen.
    ("Liechtenstein",         "LI", {"address1":"Staedtle 1","city":"Vaduz","zip":"9490","country":"Liechtenstein"}),
]

ergebnis = {}
for name, land, adr in FAELLE:
    d = sf(CART, {"lines":[{"merchandiseId":var,"quantity":1}], "land":land, "adr":adr})
    if d.get("errors"):
        print(f"{name:26} FEHLER: {json.dumps(d['errors'],ensure_ascii=False)[:160]}"); ergebnis[land]=None; continue
    c = d["data"]["cartCreate"]
    if c["userErrors"]:
        print(f"{name:26} abgelehnt: {c['userErrors']}"); ergebnis[land]=0; continue
    opts = [o for g in c["cart"]["deliveryGroups"]["nodes"] for o in g["deliveryOptions"]]
    tot = c["cart"]["cost"]["totalAmount"]
    print(f"{name:26} Total {tot['amount']} {tot['currencyCode']} · Versandoptionen: {len(opts)}")
    for o in opts[:4]:
        print(f"{'':28}   {o['title']}: {o['estimatedCost']['amount']} {o['estimatedCost']['currencyCode']}")
    ergebnis[land] = len(opts)

print()
if ergebnis.get("CH") in (0, None):
    print("⛔ KANARIENVOGEL STUMM — der CH-Korb liefert keine Optionen. Der Test misst nichts;")
    print("   die DE/US-Ergebnisse sind BEDEUTUNGSLOS und duerfen nicht als 'kein Auslandsversand' gelten.")
else:
    aus = [l for l in ("DE","US","LI") if ergebnis.get(l)]
    if aus:
        print(f"⚠️ AUSLANDSVERSAND IST BESTELLBAR: {', '.join(aus)} bekommen echte Versandoptionen.")
    else:
        print("✅ Nur die Schweiz bekommt Versandoptionen — DE und US werden im Korb abgewiesen,")
        print("   obwohl die 'International'-Zone im Versandprofil aktiv ist. Der Markt sperrt sie.")
    if not ergebnis.get("LI") and ergebnis.get("CH"):
        print("⚠️ LIECHTENSTEIN: zugesagt, aber nicht bestellbar — 0 Versandoptionen.")
        print("   13 sichtbare Stellen nennen LI, 6 davon in den Rechtstexten im Checkout.")
        print("   Entscheid steht aus: einschalten oder aus den Texten streichen (COWORK-BEFEHL Punkt 5).")
