#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bewertungen_prio.py — baut die Arbeitsliste für den Bewertungs-Import: erst die Ware, die
Kundinnen wirklich SEHEN, danach die Warengruppen, in denen CJ überhaupt Kommentare hat.

BEFUND (05.09.2026): Von 187 Produkten in den sichtbaren Reihen hatten nur 23 eine Bewertung
(12 %) — und 21 davon stehen in `bestseller`, weil diese Reihe AUS den bewerteten Produkten
kuratiert wurde. Der tägliche Import lief mit `QUERY=tag:cj-real LIMIT=120`, also über eine
Zufallsscheibe von 53'000 Produkten; die Chance, dabei ein sichtbares zu treffen, ist ~0,3 %.

GEMESSEN, wo CJ Kommentare hat (126 sichtbare Produkte geprüft): 12 Treffer, 60 Bewertungen —
aber die Trefferquote ist stark warengruppenabhängig (Uhren 8/8 Kommentare je Produkt, Mode 0).
Deshalb die Reihenfolge: sichtbare Reihen zuerst, dann Uhren/Schmuck/Küche/Haustier.

Der Import selbst quittiert jedes geprüfte Produkt (`dropship/cj_reviews_done.txt`) — die Liste
schrumpft also von Lauf zu Lauf, und ein Container-Neustart kostet höchstens eine Charge.

Nutzung: python3 automation/bewertungen_prio.py   → dropship/_bewertungen_prio.txt (Handles)
"""
import json, os, time, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "cj_reviews_done.txt")
ZIEL = os.path.join(REPO, "dropship", "_bewertungen_prio.txt")
# Reihen der Startseite und die grossen Welten — was die Kundin zuerst sieht.
SICHTBAR = ["hype-jetzt", "bestseller", "neu-eingetroffen", "blitzversand-highlights", "damen-mode",
            "wohnen-dekoration", "fur-ihn", "schmuck-uhren", "schuhe-sneaker", "sub-baby-kids",
            "elektronik-technik", "handy-zubehoer", "gaming", "sub-haustier", "beauty-pflege",
            "auto-kfz-zubehoer", "querbeet", "sub-kueche", "uhren", "sub-taschen"]
# Warengruppen mit gemessen hoher Kommentar-Quote bei CJ.
GRUPPEN = ["status:active AND product_type:Uhren", "status:active AND product_type:Schmuck",
           "status:active AND tag:kueche", "status:active AND tag:haustier"]


def gql(q, v=None):
    for i in range(8):
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
                                     data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                     headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            time.sleep(2 + 2 * i); continue
        if d.get("data") is not None:
            return d
        time.sleep(2 + 2 * i)
    return {}


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0].strip() for l in open(LEDGER)}
    handles, gesehen = [], set()

    def nimm(nodes):
        for n in nodes:
            pid = n["id"].split("/")[-1]
            if pid in done or pid in gesehen:
                continue
            if n.get("rc") and int(n["rc"]["value"]) > 0:
                continue
            gesehen.add(pid); handles.append(n["handle"])

    # ZUERST die Produktseiten, auf denen tatsächlich jemand ankommt (30 Tage). Sie sind die
    # wertvollsten Bewertungsplätze des Shops: Suchbesucher haben Kaufabsicht, und die grösste
    # Such-Landeseite (Rizinusöl-Set) stand am 05.09. bei 0 Bewertungen.
    ql = ("FROM sessions SHOW sessions GROUP BY landing_page_path SINCE -30d UNTIL today "
          "ORDER BY sessions DESC LIMIT 60")
    d = (gql('query($q:String!){shopifyqlQuery(query:$q){tableData{columns{name} rows}}}', {"q": ql})
         .get("data") or {}).get("shopifyqlQuery") or {}
    pfade = []
    for row in ((d.get("tableData") or {}).get("rows") or []):
        pfad = row[0] if isinstance(row, list) else row.get("landing_page_path")
        if pfad and pfad.startswith("/products/"):
            pfade.append(pfad.split("/products/")[1].split("?")[0])
    for i in range(0, len(pfade), 40):
        q = " OR ".join(f"handle:{x}" for x in pfade[i:i + 40])
        r = (gql('query($q:String!){products(first:60,query:$q){nodes{id handle status '
                 'rc:metafield(namespace:"reviews",key:"rating_count"){value}}}}', {"q": q}).get("data") or {}).get("products")
        if r:
            nimm([n for n in r["nodes"] if n["status"] == "ACTIVE"])
    print(f"Landeseiten mit Verkehr, ohne Bewertung: {len(handles)}")

    for h in SICHTBAR:
        c = (gql('query($h:String!){collectionByHandle(handle:$h){products(first:60){nodes{id handle status '
                 'rc:metafield(namespace:"reviews",key:"rating_count"){value}}}}}', {"h": h})
             .get("data") or {}).get("collectionByHandle")
        if not c:
            continue
        nimm([n for n in c["products"]["nodes"] if n["status"] == "ACTIVE"])
    print(f"sichtbar ohne Bewertung, noch ungeprüft: {len(handles)}")

    for q in GRUPPEN:
        cur = None
        for _ in range(3):
            d = (gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q,sortKey:CREATED_AT,reverse:true)'
                     '{pageInfo{hasNextPage endCursor} nodes{id handle rc:metafield(namespace:"reviews",key:"rating_count"){value}}}}',
                     {"q": q, "c": cur}).get("data") or {}).get("products")
            if not d:
                break
            nimm(d["nodes"])
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
    open(ZIEL, "w").write("\n".join(handles) + "\n")
    print(f"FERTIG: {len(handles)} Kandidaten → {ZIEL}")


if __name__ == "__main__":
    main()
