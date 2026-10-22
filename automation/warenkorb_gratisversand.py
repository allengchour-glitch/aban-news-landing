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
                                                          # + CH-Lager-Korb (Entscheid C) in allen Live-Dateien, Zeichen = Profil

NACHTRAG 13.10.2026 abends (Betreiber-Entscheid C «C ja», dropship/GRATISVERSAND-CH-LAGER-UND-4050-2026-10-13.md): Trägt JEDE
Korbposition das Zeichen `profil-ch-lager` (Profil «CH-Lager», 0.00-Tarife, ch_lager_profil.py), rechnet die Kasse in der Schweiz
0.00. Dann sagt der Warenkorb «Gratis-Versand in der Schweiz · Ware ab Schweizer Lager» (cart-summary, data-lux-alle-chlager="1"),
der Balken (layout/theme.liquid) liest dasselbe über /cart?view=lux-chlager (templates/cart.lux-chlager.liquid) mit Rückfall auf das
Attribut, und die Produktseite (templates/product.json lux_trust + lux_delivery) nennt «Gratis-Versand in der Schweiz für Ware ab
Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50)». LI: kein Versprechen (General 14.90). --pruefen prüft die
Bedingung in ALLEN vier Live-Dateien, die Tarife des Profils (0.00, Namen wie General) und dass jedes Produkt mit Zeichen mit
ALLEN Varianten im Profil liegt (sonst verspräche der Warenkorb gratis, die Kasse nähme CHF 7) — das erfasst auch neue Importe,
die ch_lager_profil.py täglich zuordnet und zeichnet. `--schnell` lässt den Zeichen-Vollscan (≈ 65 Abfragen) weg.
"""
import os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette im Helfer)

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
DATEI = "snippets/cart-summary.liquid"
MARKE = "LUX-GRATISVERSAND-HINWEIS"
from ch_lager_profil import GRATIS_AB_CH  # noqa: E402  (eine Quelle; Entscheid D 40.50 vorbereitet)
SCHWELLE_TECHNIK = GRATIS_AB_CH   # aktive Nullrate «Kostenloser Versand» (deliveryProfiles, gemessen 06.10.: 45)
SCHWELLE_VERSPRECHEN = 50.0  # Seiten, Policies, /cart, zusagen_abgleich.py
VERSAND = 7.0
ANKER = """    <div class="cart-totals__item cart-totals__tax-note cart-primary-typography">
      {% render 'tax-info', has_discounts_enabled: settings.show_add_discount_code %}
    </div>
"""
BLOCK = """    {%- comment -%} LUX-GRATISVERSAND-HINWEIS (06.10.2026, automation/warenkorb_gratisversand.py) — Tarif gratis ab 45 (Entscheid D «ab 40.50» vorbereitet, gratis_schwelle_setzen.py),
        Versprechen ab 50 (Puffer für den 10-%-Mengenrabatt);
        dieselbe Regel wie lux_trust auf der Produktseite.
        LUX-CHLAGER-KORB (13.10.2026, Entscheid C): trägt JEDE Position das Zeichen profil-ch-lager (Profil «CH-Lager», 0.00-Tarife),
        rechnet die Kasse in der Schweiz 0.00 → «Gratis-Versand in der Schweiz · Ware ab Schweizer Lager». Notschalter = das
        Produkt-Zeichen (ch_lager_profil.py setzt es nach dem Zuordnen, entfernt es vor dem Lösen). LI: kein Versprechen. {%- endcomment -%}
    {%- unless cart == empty -%}
      {%- assign lux_alle_chlager = true -%}
      {%- for lux_ci in cart.items -%}{%- unless lux_ci.product.tags contains 'profil-ch-lager' -%}{%- assign lux_alle_chlager = false -%}{%- break -%}{%- endunless -%}{%- endfor -%}
      <div class="cart-totals__item lux-gratisversand cart-primary-typography" role="status"{% if lux_alle_chlager %} data-lux-alle-chlager="1"{% endif %} style="font-size:0.92em;justify-content:center;text-align:center;">
        {%- if lux_alle_chlager -%}
          <span>🚚 <strong>Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager</span>
        {%- elsif cart.total_price >= 4500 -%}
          <span>🚚 <strong>Gratisversand inklusive</strong> · Lieferung in der Schweiz</span>
        {%- else -%}
          {%- comment -%} LUX-WARENKORB-EINIG (09.10.2026): 50 − Warenwert VOR Rabatt (jeder Zusatzartikel = −10 %),
              mindestens ⌈(45.00 − Betrag nach Rabatt) · 10/9⌉ — derselbe Rechenweg wie der Versandbalken. {%- endcomment -%}
          {%- assign lux_gv_rest = 5000 | minus: cart.items_subtotal_price -%}
          {%- assign lux_gv_rest2 = 4500 | minus: cart.total_price | times: 10 | plus: 8 | divided_by: 9 -%}
          {%- if lux_gv_rest2 > lux_gv_rest -%}{%- assign lux_gv_rest = lux_gv_rest2 -%}{%- endif -%}
          <span>🚚 Versand in der Schweiz CHF 7 · noch <strong>{{ lux_gv_rest | money }}</strong> bis zum Gratisversand (ab CHF 50)</span>
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


CHL_PFLICHT = {   # Datei → Textstücke, die live stehen müssen (Entscheid C)
    "snippets/cart-summary.liquid": ["contains 'profil-ch-lager'", 'data-lux-alle-chlager="1"',
                                     "Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager"],
    "layout/theme.liquid": ["/cart?view=lux-chlager", "cart.alle_chlager===true", 'data-lux-alle-chlager="1"',
                            "Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager"],
    "templates/cart.lux-chlager.liquid": ["{%- layout none -%}", "contains 'profil-ch-lager'", '"alle_chlager"'],
    "templates/product.json": ["product.tags contains 'profil-ch-lager' %}", "closest.product.tags contains 'profil-ch-lager' %}",
                               "für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50 nach Rabatt)"],   # 22.10.2026: «nach Rabatt» (Mengenrabatt -10 % ab 2 Artikeln, Tarif 50)
}


def chlager_pruefen(snippet=None):
    """Befunde zu Entscheid C: Bedingung in allen Live-Dateien, Schwellen-Zahl = Tarif, Profil-Tarife, Zeichen = Profil."""
    import json as _json
    bef = []
    r = gql('query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f,first:10){ nodes{ filename body{ ... on '
            'OnlineStoreThemeFileBodyText{ content } } } } } }', {"id": THEME, "f": list(CHL_PFLICHT)})["theme"]["files"]["nodes"]
    da = {n["filename"]: n["body"]["content"] for n in r}
    for datei, teile in CHL_PFLICHT.items():
        c = da.get(datei)
        if c is None:
            bef.append(f"{datei} fehlt"); continue
        if datei == "templates/product.json":   # JSON-Escape der Anführungszeichen ausgleichen
            c = c.replace('\\"', '"')
        fehlt = [t for t in teile if t not in c]
        if fehlt:
            bef.append(f"{datei}: fehlt {fehlt}")
    t = int(round(SCHWELLE_TECHNIK * 100))
    if f"cart.total_price >= {t}" not in da.get("snippets/cart-summary.liquid", ""):
        bef.append(f"cart-summary: Schwelle ≠ {t}")
    if f"tot>={t}" not in da.get("layout/theme.liquid", ""):
        bef.append(f"theme.liquid Balken: Schwelle ≠ {t}")
    try:
        import ch_lager_profil as chl
        pid = chl.profil_finden()
        gm = chl.zonen_methoden(chl.gql(chl.Q_PROFIL, {"id": chl.GENERAL}, ver="unstable")["deliveryProfile"])
        cm = chl.zonen_methoden(chl.gql(chl.Q_PROFIL, {"id": pid}, ver="unstable")["deliveryProfile"])
        bef += [f"Profil CH-Lager: {b}" for b in chl.tarife_pruefen(cm, gm)]
    except Exception as e:  # noqa: BLE001
        bef.append(f"Profil-Tarife nicht prüfbar: {type(e).__name__}")
    if "--schnell" not in sys.argv:
        nach, teil, n = None, [], 0
        while True:
            d = gql('query($n:String){products(first:25,after:$n,query:"tag:profil-ch-lager"){pageInfo{hasNextPage endCursor} '
                    'nodes{handle variantsCount{count} variants(first:60){nodes{deliveryProfile{name}}}}}}', {"n": nach})["products"]
            for p in d["nodes"]:
                n += 1
                vs = p["variants"]["nodes"]
                if p["variantsCount"]["count"] > len(vs) or any((v["deliveryProfile"] or {}).get("name") != "CH-Lager" for v in vs):
                    teil.append(p["handle"])
            if not d["pageInfo"]["hasNextPage"]:
                break
            nach = d["pageInfo"]["endCursor"]
        if teil:
            bef.append(f"{len(teil)} von {n} Produkten mit Zeichen haben Varianten ausserhalb «CH-Lager» (Warenkorb gratis, Kasse 7): {teil[:5]}")
    return bef


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
    befunde += chlager_pruefen(inhalt)
    if befunde:
        print("⚠️ WARENKORB-VERSAND: " + " · ".join(befunde))
        return 1
    print(f"CH-LAGER-KORB ✓: 4 Live-Dateien mit Bedingung profil-ch-lager · Profil-Tarife 0.00 · Zeichen = Profil")
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
