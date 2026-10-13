#!/usr/bin/env python3
"""kassen_lieferdatum_wache.py — verspricht die Kasse ein früheres Lieferdatum, als die Ware braucht? (10.10.2026)

ANLASS (Kaufweg-Test am Handy, tools/kaufweg_handy.mjs): Produktseite «Lieferung voraussichtlich 26. Okt. – 9. Nov.», Kasse
«Voraussichtliche Zustellung Di., 20. Okt». Das Kassen-Datum entsteht aus `deliveryPromiseSettings.processingTime` (stand P1D) +
Transitzeit des Tarifs. Die TikTok-Lernkampagne brachte 6 Besucherinnen bis in die Kasse, 0 kauften. Schreibbar ist die
Bearbeitungszeit NUR im Admin (Einstellungen → Versand und Zustellung) — auch `unstable` hat dafür keine Mutation.
NACHTRAG 10.10. 17:30 (Handy-Bilder des Betreibers): Modus stand auf «Automatisiert» = Prognose aus dem Fulfillment-Verlauf, ERSETZT die
Transportzeit. Richtig ist «Manuell» (Fulfillment-Zeit + Transportzeit 10–20 T). Der Modus ist per API NICHT lesbar; P3D belegt die Umstellung.

MISST: Bearbeitungszeit (Shopify) gegen die echte Versanddauer = Werktage von Bestellung bis zur ersten Sendung mit
Sendungsnummer, über die letzten Bestellungen mit CJ-Ware (SKU CJ…/Zusteller CJPacket/YunExpress; ohne Druck-auf-Bestellung,
ohne CH-Lager). Liegt die Einstellung unter dem Median, ist das Kassen-Datum zu früh.
Schreibt dropship/_kassen_lieferdatum.json (liest betreiber_ampel.kassen_lieferdatum). Ändert NICHTS im Shop.

NACHTRAG 13.10.2026 abends (A7, Verbesserungsrunde Spur A): Produktseite (templates/product.json, Block lux_delivery) und
Warenkorb (templates/cart.json, Block lux_cart_trust) rechnen das Lieferdatum seit heute wie die Kasse (Marke LUX-KASSENDATUM):
Werktage Mo–Fr, Annahmeschluss 12 Uhr, Bearbeitung + Transit. Die Zahlen sind im Theme FEST eingebaut: «3 | plus: lx_tmin» =
Bearbeitung P3D, CH-Lager lx_tmin/lx_tmax 1/2 = Profil «CH-Lager» CH 4–5 minus Bearbeitung, Asien 7/17 = Zone CH 10–20 minus
Bearbeitung (automation/data/versand_transit_regel.json). Ändert jemand die Bearbeitungszeit (Admin) oder die Transitregel, wird
die Seite still falsch → diese Wache liest beide Live-Dateien und meldet «⚠️ KASSEN-DATUM THEME» (Ampel).
  python3 automation/kassen_lieferdatum_wache.py
  python3 automation/kassen_lieferdatum_wache.py --selbsttest   # Theme-Prüfung offline: P3D ok, P2D je Datei ⚠️
"""
import datetime as dt, json, os, re, sys
import numpy as np
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

STAND = os.path.join(REPO, "dropship", "_kassen_lieferdatum.json")
CJ_SKU = re.compile(r"^CJ", re.I)
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
MARKE = "LUX-KASSENDATUM"
THEME_DATEIEN = ("templates/product.json", "templates/cart.json")
TRANSIT_REGEL = os.path.join(HIER, "data", "versand_transit_regel.json")
# Liquid-Stellen (13.10.2026): Bearbeitung · CH-Lager-Zweig (Stufe ≥ 1, sonst General profile) · Asien-Zweig
RE_VON = re.compile(r"assign lx_von = (\d+) \| plus: lx_tmin")
RE_CH = re.compile(r"lx_stufe >= 1 -%\}\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}"
                   r"\{%- else -%\}\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}")
RE_ASIEN = re.compile(r"\{%- else -%\}\s*\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}\s*"
                      r"\{%- assign (?:lager|lux_lager) = 'Direktversand")


def tage(iso):
    m = re.fullmatch(r"P(\d+)D", iso or "")
    return int(m.group(1)) if m else None


def theme_soll(bearb, regel):
    """Was im Theme stehen muss: Transit = Zusage (versand_transit_regel.json) − Bearbeitung."""
    ch = ((regel.get("profile_zonen") or {}).get("CH-Lager") or {}).get("CH") or {}
    z = regel["zonen"]["CH"]
    return {"bearb": bearb,
            "ch_lager": (ch["min_tage"] - bearb, ch["max_tage"] - bearb) if ch else None,
            "asien": (z["min_tage"] - bearb, z["max_tage"] - bearb)}


def marken_text(datei_text):
    """Alle Liquid-Strings einer Theme-JSON-Datei mit der Marke (Kommentarkopf /* … */ wird übersprungen)."""
    k = datei_text.find("{", datei_text.find("*/") + 2 if datei_text.lstrip().startswith("/*") else 0)
    gefunden = []

    def lauf(x):
        if isinstance(x, dict):
            for v in x.values():
                lauf(v)
        elif isinstance(x, list):
            for v in x:
                lauf(v)
        elif isinstance(x, str) and MARKE in x:
            gefunden.append(x)
    lauf(json.loads(datei_text[k:]))
    return "\n".join(gefunden)


def theme_pruefen(texte, bearb, regel):
    """texte = {dateiname: Rohtext der Live-Datei}. → Liste Befunde (leer = Seite rechnet wie die Kasse)."""
    soll = theme_soll(bearb, regel)
    befunde = []
    for name in THEME_DATEIEN:
        roh = texte.get(name)
        if roh is None:
            befunde.append(f"{name}: nicht lesbar"); continue
        try:
            t = marken_text(roh)
        except Exception as e:  # noqa: BLE001
            befunde.append(f"{name}: JSON unlesbar ({type(e).__name__})"); continue
        if not t:
            befunde.append(f"{name}: Marke {MARKE} fehlt (Theme-Editor/Update überschrieben?)"); continue
        von = [int(x) for x in RE_VON.findall(t)]
        if len(von) != 1:
            befunde.append(f"{name}: Bearbeitungs-Stelle «N | plus: lx_tmin» {len(von)}× (erwartet 1)")
        elif von[0] != bearb:
            befunde.append(f"{name}: Theme rechnet Bearbeitung {von[0]} T, Shop-Einstellung P{bearb}D")
        ch = RE_CH.findall(t)
        if len(ch) != 1:
            befunde.append(f"{name}: CH-Lager-Zweig {len(ch)}× (erwartet 1)")
        else:
            a, b, ga, gb = map(int, ch[0])
            if soll["ch_lager"] and (a, b) != soll["ch_lager"]:
                befunde.append(f"{name}: CH-Lager Transit {a}/{b} T, Profil «CH-Lager» verlangt {soll['ch_lager'][0]}/{soll['ch_lager'][1]}")
            if (ga, gb) != soll["asien"]:
                befunde.append(f"{name}: CH-Lager ohne Profil (Stufe 0) {ga}/{gb} T, Zone CH verlangt {soll['asien'][0]}/{soll['asien'][1]}")
        asien = RE_ASIEN.findall(t)
        if len(asien) != 1:
            befunde.append(f"{name}: Asien-Zweig {len(asien)}× (erwartet 1)")
        elif tuple(map(int, asien[0])) != soll["asien"]:
            befunde.append(f"{name}: Asien Transit {asien[0][0]}/{asien[0][1]} T, Zone CH verlangt {soll['asien'][0]}/{soll['asien'][1]}")
    return befunde


def theme_live(bearb):
    """Beide Live-Dateien aus MAIN lesen und prüfen → (befunde, md5)."""
    r = gql('query($id:ID!,$f:[String!]!){theme(id:$id){role files(filenames:$f,first:5){nodes{filename checksumMd5 '
            'body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"id": THEME, "f": list(THEME_DATEIEN)})["theme"]
    texte = {n["filename"]: n["body"]["content"] for n in r["files"]["nodes"]}
    md5 = {n["filename"]: n["checksumMd5"] for n in r["files"]["nodes"]}
    befunde = [] if r["role"] == "MAIN" else [f"Theme nicht MAIN ({r['role']})"]
    if bearb is None:
        return befunde + ["Bearbeitungszeit nicht lesbar"], md5
    return befunde + theme_pruefen(texte, bearb, json.load(open(TRANSIT_REGEL, encoding="utf-8"))), md5


# Selbsttest: die Liquid-Zeilen so, wie sie am 13.10.2026 live stehen (gekürzt auf die geprüften Stellen).
_PROBE_PRODUKT = ("{%- comment -%} LUX-KASSENDATUM (Spur A) {%- endcomment -%}\n"
                  "{%- if closest.product.tags contains 'ch-lager' -%}\n"
                  "  {%- if lx_stufe >= 1 -%}{%- assign lx_tmin = 1 -%}{%- assign lx_tmax = 2 -%}{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- endif -%}\n"
                  "{%- else -%}\n  {%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}\n"
                  "  {%- assign lager = 'Direktversand vom Hersteller in Asien — deshalb die längere Lieferzeit' -%}\n{%- endif -%}\n"
                  "{%- if lx_tmin > 0 -%}\n  {%- assign lx_von = 3 | plus: lx_tmin -%}\n{%- endif -%}")
_PROBE_KORB = ("{%- when 0 -%}{%- assign lx_stufe = 1 -%}{%- if lx_stufe >= 1 -%}{%- assign lx_tmin = 1 -%}{%- assign lx_tmax = 2 -%}"
               "{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- endif -%}{%- assign lux_lager = 'aus dem Schweizer Lager' -%}\n"
               "{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- assign lux_lager = 'Direktversand aus Asien' -%}\n"
               "{%- comment -%} LUX-KASSENDATUM {%- endcomment -%}\n{%- assign lx_von = 3 | plus: lx_tmin -%}")


def _probe_datei(liquid, wo):
    j = {"sections": {"x": {"settings": {"custom_liquid": liquid}}}} if wo == "korb" else \
        {"sections": {"main": {"blocks": {"product-details": {"blocks": {"lux_delivery": {"settings": {"custom_liquid": liquid}}}}}}}}
    return "/*\n * Kopf\n */\n" + json.dumps(j, ensure_ascii=False, indent=2)


def selbsttest():
    regel = json.load(open(TRANSIT_REGEL, encoding="utf-8"))
    gut = {"templates/product.json": _probe_datei(_PROBE_PRODUKT, "produkt"), "templates/cart.json": _probe_datei(_PROBE_KORB, "korb")}
    faelle = [
        ("P3D, Theme wie live", gut, 3, regel, set()),
        ("P2D → beide Dateien ⚠️", gut, 2, regel, {"templates/product.json", "templates/cart.json"}),
        ("P2D nur product.json geprüft", {**gut, "templates/cart.json": _probe_datei(_PROBE_KORB.replace("3 | plus", "2 | plus")
                                                                                            .replace("tmin = 1 ", "tmin = 2 ").replace("tmax = 2 ", "tmax = 3 ")
                                                                                            .replace("tmin = 7 ", "tmin = 8 ").replace("tmax = 17 ", "tmax = 18 "), "korb")},
         2, regel, {"templates/product.json"}),
        ("P2D nur cart.json geprüft", {**gut, "templates/product.json": _probe_datei(_PROBE_PRODUKT.replace("3 | plus", "2 | plus")
                                                                                              .replace("tmin = 1 ", "tmin = 2 ").replace("tmax = 2 ", "tmax = 3 ")
                                                                                              .replace("tmin = 7 ", "tmin = 8 ").replace("tmax = 17 ", "tmax = 18 "), "produkt")},
         2, regel, {"templates/cart.json"}),
        ("Marke fehlt in cart.json", {**gut, "templates/cart.json": _probe_datei(_PROBE_KORB.replace(MARKE, "X"), "korb")}, 3, regel, {"templates/cart.json"}),
        ("Asien 8/17 in product.json", {**gut, "templates/product.json": _probe_datei(_PROBE_PRODUKT.replace(
            "{%- else -%}\n  {%- assign lx_tmin = 7 -%}", "{%- else -%}\n  {%- assign lx_tmin = 8 -%}"), "produkt")}, 3, regel, {"templates/product.json"}),
        ("Regel CH-Lager 5–6 → beide ⚠️", gut, 3, {**regel, "profile_zonen": {"CH-Lager": {"CH": {"min_tage": 5, "max_tage": 6}}}},
         {"templates/product.json", "templates/cart.json"}),
    ]
    fehler = 0
    for name, texte, bearb, rg, soll_dateien in faelle:
        b = theme_pruefen(texte, bearb, rg)
        ist = {d for d in THEME_DATEIEN if any(x.startswith(d) for x in b)}
        ok = ist == soll_dateien
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: {'⚠️ ' + ' | '.join(b) if b else 'ok'}")
    print(f"KASSEN-DATUM THEME Selbsttest {len(faelle) - fehler}/{len(faelle)}")
    return fehler == 0


def main():
    s = gql('query{deliveryPromiseSettings{deliveryDatesEnabled processingTime}}')["deliveryPromiseSettings"]
    d = gql('''query{orders(first:60,query:"fulfillment_status:shipped",sortKey:CREATED_AT,reverse:true){nodes{name createdAt
             fulfillments{createdAt trackingInfo{company number}} lineItems(first:5){nodes{sku}}}}}''')["orders"]["nodes"]
    werte = []
    for o in d:
        skus = [l["sku"] or "" for l in o["lineItems"]["nodes"]]
        if not any(CJ_SKU.match(x) for x in skus):
            continue                                          # nur CJ-Ware (Druck/CH-Lager haben eigene Zeiten)
        mit_nummer = [f for f in o["fulfillments"] if any(t.get("number") for t in f["trackingInfo"])]
        if not mit_nummer:
            continue
        c = dt.datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00")).date()
        f = min(dt.datetime.fromisoformat(x["createdAt"].replace("Z", "+00:00")).date() for x in mit_nummer)
        werte.append((o["name"], int(np.busday_count(c, f))))
        if len(werte) >= 12:
            break
    zahlen = sorted(w for _, w in werte)
    median = float(np.median(zahlen)) if zahlen else None
    p80 = float(np.percentile(zahlen, 80)) if zahlen else None
    einstellung = tage(s.get("processingTime"))
    zu_frueh = bool(s.get("deliveryDatesEnabled") and einstellung is not None and median is not None and einstellung < median)
    stand = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "datum_in_kasse": s.get("deliveryDatesEnabled"),
             "bearbeitungszeit_tage": einstellung, "versand_werktage": werte, "median": median, "p80": p80,
             "empfohlen": int(np.ceil(p80)) if p80 is not None else None, "zu_frueh": zu_frueh}
    # 13.10.2026 (Kassen-Prüfung wf_2a13fa79, Richter Platz 1): Ware ab CH-Lager (Fortura, 1–2 Tage) liegt im SELBEN
    # Versandprofil wie CJ-Ware (10–20 Werktage) → die Kasse zeigt für ein Halloween-Kostüm ab Schweizer Lager «28. Okt–11. Nov»,
    # die Produktseite «14.–16. Okt». Ein eigenes Profil würde gemischte Körbe doppelt verrechnen (CHF 14 statt 7) → Betreiber.
    # Gemessen wird nur, ob CH-Lager- und CJ-Ware dasselbe Profil teilen; neue Fortura-Ware fällt über den Tag hinein.
    try:
        prof = {}
        for name, q in (("ch_lager", "tag:ch-lager AND status:active"), ("cj", "sku:CJ* AND status:active")):
            r = gql('query($q:String!){products(first:5,query:$q){nodes{variants(first:1){nodes{deliveryProfile{id name}}}}} '
                    'c:productsCount(query:$q,limit:null){count}}', {"q": q})
            ids = {((n["variants"]["nodes"] or [{}])[0].get("deliveryProfile") or {}).get("name") for n in r["products"]["nodes"]}
            prof[name] = {"profile": sorted(x for x in ids if x), "anzahl": r["c"]["count"]}
        stand["ch_lager_profil"] = prof
        stand["ch_lager_im_asien_profil"] = bool(set(prof["ch_lager"]["profile"]) & set(prof["cj"]["profile"]))
    except Exception as e:
        stand["ch_lager_profil"] = {"fehler": str(e)[:160]}
    # 13.10.2026 (A7): rechnet das Theme noch mit derselben Bearbeitung + Transit wie die Kasse?
    try:
        tb, md5 = theme_live(einstellung)
        stand["theme_kassendatum"] = {"befunde": tb, "md5": md5}
    except Exception as e:  # noqa: BLE001
        tb = [f"unklar ({type(e).__name__}: {str(e)[:100]})"]
        stand["theme_kassendatum"] = {"befunde": tb}
    json.dump(stand, open(STAND, "w"), ensure_ascii=False, indent=1)
    print("⚠️ KASSEN-DATUM THEME: " + " · ".join(tb) if tb else
          f"KASSEN-DATUM THEME: Produktseite + Warenkorb rechnen wie die Kasse (Bearbeitung {einstellung} T)")
    print(f"KASSEN-DATUM: Bearbeitungszeit {einstellung} T · gemessen bis Versand Median {median} / 80 % {p80} Werktage "
          f"({len(werte)} CJ-Bestellungen) → {'⚠️ Kasse verspricht zu früh, empfohlen %s Werktage' % stand['empfohlen'] if zu_frueh else 'ok'}")
    # 13.10.2026: Entscheid umgesetzt — automation/ch_lager_profil.py ordnet stufenweise zu (Stufe 1/2 lässt Google-Ware
    # bewusst im General profile). Diese Stichprobe meldet deshalb erst ab Stufe 3; vorher meldet die Ampel-Zeile CH-LAGER-PROFIL.
    try:
        stufe = int(json.load(open(os.path.join(REPO, "dropship", "_ch_lager_profil_stufe.json"))).get("stufe", 1))
    except Exception:
        stufe = 3
    if stand.get("ch_lager_im_asien_profil") and stufe >= 3:
        print(f"KASSEN-DATUM CH-LAGER: {stand['ch_lager_profil']['ch_lager']['anzahl']} aktive Produkte ab Schweizer Lager im selben "
              f"Versandprofil wie CJ-Ware → Kasse zeigt das Asien-Lieferfenster")


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    main()
