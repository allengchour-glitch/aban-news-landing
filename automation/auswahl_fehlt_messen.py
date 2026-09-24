#!/usr/bin/env python3
"""auswahl_fehlt_messen.py — Produkte mit EINER Shop-Variante, deren CJ-Listing mehrere Varianten hat (24.09.2026).

ANLASS: «Wasserfeste Maniküre» zeigt 18 Bilder mit 14 Designs, verkauft wird eine Variante «Default Title» mit der
Produkt-SKU `CJ-<pid>`. Bei «36 Farben Cat Eye UV Nagellack-Gel Set» ist es schlimmer: CJ führt 36 EINZELNE Farben
(CKM01…CKM36, je USD 2.60) — der Titel verspricht ein Set, geliefert würde eine Flasche. Der Bestell-Automat rät nicht
(`cj_order_engine.py`: mehrere CJ-Varianten + keine Variantenangabe → «manuell prüfen»), die Bestellung bliebe also
stehen. Für die Kundin heisst das: sie sieht eine Auswahl, kann nicht wählen, und ihr Paket geht nicht raus.

NUR LESEN. Je Produkt EINE CJ-Anfrage (product/query → alle Varianten) über den gemeinsamen Takt. Gemessen wird:
Anzahl CJ-Varianten, Preisspanne, ob die Variantenbilder schon als Medien am Produkt hängen (Dateistamm — der
Dateispeicher ist bis zum Grow-Plan voll, neue Bilder gingen nicht), und ein Beispiel der variantKeys.
Ausgabe: dropship/AUSWAHL-FEHLT.md + dropship/_auswahl_fehlt.jsonl (eine Zeile je gemessenem Produkt, idempotent).
ENV: QUERY (Shopify-Suche), LIMIT (Std. 400), MIN_BILDER (Std. 8).
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_stecker_pruefen import cj, cj_url           # noqa: E402  (Takt + Retry + Tagesbudget → SystemExit)
from kollektionstexte_nachbessern import gql         # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
AUS = "dropship/_auswahl_fehlt.jsonl"
BERICHT = "dropship/AUSWAHL-FEHLT.md"
QUERY = os.environ.get("QUERY", 'status:active AND (title:*Nagel* OR title:*Maniküre* OR title:*Nägel* OR '
                                 'title:*Press-on* OR title:*Nageldesign* OR title:*Kunstnägel*)')
LIMIT = int(os.environ.get("LIMIT", "400"))
MIN_BILDER = int(os.environ.get("MIN_BILDER", "8"))


def stamm(url):
    """Dateistamm ohne Endung und ohne Shopifys _trans/Suffix-Varianten: «3c7b2775-…_trans.jpeg» → «3c7b2775-…»."""
    n = (url or "").split("?")[0].rsplit("/", 1)[-1].rsplit(".", 1)[0]
    m = re.match(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", n, re.I)
    return (m.group(0) if m else n).lower()


def kandidaten():
    after, out = None, []
    while len(out) < LIMIT:
        r = gql('query($q:String!,$a:String){products(first:100,query:$q,after:$a){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title variantsCount{count} mediaCount{count} variants(first:1){nodes{sku price}} '
                'media(first:60){nodes{... on MediaImage{image{url}}}}}}}', {"q": QUERY, "a": after})["products"]
        for n in r["nodes"]:
            sku = (n["variants"]["nodes"] or [{}])[0].get("sku") or ""
            if n["variantsCount"]["count"] == 1 and n["mediaCount"]["count"] >= MIN_BILDER and sku.upper().startswith("CJ-"):
                out.append(n)
        if not r["pageInfo"]["hasNextPage"]:
            break
        after = r["pageInfo"]["endCursor"]
    return out[:LIMIT]


def main():
    fertig = {}
    if os.path.exists(AUS):
        for z in open(AUS):
            try:
                d = json.loads(z); fertig[d["id"]] = d
            except Exception:
                pass
    ks = kandidaten()
    print(f"{len(ks)} Kandidaten (1 Variante, ≥{MIN_BILDER} Bilder, SKU CJ-…), {sum(1 for k in ks if k['id'] in fertig)} schon gemessen", flush=True)
    for i, n in enumerate(ks, 1):
        if n["id"] in fertig:
            continue
        sku = n["variants"]["nodes"][0]["sku"]
        d = cj(cj_url(sku))
        if d is None:
            print(f"PAUSE: CJ antwortet nicht ({n['handle']})"); break
        data = d.get("data") if isinstance(d.get("data"), dict) else {}
        vs = data.get("variants") or []
        if not vs:
            zeile = {"id": n["id"], "handle": n["handle"], "titel": n["title"], "cj": 0, "grund": d.get("message") or "keine Varianten"}
        else:
            shop = {stamm(m["image"]["url"]) for m in n["media"]["nodes"] if m.get("image")}
            preise = [float(v.get("variantSellPrice") or 0) for v in vs if v.get("variantSellPrice")]
            bild_da = sum(1 for v in vs if v.get("variantImage") and stamm(v["variantImage"]) in shop)
            zeile = {"id": n["id"], "handle": n["handle"], "titel": n["title"], "preis": n["variants"]["nodes"][0]["price"],
                     "cj": len(vs), "cj_min": min(preise) if preise else None, "cj_max": max(preise) if preise else None,
                     "bild_da": bild_da, "keys": [v.get("variantKey") for v in vs[:6]]}
        with open(AUS, "a") as fh:
            fh.write(json.dumps(zeile, ensure_ascii=False) + "\n")
        fertig[n["id"]] = zeile
        if i % 25 == 0:
            print(f"{i}/{len(ks)} gemessen", flush=True)
    bericht([fertig[k["id"]] for k in ks if k["id"] in fertig])


def bericht(rows):
    mehr = [r for r in rows if r.get("cj", 0) > 1]
    voll = [r for r in mehr if r["bild_da"] == r["cj"]]
    teil = [r for r in mehr if 0 < r["bild_da"] < r["cj"]]
    spanne = [r for r in mehr if r.get("cj_min") and r["cj_max"] > 2 * r["cj_min"]]
    L = [f"# Auswahl fehlt — 1 Shop-Variante, mehrere CJ-Varianten (Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC)", "",
         f"Suche: `{QUERY}` · gemessen {len(rows)} · **{len(mehr)} mit mehreren CJ-Varianten** "
         f"(alle Variantenbilder schon am Produkt: {len(voll)}, teilweise: {len(teil)}, keine: {len(mehr) - len(voll) - len(teil)}; "
         f"Preisspanne > 2×: {len(spanne)}) · 1 CJ-Variante: {sum(1 for r in rows if r.get('cj') == 1)} · ohne Antwort: "
         f"{sum(1 for r in rows if not r.get('cj'))}", "",
         "Folge ohne Reparatur: Bestell-Automat stoppt «manuell prüfen» (rät nie), die Kundin konnte nichts wählen.", "",
         "| Produkt | CJ-Var. | Bilder da | CJ USD | Shop CHF | Beispiele |", "|---|---|---|---|---|---|"]
    for r in sorted(mehr, key=lambda r: -r["cj"]):
        L.append(f"| {r['titel']} (`{r['handle']}`) | {r['cj']} | {r['bild_da']} | {r['cj_min']}–{r['cj_max']} | {r['preis']} | "
                 f"{', '.join(str(k) for k in r['keys'][:4])} |")
    open(BERICHT, "w").write("\n".join(L) + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {len(rows)} gemessen, {len(mehr)} mit mehreren CJ-Varianten "
          f"({len(voll)} alle Bilder da) → {BERICHT}")


if __name__ == "__main__":
    main()
