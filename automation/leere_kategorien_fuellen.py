#!/usr/bin/env python3
"""Fuellt Smart-Kollektionen, die leer sind, WEIL ihr Tag fehlt — nicht weil es die Ware nicht gibt.

Gelernt am 15.09.2026: «Weihnachten» stand im Menue und fuehrte auf 4 Produkte, waehrend 162
passende im Katalog lagen. Dieselbe Klasse fand sich danach in 18 weiteren Kollektionen.

⚠️ NUR eindeutige Suchwoerter (Regel 9b, Tag-Chirurgie). Am 15.09. gemessen und VERWORFEN:
   «Bar» trifft Barque/Schoggi Bar/Pilates Bar · «maker» trifft ausschliesslich Waffel- und
   Smoothie-Maker · «velo» trifft Velours und Velocità · «kaffee» trifft Kaffeebraun (Jacke)
   und Kaffee-Nagelsticker · «beauty» trifft einen Jumpsuit mit Beauty-Ruecken · «Smart Home»
   trifft einen Gemueseschneider · «klima» trifft Halsschal und Haustierbett.
   Shopify kennt keine Wortgrenze: `title:Velo` ohne Sternchen liefert 0, `title:*velo*` liefert
   Velours. Deshalb wird JEDES neue Paar hier erst als Stichprobe angesehen, dann eingetragen.

DRY=1 zeigt nur. Ledger: dropship/_leere_kategorien_gefuellt.txt
"""
import sys, os, json, time
sys.path.insert(0, 'tools')
import verkehrsseiten_messen as V

# (Kollektion, Suchwort im Titel, Tag laut Smart-Regel) — alle drei am 15.09. per Stichprobe geprueft
PAARE = [
    ("ladegeraete",          "Ladegerät", "Ladegerät"),
    ("beamer-projektoren",   "beamer",    "beamer"),
    ("vasen",                "Vase",      "Vase"),
    ("e-scooter-trottinett", "e-scooter", "e-scooter"),
]
LEDGER = "dropship/_leere_kategorien_gefuellt.txt"
DRY = os.environ.get("DRY") == "1"


def main():
    fertig = set(l.split("\t")[0] for l in open(LEDGER)) if os.path.exists(LEDGER) else set()
    f = open(LEDGER, "a")
    for handle, wort, tag in PAARE:
        cur, n, gesehen = None, 0, 0
        while True:
            d = V.gql('query($c:String,$q:String){products(first:100,after:$c,query:$q){'
                      'pageInfo{hasNextPage endCursor} nodes{id title tags}}}',
                      {"c": cur, "q": 'status:active AND title:*%s*' % wort})
            pg = (d.get("data") or {}).get("products")
            if not pg:
                print(f"{handle}: PAUSE (Shopify antwortet nicht)"); break
            for p in pg["nodes"]:
                gesehen += 1
                schluessel = p["id"] + "|" + tag
                if schluessel in fertig or tag in p["tags"]:
                    continue
                if DRY:
                    print(f"  [DRY] {tag:12s} <- {p['title'][:56]}")
                    n += 1; continue
                r = V.gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                          {"id": p["id"], "t": [tag]})
                if r.get("errors") or ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
                    print("   FEHLER", p["title"][:40], r.get("errors") or r["data"]["tagsAdd"]["userErrors"])
                    continue
                f.write(schluessel + "\t" + p["title"][:60] + "\n"); f.flush()
                n += 1
                time.sleep(0.25)
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
        print(f"{handle}: {gesehen} passende, {n} {'wuerden getaggt' if DRY else 'getaggt'} ({tag})")
    print("FERTIG")


if __name__ == "__main__":
    main()
