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
# 27.09.2026: Saison-Reihen stehen seit 24./25.09. auf Startseiten-Platz 2 und 5 (Herbst, Halloween) — sie fehlten hier:
# Herbst-Favoriten 117 aktive CJ-Produkte, 3 mit Bewertung, 32 nie geprueft.
SICHTBAR = ["herbst-favoriten", "halloween", "hype-jetzt", "bestseller", "neu-eingetroffen", "blitzversand-highlights", "damen-mode",
            "wohnen-dekoration", "fur-ihn", "schmuck-uhren", "schuhe-sneaker", "sub-baby-kids",
            "elektronik-technik", "handy-zubehoer", "gaming", "sub-haustier", "beauty-pflege",
            "auto-kfz-zubehoer", "querbeet", "sub-kueche", "uhren", "sub-taschen"]
# Warengruppen, bei denen CJ erfahrungsgemaess Kommentare hat.
# ACHTUNG (05.09.): Diese Liste ist NICHT sauber gemessen. Die Quote aus dem Ledger ist
# wertlos, weil das Ledger auch Anfragen eines KAPUTTEN Importers fuehrt (resolvePid-Rueckfall,
# Drosselungs-Abbruch) — dort kam nichts zurueck, weil das Werkzeug defekt war. Vor jeder
# Aenderung an GRUPPEN: automation/bewertungen_quote_probe.py an NIE gefragten Produkten laufen lassen.
GRUPPEN = ["status:active AND product_type:Uhren", "status:active AND product_type:Schmuck",
           "status:active AND tag:kueche", "status:active AND tag:haustier"]
# 08.10.2026 (Plan Tag 9 «Bewertungs-Import für Neuware»): GEMESSEN 2'695 aktive Neuimporte seit 01.10., geprüft 107 (4 %),
# 8 mit Bewertung. Die Neuware kam in dieser Liste nur über die ersten 60 von «neu-eingetroffen» vor und stand hinter 711
# ungeprüften sichtbaren Produkten. Sie trägt meist `CJ-<pid>` → der Kommentar-Abruf kostet keine CJ-Punkte
# (cj_reviews_import.resolvePid). Darum: Neuware der letzten NEU_TAGE, neueste zuerst, im Reissverschluss mit den Reihen.
NEU_TAGE = int(os.environ.get("NEU_TAGE", "21"))


def gql(q, v=None):
    for i in range(8):
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                     data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                     headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            time.sleep(2 + 2 * i); continue
        if d.get("data") is not None:
            return d
        time.sleep(2 + 2 * i)
    # ⚠️ 17.09.2026: Hier stand `return {}` — dieselbe stille Null wie in 15
    # Geschwister-Wächtern, nur ohne verschluckten except-Zweig. Der Aufrufer
    # rechnet mit `.get(...)` weiter und meldet ein saubere Ergebnis über null
    # Datensätze, obwohl Shopify nur gedrosselt hat. Gegenprobe an dup_scan.py:
    # mit falschem Token Abbruch mit Exit 1 statt «0 Produkte».
    raise RuntimeError(
        "Shopify hat auf keinen Versuch mit Daten geantwortet. FRÜHER gab diese"
        " Funktion hier ein leeres Ergebnis zurück und der Aufrufer meldete «0» —"
        " das ist keine Messung, sondern ein Ausfall.")


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0].strip() for l in open(LEDGER)}
    handles, gesehen = [], set()

    def nimm(nodes, ziel=None):
        ziel = handles if ziel is None else ziel
        for n in nodes:
            pid = n["id"].split("/")[-1]
            if pid in done or pid in gesehen:
                continue
            if n.get("rc") and int(n["rc"]["value"]) > 0:
                continue
            gesehen.add(pid); ziel.append(n["handle"])

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

    sichtbar, neuware = [], []
    for h in SICHTBAR:
        c = (gql('query($h:String!){collectionByHandle(handle:$h){products(first:60){nodes{id handle status '
                 'rc:metafield(namespace:"reviews",key:"rating_count"){value}}}}}', {"h": h})
             .get("data") or {}).get("collectionByHandle")
        if not c:
            continue
        nimm([n for n in c["products"]["nodes"] if n["status"] == "ACTIVE"], sichtbar)
    print(f"sichtbar ohne Bewertung, noch ungeprüft: {len(sichtbar)}")

    ab = time.strftime("%Y-%m-%d", time.gmtime(time.time() - NEU_TAGE * 86400))
    cur = None
    while True:
        d = (gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q,sortKey:CREATED_AT,reverse:true)'
                 '{pageInfo{hasNextPage endCursor} nodes{id handle variants(first:1){nodes{sku}} '
                 'rc:metafield(namespace:"reviews",key:"rating_count"){value}}}}',
                 {"q": f"status:active AND created_at:>={ab}", "c": cur}).get("data") or {}).get("products")
        if not d:
            break
        nimm([n for n in d["nodes"] if ((n["variants"]["nodes"] or [{}])[0].get("sku") or "").upper().startswith("CJ")], neuware)
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    print(f"Neuware {NEU_TAGE} T ohne Bewertung, noch ungeprüft: {len(neuware)}")
    # Reissverschluss: Neuware (kostenlos prüfbar, frisch im Google-Kanal) und sichtbare Reihen abwechselnd —
    # keine der beiden Gruppen verhungert hinter der anderen.
    for i in range(max(len(neuware), len(sichtbar))):
        handles.extend(x[i] for x in (neuware, sichtbar) if i < len(x))

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
    # 08.10.2026: nicht mehr «FERTIG: …» — diese Zeile steht MITTEN im Lauf (danach kommt der Import), und der Aufseher
    # liest «FERTIG» am Zeilenanfang als «Lauf beendet» (still_gestorben).
    print(f"Arbeitsliste: {len(handles)} Kandidaten → {ZIEL}")


if __name__ == "__main__":
    main()
