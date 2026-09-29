#!/usr/bin/env python3
"""google_kategorie_fein.py — «Kleidung (allgemein)» bei Google in die echte Unterkategorie einordnen (29.09.2026).

GEMESSEN (Bulk-Export 49'237 aktive): 7'254 Produkte tragen `mm-google-shopping.google_product_category` =
«Apparel & Accessories > Clothing» — Mäntel, Röcke, Hemden, Leggings, Bademode alle unter demselben groben Pfad. Google
ordnet Gratis-Einträge nach Suchanfrage und Kategorie zu; wer «Abendkleid» sucht, soll ein Kleid finden, nicht «Kleidung».
Anlass: Maxi-Kleid «Aria» (Nachfrage-Liebling) stand wegen «mit Gürtel» auf «Belts» (Betreiber «google push?» / «noch mehr?»).

REGEL: NUR Produkte, deren Wert GENAU «Apparel & Accessories > Clothing» ist, bekommen per Titelregel (Reihenfolge = Vorrang,
deutsche Komposita: Warenwort am Ende → `\\w*wort\\b`) die Unterkategorie; jeder Zielpfad wird gegen Googles Taxonomie geprüft
(unbekannter Pfad → Abbruch, nichts geschrieben). Kein Treffer = bleibt grob (nicht raten). Kinder-/Baby-/Kostüm-Titel bleiben
aussen vor (eigene Google-Zweige). Schreiben: metafieldsSet in 25er-Blöcken, Eimer-Etikette, Rücklesen aus der Antwort,
Ledger dropship/_google_kategorie_fein.tsv. EXPORT=/pfad.jsonl (Bulk-Export mit metafield) sonst eigener Bulk-Export.
DRY=1 zeigt nur. Täglich im Aufseher → neue Importe werden mit eingeordnet.
"""
import collections, json, os, re, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
GROB = "Apparel & Accessories > Clothing"
LEDGER = os.path.join(REPO, "dropship/_google_kategorie_fein.tsv")
TAXO = os.environ.get("TAXO", "/tmp/gtaxo.txt")
SCHARF = os.environ.get("DRY") != "1"
C = "Apparel & Accessories > Clothing > "

AUSSEN = re.compile(r"kinder|kids|baby|mädchen|\bfür jungen\b|\bjungen-|kleinkind|kostüm|verkleidung|puppe", re.I)
REGELN = [
    (r"\w*schal\b|\bschals\b|halstuch|stola", "Apparel & Accessories > Clothing Accessories > Scarves & Shawls"),
    (r"trainingsanzug|jogginganzug|sportanzug", C + "Activewear"),
    (r"pyjama|schlafanzug|nachthemd|bademantel|morgenmantel|loungewear|homewear|nachtwäsche", C + "Sleepwear & Loungewear"),
    (r"bikini|badeanzug|badehose|bademode|tankini|swimsuit|monokini|badeshorts|cover-?up", C + "Swimwear"),
    (r"unterwäsche|boxershorts|unterhose|\bslips?\b|\bbh\b|\bbra\b|bralette|\bbriefs\b|socken|strumpfhose|strümpfe|dessous|\bbody\b|shapewear|mieder|korsett|taillenformer", C + "Underwear & Socks"),
    (r"\bset\b|\bsets\b|[23]-teilig|zwei-?teilig|drei-?teilig|\bkombi\b", C + "Outfit Sets"),
    (r"jumpsuit|overall|romper|playsuit|einteiler", C + "One-Pieces > Jumpsuits & Rompers"),
    (r"leggings|yoga|sport-?bh|fitness|laufshirt|radhose", C + "Activewear"),
    (r"\w*kleid\b|\bdress\b|sommerkleid", C + "Dresses"),
    (r"\w*rock\b|\bskirt\b|\w*jupes?\b", C + "Skirts"),
    (r"strickjacke|cardigan", C + "Shirts & Tops"),
    (r"\w*weste\b|\bgilet\b", C + "Outerwear > Vests"),
    (r"\w*jacke\b|\w*mantel\b|trenchcoat|\bparka\b|blazer|bomber|windbreaker|daunen|\bcoat\b|\bjacket\b|anorak", C + "Outerwear > Coats & Jackets"),
    (r"\w*shorts\b|bermuda|kurze hose", C + "Shorts"),
    (r"\w*hosen?\b|\w*jeans\b|\w*pants\b|jogger|chino|culotte|trousers", C + "Pants"),
    (r"shirt|\w*hemd\b|bluse|\w*tops?\b|\bcami\b|pullunder|pullover|\bpulli\b|sweatshirt|hoodie|tunika|\bpolo\b|camisole|tanktop|oberteil|sweater|longsleeve|\bcrop\b", C + "Shirts & Tops"),
    (r"\w*anzug\b|\bsuit\b|smoking", C + "Suits"),
]
_R = [(re.compile(m, re.I), z) for m, z in REGELN]


def ziel(titel):
    if AUSSEN.search(titel or ""):
        return None
    for rx, z in _R:
        if rx.search(titel or ""):
            return z
    return None


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    grund = ""
    for a in range(8):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=90))
            if d.get("data") is not None and not d.get("errors"):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                if ts and ts.get("currentlyAvailable", 1000) < 400:      # Eimer-Etikette
                    time.sleep(3)
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:160]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:160]
        time.sleep(3 + 3 * a)
    print(f"gql: letzter Grund: {grund}", file=sys.stderr)
    raise RuntimeError(f"Shopify antwortet nicht ({grund}) — Lauf abgebrochen, nichts quittiert")


def taxonomie():
    if not os.path.exists(TAXO) or os.path.getsize(TAXO) < 100000:
        urllib.request.urlretrieve("https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt", TAXO)
    return {l.split(" - ", 1)[1].strip() for l in open(TAXO, encoding="utf-8") if " - " in l}


def export():
    pfad = os.environ.get("EXPORT")
    if pfad and os.path.exists(pfad):
        return [json.loads(l) for l in open(pfad)]
    inner = ('{ products(query:"status:active") { edges { node { id handle title '
             'metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } } } } }')
    b = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}', {"q": inner})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise RuntimeError("Bulk-Export: " + b["userErrors"][0]["message"])
    bid = b["bulkOperation"]["id"]
    for _ in range(120):
        n = gql('query($i:ID!){node(id:$i){... on BulkOperation{status url errorCode}}}', {"i": bid})["node"]
        if n["status"] in ("COMPLETED", "FAILED", "CANCELED"):
            break
        time.sleep(10)
    if n["status"] != "COMPLETED" or not n["url"]:
        raise RuntimeError(f"Bulk-Export {n['status']} {n.get('errorCode')}")
    ziel_ = "/tmp/gkat_fein_export.jsonl"
    urllib.request.urlretrieve(n["url"], ziel_)
    return [json.loads(l) for l in open(ziel_)]


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: Google-Kategorie fein · {'SCHARF' if SCHARF else 'TROCKEN'}")
    gueltig = taxonomie()
    for _, z in REGELN:
        if z not in gueltig:
            raise RuntimeError(f"Google-Pfad unbekannt: {z} — nichts geschrieben")
    rows = [r for r in export() if ((r.get("metafield") or {}).get("value") or "") == GROB]
    plan, offen = [], []
    for r in rows:
        z = ziel(r.get("title", ""))
        (plan if z else offen).append((r["id"], r.get("handle", ""), r.get("title", ""), z))
    zaehl = collections.Counter(z.replace(C, "") for *_, z in plan)
    print(f"grob «Clothing»: {len(rows)} · einordenbar {len(plan)} · bleibt grob {len(offen)}")
    for k, v in zaehl.most_common():
        print(f"  {v:5d}  {k}")
    if not SCHARF:
        import random
        random.seed(7)
        for k in zaehl:
            bsp = [t for _, _, t, z in plan if z.replace(C, "") == k][:200]
            print(f"\n[{k}] Stichprobe:", " | ".join(t[:45] for t in random.sample(bsp, min(6, len(bsp)))))
        print("\n[bleibt grob] Stichprobe:", " | ".join(t[:40] for *_, t, _ in random.sample(offen, min(12, len(offen)))))
        return
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for i in range(0, len(plan), 25):
            teil = plan[i:i + 25]
            m = [{"ownerId": pid, "namespace": "mm-google-shopping", "key": "google_product_category",
                  "type": "single_line_text_field", "value": z} for pid, _, _, z in teil]
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{message}}}',
                    {"m": m})["metafieldsSet"]
            if r["userErrors"]:
                fehl += len(teil)
                print("  Fehler:", r["userErrors"][0]["message"])
                continue
            gesetzt = {(x["owner"] or {}).get("id"): x["value"] for x in r["metafields"]}
            for pid, h, _, z in teil:
                if gesetzt.get(pid) == z:
                    ok += 1
                    f.write(f"{h}\t{GROB}\t{z}\n")
                else:
                    fehl += 1
    print(f"FERTIG: {ok} eingeordnet, {fehl} Fehler, {len(offen)} bleiben grob")


if __name__ == "__main__":
    main()
