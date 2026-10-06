#!/usr/bin/env python3
"""google_org_richtlinien.py — Rückgabe- und Versandregel als Organization-Markup (06.10.2026).

ANLASS (gemessen): Search Console meldete am 06.10. «Händlereinträge»: «shippingDetails fehlt (in offers)»,
«hasMerchantReturnPolicy fehlt (in offers)»; Live-JSON-LD der Provence-Seite: Offer ohne beide Felder, Organization
(sections/header.liquid, auf jeder Seite) nur name/logo/url. Google empfiehlt beides EINMAL für den ganzen Shop unter
`Organization` (developers.google.com/search/docs/appearance/structured-data/merchant-listing: «We recommend you provide a
global return policy / shipping policy for your business under Organization markup instead»).

FAKTEN (Kanon = shopPolicies, siehe zusagen_abgleich.py; Tarif = deliveryProfiles, gemessen 06.10.):
  Rückgabe  Schweiz, 30 Tage, per Post, Rücksendeporto trägt die Kundin, volle Erstattung.
  Versand   Schweiz, CHF 7.00; ab Bestellwert CHF 45 gratis (Tarif; Versprechen auf den Seiten «ab 50» = Puffer).

  python3 automation/google_org_richtlinien.py            # Trockenlauf
  SCHARF=1 python3 automation/google_org_richtlinien.py   # Live-Datei holen, sichern (/tmp), einfügen, zurücklesen
  python3 automation/google_org_richtlinien.py --pruefen  # Wächter (Aufseher, täglich): Markup live, Tarif passt?
"""
import json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette im Helfer)
import warenkorb_gratisversand as wg  # noqa: E402  (tarif(), THEME)

DATEI = "sections/header.liquid"
MARKE = "LUX-ORG-RICHTLINIEN"
ANKER = '''    "url": {{ request.origin | append: page.url | json }}
  }
</script>'''
RUECKGABE_TAGE = 30
VERSAND_CHF = 7.00
GRATIS_AB_CHF = 45.00


def markup():
    rueckgabe = {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "CH",
        "returnPolicyCountry": "CH",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": RUECKGABE_TAGE,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
        "refundType": "https://schema.org/FullRefund",
    }
    ziel = {"@type": "DefinedRegion", "addressCountry": "CH"}
    versand = {
        "@type": "ShippingService",
        "name": "Versand Schweiz",
        "shippingConditions": [
            {"@type": "ShippingConditions", "shippingDestination": ziel,
             "orderValue": {"@type": "MonetaryAmount", "currency": "CHF", "minValue": 0, "maxValue": GRATIS_AB_CHF - 0.01},
             "shippingRate": {"@type": "MonetaryAmount", "value": VERSAND_CHF, "currency": "CHF"}},
            {"@type": "ShippingConditions", "shippingDestination": ziel,
             "orderValue": {"@type": "MonetaryAmount", "currency": "CHF", "minValue": GRATIS_AB_CHF},
             "shippingRate": {"@type": "MonetaryAmount", "value": 0, "currency": "CHF"}},
        ],
    }
    teil = json.dumps({"hasMerchantReturnPolicy": rueckgabe, "hasShippingService": [versand]}, ensure_ascii=False)
    return teil[1:-1]   # ohne äussere Klammern → wird als weitere Felder ins Organization-Objekt gesetzt


def neu_aus(alt):
    block = ('    "url": {{ request.origin | append: page.url | json }},\n'
             f'    {{%- comment -%}} {MARKE} (06.10.2026, automation/google_org_richtlinien.py) {{%- endcomment -%}}\n'
             f'    {markup()}\n  }}\n</script>')
    return alt.replace(ANKER, block, 1)


def datei():
    r = gql('query($id:ID!){ theme(id:$id){ role files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % DATEI,
            {"id": wg.THEME})["theme"]
    return r["role"], r["files"]["nodes"][0]["body"]["content"]


def pruefen():
    role, inhalt = datei()
    std, gratis = wg.tarif()
    b = []
    if MARKE not in inhalt:
        b.append("Markup fehlt im Live-Header (Theme-Update?) → SCHARF=1 erneut")
    if std != VERSAND_CHF:
        b.append(f"Standardversand {std} ≠ Markup {VERSAND_CHF}")
    if gratis != GRATIS_AB_CHF:
        b.append(f"Gratis-Schwelle Tarif {gratis} ≠ Markup {GRATIS_AB_CHF}")
    if b:
        print("⚠️ GOOGLE-ORG-RICHTLINIEN: " + " · ".join(b)); return 1
    print(f"GOOGLE-ORG-RICHTLINIEN ✓: Rückgabe {RUECKGABE_TAGE} T · Versand CHF {std:.2f} / gratis ab {gratis:.0f} = Tarif")
    return 0


def einfuegen():
    role, alt = datei()
    if MARKE in alt:
        print("schon drin"); return 0
    if alt.count(ANKER) != 1:
        print(f"ANKER {alt.count(ANKER)}× (erwartet 1) — Header geändert, nicht blind einfügen"); return 2
    neu = neu_aus(alt)
    json.loads("{" + markup() + "}")   # gültiges JSON
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN: {DATEI} {len(alt)} → {len(neu)} Zeichen\n{markup()[:300]}…"); return 0
    pfad = f"/tmp/header.vor-org-richtlinien.{int(time.time())}.liquid"
    open(pfad, "w").write(alt)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": wg.THEME, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"], "· Sicherung", pfad); return 1
    for _ in range(8):
        time.sleep(4)
        if MARKE in datei()[1]:
            print(f"EINGEFÜGT + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


if __name__ == "__main__":
    sys.exit(pruefen() if "--pruefen" in sys.argv else einfuegen())
