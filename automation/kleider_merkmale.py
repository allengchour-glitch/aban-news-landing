#!/usr/bin/env python3
"""kleider_merkmale.py — Filterwerte «Länge» und «Ärmel» aus dem Titel (06.10.2026, Betreiber «neue feinkategorien und
filter erstellen?» → «Länge + Ärmel aus Titel»).

GEMESSEN 06.10.: 2'819 Kleider; Länge steht bei 983 im Titel (Maxi 446 · Midi 291 · Mini 246), Ärmel bei 745 (ärmellos
590 · langarm 123 · kurzarm 32). Shopify-Standardmerkmale `shopify.skirt-dress-length-type` (Kategorien Dresses aa-1-4,
Skirts aa-1-15 …) und `shopify.sleeve-length-type` (Dresses, Clothing Tops aa-1-13 …) sind am 06.10. aktiviert worden
(standardMetaobjectDefinitionEnable + standardMetafieldDefinitionEnable; «pin» geht bei Kategorie-Feldern nicht).
Werte = Metaobjekte (label + taxonomy_reference) wie bei shopify.color-pattern (farbmuster_filter.py).
Den FILTER schaltet nur der Betreiber ein (Search & Discovery → Filter hinzufügen → «Rock-/Kleiderlänge», «Ärmellänge»).

REGEL: nur eindeutige Titelwörter; zwei verschiedene Werte im Titel = nichts schreiben; vorhandene Werte nie überschreiben;
nur Produkte, deren Kategorie die Feld-Bedingung erfüllt (sonst verwirft metafieldsSet die ganze Charge).
  python3 automation/kleider_merkmale.py            # trocken
  SCHARF=1 python3 automation/kleider_merkmale.py
  python3 automation/kleider_merkmale.py --selbsttest
"""
import collections, datetime, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
EXPORT = "/tmp/kleider_merkmale_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_kleider_merkmale.tsv")
BERICHT = os.path.join(REPO, "dropship", "KLEIDER-MERKMALE.md")
SCHARF = os.environ.get("SCHARF") == "1"
TV = "gid://shopify/TaxonomyValue/"

# key → (Metaobjekt-Typ, {wert: (Label, Taxonomie-Wert-ID)}) — IDs gemessen 06.10. am Attribut «Skirt/Dress length type»
# (TaxonomyAttribute/1190) und «Sleeve length type» (TaxonomyAttribute/15).
MERKMALE = {
    "skirt-dress-length-type": ("shopify--skirt-dress-length-type", {
        "maxi": ("Maxi (bodenlang)", "167"), "midi": ("Midi", "168"), "knie": ("Knielang", "21911"), "mini": ("Mini", "21913")}),
    "sleeve-length-type": ("shopify--sleeve-length-type", {
        "lang": ("Langarm", "17094"), "kurz": ("Kurzarm", "169"), "dreiviertel": ("3/4-Arm", "1405"),
        "aermellos": ("Ärmellos", "174"), "spaghetti": ("Spaghettiträger", "176"), "traegerlos": ("Trägerlos", "177")}),
}
LAENGE = [   # (Muster, Wert) — alle Treffer werden gesammelt; mehr als ein Wert = uneindeutig
    (r"maxi|bodenlang|knöchellang|\blange[sr]? [\wäöü-]*(?:kleid|rock)\b|(?<!arm)lang(?:e[sr]?)?-?kleid", "maxi"),
    (r"midi|wadenlang", "midi"),
    (r"knielang|knee", "knie"),
    (r"\bmini|minikleid|minirock|\bkurze[sr]? [\wäöü-]*(?:kleid|rock)\b|(?<!arm)kurz(?:e[sr]?)?-?kleid", "mini"),
]
AERMEL = [
    (r"langarm|langärm|lange ärmel|long[- ]sleeve", "lang"),
    (r"kurzarm|kurzärm|kurze ärmel|short[- ]sleeve", "kurz"),
    (r"3/4[- ]?arm|dreiviertel|3/4-ärm", "dreiviertel"),
    (r"ärmellos|ohne ärmel|sleeveless|tanktop|trägertop", "aermellos"),
    (r"spaghetti", "spaghetti"),
    (r"trägerlos|bandeau|strapless", "traegerlos"),
]


def eindeutig(regeln, titel):
    t = (titel or "").lower()
    treffer = {w for m, w in regeln if re.search(m, t)}
    for genauer in ("spaghetti", "traegerlos"):   # «ärmelloses Kleid mit Spaghettiträgern» = Spaghetti (genauer)
        if genauer in treffer and "aermellos" in treffer:
            treffer.discard("aermellos")
    return treffer.pop() if len(treffer) == 1 else (None if not treffer else "UNEINDEUTIG")


def export_holen():
    from kaufwille_zeile import gql
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 6 * 3600:
        return
    q = ('{ products(query:"status:active") { edges { node { id title category { id } '
         'l:metafield(namespace:"shopify", key:"skirt-dress-length-type") { value } '
         'a:metafield(namespace:"shopify", key:"sleeve-length-type") { value } } } } }')
    b = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}", {"q": q})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise SystemExit(f"Bulk: {b['userErrors']}")
    for _ in range(240):
        time.sleep(15)
        s = gql("query($i:ID!){node(id:$i){... on BulkOperation{status url objectCount errorCode}}}", {"i": b["bulkOperation"]["id"]})["node"]
        if s["status"] == "COMPLETED":
            urllib.request.urlretrieve(s["url"], EXPORT + ".teil"); os.replace(EXPORT + ".teil", EXPORT); return
        if s["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {s['status']} {s['errorCode']}")
    raise SystemExit("Bulk: Zeitüberschreitung")


def erlaubt(key):
    from kaufwille_zeile import gql
    ja, cur = set(), None
    while True:
        r = gql('query($k:String!,$c:String){d:metafieldDefinition(identifier:{ownerType:PRODUCT,namespace:"shopify",key:$k})'
                '{constraints{values(first:250,after:$c){nodes{value} pageInfo{hasNextPage endCursor}}}}}', {"k": key, "c": cur})
        if not r["d"]:
            raise SystemExit(f"Feld shopify.{key} nicht aktiviert")
        v = r["d"]["constraints"]["values"]; ja |= {n["value"] for n in v["nodes"]}
        if not v["pageInfo"]["hasNextPage"]:
            return ja
        cur = v["pageInfo"]["endCursor"]


def metaobjekte(key):
    from kaufwille_zeile import gql
    typ, werte = MERKMALE[key]
    da = {n["handle"]: n["id"] for n in gql('query($t:String!){metaobjects(type:$t,first:100){nodes{id handle}}}', {"t": typ})["metaobjects"]["nodes"]}
    aus = {}
    for w, (label, tv) in werte.items():
        h = f"lux-{key[:6]}-{w}"
        if h in da:
            aus[w] = da[h]; continue
        if not SCHARF:
            aus[w] = f"(neu:{h})"; continue
        m = gql('mutation($m:MetaobjectCreateInput!){metaobjectCreate(metaobject:$m){metaobject{id} userErrors{field message}}}',
                {"m": {"type": typ, "handle": h, "fields": [{"key": "label", "value": label}, {"key": "taxonomy_reference", "value": TV + tv}]}})["metaobjectCreate"]
        if m["userErrors"]:
            raise SystemExit(f"Metaobjekt {h}: {m['userErrors']}")
        aus[w] = m["metaobject"]["id"]; print(f"  + Metaobjekt {label} {aus[w]}")
    return aus


def main():
    from kaufwille_zeile import gql
    export_holen()
    ok_l, ok_a = erlaubt("skirt-dress-length-type"), erlaubt("sleeve-length-type")
    mo = {"skirt-dress-length-type": metaobjekte("skirt-dress-length-type"), "sleeve-length-type": metaobjekte("sleeve-length-type")}
    stat = collections.Counter(); jobs = []; bsp = collections.defaultdict(list)
    for l in open(EXPORT, encoding="utf-8"):
        p = json.loads(l)
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        for key, ok, regeln, alt in (("skirt-dress-length-type", ok_l, LAENGE, p.get("l")), ("sleeve-length-type", ok_a, AERMEL, p.get("a"))):
            if cid not in ok:
                continue
            w = eindeutig(regeln, p["title"])
            if not w:
                stat[f"{key[:6]} ohne Titelwort"] += 1; continue
            if w == "UNEINDEUTIG":
                stat[f"{key[:6]} uneindeutig"] += 1
                if len(bsp["u"]) < 8: bsp["u"].append(p["title"][:70])
                continue
            if alt:
                stat[f"{key[:6]} schon gesetzt"] += 1; continue
            jobs.append((p["id"], key, w)); stat[f"{key[:6]} → {w}"] += 1
            if len(bsp[w]) < 3: bsp[w].append(p["title"][:60])
    print("Stand:", dict(sorted(stat.items())))
    for w, t in bsp.items():
        print(f"  {w}: {t}")
    gesetzt = fehler = 0
    if SCHARF and jobs:
        led = open(LEDGER, "a", encoding="utf-8")
        for i in range(0, len(jobs), 25):
            ch = jobs[i:i + 25]
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{id} userErrors{field message}}}',
                    {"m": [{"ownerId": pid, "namespace": "shopify", "key": k, "type": "list.metaobject_reference",
                            "value": json.dumps([mo[k][w]])} for pid, k, w in ch]})["metafieldsSet"]
            st = "fehler" if r["userErrors"] else "gesetzt"
            for pid, k, w in ch:
                led.write(f"{pid}\t{st}\t{k}\t{w}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
            gesetzt += len(ch) * (st == "gesetzt"); fehler += len(ch) * (st == "fehler")
            if r["userErrors"]:
                print("  Fehler:", r["userErrors"][:2])
            led.flush()
        led.close()
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Kleider-Merkmale Länge/Ärmel ({datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC, {'SCHARF' if SCHARF else 'TROCKEN'})\n\n"
                "Werkzeug `automation/kleider_merkmale.py`. Filter einschalten: Search & Discovery → Filter → «Rock-/Kleiderlänge», «Ärmellänge».\n\n"
                "| Zustand | Produkte |\n|---|---:|\n" + "".join(f"| {k} | {v} |\n" for k, v in sorted(stat.items())) +
                (f"| **geschrieben** | {gesetzt} (Fehler {fehler}) |\n" if SCHARF else ""))
    print(f"KLEIDER-MERKMALE: {len(jobs)} Werte{f' · gesetzt {gesetzt} · fehler {fehler}' if SCHARF else ' (TROCKEN)'}")
    return 0


def selbsttest():
    t = [
        (eindeutig(LAENGE, "Elegantes Langarm-Midikleid mit Schlitz") == "midi", "Langarm-Midikleid = Midi"),
        (eindeutig(AERMEL, "Elegantes Langarm-Midikleid mit Schlitz") == "lang", "… und Langarm"),
        (eindeutig(LAENGE, "Boho Maxikleid mit Blumen") == "maxi", "Maxi"),
        (eindeutig(LAENGE, "Langes Strickkleid") == "maxi", "Langes Kleid = Maxi"),
        (eindeutig(LAENGE, "Langarm-Kleid in Schwarz") is None, "Kanarie: Langarm-Kleid ≠ lang"),
        (eindeutig(LAENGE, "Kurzarm-Kleid Sommer") is None, "Kanarie: Kurzarm-Kleid ≠ kurz"),
        (eindeutig(LAENGE, "Minirock Leder") == "mini", "Minirock"),
        (eindeutig(LAENGE, "Maxi- oder Minikleid 2in1") == "UNEINDEUTIG", "zwei Längen = nichts"),
        (eindeutig(AERMEL, "Ärmelloses Sommerkleid") == "aermellos", "Ärmelloses = ärmellos"),
        (eindeutig(LAENGE, "Kurzes Spitzenkleid") == "mini", "Kurzes Kleid = Mini"),
        (eindeutig(AERMEL, "Sommerkleid ärmellos mit V-Ausschnitt") == "aermellos", "ärmellos"),
        (eindeutig(AERMEL, "Spaghettiträger-Kleid") == "spaghetti", "Spaghetti"),
        (eindeutig(AERMEL, "Bandeau-Kleid trägerlos") == "traegerlos", "trägerlos"),
        (eindeutig(LAENGE, "Knielanges Etuikleid") == "knie", "Knielang"),
        (eindeutig(LAENGE, "Midilanges Damen-Strickkleid") == "midi", "Midilang = Midi"),
        (eindeutig(AERMEL, "Enges ärmelloses Minikleid mit Spaghettiträgern") == "spaghetti", "ärmellos+Spaghetti = Spaghetti"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
