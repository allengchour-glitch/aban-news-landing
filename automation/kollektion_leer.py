#!/usr/bin/env python3
"""Findet im Onlineshop VERÖFFENTLICHTE Kollektionen, die für Besucherinnen leer sind.

Warum das ein eigener Wächter ist (21.08.2026): 14 veröffentlichte Kollektionen hatten NULL
kaufbare Produkte, 3 weitere genau eines — `smart-home-sub` (12 Produkte, alle DRAFT),
`picknick-strand` (10/10 DRAFT, mitten in der Saison), die Kampagnenseite `tiktok-viral`
(5/5 DRAFT), `black-friday-2026`, `vasen`, `wandkunst`, `servieren` und weitere. Alle
lieferten HTTP 200 mit vollem SEO-Titel und Werbetext — und darunter «Keine Produkte
gefunden.». Verlinkt waren sie aus der Seite `marken-kategorien` und aus fünf veröffentlichten
SEO-Ratgebern; der Klick verpuffte, ohne je in einer Statistik aufzutauchen.

⚠️ ZWEI ZÄHLFALLEN, beide teuer:
1. `productsCount` ZÄHLT DRAFTS MIT. Nach dieser Zahl wären nur 3 der 17 aufgefallen — eine
   Kollektion mit 12 Produkten kann für die Kundin völlig leer sein.
2. Eine STICHPROBE der ersten n Produkte einer Kollektion lügt: Shopify liefert sie in der
   Sortierung der Kollektion, und dort stehen die DRAFTs oft vorn. Der erste Entwurf dieses
   Wächters meldete deshalb `hype-2026` als leer — die Kollektion hat 108 aktive Produkte,
   nur eben nicht unter den ersten 250. Ein falscher Alarm auf einer gesunden Kollektion ist
   schlimmer als kein Alarm: er kostet Vertrauen in den Wächter.
Richtig ist die EXAKTE Zählung über die Suchsyntax:
`productsCount(query:"status:active AND collection_id:<zahl>")` — eine Anfrage je Kollektion,
kein Blättern, keine Stichprobe.

Die Ursache ist strukturell und wiederholt sich: Der Viability-Guard draftet Ware ohne
Lieferanten-SKU (`keine-lieferanten-ref`), der Dubletten-Fix draftet Doppelgänger, der
Medizin-/Waffen-Guard sperrt, BigBuy-Ware fällt auf `nicht-lieferbar-ch`. Die KOLLEKTION
erfährt davon nichts — dieselbe Mechanik wie bei den 61 toten Ratgeber-Links (tote_links.py).
Jeder Draft-Lauf kann neue leere Kollektionen erzeugen.

Meldet nur. Das Abräumen braucht eine Entscheidung: lässt sich die Kollektion mit lieferbarer
Ware FÜLLEN (Smart-Regel auf einen Begriff biegen, den aktive Ware trägt), oder gehört sie
unveröffentlicht? ⚠️ Beim Unveröffentlichen IMMER zuerst eine 301-Weiterleitung auf eine
gefüllte Nachbar-Kollektion anlegen — sonst wird aus der leeren Seite ein 404 und die
bestehenden Text-/Ad-/Google-Links sind endgültig verloren.
⚠️ NIE DRAFTs veröffentlichen, um eine Kollektion zu füllen: `keine-lieferanten-ref` heisst,
die Ware ist nicht bestellbar. Ein leeres Regal ist ärgerlich, eine unlieferbare Bestellung teuer.
"""
import json, os, subprocess, sys

SHOP = "au3j0y-hq.myshopify.com"
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
MINDEST = int(os.environ.get("MINDEST", "3"))   # ab wie vielen aktiven Produkten gilt sie als gesund


def gql(q, v=None):
    with open("/tmp/_kl.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kl.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d["data"]
        except Exception:
            pass
    return {}


Q_COLLS = """query($c:String){ collections(first:250, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{ id handle title productsCount{count}
    resourcePublicationsV2(first:15){nodes{publication{name} isPublished}} } } }"""

Q_AKTIV = """query($q:String!){ productsCount(query:$q){count} }"""


def aktive(cid):
    """Exakte Zahl der ACTIVE-Produkte einer Kollektion — eine Anfrage, keine Stichprobe."""
    zahl = cid.rsplit("/", 1)[-1]
    d = gql(Q_AKTIV, {"q": "status:active AND collection_id:%s" % zahl})
    pc = d.get("productsCount")
    return pc["count"] if pc else None


def main():
    cur, kandidaten, gesamt = None, [], 0
    while True:
        d = gql(Q_COLLS, {"c": cur}).get("collections")
        if not d:
            print("FEHLER: Kollektionen nicht ladbar", file=sys.stderr)
            return 1
        for n in d["nodes"]:
            gesamt += 1
            if not any(x["publication"]["name"] == "Online Store" and x["isPublished"]
                       for x in n["resourcePublicationsV2"]["nodes"]):
                continue
            kandidaten.append(n)
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    leer, duenn, unklar = [], [], []
    for n in kandidaten:
        akt = aktive(n["id"])
        if akt is None:            # Leseausfall zaehlt NIE als leer
            unklar.append(n)
        elif akt == 0:
            leer.append((n, akt))
        elif akt < MINDEST:
            duenn.append((n, akt))

    print("Kollektionen gesamt %d · im Onlineshop veröffentlicht %d · MINDEST=%d"
          % (gesamt, len(kandidaten), MINDEST))
    print("LEER (0 kaufbare Produkte): %d" % len(leer))
    for n, a in leer:
        print("  %-38s %-42s productsCount=%-5s aktiv=0"
              % (n["handle"], n["title"][:42], n["productsCount"]["count"]))
    print("DÜNN (1-%d kaufbare Produkte): %d" % (MINDEST - 1, len(duenn)))
    for n, a in duenn:
        print("  %-38s %-42s productsCount=%-5s aktiv=%d"
              % (n["handle"], n["title"][:42], n["productsCount"]["count"], a))
    if unklar:
        print("NICHT LESBAR (kein Befund, nur Ausfall): %d — %s"
              % (len(unklar), ", ".join(x["handle"] for x in unklar[:20])))
    if leer:
        print("\nHinweis: erst 301-Weiterleitung auf eine GEFÜLLTE Nachbar-Kollektion anlegen,")
        print("dann unveröffentlichen — oder die Smart-Regel auf aktive Ware umbiegen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
