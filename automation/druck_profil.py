#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""druck_profil.py — Druck auf Bestellung: Kasse zeigt dasselbe Lieferfenster wie die Seite (13.10.2026).

ANLASS (dropship/KAUFSTRECKE-SEITEN-2026-10-13.md, Klasse 11): Produktseite/Warenkorb nennen für Druck auf Bestellung
22.10.–2.11. (Theme lux_delivery/lux_cart_trust: jetzt + 9 bis + 19 Kalendertage), die Kasse 28.10.–11.11. (General profile:
Bearbeitung P1D + Transit 9–19 Werktage). Betreiber 13.10. abends: «versandprofil ja mache es sauber und so».

ENTSCHEID (Plan + Kritik, Bericht dropship/DRUCK-PROFIL-2026-10-13.md) — Muster ch_lager_profil.py:
  Profil «Druck auf Bestellung» mit 0.00-Tarifen UNTER DEN NAMEN des General profile («Standard», «Kostenloser Versand» ab 45,
  «Standard Liechtenstein»), Transit CH 6–13 Werktage (+ P1D = die bestehende Zusage «7–14 Werktage»), LI wie General.
  Gleichnamige Tarife verschiedener Profile werden in der Kasse ADDIERT, Preisbedingungen gelten für die ganze Korbsumme →
  Mischkorb zahlt nie mehr als heute (7 + 0, ab 45: 0 + 0, LI 14.90 + 0). Ein reiner Druck-Korb im Profil ist versandfrei.
  Das General profile bleibt unberührt → Google zeigt weiter 7.00 / gratis ab 45 / 10–20 T (nie tiefer als die Kasse).

MITGLIEDSCHAFT (je Produkt, ALLE Varianten müssen sie erfüllen; täglich neu gerechnet, regel()):
  aktiv · Tag printful_personalized_product · Printful-Katalogvariante aus der SKU («<sync>_<katalog>») im Kosten-Cache
  · Technik DTG (Kritik Punkt 3: Allover/Sublimation/Stick haben keine gemessene Produktionszeit; #1005 Allover brauchte
  7 Werktage bis zum Versand) · Printful-Versand nach CH UND LI gemessen, CH höchstens MAX_VERSANDTAGE
  · Marge im schlechtesten Fall ≥ MARGE_MIN: Preis − 10 % Rabatt − (Einkauf + Rückseite falls der Editor eine anbietet
    + Printful-Versand) × 1.081 MWST (Printful rechnet CH-MWST ab, #1005 gemessen) × 1.05 Wechselkurs-Puffer (Printful
    rechnet in USD ab) − 3 % − 0.30 Gebühr, OHNE Versandertrag vom Kunden.
  Neue Druck-Produkte ohne Kosten im Cache bleiben im General profile (langes Datum = sicher).

ZEICHEN (statt Tag am Produkt, Kritik Punkt 7): Shop-Metafeld luxe.druck_profil_ids = «,<id>,<id>,» (multi_line_text_field).
  Jede Produktänderung schickt das Produkt neu an Google (Lehre 12.10., Werbe-Kontingent) und alle Mitglieder sind im
  Google-Kanal, viele sind Editor-Produkte (heilig) → KEINE Produkt-Schreibvorgänge; Rückweg = ein Feld.
  Eine ID steht im Feld NUR, wenn ALLE Varianten des Produkts im Profil liegen (Kritik Punkt 4: eine neu von Printful
  synchronisierte Variante darf kein kurzes Datum zeigen). Reihenfolge: Zeichen weg → dann lösen; zuordnen → dann Zeichen.
  Liquid-Patch für lux_delivery/lux_cart_trust: im Bericht (Theme gehört gerade einem anderen Workflow).

STUFEN (dropship/_druck_profil_stufe.json): Google übernimmt nur das General profile; zu Zusatzprofilen meldet es nur
  unbenannte «errors» (CH-Lager-Bericht). 1 = STUFE1_ANZAHL Motiv-Shirts ohne Editor (kleinste IDs), 2 = alle Mitglieder
  ab «stufe2_ab» — der Scharf-Lauf schaltet SELBST um, wenn die Stufe-1-Produkte bei Google keine Versand-/Preis-Meldung
  tragen, Tarife ok und Korb-Matrix ok (sonst Ampel).

SICHERUNG (Kritik Punkt 5): jeder Scharf-Lauf rechnet die Korb-Matrix (draftOrderCalculate, keine Bestellung). Zahlt ein Korb
  mehr als ohne Profil → automatischer Rückweg + Ampel. Tarif-Befund (Preis ≠ 0, Name/Bedingung anders) → Rückweg bei Preis,
  sonst kein Zuordnen. Transit falsch → nachsetzen (nur dieses Profil).

  python3 automation/druck_profil.py --trocken     # Probelauf (Standard): Soll/Ist, Regel je Produkt, schreibt nur den Stand
  python3 automation/druck_profil.py --anlegen     # Profil anlegen (+ Transit), falls es fehlt
  python3 automation/druck_profil.py --scharf      # Tarife/Transit prüfen → Matrix → zuordnen/lösen → Zeichen
  python3 automation/druck_profil.py --test        # nur Korb-Matrix (vorher/nachher-Messung)
  python3 automation/druck_profil.py --kosten      # Printful-Kosten neu holen (Cache, sonst wöchentlich im Scharf-Lauf)
  python3 automation/druck_profil.py --liste       # Regel-Urteil je Produkt (TSV auf stdout)
  python3 automation/druck_profil.py --selbsttest
  python3 automation/druck_profil.py --rueckweg [--scharf]   # Zeichen leeren, dann alle Varianten lösen
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from ch_lager_profil import (GENERAL, GOOGLE, Q_PROFIL, STANDORT, gql, korb,  # noqa: E402
                             tarife_pruefen, zonen_methoden)

PROFIL_NAME = "Druck auf Bestellung"
CH_LAGER_NAME = "CH-Lager"
MF_NS, MF_KEY, MF_TYP = "luxe", "druck_profil_ids", "multi_line_text_field"
DRUCK_TAG = "printful_personalized_product"
DRUCK_TAGS = ("printful_personalized_product", "prodigi_personalized_product", "selbst-gestalten")
SKU_RE = re.compile(r"^\d+_(\d+)$")
MWST = 1.081            # Printful stellt CH-MWST in Rechnung (#1005: tax 3.36 = 8,1 % auf Ware + Versand), nicht rückforderbar
FX_PUFFER = 1.05        # Printful rechnet in USD ab, die CHF-Preise der API sind Umrechnungen
RABATT = 0.10           # WELCOME10 ODER Bündel −10 % (nicht kombinierbar, gemessen Kritik)
GEBUEHR_SATZ, GEBUEHR_FIX = 0.03, 0.30   # Fixgebühr VERMUTUNG
MARGE_MIN = 0.0         # nie Verlust auf einem reinen Druck-Korb, auch im schlechtesten Fall
MAX_VERSANDTAGE = 7     # Printful STANDARD nach CH, maxDeliveryDays (nach dem Versand)
KOSTEN_MAX_ALTER = 7    # Tage; danach holt der Scharf-Lauf neu (wenn PRINTFUL_API_KEY da ist)
KOSTEN_SPERR_ALTER = 21  # Tage; älterer Cache → keine NEUEN Mitglieder
STUFE_DATEI = os.path.join(REPO, "dropship", "_druck_profil_stufe.json")
STAND = os.path.join(REPO, "dropship", "_druck_profil.json")
LEDGER = os.path.join(REPO, "dropship", "_druck_profil.tsv")
KOSTEN = os.path.join(REPO, "dropship", "_druck_profil_kosten.json")
REGEL = json.load(open(os.path.join(HIER, "data", "versand_transit_regel.json"), encoding="utf-8"))
BLOCK = 50
TAG_S = 86400
GOOGLE_HALT = re.compile(r"shipping|delivery|versand|lieferung|inaccurate|price|preis", re.I)


def jetzt():
    return dt.datetime.now(dt.timezone.utc)


def ledger(*teile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([jetzt().strftime("%Y-%m-%dT%H:%M:%SZ")] + [str(t) for t in teile]) + "\n")


def nr(gid):
    return int(str(gid).rsplit("/", 1)[1])


# ---------------------------------------------------------------- Profil
def profil_finden(name=PROFIL_NAME):
    nach = None
    while True:
        d = gql("query($n:String){deliveryProfiles(first:50,after:$n){pageInfo{hasNextPage endCursor} nodes{id name}}}",
                {"n": nach})["deliveryProfiles"]
        t = [p["id"] for p in d["nodes"] if p["name"] == name]
        if t:
            return t[0]
        if not d["pageInfo"]["hasNextPage"]:
            return None
        nach = d["pageInfo"]["endCursor"]


def bearbeitung():
    pt = gql("{deliveryPromiseSettings{processingTime}}")["deliveryPromiseSettings"]["processingTime"] or ""
    m = re.fullmatch(r"P(\d+)D", pt)
    if not m:
        raise RuntimeError(f"Bearbeitungszeit «{pt}» nicht lesbar")
    return int(m.group(1))


def transit_soll(bearb):
    """{Land: (min, max) Transit-Tage} = Gesamtzusage aus profile_zonen − Bearbeitung (wie versand_transit_wache)."""
    pz = (REGEL.get("profile_zonen") or {}).get(PROFIL_NAME)
    if not pz:
        raise RuntimeError(f"profile_zonen «{PROFIL_NAME}» fehlt in versand_transit_regel.json — die Transit-Wache würde zurückdrehen")
    return {k: (max(1, v["min_tage"] - bearb), max(1, v["max_tage"] - bearb)) for k, v in pz.items()}


Q_TRANSIT = """query($id:ID!){deliveryProfile(id:$id){profileLocationGroups{locationGroup{id}
 locationGroupZones(first:10){nodes{zone{id name countries{code{countryCode}}}
  methodDefinitions(first:10){nodes{id name active rateGroups(first:2){nodes{id rateProviders(first:3){nodes{__typename
   ... on DeliveryRateDefinition{id price{amount currencyCode} minTransitTime maxTransitTime}}}}}}}}}}}}"""


def transit_pruefen(pid, bearb, scharf=False):
    """Befunde (leer = ok) für Transit je Tarif; scharf → abweichende Transitzeit setzen (Preis unverändert)."""
    soll = transit_soll(bearb)
    p = gql(Q_TRANSIT, {"id": pid}, ver="unstable")["deliveryProfile"]
    bef, lgs = [], []
    for g in p["profileLocationGroups"]:
        zs = []
        for zn in g["locationGroupZones"]["nodes"]:
            laender = {c["code"]["countryCode"] for c in zn["zone"]["countries"]}
            land = "LI" if "LI" in laender else "CH" if "CH" in laender else None
            if not land or land not in soll:
                bef.append(f"Zone {zn['zone']['name']} ohne Transit-Regel")
                continue
            a, b = soll[land]
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
                        if r.get("minTransitTime") == a * TAG_S and r.get("maxTransitTime") == b * TAG_S:
                            continue
                        ist = f"{(r.get('minTransitTime') or 0) // TAG_S}–{(r.get('maxTransitTime') or 0) // TAG_S}"
                        bef.append(f"{land}/{m['name']}: Transit {ist} T statt {a}–{b}")
                        rds.append({"id": r["id"], "price": r["price"], "minTransitTime": a * TAG_S, "maxTransitTime": b * TAG_S})
                    if rds:
                        rgs.append({"id": rg["id"], "rateDefinitionsToUpdate": rds})
                if rgs:
                    mds.append({"id": m["id"], "rateGroupsToUpdate": rgs})
            if mds:
                zs.append({"id": zn["zone"]["id"], "methodDefinitionsToUpdate": mds})
        if zs:
            lgs.append({"id": g["locationGroup"]["id"], "zonesToUpdate": zs})
    if bef and scharf and lgs:
        r = gql("mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$p){profile{id} userErrors{field message}}}",
                {"id": pid, "p": {"locationGroupsToUpdate": lgs}}, ver="unstable")["deliveryProfileUpdate"]
        if r["userErrors"]:
            return bef + [f"Transit setzen abgelehnt {r['userErrors'][:2]}"]
        ledger("transit-gesetzt", pid, " | ".join(bef))
        return transit_pruefen(pid, bearb, scharf=False)
    return bef


def anlegen():
    pid = profil_finden()
    if pid:
        print(f"Profil «{PROFIL_NAME}» existiert schon: {pid}")
        return pid
    gm = zonen_methoden(gql(Q_PROFIL, {"id": GENERAL}, ver="unstable")["deliveryProfile"])
    zonen = []
    for land, zname in (("CH", "Schweiz (Druck)"), ("LI", "Liechtenstein (Druck)")):
        methoden = []
        for name, eintraege in gm.get(land, {}).items():
            for e in eintraege:
                m = {"name": name, "active": True, "rateDefinition": {"price": {"amount": "0.00", "currencyCode": "CHF"}}}
                pc = [{"criteria": {"amount": str(betrag), "currencyCode": "CHF"}, "operator": op}
                      for feld, op, betrag in e["bed"] if feld == "TOTAL_PRICE"]
                if len(pc) != len(e["bed"]):
                    raise SystemExit(f"ABBRUCH: {land}/{name} hat Bedingungen ausser TOTAL_PRICE {e['bed']} — von Hand prüfen")
                if pc:
                    m["priceConditionsToCreate"] = pc
                methoden.append(m)
        if not methoden:
            raise SystemExit(f"ABBRUCH: General profile hat für {land} keine aktive Methode")
        zonen.append({"name": zname, "countries": [{"code": land, "includeAllProvinces": True}],
                      "methodDefinitionsToCreate": methoden})
    eingabe = {"name": PROFIL_NAME, "locationGroupsToCreate": [{"locations": [STANDORT], "zonesToCreate": zonen}]}
    print(json.dumps(eingabe, ensure_ascii=False)[:900])
    r = gql("mutation($p:DeliveryProfileInput!){deliveryProfileCreate(profile:$p){profile{id name} userErrors{field message}}}",
            {"p": eingabe}, ver="unstable")["deliveryProfileCreate"]
    if r["userErrors"]:
        raise SystemExit(f"ABBRUCH: Anlegen abgelehnt {r['userErrors']}")
    pid = r["profile"]["id"]
    ledger("profil-angelegt", pid, PROFIL_NAME)
    bef = tarife_pruefen(zonen_methoden(gql(Q_PROFIL, {"id": pid}, ver="unstable")["deliveryProfile"]), gm)
    tb = transit_pruefen(pid, bearbeitung(), scharf=True)
    print(f"angelegt: {pid} · Tarife {'ok' if not bef else bef} · Transit {'ok' if not tb else tb}")
    return pid


# ---------------------------------------------------------------- Kosten (Printful)
def _pf(url, body=None):
    h = {"Authorization": "Bearer " + os.environ["PRINTFUL_API_KEY"], "Content-Type": "application/json",
         "User-Agent": "LuxeStyle-druck-profil/1.0"}
    if os.environ.get("PRINTFUL_STORE_ID"):
        h["X-PF-Store-Id"] = os.environ["PRINTFUL_STORE_ID"]
    for versuch in range(6):
        try:
            r = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers=h,
                                       method="POST" if body else "GET")
            return json.load(urllib.request.urlopen(r, timeout=40))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20)
                continue
            return {"fehler": e.code}
        except Exception:  # noqa: BLE001
            time.sleep(3 + versuch * 3)
    return {"fehler": "unerreichbar"}


ADR = {"CH": {"country_code": "CH", "zip": "8001", "city": "Zürich", "address1": "Bahnhofstrasse 1"},
       "LI": {"country_code": "LI", "zip": "9490", "city": "Vaduz", "address1": "Städtle 1"}}


def kosten_laden():
    try:
        return json.load(open(KOSTEN, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {"stand": None, "varianten": {}}


def kosten_alter(k):
    try:
        return (jetzt() - dt.datetime.fromisoformat(k["stand"].replace("Z", "+00:00"))).total_seconds() / TAG_S
    except Exception:  # noqa: BLE001
        return 999.0


def kosten_holen(katalog_ids):
    """Printful v2 Preise (CHF, Technik + Platzierungen) + v1 Versand CH/LI je Katalogvariante → Cache. Fehlende bleiben weg."""
    if not os.environ.get("PRINTFUL_API_KEY"):
        print("⚠️ PRINTFUL_API_KEY fehlt — Kosten-Cache bleibt, wie er ist")
        return kosten_laden()
    alt = kosten_laden().get("varianten", {})
    neu, fehler = {}, 0
    for vid in sorted(set(katalog_ids), key=int):
        e = {}
        pr = _pf(f"https://api.printful.com/v2/catalog-variants/{vid}/prices?currency=CHF")
        try:
            e["tech"] = {t["technique_key"]: float(t["discounted_price"]) for t in pr["data"]["variant"]["techniques"]}
            e["placements"] = {p["id"]: float(p["discounted_price"]) for p in pr["data"]["product"]["placements"]}
        except Exception:  # noqa: BLE001
            pass
        for land in ("CH", "LI"):
            s = _pf("https://api.printful.com/shipping/rates",
                    {"recipient": ADR[land], "items": [{"variant_id": int(vid), "quantity": 1}], "currency": "CHF"})
            try:
                e["ship_" + land] = [(r["id"], float(r["rate"]), r["minDeliveryDays"], r["maxDeliveryDays"]) for r in s["result"]]
            except Exception:  # noqa: BLE001
                pass
        if "tech" in e and "ship_CH" in e:
            neu[vid] = e
        else:
            fehler += 1
            if vid in alt:              # alter Wert bleibt (mit eigenem Datum), statt still zu verschwinden
                neu[vid] = dict(alt[vid], veraltet=True)
        time.sleep(0.5)
    k = {"stand": jetzt().strftime("%Y-%m-%dT%H:%M:%SZ"), "waehrung": "CHF",
         "quelle": "Printful API v2 /catalog-variants/{id}/prices?currency=CHF + v1 /shipping/rates (Zürich 8001, Vaduz 9490)",
         "fehler": fehler, "varianten": neu}
    json.dump(k, open(KOSTEN, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    ledger("kosten-geholt", len(neu), f"fehler {fehler}")
    print(f"Kosten-Cache: {len(neu)} Katalogvarianten · {fehler} ohne Antwort")
    return k


# ---------------------------------------------------------------- Regel
def _standard(rates):
    """Günstigster STANDARD-Tarif (id, preis, min, max) — sonst günstigster überhaupt."""
    if not rates:
        return None
    st = [r for r in rates if str(r[0]).upper() == "STANDARD"]
    return min(st or rates, key=lambda r: r[1])


def editor_rueckseite(html):
    """Bietet der Editor eine Rückseite an? Wie lspod-designer-v5: imgBack gesetzt UND ≠ imgFront."""
    m = re.search(r'<div[^>]*class="lspod-designer"[^>]*>', html or "")
    if not m:
        return False
    tag = m.group(0)
    vorne = re.search(r'data-img-front="([^"]*)"', tag) or re.search(r'data-img="([^"]*)"', tag)
    hinten = re.search(r'data-img-back="([^"]*)"', tag)
    return bool(hinten and hinten.group(1) and hinten.group(1) != (vorne.group(1) if vorne else ""))


def marge(preis, ek, versand):
    erloes = preis * (1 - RABATT)
    return round(erloes - (ek + versand) * MWST * FX_PUFFER - (erloes * GEBUEHR_SATZ + GEBUEHR_FIX), 2)


def regel(p, kv):
    """p = {aktiv, tags, rueckseite, varianten:[{id, sku, preis, ek}]} · kv = Kosten-Cache «varianten».
    → {"mitglied": bool, "grund": str, "marge_min": float|None, "editor": bool}"""
    tags = {t.lower() for t in p["tags"]}
    aus = {"mitglied": False, "grund": "", "marge_min": None, "editor": bool(p.get("editor"))}
    if not p["aktiv"]:
        aus["grund"] = "nicht aktiv"
        return aus
    if DRUCK_TAG not in tags:
        aus["grund"] = "kein Printful-Druck (Kosten nicht messbar)"
        return aus
    margen = []
    for v in p["varianten"]:
        m = SKU_RE.match(v.get("sku") or "")
        k = kv.get(m.group(1)) if m else None
        if not k:
            aus["grund"] = f"Kosten nicht gemessen (SKU {v.get('sku') or '–'})"
            return aus
        tech = k.get("tech") or {}
        if "dtg" not in tech:
            aus["grund"] = f"Technik {','.join(sorted(tech)) or '?'} (nur DTG hat eine belastbare Druckzeit)"
            return aus
        ch, li = _standard(k.get("ship_CH")), _standard(k.get("ship_LI"))
        if not ch or not li:
            aus["grund"] = f"Printful-Versand {'CH' if not ch else 'LI'} fehlt"
            return aus
        if ch[3] > MAX_VERSANDTAGE:
            aus["grund"] = f"Printful-Versand CH bis {ch[3]} T (> {MAX_VERSANDTAGE})"
            return aus
        ek = max(float(v.get("ek") or 0), tech["dtg"])
        if p.get("rueckseite"):
            ek += max([x for kk, x in (k.get("placements") or {}).items() if kk.startswith("back")] or [0.0])
        margen.append(marge(float(v["preis"]), ek, max(ch[1], li[1])))
    if not margen:
        aus["grund"] = "keine Varianten"
        return aus
    aus["marge_min"] = min(margen)
    if aus["marge_min"] < MARGE_MIN:
        aus["grund"] = f"Marge {aus['marge_min']:.2f} < {MARGE_MIN:.2f} (schlechtester Fall)"
        return aus
    aus["mitglied"], aus["grund"] = True, f"ok (Marge min {aus['marge_min']:.2f})"
    return aus


def stufe_lesen():
    try:
        s = json.load(open(STUFE_DATEI, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        s = {}
    return int(s.get("stufe", 1)), int(s.get("stufe1_anzahl", 10)), s


def soll_menge(urteile, stufe, anzahl):
    """urteile = {product_id: urteil} → Menge der IDs, die ins Profil gehören. Stufe 1: `anzahl` Mitglieder ohne Editor,
    kleinste IDs; Stufe ≥ 2: alle Mitglieder."""
    m = [pid for pid, u in urteile.items() if u["mitglied"]]
    if stufe >= 2:
        return set(m)
    return set(sorted((pid for pid in m if not urteile[pid]["editor"]), key=nr)[:anzahl])


# ---------------------------------------------------------------- Shop lesen
Q_PROD = """query($n:String,$q:String!,$g:ID!){products(first:25,after:$n,query:$q){pageInfo{hasNextPage endCursor}
 nodes{id handle title status tags descriptionHtml publishedOnPublication(publicationId:$g)
  variants(first:100){nodes{id sku price inventoryItem{unitCost{amount}} deliveryProfile{id}}}}}}"""


def produkte_laden():
    q = "(" + " OR ".join(f"tag:{t}" for t in DRUCK_TAGS) + ")"
    aus, nach = [], None
    while True:
        d = gql(Q_PROD, {"n": nach, "q": q, "g": GOOGLE})["products"]
        for p in d["nodes"]:
            h = p.get("descriptionHtml") or ""
            aus.append({"id": p["id"], "handle": p["handle"], "titel": p["title"], "tags": p["tags"],
                        "aktiv": p["status"] == "ACTIVE", "google": bool(p["publishedOnPublication"]),
                        "editor": "lspod-designer" in h, "rueckseite": editor_rueckseite(h),
                        "varianten": [{"id": v["id"], "sku": v["sku"], "preis": float(v["price"]),
                                       "ek": float(((v.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") or 0),
                                       "profil": (v.get("deliveryProfile") or {}).get("id")}
                                      for v in p["variants"]["nodes"]]})
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def profil_inhalt(pid):
    """{variant_id: product_id} — alles, was im Profil liegt (auch Fremdes)."""
    aus, nach = {}, None
    while True:
        d = gql("""query($id:ID!,$n:String){deliveryProfile(id:$id){profileItems(first:100,after:$n){pageInfo{hasNextPage endCursor}
          nodes{product{id} variants(first:100){nodes{id}}}}}}""", {"id": pid, "n": nach})
        pi = d["deliveryProfile"]["profileItems"]
        for n in pi["nodes"]:
            for v in n["variants"]["nodes"]:
                aus[v["id"]] = n["product"]["id"]
        if not pi["pageInfo"]["hasNextPage"]:
            return aus
        nach = pi["pageInfo"]["endCursor"]


def profil_aendern(pid, schluessel, ids, aktion):
    n = 0
    for i in range(0, len(ids), BLOCK):
        block = ids[i:i + BLOCK]
        r = gql("mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$p){profile{id} "
                "userErrors{field message}}}", {"id": pid, "p": {schluessel: block}})["deliveryProfileUpdate"]
        if r["userErrors"]:
            print(f"  ⚠️ {aktion} abgelehnt: {r['userErrors'][:2]}")
            continue
        for v in block:
            ledger(aktion, v)
        n += len(block)
    return n


# ---------------------------------------------------------------- Zeichen (Shop-Metafeld)
def zeichen_text(ids):
    return "," + "".join(f"{nr(i)}," for i in sorted(ids, key=nr))


def zeichen_lesen():
    d = gql('{shop{id metafield(namespace:"%s",key:"%s"){value}}}' % (MF_NS, MF_KEY))["shop"]
    wert = (d.get("metafield") or {}).get("value") or ","
    return d["id"], {f"gid://shopify/Product/{x}" for x in wert.split(",") if x.strip().isdigit()}


def zeichen_schreiben(shop_id, ids, grund):
    wert = zeichen_text(ids)
    r = gql("""mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{value} userErrors{field message}}}""",
            {"m": [{"ownerId": shop_id, "namespace": MF_NS, "key": MF_KEY, "type": MF_TYP, "value": wert}]})["metafieldsSet"]
    if r["userErrors"]:
        print(f"  ⚠️ Zeichen schreiben abgelehnt: {r['userErrors']}")
        return False
    _, ist = zeichen_lesen()                       # zurücklesen = Wahrheit
    ok = ist == set(ids)
    ledger("zeichen", grund, len(ids), wert if len(wert) < 900 else wert[:900] + "…", "ok" if ok else "ABWEICHUNG")
    return ok


# ---------------------------------------------------------------- Google-Halt (Stufe 2)
def google_meldungen(ids):
    """{product_id: [Meldung…]} mit Versand-/Preis-Wörtern (ohne [Shopping_ads]) für die gegebenen Produkte."""
    aus = {}
    ids = sorted(ids, key=nr)
    for i in range(0, len(ids), 50):
        d = gql("""query($i:[ID!]!){nodes(ids:$i){... on Product{id feedback{details{messages{message}}}}}}""", {"i": ids[i:i + 50]})
        for n in d["nodes"]:
            if not n:
                continue
            ms = [m["message"] for det in ((n.get("feedback") or {}).get("details") or []) for m in det["messages"]]
            treffer = [m for m in ms if "[Shopping_ads]" not in m and GOOGLE_HALT.search(m)]
            if treffer:
                aus[n["id"]] = treffer
    return aus


# ---------------------------------------------------------------- Korb-Matrix
def _cj_general(min_p, max_p):
    d = gql("""{products(first:60,query:"sku:CJ* AND status:active AND published_status:published"){nodes{
        variants(first:3){nodes{id price deliveryProfile{id} availableForSale}}}}}""")["products"]["nodes"]
    for n in d:
        for v in n["variants"]["nodes"]:
            if ((v["deliveryProfile"] or {}).get("id") == GENERAL and v["availableForSale"]
                    and min_p <= float(v["price"]) < max_p):
                return v["id"], float(v["price"])
    return None


def _chlager_artikel(max_p):
    """Ein kaufbarer Artikel im Profil «CH-Lager» unter max_p (Tag profil-ch-lager = liegt im Profil, ch_lager_profil.py)."""
    cid = profil_finden(CH_LAGER_NAME)
    if not cid:
        return None
    d = gql("""query($q:String!){products(first:50,query:$q){nodes{
        variants(first:5){nodes{id price availableForSale deliveryProfile{id}}}}}}""",
            {"q": f"tag:'profil-ch-lager' AND status:active AND published_status:published AND price:<{max_p}"})["products"]["nodes"]
    for n in d:
        for v in n["variants"]["nodes"]:
            if (v["availableForSale"] and float(v["price"]) < max_p
                    and (v.get("deliveryProfile") or {}).get("id") == cid):
                return v["id"], float(v["price"])
    return None


def matrix_artikel(produkte, soll):
    """Testartikel: D/D2 = zwei Soll-Produkte (erste Variante, Preis < 45), S = Sticker (Druck, kein Mitglied, < 10),
    C = CJ General < 18 und 30–45, K = CH-Lager-Profil < 20 (D 29.90 + K < 45 nach Rabatt)."""
    nach = {p["id"]: p for p in produkte}
    dd = []
    for pid in sorted(soll, key=nr):
        v = next((v for v in nach[pid]["varianten"] if v["preis"] < 45), None) if pid in nach else None
        if v:
            dd.append((v["id"], v["preis"]))
        if len(dd) == 2:
            break
    s = None
    for p in sorted(produkte, key=lambda x: nr(x["id"])):
        if p["aktiv"] and p["id"] not in soll and "sticker" in (p["handle"] + p["titel"]).lower():
            v = next((v for v in p["varianten"] if v["preis"] < 10), None)
            if v:
                s = (v["id"], v["preis"])
                break
    return {"D": dd[0] if dd else None, "D2": dd[1] if len(dd) > 1 else None, "S": s,
            "C": _cj_general(5, 18), "CG": _cj_general(30, 45), "K": _chlager_artikel(20)}


def matrix(art, pid_druck):
    """→ (zeilen, fehler_teurer, fehler_soll). Erwartet: Korb nur aus 0.00-Profilen → 0.00; sonst General-Regel
    (CH: 0 ab 45 nach Rabatt, sonst 7.00 · LI: 14.90). «Vorher» = derselbe Korb, Druck-Artikel im General profile."""
    if not art.get("D"):
        return [], 0, 0
    inhalt_druck = set(profil_inhalt(pid_druck)) if pid_druck else set()
    faelle = [("Druck allein CH", ["D"], "CH"), ("Druck + Druck CH", ["D", "D2"], "CH"),
              ("Druck + CJ klein CH", ["D", "C"], "CH"), ("Druck + CJ gross CH", ["D", "CG"], "CH"),
              ("Druck + CH-Lager CH", ["D", "K"], "CH"), ("Druck allein LI", ["D"], "LI"),
              ("Druck + CJ klein LI", ["D", "C"], "LI"), ("Sticker allein CH", ["S"], "CH"),
              ("Sticker + Druck CH", ["S", "D"], "CH")]
    zeilen, teurer, falsch = [], 0, 0
    for name, schl, land in faelle:
        if any(not art.get(k) for k in schl):
            zeilen.append({"fall": name, "fehlt": [k for k in schl if not art.get(k)]})
            continue
        vids = [art[k][0] for k in schl]
        sub, rates = korb(vids, land)
        if sub is None:
            zeilen.append({"fall": name, "fehler": str(rates)[:120]})
            falsch += 1
            continue
        billig = rates[0][0] if rates else None
        general = (0.0 if sub >= 45 else 7.0) if land == "CH" else 14.9
        null_profil = all((k in ("D", "D2") and art[k][0] in inhalt_druck) or k == "K" for k in schl)
        erwartet = 0.0 if null_profil else general
        vorher_null = all(k == "K" for k in schl)          # ohne Druck-Profil: nur CH-Lager wäre 0.00
        vorher = 0.0 if vorher_null else general
        z = {"fall": name, "land": land, "zwischensumme": sub, "versand": billig, "erwartet": erwartet,
             "vorher": vorher, "tarife": rates[:4]}
        if billig is None or billig > vorher + 0.001:
            teurer += 1
            z["urteil"] = "TEURER"
        elif abs(billig - erwartet) > 0.001:
            falsch += 1
            z["urteil"] = "≠ erwartet"
        else:
            z["urteil"] = "ok"
        zeilen.append(z)
    return zeilen, teurer, falsch


def matrix_drucken(zeilen):
    for z in zeilen:
        if "fall" in z and "versand" in z:
            print(f"  {'✓' if z['urteil'] == 'ok' else '✗'} {z['fall']:22} Zwischensumme {z['zwischensumme']:6.2f} → günstigster "
                  f"{z['versand']:.2f} (erwartet {z['erwartet']:.2f}, ohne Profil {z['vorher']:.2f}) {z['tarife']}")
        else:
            print(f"  · {z['fall']}: {z.get('fehlt') or z.get('fehler')}")


# ---------------------------------------------------------------- Rückweg
def rueckweg(pid, scharf, grund="rueckweg"):
    shop_id, ist = zeichen_lesen()
    inhalt = profil_inhalt(pid) if pid else {}
    print(f"Rückweg: Zeichen {len(ist)} Produkte · {len(inhalt)} Varianten im Profil")
    if not scharf:
        print("Probelauf — mit --scharf: erst Zeichen leeren (Seite zeigt das lange Datum), dann alle Varianten lösen")
        return 0
    if ist and not zeichen_schreiben(shop_id, set(), grund):
        print("⚠️ Zeichen nicht geleert — KEIN Lösen (sonst verspricht die Seite früher als die Kasse)")
        return 1
    n = profil_aendern(pid, "variantsToDissociate", sorted(inhalt), grund) if inhalt else 0
    print(f"FERTIG: Zeichen leer · {n} Varianten gelöst (General profile)")
    return 0


# ---------------------------------------------------------------- Lauf
def lauf(scharf):
    pid = profil_finden()
    stufe, anzahl, stufe_roh = stufe_lesen()
    stand = {"stand": jetzt().strftime("%Y-%m-%dT%H:%MZ"), "profil": pid, "stufe": stufe, "stufe_roh": stufe_roh,
             "modus": "scharf" if scharf else "trocken"}
    if not pid:
        stand["fehler"] = f"Profil «{PROFIL_NAME}» fehlt"
        json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"⚠️ DRUCK-PROFIL: Profil «{PROFIL_NAME}» fehlt — `--anlegen`")
        return 1
    bearb = bearbeitung()
    gm = zonen_methoden(gql(Q_PROFIL, {"id": GENERAL}, ver="unstable")["deliveryProfile"])
    pm = zonen_methoden(gql(Q_PROFIL, {"id": pid}, ver="unstable")["deliveryProfile"])
    tarif_bef = tarife_pruefen(pm, gm)
    preis_bef = [b for b in tarif_bef if "Preis" in b]
    transit_bef = transit_pruefen(pid, bearb, scharf=scharf)
    stand.update({"bearbeitung_tage": bearb, "tarife_ok": not tarif_bef, "tarif_befunde": tarif_bef,
                  "transit_ok": not transit_bef, "transit_befunde": transit_bef})
    if scharf and preis_bef:
        print(f"⚠️ DRUCK-PROFIL: Tarif ≠ 0.00 ({preis_bef[:2]}) — Mischkörbe zahlten mehr → RÜCKWEG")
        stand["auto_rueckweg"] = preis_bef
        rueckweg(pid, True, "auto-rueckweg-tarif")
        json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        return 1
    k = kosten_laden()
    if scharf and kosten_alter(k) > KOSTEN_MAX_ALTER and os.environ.get("PRINTFUL_API_KEY"):
        produkte0 = produkte_laden()
        k = kosten_holen([m.group(1) for p in produkte0 for v in p["varianten"] if (m := SKU_RE.match(v["sku"] or ""))])
    alter = kosten_alter(k)
    produkte = produkte_laden()
    urteile = {p["id"]: regel(p, k.get("varianten") or {}) for p in produkte}
    nach = {p["id"]: p for p in produkte}
    # Stufen-Umschaltung 1 → 2 (selbst, mit Google-Halt)
    heute = jetzt().date().isoformat()
    s1 = soll_menge(urteile, 1, anzahl)
    if stufe == 1 and stufe_roh.get("stufe2_ab") and heute >= stufe_roh["stufe2_ab"]:
        # Meldungen, die es schon VOR dem Profil gab (13.10. gemessen: «Missing shipping info … [LI]» an 28'541 Produkten,
        # General profile, GOOGLE-FEEDBACK.md), halten nicht auf — nur NEUE Versand-/Preis-Meldungen.
        basis = set(stufe_roh.get("google_basis") or [])
        halt = {k_: n for k_, ms in google_meldungen(sorted(s1)).items() if (n := [m for m in ms if m not in basis])}
        stand["google_halt"] = halt
        if halt or tarif_bef or transit_bef:
            print(f"⚠️ DRUCK-PROFIL: Stufe 2 fällig, aber Halt (Google {len(halt)} · Tarife {len(tarif_bef)} · Transit {len(transit_bef)})")
        elif scharf:
            stufe_roh.update({"stufe": 2, "stufe2_gesetzt": jetzt().strftime("%Y-%m-%dT%H:%MZ")})
            json.dump(stufe_roh, open(STUFE_DATEI, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            ledger("stufe", 2, "Google ohne Versand-/Preis-Meldung an Stufe-1-Produkten")
            stufe = stand["stufe"] = 2
    soll = soll_menge(urteile, stufe, anzahl)
    if alter > KOSTEN_SPERR_ALTER:
        inhalt0 = set(profil_inhalt(pid).values())
        soll &= inhalt0                                  # alter Cache: keine NEUEN Mitglieder (Bestehende bleiben)
        stand["kosten_gesperrt"] = f"Kosten-Cache {alter:.0f} T alt"
    inhalt = profil_inhalt(pid)
    shop_id, zeichen_ist = zeichen_lesen()

    def voll_im_profil(prod_id, inh):
        vs = [v["id"] for v in (nach.get(prod_id) or {}).get("varianten", [])]
        return bool(vs) and all(v in inh for v in vs)

    raus_prod = {prod for prod in inhalt.values() if prod not in soll}
    raus = sorted(v for v, prod in inhalt.items() if prod in raus_prod)
    rein = sorted(v["id"] for pid_ in soll for v in nach[pid_]["varianten"] if v["id"] not in inhalt)
    print(f"Stufe {stufe}: Mitglieder nach Regel {sum(u['mitglied'] for u in urteile.values())} · Soll {len(soll)} Produkte · "
          f"im Profil {len(inhalt)} Varianten · rein {len(rein)} · raus {len(raus)} · Zeichen {len(zeichen_ist)} · "
          f"Tarife {'ok' if not tarif_bef else tarif_bef} · Transit {'ok' if not transit_bef else transit_bef} · "
          f"Kosten {alter:.1f} T alt")
    stand.update({"mitglieder_regel": sum(u["mitglied"] for u in urteile.values()), "soll_produkte": len(soll),
                  "soll_handles": sorted(nach[x]["handle"] for x in soll), "kosten_alter_tage": round(alter, 1)})
    matrix_bef = None
    if scharf:
        # 1) Zeichen zuerst kürzen: nur Soll-Produkte, deren ALLE Varianten schon im Profil liegen
        z1 = {x for x in zeichen_ist if x in soll and voll_im_profil(x, inhalt)}
        if z1 != zeichen_ist and not zeichen_schreiben(shop_id, z1, "kuerzen"):
            raus = []                                   # Zeichen nicht weg → nicht lösen
        else:
            zeichen_ist = z1
        # 2) lösen
        stand["geloest"] = profil_aendern(pid, "variantsToDissociate", raus, "geloest") if raus else 0
        # 3) zuordnen nur ohne Befund
        if (tarif_bef or transit_bef) and rein:
            print("⚠️ DRUCK-PROFIL: Befund — KEIN Zuordnen")
            rein = []
        stand["zugeordnet"] = profil_aendern(pid, "variantsToAssociate", rein, "zugeordnet") if rein else 0
        inhalt = profil_inhalt(pid)
        # 4) Korb-Matrix (täglich): teurer als ohne Profil → Rückweg
        art = matrix_artikel(produkte, soll)
        zeilen, teurer, falsch = matrix(art, pid)
        stand["matrix"] = {"zeilen": zeilen, "teurer": teurer, "abweichend": falsch,
                           "artikel": {k: v for k, v in art.items()}}
        matrix_drucken(zeilen)
        if teurer:
            print(f"⚠️ DRUCK-PROFIL: {teurer} Korb/Körbe teurer als ohne Profil → RÜCKWEG")
            rueckweg(pid, True, "auto-rueckweg-matrix")
            stand["auto_rueckweg"] = f"Matrix: {teurer} teurer"
            json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            return 1
        matrix_bef = falsch
        # 5) Zeichen setzen: Soll-Produkte, die VOLLSTÄNDIG im Profil liegen
        z2 = {x for x in soll if voll_im_profil(x, inhalt)}
        if z2 != zeichen_ist:
            zeichen_schreiben(shop_id, z2, "setzen")
        _, zeichen_ist = zeichen_lesen()
    im_profil_prod = set(inhalt.values())
    ohne_zeichen = sorted(nach.get(x, {}).get("handle", x) for x in im_profil_prod - zeichen_ist)
    zeichen_ohne = sorted(nach.get(x, {}).get("handle", x) for x in zeichen_ist if not voll_im_profil(x, inhalt))
    gegen_regel = sorted(nach.get(x, {}).get("handle", x) for x in im_profil_prod - soll)
    fehlt = sorted(nach[x]["handle"] for x in soll if not voll_im_profil(x, inhalt))
    stand.update({"im_profil_varianten": len(inhalt), "im_profil_produkte": len(im_profil_prod),
                  "zeichen": len(zeichen_ist), "im_profil_ohne_zeichen": ohne_zeichen, "zeichen_ohne_profil": zeichen_ohne,
                  "gegen_regel": gegen_regel, "soll_fehlt": fehlt, "matrix_abweichend": matrix_bef})
    naechste = None
    if stufe == 1 and stufe_roh.get("stufe2_ab"):
        naechste = stufe_roh["stufe2_ab"]
    stand["naechste_stufe_ab"] = naechste
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    probleme = (len(ohne_zeichen) if scharf else 0) + len(zeichen_ohne) + (len(gegen_regel) + len(fehlt) if scharf else 0)
    print(f"DRUCK-PROFIL: Stufe {stufe} · {len(im_profil_prod)} Produkte / {len(inhalt)} Varianten im Profil · Zeichen "
          f"{len(zeichen_ist)} · ohne Zeichen {len(ohne_zeichen)} · Zeichen ohne Profil {len(zeichen_ohne)} · gegen Regel "
          f"{len(gegen_regel)} · fehlt {len(fehlt)}" + (f" · zugeordnet {stand.get('zugeordnet', 0)} · gelöst "
                                                         f"{stand.get('geloest', 0)}" if scharf else " (Probelauf)"))
    return 0 if not (tarif_bef or transit_bef or probleme or matrix_bef) else 1


def liste():
    k = kosten_laden()
    produkte = produkte_laden()
    print("id\thandle\teditor\trueckseite\tvarianten\tpreis_min\tgoogle\tmitglied\tmarge_min\tgrund")
    for p in sorted(produkte, key=lambda x: nr(x["id"])):
        u = regel(p, k.get("varianten") or {})
        print(f"{nr(p['id'])}\t{p['handle']}\t{p['editor']}\t{p['rueckseite']}\t{len(p['varianten'])}\t"
              f"{min((v['preis'] for v in p['varianten']), default=0):.2f}\t{p['google']}\t{u['mitglied']}\t"
              f"{u['marge_min'] if u['marge_min'] is not None else ''}\t{u['grund']}")
    return 0


def test_lauf():
    pid = profil_finden()
    stufe, anzahl, _ = stufe_lesen()
    k = kosten_laden()
    produkte = produkte_laden()
    urteile = {p["id"]: regel(p, k.get("varianten") or {}) for p in produkte}
    soll = soll_menge(urteile, stufe, anzahl)
    art = matrix_artikel(produkte, soll)
    print("Testartikel: " + " · ".join(f"{k_}={v[1] if v else '–'}" for k_, v in art.items()))
    zeilen, teurer, falsch = matrix(art, pid)
    matrix_drucken(zeilen)
    print(f"KORB-MATRIX: {sum(1 for z in zeilen if z.get('urteil') == 'ok')}/{len(zeilen)} ok · teurer {teurer} · abweichend {falsch}")
    aus = os.environ.get("MATRIX_AUS")
    if aus:
        json.dump({"stand": jetzt().isoformat(), "profil": pid, "artikel": art, "zeilen": zeilen},
                  open(aus, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0 if not (teurer or falsch) else 1


# ---------------------------------------------------------------- Selbsttest
def selbsttest(leise=False):
    kv = {"4012": {"tech": {"dtg": 9.95, "embroidery": 11.95}, "placements": {"front": 5.5, "back": 5.5},
                   "ship_CH": [["STANDARD", 8.67, 3, 6]], "ship_LI": [["STANDARD", 8.67, 3, 6]]},
          "9000": {"tech": {"cut-sew": 30.0}, "ship_CH": [["STANDARD", 9.5, 3, 6]], "ship_LI": [["STANDARD", 9.5, 3, 6]]},
          "7000": {"tech": {"dtg": 9.95}, "ship_CH": [["STANDARD", 8.67, 3, 6]]},
          "7100": {"tech": {"dtg": 9.95}, "ship_CH": [["STANDARD", 13.84, 10, 15]], "ship_LI": [["STANDARD", 13.84, 10, 15]]}}

    def prod(i, sku, preis, tags=("printful_personalized_product",), aktiv=True, editor=False, rueck=False, ek=0.0):
        return {"id": f"gid://shopify/Product/{i}", "tags": list(tags), "aktiv": aktiv, "editor": editor, "rueckseite": rueck,
                "varianten": [{"id": f"v{i}", "sku": sku, "preis": preis, "ek": ek}]}
    shirt = prod(5, "123_4012", 29.9)
    faelle = [
        ("Motiv-Shirt 29.90 Mitglied", lambda: regel(shirt, kv)["mitglied"], True),
        ("Marge Shirt 29.90 = 26.91 − 18.62×1.081×1.05 − 1.11", lambda: regel(shirt, kv)["marge_min"], 4.67),
        ("Editor-Shirt 24.90 vorne knapp ≥ 0", lambda: regel(prod(6, "1_4012", 24.9, editor=True, ek=9.76), kv)["mitglied"], True),
        ("Rückseite +5.50 kippt 24.90", lambda: regel(prod(7, "1_4012", 24.9, editor=True, rueck=True), kv)["mitglied"], False),
        ("Allover cut-sew raus", lambda: regel(prod(8, "1_9000", 82.9), kv)["mitglied"], False),
        ("ohne LI raus", lambda: regel(prod(9, "1_7000", 29.9), kv)["grund"].startswith("Printful-Versand LI"), True),
        ("10–15 T Versand raus", lambda: regel(prod(10, "1_7100", 49.9), kv)["mitglied"], False),
        ("SKU ohne Katalog raus", lambda: regel(prod(11, "PARTNER-SET", 49.9), kv)["mitglied"], False),
        ("Prodigi raus", lambda: regel(prod(12, "1_4012", 49.9, tags=("prodigi_personalized_product",)), kv)["mitglied"], False),
        ("Entwurf raus", lambda: regel(prod(13, "1_4012", 49.9, aktiv=False), kv)["mitglied"], False),
        ("Shopify-EK höher zählt", lambda: regel(prod(14, "1_4012", 29.9, ek=20.0), kv)["mitglied"], False),
        ("Rückseite = Vorderseite → keine",
         lambda: editor_rueckseite('<div class="lspod-designer" data-img-front="a.png" data-img-back="a.png">'), False),
        ("Rückseite eigenes Bild → ja",
         lambda: editor_rueckseite('<div class="lspod-designer" data-img-front="a.png" data-img-back="b.png">'), True),
        ("Zeichen-Text", lambda: zeichen_text({"gid://shopify/Product/12", "gid://shopify/Product/3"}), ",3,12,"),
        ("Zeichen leer", lambda: zeichen_text(set()), ","),
    ]
    u = {"gid://shopify/Product/9": {"mitglied": True, "editor": False}, "gid://shopify/Product/3": {"mitglied": True, "editor": True},
         "gid://shopify/Product/4": {"mitglied": True, "editor": False}, "gid://shopify/Product/2": {"mitglied": False, "editor": False},
         "gid://shopify/Product/20": {"mitglied": True, "editor": False}}
    faelle += [("Stufe 1: 2 ohne Editor, kleinste IDs", lambda: sorted(soll_menge(u, 1, 2), key=nr),
                ["gid://shopify/Product/4", "gid://shopify/Product/9"]),
               ("Stufe 2: alle Mitglieder", lambda: len(soll_menge(u, 2, 2)), 4)]
    fehler = 0
    for name, f, soll in faelle:
        ist = f()
        ok = ist == soll
        fehler += not ok
        if not leise or not ok:
            print(f"  {'✓' if ok else '✗'} {name}: {ist}")
    if not leise:
        print(f"SELBSTTEST {'OK' if not fehler else f'{fehler} FEHLER'} ({len(faelle)} Fälle)")
    return fehler == 0


def main():
    a = sys.argv[1:]
    if "--selbsttest" in a:
        return 0 if selbsttest() else 1
    if not selbsttest(leise=True):
        print("⚠️ DRUCK-PROFIL: Selbsttest rot — nichts geschrieben")
        return 1
    if "--anlegen" in a:
        anlegen()
        return 0
    if "--kosten" in a:
        produkte = produkte_laden()
        kosten_holen([m.group(1) for p in produkte for v in p["varianten"] if (m := SKU_RE.match(v["sku"] or ""))])
        return 0
    if "--liste" in a:
        return liste()
    if "--test" in a:
        return test_lauf()
    if "--rueckweg" in a:
        return rueckweg(profil_finden(), "--scharf" in a)
    return lauf(scharf="--scharf" in a)


if __name__ == "__main__":
    sys.exit(main())
