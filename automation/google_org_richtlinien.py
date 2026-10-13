#!/usr/bin/env python3
"""google_org_richtlinien.py — Rückgabe- und Versandregel als Organization-Markup (06.10.2026).

ANLASS (gemessen): Search Console meldete am 06.10. «Händlereinträge»: «shippingDetails fehlt (in offers)»,
«hasMerchantReturnPolicy fehlt (in offers)»; Live-JSON-LD der Provence-Seite: Offer ohne beide Felder, Organization
(sections/header.liquid, auf jeder Seite) nur name/logo/url. Google empfiehlt beides EINMAL für den ganzen Shop unter
`Organization` (developers.google.com/search/docs/appearance/structured-data/merchant-listing: «We recommend you provide a
global return policy / shipping policy for your business under Organization markup instead»).

FAKTEN (Kanon = shopPolicies, siehe zusagen_abgleich.py; Tarif = deliveryProfiles, gemessen 06.10.):
  Rückgabe  Schweiz, 30 Tage, per Post, Rücksendeporto trägt die Kundin, volle Erstattung.
  Versand   Schweiz, CHF 7.00; ab Bestellwert GRATIS_AB_CH gratis (Tarif, EINE Quelle ch_lager_profil.GRATIS_AB_CH: 45;
            Betreiber-Entscheid D 40.50 vorbereitet; Versprechen auf den Seiten «ab 50» = Puffer). Stellt jemand die Konstante um,
            meldet --pruefen «Markup veraltet» und der Aufseher schreibt das Markup neu (SCHARF=1).
            Liechtenstein (seit 09.10. Lieferland, Nachtrag 13.10.2026 Kauf-Strecke Klasse 16): CHF 14.90, KEIN Gratisversand
            (Zone «Liechtenstein» im General profile, gemessen 13.10.); Rückgabe 30 Tage gilt laut Richtlinie für CH und LI.
  Ein bestehendes Markup ohne LI wird beim SCHARF-Lauf ERSETZT (nicht nur eingefügt, wenn es fehlt).

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
from ch_lager_profil import GRATIS_AB_CH as GRATIS_AB_CHF  # noqa: E402  (eine Quelle; Entscheid D 40.50 vorbereitet)
LI_VERSAND_CHF = 14.90
LAENDER = ["CH", "LI"]


def markup():
    rueckgabe = {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": LAENDER,
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
    versand_li = {
        "@type": "ShippingService",
        "name": "Versand Liechtenstein",
        "shippingConditions": [
            {"@type": "ShippingConditions", "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "LI"},
             "shippingRate": {"@type": "MonetaryAmount", "value": LI_VERSAND_CHF, "currency": "CHF"}},
        ],
    }
    teil = json.dumps({"hasMerchantReturnPolicy": rueckgabe, "hasShippingService": [versand, versand_li]}, ensure_ascii=False)
    return teil[1:-1]   # ohne äussere Klammern → wird als weitere Felder ins Organization-Objekt gesetzt


def neu_aus(alt):
    block = ('    "url": {{ request.origin | append: page.url | json }},\n'
             f'    {{%- comment -%}} {MARKE} (06.10.2026, automation/google_org_richtlinien.py) {{%- endcomment -%}}\n'
             f'    {markup()}\n  }}\n</script>')
    return alt.replace(ANKER, block, 1)


def aktualisiert(alt):
    """Ersetzt eine vorhandene (ältere) Markup-Zeile direkt unter der MARKE durch markup(); None, wenn nichts zu tun."""
    i = alt.find(MARKE)
    if i < 0:
        return None
    a = alt.find("\n", i) + 1
    e = alt.find("\n", a)
    zeile = alt[a:e]
    if '"hasMerchantReturnPolicy"' not in zeile:
        return None
    soll = "    " + markup()
    return None if zeile == soll else alt[:a] + soll + alt[e:]


def tarif_li():
    """Preis(e) der aktiven Raten in der LI-Zone des General profile."""
    q = '''{ deliveryProfiles(first:10){ nodes{ default profileLocationGroups{ locationGroupZones(first:20){ nodes{
      zone{ countries{ code{ countryCode } } }
      methodDefinitions(first:30){ nodes{ active rateProvider{ ... on DeliveryRateDefinition{ price{ amount } } } } } } } } } } }'''
    preise = set()
    for p in gql(q)["deliveryProfiles"]["nodes"]:
        if not p["default"]:
            continue
        for g in p["profileLocationGroups"]:
            for z in g["locationGroupZones"]["nodes"]:
                if "LI" in [c["code"]["countryCode"] for c in z["zone"]["countries"]]:
                    preise |= {float(((m.get("rateProvider") or {}).get("price") or {}).get("amount") or -1)
                               for m in z["methodDefinitions"]["nodes"] if m["active"]}
    return sorted(preise)


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
    elif aktualisiert(inhalt) is not None:
        b.append("Markup veraltet (z. B. ohne Liechtenstein) → SCHARF=1 erneut")
    li = tarif_li()
    if li != [LI_VERSAND_CHF]:
        b.append(f"Liechtenstein-Tarif {li} ≠ Markup {LI_VERSAND_CHF}")
    if std != VERSAND_CHF:
        b.append(f"Standardversand {std} ≠ Markup {VERSAND_CHF}")
    if gratis is None or abs(gratis - GRATIS_AB_CHF) > 0.005:
        b.append(f"Gratis-Schwelle Tarif {gratis} ≠ Markup {GRATIS_AB_CHF}")
    if b:
        print("⚠️ GOOGLE-ORG-RICHTLINIEN: " + " · ".join(b)); return 1
    print(f"GOOGLE-ORG-RICHTLINIEN ✓: Rückgabe {RUECKGABE_TAGE} T CH+LI · Versand CHF {std:.2f} / gratis ab {gratis:.2f} · LI {LI_VERSAND_CHF:.2f} = Tarif")
    return 0


def einfuegen():
    role, alt = datei()
    if MARKE in alt:
        neu = aktualisiert(alt)
        if neu is None:
            print("schon drin (aktuell)"); return 0
    elif alt.count(ANKER) != 1:
        print(f"ANKER {alt.count(ANKER)}× (erwartet 1) — Header geändert, nicht blind einfügen"); return 2
    else:
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
        if datei()[1] == neu:
            print(f"EINGEFÜGT + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


if __name__ == "__main__":
    sys.exit(pruefen() if "--pruefen" in sys.argv else einfuegen())
