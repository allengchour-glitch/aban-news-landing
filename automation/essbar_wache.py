#!/usr/bin/env python3
"""essbar_wache.py — Essbares aus China (CJ) nicht im Verkauf (09.10.2026, Verbesserungsrunde).

ANLASS: «Hundegesundheits-Tabletten 200 g» (Kautabletten mit Nicotinamid-Ribosid, Quercetin, Vitamin C) kam als CJ-Neuimport
ACTIVE in 6 Kanäle. GEMESSEN am Bestand (51'805 aktive): 10 essbare CJ-Produkte — Probiotika-/Fischöl-/Gesundheits-
Tabletten, Gelenk-Supplement, Multivitamin-Tropfen, Vitamin-Lösung für Tiere, «Hühnchenbrust Snacks für Katzen» (tierisches
Erzeugnis), «Mundbeutel mit Koffein». Ergänzungsfutter und Tier-Snacks aus Fleisch brauchen für die Einfuhr in die Schweiz
eine Registrierung bzw. BLV-Bewilligung, Nahrungsergänzungen eine Kennzeichnung in einer Landessprache — eine Postsendung aus
China wird zurückgeschickt oder vernichtet (dieselbe Klasse wie die Klinge #1017, Kunde erstattet). Die Importer hatten Wachen
für Medizinprodukte, Tierschutzgeräte und Klingen, keine für Essbares. Süsswaren vom Schweizer Grosshändler Fortura bleiben.

REGEL: automation/data/essbar_regel.json — EINE Datei, auch für die Importer (essbar.mjs). Geprüft werden Titel und
Shopify-Kategorie (der Bestand kennt den CJ-Namen nicht), nie der Beschreibungstext.
DRY (Standard) zeigt den Plan und schreibt den Bericht; SCHARF=1 setzt DRAFT + Tags `essbar-nicht-ch`, `essbar-<grund>`
(nichts gelöscht, Rückweg = Status ACTIVE + Tags weg). Ledger dropship/_essbar_wache.tsv, Bericht dropship/ESSBAR-WACHE.md.
CACHE_NUTZEN=1 nimmt den letzten Export. --selbsttest prüft die Kanarien.
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "essbar_regel.json"), encoding="utf-8"))
KAT, TITEL = re.compile(R["kategorie"]), re.compile(R["titel"], re.I)
EN, NICHT = re.compile(R["en"], re.I), re.compile(R["nicht"], re.I)
SCHARF = os.environ.get("SCHARF") == "1"
CACHE = "/tmp/essbar_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_essbar_wache.tsv")
BERICHT = os.path.join(REPO, "dropship", "ESSBAR-WACHE.md")
BULK = ('{ products(query: "status:active") { edges { node { id handle title tags category { fullName } '
        'variants(first: 1) { edges { node { sku } } } } } } }')


def essbar(titel, en="", kategorie="", sku=""):
    """Grund ('kategorie' | 'titel' | 'cj-name') oder None — gleiche Logik wie essbar.mjs."""
    if any((sku or "").lower().startswith(p) for p in R["schweiz_sku"]):
        return None
    t, e = titel or "", en or ""
    if NICHT.search(f"{t} {e}"):
        return None
    if KAT.search(kategorie or ""):
        return "kategorie"
    if TITEL.search(t):
        return "titel"
    if EN.search(e):
        return "cj-name"
    return None


def selbsttest():
    f = 0
    for t, en, kat, sku, soll in R["kanarien"]:
        ist = bool(essbar(t, en, kat, sku))
        if ist != soll:
            f += 1
            print(f"  ✗ {t} → {ist} (soll {soll})")
    print(f"Selbsttest: {len(R['kanarien']) - f}/{len(R['kanarien'])} ok")
    return f == 0


def main():
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if "--selbsttest" in sys.argv:
        return 0
    import versprechen_wache as vw                     # Bulk-Export über die EIGENE Bulk-ID
    from kaufwille_zeile import gql                    # Eimer-Etikette eingebaut
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        vw.BULK, vw.CACHE = BULK, CACHE
        vw.export()
    alle, sku = {}, {}
    for z in open(CACHE, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o:
            sku.setdefault(o["__parentId"], o.get("sku") or "")
        elif "handle" in o:
            alle[o["id"]] = o
    treffer = []
    for pid, p in alle.items():
        kat = (p.get("category") or {}).get("fullName") or ""
        g = essbar(p["title"], "", kat, sku.get(pid, ""))
        if g:
            treffer.append((p, g, kat))
    print(f"PLAN: {len(treffer)} essbare Nicht-Schweizer-Produkte aktiv · {'SCHARF' if SCHARF else 'TROCKEN'}")
    ok = fehl = 0
    for p, g, kat in treffer:
        print(f"   {p['title'][:60]:60} [{g}] {kat[-40:]}")
        if not SCHARF:
            continue
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{status} userErrors{message}}}',
                {"p": {"id": p["id"], "status": "DRAFT"}})["productUpdate"]
        t = gql('mutation($i:ID!,$t:[String!]!){tagsAdd(id:$i,tags:$t){userErrors{message}}}',
                {"i": p["id"], "t": ["essbar-nicht-ch", f"essbar-{g}"]})["tagsAdd"]
        if not r["userErrors"] and (r.get("product") or {}).get("status") == "DRAFT" and not t["userErrors"]:
            ok += 1
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{time.strftime('%Y-%m-%d')}\t{p['id']}\t{p['handle']}\t{p['title']}\t{g}\n")
        else:
            fehl += 1
            print(f"   ⛔ {r['userErrors']} {t['userErrors']}")
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Essbares aus China im Verkauf — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Regel: `automation/data/essbar_regel.json` (Wächter `essbar_wache.py`, Importer `essbar.mjs`). Geprüft: "
                f"{len(alle)} aktive · Treffer: {len(treffer)} · {'gedraftet' if SCHARF else 'würden gedraftet'}: "
                f"{ok if SCHARF else len(treffer)} · Fehler: {fehl}\n\n")
        for p, g, kat in treffer:
            f.write(f"- `{p['handle']}` — {p['title']} ({g}; {kat})\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(treffer)} Treffer, "
          f"{ok} gedraftet, {fehl} Fehler")
    return 1 if fehl else 0


if __name__ == "__main__":
    sys.exit(main())
