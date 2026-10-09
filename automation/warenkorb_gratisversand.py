#!/usr/bin/env python3
"""warenkorb_gratisversand.py — Versand-Hinweis im Warenkorb-Drawer (06.10.2026).

ANLASS (gemessen, dropship/WARENKORB-GRATISVERSAND-2026-10-06.md): 14 Tage, Landeseiten Sirène 227 / Provence 178 /
Aurora 158 Sitzungen → 8 Warenkorb → 6 Checkout → 0 Kauf. 5 der 7 fremden Abbruch-Körbe (21.09.–05.10.) lagen unter
CHF 45 und bekamen im Checkout erstmals «Versand CHF 7.00» zu sehen. Der Warenkorb ist ein Drawer
(settings.cart_type = drawer) — dort stand KEIN Wort zu Versand oder Gratis-Schwelle; nur die /cart-Seite nennt
«gratis ab CHF 50», und die sieht mit Drawer kaum jemand.

Regel (dieselbe wie der Produktseiten-Block `lux_trust`): Versprechen «gratis ab CHF 50», Tarif greift bewusst schon ab
CHF 45 (Puffer für den automatischen 10-%-Rabatt ab 2 Artikeln; Cowork-Punkt 1 vom 15.09. zurückgezogen).
  Korb ≥ 45 → «Gratisversand inklusive»; darunter → «Versand CHF 7 · noch X bis zum Gratisversand (ab CHF 50)».
  ⚠️ 09.10.2026: X = 50 − Warenwert VOR Rabatt (warenkorb_einig.py, ein Rechenweg mit dem Versandbalken); vorher 50 −
  Betrag NACH Rabatt (im 2er-Korb zu hoch). Der BLOCK unten trägt die neue Formel, damit ein Wieder-Einfügen sie nicht
  zurückdreht.
`cart.total_price` ist nach Rabatt, wie die Tarifbedingung; der Drawer rendert `cart-summary` bei jeder Änderung neu.

  python3 automation/warenkorb_gratisversand.py            # Trockenlauf: zeigt, was eingefügt würde
  SCHARF=1 python3 automation/warenkorb_gratisversand.py   # Live-Datei holen, sichern (/tmp), einfügen, zurücklesen
  python3 automation/warenkorb_gratisversand.py --pruefen  # Wächter (Aufseher, täglich): Hinweis live? Tarif passt?
"""
import os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette im Helfer)

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
DATEI = "snippets/cart-summary.liquid"
MARKE = "LUX-GRATISVERSAND-HINWEIS"
SCHWELLE_TECHNIK = 45.0      # aktive Nullrate «Kostenloser Versand» (deliveryProfiles, gemessen 06.10.)
SCHWELLE_VERSPRECHEN = 50.0  # Seiten, Policies, /cart, zusagen_abgleich.py
VERSAND = 7.0
ANKER = """    <div class="cart-totals__item cart-totals__tax-note cart-primary-typography">
      {% render 'tax-info', has_discounts_enabled: settings.show_add_discount_code %}
    </div>
"""
BLOCK = """    {%- comment -%} LUX-GRATISVERSAND-HINWEIS (06.10.2026, automation/warenkorb_gratisversand.py) — Tarif gratis ab 45,
        Versprechen ab 50 (Puffer für den 10-%-Mengenrabatt); dieselbe Regel wie lux_trust auf der Produktseite. {%- endcomment -%}
    {%- unless cart == empty -%}
      <div class="cart-totals__item lux-gratisversand cart-primary-typography" role="status" style="font-size:0.92em;justify-content:center;text-align:center;">
        {%- if cart.total_price >= 4500 -%}
          <span>🚚 <strong>Gratisversand inklusive</strong> · Lieferung in der Schweiz</span>
        {%- else -%}
          {%- comment -%} LUX-WARENKORB-EINIG (09.10.2026): 50 − Warenwert VOR Rabatt (jeder Zusatzartikel = −10 %),
              mindestens ⌈(45 − Betrag nach Rabatt) · 10/9⌉ — derselbe Rechenweg wie der Versandbalken. {%- endcomment -%}
          {%- assign lux_gv_rest = 5000 | minus: cart.items_subtotal_price -%}
          {%- assign lux_gv_rest2 = 4500 | minus: cart.total_price | times: 10 | plus: 8 | divided_by: 9 -%}
          {%- if lux_gv_rest2 > lux_gv_rest -%}{%- assign lux_gv_rest = lux_gv_rest2 -%}{%- endif -%}
          <span>🚚 Versand CHF 7 · noch <strong>{{ lux_gv_rest | money }}</strong> bis zum Gratisversand (ab CHF 50)</span>
        {%- endif -%}
      </div>
    {%- endunless -%}
"""


def theme_datei():
    r = gql('query($id:ID!){ theme(id:$id){ role files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % DATEI,
            {"id": THEME})["theme"]
    return r["role"], r["files"]["nodes"][0]["body"]["content"]


def tarif():
    """(Standardpreis CH, kleinste aktive Gratis-Schwelle CH) aus dem General profile."""
    q = '''{ deliveryProfiles(first:10){ nodes{ default profileLocationGroups{ locationGroupZones(first:20){ nodes{
      zone{ countries{ code{ countryCode } } }
      methodDefinitions(first:30){ nodes{ active rateProvider{ ... on DeliveryRateDefinition{ price{ amount } } }
        methodConditions{ field operator conditionCriteria{ ... on MoneyV2{ amount } } } } } } } } } } }'''
    std, gratis = None, []
    for p in gql(q)["deliveryProfiles"]["nodes"]:
        if not p["default"]:
            continue
        for g in p["profileLocationGroups"]:
            for z in g["locationGroupZones"]["nodes"]:
                if "CH" not in [c["code"]["countryCode"] for c in z["zone"]["countries"]]:
                    continue
                for m in z["methodDefinitions"]["nodes"]:
                    if not m["active"]:
                        continue
                    preis = float(((m.get("rateProvider") or {}).get("price") or {}).get("amount") or -1)
                    ab = [float(c["conditionCriteria"]["amount"]) for c in m["methodConditions"]
                          if c["field"] == "TOTAL_PRICE" and c["operator"] == "GREATER_THAN_OR_EQUAL_TO"]
                    if preis == 0 and ab:
                        gratis.append(min(ab))
                    elif preis > 0 and not ab:
                        std = preis
    return std, (min(gratis) if gratis else None)


def pruefen():
    role, inhalt = theme_datei()
    std, gratis = tarif()
    befunde = []
    if role != "MAIN":
        befunde.append(f"Theme {THEME} ist nicht MAIN ({role})")
    if MARKE not in inhalt:
        befunde.append("Hinweis fehlt im Live-Snippet (Theme-Update überschrieben?) → SCHARF=1 erneut")
    if std != VERSAND:
        befunde.append(f"Standardversand CH {std} ≠ {VERSAND} (Hinweis nennt CHF 7)")
    if gratis is None:
        befunde.append("keine aktive Gratis-Rate CH — Hinweis verspricht Gratisversand")
    elif not (gratis <= SCHWELLE_TECHNIK <= SCHWELLE_VERSPRECHEN):
        befunde.append(f"Gratis-Rate ab {gratis} > Hinweis-Schwelle {SCHWELLE_TECHNIK} — Drawer verspräche zu früh gratis")
    if befunde:
        print("⚠️ WARENKORB-VERSAND: " + " · ".join(befunde))
        return 1
    print(f"WARENKORB-VERSAND ✓: Hinweis live · Versand CHF {std:.2f} · Tarif gratis ab {gratis:.0f} ≤ Hinweis {SCHWELLE_TECHNIK:.0f} ≤ Versprechen {SCHWELLE_VERSPRECHEN:.0f}")
    return 0


def einfuegen():
    role, alt = theme_datei()
    if MARKE in alt:
        print("schon drin — nichts zu tun"); return 0
    if alt.count(ANKER) != 1:
        print(f"ANKER {alt.count(ANKER)}× gefunden (erwartet 1) — Snippet hat sich geändert, nicht blind einfügen"); return 2
    neu = alt.replace(ANKER, ANKER + BLOCK, 1)
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN: {DATEI} {len(alt)} → {len(neu)} Zeichen, Block nach der Steuer-Notiz in .cart-totals__container"); return 0
    pfad = f"/tmp/cart-summary.vor-gratisversand.{int(time.time())}.liquid"
    open(pfad, "w").write(alt)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"], "· Sicherung", pfad); return 1
    for _ in range(8):
        time.sleep(4)
        if MARKE in theme_datei()[1]:
            print(f"EINGEFÜGT + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


if __name__ == "__main__":
    sys.exit(pruefen() if "--pruefen" in sys.argv else einfuegen())
