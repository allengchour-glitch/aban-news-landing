#!/usr/bin/env python3
"""geschenkkarte_anlegen.py — LuxeStyle Geschenkkarte CHF 25/50/100 (Betreiber «1 2 3 ja», 27.11.2026).

ANLASS (Workflow mehr-einkaeufe-push, dropship/verkauf-2711/PUSH.md Punkt 3): Direktversand 10–20 Werktage → ab Ende
November liegt das späteste Lieferdatum nach Heiligabend. Die Geschenkkarte kommt sofort per E-Mail.
VORAUSSETZUNG (27.11. gemessen): productSet mit giftCard:true → «Gift card products can only be created after they have
been activated» → der Betreiber aktiviert Geschenkkarten EINMAL im Admin (Produkte → Geschenkkarten). Ablaufdatum ist
eine Shop-Einstellung (Einstellungen → Geschenkkarten), per API nur lesbar (giftCardConfiguration.expirationConfiguration).
Ablauf:
  1) vorhandenes Geschenkkarten-Produkt suchen (gift_card:true) → aktualisieren, sonst neu anlegen (Handle geschenkkarte)
  2) in Onlineshop + Shop publizieren (NICHT Google: Tag nicht-google-bewerben)
  3) AGB-Abschnitt «Geschenkkarten» (Gültigkeit aus der Shop-Einstellung, sonst «verfällt nicht»)
  python3 automation/geschenkkarte_anlegen.py            # Trockenlauf
  SCHARF=1 python3 automation/geschenkkarte_anlegen.py   # schreiben + zurücklesen
"""
import json, os, sys, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

BILD = "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-geschenkkarte.jpg?v=1795782551"
PUBS = ["gid://shopify/Publication/301970915713", "gid://shopify/Publication/301971014017"]   # Online Store, Shop
BETRAEGE = (25, 50, 100)
MARKE = "<!-- lx-geschenkkarte-agb -->"
DESC = ('<p>Die LuxeStyle Geschenkkarte kommt <strong>sofort nach dem Kauf per E-Mail</strong> – die Lösung, wenn es bis Weihnachten knapp wird. '
        'Du kannst sie dir selbst schicken lassen oder direkt an die beschenkte Person, auch mit Wunschdatum und persönlicher Nachricht.</p>'
        '<ul><li>Beträge: CHF 25, CHF 50 oder CHF 100</li><li>Einlösbar auf luxestyle.ch für alle Artikel, auch in mehreren Einkäufen – das Restguthaben bleibt auf der Karte</li>'
        '<li>Kein Versand, keine Lieferzeit: der Code kommt per E-Mail</li><li>Keine Barauszahlung</li></ul>')


def ablauf_text():
    """Gültigkeit aus der Shop-Einstellung (API 2026-04+), sonst «verfällt nicht»."""
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')}/admin/api/2026-10/graphql.json",
                                 data=json.dumps({"query": "{giftCardConfiguration{expirationConfiguration{expirationValue expirationUnit}}}"}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    k = json.load(urllib.request.urlopen(req, timeout=30))["data"]["giftCardConfiguration"]["expirationConfiguration"]
    if not k:
        return "Geschenkkarten verfallen nicht."
    einheit = {"DAYS": "Tage", "MONTHS": "Monate", "YEARS": "Jahre"}[k["expirationUnit"]]
    if k["expirationValue"] == 1:
        einheit = {"Tage": "Tag", "Monate": "Monat", "Jahre": "Jahr"}[einheit]
    return f"Geschenkkarten sind ab Kaufdatum {k['expirationValue']} {einheit} gültig; das Ablaufdatum steht in der E-Mail mit dem Code."


def main():
    scharf = os.environ.get("SCHARF") == "1"
    vorh = gql('query{products(first:5,query:"gift_card:true"){nodes{id handle title status variants(first:10){nodes{id price}}}}}')["products"]["nodes"]
    print("vorhandene Geschenkkarten-Produkte:", [(p["handle"], p["status"]) for p in vorh])
    inp = {"title": "LuxeStyle Geschenkkarte – sofort per E-Mail", "giftCard": True, "status": "ACTIVE",
           "vendor": "LuxeStyle", "productType": "Geschenkkarte", "category": "gid://shopify/TaxonomyCategory/gc",
           "tags": ["geschenkkarte", "geschenk", "nicht-google-bewerben", "weihnachten"], "descriptionHtml": DESC,
           "seo": {"title": "Geschenkkarte – sofort per E-Mail | LuxeStyle CH",
                   "description": "LuxeStyle Geschenkkarte über CHF 25, 50 oder 100, sofort per E-Mail. Einlösbar auf luxestyle.ch, Restguthaben bleibt erhalten."},
           "productOptions": [{"name": "Betrag", "values": [{"name": f"CHF {b}"} for b in BETRAEGE]}],
           "variants": [{"optionValues": [{"optionName": "Betrag", "name": f"CHF {b}"}], "price": f"{b}.00"} for b in BETRAEGE],
           "files": [{"originalSource": BILD, "alt": "LuxeStyle Geschenkkarte", "contentType": "IMAGE"}]}
    if vorh:
        inp["id"] = vorh[0]["id"]
    else:
        inp["handle"] = "geschenkkarte"
    agb_satz = ablauf_text()
    print("Produkt:", "aktualisieren " + vorh[0]["handle"] if vorh else "neu anlegen", "| AGB:", agb_satz)
    if not scharf:
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    r = gql('mutation($i:ProductSetInput!){productSet(input:$i,synchronous:true){product{id handle isGiftCard variants(first:5){nodes{price}}} userErrors{field message}}}',
            {"i": inp})["productSet"]
    if r["userErrors"]:
        raise SystemExit(f"productSet: {r['userErrors']}")
    p = r["product"]; print("✓", p["handle"], p["isGiftCard"], [v["price"] for v in p["variants"]["nodes"]])
    u = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{message}}}',
            {"id": p["id"], "i": [{"publicationId": x} for x in PUBS]})["publishablePublish"]
    print("publiziert", u["userErrors"] or "✓")
    # AGB-Abschnitt (einmal; bei geänderter Gültigkeit wird der Abschnitt ersetzt)
    pol = [x for x in gql('query{shop{shopPolicies{type body}}}')["shop"]["shopPolicies"] if x["type"] == "TERMS_OF_SERVICE"][0]["body"]
    abschnitt = (f'{MARKE}<h3>Geschenkkarten</h3><p>Geschenkkarten werden per E-Mail zugestellt und sind auf luxestyle.ch für alle Artikel einlösbar, '
                 f'auch in mehreren Einkäufen. {agb_satz} Eine Barauszahlung oder Rückerstattung des Guthabens ist ausgeschlossen, '
                 'ausser das Gesetz schreibt sie vor. Für verlorene Codes haften wir nicht; melde dich bei info@luxestyle.ch, wir sperren den Code und stellen bei Nachweis einen neuen aus.</p>' + MARKE)
    if MARKE in pol:
        a = pol.index(MARKE); e = pol.index(MARKE, a + 1) + len(MARKE)
        neu = pol[:a] + abschnitt + pol[e:]
    else:
        neu = pol + abschnitt
    if neu != pol:
        open(os.path.join(HIER, "..", "dropship", "verkauf-2711", "agb-vor-geschenkkarte.html"), "w").write(pol)
        u = gql('mutation($p:ShopPolicyInput!){shopPolicyUpdate(shopPolicy:$p){userErrors{message}}}',
                {"p": {"type": "TERMS_OF_SERVICE", "body": neu}})["shopPolicyUpdate"]
        print("AGB", u["userErrors"] or "✓ Abschnitt Geschenkkarten")
    return 0


if __name__ == "__main__":
    sys.exit(main())
