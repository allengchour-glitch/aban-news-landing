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
Reserve nach dem Schnitt > 1'500 Produkte je Kollektion; der Aufseher (filtergrenze_wache) meldet ab 4'800 wieder.
Sicherung der alten Regeln: dropship/_filtergrenze_regeln_alt.json (Schlüssel «<handle>@<datum>»); Rückweg: --zurueck.

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
    try:
        alt = json.load(open(SICHERUNG, encoding="utf-8"))
    except (OSError, ValueError):
        alt = {}
    alt[f"{handle}@{dt.datetime.utcnow():%Y-%m-%dT%H:%M}"] = satz
    tmp = SICHERUNG + ".tmp"
    json.dump(alt, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, SICHERUNG)


def hauptlauf():
    from kaufwille_zeile import gql
    fehler = 0
    for handle, (art, arg) in PLAN.items():
        st = lesen(gql, handle)
        if not st:
            print(f"{handle}: Kollektion/Regelsatz nicht lesbar → übersprungen")
            fehler += 1
            continue
        cid, titel, satz, n = st
        if art == "entfernen":
            neu, k = entferne_regel(satz, *arg)
            if k == 0:
                print(f"= {handle} «{titel}» {n}: Regel {arg} nicht (mehr) vorhanden oder nicht entfernbar → nichts zu tun")
                continue
        else:
            neu = und_satz(arg)
            if gleich(neu, satz):
                print(f"= {handle} «{titel}» {n}: Regeln schon wie geplant")
                continue
        if n <= GRENZE - RESERVE_MIN:
            print(f"= {handle} «{titel}» {n}: schon {GRENZE - n} unter der Grenze → nichts zu tun")
            continue
        schaetz = zaehle_export(neu)
        print(f"{'→' if SCHARF else '[TROCKEN]'} {handle} «{titel}»: jetzt {n} aktiv, Schätzung nach Schnitt {schaetz if schaetz is not None else '?'}; "
              f"Regeln {len(satz['rules'])} → {len(neu['rules'])}{' (UND)' if not neu['appliedDisjunctively'] else ''}")
        if schaetz is not None and schaetz > GRENZE - RESERVE_MIN:
            print(f"   ⛔ Schätzung {schaetz} lässt weniger als {RESERVE_MIN} Reserve → nicht geschrieben")
            fehler += 1
            continue
        if not SCHARF:
            continue
        sichern(handle, satz)
        err, zurueck = schreiben(gql, cid, neu)
        if err or not zurueck or not gleich(zurueck, neu):
            print(f"   ⚠️ Schreiben/Rücklesen abweichend: {err or zurueck} → Sicherung steht in {os.path.relpath(SICHERUNG, REPO)}")
            fehler += 1
            continue
        print("   Regeln geschrieben und zurückgelesen; warte auf die Neuberechnung …", flush=True)
        for _ in range(48):   # bis 12 min
            time.sleep(15)
            n2 = lesen(gql, handle)[3]
            if n2 <= GRENZE - 100:
                break
        print(f"   {handle}: {n} → {n2} aktive Produkte ({'unter' if n2 < GRENZE else '⚠️ NOCH ÜBER'} {GRENZE})")
        fehler += 0 if n2 < GRENZE else 1
    return 1 if fehler else 0


def zurueck():
    from kaufwille_zeile import gql
    alt = json.load(open(SICHERUNG, encoding="utf-8"))
    juengste = {}
    for k, v in alt.items():
        if "@" in k:
            h, t = k.split("@", 1)
            if h not in juengste or t > juengste[h][0]:
                juengste[h] = (t, v)
    for h, (t, satz) in juengste.items():
        if h not in PLAN:
            continue
        st = lesen(gql, h)
        err, zr = schreiben(gql, st[0], satz)
        print(f"{h}: Stand {t} wiederhergestellt" if not err and zr and gleich(zr, satz) else f"{h}: FEHLER {err or zr}")
    return 0


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    OD = {"appliedDisjunctively": True, "rules": [{"column": "TYPE", "relation": "EQUALS", "condition": "Herrenmode"},
                                                  {"column": "TYPE", "relation": "EQUALS", "condition": "Herrenschuhe"},
                                                  {"column": "TAG", "relation": "EQUALS", "condition": "herrenuhr"}]}

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
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("UND-Satz wird gekürzt", 'if not neu.get("appliedDisjunctively"):', "if False:"),
           ("letzte Regel darf weg", "    if not rest:\n        return neu, 0\n", "    if False:\n        return neu, 0\n"),
           ("Gross/klein zählt", 'r["condition"].lower() == condition.lower()', 'r["condition"] == condition'),
           ("Eingabe wird verändert", "    neu = copy.deepcopy(regelsatz)\n    if not neu.get", "    neu = regelsatz\n    if not neu.get")]
    erkannt = 0
    for name, alt, ers in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant", "exec"), m.__dict__)
        if faelle(m):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 6 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zurueck" in sys.argv:
        sys.exit(zurueck())
    sys.exit(hauptlauf())
