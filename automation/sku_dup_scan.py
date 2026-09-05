"""Findet Produkte, die dieselbe Lieferanten-SKU tragen = derselbe Artikel doppelt importiert.

ANLASS (User-Fund 2026-08-09): In `werkzeug-maschinen` standen zwei Kartenpaare direkt
nebeneinander — «Stossfestes Edelstahl-Manometer» / «Stossfestes Manometer aus Edelstahl»
(beide CHF 131.90) und «Professioneller Golf-Entfernungsmesser» / «Profi Golf-Entfernungsmesser
& Monokular» (beide CHF 69.90). Gleiches Bild, gleicher Preis — **und gleiche SKU**.

Warum die frueheren Detektoren das durchgelassen haben:
 - Titel-Dedup: die Titel sind UMFORMULIERT (Wortstellung, Synonyme) -> normalisiert nicht gleich
 - Bild-Dedup: CJ laedt dasselbe Bild pro Listing unter NEUER CDN-URL hoch -> URLs verschieden
Die SKU ist der einzige Anker, der beides ueberlebt.

⚠️ NICHT jede geteilte SKU ist eine Dublette: POD-Rohlinge (T-Shirts, Tassen, Sticker, Poster)
teilen sich legitim eine Blank-SKU ueber viele Designs. Die sind ausgenommen.

Behalten wird die VOLLSTAENDIGSTE Fassung (meiste Varianten), bei Gleichstand die aelteste;
der Rest geht auf DRAFT + Tag `duplikat-auto-draft` — nie geloescht.
DRY=1 meldet nur.
"""
import json, subprocess, os, re, time, collections

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_sku_dup_done.txt"

# POD-Rohlinge teilen sich legitim SKUs ueber viele Designs
POD = re.compile(r'^(9000001|GLOBAL-|POD-|SHIRT-|TASSE-)', re.I)


def gql(q, v=None):
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def sammeln():
    cur, out = None, []
    while True:
        d = gql('''query($c:String){products(first:200,after:$c,query:"status:ACTIVE",
                 sortKey:CREATED_AT){pageInfo{hasNextPage endCursor}
                 nodes{ id title createdAt
                   priceRangeV2{minVariantPrice{amount}}
                   variantsCount{count}
                   variants(first:1){nodes{sku}} }}}''', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            break
        for p in pg["nodes"]:
            v = p["variants"]["nodes"]
            sku = (v[0]["sku"] if v else "") or ""
            if not sku or POD.match(sku):
                continue
            out.append((sku.strip().upper(), p["id"], p["title"], p["createdAt"],
                        p["priceRangeV2"]["minVariantPrice"]["amount"],
                        (p.get("variantsCount") or {}).get("count") or 1))
        if len(out) % 4000 < 200:
            print(f"  gesammelt {len(out)}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    return out


def main():
    rows = sammeln()
    g = collections.defaultdict(list)
    for sku, gid, titel, erstellt, preis, nvar in rows:
        # Sortierschluessel: MEISTE Varianten zuerst, dann aeltestes.
        # Nur "aeltestes behalten" waere falsch: bei gleicher SKU deckt eine Fassung oft mehr
        # Groessen/Farben ab (Lehre aus dem Kostuem-Fall). Wer die vollstaendigere draftet,
        # nimmt dem Kunden Auswahl weg.
        g[sku].append((-nvar, erstellt, gid, titel, preis, nvar))
    dubl = {k: sorted(v) for k, v in g.items() if len(v) > 1}
    betroffen = sum(len(v) for v in dubl.values())
    print(f"\n{len(rows)} Produkte mit SKU | {len(dubl)} SKUs doppelt vergeben | "
          f"{betroffen} Produkte betroffen | {betroffen - len(dubl)} zu draften", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for sku, v in sorted(dubl.items(), key=lambda x: -len(x[1])):
        behalten = v[0]
        for _, erstellt, gid, titel, preis, nvar in v[1:]:
            if gid in done:
                continue
            n += 1
            if n <= 25:
                print(f"  [{sku}] behalte «{behalten[3][:34]}» ({behalten[5]} Var.) "
                      f"→ drafte «{titel[:34]}» ({nvar} Var., CHF {preis})", flush=True)
            if DRY:
                continue
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "status": "DRAFT"}})
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": ["duplikat-auto-draft"]})
            f.write(f"{gid}\t{sku}\t{titel}\n"); f.flush()
            time.sleep(0.25)
    print(f"\n{'(DRY) ' if DRY else ''}{n} Dubletten {'gefunden' if DRY else 'gedraftet'}")


if __name__ == "__main__":
    main()
