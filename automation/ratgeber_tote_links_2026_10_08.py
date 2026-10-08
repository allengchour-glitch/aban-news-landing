#!/usr/bin/env python3
"""ratgeber_tote_links_2026_10_08.py — zwei tote Produktziele in 9 Ratgebern ersetzen (Plan Tag 10 «Links geprüft, 0 tote»).

GEMESSEN 08.10. (blog_linkziele_wache.py, am Ursprung): 2 tote Ziele, beide DRAFT wegen `cj-nicht-versendbar-ch`:
  · Sternenhimmel-Projektor «Cosmos» (CHF 32.90) in 8 Artikeln — Text nennt Fernbedienung, Timer, USB, «Sterne und Galaxie».
    Ersatz: «Aurora Borealis Sternenlicht-Projektor» (aktiv, 6 Bilder, CHF 40.90; laut Produkttext Fernbedienung, Timer
    30 min/1 h, USB-Variante; projiziert Sterne + Nordlicht, KEINE Galaxie → Text angepasst). Kein anderer aktiver Projektor
    hat Fernbedienung UND Timer (16 geprüft). Alle Preisgrenzen der Artikel halten (unter CHF 50 / 60).
  · «Minimalistisches Portemonnaie mit Kartenfach» in 1 Artikel (Liste mit 3 weiteren lebenden Börsen) → Listenpunkt raus.
    Einziger Kandidat «… mit Airtag-Chip» verspricht einen eingebauten Ortungschip — unbelegt, NICHT als Ersatz genommen.
Sicherung je Artikel in dropship/_ratgeber_vorher/<handle>_2026-10-08-links.json. SCHARF=1 schreibt.
"""
import json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
VORHER = os.path.join(REPO, "dropship", "_ratgeber_vorher")
ALT_P = "/products/sternenhimmel-projektor-cosmos-led-nachtlicht-240961"
NEU_P = "/products/aurora-borealis-sternenlicht-projektor-365824"
ALT_W = "minimalistisches-portemonnaie-mit-kartenfach-370946"


def projektor(body):
    if ALT_P not in body and "«Cosmos»" not in body:
        return body
    b = body.replace(ALT_P, NEU_P)
    b = b.replace("Sternenhimmel-Projektors «Cosmos»", "Sternenlicht-Projektors «Aurora»")
    b = b.replace("Sternenhimmel-Projektor «Cosmos»", "Sternenlicht-Projektor «Aurora»")
    b = b.replace("wirft Sterne und Galaxie an die Decke", "wirft Sterne und Nordlicht an die Decke")
    b = b.replace("projiziert Sternenhimmel und Galaxie an die Decke", "projiziert Sterne und Nordlicht an die Decke")
    b = b.replace("Sternenhimmel- und Galaxie-Projektion", "Sternen- und Nordlicht-Projektion")
    # Preis nur in der Nähe des Projektors (andere Produkte können auch 32.90 kosten)
    def preis(m):
        return m.group(0).replace("CHF 32.90", "CHF 40.90")
    b = re.sub(r"«Aurora»(?:(?!<h[23]|«)[\s\S]){0,400}?CHF 32\.90", preis, b)
    return b


def portemonnaie(body):
    return re.sub(r"<li>(?:(?!</li>)[\s\S])*?/products/" + ALT_W + r"(?:(?!</li>)[\s\S])*?</li>\s*", "", body)


def main():
    os.makedirs(VORHER, exist_ok=True)
    cur, arts = None, []
    while True:
        d = gql('query($c:String){articles(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle body}}}', {"c": cur})["articles"]
        arts += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    ok = fe = 0
    for a in arts:
        neu = portemonnaie(projektor(a["body"]))
        if neu == a["body"]:
            continue
        rest = [x for x in ("Cosmos", "32.90", ALT_P, ALT_W, "Galaxie-Projektion") if x in neu]
        print(f"  {a['handle'][:50]:50} {len(a['body'])} → {len(neu)} · übrig: {rest}")
        if not SCHARF:
            continue
        json.dump({"id": a["id"], "handle": a["handle"], "body": a["body"]},
                  open(os.path.join(VORHER, f"{a['handle']}_2026-10-08-links.json"), "w", encoding="utf-8"), ensure_ascii=False)
        r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){article{body} userErrors{message}}}',
                {"id": a["id"], "a": {"body": neu}})["articleUpdate"]
        gut = not r["userErrors"] and ALT_P not in (r["article"] or {}).get("body", ALT_P) and ALT_W not in r["article"]["body"]
        ok += gut; fe += not gut
    print(f"FERTIG: RATGEBER-TOTE-LINKS{f' gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}")


if __name__ == "__main__":
    main()
