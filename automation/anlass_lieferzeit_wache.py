#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""anlass_lieferzeit_wache.py — Anlass-Kollektionen zeigen oben nur Ware, die rechtzeitig ankommt (12.10.2026).

ANLASS (GEMESSEN 12.10.2026, 19 Tage vor Halloween): Die Kollektion «Halloween» (224 aktive: 92 CJ, 132 Schweizer Lager)
war nach «neueste zuerst» sortiert. Weil der CJ-Grind gerade Halloween-Suchaufträge abarbeitet, waren die **ersten 16 von
16 Artikeln CJ-Direktversand** — Lieferzusage 10–20 Werktage (+3 Bearbeitung) = nach Halloween. Die 132 Kostüme ab
Schweizer Lager (1–2 Werktage, DPD) lagen darunter, obwohl der Kollektionstext «Last-Minute? Kostüme ab Schweizer Lager»
verspricht. ChatGPT schickte 14 Besucher auf genau diese Seite (90 T, 0 Warenkörbe).

REGEL (Tabelle data/anlass_kollektionen.json):
  rechtzeitig(Quelle) = heute + Lieferwerktage(Quelle) ≤ Anlass-Datum   (schnell = Schweizer Lager 6 WT, langsam = 12 WT)
  Ist die LANGSAME Ware nicht mehr rechtzeitig, die schnelle aber schon:
    → Kollektion auf MANUAL, Reihenfolge = schnelle aktive Ware (in bisheriger Ordnung) · langsame aktive · Rest.
    → täglich neu (Neuimporte landen bei MANUAL hinten; neue Lager-Ware rückt so nach oben).
  Nach dem Anlass → frühere Sortierung zurück (Ledger dropship/_anlass_sort.tsv).
  Schnell = Tag «ch-lager»/«schweiz-versand» oder SKU «fortura-…» UND Versandprofil «CH-Lager» (1. Variante).
  Alles andere gilt als langsam (vorsichtig).
  13.10.2026: Die Kasse rechnet nach dem VERSANDPROFIL, nicht nach dem Tag. GEMESSEN: in den obersten 24 der Halloween-
  Seite lagen 16 Artikel mit Lager-Tag im «General profile» → Kasse 28.10.–11.11. (nach Halloween). Deshalb zählt
  ein Artikel nur als schnell, wenn auch sein Profil «CH-Lager» ist. Schnell = 6 WT (Kasse: P3D + 1–2 WT, 12-Uhr-Schluss)
  → Bestellschluss Halloween Do 22.10. (Kasse spätestens Fr 30.10.); ab 23.10. meldet die Wache «auch Schweizer Lager zu spät».
Nichts wird gelöscht oder gedraftet — nur die Reihenfolge.

  python3 automation/anlass_lieferzeit_wache.py               # Trockenlauf (Standard)
  SCHARF=1 python3 automation/anlass_lieferzeit_wache.py      # umsortieren + zurücklesen
  python3 automation/anlass_lieferzeit_wache.py --selbsttest
"""
import datetime as dt, json, os, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
TABELLE = os.path.join(REPO, "data", "anlass_kollektionen.json")
LEDGER = os.path.join(REPO, "dropship", "_anlass_sort.tsv")
BERICHT = os.path.join(REPO, "dropship", "ANLASS-LIEFERZEIT.md")
SCHARF = os.environ.get("SCHARF") == "1"


def plus_werktage(tag, n):
    d = tag
    while n > 0:
        d += dt.timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def schnell(tags, sku):
    t = set(tags or [])
    return bool({"ch-lager", "schweiz-versand"} & t) or (sku or "").lower().startswith("fortura")


PROFIL_SCHNELL = "CH-Lager"


def schnell_profil(tags, sku, profil):
    """Schnell nur, wenn Tag/SKU UND Versandprofil der 1. Variante «CH-Lager» sagen (die Kasse folgt dem Profil)."""
    return schnell(tags, sku) and (profil or "") == PROFIL_SCHNELL


def ziel_reihenfolge(produkte):
    """produkte: [(id, aktiv, schnell)] in aktueller Ordnung → stabile Aufteilung: schnell+aktiv · langsam+aktiv · inaktiv."""
    a = [p[0] for p in produkte if p[1] and p[2]]
    b = [p[0] for p in produkte if p[1] and not p[2]]
    c = [p[0] for p in produkte if not p[1]]
    return a + b + c


def lade(gql, handle):
    c = gql('query($h:String!){ collectionByHandle(handle:$h){ id title sortOrder } }', {"h": handle}).get("collectionByHandle")
    if not c:
        return None, []
    out, cur = [], None
    while True:
        d = gql('query($id:ID!,$c:String){ collection(id:$id){ products(first:250, after:$c, sortKey:COLLECTION_DEFAULT){ '
                'pageInfo{hasNextPage endCursor} nodes{ id title status tags variants(first:1){ nodes{ sku deliveryProfile{ name } } } } } } }',
                {"id": c["id"], "c": cur})
        pg = d["collection"]["products"]
        for p in pg["nodes"]:
            v0 = (p["variants"]["nodes"] or [{}])[0] or {}
            sku = v0.get("sku") or ""
            prof = (v0.get("deliveryProfile") or {}).get("name")
            out.append((p["id"], p["status"] == "ACTIVE", schnell_profil(p["tags"], sku, prof), p["title"]))
        if not pg["pageInfo"]["hasNextPage"]:
            return c, out
        cur = pg["pageInfo"]["endCursor"]


def ledger_alt(handle):
    if not os.path.exists(LEDGER):
        return None
    alt = None
    for z in open(LEDGER, encoding="utf-8"):
        t = z.rstrip("\n").split("\t")
        if len(t) >= 3 and t[0] == handle and t[1] == "vorher":
            alt = t[2]
        if len(t) >= 3 and t[0] == handle and t[1] == "zurueck":
            alt = None
    return alt


def umsortieren(gql, c, ziel, alt_sort):
    if c["sortOrder"] != "MANUAL":
        r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{ message } } }',
                {"i": {"id": c["id"], "sortOrder": "MANUAL"}})
        if (r.get("collectionUpdate") or {}).get("userErrors"):
            return f"Sortierung nicht umgestellt: {r['collectionUpdate']['userErrors']}"
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{c['handle'] if 'handle' in c else ''}\tvorher\t{alt_sort}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
    moves = [{"id": pid, "newPosition": str(i)} for i, pid in enumerate(ziel)]
    for k in range(0, len(moves), 250):
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){ collectionReorderProducts(id:$id, moves:$m){ job{ id done } userErrors{ message } } }',
                {"id": c["id"], "m": moves[k:k + 250]})
        rr = r.get("collectionReorderProducts") or {}
        if rr.get("userErrors"):
            return f"Umsortieren abgelehnt: {rr['userErrors']}"
        job = (rr.get("job") or {}).get("id")
        for _ in range(30):
            if not job:
                break
            j = gql('query($id:ID!){ job(id:$id){ done } }', {"id": job}).get("job") or {}
            if j.get("done"):
                break
            time.sleep(2)
    return None


def main():
    from seo_autopilot import gql
    tab = json.load(open(TABELLE, encoding="utf-8"))
    wt = tab["lieferung_werktage"]
    heute = dt.date.today()
    zeilen, zahl = [], {"umsortiert": 0, "schon_richtig": 0, "rechtzeitig": 0, "zurueck": 0, "zu_spaet_alles": 0, "fehlt": 0}
    for a in tab["anlaesse"]:
        datum = dt.date.fromisoformat(a["datum"])
        frist_schnell, frist_langsam = plus_werktage(heute, wt["schnell"]), plus_werktage(heute, wt["langsam"])
        c, prods = lade(gql, a["handle"])
        if not c:
            zahl["fehlt"] += 1; zeilen.append(f"| {a['handle']} | — | Kollektion fehlt | — |"); continue
        c["handle"] = a["handle"]
        n_akt = sum(1 for p in prods if p[1]); n_schnell = sum(1 for p in prods if p[1] and p[2])
        oben = prods[:12]
        oben_langsam = sum(1 for p in oben if p[1] and not p[2])
        if heute > datum:
            alt = ledger_alt(a["handle"])
            if alt and c["sortOrder"] == "MANUAL":
                if SCHARF:
                    gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{ message } } }',
                        {"i": {"id": c["id"], "sortOrder": alt}})
                    with open(LEDGER, "a", encoding="utf-8") as f:
                        f.write(f"{a['handle']}\tzurueck\t{alt}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
                zahl["zurueck"] += 1
                zeilen.append(f"| {a['handle']} | {a['datum']} vorbei | Sortierung zurück auf {alt}{'' if SCHARF else ' (TROCKEN)'} | — |")
            continue
        if frist_langsam <= datum:
            zahl["rechtzeitig"] += 1
            zeilen.append(f"| {a['handle']} | {a['datum']} | alles rechtzeitig (Direktversand bis {frist_langsam}) | {c['sortOrder']} |")
            continue
        if frist_schnell > datum:
            zahl["zu_spaet_alles"] += 1
            zeilen.append(f"| {a['handle']} | {a['datum']} | auch Schweizer Lager zu spät — nichts umgestellt | {c['sortOrder']} |")
            continue
        ziel = ziel_reihenfolge(prods)
        if [p[0] for p in prods] == ziel and c["sortOrder"] == "MANUAL":
            zahl["schon_richtig"] += 1
            zeilen.append(f"| {a['handle']} | {a['datum']} | schon richtig ({n_schnell} Lager-Artikel oben) | MANUAL |")
            continue
        fehler = umsortieren(gql, c, ziel, c["sortOrder"]) if SCHARF else None
        if fehler:
            zeilen.append(f"| {a['handle']} | {a['datum']} | ⚠️ {fehler} | {c['sortOrder']} |"); continue
        nach = ""
        if SCHARF:
            time.sleep(3)
            _, neu = lade(gql, a["handle"])
            nach = f" · zurückgelesen: oben 12 = {sum(1 for p in neu[:12] if p[1] and p[2])} Lager-Artikel"
        zahl["umsortiert"] += 1
        zeilen.append(f"| {a['handle']} | {a['datum']} | Direktversand erst bis {frist_langsam} → Lager-Ware nach oben "
                      f"({n_schnell} von {n_akt} aktiven; vorher oben 12: {oben_langsam} Direktversand){nach}"
                      f"{'' if SCHARF else ' (TROCKEN)'} | {c['sortOrder']} → MANUAL |")
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Anlass-Kollektionen: rechtzeitige Ware oben — Stand {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n\n"
                f"Regel: `automation/anlass_lieferzeit_wache.py`, Tabelle `data/anlass_kollektionen.json` (Schweizer Lager "
                f"{wt['schnell']} WT, Direktversand {wt['langsam']} WT). Nur die Reihenfolge wird geändert.\n\n"
                "| Kollektion | Anlass | Ergebnis | Sortierung |\n|---|---|---|---|\n" + "\n".join(zeilen) + "\n")
    print(f"ANLASS-LIEFERZEIT: umsortiert {zahl['umsortiert']} · schon richtig {zahl['schon_richtig']} · alles rechtzeitig "
          f"{zahl['rechtzeitig']} · zurück {zahl['zurueck']} · fehlt {zahl['fehlt']}{'' if SCHARF else ' (TROCKEN)'} → dropship/ANLASS-LIEFERZEIT.md")
    return 0


def selbsttest():
    f = 0
    mo = dt.date(2026, 10, 12)  # Montag
    pruef = [
        (plus_werktage(mo, 2), dt.date(2026, 10, 14), "2 WT ab Mo = Mi"),
        (plus_werktage(mo, 5), dt.date(2026, 10, 19), "5 WT ab Mo = nächster Mo"),
        (plus_werktage(mo, 23) > dt.date(2026, 10, 31), True, "Direktversand ab 12.10. zu spät für Halloween"),
        (plus_werktage(mo, 2) <= dt.date(2026, 10, 31), True, "Lager ab 12.10. rechtzeitig"),
        (plus_werktage(dt.date(2026, 11, 1), 23) <= dt.date(2026, 12, 24), True, "Direktversand ab 01.11. rechtzeitig für Weihnachten"),
        (schnell(["ch-lager"], "x"), True, "Tag ch-lager"), (schnell([], "fortura-CK1"), True, "SKU fortura"),
        (schnell(["cj-real"], "CJ-123"), False, "CJ langsam"), (schnell([], ""), False, "unbekannt = langsam"),
        (schnell_profil(["ch-lager"], "x", "CH-Lager"), True, "ch-lager-Tag + Profil CH-Lager = schnell"),
        (schnell_profil(["ch-lager"], "x", "General profile"), False, "ch-lager-Tag, General profile → langsam"),
        (schnell_profil([], "fortura-CK1", "General profile"), False, "fortura-SKU, General profile → langsam"),
        (schnell_profil(["ch-lager"], "x", None), False, "ch-lager-Tag, Profil unbekannt → langsam"),
        (schnell_profil(["cj-real"], "CJ-123", "CH-Lager"), False, "Profil CH-Lager ohne Lager-Tag/SKU → langsam"),
        (plus_werktage(dt.date(2026, 10, 22), 6) <= dt.date(2026, 10, 31), True, "Lager 6 WT ab Do 22.10. rechtzeitig (Fr 30.10.)"),
        (plus_werktage(dt.date(2026, 10, 23), 6) > dt.date(2026, 10, 31), True, "Lager 6 WT ab Fr 23.10. zu spät"),
        (plus_werktage(dt.date(2026, 10, 15), 12) > dt.date(2026, 10, 31), True, "Direktversand 12 WT ab Do 15.10. zu spät → umsortieren"),
        (ziel_reihenfolge([("a", True, False), ("b", True, True), ("c", False, True), ("d", True, True)]), ["b", "d", "a", "c"], "stabil"),
    ]
    for ist, soll, name in pruef:
        ok = ist == soll
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name} → {ist}")
    print("SELBSTTEST", "OK" if not f else f"FEHLER ({f})")
    return 0 if not f else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
