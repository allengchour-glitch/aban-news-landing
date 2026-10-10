#!/usr/bin/env python3
"""kollektion_mitgliedschaft_wache.py — Smart-Kollektionen, deren Mitglieder ihre eigene Regel nicht erfüllen (10.10.2026).

ANLASS: «Geschenke bis CHF 30» (Hauptmenü) hatte seit 05.10. die Regel «Tag = geschenkwelt-unter30» (400 Produkte), zeigte im
Shop aber 9'259 Artikel — Shopify hatte die Mitgliedschaft nach dem Regelwechsel nie neu berechnet (197 der ersten 250 Mitglieder
ohne den Tag; Regel-/Sortierwechsel bewirkten nichts). Gesehen wurde es nur, weil die Zählung im Lauf von geschenk_unterwelten
nicht zur Tag-Zahl passte. Behoben mit automation/kollektion_neu_anlegen.py (gleiches Handle, alte bleibt als «…-alt-Datum»).

PRÜFUNG: jede Smart-Kollektion, deren Regeln NUR aus «Tag ist gleich» bestehen → je 100 Mitglieder nach Titel und nach Preis absteigend (nur aktive)
gegen die Regel (UND bzw. ODER, Tags ohne Gross/Klein). Mehr als 10 % (und mind. 3) AKTIVE Regelbrecher = «hängt». Nur Bericht + Zeile, keine
Reparatur (neu anlegen ändert die Kollektions-ID — Menüpunkte mit resourceId müssten nachgezogen werden).
  python3 automation/kollektion_mitgliedschaft_wache.py      → dropship/KOLLEKTION-MITGLIEDSCHAFT.md
"""
import datetime as dt, os, re, sys
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

BERICHT = os.path.join(REPO, "dropship", "KOLLEKTION-MITGLIEDSCHAFT.md")
SCHWELLE = 0.10


def formen(t):
    """Shopify gleicht Tag-Regeln normalisiert ab (gemessen 10.10.: Regel «Gürtel» trifft «guertel», «smart home» trifft
    «smart-home») — beide Umlaut-Schreibweisen, Leerraum/Bindestrich gleich."""
    t = re.sub(r"[\s_-]+", "-", t.strip().lower())
    return {t.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"),
            t.replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss"), t}


def kollektionen():
    cur = None
    while True:
        d = gql('query($c:String){collections(first:100,after:$c,query:"collection_type:smart"){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}}',
                {"c": cur})["collections"]
        yield from d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return
        cur = d["pageInfo"]["endCursor"]


def pruefen(c):
    rs = c["ruleSet"]
    if re.search(r"-alt-\d{8}$", c["handle"]):                   # bewusst abgelegte Sicherung von kollektion_neu_anlegen.py
        return None
    if not rs or not rs["rules"] or any(r["column"] != "TAG" or r["relation"] != "EQUALS" for r in rs["rules"]):
        return None
    soll = [formen(r["condition"]) for r in rs["rules"]]
    # NICHT in Kollektionsreihenfolge: bei MANUAL stehen die kuratierten (sauberen) Mitglieder vorne — die Stichprobe sah die
    # hängende «Geschenke bis CHF 30» deshalb als gesund; BEST_SELLING/ID/CREATED ebenso (0–1 Brecher). Gemessen an der hängenden
    # Kollektion: TITLE 87/93, PRICE absteigend 99/99 aktive Brecher → diese zwei Stichproben.
    d = gql('query($id:ID!){c:collection(id:$id){a:products(first:100,sortKey:TITLE){nodes{id tags status}} '
            'b:products(first:100,sortKey:PRICE,reverse:true){nodes{id tags status}}}}', {"id": c["id"]})["c"]
    nodes = list({n["id"]: n for n in d["a"]["nodes"] + d["b"]["nodes"]}.values())
    nodes = [n for n in nodes if n["status"] == "ACTIVE"]        # Entwürfe zeigt der Shop nicht (und Shopify prüft sie träge)
    if not nodes:
        return None
    test = any if rs["appliedDisjunctively"] else all
    def erfuellt(n):
        hat = set().union(*(formen(x) for x in n["tags"])) if n["tags"] else set()
        return test(bool(f & hat) for f in soll)
    brecher = sum(1 for n in nodes if not erfuellt(n))
    return brecher, len(nodes)


def main():
    zeilen, n = [], 0
    for c in kollektionen():
        r = pruefen(c)
        if r is None:
            continue
        n += 1
        brecher, stich = r
        if brecher >= 3 and brecher > SCHWELLE * stich:
            zeilen.append((c["handle"], c["title"], c["productsCount"]["count"], brecher, stich))
            print(f"MITGLIEDSCHAFT HÄNGT: {c['handle']} · {brecher}/{stich} ohne Regel · {c['productsCount']['count']} Mitglieder", flush=True)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write("# Smart-Kollektionen mit hängender Mitgliedschaft\n\n"
                "Geschrieben von `automation/kollektion_mitgliedschaft_wache.py` (Aufseher täglich). Geprüft: Kollektionen mit reinen "
                "Tag-Regeln, je 100 Mitglieder (nach Titel + teuerste, nur aktive) gegen die eigene Regel. **Reparatur:** `SCHARF=1 python3 "
                "automation/kollektion_neu_anlegen.py HANDLE` (gleiches Handle, alte bleibt unveröffentlicht als «…-alt-Datum»; "
                "Menüpunkte mit resourceId vorher prüfen).\n\n"
                f"Stand {dt.datetime.utcnow():%Y-%m-%d %H:%M} UTC · {n} geprüft · {len(zeilen)} hängen\n\n"
                "| Handle | Titel | Mitglieder | ohne Regel (Stichprobe) |\n|---|---|---|---|\n"
                + "".join(f"| {h} | {t} | {m} | {b}/{s} |\n" for h, t, m, b, s in zeilen))
    print(f"FERTIG {n} Tag-Kollektionen geprüft · {len(zeilen)} hängen")


if __name__ == "__main__":
    main()
