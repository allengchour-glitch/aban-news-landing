#!/usr/bin/env python3
"""aktiv_ohne_bild_wache.py — kein aktives Produkt ohne Bild (01.10.2026).

ANLASS: Weg B des Speicher-Entscheids (dropship/SPEICHER-ENTSCHEID-2026-10-01.md) löscht die Bilder von CJ-Entwürfen und
markiert sie mit `bilder-geloescht-speicher`. Mehrere Rückholer (Versand-Linie wieder offen, Preis repariert, Google-Rückholung)
schalten Entwürfe wieder ACTIVE — sie prüfen den Status, nicht die Bilder. Ein aktives Produkt ohne Bild ist für die Kundin
eine leere Seite und für Google ein Fehler. Betreiber: «aber nicht das fehler gibt».

Regel: jedes AKTIVE Produkt mit dem Tag `bilder-geloescht-speicher` und 0 Medien → zurück auf DRAFT + Tag `wartet-auf-bilder`
(gemeldet, nicht gelöscht). Hat es inzwischen wieder Bilder (Neuimport), wird nur der Tag `bilder-geloescht-speicher` entfernt.
Läuft stündlich im Aufseher; eine einzige Suchabfrage, solange nichts zu tun ist.
  python3 automation/aktiv_ohne_bild_wache.py      # SCHARF ist Standard (kleine, sichere Korrektur); DRY=1 zählt nur
"""
import json, os, sys, time, urllib.request

TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
DRY = os.environ.get("DRY") == "1"
LEDGER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dropship", "_aktiv_ohne_bild.tsv")


def gql(q, v=None):
    letzter = ""
    for versuch in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


def main():
    gedraftet = entmarkt = 0
    cursor = None
    while True:
        d = gql('query($c:String){products(first:100, after:$c, query:"status:active tag:bilder-geloescht-speicher"){'
                'pageInfo{hasNextPage endCursor} nodes{id handle mediaCount{count}}}}', {"c": cursor})["products"]
        for p in d["nodes"]:
            if p["mediaCount"]["count"] > 0:
                if not DRY:
                    gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                        {"id": p["id"], "t": ["bilder-geloescht-speicher"]})
                entmarkt += 1
                continue
            if not DRY:
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}',
                        {"i": {"id": p["id"], "status": "DRAFT"}})["productUpdate"]
                if r["userErrors"] or (r["product"] or {}).get("status") != "DRAFT":
                    print(f"⚠️ {p['handle']}: {r['userErrors']}", file=sys.stderr); continue
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                    {"id": p["id"], "t": ["wartet-auf-bilder"]})
                open(LEDGER, "a").write(f"{p['id']}\t{p['handle']}\tdraft-ohne-bild\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
            gedraftet += 1
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]
    print(f"FERTIG: {gedraftet} aktive ohne Bild → DRAFT, {entmarkt} wieder mit Bild (Tag entfernt){' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
