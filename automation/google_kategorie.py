"""Setzt die Google-Produktkategorie aus den gepflegten Katalog-Tags.

WARUM DAS ZÄHLT: Die Produktkategorie entscheidet, bei welchen Suchen ein Artikel überhaupt
erscheinen kann. Fehlt sie, rät Google — und rät bei fremdsprachigen Katalogtiteln oft daneben.
Im Google-Kanal stehen 25'357 Produkte, aber nur **1'550 (6 %)** haben das Feld
`mm-google-shopping.google_product_category`.

UND DIE VORHANDENEN SIND TEILS FALSCH. Stichprobe aus dem Bestand:

    «LED Solar-Lichterkette XL – 8 Leuchtmodi»   → Apparel & Accessories > Jewelry
    «LED Schreibtischlampe Dimmbar»              → Apparel & Accessories > Clothing Accessories

Beides sind Lampen. Die Werte stammen aus einem ungeprüften Sprachmodell-Durchlauf; wer sie
stehen lässt, bewirbt Lampen als Schmuck. Deshalb wird ein vorhandener Wert überschrieben,
sobald die Tags eindeutig etwas anderes sagen.

DIE QUELLE IST BEWUSST NICHT DER TITEL, sondern die Kategorie-Tags aus `cat_tags.mjs`. Die sind
gepflegt, deutsch gedacht und kennen die Zusammensetzungs-Fallen (armband**uhr** ≠ Armband,
**Hand**schuh ≠ Schuh). Ein zweiter Titel-Rater würde genau die Fehler wiederholen, die dieses
Skript aufräumt.

REIHENFOLGE ZÄHLT: Die Liste wird von oben nach unten geprüft, das erste passende Tag gewinnt.
Spezifisches steht deshalb vor Allgemeinem — sonst würde «schmuck» die Halsketten schlucken.

Format: Google akzeptiert den vollen Pfad als Text; genau so liegen die vorhandenen Werte im
Shop («Apparel & Accessories > Jewelry > Watches», Typ single_line_text_field). Nummern-IDs
werden bewusst NICHT verwendet — eine falsch erinnerte Zahl fällt niemandem auf, ein falscher
Pfad schon.

DRY=1 meldet nur und zeigt Stichproben je Kategorie.
"""
import json, os, subprocess, time
from collections import Counter, defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_google_kategorie.txt"
FELD = "google_product_category"

# (Tag, Google-Pfad) — von spezifisch nach allgemein.
REGELN = [
    ("kategorie-halskette", "Apparel & Accessories > Jewelry > Necklaces"),
    ("halskette",           "Apparel & Accessories > Jewelry > Necklaces"),
    ("kategorie-ohrring",   "Apparel & Accessories > Jewelry > Earrings"),
    ("ohrringe",            "Apparel & Accessories > Jewelry > Earrings"),
    ("kategorie-armband",   "Apparel & Accessories > Jewelry > Bracelets"),
    ("kategorie-ring",      "Apparel & Accessories > Jewelry > Rings"),
    ("kategorie-uhr",       "Apparel & Accessories > Jewelry > Watches"),
    ("uhren",               "Apparel & Accessories > Jewelry > Watches"),
    ("sonnenbrille",        "Apparel & Accessories > Clothing Accessories > Sunglasses"),
    ("kategorie-tasche",    "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damen-taschen",       "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damenschuhe",         "Apparel & Accessories > Shoes"),
    ("herrenschuhe",        "Apparel & Accessories > Shoes"),
    ("schuhe",              "Apparel & Accessories > Shoes"),
    ("kategorie-kleid",     "Apparel & Accessories > Clothing > Dresses"),
    ("kat-damen-pullover",  "Apparel & Accessories > Clothing > Shirts & Tops"),
    ("schmuck",             "Apparel & Accessories > Jewelry"),
    ("haarstyling",         "Health & Beauty > Personal Care > Hair Care"),
    ("beauty",              "Health & Beauty > Personal Care > Cosmetics"),
    ("pflege",              "Health & Beauty > Personal Care"),
    ("haustier",            "Animals & Pet Supplies > Pet Supplies"),
    ("pet",                 "Animals & Pet Supplies > Pet Supplies"),
    ("beleuchtung",         "Home & Garden > Lighting"),
    ("kueche",              "Home & Garden > Kitchen & Dining"),
    ("dekoration",          "Home & Garden > Decor"),
    ("aufbewahrung",        "Home & Garden > Household Supplies > Storage & Organization"),
    ("fitness",             "Sporting Goods > Exercise & Fitness"),
    ("elektronik",          "Electronics"),
    ("tech",                "Electronics"),
    ("kinder",              "Baby & Toddler"),
    # Ganz zuletzt das Grobe: «mode» trägt fast jedes Kleidungsstück, ist aber nur dann die
    # Antwort, wenn nichts Genaueres gegriffen hat.
    ("mode",                "Apparel & Accessories > Clothing"),
]


def gql(q, v=None):
    with open("/tmp/_gk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gk.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def kategorie(tags):
    t = {x.lower() for x in tags}
    for tag, pfad in REGELN:
        if tag in t:
            return pfad
    return None


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")

    cur, gesehen, gesetzt, korrigiert, ohne_regel = None, 0, 0, 0, 0
    verteilung, proben = Counter(), defaultdict(list)
    stapel = []
    while True:
        d = gql('query($c:String){products(first:150,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title tags '
                'g:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857") '
                'mf:metafield(namespace:"mm-google-shopping",key:"%s"){value}}}}' % FELD,
                {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Abbruch — Liste unvollständig", flush=True)
            break
        for p in pg["nodes"]:
            if not p["g"]:
                continue                      # nur was im Google-Kanal steht, zählt hier
            gesehen += 1
            if p["id"] in done:
                continue
            neu = kategorie(p["tags"])
            if not neu:
                ohne_regel += 1
                continue
            alt = ((p.get("mf") or {}) or {}).get("value")
            if alt == neu:
                continue
            if alt:
                korrigiert += 1
                if len(proben[neu]) < 2:
                    proben[neu].append(f"«{alt}» → {p['title'][:44]}")
            else:
                if len(proben[neu]) < 2:
                    proben[neu].append(p["title"][:52])
            verteilung[neu] += 1
            gesetzt += 1
            stapel.append({"ownerId": p["id"], "namespace": "mm-google-shopping",
                           "key": FELD, "type": "single_line_text_field", "value": neu})
            if len(stapel) >= 25 and not DRY:
                schreiben(stapel, f)
                stapel = []
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if gesehen % 6000 < 150:
            print(f"  … {gesehen} gesehen | {gesetzt} zu setzen", flush=True)
    if stapel and not DRY:
        schreiben(stapel, f)

    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gesehen} im Google-Kanal | {gesetzt} Kategorien "
          f"gesetzt (davon {korrigiert} falsche korrigiert) | {ohne_regel} ohne passende Regel")
    for pfad, n in verteilung.most_common():
        print(f"  {n:>5}  {pfad}")
        for b in proben[pfad]:
            print(f"          {b}")


def schreiben(stapel, f):
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": stapel})
    errs = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if errs:
        print(f"  ⚠️ {errs[0]['message']}", flush=True)
        return
    for m in stapel:
        f.write(f"{m['ownerId']}\t{m['value']}\n")
    f.flush()
    time.sleep(0.3)


if __name__ == "__main__":
    main()
