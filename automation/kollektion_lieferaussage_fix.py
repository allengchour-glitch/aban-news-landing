"""Korrigiert Schweizer Lieferversprechen in Kollektionsbeschreibungen, wo sie nicht zutreffen.

GEMESSEN (2026-08-10): 26 Kollektionen werben mit «Blitzversand aus der Schweiz» oder
«schnelle Lieferung aus der Schweiz». Für jede wurde der Anteil an Ware mit Schweizer Lager
bestimmt (Tag `ch-lager` oder Fortura-SKU, Stichprobe bis 60 Produkte):

  berechtigt:  party-deko-ch, blitzversand-schweiz, ft-herrenkostuem, ft-kinderkostuem,
               ft-maske, ft-pluesch (je 100 %), beauty-haar (76 %)
  unzutreffend: uhren-damen, uhren-herren, elektronik-audio/-laden/-handy, licht-* (0 %),
               wohnen-bad/-aufbewahrung/-kueche, beauty-naegel, beauty-duefte, schuhe-absatz,
               damen-jacken, haustier-napf-futter (0–8 %)

Wo die Ware aus China kommt, ist «Blitzversand aus der Schweiz» schlicht falsch — und
ausgerechnet solche Versprechen holen Bestellungen herein, die dann enttäuscht werden.
Was stimmt und trotzdem trägt: der Shop ist schweizerisch, liefert in die ganze Schweiz und
bietet Rechnungskauf.

Die Schwelle liegt bei 50 %: darunter wird umformuliert, darüber bleibt die Aussage stehen.
Es werden nur die Lieferfloskeln ersetzt, kein sonstiger Text.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
SCHWELLE = int(os.environ.get("SCHWELLE", "50"))
LEDGER = "dropship/_kollektion_lieferaussage.txt"

ERSETZUNGEN = [
    (re.compile(r'Blitzversand aus der Schweiz', re.I), 'Schweizer Online-Shop'),
    (re.compile(r'blitzschnell aus der Schweiz', re.I), 'in die ganze Schweiz'),
    (re.compile(r'schnelle Lieferung aus der Schweiz', re.I), 'Lieferung in die ganze Schweiz'),
    (re.compile(r'[Ss]chnell geliefert aus der Schweiz', re.I), 'Lieferung in die ganze Schweiz'),
    (re.compile(r'[Gg]eliefert aus der Schweiz', re.I), 'Lieferung in die ganze Schweiz'),
    (re.compile(r'direkt aus der Schweiz', re.I), 'in die ganze Schweiz'),
    (re.compile(r'Aus der Schweiz, 1\s*[–-]\s*2 Tage', re.I), 'Lieferung in die ganze Schweiz'),
    (re.compile(r'Lieferung in 1\s*[–-]\s*2 Werktagen', re.I), 'Lieferung in die ganze Schweiz'),
    (re.compile(r'aus der Schweiz', re.I), 'in die ganze Schweiz'),
]


def gql(q, v=None):
    with open("/tmp/_kl.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(3):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kl.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(2)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def ch_anteil(handle):
    d = gql('query($h:String!){collectionByHandle(handle:$h){products(first:60){nodes{tags '
            'variants(first:1){nodes{sku}}}}}}', {"h": handle})
    ns = (((d.get("data") or {}).get("collectionByHandle") or {}).get("products") or {}).get("nodes") or []
    if not ns:
        return None
    ch = sum(1 for p in ns if "ch-lager" in p["tags"]
             or ((p["variants"]["nodes"][0]["sku"] if p["variants"]["nodes"] else "") or "").lower().startswith("fortura-"))
    return 100 * ch // len(ns)


def main():
    cur, ziel = None, []
    while True:
        d = gql('query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{id handle title descriptionHtml}}}', {"c": cur})
        pg = (d.get("data") or {}).get("collections")
        if not pg:
            break
        for n in pg["nodes"]:
            txt = re.sub(r'<[^>]+>', ' ', n["descriptionHtml"] or "")
            if re.search(r'aus der Schweiz|Blitzversand', txt, re.I):
                ziel.append(n)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"Kollektionen mit Schweiz-Lieferaussage: {len(ziel)}", flush=True)

    f = open(LEDGER, "a")
    geaendert = behalten = unklar = 0
    for n in ziel:
        q = ch_anteil(n["handle"])
        if q is None:
            unklar += 1
            print(f"  ❔ {n['handle']}: keine Produkte lesbar — unangetastet", flush=True)
            continue
        if q >= SCHWELLE:
            behalten += 1
            print(f"  ✅ {n['handle']:<30} {q:>3}% Schweizer Lager — Aussage bleibt", flush=True)
            continue
        alt = n["descriptionHtml"] or ""
        neu = alt
        for rx, rep in ERSETZUNGEN:
            neu = rx.sub(rep, neu)
        neu = re.sub(r'\s{2,}', ' ', neu)
        if neu == alt:
            continue
        geaendert += 1
        print(f"  ✏️  {n['handle']:<30} {q:>3}% → umformuliert", flush=True)
        if geaendert <= 4:
            print("      alt:", re.sub(r'<[^>]+>', ' ', alt)[:110].strip())
            print("      neu:", re.sub(r'<[^>]+>', ' ', neu)[:110].strip())
        if DRY:
            continue
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": n["id"], "descriptionHtml": neu}})
        errs = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        if errs:
            print(f"      ⚠️ {errs}", flush=True)
            continue
        f.write(f"{n['handle']}\t{q}%\tumformuliert\n"); f.flush()
        time.sleep(0.3)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {geaendert} umformuliert, {behalten} berechtigt "
          f"belassen, {unklar} unklar")


if __name__ == "__main__":
    main()
