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

NACHTRAG 26.11.2026 (Theme-Wechsel 21.11., dropship/theme-id-2611/URTEILE.md): KEINE feste Theme-ID mehr. Bis 26.11. stand hier fest
187533001089 (seit 21.11. unveröffentlicht) — der Wächter war blind, der Reparaturpfad schrieb ins falsche Theme. Jetzt holt jeder
Lauf die ID des Live-Themes erst zur Laufzeit EINMAL (live_theme() → main_theme.gid(), fail-closed) und liest/schreibt nur dort; der
Import dieses Moduls fragt nichts ab. Weil der Reparaturpfad damit das Live-Theme erreicht, ist BLOCK jetzt aus EINER Quelle abgeleitet
(Entscheid 22.10. «Alle auf CHF 50», «50 behalten, Text anpassen»):
  Korb ≥ TARIF (5000 Rappen, NACH Rabatt) → «Gratisversand inklusive»; darunter «noch X bis zum Gratisversand (ab CHF 50 nach Rabatt)»,
  X = max(VERSPRECHEN − Warenwert VOR Rabatt, ⌈(TARIF − Betrag nach Rabatt) · 10/9⌉), VERSPRECHEN = ⌈TARIF/0,9⌉ = 5556
  (der 10-%-Mengenrabatt ab 2 Artikeln drückt Körbe 50.00–55.55 unter 50). Zahlen und Text kommen aus warenkorb_einig (TARIF,
  VERSPRECHEN, TEXT_SCHWELLE), dort aus ch_lager_profil.GRATIS_AB_CH. Die Zeilen «Tarif gratis ab 45 / Versprechen ab 50» oben sind
  Geschichte. --pruefen vergleicht zusätzlich den Live-Block (ohne Kommentare) mit BLOCK und meldet jede Abweichung (nur melden).
  Steht Hinweis-Code OHNE Marke im Snippet (z. B. nur der Kopfkommentar weg), meldet --pruefen das ohne Reizwort und es wird NICHT
  eingefügt (sonst zwei Hinweise im Drawer); ebenso ein doppelter Hinweis.
  python3 automation/warenkorb_gratisversand.py --selbsttest   # ohne Netz: Soll-Block, Ersetzen an echten Sicherungen, Import ohne Abfrage,
      pruefen()/einfuegen() gegen ein Attrappen-Theme (theme_attrappe.py): welche Lage löst im Aufseher (fixer_keepalive.sh, letzte
      Zeile) die Reparatur aus («Hinweis fehlt»), welche wird nur gemeldet, und dass ohne role MAIN nichts geplant oder geschrieben wird
"""
import os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette im Helfer)

DATEI = "snippets/cart-summary.liquid"
MARKE = "LUX-GRATISVERSAND-HINWEIS"
from ch_lager_profil import GRATIS_AB_CH  # noqa: E402  (eine Quelle für die Tarif-Schwelle, 50.00 seit 22.10.2026)
# EIN Rechenweg (warenkorb_einig): TARIF = Gratis-Schwelle NACH Rabatt in Rappen, VERSPRECHEN = ⌈TARIF/0,9⌉, TEXT_SCHWELLE = «ab CHF 50 nach Rabatt»
from warenkorb_einig import TARIF as TARIF_RP, VERSPRECHEN as VERSPRECHEN_RP, TEXT_SCHWELLE, chf  # noqa: E402
SCHWELLE_TECHNIK = GRATIS_AB_CH   # aktive Nullrate «Kostenloser Versand» (deliveryProfiles; 50.00 seit 22.10.2026)
SCHWELLE_VERSPRECHEN = 50.0  # Seiten, Policies, /cart, zusagen_abgleich.py («ab CHF 50 nach Rabatt»)
VERSAND = 7.0
ANKER = """    <div class="cart-totals__item cart-totals__tax-note cart-primary-typography">
      {% render 'tax-info', has_discounts_enabled: settings.show_add_discount_code %}
    </div>
"""
# Vorlage = Live-Block vom 26.11.2026 (Theme 214565814663, Code Zeile für Zeile gleich), Zahlen/Text als Platzhalter @…@.
_VORLAGE = """    {%- comment -%} LUX-GRATISVERSAND-HINWEIS (06.10.2026, automation/warenkorb_gratisversand.py) — Tarif gratis ab @TARIF_CHF@ NACH Rabatt
        (ch_lager_profil.GRATIS_AB_CH, seit 22.10.2026; vorher 40.50 bzw. 45), Versprechen «@TEXT@»: der 10-%-Mengenrabatt ab 2 Artikeln
        drückt Körbe von @TARIF_2@ bis knapp @VERSPRECHEN_CHF@ unter den Tarif, darum rechnet «noch X» mit @VERSPRECHEN_CHF@ Warenwert vor Rabatt.
        Zahlen und Text aus EINER Quelle (warenkorb_einig.TARIF/VERSPRECHEN/TEXT_SCHWELLE); dieselbe Regel wie lux_trust auf der Produktseite.
        LUX-CHLAGER-KORB (13.10.2026, Entscheid C): trägt JEDE Position das Zeichen profil-ch-lager (Profil «CH-Lager», 0.00-Tarife),
        rechnet die Kasse in der Schweiz 0.00 → «Gratis-Versand in der Schweiz · Ware ab Schweizer Lager». Notschalter = das
        Produkt-Zeichen (ch_lager_profil.py setzt es nach dem Zuordnen, entfernt es vor dem Lösen). LI: kein Versprechen. {%- endcomment -%}
    {%- unless cart == empty -%}
      {%- assign lux_alle_chlager = true -%}
      {%- for lux_ci in cart.items -%}{%- unless lux_ci.product.tags contains 'profil-ch-lager' -%}{%- assign lux_alle_chlager = false -%}{%- break -%}{%- endunless -%}{%- endfor -%}
      <div class="cart-totals__item lux-gratisversand cart-primary-typography" role="status"{% if lux_alle_chlager %} data-lux-alle-chlager="1"{% endif %} style="font-size:0.92em;justify-content:center;text-align:center;">
        {%- if lux_alle_chlager -%}
          <span>🚚 <strong>Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager</span>
        {%- elsif cart.total_price >= @TARIF@ -%}
          <span>🚚 <strong>Gratisversand inklusive</strong> · Lieferung in der Schweiz</span>
        {%- else -%}
          {%- comment -%} LUX-WARENKORB-EINIG (09.10.2026, Zahlen seit 22.10.2026): @VERSPRECHEN_CHF@ − Warenwert VOR Rabatt (jeder Zusatzartikel = −10 %),
              mindestens ⌈(@TARIF_CHF@ − Betrag nach Rabatt) · 10/9⌉ — derselbe Rechenweg wie der Versandbalken. {%- endcomment -%}
          {%- assign lux_gv_rest = @VERSPRECHEN@ | minus: cart.items_subtotal_price -%}
          {%- assign lux_gv_rest2 = @TARIF@ | minus: cart.total_price | times: 10 | plus: 8 | divided_by: 9 -%}
          {%- if lux_gv_rest2 > lux_gv_rest -%}{%- assign lux_gv_rest = lux_gv_rest2 -%}{%- endif -%}
          <span>🚚 Versand in der Schweiz CHF @VERSAND_CHF@ · noch <strong>{{ lux_gv_rest | money }}</strong> bis zum Gratisversand (@TEXT@)</span>
        {%- endif -%}
      </div>
    {%- endunless -%}
"""
BLOCK = (_VORLAGE.replace("@TARIF@", str(TARIF_RP)).replace("@VERSPRECHEN@", str(VERSPRECHEN_RP))
         .replace("@TARIF_CHF@", chf(TARIF_RP)).replace("@TARIF_2@", f"{TARIF_RP / 100:.2f}").replace("@VERSPRECHEN_CHF@", f"{VERSPRECHEN_RP / 100:.2f}")
         .replace("@VERSAND_CHF@", f"{VERSAND:g}").replace("@TEXT@", TEXT_SCHWELLE))
BLOCK_ENDE = "    {%- endunless -%}\n"
HINWEIS_DIV = 'class="cart-totals__item lux-gratisversand'   # das sichtbare Element des Hinweises (in jeder Fassung seit 06.10.2026)
_KOMMENTAR = re.compile(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", re.S)


def kern(text):
    """Liquid ohne Kommentare, Zeile für Zeile (rechts gestutzt, Leerzeilen weg) — der Teil, den die Kundschaft sieht."""
    return [z.rstrip() for z in _KOMMENTAR.sub("", text).splitlines() if z.strip()]


def erste_abweichung(ist, soll):
    """None bei Gleichheit, sonst «Zeile n: ist … / soll …» (gekürzt)."""
    for i in range(max(len(ist), len(soll))):
        a, b = (ist[i] if i < len(ist) else "∅"), (soll[i] if i < len(soll) else "∅")
        if a != b:
            k = next((j for j, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))   # erstes abweichendes Zeichen
            v = max(0, k - 30)
            return f"Zeile {i + 1}: ist «…{a[v:k + 50].strip()}…» / soll «…{b[v:k + 50].strip()}…»"
    return None


def soll_befunde(block):
    """Rein: Was am Block NICHT dem Entscheid 22.10. entspricht (leer = in Ordnung). Prüft BLOCK vor jedem Schreiben."""
    b = []
    if "@" in _KOMMENTAR.sub("", block):
        b.append("Platzhalter @…@ übrig")
    for m in (MARKE, "LUX-WARENKORB-EINIG", "LUX-CHLAGER-KORB"):
        if m not in block:
            b.append(f"Marke {m} fehlt")
    schwellen = sorted(set(re.findall(r"cart\.total_price >= (\d+)", block)))
    if schwellen != [str(TARIF_RP)]:
        b.append(f"Gratis-Schwelle im Block {schwellen} ≠ [{TARIF_RP}]")
    if f"{VERSPRECHEN_RP} | minus: cart.items_subtotal_price" not in block:
        b.append(f"«noch X» rechnet nicht mit {VERSPRECHEN_RP} vor Rabatt")
    if f"lux_gv_rest2 = {TARIF_RP} | minus: cart.total_price" not in block:
        b.append(f"Zweitterm nicht ⌈({TARIF_RP} − Betrag) · 10/9⌉")
    if f"bis zum Gratisversand ({TEXT_SCHWELLE})</span>" not in block or "nach Rabatt" not in TEXT_SCHWELLE:
        b.append(f"Text nicht «({TEXT_SCHWELLE})» mit «nach Rabatt»")
    if not block.endswith(BLOCK_ENDE) or block_finden(block) != (0, len(block)):
        b.append("Block nicht abgrenzbar (Anfang Marke, Ende «{%- endunless -%}»)")
    return b


def block_finden(inhalt):
    """(Anfang, Ende) des Hinweis-Blocks: ab der Zeile mit MARKE bis einschliesslich der ersten Zeile «    {%- endunless -%}» danach.
    None, wenn die Marke nicht genau 1× vorkommt oder das Ende fehlt (gilt für alle Fassungen seit 06.10.2026)."""
    if inhalt.count(MARKE) != 1:
        return None
    i = inhalt.find(MARKE)
    a = inhalt.rfind("\n", 0, i) + 1
    e = inhalt.find("\n" + BLOCK_ENDE, i)
    return None if e < 0 else (a, e + 1 + len(BLOCK_ENDE))


def block_ersetzen(inhalt):
    """Rein: (neuer Text | None, Stand). Ersetzt einen vorhandenen (älteren) Hinweis-Block durch BLOCK; alles andere bleibt Byte für Byte."""
    pos = block_finden(inhalt)
    if pos is None:
        return None, f"Hinweis-Block nicht eindeutig ({inhalt.count(MARKE)}× Marke)"
    if kern(inhalt[pos[0]:pos[1]]) == kern(BLOCK):
        return None, "schon Soll"
    return inhalt[:pos[0]] + BLOCK + inhalt[pos[1]:], "ersetzt"


def einfuegen_plan(alt):
    """Rein: (neuer Text | None, Stand, Rückgabewert)."""
    if MARKE in alt:
        return None, "schon drin — nichts zu tun", 0
    if HINWEIS_DIV in alt:   # Hinweis-Code ohne Marke (z. B. nur der Kopfkommentar weg): Einfügen gäbe zwei Hinweise im Drawer
        return None, f"Hinweis-Code ohne Marke im Snippet ({alt.count(HINWEIS_DIV)}×) — nicht blind einfügen (sonst doppelt), von Hand prüfen", 2
    if alt.count(ANKER) != 1:
        return None, f"ANKER {alt.count(ANKER)}× gefunden (erwartet 1) — Snippet hat sich geändert, nicht blind einfügen", 2
    return alt.replace(ANKER, ANKER + BLOCK, 1), "ok", 0


def live_theme():
    """GID des Live-Themes (role MAIN): erst zur Laufzeit, EINMAL je Lauf, an alle Lese-/Schreibschritte weitergereicht — gelesen,
    geprüft und geschrieben wird so immer im selben Theme. main_theme.gid(): 10-Min-Cache, wirft RuntimeError (fail-closed)."""
    from main_theme import gid
    return gid()


def theme_datei(theme):
    r = gql('query($id:ID!){ theme(id:$id){ role files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % DATEI,
            {"id": theme})["theme"]
    return r["role"], r["files"]["nodes"][0]["body"]["content"]


def tarif():
    """(Standardpreis CH, kleinste aktive Gratis-Schwelle CH) aus dem General profile."""
    q = '''query($id:ID!){ deliveryProfile(id:$id){ default profileLocationGroups{ locationGroupZones(first:10){ nodes{
      zone{ countries{ code{ countryCode } } }
      methodDefinitions(first:15){ nodes{ active rateProvider{ ... on DeliveryRateDefinition{ price{ amount } } }
        methodConditions{ field operator conditionCriteria{ ... on MoneyV2{ amount } } } } } } } } } }'''
    std, gratis = None, []
    # 26.11.2026: nur das General profile abfragen — die alte Abfrage über deliveryProfiles(first:10) kostete 618 Punkte
    # und blieb neben den Dauerläufern dauerhaft gedrosselt (40× «Throttled»); jetzt ~1/10.
    from ch_lager_profil import GENERAL
    prof = gql(q, {"id": GENERAL})["deliveryProfile"]
    if not prof or not prof["default"]:
        raise RuntimeError("General profile nicht (mehr) das Standard-Versandprofil — Tarif nicht lesbar")
    for p in [prof]:
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


def chlager_pruefen(theme, snippet=None):
    """Befunde zu Entscheid C: Bedingung in allen Live-Dateien, Schwellen-Zahl = Tarif, Profil-Tarife, Zeichen = Profil."""
    bef = []
    r = gql('query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f,first:10){ nodes{ filename body{ ... on '
            'OnlineStoreThemeFileBodyText{ content } } } } } }', {"id": theme, "f": list(CHL_PFLICHT)})["theme"]["files"]["nodes"]
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
    try:
        theme = live_theme()
    except RuntimeError as e:   # fail-closed: nichts geprüft, nichts geschrieben (Wortlaut löst im Aufseher KEINE Reparatur aus)
        print(f"⚠️ WARENKORB-VERSAND: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nicht geprüft")
        return 1
    role, inhalt = theme_datei(theme)
    std, gratis = tarif()
    befunde = [f"Soll-Block: {b}" for b in soll_befunde(BLOCK)]
    if role != "MAIN":
        befunde.append(f"Theme {theme} ist nicht MAIN ({role})")
    n_div = inhalt.count(HINWEIS_DIV)
    if MARKE not in inhalt and not n_div:   # NUR diese Lage löst im Aufseher die Reparatur aus (Reizwort «Hinweis fehlt»)
        befunde.append("Hinweis fehlt im Live-Snippet (Theme-Update überschrieben?) → SCHARF=1 erneut")
    elif MARKE not in inhalt:
        befunde.append(f"Hinweis-Code ohne Marke {MARKE} im Live-Snippet ({n_div}×) — kein Einfügen (sonst doppelt), von Hand prüfen")
    else:
        if n_div != 1:
            befunde.append(f"Hinweis {n_div}× im Live-Snippet (erwartet 1)")
        pos = block_finden(inhalt)
        abw = "Block nicht abgrenzbar" if pos is None else erste_abweichung(kern(inhalt[pos[0]:pos[1]]), kern(BLOCK))
        if abw:   # nur melden: der Aufseher repariert allein «Hinweis fehlt»
            befunde.append(f"Hinweis-Text im Live-Snippet ≠ Soll ({abw})")
    if std != VERSAND:
        befunde.append(f"Standardversand CH {std} ≠ {VERSAND} (Hinweis nennt CHF 7)")
    if gratis is None:
        befunde.append("keine aktive Gratis-Rate CH — Hinweis verspricht Gratisversand")
    elif not (gratis <= SCHWELLE_TECHNIK <= SCHWELLE_VERSPRECHEN):
        befunde.append(f"Gratis-Rate ab {gratis} > Hinweis-Schwelle {SCHWELLE_TECHNIK} — Drawer verspräche zu früh gratis")
    befunde += chlager_pruefen(theme, inhalt)
    if befunde:
        print("⚠️ WARENKORB-VERSAND: " + " · ".join(befunde))
        return 1
    print(f"CH-LAGER-KORB ✓: 4 Live-Dateien mit Bedingung profil-ch-lager · Profil-Tarife 0.00 · Zeichen = Profil")
    print(f"WARENKORB-VERSAND ✓: Hinweis live (Theme {theme.rsplit('/', 1)[1]}, Text = Soll «{TEXT_SCHWELLE}», noch X ab {VERSPRECHEN_RP / 100:.2f}) · "
          f"Versand CHF {std:.2f} · Tarif gratis ab {gratis:.0f} ≤ Hinweis {SCHWELLE_TECHNIK:.0f} ≤ Versprechen {SCHWELLE_VERSPRECHEN:.0f}")
    return 0


def einfuegen():
    sb = soll_befunde(BLOCK)
    if sb:   # nie einen Block schreiben, der nicht dem heutigen Soll entspricht
        print("FEHLER Soll-Block: " + " · ".join(sb) + " — nichts geschrieben"); return 1
    try:
        theme = live_theme()
    except RuntimeError as e:
        print(f"FEHLER: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nichts geschrieben"); return 1
    role, alt = theme_datei(theme)
    if role != "MAIN":
        print(f"Theme {theme} nicht MAIN ({role}) — nichts geschrieben"); return 1
    neu, stand, rc = einfuegen_plan(alt)
    if neu is None:
        print(stand); return rc
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN: {DATEI} {len(alt)} → {len(neu)} Zeichen, Block nach der Steuer-Notiz in .cart-totals__container (Theme {theme})"); return 0
    pfad = f"/tmp/cart-summary.vor-gratisversand.{int(time.time())}.liquid"
    open(pfad, "w").write(alt)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": theme, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"], "· Sicherung", pfad); return 1
    for _ in range(8):
        time.sleep(4)
        if MARKE in theme_datei(theme)[1]:
            print(f"EINGEFÜGT + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


def soll_theme():
    """Rein: kleinstes Theme im Soll-Stand (Entscheid 22.10.) für die Prüfläufe der Selbsttests — Hinweis = BLOCK, Balken =
    warenkorb_einig.JS_NEU (mit VERSAND=700 davor), alle Pflichtstücke CHL_PFLICHT, cart.json mit Marke LUX-WARENKORB-EINIG."""
    import json
    import warenkorb_einig as w
    return {
        DATEI: "<A>\n" + ANKER + BLOCK + "<B>\n",
        "layout/theme.liquid": "<VOR>\n  var SCHWELLE=5000, VERSAND=700, letzt=null;\n  fetch('/cart?view=lux-chlager');\n" + w.JS_NEU + "<NACH>\n",
        "templates/cart.lux-chlager.liquid": "{%- layout none -%}\n{%- for i in cart.items -%}{%- unless i.product.tags contains 'profil-ch-lager' -%}"
                                             "x{%- endunless -%}{%- endfor -%}{\"alle_chlager\": true}\n",
        "templates/product.json": json.dumps({"sections": {"lux_trust": {"settings": {"custom_liquid": " · ".join(CHL_PFLICHT["templates/product.json"])}}}},
                                             ensure_ascii=False),
        "templates/cart.json": json.dumps({"sections": {"lux_cart_trust": {"settings": {"custom_liquid": "{%- comment -%} LUX-WARENKORB-EINIG "
                                          "{%- endcomment -%}<li>📦 Lieferung voraussichtlich …</li>"}}}}, ensure_ascii=False),
    }


def selbsttest():
    """Ohne Netz. Soll-Block = Entscheid 22.10. (unabhängig nachgerechnet), Mutanten fallen auf, Ersetzen an echten Sicherungen,
    Import ohne Abfrage, live_theme() ruft gid() genau einmal; pruefen()/einfuegen() gegen ein Attrappen-Theme (Aufseher-Vertrag, MAIN-Wache)."""
    import glob
    import math
    f, n = [], 0

    def pruefe(ok, was):
        nonlocal n
        n += 1
        if not ok:
            f.append(was)

    # 1) Zahlen unabhängig nachgerechnet (Entscheid 22.10.2026: Tarif 50, «noch X» mit 55.56, «ab CHF 50 nach Rabatt»)
    pruefe(GRATIS_AB_CH == 50.0, f"GRATIS_AB_CH {GRATIS_AB_CH} ≠ 50 (Entscheid 22.10.; bei bewusster Änderung Selbsttest nachziehen)")
    pruefe(TARIF_RP == 5000 and VERSPRECHEN_RP == math.ceil(5000 * 10 / 9) == 5556, f"TARIF/VERSPRECHEN {TARIF_RP}/{VERSPRECHEN_RP} ≠ 5000/5556")
    pruefe(TEXT_SCHWELLE == "ab CHF 50 nach Rabatt", f"TEXT_SCHWELLE «{TEXT_SCHWELLE}»")
    # 2) Soll-Block
    pruefe(soll_befunde(BLOCK) == [], f"Soll-Block: {soll_befunde(BLOCK)}")
    for stueck in ("cart.total_price >= 5000 -%}", "lux_gv_rest = 5556 | minus: cart.items_subtotal_price",
                   "lux_gv_rest2 = 5000 | minus: cart.total_price", "bis zum Gratisversand (ab CHF 50 nach Rabatt)</span>",
                   "Versand in der Schweiz CHF 7 ·"):
        pruefe(stueck in BLOCK, f"BLOCK ohne «{stueck}»")
    pruefe(not re.search(r"\b(4500|4050)\b", "\n".join(kern(BLOCK))), "BLOCK trägt alte Zahl 4500/4050")
    # 3) Mutanten: alte Fassungen müssen auffallen
    for name, mutant in (("Schwelle 4500", BLOCK.replace("cart.total_price >= 5000", "cart.total_price >= 4500")),
                         ("ohne «nach Rabatt»", BLOCK.replace("(ab CHF 50 nach Rabatt)", "(ab CHF 50)")),
                         ("noch X mit 5000", BLOCK.replace("lux_gv_rest = 5556", "lux_gv_rest = 5000"))):
        pruefe(bool(soll_befunde(mutant)), f"Mutant «{name}» nicht erkannt")
    # 4) Einfügen (rein)
    probe = "<x>\n" + ANKER + "</x>\n"
    neu, _, rc = einfuegen_plan(probe)
    pruefe(neu is not None and neu.count(BLOCK) == 1 and rc == 0, "einfuegen_plan setzt BLOCK nicht genau 1×")
    pruefe(einfuegen_plan(neu or "")[0] is None, "einfuegen_plan nicht idempotent")
    pruefe(einfuegen_plan(ANKER + ANKER)[2] == 2, "doppelter ANKER nicht abgelehnt")
    # 5) Ersetzen an echten Sicherungen älterer Fassungen (theme_backup/), Rest der Datei bleibt Byte für Byte
    alte = sorted(glob.glob(os.path.join(REPO, "theme_backup", "snippets__cart-summary.liquid.*")))
    for p in alte:
        t = open(p, encoding="utf-8").read()
        if MARKE not in t:
            continue
        pos = block_finden(t)
        if pos is None:
            pruefe(False, f"block_finden an {os.path.basename(p)}: nicht abgrenzbar")
            continue
        a, e = pos
        neu, st = block_ersetzen(t)
        ok = neu is not None and neu[:a] == t[:a] and neu[a + len(BLOCK):] == t[e:] and kern(neu[a:a + len(BLOCK)]) == kern(BLOCK)
        pruefe(ok and block_ersetzen(neu)[1] == "schon Soll", f"block_ersetzen an {os.path.basename(p)}: {st}")
    pruefe(block_ersetzen("ohne Marke")[0] is None, "block_ersetzen ohne Marke schreibt")
    # 6) Import fragt nichts ab; live_theme() ruft gid() genau einmal je Aufruf (kein Aufruf beim Import)
    import main_theme
    ok, m = main_theme.import_ohne_netz("warenkorb_gratisversand", "warenkorb_einig", pfad=HIER + os.pathsep + main_theme.HIER)
    pruefe(ok, f"Import fragt ab: {m}")
    alt_gid, zaehler = main_theme.gid, []
    main_theme.gid = lambda *a, **k: zaehler.append(1) or "gid://shopify/OnlineStoreTheme/1"
    try:
        g = live_theme()
    finally:
        main_theme.gid = alt_gid
    pruefe(g.endswith("/1") and len(zaehler) == 1, f"live_theme() rief gid() {len(zaehler)}×")
    # 7) pruefen()/einfuegen() OHNE Netz gegen ein Attrappen-Theme. Vertrag mit dem Aufseher (fixer_keepalive.sh wertet die LETZTE
    #    Zeile aus): nur «Hinweis fehlt» löst einen SCHARF-Lauf aus; jede Abweichung vom Soll, «nicht MAIN», «nicht ermittelbar» und
    #    Hinweis-Code ohne Marke wird nur gemeldet. Ohne role MAIN plant/schreibt einfuegen() nichts. SCHARF ist hier immer aus.
    import ch_lager_profil as chl
    import theme_attrappe as ta
    reiz = ta.reiz("warenkorb_gratisversand.py")
    pruefe(reiz == "Hinweis fehlt", f"Aufseher-Reizwort {reiz!r} ≠ «Hinweis fehlt» (fixer_keepalive.sh)")
    glob_, T, SOLL = globals(), "gid://shopify/OnlineStoreTheme/0", soll_theme()
    CS, TL = DATEI, "layout/theme.liquid"

    def ers(datei, a, b):
        def aend(d):
            if a not in d[datei]:
                raise AssertionError(f"Selbsttest-Fall: «{a[:40]}» nicht in {datei}")
            d[datei] = d[datei].replace(a, b)
        return aend

    def block_weg(d):
        d[CS] = "<A>\n" + ANKER + "<B>\n"

    def fall(fn, aend=None, role="MAIN", tarif_=(VERSAND, SCHWELLE_TECHNIK), produkte=(), ohne_theme=False, block=None):
        dat = dict(SOLL)
        if aend:
            aend(dat)
        att = ta.Attrappe(dat, role, produkte)

        def lt():
            if ohne_theme:
                raise RuntimeError("Attrappe: kein eindeutiges MAIN-Theme")
            return T
        scharf = os.environ.pop("SCHARF", None)
        try:
            with ta.ohne_netz(), ta.ersetzt((glob_, "gql", att.gql), (glob_, "live_theme", lt), (glob_, "tarif", lambda: tarif_),
                                            (glob_, "BLOCK", block or BLOCK), (sys, "argv", [sys.argv[0]]),
                                            (chl, "profil_finden", lambda: "gid://shopify/DeliveryProfile/0"),
                                            (chl, "gql", lambda *a, **k: {"deliveryProfile": {}}), (chl, "zonen_methoden", lambda d: {}),
                                            (chl, "tarife_pruefen", lambda c, gm: [])):
                rc, letzte, aus = ta.lauf(fn)
        finally:
            if scharf is not None:
                os.environ["SCHARF"] = scharf
        return rc, letzte, aus, att

    ohne_profil = [{"handle": "x", "variantsCount": {"count": 1}, "variants": {"nodes": [{"deliveryProfile": {"name": "General profile"}}]}}]
    for name, kw, soll, stueck in (
            ("Soll-Stand", {}, "STILL", "WARENKORB-VERSAND ✓"),
            ("Block ganz weg (Theme-Update)", {"aend": block_weg}, "REPARATUR", "Hinweis fehlt"),
            ("nur die Marke umbenannt", {"aend": ers(CS, MARKE, "LUX-XX")}, "MELDEN", "ohne Marke"),
            ("Hinweis-Code ohne Marke (nur Kopfkommentar weg)", {"aend": ers(CS, BLOCK[:BLOCK.index("{%- endcomment -%}\n") + 19], "")}, "MELDEN", "ohne Marke"),
            ("Hinweis doppelt", {"aend": ers(CS, "<B>\n", '<div ' + HINWEIS_DIV + ' x"></div>\n<B>\n')}, "MELDEN", "2× im Live-Snippet"),
            ("Schwelle 4500", {"aend": ers(CS, "cart.total_price >= 5000", "cart.total_price >= 4500")}, "MELDEN", "≠ Soll"),
            ("noch X mit 5000", {"aend": ers(CS, "lux_gv_rest = 5556", "lux_gv_rest = 5000")}, "MELDEN", "≠ Soll"),
            ("Text ohne «nach Rabatt»", {"aend": ers(CS, "(ab CHF 50 nach Rabatt)</span>", "(ab CHF 50)</span>")}, "MELDEN", "≠ Soll"),
            ("Theme nicht MAIN", {"role": "UNPUBLISHED"}, "MELDEN", "nicht MAIN"),
            ("Theme nicht MAIN + Marke weg", {"role": "UNPUBLISHED", "aend": block_weg}, "REPARATUR", "nicht MAIN"),   # einfuegen() hält dann an
            ("Live-Theme nicht ermittelbar", {"ohne_theme": True}, "MELDEN", "nicht ermittelbar"),
            ("Versand CHF 9", {"tarif_": (9.0, SCHWELLE_TECHNIK)}, "MELDEN", "Standardversand"),
            ("Gratis-Rate ab 60", {"tarif_": (VERSAND, 60.0)}, "MELDEN", "Gratis-Rate ab"),
            ("CH-Lager-Stück fehlt im Balken", {"aend": ers(TL, "cart.alle_chlager===true", "cart.alle_chlager==true")}, "MELDEN", "theme.liquid: fehlt"),
            ("Zeichen ohne Profil «CH-Lager»", {"produkte": ohne_profil}, "MELDEN", "ausserhalb «CH-Lager»"),
            ("Soll-Block ohne Marke", {"block": BLOCK.replace(MARKE, "LUX-XX")}, "MELDEN", "Soll-Block"),
            ("Soll-Block 4500", {"block": BLOCK.replace("cart.total_price >= 5000", "cart.total_price >= 4500")}, "MELDEN", "Soll-Block")):
        try:   # ein Fall, dessen Textstelle im (mutierten) Soll fehlt, ist selbst ein Befund — nicht abstürzen
            rc, letzte, _, att = fall(pruefen, **kw)
        except AssertionError as e:
            pruefe(False, f"pruefen «{name}»: {e}")
            continue
        ist = ta.aufseher(letzte, reiz)
        ok = (ist == soll and stueck in letzte and (rc == 0) == (soll == "STILL") and not att.schreibversuche and set(att.themes) <= {T}
              and (att.abfragen == 0 if kw.get("ohne_theme") else att.themes))
        pruefe(ok, f"pruefen «{name}»: {ist} (soll {soll}), rc {rc}, «{letzte[:150]}»")
    for name, kw, soll_rc, stueck in (
            ("nicht MAIN, Hinweis fehlt", {"role": "UNPUBLISHED", "aend": block_weg}, 1, "nicht MAIN"),
            ("Live-Theme nicht ermittelbar", {"ohne_theme": True, "aend": block_weg}, 1, "nichts geschrieben"),
            ("Soll-Block 4500", {"block": BLOCK.replace("cart.total_price >= 5000", "cart.total_price >= 4500"), "aend": block_weg}, 1, "FEHLER Soll-Block"),
            ("Hinweis-Code ohne Marke", {"aend": ers(CS, MARKE, "LUX-XX")}, 2, "nicht blind"),
            ("Soll-Stand", {}, 0, "schon drin"),
            ("MAIN, Hinweis fehlt (Trockenlauf)", {"aend": block_weg}, 0, "TROCKEN")):
        try:   # ein Fall, dessen Textstelle im (mutierten) Soll fehlt, ist selbst ein Befund — nicht abstürzen
            rc, letzte, aus, att = fall(einfuegen, **kw)
        except AssertionError as e:
            pruefe(False, f"einfuegen «{name}»: {e}")
            continue
        ok = (rc == soll_rc and stueck in letzte and (("TROCKEN" in aus) == (soll_rc == 0 and stueck == "TROCKEN")) and not att.schreibversuche
              and set(att.themes) <= {T} and (att.abfragen == 0 if kw.get("ohne_theme") or kw.get("block") else True))
        pruefe(ok, f"einfuegen «{name}»: rc {rc} (soll {soll_rc}), «{letzte[:150]}», Abfragen {att.abfragen}")
    print(f"SELBSTTEST warenkorb_gratisversand: {'OK' if not f else 'FEHLER'} ({n - len(f)}/{n}; {len(alte)} Sicherungen geprüft)"
          + ("" if not f else " — " + " · ".join(f)))
    return 1 if f else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(pruefen() if "--pruefen" in sys.argv else einfuegen())
