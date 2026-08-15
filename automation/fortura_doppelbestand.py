"""Beendet den Doppelverkauf desselben Fortura-Lagerbestands.

DER BEFUND (Fehlersuche 14.08., live neu vermessen über einen Bulk-Export): 32 Fortura-SKUs
stehen in ZWEI aktiven Produkten gleichzeitig, beide tracked — «Kostüm Cowboy» und
«Kinderkostüm Cowboy» zeigen beide die 4 vorhandenen Stück, der Shop kann also 8 verkaufen.
Genau das Muster der Ghost-Sale-Bestellungen #1006/#1008/#1009: verkauft, kassiert, dann
zwangsweise rückerstattet, weil die Ware nicht existiert. 88 % des bisherigen Bruttoumsatzes
gingen so verloren.

⚠️ 13 WEITERE DOPPEL-SKUS SIND KEINE DUBLETTEN UND BLEIBEN UNANGETASTET: AliExpress-
Attributstrings wie «14:193;5:361386» stehen an völlig verschiedenen Produkten (Stoffhose,
Hemd, Jacke) — das ist dieselbe Müll-SKU an fremder Ware, kein geteilter Bestand. Ein Lauf,
der stumpf «gleiche SKU → draften» arbeitet, würde gesunde Produkte abschalten.

DIE ENTSCHEIDUNG, WER BLEIBT: Je Paar wird geprüft, ob die getrackten SKUs des einen
Produkts eine TEILMENGE des anderen sind. Das Einzelgrössen-Produkt («Kostüm Sträfling
Grösse XXXL») ist Teilmenge des Sammelprodukts («Sträflingskostüm» mit allen Grössen) → das
Sammelprodukt bleibt, die Einzelgrösse geht auf DRAFT mit Tag `duplikat-auto-draft` (Regel:
NIE löschen — reversibel). Ist KEINES Teilmenge (die zwei «Dirndl antikblau»/«Dirndl
hellblau» teilen sich SKUs, haben aber auch eigene), wird NICHTS gedraftet, sondern nur
gemeldet: dort ist unklar, welcher Farbname stimmt, und eine falsche Wahl nähme echte Ware
vom Markt.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time
from collections import defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUELLE = os.environ.get("QUELLE", "/tmp/skus.jsonl")
LEDGER = "dropship/_fortura_doppelbestand.txt"


def gql(q, v=None):
    with open("/tmp/_fd.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_fd.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
    return {}


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    titel = {}
    skus = defaultdict(set)          # pid -> getrackte SKUs
    nach_sku = defaultdict(set)      # sku -> pids
    for l in open(QUELLE):
        d = json.loads(l)
        if "__parentId" not in d:
            titel[d["id"]] = d.get("title", "")
            continue
        sku = (d.get("sku") or "").strip()
        if not sku or not ((d.get("inventoryItem") or {}).get("tracked")):
            continue
        if re.match(r'^\d+:\d+;', sku):
            continue                                     # AliExpress-Attributstring
        skus[d["__parentId"]].add(sku)
        nach_sku[sku].add(d["__parentId"])

    paare = set()
    for sku, pids in nach_sku.items():
        if len(pids) >= 2:
            pl = sorted(pids)
            for i in range(len(pl)):
                for j in range(i + 1, len(pl)):
                    paare.add((pl[i], pl[j]))

    draften, unklar = [], []
    for a, b in sorted(paare):
        sa, sb = skus[a], skus[b]
        if sa <= sb and a not in erledigt:
            draften.append((a, b))                       # a ist Teilmenge → a weicht
        elif sb <= sa and b not in erledigt:
            draften.append((b, a))
        elif not (sa <= sb or sb <= sa):
            unklar.append((a, b, len(sa & sb)))
    print(f"Paare mit geteiltem tracked-Bestand: {len(paare)} — "
          f"{len(draften)} Teilmengen (weichen), {len(unklar)} unklar (bleiben)", flush=True)
    for weg, bleibt in draften[:10]:
        print(f"   DRAFT  {titel.get(weg,'?')[:42]:<44} → bleibt: {titel.get(bleibt,'?')[:36]}")
    for a, b, n in unklar:
        print(f"   ⚠️ unklar ({n} gemeinsame SKUs): {titel.get(a,'?')[:34]} ↔ {titel.get(b,'?')[:34]}")
    if DRY:
        return

    f = open(LEDGER, "a")
    getan = 0
    for weg, bleibt in draften:
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": weg, "status": "DRAFT"}})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": weg, "t": ["duplikat-auto-draft", "doppelbestand-fortura"]})
        getan += 1
        f.write(f"{weg}\tdraft\tbleibt:{bleibt}\t{titel.get(weg,'')[:50]}\n")
        f.flush()
        time.sleep(0.3)
    for a, b, n in unklar:
        f.write(f"{a}\tunklar-mit:{b}\tgemeinsame:{n}\n")
    f.flush()
    print(f"FERTIG: {getan} Doppelgänger auf DRAFT (reversibel), {len(unklar)} unklare Paare gemeldet.")


if __name__ == "__main__":
    main()
