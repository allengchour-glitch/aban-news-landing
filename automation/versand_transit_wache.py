#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Versand-Lieferzeit-Wache — jeder aktive Versandtarif trägt eine ehrliche Transitzeit (10.10.2026).

Anlass (dropship/VERSAND-LIEFERZEIT-2026-10-10.md): Google zeigte 2–6 Tage Lieferzeit, die Kasse beim Standard-Tarif
«3–5 Werktage», die Versandrichtlinie sagt «10–20 Werktage» (Direktversand, grösster Teil des Sortiments). Google und
Kasse lesen die Transitzeit des Shopify-Tarifs; schreibbar ist sie nur in der API-Version «unstable»
(DeliveryRateDefinition.minTransitTime/maxTransitTime, Sekunden).

Prüft gegen automation/data/versand_transit_regel.json (13.10.2026: «profile_zonen» = eigene Zusage je Profil, z. B. CH-Lager):
  * jeder aktive Tarif (alle Profile) hat min/max Transitzeit,
  * sie entspricht der Zone (CH 10–20, LI 15–45, Rest 10–20 Tage),
  * die Versandrichtlinie enthält die Sätze, aus denen die Zahlen stammen (sonst ist die Regel veraltet).
Neue Tarife/Zonen ohne Transitzeit fallen damit am nächsten Tag auf.

    python3 automation/versand_transit_wache.py           # Ampel-Zeile, schreibt nichts
    python3 automation/versand_transit_wache.py --scharf  # fehlende/abweichende Transitzeit setzen (Preis unverändert)
    python3 automation/versand_transit_wache.py --selbsttest-seite PRODUCT.json CART.json   # Seite/Kasse offline

13.10.2026 (dropship/DRUCK-PROFIL-2026-10-13.md): zweite Zeile «SEITE≠KASSE» — je Lieferzeit-Tier (CH-Lager, EU-Lager, Druck,
Asien; mit/ohne Profil-Zeichen) das Fenster, das Produktseite und Warenkorb heute rechnen, gegen das Fenster der Kasse
(Bearbeitung + Transit «Standard» CH des Profils). Stand: dropship/_seite_kasse_fenster.json. Schreibt nichts im Shop.
"""
import json
import os
import re
import sys
import time
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGEL = json.load(open(os.path.join(REPO, "automation", "data", "versand_transit_regel.json"), encoding="utf-8"))
SHOP = "au3j0y-hq.myshopify.com"
TAG = 86400
SCHARF = "--scharf" in sys.argv

# 13.10.2026: blättern — der Shop hat > 50 Profile (Gelato/Printful legen je Format eines an); das neue Profil «CH-Lager»
# stand auf Seite 2 und wurde mit first:50 nie geprüft (gemessen: «5 Tarife» vor und nach dem Anlegen).
Q_LISTE = "query($n:String){deliveryProfiles(first:50,after:$n){pageInfo{hasNextPage endCursor} nodes{id name}}}"


def profile_liste():
    aus, nach = [], None
    while True:
        d = gql(Q_LISTE, {"n": nach})["deliveryProfiles"]
        aus += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]
Q = """query($id:ID!){node(id:$id){... on DeliveryProfile{id name profileLocationGroups{locationGroup{id}
 locationGroupZones(first:10){nodes{zone{id name countries{code{countryCode restOfWorld}}}
  methodDefinitions(first:8){nodes{id name active
   rateGroups(first:2){nodes{id rateProviders(first:3){nodes{__typename ... on DeliveryRateDefinition{id price{amount currencyCode}
    minTransitTime maxTransitTime}}}}}}}}}}}}}"""
M = "mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id, profile:$p){profile{id} userErrors{field message}}}"

# 19.10.2026 BLINDER FLECK (Merchant-Center-Screenshot des Betreibers: Regel «price_based» mit 2–5 Tagen): eine PREISSTUFE eines Tarifs
# («Standard» 7.00, ab CHF 65.00 → 0.00) ist in der Admin-API eine eigene, SYNTHETISCHE Methode (id «…/<Methode>?source=RateRangeCondition&
# source_id=<Bedingung>», eigene Rate-id «…/0?source=…») — sie erscheint NUR, wenn `methodConditions` gewählt ist und `rateGroups` NICHT
# (GEMESSEN 19.10.: Q mit rateGroups liefert 3 Methoden, diese Abfrage 4). Die Stufe trägt KEINE Transitzeit, und der Schreibweg
# (rateGroupsToUpdate/rateDefinitionsToUpdate) braucht eine echte Rate-id → die Wache sah sie nie, `--scharf` kann sie nicht heilen.
# Google importiert sie als eigenen Versandservice mit Standard-Lieferzeit 2–5 Tage (und bei gleichem Preis gewinnt der schnellste,
# QUELLE support.google.com/merchants/answer/7050921) → «gratis, 2–5 Tage» auf Ware ab CHF 65, die real 10–20 Tage braucht.
Q_STUFEN = """query($id:ID!){node(id:$id){... on DeliveryProfile{profileLocationGroups{
 locationGroupZones(first:10){nodes{zone{name}
  methodDefinitions(first:20){nodes{id name active
   methodConditions{field conditionCriteria{__typename ... on MoneyV2{amount}}}
   rateProvider{__typename ... on DeliveryRateDefinition{minTransitTime maxTransitTime}}}}}}}}}}"""


def stufen_befunde(profilname, node):
    """Aktive Preisstufen (synthetische Methoden «RateRangeCondition») ohne Transitzeit → Befundtexte. Nur lesen, nie schreiben:
    die API kann die Zeit einer Stufe nicht setzen — Abhilfe ist, die Stufe zu entfernen (Betreiber, Shopify-Admin)."""
    aus = []
    for g in (node or {}).get("profileLocationGroups") or []:
        for zn in g["locationGroupZones"]["nodes"]:
            for m in zn["methodDefinitions"]["nodes"]:
                if not m.get("active") or "RateRangeCondition" not in (m.get("id") or ""):
                    continue
                rp = m.get("rateProvider") or {}
                if rp.get("minTransitTime") and rp.get("maxTransitTime"):
                    continue
                ab = [str((c.get("conditionCriteria") or {}).get("amount")) for c in m.get("methodConditions") or []
                      if (c.get("conditionCriteria") or {}).get("amount")]
                aus.append(f"{profilname}/{zn['zone']['name']}/{m['name']}: Preisstufe{' ab ' + '/'.join(ab) if ab else ''} ohne Transitzeit "
                           f"(Google zeigt 2–5 Tage; per API nicht setzbar → Stufe in Shopify entfernen)")
    return aus


def selbsttest_stufen():
    """Offline: erkennt die Stufe ohne Transit, lässt Stufe mit Transit / inaktive Stufe / gewöhnliche Methode in Ruhe."""
    def knoten(methoden):
        return {"profileLocationGroups": [{"locationGroupZones": {"nodes": [{"zone": {"name": "Domestic"},
                                                                              "methodDefinitions": {"nodes": methoden}}]}}]}
    def meth(mid, aktiv, mn, mx, ab=None):
        return {"id": f"gid://shopify/DeliveryMethodDefinition/{mid}", "name": "Standard", "active": aktiv,
                "methodConditions": [{"field": "TOTAL_PRICE", "conditionCriteria": {"__typename": "MoneyV2", "amount": ab}}] if ab else [],
                "rateProvider": {"__typename": "DeliveryRateDefinition", "minTransitTime": mn, "maxTransitTime": mx}}
    stufe = "1108712784257?source=RateRangeCondition&source_id=304322609537"
    faelle = [
        ("Stufe ohne Transit → 1 Befund", [meth("1108712784257", True, 777600, 1641600), meth(stufe, True, None, None, "65.0")], 1),
        ("Stufe mit Transit → ok", [meth(stufe, True, 777600, 1641600, "65.0")], 0),
        ("inaktive Stufe → ok", [meth(stufe, False, None, None, "65.0")], 0),
        ("gewöhnliche Methode ohne Transit → hier nicht zuständig (Hauptprüfung)", [meth("1108712784257", True, None, None)], 0),
        ("kaputte Antwort (None) → kein Absturz, 0", None, 0),
    ]
    fehler = []
    for name, ms, soll in faelle:
        n = len(stufen_befunde("General profile", knoten(ms) if ms is not None else None))
        if n != soll:
            fehler.append(f"{name}: {n} statt {soll}")
    text = (stufen_befunde("General profile", knoten([meth(stufe, True, None, None, "65.0")])) or [""])[0]
    if "ab 65.0" not in text or "ohne Transitzeit" not in text:
        fehler.append(f"Befundtext: {text!r}")
    print("SELBSTTEST Preisstufen-Blindfleck:", "OK (5 Fälle)" if not fehler else "FEHLER " + " | ".join(fehler))
    return not fehler


def gql(q, v=None, ver=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    r = urllib.request.Request(f"https://{SHOP}/admin/api/{ver or REGEL['api_version']}/graphql.json",
                               data=json.dumps({"query": q, "variables": v or {}}).encode(),
                               headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    for versuch in range(6):   # 13.10.2026: Drossel (THROTTLED) ist kein Ergebnis — warten und neu fragen
        d = json.load(urllib.request.urlopen(r, timeout=60))
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]) and versuch < 5:
            time.sleep(10 + 10 * versuch)
            continue
        if d.get("errors"):
            raise RuntimeError(str(d["errors"])[:160])
        return d["data"]


def zonen_schluessel(zone):
    codes = {c["code"]["countryCode"] or ("REST" if c["code"]["restOfWorld"] else "?") for c in zone["countries"]}
    for k in ("LI", "CH"):
        if k in codes:
            return k
    return "REST"

# ---------------------------------------------------------------- Seite ≠ Kasse (13.10.2026, dropship/DRUCK-PROFIL-2026-10-13.md)
# Produktseite (templates/product.json, Block lux_delivery) und Warenkorb (templates/cart.json, Block lux_cart_trust) rechnen das
# Lieferdatum im Theme selbst; die Kasse rechnet Bearbeitung (deliveryPromiseSettings) + Transit des Profil-Tarifs «Standard» CH.
# Klasse 11 der Kauf-Strecke: Druck auf Bestellung zeigte Seite 22.10.–2.11. (Kalendertage +9/+19), Kasse 28.10.–11.11.
# Diese Prüfung rechnet je Lieferzeit-Tier (Zweig im Theme, mit/ohne Profil-Zeichen) beide Fenster für HEUTE und meldet jede
# Abweichung. Kasse = dieselbe Werktag-Rechnung, die das Theme seit 13.10. nutzt (geeicht an 3 Kassen-Messungen; 13.10. 21:30
# nachgemessen: Druck-Profil Transit 6–13 → Kasse «Fr., 23. Okt–Di., 3. Nov», General 9–19 → «Mi., 28. Okt–Mi., 11. Nov»).
SK_THEME_DATEIEN = ("templates/product.json", "templates/cart.json")
SK_ZEICHEN = ("profil-ch-lager", "druck_profil_ids", "profil-druck", "lx_stufe", "lux_druck_lang", "lux_ohne_marke")
# Tier → (Anker im product.json-Zweig, Anker im cart.json-Zweig, Profil MIT Zeichen; ohne Zeichen gilt das General profile)
SK_TIERS = {
    "CH-Lager": ("contains 'fortura'", "{%- when 0 -%}", "CH-Lager"),
    "EU-Lager": ("contains 'eu-lager'", "{%- when 1 -%}", None),
    "Druck": ("contains 'printful_personalized_product'", "{%- when 2 -%}", "Druck auf Bestellung"),
    "Asien": (None, None, None),
}
SK_RANG = {"CH-Lager": 0, "EU-Lager": 1, "Druck": 2, "Asien": 3}
RE_PAAR = re.compile(r"assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+)")
RE_KAL = re.compile(r"assign d_from = now_s \| plus: (\d+) -%\}\s*\{%- assign d_to = now_s \| plus: (\d+)")
RE_VON_T = re.compile(r"assign lx_von = (\d+) \| plus: lx_tmin")


def _liquid_strings(roh):
    k = roh.find("{", roh.find("*/") + 2 if roh.lstrip().startswith("/*") else 0)
    aus = []

    def lauf(x):
        if isinstance(x, dict):
            for v in x.values():
                lauf(v)
        elif isinstance(x, list):
            for v in x:
                lauf(v)
        elif isinstance(x, str) and "LUX-KASSENDATUM" in x:
            aus.append(x)
    lauf(json.loads(roh[k:]))
    return aus


def _zweig(block, anker, ende_re):
    i = block.find(anker)
    if i < 0:
        return None
    m = re.compile(ende_re).search(block, i + len(anker))
    return block[i: m.start() if m else len(block)]


def werktag_fenster(jetzt, bearb, tmin, tmax):
    """Wie Theme/Kasse: Werktage Mo–Fr, Annahmeschluss 12 Uhr, Bearbeitung + Transit → (datum_von, datum_bis)."""
    import datetime as _dt
    von = bearb + tmin + (1 if (jetzt.hour >= 12 or jetzt.weekday() >= 5) else 0)
    bis = von + tmax - tmin
    t, n, d_von = jetzt.date(), 0, None
    for _ in range(60):
        t += _dt.timedelta(days=1)
        if t.weekday() < 5:
            n += 1
            if n == von:
                d_von = t
            if n == bis:
                return d_von, t
    return d_von, None


def kalender_fenster(jetzt, s_von, s_bis):
    import datetime as _dt

    def schieb(d):
        return d + _dt.timedelta(days=2 if d.weekday() == 5 else 1 if d.weekday() == 6 else 0)
    return schieb((jetzt + _dt.timedelta(seconds=s_von)).date()), schieb((jetzt + _dt.timedelta(seconds=s_bis)).date())


def seite_fenster(texte, jetzt):
    """{(datei, tier, 'mit'|'ohne'): (von, bis, art)} aus den Live-Dateien. Befunde für Unlesbares als Liste."""
    aus, bef = {}, []
    for datei in SK_THEME_DATEIEN:
        roh = texte.get(datei)
        if roh is None:
            bef.append(f"{datei}: nicht lesbar")
            continue
        try:
            bl = [b for b in _liquid_strings(roh) if ("Druck auf Bestellung" in b)]
        except Exception as e:  # noqa: BLE001
            bef.append(f"{datei}: JSON unlesbar ({type(e).__name__})")
            continue
        if len(bl) != 1:
            bef.append(f"{datei}: Lieferdatum-Block {len(bl)}× (erwartet 1)")
            continue
        b = bl[0]
        vm = RE_VON_T.findall(b)
        bearb_theme = int(vm[0]) if vm else 0
        werktag_raenge = [0, 3]
        rm = re.search(r"if lux_rang == [^%]*", b)
        if datei.endswith("cart.json") and rm:
            werktag_raenge = [int(x) for x in re.findall(r"lux_rang == (\d)", rm.group(0))]
        for tier, (a_prod, a_cart, _) in SK_TIERS.items():
            if datei.endswith("product.json"):
                if a_prod:
                    z = _zweig(b, a_prod, r"\n\{%- (?:elsif|else|endif)")
                else:
                    i = b.find("Direktversand vom Hersteller")
                    z = b[max(0, b.rfind("{%- else -%}", 0, i)): i] if i > 0 else None
                werktag = True
            else:
                # Zweige des case beginnen je eine Zeile («    {%- when N -%}», «    {%- else -%}…»); das innere else im
                # CH-Lager-Zweig steht mitten in der Zeile und beendet nichts.
                if tier != "Asien":
                    z = _zweig(b, a_cart, r"\n\s*\{%- (?:when|else|endcase)")
                else:
                    i = b.find("lux_lager = 'Direktversand")
                    z = b[b.rfind("\n", 0, i): i] if i > 0 else None
                werktag = SK_RANG[tier] in werktag_raenge
            if not z:
                bef.append(f"{datei}/{tier}: Zweig nicht gefunden")
                continue
            paare = [tuple(map(int, x)) for x in RE_PAAR.findall(z)]
            kal = RE_KAL.search(z)
            if werktag and paare:
                mit, ohne = min(paare, key=lambda x: x[1]), max(paare, key=lambda x: x[1])
                for art, (a, e) in (("mit", mit), ("ohne", ohne)):
                    v, bi = werktag_fenster(jetzt, bearb_theme, a, e)
                    aus[(datei, tier, art)] = (v, bi, f"Werktage {a}–{e} + Bearbeitung {bearb_theme}")
            elif kal:
                v, bi = kalender_fenster(jetzt, int(kal.group(1)), int(kal.group(2)))
                for art in ("mit", "ohne"):
                    aus[(datei, tier, art)] = (v, bi, f"Kalendertage {int(kal.group(1)) // 86400}–{int(kal.group(2)) // 86400}")
            else:
                bef.append(f"{datei}/{tier}: Rechnung nicht erkannt")
    return aus, bef


def seite_kasse(texte, jetzt, bearb, transit):
    """transit = {Profilname: (min, max) Transit-Tage Tarif «Standard» CH}. → (zeilen, befunde)."""
    fenster, bef = seite_fenster(texte, jetzt)
    zeilen = []
    for (datei, tier, art), (v, bi, wie) in sorted(fenster.items()):
        prof = SK_TIERS[tier][2] if art == "mit" and SK_TIERS[tier][2] else "General profile"
        if prof not in transit:
            bef.append(f"{tier} {art} Zeichen: Profil «{prof}» ohne Transit «Standard» CH")
            continue
        kv, kb = werktag_fenster(jetzt, bearb, *transit[prof])
        gleich = (v, bi) == (kv, kb)
        zeilen.append({"datei": datei, "tier": tier, "zeichen": art, "seite": f"{v:%d.%m.}–{bi:%d.%m.}", "rechnung": wie,
                       "kasse": f"{kv:%d.%m.}–{kb:%d.%m.}", "profil": prof, "gleich": gleich})
        if not gleich:
            kurz = "Seite" if datei.endswith("product.json") else "Korb"
            bef.append(f"{tier} {art} Zeichen: {kurz} {v:%d.%m.}–{bi:%d.%m.} · Kasse {kv:%d.%m.}–{kb:%d.%m.}")
    return zeilen, bef


def seite_kasse_live(bearb, transit):
    import datetime as _dt
    from zoneinfo import ZoneInfo
    r = gql('query($f:[String!]!){themes(roles:[MAIN],first:1){nodes{files(filenames:$f,first:5){nodes{filename '
            'body{... on OnlineStoreThemeFileBodyText{content}}}}}}}', {"f": list(SK_THEME_DATEIEN)}, ver="2026-01")
    texte = {n["filename"]: n["body"]["content"] for n in r["themes"]["nodes"][0]["files"]["nodes"]}
    zeilen, bef = seite_kasse(texte, _dt.datetime.now(ZoneInfo("Europe/Zurich")), bearb, transit)
    try:
        json.dump({"stand": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "zeilen": zeilen, "befunde": bef},
                  open(os.path.join(REPO, "dropship", "_seite_kasse_fenster.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1, default=str)
    except Exception:  # noqa: BLE001
        pass
    return zeilen, bef


def standard_transit(profile):
    """{Profilname: (min, max)} Transit-Tage des aktiven Tarifs «Standard» in der CH-Zone."""
    aus = {}
    for p in profile:
        for g in p["profileLocationGroups"]:
            for zn in g["locationGroupZones"]["nodes"]:
                if zonen_schluessel(zn["zone"]) != "CH":
                    continue
                for m in zn["methodDefinitions"]["nodes"]:
                    if m["active"] and m["name"] == "Standard":
                        for rg in m["rateGroups"]["nodes"]:
                            for r in rg["rateProviders"]["nodes"]:
                                if r.get("minTransitTime") and r.get("maxTransitTime"):
                                    aus[p["name"]] = (r["minTransitTime"] // TAG, r["maxTransitTime"] // TAG)
    return aus


# Liquid-Patch für Druck auf Bestellung (13.10.2026, Bericht DRUCK-PROFIL): (alt, neu) roh wie in der Theme-JSON (\n escaped).
# Zeichen = Shop-Metafeld luxe.druck_profil_ids «,id,id,» (druck_profil.py). Ohne Zeichen: 9–19 wie das General profile.
PRODUCT_PATCH = [("{%- assign d_from = now_s | plus: 777600 -%}\\n  {%- assign d_to = now_s | plus: 1641600 -%}",
                  "{%- assign lx_druck_key = ',' | append: closest.product.id | append: ',' -%}{%- if shop.metafields.luxe.druck_profil_ids.value"
                  " contains lx_druck_key -%}{%- assign lx_tmin = 6 -%}{%- assign lx_tmax = 13 -%}{%- else -%}{%- assign lx_tmin = 9 -%}"
                  "{%- assign lx_tmax = 19 -%}{%- endif -%}")]
CART_PATCH = [
    ("{%- assign lux_ohne_marke = false -%}",
     "{%- assign lux_ohne_marke = false -%}{%- assign lux_druck_lang = false -%}"
     "{%- assign lux_druck_ids = shop.metafields.luxe.druck_profil_ids.value | default: ',' -%}"),
    ("{%- assign r = 2 -%}",
     "{%- assign r = 2 -%}{%- assign lx_druck_key = ',' | append: item.product_id | append: ',' -%}"
     "{%- unless lux_druck_ids contains lx_druck_key -%}{%- assign lux_druck_lang = true -%}{%- endunless -%}"),
    ("{%- when 2 -%}{%- assign d_from = now_s | plus: 777600 -%}{%- assign d_to = now_s | plus: 1641600 -%}",
     "{%- when 2 -%}{%- if lux_druck_lang or lux_ohne_marke -%}{%- assign lx_tmin = 9 -%}{%- assign lx_tmax = 19 -%}{%- else -%}"
     "{%- assign lx_tmin = 6 -%}{%- assign lx_tmax = 13 -%}{%- endif -%}"),
    ("{%- if lux_rang == 0 or lux_rang == 3 -%}", "{%- if lux_rang == 0 or lux_rang == 2 or lux_rang == 3 -%}"),
]


def selbsttest_seite_kasse(pfad_produkt, pfad_korb):
    """Offline: Live-Kopien von 13.10. (Druck = Kalendertage) → Druck-Befund; mit Patch (Zeichen) → Druck gleich."""
    import datetime as _dt
    from zoneinfo import ZoneInfo
    t = {"templates/product.json": open(pfad_produkt, encoding="utf-8").read(),
         "templates/cart.json": open(pfad_korb, encoding="utf-8").read()}
    jetzt = _dt.datetime(2026, 10, 13, 21, 30, tzinfo=ZoneInfo("Europe/Zurich"))
    tr = {"General profile": (9, 19), "CH-Lager": (1, 2), "Druck auf Bestellung": (6, 13)}
    fehler = 0

    def pruef(name, ist, soll):
        nonlocal fehler
        ok = ist == soll
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: {ist}")
    z, b = seite_kasse(t, jetzt, 1, tr)
    d = {(x["datei"][10:13], x["tier"], x["zeichen"]): x for x in z}
    pruef("Druck Seite vorher 22.10.–02.11.", d[("pro", "Druck", "ohne")]["seite"], "22.10.–02.11.")
    pruef("Druck Kasse ohne Zeichen 28.10.–11.11.", d[("pro", "Druck", "ohne")]["kasse"], "28.10.–11.11.")
    pruef("Druck Kasse mit Zeichen 23.10.–03.11.", d[("pro", "Druck", "mit")]["kasse"], "23.10.–03.11.")
    pruef("Asien Seite = Kasse", d[("pro", "Asien", "ohne")]["gleich"], True)
    pruef("CH-Lager mit Zeichen gleich", d[("pro", "CH-Lager", "mit")]["gleich"], True)
    pruef("Korb Druck meldet", any(x.startswith("Druck") and "Korb" in x for x in b), True)
    p2 = t["templates/product.json"]
    for a, n in PRODUCT_PATCH:
        p2 = p2.replace(a, n)
    pruef("Patch greift (Testtext ersetzt)", p2 != t["templates/product.json"], True)
    z2, b2 = seite_kasse(dict(t, **{"templates/product.json": p2}), jetzt, 1, tr)
    d2 = {(x["datei"][10:13], x["tier"], x["zeichen"]): x for x in z2}
    pruef("nach Patch: Druck mit Zeichen gleich", d2[("pro", "Druck", "mit")]["gleich"], True)
    pruef("nach Patch: Druck ohne Zeichen gleich", d2[("pro", "Druck", "ohne")]["gleich"], True)
    c2 = t["templates/cart.json"]
    for a, n in CART_PATCH:
        c2 = c2.replace(a, n)
    pruef("Korb-Patch greift (4 Stellen)", sum(c2.count(n) for _, n in CART_PATCH) >= 4, True)
    z3, b3 = seite_kasse({"templates/product.json": p2, "templates/cart.json": c2}, jetzt, 1, tr)
    d3 = {(x["datei"][10:13], x["tier"], x["zeichen"]): x for x in z3}
    pruef("nach Korb-Patch: Druck mit Zeichen gleich", d3[("car", "Druck", "mit")]["gleich"], True)
    pruef("nach Korb-Patch: Druck ohne Zeichen gleich", d3[("car", "Druck", "ohne")]["gleich"], True)
    print(f"SELBSTTEST SEITE/KASSE {'OK' if not fehler else f'{fehler} FEHLER'}")
    return fehler == 0


def main():
    try:
        liste = profile_liste()
        aus = tuple(REGEL.get("ausnahme_profile_praefix") or ())
        profile = [gql(Q, {"id": x["id"]})["node"] for x in liste if not x["name"].startswith(aus)]
        pol = gql("{shop{shopPolicies{type body}}}", ver="2026-01")["shop"]["shopPolicies"]
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ VERSAND-LIEFERZEIT: unklar ({type(e).__name__}: {str(e)[:100]})")
        return 1
    versand = next((p["body"] for p in pol if p["type"] == "SHIPPING_POLICY"), "")
    # 12.10.2026: Kasse = Bearbeitungszeit + Transit. Die Regel nennt die GESAMT-Zusage; Transit = Zusage − Bearbeitung.
    bearb = 0
    if REGEL.get("abzug_bearbeitung"):
        try:
            pt = gql("{deliveryPromiseSettings{processingTime}}", ver="2026-01")["deliveryPromiseSettings"]["processingTime"] or ""
            m = re.fullmatch(r"P(\d+)D", pt)
            bearb = int(m.group(1)) if m else 0
            if not m:
                print(f"⚠️ VERSAND-LIEFERZEIT: Bearbeitungszeit «{pt}» nicht lesbar — rechne ohne Abzug", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print(f"⚠️ VERSAND-LIEFERZEIT: Bearbeitungszeit unklar ({type(e).__name__}) — rechne ohne Abzug", file=sys.stderr)
    befunde, ok, gesetzt = [], 0, 0
    for k, z in REGEL["zonen"].items():
        if z.get("richtlinie_satz") and z["richtlinie_satz"] not in versand:
            befunde.append(f"Versandrichtlinie ohne «{z['richtlinie_satz']}» ({k}) — Regel prüfen")
    for p in profile:
        lgs = []
        try:        # 19.10.2026: Preisstufen sieht die rateGroups-Abfrage nicht (Kopf Q_STUFEN) — eigene Abfrage, nur lesend
            befunde += stufen_befunde(p["name"], gql(Q_STUFEN, {"id": p["id"]})["node"])
        except Exception as e:  # noqa: BLE001
            befunde.append(f"{p['name']}: Preisstufen unklar ({type(e).__name__}: {str(e)[:60]})")
        for g in p["profileLocationGroups"]:
            zs = []
            for zn in g["locationGroupZones"]["nodes"]:
                # 13.10.2026: eigene Zusage je Profil (CH-Lager 4–5 Werktage), sonst die der Zone
                k = zonen_schluessel(zn["zone"])
                gesamt = ((REGEL.get("profile_zonen") or {}).get(p["name"]) or {}).get(k) or REGEL["zonen"][k]
                soll = {"min_tage": max(1, gesamt["min_tage"] - bearb), "max_tage": max(1, gesamt["max_tage"] - bearb)}
                mds = []
                for m in zn["methodDefinitions"]["nodes"]:
                    if not m["active"]:
                        continue
                    rgs = []
                    for rg in m["rateGroups"]["nodes"]:
                        rds = []
                        for r in rg["rateProviders"]["nodes"]:
                            if r.get("__typename") != "DeliveryRateDefinition":
                                continue
                            mn, mx = r.get("minTransitTime"), r.get("maxTransitTime")
                            if mn == soll["min_tage"] * TAG and mx == soll["max_tage"] * TAG:
                                ok += 1
                                continue
                            ist = f"{mn // TAG if mn else '–'}–{mx // TAG if mx else '–'} T"
                            befunde.append(f"{p['name']}/{zn['zone']['name']}/{m['name']}: {ist} statt "
                                           f"{soll['min_tage']}–{soll['max_tage']} T")
                            rds.append({"id": r["id"], "price": {"amount": r["price"]["amount"],
                                                                 "currencyCode": r["price"]["currencyCode"]},
                                        "minTransitTime": soll["min_tage"] * TAG, "maxTransitTime": soll["max_tage"] * TAG})
                        if rds:
                            rgs.append({"id": rg["id"], "rateDefinitionsToUpdate": rds})
                    if rgs:
                        mds.append({"id": m["id"], "rateGroupsToUpdate": rgs})
                if mds:
                    zs.append({"id": zn["zone"]["id"], "methodDefinitionsToUpdate": mds})
            if zs:
                lgs.append({"id": g["locationGroup"]["id"], "zonesToUpdate": zs})
        if lgs and SCHARF:
            r = gql(M, {"id": p["id"], "p": {"locationGroupsToUpdate": lgs}})["deliveryProfileUpdate"]
            if r["userErrors"]:
                befunde.append(f"{p['name']}: Schreiben abgelehnt {r['userErrors']}")
            else:
                gesetzt += sum(len(rd["rateDefinitionsToUpdate"]) for lg in lgs for z in lg["zonesToUpdate"]
                               for md in z["methodDefinitionsToUpdate"] for rd in md["rateGroupsToUpdate"])
    rc = 0
    if befunde and not (SCHARF and gesetzt and all("statt" in b for b in befunde)):
        print(f"⚠️ VERSAND-LIEFERZEIT: {ok} Tarife ok · {len(befunde)} Befunde: " + " | ".join(befunde[:5])
              + (f" · gesetzt {gesetzt}" if gesetzt else ""))
        rc = 1
    else:
        print(f"VERSAND-LIEFERZEIT: {ok} Tarife mit ehrlicher Lieferzeit (Bearbeitung {bearb} T + Transit = Zusage)"
              + (f" · gesetzt {gesetzt}" if gesetzt else ""))
    # 13.10.2026: Seitenfenster vs. Kassenfenster je Tier (Klasse 11 der Kauf-Strecke) — eigene Zeile, eigene Ampel
    try:
        if gesetzt:
            profile = [gql(Q, {"id": x["id"]})["node"] for x in liste if not x["name"].startswith(aus)]
        zeilen, sk = seite_kasse_live(bearb, standard_transit(profile))
        if sk:
            print(f"⚠️ SEITE≠KASSE: {len(sk)} von {len(zeilen)} Fenstern weichen ab: " + " | ".join(sk[:6]))
            rc = 1
        else:
            print(f"SEITE=KASSE: {len(zeilen)} Lieferfenster (Seite/Korb je Tier, mit/ohne Zeichen) gleich wie die Kasse")
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ SEITE≠KASSE: unklar ({type(e).__name__}: {str(e)[:100]})")
        rc = 1
    return rc


if __name__ == "__main__":
    if "--selbsttest-stufen" in sys.argv:         # offline, kein Shopify-Zugriff
        sys.exit(0 if selbsttest_stufen() else 1)
    if "--selbsttest-seite" in sys.argv:          # Pfade: Live-Kopien product.json, cart.json
        i = sys.argv.index("--selbsttest-seite")
        sys.exit(0 if selbsttest_seite_kasse(sys.argv[i + 1], sys.argv[i + 2]) else 1)
    sys.exit(main())
