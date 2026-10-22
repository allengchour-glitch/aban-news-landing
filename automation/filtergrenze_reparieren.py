#!/usr/bin/env python3
"""filtergrenze_reparieren.py — drei Hauptmenü-Kollektionen unter Shopifys Filtergrenze von 5'000 aktiven Produkten bringen (22.10.2026).

ANLASS (Sauber-Inventur, Spähtrupp «theme» T2; Betreiber-Screenshot «so viele Produkte — Filter?»): Shopify blendet ALLE Filter einer Kollektion aus, sobald sie
mehr als 5'000 Produkte hat (QUELLE help.shopify.com Search & Discovery; Kopf von filtergrenze_wache.py). GEMESSEN 22.10. (Admin-API productsCount, aktiv):
fur-ihn «Herren-Mode» 5'323 · schmuck-uhren 5'656 · wohnen-dekoration 5'307; die Seiten lieferten 0× `name=filter.*` im HTML. Am 04.10. war es schon einmal behoben
(4'293–4'772) — der Grind schob sie wieder darüber, und die Wache schrieb nur in ein /tmp-Log, das niemand las.

WEG (wie 04.10.): je Kollektion die Regel einer Unterkategorie streichen, die einen EIGENEN Menüpunkt hat — die Ware bleibt über das Kind erreichbar:
  fur-ihn            − TYPE Herrenschuhe            (Kind «Schuhe» = herren-schuhe, 1'918)           → ~3'400
  schmuck-uhren      − TYPE Uhren                   (Kind «Uhren» = uhren, 2'107 + 5 Unterpunkte)    → ~2'600
  wohnen-dekoration  ODER(wohnen, dekoration) → UND(wohnen, NICHT Aufbewahrung)  (Kind «Aufbewahrung» = aufbewahrung-sub, 2'472) → ~2'800
Reserve: nach dem Schnitt höchstens GRENZE − RESERVE_MIN = 4'000 Produkte (Wache meldet ab WARN 4'800 — die 800 dazwischen sind der Puffer für Neuimporte),
untere Schranke MIN_NACH = 500 (ein Schnitt darf eine Kollektion nie leerräumen).
Sicherung der alten Regeln: dropship/_filtergrenze_regeln_alt.json (Schlüssel «<handle>@<datum>»); Rückweg: --zurueck.

NACHSORGE (Prüfung 22.10.2026 — die erste Fassung schnitt, ohne zu fragen, ob die Ware danach noch irgendwo im Menü erreichbar ist): GEMESSEN fielen
221 Produkte vom Typ «Uhren» (192 mit Tag kategorie-uhr, 13 in KEINER Menü-Kollektion) aus dem Teilbaum «Schmuck & Uhren» (das Kind «Uhren» zählt nur Tag `uhren`)
und 9 Produkte vom Typ «Herrenschuhe» ohne die Tags schuhe+herren aus dem Teilbaum «Herren». Jetzt gilt: (1) `verwaist()` zählt live, wie viele aktive
Produkte der entfernten Regel in KEINER Kollektion des Menü-Teilbaums (ohne die Eltern-Kollektion selbst) mehr stehen; > 0 → der Schnitt wird NICHT geschrieben
(fail-closed, auch wenn das Menü nicht lesbar ist); (2) `KIND_ERWEITERN` ergänzt dem Kind die Typ-Regel als ODER (idempotent, vor dem Schnitt); (3) `TAGS_AUS_TYP`
trägt fehlende Schlagwörter nach (nicht für Werbetest-gesperrte Produkte); die Wache meldet verbleibende Waisen täglich.

  python3 automation/filtergrenze_reparieren.py                 # trocken: Plan + Schätzung aus dem Export
  SCHARF=1 python3 automation/filtergrenze_reparieren.py        # schreibt, liest zurück, wartet auf die Neuberechnung
  python3 automation/filtergrenze_reparieren.py --zurueck       # stellt die jüngste Sicherung je Kollektion wieder her
  python3 automation/filtergrenze_reparieren.py --selbsttest
"""
import copy
import datetime as dt
import json
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SICHERUNG = os.path.join(REPO, "dropship", "_filtergrenze_regeln_alt.json")
SCHARF = os.environ.get("SCHARF") == "1"
GRENZE = 5000
RESERVE_MIN = 1000   # nach dem Schnitt mindestens so weit unter der Grenze

# Plan: Handle → ("entfernen", (column, condition)) | ("und", [Regeln]) ; erwartet = Schätzung (nur Anzeige)
PLAN = {
    "fur-ihn": ("entfernen", ("TYPE", "Herrenschuhe")),
    "schmuck-uhren": ("entfernen", ("TYPE", "Uhren")),
    "wohnen-dekoration": ("und", [("TAG", "EQUALS", "wohnen"), ("TAG", "NOT_EQUALS", "Aufbewahrung")]),
}
MIN_NACH = 500
# Kind-Kollektion → Regel, die als ODER ergänzt wird, damit der geschnittene Typ im Teilbaum erreichbar bleibt (Eltern-Handle nur zur Doku)
KIND_ERWEITERN = {"uhren": ("TYPE", "EQUALS", "Uhren")}
# Produkttyp → Schlagwörter, die ein Produkt dieses Typs tragen muss, um in der Kind-Kollektion zu stehen (herren-schuhe = Tag schuhe UND herren)
TAGS_AUS_TYP = {"Herrenschuhe": ["herren", "herrenschuhe", "schuhe"]}
# Fremdartiges im Typ «Uhren» (gemessen 22.10.): richtigen Typ setzen, nur wenn der Typ jetzt noch «Uhren» ist
TYP_KORREKTUR = {"bluetooth-mp3-player-mit-touchscreen-623500": "Elektronik", "smart-led-schranklicht-mit-uhr-und-sensor-254144": "Beleuchtung"}


def entferne_regel(regelsatz, column, condition):
    """Rein: neue Kopie des Regelsatzes ohne die Regel (column, condition). Nur bei ODER-Satz (appliedDisjunctively) sinnvoll; sonst unverändert + Fehler.
    → (neuer_satz, anzahl_entfernt). Entfernt nie die letzte Regel."""
    neu = copy.deepcopy(regelsatz)
    if not neu.get("appliedDisjunctively"):
        return neu, 0
    vorher = len(neu["rules"])
    rest = [r for r in neu["rules"] if not (r["column"] == column and r["condition"].lower() == condition.lower())]
    if not rest:
        return neu, 0
    neu["rules"] = rest
    return neu, vorher - len(rest)


def und_satz(regeln):
    """Rein: UND-Regelsatz aus (column, relation, condition)-Tripeln."""
    return {"appliedDisjunctively": False, "rules": [{"column": c, "relation": r, "condition": k} for c, r, k in regeln]}


def zaehle_export(satz, pfad="/tmp/export.jsonl"):
    """Schätzung: aktive Produkte aus dem Export (Tags/Typ), die der Regelsatz träfe. Unlesbar → None."""
    try:
        zeilen = open(pfad, encoding="utf-8")
    except OSError:
        return None
    n = 0
    for z in zeilen:
        try:
            p = json.loads(z)
        except Exception:
            continue
        if p.get("status") != "ACTIVE":
            continue
        tags = {t.lower() for t in p.get("tags") or []}
        typ = (p.get("productType") or "").lower()

        def trifft(r):
            c = r["condition"].lower()
            ist = (c in tags) if r["column"] == "TAG" else (typ == c) if r["column"] == "TYPE" else None
            if ist is None:
                return None
            return ist if r["relation"] == "EQUALS" else not ist
        t = [trifft(r) for r in satz["rules"]]
        if None in t:
            return None
        if (any(t) if satz.get("appliedDisjunctively") else all(t)):
            n += 1
    return n


import re as _re


def sammle_handles(items):
    """Rein: Kollektions-Handles aller Menüpunkte (verschachtelt) — in Reihenfolge, ohne Doppelte."""
    out = []
    for i in items or []:
        m = _re.search(r"/collections/([^/?#]+)", i.get("url") or "")
        if m:
            out.append(m.group(1))
        out += sammle_handles(i.get("items"))
    return list(dict.fromkeys(out))


def teilbaum(items, handle):
    """Rein: Handles im Menü-Teilbaum aller Punkte, deren URL auf /collections/<handle> zeigt (Punkt selbst eingeschlossen). Nicht im Menü → []."""
    out = []
    for i in items or []:
        m = _re.search(r"/collections/([^/?#]+)", i.get("url") or "")
        if m and m.group(1) == handle:
            out += sammle_handles([i])
        else:
            out += teilbaum(i.get("items"), handle)
    return list(dict.fromkeys(out))


def waisen_abfrage(regel, ids):
    """Rein: Shopify-Suchtext «aktive Produkte der Regel, die in KEINER der Kollektionen ids stehen». regel = (column, condition)."""
    col, cond = regel
    if '"' in cond:
        raise ValueError("Anführungszeichen in der Bedingung")
    feld = {"TYPE": "product_type", "TAG": "tag"}[col]
    return '%s:"%s" status:active %s' % (feld, cond, " ".join("-collection_id:" + i for i in ids))


def fuege_regel_hinzu(satz, column, relation, condition):
    """Rein: (neuer Satz, geändert). Ergänzt die Regel als ODER. Erlaubt nur bei ODER-Satz oder Satz mit genau EINER Regel (dann ist UND = ODER);
    ein UND-Satz mit mehreren Regeln wird nie angefasst (Ergänzen würde ihn verschieben)."""
    neu = copy.deepcopy(satz)
    if not neu.get("appliedDisjunctively") and len(neu["rules"]) != 1:
        return neu, False
    if any(r["column"] == column and r["relation"] == relation and r["condition"].lower() == condition.lower() for r in neu["rules"]):
        return neu, False
    neu["appliedDisjunctively"] = True
    neu["rules"].append({"column": column, "relation": relation, "condition": condition})
    return neu, True


def menue_items(gql):
    for m in gql("{menus(first:30){nodes{handle items{url items{url items{url items{url}}}}}}}")["menus"]["nodes"]:
        if m["handle"] == "main-menu":
            return m["items"]
    return None


def verwaist(gql, handle, regel, items=None):
    """Live: (Anzahl, Abfrage) — aktive Produkte der Regel in KEINER Kollektion des Menü-Teilbaums von `handle` (ohne `handle` selbst, das nach dem Schnitt die Regel nicht mehr trägt).
    None, wenn Menü oder Teilbaum nicht lesbar (fail-closed: der Aufrufer schneidet dann nicht)."""
    items = items if items is not None else menue_items(gql)
    if not items:
        return None
    kinder = [h for h in teilbaum(items, handle) if h != handle]
    if not kinder:
        return None
    ids = []
    for h in kinder:
        c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id}}', {"h": h})["collectionByIdentifier"]
        if c:
            ids.append(c["id"].split("/")[-1])
    if not ids:
        return None
    q = waisen_abfrage(regel, ids)
    return gql('query($q:String!){productsCount(query:$q,limit:null){count}}', {"q": q})["productsCount"]["count"], q


def lesen(gql, handle):
    c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id title ruleSet{appliedDisjunctively rules{column relation condition}}}}',
            {"h": handle})["collectionByIdentifier"]
    if not c or not c.get("ruleSet"):
        return None
    n = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
            {"q": "collection_id:%s status:active" % c["id"].split("/")[-1]})["productsCount"]["count"]
    return c["id"], c["title"], c["ruleSet"], n


def schreiben(gql, cid, satz):
    r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{ruleSet{appliedDisjunctively rules{column relation condition}}} userErrors{message}}}',
            {"i": {"id": cid, "ruleSet": satz}})["collectionUpdate"]
    return r["userErrors"], (r["collection"] or {}).get("ruleSet")


def gleich(a, b):
    f = lambda s: (bool(s["appliedDisjunctively"]), sorted((r["column"], r["relation"], r["condition"].lower()) for r in s["rules"]))
    return f(a) == f(b)


def sichern(handle, satz):
    """Alte Regeln sichern. Eine UNLESBARE Sicherungsdatei wird nie durch eine leere ersetzt (sonst wäre die ganze Rückweg-Historie weg) → RuntimeError."""
    try:
        alt = json.load(open(SICHERUNG, encoding="utf-8"))
    except FileNotFoundError:
        alt = {}
    except (OSError, ValueError) as e:
        raise RuntimeError("Sicherungsdatei unlesbar, nicht überschrieben: %s" % e) from e
    alt[f"{handle}@{dt.datetime.utcnow():%Y-%m-%dT%H:%M}"] = satz
    tmp = SICHERUNG + ".tmp"
    json.dump(alt, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, SICHERUNG)


def sperre_ids():
    try:
        import werbetest_sperre
        return {str(i) for i in werbetest_sperre.gesperrte_ids()}
    except Exception:
        return None   # unbekannt → Aufrufer schreibt nichts an Produkten


def waisen_produkte(gql, abfrage, limit=250):
    out, cur = [], None
    while len(out) < limit:
        d = gql('query($q:String!,$c:String){products(first:100,query:$q,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle productType tags}}}',
                {"q": abfrage, "c": cur})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    return out[:limit]


def etiketten_nachtragen(gql, produkte, typ, sperre):
    """Trägt fehlende Schlagwörter (TAGS_AUS_TYP[typ]) nach. Gibt (geschrieben, übersprungen_gesperrt, fehler) zurück. Sperre unbekannt → nichts schreiben."""
    soll = TAGS_AUS_TYP.get(typ)
    if not soll or sperre is None:
        return 0, 0, (0 if not soll else len(produkte))
    ok = gesperrt = fehler = 0
    for p in produkte:
        if p["productType"] != typ:
            continue
        if p["id"].split("/")[-1] in sperre:
            gesperrt += 1
            continue
        fehlt = [t for t in soll if t not in p["tags"]]
        if not fehlt:
            continue
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){node{... on Product{tags}} userErrors{message}}}', {"id": p["id"], "t": fehlt})["tagsAdd"]
        if r["userErrors"] or not all(t in (r["node"] or {}).get("tags", []) for t in fehlt):
            fehler += 1
        else:
            ok += 1
    return ok, gesperrt, fehler


def typ_korrigieren(gql, sperre):
    """TYP_KORREKTUR: nur wenn der Typ jetzt noch «Uhren» ist und das Produkt nicht Werbetest-gesperrt ist. → (geändert, fehler)"""
    ok = fehler = 0
    for h, neu in TYP_KORREKTUR.items():
        p = gql('query($h:String!){productByHandle(handle:$h){id productType}}', {"h": h})["productByHandle"]
        if not p or p["productType"] != "Uhren":
            continue
        if sperre is None or p["id"].split("/")[-1] in sperre:
            continue
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{productType} userErrors{message}}}', {"p": {"id": p["id"], "productType": neu}})["productUpdate"]
        if r["userErrors"] or (r["product"] or {}).get("productType") != neu:
            fehler += 1
        else:
            ok += 1
    return ok, fehler


def hauptlauf():
    from kaufwille_zeile import gql
    fehler = 0
    items = menue_items(gql)
    sperre = sperre_ids()
    geschrieben = False
    # 1) Kinder erweitern (idempotent) — VOR jedem Schnitt, damit die geschnittene Ware erreichbar bleibt
    for h, (col, rel, cond) in KIND_ERWEITERN.items():
        st = lesen(gql, h)
        if not st:
            print(f"{h}: Kollektion/Regelsatz nicht lesbar → Erweiterung übersprungen")
            fehler += 1
            continue
        cid, titel, satz, n = st
        neu, geaendert = fuege_regel_hinzu(satz, col, rel, cond)
        if not geaendert:
            print(f"= {h} «{titel}» {n}: Regel {col} {cond} schon enthalten (oder Satz nicht erweiterbar)")
            continue
        schaetz = zaehle_export(neu)
        print(f"{'→' if SCHARF else '[TROCKEN]'} {h} «{titel}»: jetzt {n} aktiv, Schätzung mit Regel {col} {cond}: {schaetz if schaetz is not None else '?'} (ODER-Erweiterung)")
        if schaetz is not None and schaetz > GRENZE - RESERVE_MIN:
            print(f"   ⛔ Schätzung {schaetz} lässt weniger als {RESERVE_MIN} Reserve → nicht geschrieben")
            fehler += 1
            continue
        if not SCHARF:
            continue
        try:
            sichern(h, satz)
        except RuntimeError as e:
            print(f"   ⛔ {e}")
            fehler += 1
            continue
        err, zurueck_ = schreiben(gql, cid, neu)
        if err or not zurueck_ or not gleich(zurueck_, neu):
            print(f"   ⚠️ Schreiben/Rücklesen abweichend: {err or zurueck_}")
            fehler += 1
        else:
            geschrieben = True
    # 2) Fremde Typen und fehlende Schlagwörter
    if SCHARF:
        k, f = typ_korrigieren(gql, sperre)
        if k or f:
            print(f"   Produkttyp korrigiert: {k}, Fehler {f}")
            fehler += f
    # 3) Schnitte, nur wenn nichts verwaist
    for handle, (art, arg) in PLAN.items():
        st = lesen(gql, handle)
        if not st:
            print(f"{handle}: Kollektion/Regelsatz nicht lesbar → übersprungen")
            fehler += 1
            continue
        cid, titel, satz, n = st
        if art == "entfernen":
            neu, k = entferne_regel(satz, *arg)
            noetig = k > 0
        else:
            neu = und_satz(arg)
            noetig = not gleich(neu, satz)
        wais = None
        if art == "entfernen":
            wais = verwaist(gql, handle, arg, items)
            if wais and wais[0] > 0 and arg[0] == "TYPE" and arg[1] in TAGS_AUS_TYP and SCHARF:
                prod = waisen_produkte(gql, wais[1])
                ok, gesp, err_ = etiketten_nachtragen(gql, prod, arg[1], sperre)
                print(f"   {handle}: {len(prod)} Waisen vom Typ {arg[1]} — Schlagwörter nachgetragen {ok}, Werbetest-gesperrt {gesp}, Fehler {err_}")
                fehler += err_
                geschrieben = geschrieben or ok > 0
            if (geschrieben or (wais and wais[0] > 0 and SCHARF)) and wais is not None:
                for _ in range(48 if geschrieben else 0):   # Neuberechnung der Kind-Kollektionen abwarten (bis 12 min)
                    if wais[0] == 0:
                        break
                    time.sleep(15)
                    wais = verwaist(gql, handle, arg, items)
        if not noetig:
            msg = "Regel nicht (mehr) vorhanden" if art == "entfernen" else "Regeln schon wie geplant"
            if art == "entfernen":
                if wais is None:
                    msg += "; Erreichbarkeit NICHT prüfbar (Menü/Teilbaum unlesbar)"
                    fehler += 1
                elif wais[0] > 0:
                    msg += f"; ⚠️ {wais[0]} aktive Produkte der Regel {arg} stehen in KEINER Kollektion des Teilbaums mehr (Abfrage: {wais[1]})"
                    fehler += 1
                else:
                    msg += "; Erreichbarkeit ok (0 Waisen)"
            print(f"= {handle} «{titel}» {n}: {msg}")
            continue
        if n <= GRENZE - RESERVE_MIN:
            print(f"= {handle} «{titel}» {n}: schon {GRENZE - n} unter der Grenze → nichts zu tun")
            continue
        schaetz = zaehle_export(neu)
        print(f"{'→' if SCHARF else '[TROCKEN]'} {handle} «{titel}»: jetzt {n} aktiv, Schätzung nach Schnitt {schaetz if schaetz is not None else '?'}; "
              f"Regeln {len(satz['rules'])} → {len(neu['rules'])}{' (UND)' if not neu['appliedDisjunctively'] else ''}")
        if art == "entfernen" and (wais is None or wais[0] > 0):
            print("   ⛔ " + ("Erreichbarkeit nicht prüfbar" if wais is None else f"{wais[0]} Produkte würden aus dem Menü-Teilbaum fallen") + " → nicht geschrieben")
            fehler += 1
            continue
        if schaetz is not None and (schaetz > GRENZE - RESERVE_MIN or schaetz < MIN_NACH):
            print(f"   ⛔ Schätzung {schaetz} ausserhalb [{MIN_NACH}; {GRENZE - RESERVE_MIN}] → nicht geschrieben")
            fehler += 1
            continue
        if not SCHARF:
            continue
        try:
            sichern(handle, satz)
        except RuntimeError as e:
            print(f"   ⛔ {e}")
            fehler += 1
            continue
        err, zurueck_ = schreiben(gql, cid, neu)
        if err or not zurueck_ or not gleich(zurueck_, neu):
            print(f"   ⚠️ Schreiben/Rücklesen abweichend: {err or zurueck_} → Sicherung steht in {os.path.relpath(SICHERUNG, REPO)}")
            fehler += 1
            continue
        print("   Regeln geschrieben und zurückgelesen; warte auf die Neuberechnung …", flush=True)
        n2 = n
        for _ in range(48):   # bis 12 min
            time.sleep(15)
            st2 = lesen(gql, handle)
            if st2 and st2[3] <= GRENZE - 100:
                n2 = st2[3]
                break
            n2 = st2[3] if st2 else n2
        print(f"   {handle}: {n} → {n2} aktive Produkte ({'unter' if n2 < GRENZE else '⚠️ NOCH ÜBER'} {GRENZE})")
        if n2 < MIN_NACH:
            print(f"   ⛔ nur noch {n2} (< {MIN_NACH}) — Schnitt zu gross, Rückweg: --zurueck")
            fehler += 1
        fehler += 0 if n2 < GRENZE else 1
    return 1 if fehler else 0


def zurueck():
    from kaufwille_zeile import gql
    try:
        alt = json.load(open(SICHERUNG, encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"Sicherung unlesbar ({e}) → nichts wiederhergestellt")
        return 1
    juengste = {}
    for k, v in alt.items():
        if "@" in k:
            h, t = k.split("@", 1)
            if h not in juengste or t > juengste[h][0]:
                juengste[h] = (t, v)
    fehler = 0
    for h, (t, satz) in juengste.items():
        if h not in PLAN and h not in KIND_ERWEITERN:
            continue
        st = lesen(gql, h)
        if not st:
            print(f"{h}: Kollektion nicht lesbar → übersprungen")
            fehler += 1
            continue
        err, zr = schreiben(gql, st[0], satz)
        ok = not err and zr and gleich(zr, satz)
        print(f"{h}: Stand {t} wiederhergestellt" if ok else f"{h}: FEHLER {err or zr}")
        fehler += 0 if ok else 1
    return 1 if fehler else 0


def selbsttest():
    import tempfile
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    OD = {"appliedDisjunctively": True, "rules": [{"column": "TYPE", "relation": "EQUALS", "condition": "Herrenmode"},
                                                  {"column": "TYPE", "relation": "EQUALS", "condition": "Herrenschuhe"},
                                                  {"column": "TAG", "relation": "EQUALS", "condition": "herrenuhr"}]}
    MENUE = [{"url": "https://x/collections/schmuck-uhren", "items": [
                 {"url": "/collections/uhren", "items": [{"url": "/collections/uhren-herren", "items": []}]},
                 {"url": "/collections/sub-ringe", "items": []}]},
             {"url": "https://x/collections/fur-ihn", "items": [{"url": "/collections/herren-schuhe?x=1", "items": []}]},
             {"url": "/pages/kontakt", "items": []}]

    def faelle(m):
        f = []
        neu, k = m.entferne_regel(OD, "TYPE", "herrenschuhe")
        if k != 1 or [r["condition"] for r in neu["rules"]] != ["Herrenmode", "herrenuhr"]:
            f.append(f"A Regel (gross/klein egal) entfernen: {k} {neu['rules']}")
        if len(OD["rules"]) != 3:
            f.append("B Eingabe darf nicht verändert werden")
        und = {"appliedDisjunctively": False, "rules": OD["rules"]}
        if m.entferne_regel(und, "TYPE", "Herrenschuhe")[1] != 0:
            f.append("C UND-Satz darf nicht gekürzt werden (Entfernen würde ihn ERWEITERN)")
        eins = {"appliedDisjunctively": True, "rules": [OD["rules"][1]]}
        if m.entferne_regel(eins, "TYPE", "Herrenschuhe")[1] != 0:
            f.append("D die letzte Regel nie entfernen")
        u = m.und_satz([("TAG", "EQUALS", "wohnen"), ("TAG", "NOT_EQUALS", "Aufbewahrung")])
        if u["appliedDisjunctively"] or len(u["rules"]) != 2 or u["rules"][1]["relation"] != "NOT_EQUALS":
            f.append("E UND-Satz falsch gebaut")
        if not m.gleich(OD, copy.deepcopy(OD)) or m.gleich(OD, neu):
            f.append("F gleich() erkennt Gleiches/Verschiedenes nicht")
        # G gleich(): ODER ≠ UND, EQUALS ≠ NOT_EQUALS, Reihenfolge und Gross/klein egal
        a = {"appliedDisjunctively": True, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "A"}, {"column": "TAG", "relation": "EQUALS", "condition": "b"}]}
        b_und = {"appliedDisjunctively": False, "rules": a["rules"]}
        b_not = {"appliedDisjunctively": True, "rules": [{"column": "TAG", "relation": "NOT_EQUALS", "condition": "A"}, a["rules"][1]]}
        b_rev = {"appliedDisjunctively": True, "rules": [a["rules"][1], {"column": "TAG", "relation": "EQUALS", "condition": "a"}]}
        if m.gleich(a, b_und) or m.gleich(a, b_not) or not m.gleich(a, b_rev):
            f.append("G gleich(): ODER/UND, EQUALS/NOT_EQUALS müssen verschieden, Reihenfolge/Schreibweise egal sein")
        # H Menü-Teilbaum: Kinder + Punkt selbst, Geschwister und andere Äste NICHT
        tb = m.teilbaum(MENUE, "schmuck-uhren")
        if tb != ["schmuck-uhren", "uhren", "uhren-herren", "sub-ringe"] or m.teilbaum(MENUE, "fur-ihn") != ["fur-ihn", "herren-schuhe"] or m.teilbaum(MENUE, "gibt-es-nicht") != []:
            f.append(f"H Teilbaum falsch: {tb}")
        # I Waisen-Abfrage
        q = m.waisen_abfrage(("TYPE", "Uhren"), ["11", "22"])
        if q != 'product_type:"Uhren" status:active -collection_id:11 -collection_id:22':
            f.append(f"I Abfrage falsch: {q}")
        try:
            m.waisen_abfrage(("TAG", 'a"b'), ["1"])
            f.append("I2 Anführungszeichen in der Bedingung müssen abgelehnt werden")
        except ValueError:
            pass
        # J Regel ergänzen: Einzelregel (UND=ODER) darf → ODER; UND mit mehreren Regeln nie; schon vorhanden → keine Änderung; Eingabe unverändert
        einzel = {"appliedDisjunctively": False, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "uhren"}]}
        n1, ch1 = m.fuege_regel_hinzu(einzel, "TYPE", "EQUALS", "Uhren")
        if not ch1 or not n1["appliedDisjunctively"] or len(n1["rules"]) != 2 or len(einzel["rules"]) != 1 or einzel["appliedDisjunctively"]:
            f.append("J Einzelregel-Satz muss zu ODER mit 2 Regeln werden, Eingabe unverändert")
        if m.fuege_regel_hinzu(n1, "TYPE", "EQUALS", "uhren")[1]:
            f.append("J2 Ergänzen muss idempotent sein (Gross/klein egal)")
        mehr_und = {"appliedDisjunctively": False, "rules": a["rules"]}
        if m.fuege_regel_hinzu(mehr_und, "TYPE", "EQUALS", "Uhren")[1]:
            f.append("J3 UND-Satz mit mehreren Regeln darf nicht erweitert werden")
        # K sichern(): unlesbare Sicherung wird nicht überschrieben, fehlende wird angelegt
        d = tempfile.mkdtemp()
        m.SICHERUNG = os.path.join(d, "alt.json")
        try:
            m.sichern("x", {"rules": []})
            if "x@" not in open(m.SICHERUNG, encoding="utf-8").read():
                f.append("K fehlende Sicherung muss angelegt werden")
        except Exception as e:
            f.append(f"K fehlende Sicherung: {e}")
        open(m.SICHERUNG, "w", encoding="utf-8").write("{kaputt")
        try:
            m.sichern("y", {"rules": []})
            f.append("K2 unlesbare Sicherung wurde überschrieben statt abgelehnt")
        except RuntimeError:
            if open(m.SICHERUNG, encoding="utf-8").read() != "{kaputt":
                f.append("K3 unlesbare Sicherung wurde trotz Ablehnung verändert")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("UND-Satz wird gekürzt", 'if not neu.get("appliedDisjunctively"):', "if False:"),
           ("letzte Regel darf weg", "    if not rest:\n        return neu, 0\n", "    if False:\n        return neu, 0\n"),
           ("Gross/klein zählt", 'r["condition"].lower() == condition.lower()', 'r["condition"] == condition'),
           ("Eingabe wird verändert", "    neu = copy.deepcopy(regelsatz)\n    if not neu.get", "    neu = regelsatz\n    if not neu.get"),
           ("gleich() ignoriert UND/ODER", "(bool(s[\"appliedDisjunctively\"]), sorted(", "(True, sorted("),
           ("gleich() ignoriert die Beziehung", '(r["column"], r["relation"], r["condition"].lower())', '(r["column"], "", r["condition"].lower())'),
           ("Teilbaum nimmt alle Punkte", 'if m and m.group(1) == handle:', "if m:"),
           ("Abfrage ohne aktiv-Filter", ' status:active %s" % (feld', ' %s" % (feld'),
           ("UND-Satz mit mehreren Regeln wird erweitert", 'if not neu.get("appliedDisjunctively") and len(neu["rules"]) != 1:', "if False:"),
           ("Ergänzen nicht idempotent", "    if any(r[\"column\"] == column and r[\"relation\"] == relation", "    if False and any(r[\"column\"] == column and r[\"relation\"] == relation"),
           ("unlesbare Sicherung wird ersetzt", '    except (OSError, ValueError) as e:\n        raise RuntimeError("Sicherungsdatei unlesbar, nicht überschrieben: %s" % e) from e',
            "    except (OSError, ValueError):\n        alt = {}")]
    erkannt = 0
    for name, alt, ers in mut:
        if quelle.count(alt) < 1:   # ersetzt wird die ERSTE Fundstelle = der echte Code (die Mutantenliste steht weiter unten)
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant", "exec"), m.__dict__)
        try:
            ok = bool(faelle(m))
        except Exception:
            ok = True
        if ok:
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 11 Fallgruppen, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zurueck" in sys.argv:
        sys.exit(zurueck())
    sys.exit(hauptlauf())
