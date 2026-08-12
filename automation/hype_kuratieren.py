"""Stellt die Hype-Reihe der Startseite zusammen — und räumt sie von selbst wieder ab.

AUFTRAG DES BETREIBERS (12.08.2026, wörtlich): «informiere dich immer über neuste hype
produkte und so und mache auch in startseite ganz gross irgendwo paar coolen produkten, aber
wen hype vorbei produkt ändern.»

Der zweite Halbsatz ist der schwierige. Eine Trend-Reihe anzulegen ist leicht; das Problem ist,
dass sie ein halbes Jahr später immer noch dieselben Artikel zeigt. Deshalb trägt jedes
Produkt hier ein DATUM: `hype-seit-JJJJ-MM-TT`. Läuft dieses Skript erneut, verliert alles,
was älter ist als HYPE_TAGE (Vorgabe 21), den Tag `hype-jetzt` und verschwindet aus der Reihe —
ohne dass jemand daran denken muss. Die Ware bleibt im Shop, sie führt nur nicht mehr die
Startseite an.

WOHER DIE THEMEN KOMMEN: aus einer Recherche, die zu jedem Lauf gehört (Web-Suche nach
aktuellen TikTok-/Dropshipping-Trends). Die Liste unten ist der Stand vom 12.08.2026:
Beauty-Geräte, Schnecken-/Serum-Hautpflege, Mini-Beamer, «aesthetic» Ordnungshelfer,
Shapewear, 3-in-1-Ladestationen. Wer sie ändert, trägt das Datum in QUELLE nach — sonst weiss
die nächste Session nicht, wie alt der Stand ist.

⚠️ NICHT JEDES TREFFERPRODUKT TAUGT FÜR DIE STARTSEITE. Verlangt werden: mindestens zwei
Bilder (sonst kein Karussell auf der Karte), Preis ab CHF 19 (darunter wirkt die Reihe wie ein
Ramschtisch und liegt zu nahe am Preisboden), im Google-Kanal, und keine der Warengruppen, die
schon einmal aus der Startreihe genommen wurden (Kostüm, Spielzeug, Partydeko).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
HEUTE = os.environ.get("HEUTE") or time.strftime("%Y-%m-%d")
HYPE_TAGE = int(os.environ.get("HYPE_TAGE", "21"))
PRO_THEMA = int(os.environ.get("PRO_THEMA", "2"))
TAG = "hype-jetzt"
HANDLE = "hype-jetzt"
LEDGER = "dropship/_hype_verlauf.txt"

QUELLE = "Web-Recherche 12.08.2026 (TikTok-/Dropshipping-Trendberichte August 2026)"
THEMEN = {
    # ⚠️ «IPL» ohne Wortgrenze steckt in «L-IPL-iner»: der erste Lauf setzte einen
    # «Peel-Off Lipliner» als Beauty-GERÄT auf die Startseite. Dieselbe Falle wie «rock» in
    # «GT Line ROCK» aus dem Projektgedächtnis — bei Abkürzungen immer \b.
    "Beauty-Gerät": re.compile(
        r'\bIPL\b|Mikrostrom|LED-Maske|Gesichtsreinigungsb[üu]rste|Dermaroller|Gua Sha|'
        r'Jade Roller|Haarentfernungs', re.I),
    "Hautpflege-Serum": re.compile(
        r'Schneckencreme|Snail|Serum|Ampullen|Retinol|Hyalurons[äa]ure', re.I),
    "Mini-Beamer": re.compile(r'Mini-?\s?(?:Beamer|Projektor)|Smart Mini Beamer', re.I),
    "Ordnung & Aesthetic": re.compile(
        r'Organizer|Aufbewahrungskorb|Aufbewahrungsbox|Ordnungssystem', re.I),
    "Shapewear": re.compile(r'Shapewear|Body Shaper|Figurformend|Taillenformer', re.I),
    "Ladestation 3-in-1": re.compile(r'\d-in-\d[- ]?(?:Wireless )?Ladestation|MagSafe|'
                                     r'Magnet-Ladestation|Wireless Powerbank', re.I),
}
# Warengruppen, die schon einmal aus der Startreihe genommen wurden.
RAUS_TYP = {"Spielzeug & Spiele", "Partydeko & Ballone", "Kostüme & Verkleidung"}
# Die Startseite ist die Fläche, die jede Besucherin ungefragt sieht — auch die, die mit einem
# Kind daneben sitzt. Der erste Lauf hätte ein «Intim-Pflegeserum für Frauen» dorthin gestellt.
# Das Produkt ist völlig in Ordnung, der Platz ist es nicht.
NICHT_STARTSEITE = re.compile(r'Intim|Erotik|Vaginal|Menstruation|H[äa]morrhoid|Anti-?Pilz|'
                              r'Nagelpilz|Warzen|Hemorrhoid', re.I)


def gql(q, v=None):
    with open("/tmp/_hy.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hy.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def tage_her(datum):
    try:
        return (time.mktime(time.strptime(HEUTE, "%Y-%m-%d"))
                - time.mktime(time.strptime(datum, "%Y-%m-%d"))) / 86400
    except Exception:
        return 999


def abgelaufene_raeumen():
    """Nimmt den Tag von allem, was länger als HYPE_TAGE in der Reihe steht."""
    cur, alle = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:%s")'
                '{pageInfo{hasNextPage endCursor} nodes{id title tags}}}' % TAG, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Bestandsliste unvollständig — nichts geräumt", flush=True)
            return 0
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    raus = []
    for p in alle:
        seit = next((t.split("hype-seit-")[1] for t in p["tags"] if t.startswith("hype-seit-")),
                    None)
        # Ohne Datum ist der Eintrag von Hand gesetzt worden — dann bleibt er.
        if seit and tage_her(seit) > HYPE_TAGE:
            raus.append((p, seit))
    print(f"In der Reihe: {len(alle)} | abgelaufen (>{HYPE_TAGE} Tage): {len(raus)}", flush=True)
    for p, seit in raus[:8]:
        print(f"   seit {seit}: {p['title'][:52]}", flush=True)
    if DRY:
        return len(raus)
    for p, seit in raus:
        gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": [TAG, "hype-seit-" + seit]})
        time.sleep(0.25)
    return len(raus)


def kollektion_sichern():
    d = gql('query($q:String!){collections(first:1,query:$q){nodes{id handle}}}',
            {"q": f"handle:{HANDLE}"})
    knoten = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if knoten:
        return knoten[0]["id"]
    if DRY:
        print("  (DRY) Kollektion würde angelegt", flush=True)
        return None
    r = gql('mutation($i:CollectionInput!){collectionCreate(input:$i)'
            '{collection{id} userErrors{message}}}',
            {"i": {"title": "🔥 Gerade im Trend", "handle": HANDLE,
                   "descriptionHtml": "<p>Was gerade wirklich läuft — von uns geprüft, mit "
                                      "Bildern, echtem Preis und Lieferung in die Schweiz. "
                                      "Die Auswahl wechselt regelmässig.</p>",
                   "seo": {"title": "Trend-Produkte 2026 – aktuell beliebt | LuxeStyle CH",
                           "description": "Aktuell gefragte Produkte im Schweizer Shop: "
                                          "geprüfte Auswahl, Gratis-Versand ab CHF 50, "
                                          "30 Tage Rückgabe."},
                   "ruleSet": {"appliedDisjunctively": False,
                               "rules": [{"column": "TAG", "relation": "EQUALS",
                                          "condition": TAG}]}}})
    cid = (((r.get("data") or {}).get("collectionCreate") or {}).get("collection") or {}).get("id")
    e = ((r.get("data") or {}).get("collectionCreate") or {}).get("userErrors")
    if e:
        print(f"  ⚠️ Kollektion: {e[0]['message']}", flush=True)
        return None
    # ⚠️ Per API angelegte Kollektionen sind NICHT automatisch im Onlineshop sichtbar — genau
    # daran sind am 12.06. alle Menü-Links auf 404 gelaufen.
    for pub in ("301970915713", "301971014017", "302032716161", "302566834561",
                "302872297857", "302994456961"):
        gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i)'
            '{userErrors{message}}}',
            {"id": cid, "i": [{"publicationId": f"gid://shopify/Publication/{pub}"}]})
        time.sleep(0.2)
    print(f"  Kollektion «🔥 Gerade im Trend» angelegt und in 6 Kanälen veröffentlicht",
          flush=True)
    return cid


def main():
    print(f"Quelle der Themen: {QUELLE}\n", flush=True)
    abgelaufene_raeumen()

    kandidaten = {k: [] for k in THEMEN}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        if (p.get("productType") or "") in RAUS_TYP or NICHT_STARTSEITE.search(p["title"]):
            continue
        if (p.get("mediaCount") or {}).get("count", 0) < 2:
            continue
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        if preis < 19:
            continue
        if TAG in (p.get("tags") or []):
            continue                       # steht schon in der Reihe
        for thema, muster in THEMEN.items():
            if muster.search(p["title"]):
                kandidaten[thema].append(
                    (p["id"], p["title"], preis, (p.get("mediaCount") or {}).get("count", 0)))
                break

    gewaehlt = []
    for thema, liste in kandidaten.items():
        # Meiste Bilder zuerst — die Karte lebt vom Karussell.
        liste.sort(key=lambda x: -x[3])
        gewaehlt += [(thema,) + k for k in liste[:PRO_THEMA]]

    print(f"\nNeu in die Reihe: {len(gewaehlt)}", flush=True)
    for thema, _, t, preis, mc in gewaehlt:
        print(f"   [{thema:<20}] CHF {preis:>6.2f}  {mc:>2} Bilder  {t[:46]}", flush=True)
    if DRY:
        kollektion_sichern()
        return
    if not gewaehlt:
        print("Keine neuen Kandidaten — Reihe bleibt, wie sie ist.", flush=True)
        return

    kollektion_sichern()
    f = open(LEDGER, "a")
    n = 0
    for thema, gid, t, preis, _ in gewaehlt:
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [TAG, "hype-seit-" + HEUTE]})
        if ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{HEUTE}\t{thema}\t{gid}\t{t}\n")
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte in die Hype-Reihe aufgenommen (Ablauf in {HYPE_TAGE} Tagen)")


if __name__ == "__main__":
    main()
