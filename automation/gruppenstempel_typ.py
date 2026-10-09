#!/usr/bin/env python3
"""gruppenstempel_typ.py — Uhren/Schmuck mit dem Gruppentyp «Elektronik» auf ihren Warentyp legen (09.10.2026, Verbesserungsrunde).

GEMESSEN 09.10. (Export 15:53 UTC): 3'006 aktive Produkte mit Typ «Elektronik», davon 1'089 bei Google/Shopify unter Schmuck
(875 Watches, 186 Watch Accessories, 26 Bracelets …). Ursache: die CJ-Gruppe «elektronik» in cj_category_fill.mjs setzt
type:'Elektronik' für JEDEN Import (CJs Elektronik-Kategorien führen Smartwatches und Armbänder); der Importer leitet den
Typ nur bei Sammeltypen (Trend-*) aus der Kategorie ab. Folge für die Kundin: die Menü-Kollektion «Schmuck & Uhren»
(TYPE Schmuck/Uhren/…) zeigte keine dieser 1'089, und 196 ohne Tag «uhren» fehlten auch in «Uhren».
Dieselbe Klasse wie Büro-Sammelkorb und Spielzeug-Trennung (08.10.): Gruppenstempel ≠ Warenurteil.

REGEL: automation/data/gruppenstempel_typ.json (liest auch der Importer). Typ aus Shopify-Kategorie aa-6 + Titelwort, wie
produkttyp_vereinheitlichen.TAX «aa-6» — dieselbe Kollektions-Sperre (sperrgrund), nur dass eine ODER-Kollektion nicht
sperrt, wenn das Produkt über einen ihrer TAG-Regeln drin bleibt («Elektronik & Gadgets»: TYPE Elektronik ODER Tag elektronik).
Editor/POD nie. Ledger dropship/_gruppenstempel_typ.tsv.
  python3 automation/gruppenstempel_typ.py            # trocken
  SCHARF=1 python3 automation/gruppenstempel_typ.py   # schreibt Typ (+ Tag «uhren») und liest zurück
  python3 automation/gruppenstempel_typ.py --selbsttest
"""
import datetime as dt, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "gruppenstempel_typ.json"), encoding="utf-8"))
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "_gruppenstempel_typ.tsv")
GERAET, UHR, SMART = (re.compile(R[k], re.I) for k in ("geraet_wort", "uhr_wort", "smart_wort"))
POD = re.compile(r"\bpod\b|printful|selbst-gestalten|editor", re.I)


def typ_fuer(titel, uhrzweig=False):
    """Titel eines Produkts im Schmuck-Zweig (+ ob die Kategorie im Uhren-Zweig liegt) → «Uhren» | «Schmuck» | None (bleibt)."""
    t = titel or ""
    if GERAET.search(t):
        return None
    if UHR.search(t):
        return "Uhren"
    if SMART.search(t):
        return None
    return "Uhren" if uhrzweig else "Schmuck"


def im_uhrzweig(kat):
    return any(kat == z or kat.startswith(z + "-") for z in R["shopify_uhrzweig"])


def kanarien():
    f = [(t, s, typ_fuer(t, z)) for t, s, z in R["kanarien"] if typ_fuer(t, z) != s]
    for t, s, i in f:
        print(f"  ✗ {t!r} → {i} (soll {s})")
    print(f"GRUPPENSTEMPEL-KANARIEN {len(R['kanarien']) - len(f)}/{len(R['kanarien'])}")
    return not f


def paritaet(titel):
    """titel: [(titel, uhrzweig)] — py und js müssen für jedes Paar dasselbe sagen."""
    js = ("import fs from 'node:fs'; import {typAusStempel} from './automation/gruppenstempel_typ.mjs';"
          "const t=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(JSON.stringify(t.map(([x,z])=>typAusStempel(x,z))));")
    r = subprocess.run(["/opt/node22/bin/node", "--input-type=module", "-e", js], input=json.dumps(titel),
                       capture_output=True, text=True, cwd=REPO, timeout=120)
    ab = sum(a != b for a, b in zip([typ_fuer(t, z) for t, z in titel], json.loads(r.stdout)))
    print(f"GRUPPENSTEMPEL py=js: {len(titel)} Titel, {ab} Abweichungen")
    return ab == 0


def bleibt_ueber_tag(cid, tags, cache={}):
    """ODER-Kollektion: hält das Produkt über eine TAG-Regel fest? (dann fällt es durch den Typwechsel nicht heraus)"""
    from produkttyp_vereinheitlichen import gql
    if cid not in cache:
        rs = gql("query($i:ID!){collection(id:$i){ruleSet{appliedDisjunctively rules{column relation condition}}}}", {"i": cid})
        rs = (rs.get("collection") or {}).get("ruleSet") or {}
        cache[cid] = (rs.get("appliedDisjunctively"), [x["condition"].lower() for x in rs.get("rules") or []
                                                         if x["column"] == "TAG" and x["relation"] == "EQUALS"])
    oder, tagregeln = cache[cid]
    return bool(oder) and bool({t.lower() for t in tags} & set(tagregeln))


def main():
    import produkttyp_vereinheitlichen as pv
    if not kanarien():
        raise SystemExit("Kanarien rot")
    alle = [p for p in pv.produkte(R["stempel"], nur_aktiv=True)]
    if "--selbsttest" in sys.argv:
        sys.exit(0 if paritaet([(p["title"], z) for p in alle for z in (False, True)]) else 1)
    regeln = pv.typ_regeln()
    zahl, typ_paare, tag_neu = {}, [], []
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for p in alle:
        kat = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        if not (kat == R["shopify_praefix"] or kat.startswith(R["shopify_praefix"] + "-")) or POD.search(" ".join(p["tags"])):
            continue
        neu = typ_fuer(p["title"], im_uhrzweig(kat))
        if not neu:
            zahl["bleibt Elektronik"] = zahl.get("bleibt Elektronik", 0) + 1; continue
        g = pv.sperrgrund(R["stempel"], neu, regeln, pid=p["id"])
        if g:
            h = g.split(":")[0]
            cid = next((c for hh, _, _, c in regeln if hh == h), None)
            if not (cid and "ODER-Liste" in g and bleibt_ueber_tag(cid, p["tags"])):
                zahl["gesperrt"] = zahl.get("gesperrt", 0) + 1
                print(f"  ✗ {p['title'][:50]} → {neu}: {g}"); continue
        zahl[neu] = zahl.get(neu, 0) + 1
        typ_paare.append((p["id"], neu))
        if neu == "Uhren" and not {t.lower() for t in p["tags"]} & set(R["uhren_tags"]):
            tag_neu.append(p["id"])
        if led:
            led.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{p['id']}\t{R['stempel']}\t{neu}\t{'+uhren' if p['id'] in tag_neu else ''}\t{p['title'][:60]}\n")
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ} · {'SCHARF' if SCHARF else 'TROCKEN'} · {len(alle)} mit Typ «{R['stempel']}» · {zahl} · Tag «uhren» neu: {len(tag_neu)}")
    ok = pv.schreiben(typ_paare) if SCHARF else 0
    tok = 0
    if SCHARF:
        for pid in tag_neu:
            r = pv.gql("mutation($i:ID!,$t:[String!]!){tagsAdd(id:$i,tags:$t){node{... on Product{tags}} userErrors{message}}}",
                       {"i": pid, "t": [R["uhren_tag_neu"]]})["tagsAdd"]
            tok += (not r["userErrors"]) and R["uhren_tag_neu"] in (r["node"] or {}).get("tags", [])
    print(f"FERTIG {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}: Typ {ok}/{len(typ_paare)} zurückgelesen · Tag «uhren» {tok}/{len(tag_neu) if SCHARF else 0}")


if __name__ == "__main__":
    main()
