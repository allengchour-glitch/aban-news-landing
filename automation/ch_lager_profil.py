#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ch_lager_profil.py — Ware ab Schweizer Lager bekommt in der Kasse ihr eigenes Lieferdatum (13.10.2026).

ANLASS (Kassen-Prüfung 13.10., dropship/KASSEN-PRUEFUNG-2026-10-13.md): Kostüm ab Schweizer Lager, Produktseite
«14.–16. Okt», Kasse «28. Okt–11. Nov» — nach Halloween. Alle 2'375 Fortura-Produkte (Tag ch-lager) lagen im «General
profile» neben 51'168 CJ-Produkten; die Kasse rechnet Bearbeitung (P3D, shopweit) + Transit des Tarifs (CJ 7–17 T).
Betreiber 13.10.: «1 entscheide du».

ENTSCHEID (Workflow wf_3a8f194a-f37, Bericht dropship/CH-LAGER-PROFIL-2026-10-13.md):
  Eigenes Profil «CH-Lager» mit 0.00-Tarifen UNTER DEN NAMEN des General profile («Standard», «Kostenloser Versand» ab GRATIS_AB_CH
  (45; Entscheid D 40.50 vorbereitet), «Standard Liechtenstein»), Transit CH 1–2 T. Shopify zählt Tarife verschiedener Profile mit GLEICHEM Namen zusammen
  und prüft Preis-Bedingungen an der Korbsumme (QUELLE help.shopify.com …/combined-shipping-rates; GEMESSEN 14.08. am
  Zendrop-Profil, versandprofil_poster.py). Damit:
    gemischter Korb CH < 45: 7 + 0 = 7 (wie heute) · ab 45: 0 + 0 = 0 · LI: 14.90 + 0 (wie heute)
    reiner CH-Lager-Korb: 0.00 (höchstens CHF 7 weniger Einnahmen; Marge bleibt positiv, Median 6.36 / Min 3.36 ohne
    Versandertrag, gemessen am Fortura-EK inkl. DPD)
  Niemand zahlt mehr als heute. Das General profile bleibt unberührt → Google übernimmt nur dieses (QUELLE Google 14232591)
  und zeigt weiter 7.00 / gratis ab 45 / 10–20 T, also nie weniger als die Kasse verlangt («Inaccurate shipping costs»
  greift nur, wenn Google TIEFER liegt). Verworfen: Profil mit 7.00 (Mischkorb 14 statt 7, versandprofil_poster würde es
  täglich zurückholen) und blosser Hinweissatz (die Kasse zeigte weiter das Datum nach Halloween).

STUFEN (dropship/_ch_lager_profil_stufe.json, Google sagt nur «errors» bei Zusatzprofilen, ohne welche):
  1 = nur CH-Lager-Ware AUSSERHALB des Google-Kanals (v. a. Kostüme — die dürfen nie in Google), Google-Risiko null
  2 = dazu eine Stichprobe von N Google-Produkten, 3 Tage google_feedback_wache beobachten. Seit 13.10. (A4d) zuerst die
      Google-CH-Lager-Ware aus halloween ∪ kostueme-ch-lager (ohne Kostüme), Rest kleinste IDs; N = google_stichprobe
  3 = alle aktiven CH-Lager-Produkte
Jede Stufe zieht NEUE Importe automatisch nach (täglich im Aufseher) und löst Varianten, die nicht hingehören.

SICHERUNG: Vor jedem Zuordnen werden die Tarife des Profils geprüft (alle 0.00, Namen + Bedingungen wie im General
profile). Ein Befund → KEIN Zuordnen, Ampel-Zeile. Rückweg: --zurueck löst alle Varianten (sie fallen ins General profile).

  python3 automation/ch_lager_profil.py              # Probelauf: Soll/Ist, schreibt nur den Stand
  STUFE=2 python3 automation/ch_lager_profil.py      # Vorschau einer anderen Stufe (Liste), schreibt NICHTS
  python3 automation/ch_lager_profil.py --anlegen    # Profil anlegen, falls es fehlt
  python3 automation/ch_lager_profil.py --scharf     # zuordnen/lösen gemäss Stufe
  python3 automation/ch_lager_profil.py --test       # Korb-Matrix per draftOrderCalculate (keine Bestellung)
  python3 automation/ch_lager_profil.py --selbsttest
  python3 automation/ch_lager_profil.py --zurueck    # Rückweg: alles zurück ins General profile
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
try:
    from eimer_etikette import nachlauf
except Exception:  # pragma: no cover
    def nachlauf(d):
        return 0.0

SHOP = "au3j0y-hq.myshopify.com"
PROFIL_NAME = "CH-Lager"
GENERAL = "gid://shopify/DeliveryProfile/132124180865"
STANDORT = "gid://shopify/Location/109350125953"           # «Shop location», einziger Standort
GOOGLE = "gid://shopify/Publication/302872297857"
TAG = "ch-lager"
# 13.10.2026 (Gegenprüfung wf_0c354c64-a2a): Das Theme kann das Versandprofil nicht lesen. Ohne Merkmal zeigte die Produktseite
# für ~764 CH-Lager-Produkte AUSSERHALB des Profils (Google-Ware, Stufe 1/2) das kurze Datum (16.–19. Okt), die Kasse aber 28. Okt–11. Nov.
# Marke am Produkt = «liegt im Profil CH-Lager»; lux_delivery/lux_cart_trust rechnen nur mit ihr kurz. Gesetzt NACH dem Zuordnen,
# entfernt VOR dem Lösen (die Seite verspricht nie früher als die Kasse).
MARKE = "profil-ch-lager"
STUFE_DATEI = os.path.join(REPO, "dropship", "_ch_lager_profil_stufe.json")
STAND = os.path.join(REPO, "dropship", "_ch_lager_profil.json")
LEDGER = os.path.join(REPO, "dropship", "_ch_lager_profil.tsv")
REGEL = json.load(open(os.path.join(HIER, "data", "versand_transit_regel.json"), encoding="utf-8"))
BLOCK = 50
# IST-Schwelle «Kostenloser Versand» CH (General, CH-Lager, Druck auf Bestellung — gleich in allen Profilen). EINE Quelle für
# Wächter, Korb-Matrix und Selbsttest (ch_lager_profil, druck_profil, versand_band_wache, google_org_richtlinien,
# versandschwelle_rabatt). Betreiber-Entscheid D (13.10. abends, «D ja»): 40.50 statt 45 (= 45 × 0,9, Einzelartikel ab 45 mit
# WELCOME10 versandfrei). LIVE seit 13.10. ~23:30 UTC (der Agent-Lauf um 23:1x wurde vom Auto-Modus abgelehnt, die Sitzung hat
# ihn mit der Betreiber-Freigabe «D ja» ausgeführt; Ledger dropship/_gratis_schwelle.tsv). Reihenfolge beim Umstellen: (1) gratis_schwelle_setzen.py --scharf,
# (2) versand_transit_wache.py --scharf, (3) HIER 40.50, (4) Theme-Zahlen 4500 → 4050 (Bericht GRATISVERSAND-CH-LAGER-UND-4050).
# Nie (3) vor (1): versandschwelle_rabatt würde sonst nur das General profile umstellen.
# 22.10.2026 ~22:30 UTC (Betreiber-Antwort «Alle auf CHF 50» nach Messung: General 50, CH-Lager/Druck 40.50 = Mischkörbe ohne Gratis): alle 3 Profile auf 50.00
# (gratis_schwelle_setzen.py SOLL=50 --scharf, zurückgelesen; alte 40.50-Versandarten inaktiv, Rückweg --zurueck). Öffentliche JSON-LD bleibt auf Betreiber-Wort vorerst 40.50.
GRATIS_AB_CH = 50.00


def gql(q, v=None, ver="2026-01"):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for versuch in range(10):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/{ver}/graphql.json", data=body,
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except Exception as e:  # noqa: BLE001
            if versuch == 9:
                raise RuntimeError(f"Shopify nicht erreichbar: {e}")
            time.sleep(5 + 5 * versuch)
            continue
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
            time.sleep(10 + 5 * versuch)
            continue
        if d.get("errors"):
            raise RuntimeError(json.dumps(d["errors"])[:300])
        nachlauf(d)
        return d["data"]
    raise RuntimeError("dauerhaft gedrosselt")


def ledger(*teile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")] + [str(t) for t in teile]) + "\n")


# ---------------------------------------------------------------- Tarife
Q_PROFIL = """query($id:ID!){deliveryProfile(id:$id){id name profileLocationGroups{locationGroup{id}
 locationGroupZones(first:10){nodes{zone{id name countries{code{countryCode restOfWorld}}}
  methodDefinitions(first:10){nodes{id name active methodConditions{field operator conditionCriteria{... on MoneyV2{amount}}}
   rateGroups(first:2){nodes{rateProviders(first:3){nodes{... on DeliveryRateDefinition{price{amount currencyCode}
    minTransitTime maxTransitTime}}}}}}}}}}}}"""


def zonen_methoden(profil):
    """{Land: {Name: {"preise":[…], "bed":[(feld, op, betrag)…]}}} — nur aktive Methoden, Länder CH/LI."""
    aus = {}
    for g in profil["profileLocationGroups"]:
        for zn in g["locationGroupZones"]["nodes"]:
            laender = {c["code"]["countryCode"] for c in zn["zone"]["countries"] if c["code"]["countryCode"]}
            for land in laender & {"CH", "LI"}:
                for m in zn["methodDefinitions"]["nodes"]:
                    if not m["active"]:
                        continue
                    preise = [float(r["price"]["amount"]) for rg in m["rateGroups"]["nodes"]
                              for r in rg["rateProviders"]["nodes"] if r.get("price")]
                    bed = sorted((c["field"], c["operator"], float((c.get("conditionCriteria") or {}).get("amount") or 0))
                                 for c in m["methodConditions"])
                    aus.setdefault(land, {}).setdefault(m["name"], []).append({"preise": preise, "bed": bed})
    return aus


def tarife_pruefen(chl, gen):
    """Befunde (leer = ok). chl/gen = zonen_methoden(...) von CH-Lager / General.
    Pflicht: jede CH-Lager-Methode kostet 0.00; zu JEDEM General-Namen in CH und LI gibt es denselben Namen im CH-Lager
    (sonst addiert Shopify unter einem anderen Namen); gleichnamige Methoden haben dieselben Bedingungen; keine fremden Namen."""
    bef = []
    for land in ("CH", "LI"):
        g, c = gen.get(land) or {}, chl.get(land) or {}
        if not c:
            bef.append(f"{land}: keine Methode im Profil (Ware wäre nach {land} nicht bestellbar)")
            continue
        for name, eintraege in c.items():
            for e in eintraege:
                if any(p != 0 for p in e["preise"]) or not e["preise"]:
                    bef.append(f"{land}/{name}: Preis {e['preise']} statt 0.00")
            if name not in g:
                bef.append(f"{land}/{name}: Name fehlt im General profile")
        for name, eintraege in g.items():
            if name not in c:
                bef.append(f"{land}/{name}: fehlt im Profil (gleiche Namen addieren sich, fremde nicht sicher)")
                continue
            if sorted(tuple(map(tuple, e["bed"])) for e in eintraege) != sorted(tuple(map(tuple, e["bed"])) for e in c[name]):
                bef.append(f"{land}/{name}: Bedingungen {[e['bed'] for e in c[name]]} ≠ General {[e['bed'] for e in eintraege]}")
    return bef


def schwelle_pruefen(gen, chl=None):
    """Befunde (leer = ok): «Kostenloser Versand» CH im General profile (und im Zusatzprofil) = GRATIS_AB_CH.
    Absolut, nicht nur gleich zwischen den Profilen — sonst bliebe ein gemeinsames Abweichen (z. B. nur General umgestellt
    von versandschwelle_rabatt.py, oder alle zurück) unbemerkt. Blockiert das Zuordnen NICHT, meldet nur."""
    bef = []
    for wer, m in (("General", gen), ("Profil", chl)):
        if m is None:
            continue
        ab = [b[2] for e in (m.get("CH") or {}).get("Kostenloser Versand", []) for b in e["bed"]
              if b[0] == "TOTAL_PRICE" and b[1] == "GREATER_THAN_OR_EQUAL_TO"]
        if not ab:
            bef.append(f"{wer}: keine Bedingung «Kostenloser Versand» CH")
        elif any(abs(x - GRATIS_AB_CH) > 0.005 for x in ab):
            bef.append(f"{wer}: Gratis ab {ab} ≠ GRATIS_AB_CH {GRATIS_AB_CH:.2f}")
    return bef


def profil_finden():
    # blättern: 55 Profile am 13.10. (Gelato/Printful je Format eines) — versand_transit_wache sah mit first:50 das neue nie
    nach = None
    while True:
        d = gql("query($n:String){deliveryProfiles(first:50,after:$n){pageInfo{hasNextPage endCursor} nodes{id name}}}",
                {"n": nach})["deliveryProfiles"]
        treffer = [p["id"] for p in d["nodes"] if p["name"] == PROFIL_NAME]
        if treffer:
            return treffer[0]
        if not d["pageInfo"]["hasNextPage"]:
            return None
        nach = d["pageInfo"]["endCursor"]


def anlegen():
    if profil_finden():
        print(f"Profil «{PROFIL_NAME}» existiert schon")
        return profil_finden()
    gen = gql(Q_PROFIL, {"id": GENERAL}, ver="unstable")["deliveryProfile"]
    gm = zonen_methoden(gen)
    zonen = []
    for land, zname in (("CH", "Schweiz (CH-Lager)"), ("LI", "Liechtenstein (CH-Lager)")):
        methoden = []
        for name, eintraege in gm.get(land, {}).items():
            for e in eintraege:
                # GEMESSEN 13.10.: rateGroupsToCreate beim Anlegen → «Rate provider can't be blank … cannot use both rate
                # groups and legacy rate provider». Also Preis über rateDefinition; die Transitzeit setzt danach
                # versand_transit_wache.py --scharf (profile_zonen «CH-Lager»), dieselbe Stelle, die sie täglich hält.
                m = {"name": name, "active": True, "rateDefinition": {"price": {"amount": "0.00", "currencyCode": "CHF"}}}
                pc = [{"criteria": {"amount": str(betrag), "currencyCode": "CHF"}, "operator": op}
                      for feld, op, betrag in e["bed"] if feld == "TOTAL_PRICE"]
                if len(pc) != len(e["bed"]):
                    raise SystemExit(f"ABBRUCH: {land}/{name} hat Bedingungen ausser TOTAL_PRICE {e['bed']} — von Hand prüfen")
                if pc:
                    m["priceConditionsToCreate"] = pc
                methoden.append(m)
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
    chl = zonen_methoden(gql(Q_PROFIL, {"id": pid}, ver="unstable")["deliveryProfile"])
    bef = tarife_pruefen(chl, gm)
    print(f"angelegt: {pid} · Tarif-Prüfung: {'ok' if not bef else bef} · Transitzeit setzt: "
          f"python3 automation/versand_transit_wache.py --scharf")
    return pid


# ---------------------------------------------------------------- Soll / Ist
def stufe_lesen():
    try:
        s = json.load(open(STUFE_DATEI, encoding="utf-8"))
    except Exception:
        s = {}
    return int(s.get("stufe", 1)), int(s.get("google_stichprobe", 25)), s


def _ist_kostuem(p):
    """Kostüm nach der EINEN Titelregel (google_sperrliste.ist_kostuem). Ohne Regel → True (lieber nicht in die Stichprobe)."""
    try:
        from google_sperrliste import ist_kostuem
    except Exception:  # pragma: no cover
        return True
    return ist_kostuem(p.get("titel") or "", p.get("typ") or "")


def soll_menge(produkte, stufe, stichprobe, vorrang=None):
    """produkte: [{id, tags, aktiv, google, titel?, typ?}] → Menge der Produkt-IDs, die ins Profil gehören.

    Stufe 2 (13.10., Richter-Punkt A4d): die Google-Stichprobe nimmt ZUERST die Google-CH-Lager-Ware aus `vorrang`
    (halloween ∪ kostueme-ch-lager, siehe halloween_vorrang) — sie zeigt heute in der Kasse 28.10.–11.11. und ist für
    Halloween ohnehin verloren, als Stichprobe kommt sie vor Halloween an. Den Rest füllen die kleinsten IDs auf. Kostüme
    (ist_kostuem) kommen nie in die Stichprobe: sie gehören nicht in den Google-Kanal und fallen nach dem Durchsetzer
    ohnehin in Stufe 1."""
    ch = [p for p in produkte if p["aktiv"] and TAG in {t.lower() for t in p["tags"]}]
    if stufe >= 3:
        return {p["id"] for p in ch}
    soll = {p["id"] for p in ch if not p["google"]}
    if stufe == 2:
        nr = lambda x: int(x.rsplit("/", 1)[1])  # noqa: E731
        vorrang = vorrang or set()
        g = [p for p in ch if p["google"] and not _ist_kostuem(p)]
        zuerst = sorted((p["id"] for p in g if p["id"] in vorrang), key=nr)
        rest = sorted((p["id"] for p in g if p["id"] not in vorrang), key=nr)
        soll |= set((zuerst + rest)[:stichprobe])
    return soll


VORRANG_KOLLEKTIONEN = ("halloween", "kostueme-ch-lager")


def halloween_vorrang():
    """Produkt-IDs der Google-CH-Lager-Ware aus halloween ∪ kostueme-ch-lager (aktiv, im Google-Kanal, Tag ch-lager, kein
    Kostüm) — Vorrang für die Stufe-2-Stichprobe. Mitgliedschaft live per collectionByHandle (Smart-Kollektionen)."""
    aus = {}
    for h in VORRANG_KOLLEKTIONEN:
        nach = None
        while True:
            c = gql("""query($h:String!,$n:String,$g:ID!){collectionByHandle(handle:$h){products(first:100,after:$n){
              pageInfo{hasNextPage endCursor} nodes{id handle title productType status tags
              publishedOnPublication(publicationId:$g)}}}}""", {"h": h, "n": nach, "g": GOOGLE})["collectionByHandle"]
            if not c:
                raise RuntimeError(f"Kollektion «{h}» fehlt — Halloween-Vorrang nicht bestimmbar")
            for p in c["products"]["nodes"]:
                if (p["status"] == "ACTIVE" and p["publishedOnPublication"] and TAG in {t.lower() for t in p["tags"]}
                        and not _ist_kostuem({"titel": p["title"], "typ": p.get("productType")})):
                    aus[p["id"]] = p["handle"]
            if not c["products"]["pageInfo"]["hasNextPage"]:
                break
            nach = c["products"]["pageInfo"]["endCursor"]
    return aus


def produkte_laden():
    """Alle Produkte mit Tag ch-lager (Vorfilter, exakter Tag wird in soll_menge geprüft), mit Varianten + Profil."""
    aus, nach = [], None
    while True:
        d = gql("""query($n:String,$g:ID!){products(first:50,after:$n,query:"tag:ch-lager"){pageInfo{hasNextPage endCursor}
          nodes{id handle title productType status tags publishedOnPublication(publicationId:$g)
            variants(first:100){nodes{id deliveryProfile{id}}}}}}""", {"n": nach, "g": GOOGLE})["products"]
        for p in d["nodes"]:
            aus.append({"id": p["id"], "handle": p["handle"], "titel": p["title"], "typ": p.get("productType") or "",
                        "tags": p["tags"], "aktiv": p["status"] == "ACTIVE",
                        "google": bool(p["publishedOnPublication"]),
                        "varianten": [(v["id"], (v.get("deliveryProfile") or {}).get("id")) for v in p["variants"]["nodes"]]})
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def profil_inhalt(pid):
    """{variant_id: (product_id, tags, titel)} — alles, was im Profil liegt (auch Fremdes)."""
    aus, nach = {}, None
    while True:
        d = gql("""query($id:ID!,$n:String){deliveryProfile(id:$id){profileItems(first:100,after:$n){pageInfo{hasNextPage endCursor}
          nodes{product{id title tags status} variants(first:100){nodes{id}}}}}}""", {"id": pid, "n": nach})
        pi = d["deliveryProfile"]["profileItems"]
        for n in pi["nodes"]:
            for v in n["variants"]["nodes"]:
                aus[v["id"]] = (n["product"]["id"], n["product"]["tags"], n["product"]["title"])
        if not pi["pageInfo"]["hasNextPage"]:
            return aus
        nach = pi["pageInfo"]["endCursor"]


def profil_aendern(pid, schluessel, ids, aktion, titel):
    n = 0
    for i in range(0, len(ids), BLOCK):
        block = ids[i:i + BLOCK]
        r = gql("mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$p){profile{id} "
                "userErrors{field message}}}", {"id": pid, "p": {schluessel: block}})["deliveryProfileUpdate"]
        if r["userErrors"]:
            print(f"  ⚠️ {aktion} abgelehnt: {r['userErrors'][:2]}")
            continue
        for v in block:
            ledger(aktion, v, *titel.get(v, ("", "")))
        n += len(block)
    return n


def marke_traeger():
    aus, nach = set(), None
    while True:
        d = gql("""query($n:String){products(first:250,after:$n,query:"tag:'profil-ch-lager'"){pageInfo{hasNextPage endCursor}
          nodes{id tags}}}""", {"n": nach})["products"]
        aus |= {n["id"] for n in d["nodes"] if MARKE in n["tags"]}
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def marke_abgleichen(soll_ids, scharf):
    """soll_ids = Produkte mit mindestens einer Variante im Profil. → (gesetzt, entfernt, rest_falsch)."""
    ist = marke_traeger()
    add, weg = sorted(soll_ids - ist), sorted(ist - soll_ids)
    if not scharf:
        return len(add), len(weg), len(add) + len(weg)
    n_add = n_weg = 0
    # 13.10.: je 20 Produkte in EINER Anfrage (Aliase) — einzeln brauchten 1'611 Zeichen ~55 Min.
    def buendel(ids, mut, art):
        n = 0
        for i in range(0, len(ids), 20):
            teil = ids[i:i + 20]
            q = "mutation{" + " ".join(f'a{j}:{mut}(id:"{p}",tags:["{MARKE}"]){{userErrors{{message}}}}'
                                       for j, p in enumerate(teil)) + "}"
            d = gql(q)
            for j, p in enumerate(teil):
                if not (d.get(f"a{j}") or {}).get("userErrors", ["?"]):
                    n += 1; ledger(art, p)
        return n
    n_weg = buendel(weg, "tagsRemove", "marke-weg")   # zuerst entfernen: lieber kurz das lange Datum als ein zu frühes
    n_add = buendel(add, "tagsAdd", "marke-neu")
    return n_add, n_weg, (len(add) - n_add) + (len(weg) - n_weg)


def lauf(scharf, zurueck=False):
    pid = profil_finden()
    stufe, stichprobe, stufe_roh = stufe_lesen()
    # 13.10. (A4d): STUFE=2 zeigt die künftige Liste im PROBELAUF, ohne zu schreiben (kein Stand, kein Ledger, kein Zuordnen).
    vorschau = os.environ.get("STUFE")
    if vorschau:
        if scharf or zurueck:
            print("⚠️ STUFE=… gilt nur im Probelauf — Stufe ändert man in dropship/_ch_lager_profil_stufe.json")
            return 1
        stufe = int(vorschau)
    stand = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "profil": pid, "stufe": stufe,
             "stufe_seit": stufe_roh.get("seit"), "google_stichprobe": stichprobe}
    if not pid:
        stand.update({"fehler": f"Profil «{PROFIL_NAME}» fehlt"})
        if not vorschau:
            json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"⚠️ CH-LAGER-PROFIL: Profil «{PROFIL_NAME}» fehlt — `--anlegen`")
        return 1
    gm = zonen_methoden(gql(Q_PROFIL, {"id": GENERAL}, ver="unstable")["deliveryProfile"])
    cm = zonen_methoden(gql(Q_PROFIL, {"id": pid}, ver="unstable")["deliveryProfile"])
    bef = tarife_pruefen(cm, gm)
    stand["tarife_ok"], stand["befunde"] = not bef, bef
    stand["schwelle_befunde"] = schwelle_pruefen(gm, cm)
    if stand["schwelle_befunde"]:
        print(f"⚠️ CH-LAGER-PROFIL: Gratis-Schwelle {stand['schwelle_befunde']} → automation/gratis_schwelle_setzen.py")
    inhalt = profil_inhalt(pid)
    if zurueck:
        ids = sorted(inhalt)
        print(f"Rückweg: {len(ids)} Varianten aus «{PROFIL_NAME}» lösen")
        if scharf:
            a, w, r = marke_abgleichen(set(), True)
            print(f"  Marke «{MARKE}» entfernt: {w} (Rest {r})")
        n = profil_aendern(pid, "variantsToDissociate", ids, "zurueck", {k: (v[0], v[2]) for k, v in inhalt.items()}) if scharf else 0
        print(f"FERTIG: {n} gelöst")
        return 0
    produkte = produkte_laden()
    vorrang = halloween_vorrang() if stufe == 2 else {}
    soll = soll_menge(produkte, stufe, stichprobe, set(vorrang))
    nach_id = {p["id"]: p for p in produkte}
    if stufe == 2:
        probe = sorted((p for p in produkte if p["google"] and p["id"] in soll),
                       key=lambda p: (p["id"] not in vorrang, int(p["id"].rsplit("/", 1)[1])))
        stand["halloween_vorrang"] = len(vorrang)
        stand["stichprobe_handles"] = [p["handle"] for p in probe]
        print(f"Stufe-2-Stichprobe: {len(probe)} Google-Produkte (Halloween-Vorrang {sum(1 for p in probe if p['id'] in vorrang)}"
              f" von {len(vorrang)}, Grösse {stichprobe}):")
        for p in probe:
            print(f"  {'H' if p['id'] in vorrang else '·'} {p['handle'][:60]:60} | {p['titel'][:50]}")
    rein, titel = [], {}
    for p in produkte:
        if p["id"] in soll:
            for vid, prof in p["varianten"]:
                titel[vid] = (p["id"], p["titel"])
                if prof != pid:
                    rein.append(vid)
    raus = []
    for vid, (prod, tags, t) in inhalt.items():
        p = nach_id.get(prod)
        exakt = TAG in {x.lower() for x in tags}
        # Entwürfe mit Tag bleiben (kein Hin und Her); raus nur ohne Tag oder Google-Ware ausserhalb der Stufe
        if not exakt or (p and p["aktiv"] and prod not in soll):
            raus.append(vid)
            titel[vid] = (prod, t)
    google_im = sum(1 for p in produkte if p["google"] and p["id"] in soll)
    stand.update({"soll_produkte": len(soll), "im_profil_varianten": len(inhalt), "fehlt_varianten": len(rein),
                  "falsch_varianten": len(raus), "google_produkte_im_soll": google_im,
                  "ch_lager_aktiv": sum(1 for p in produkte if p["aktiv"] and TAG in {t.lower() for t in p["tags"]})})
    print(f"Stufe {stufe}: Soll {len(soll)} Produkte (davon Google {google_im}) · im Profil {len(inhalt)} Varianten · "
          f"fehlt {len(rein)} · falsch {len(raus)} · Tarife {'ok' if not bef else bef}")
    if scharf and bef and rein:
        print(f"⚠️ CH-LAGER-PROFIL: Tarif-Befund — KEIN Zuordnen ({bef[:2]})")
        rein = []
    if scharf:
        stand["zugeordnet"] = profil_aendern(pid, "variantsToAssociate", rein, "zugeordnet", titel) if rein else 0
        stand["geloest"] = profil_aendern(pid, "variantsToDissociate", raus, "geloest", titel) if raus else 0
        if rein or raus:
            stand["im_profil_varianten"] = len(profil_inhalt(pid))
            stand["fehlt_varianten"] = max(0, len(rein) - stand["zugeordnet"])
            stand["falsch_varianten"] = max(0, len(raus) - stand["geloest"])
    if vorschau:
        print(f"VORSCHAU Stufe {stufe}: nichts geschrieben (Stand-Datei unverändert)")
        return 0
    im_profil = {v[0] for v in profil_inhalt(pid).values()} if scharf else {v[0] for v in inhalt.values()}
    a, w, r = marke_abgleichen(im_profil, scharf)
    stand["marke"] = {"gesetzt": a, "entfernt": w, "offen": r}
    print(f"Marke «{MARKE}»: {'gesetzt' if scharf else 'fehlt'} {a} · {'entfernt' if scharf else 'zu viel'} {w}"
          + (f" · offen {r}" if scharf else ""))
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"CH-LAGER-PROFIL: Stufe {stufe} · {stand['im_profil_varianten']} Varianten im Profil · fehlt {stand['fehlt_varianten']} · "
          f"falsch {stand['falsch_varianten']}" + (f" · zugeordnet {stand.get('zugeordnet', 0)} · gelöst {stand.get('geloest', 0)}"
                                                    if scharf else " (Probelauf)"))
    return 0 if not bef else 1


# ---------------------------------------------------------------- Korb-Matrix
def korb(lines, land):
    adr = {"CH": {"address1": "Bahnhofstrasse 1", "city": "Zürich", "zip": "8001", "countryCode": "CH"},
           "LI": {"address1": "Städtle 1", "city": "Vaduz", "zip": "9490", "countryCode": "LI"}}[land]
    d = gql("""mutation($i:DraftOrderInput!){draftOrderCalculate(input:$i){calculatedDraftOrder{
        subtotalPriceSet{shopMoney{amount}} availableShippingRates{title price{amount}}} userErrors{message}}}""",
            {"i": {"lineItems": [{"variantId": v, "quantity": 1} for v in lines], "shippingAddress": adr,
                   "acceptAutomaticDiscounts": True}})["draftOrderCalculate"]
    if d["userErrors"]:
        return None, d["userErrors"]
    c = d["calculatedDraftOrder"]
    return float(c["subtotalPriceSet"]["shopMoney"]["amount"]), sorted(
        (float(r["price"]["amount"]), r["title"]) for r in c["availableShippingRates"])


def test():
    pid = profil_finden()
    inhalt = profil_inhalt(pid) if pid else {}
    if not inhalt:
        print("⚠️ Profil leer — erst einen Artikel zuordnen")
        return 1

    def preis(vid):
        return float(gql("query($id:ID!){productVariant(id:$id){price}}", {"id": vid})["productVariant"]["price"])
    k_klein = k_gross = None
    for vid in list(inhalt)[:60]:
        p = preis(vid)
        if p < 28 and not k_klein:
            k_klein = (vid, p)
        if p >= 50 and not k_gross:
            k_gross = (vid, p)
        if k_klein and k_gross:
            break
    cj = gql("""{products(first:40,query:"sku:CJ* AND status:active AND published_status:published"){nodes{
        variants(first:1){nodes{id price deliveryProfile{id} availableForSale}}}}}""")["products"]["nodes"]
    cj = [(n["variants"]["nodes"][0]["id"], float(n["variants"]["nodes"][0]["price"])) for n in cj
          if n["variants"]["nodes"] and (n["variants"]["nodes"][0]["deliveryProfile"] or {}).get("id") == GENERAL
          and n["variants"]["nodes"][0]["availableForSale"]]
    c_klein = next((x for x in cj if x[1] < 18), None)
    c_gross = next((x for x in cj if 30 <= x[1] < 45), None)
    if not (k_klein and c_klein and c_gross):
        print(f"⚠️ Testartikel fehlen: K<28 {k_klein} C<18 {c_klein} C30–45 {c_gross}")
        return 1
    print(f"Testartikel: K {k_klein[1]} · K≥50 {k_gross and k_gross[1]} · C {c_klein[1]} · C {c_gross[1]}")
    faelle = [("K allein (<45)", [k_klein[0]], "CH", 0.0), ("C allein (<45)", [c_klein[0]], "CH", 7.0),
              ("K + C klein (<45)", [k_klein[0], c_klein[0]], "CH", None),
              ("K + C gross", [k_klein[0], c_gross[0]], "CH", None),
              ("K allein LI", [k_klein[0]], "LI", 0.0), ("C allein LI", [c_klein[0]], "LI", 14.9),
              ("K + C LI", [k_klein[0], c_klein[0]], "LI", 14.9)]
    if k_gross:
        faelle.insert(1, ("K allein (≥50)", [k_gross[0]], "CH", 0.0))
    fehler = 0
    for name, lines, land, soll in faelle:
        sub, rates = korb(lines, land)
        if sub is None:
            print(f"  ✗ {name}: {rates}"); fehler += 1; continue
        if soll is None:                     # Mischkorb CH: wie ein reiner General-Korb gleicher Summe
            soll = 0.0 if sub >= GRATIS_AB_CH else 7.0
        billig = rates[0][0] if rates else None
        ok = billig == soll
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: Zwischensumme {sub:.2f} → {rates} (soll günstigste {soll:.2f})")
    print(f"KORB-MATRIX: {len(faelle) - fehler}/{len(faelle)} wie heute oder günstiger")
    return 0 if not fehler else 1


# ---------------------------------------------------------------- Selbsttest
def selbsttest(leise=False):
    gen = {"CH": {"Standard": [{"preise": [7.0], "bed": []}],
                  "Kostenloser Versand": [{"preise": [0.0], "bed": [("TOTAL_PRICE", "GREATER_THAN_OR_EQUAL_TO", GRATIS_AB_CH)]}]},
           "LI": {"Standard Liechtenstein": [{"preise": [14.9], "bed": []}]}}
    gut = {"CH": {"Standard": [{"preise": [0.0], "bed": []}],
                  "Kostenloser Versand": [{"preise": [0.0], "bed": [("TOTAL_PRICE", "GREATER_THAN_OR_EQUAL_TO", GRATIS_AB_CH)]}]},
           "LI": {"Standard Liechtenstein": [{"preise": [0.0], "bed": []}]}}
    teuer = json.loads(json.dumps(gut)); teuer["CH"]["Standard"][0]["preise"] = [7.0]
    fremd = json.loads(json.dumps(gut)); fremd["CH"]["Blitz"] = fremd["CH"].pop("Standard")
    bedingung = json.loads(json.dumps(gut)); bedingung["CH"]["Kostenloser Versand"][0]["bed"] = []
    ohne_li = {"CH": gut["CH"]}
    p = [{"id": "gid://shopify/Product/5", "tags": ["fortura", "ch-lager"], "aktiv": True, "google": False},
         {"id": "gid://shopify/Product/3", "tags": ["CH-Lager"], "aktiv": True, "google": True},
         {"id": "gid://shopify/Product/9", "tags": ["ch-lager"], "aktiv": True, "google": True},
         {"id": "gid://shopify/Product/7", "tags": ["ch-lager-alt"], "aktiv": True, "google": False},
         {"id": "gid://shopify/Product/8", "tags": ["ch-lager"], "aktiv": False, "google": False}]
    ph = p + [{"id": "gid://shopify/Product/11", "tags": ["ch-lager"], "aktiv": True, "google": True,
               "titel": "Hasenskelett 16 cm", "typ": "Partydeko & Ballone"},
              {"id": "gid://shopify/Product/13", "tags": ["ch-lager"], "aktiv": True, "google": True,
               "titel": "Hemd Waggis rot", "typ": "Kostüme & Verkleidung"}]
    faelle = [
        ("Tarife gut", lambda: tarife_pruefen(gut, gen), []),
        ("Schwelle = Soll", lambda: schwelle_pruefen(gen, gut), []),
        ("Schwelle ≠ Soll", lambda: len(schwelle_pruefen(json.loads(json.dumps(gen).replace(str(GRATIS_AB_CH), "39.0")))), 1),
        ("Tarif 7.00", lambda: len(tarife_pruefen(teuer, gen)), 1),
        ("fremder Name", lambda: len(tarife_pruefen(fremd, gen)) >= 2, True),
        ("Bedingung fehlt", lambda: len(tarife_pruefen(bedingung, gen)), 1),
        ("LI fehlt", lambda: len(tarife_pruefen(ohne_li, gen)), 1),
        ("Stufe 1", lambda: sorted(soll_menge(p, 1, 1)), ["gid://shopify/Product/5"]),
        ("Stufe 2 (kleinste ID)", lambda: sorted(soll_menge(p, 2, 1)), ["gid://shopify/Product/3", "gid://shopify/Product/5"]),
        # 13.10. A4d: Halloween-Vorrang vor kleinster ID; Kostüm (Titelregel) nie in der Stichprobe, auch nicht mit Vorrang
        ("Stufe 2 Halloween-Vorrang", lambda: sorted(soll_menge(ph, 2, 1, {"gid://shopify/Product/11"})),
         ["gid://shopify/Product/11", "gid://shopify/Product/5"]),
        ("Stufe 2 Vorrang + Auffüllen", lambda: sorted(soll_menge(ph, 2, 3, {"gid://shopify/Product/11", "gid://shopify/Product/13"})),
         ["gid://shopify/Product/11", "gid://shopify/Product/3", "gid://shopify/Product/5", "gid://shopify/Product/9"]),
        ("Stufe 2 Kostüm raus", lambda: "gid://shopify/Product/13" in soll_menge(ph, 2, 9, {"gid://shopify/Product/13"}), False),
        ("Stufe 1 ohne Vorrang-Wirkung", lambda: sorted(soll_menge(ph, 1, 3, {"gid://shopify/Product/11"})), ["gid://shopify/Product/5"]),
        ("Stufe 3", lambda: len(soll_menge(p, 3, 0)), 3),
    ]
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
        print("⚠️ CH-LAGER-PROFIL: Selbsttest rot — nichts geschrieben")
        return 1
    if "--anlegen" in a:
        anlegen()
        return 0
    if "--test" in a:
        return test()
    return lauf(scharf="--scharf" in a, zurueck="--zurueck" in a)


if __name__ == "__main__":
    sys.exit(main())
