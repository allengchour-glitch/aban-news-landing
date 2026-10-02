#!/usr/bin/env python3
"""indexnow_melden.py — meldet luxestyle.ch-Seiten per IndexNow an Bing (und damit ChatGPT, Copilot, DuckDuckGo) (02.10.2026).

ANLASS (Betreiber «ich sehe viele werbungen … mache das beste draus, programmiere tools selber»): beworben werden
Shopify-Apps wie «IndexNow Kit: for Bing ChatGPT». GEMESSEN 02.10.: von den letzten 4 echten Bestellungen kamen
2 über ChatGPT (#1021, #1018 — beide direkt auf der Produktseite, utm_source=chatgpt.com). ChatGPT brachte
in 90 T nur 23 Sitzungen (Juli 2, Aug 7, Sept 16), Google 539 Sitzungen und 5 Käufe. ChatGPT-Suche, Copilot und
DuckDuckGo lesen den Bing-Index, und Shopify meldet Änderungen dort nicht selbst (kein natives IndexNow).

Schlüssel: dropship/_indexnow_key.txt (öffentlich per Protokoll, kein Geheimnis). Er liegt als Datei im Shopify-CDN,
`luxestyle.ch/<key>.txt` leitet per URL-Redirect dorthin (gemessen: 301 → Inhalt = Schlüssel).

  Je Lauf höchstens MAX (10'000) Adressen, Reihenfolge:
  1. Kollektionen (Menü + alle veröffentlichten), Ratgeber-Artikel, Seiten — nie gemeldet oder > 30 T her
  2. Produkte mit Kaufwillen-Tags (kunden-liebling, nachfrage-liebling, hype-jetzt), dann alle übrigen im Onlineshop
  Eine Adresse wird höchstens alle WIEDER_TAGE (30) erneut gemeldet — IndexNow will nur Neues/Geändertes.
  Ledger dropship/_indexnow_gemeldet.tsv (url, datum) · Protokoll dropship/_indexnow_laeufe.tsv (zeit, n, http).
  HTTP 200/202 = angenommen (202 = Schlüssel wird noch geprüft); 403 = Schlüssel ungültig → Abbruch, laut.
  python3 automation/indexnow_melden.py [--trocken] [--probe]   (--probe meldet nur die Startseite)
"""
import datetime as dt, json, os, sys, time, urllib.error, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

HOST = "luxestyle.ch"
SCHLUESSEL = open(os.path.join(REPO, "dropship", "_indexnow_key.txt")).read().strip()
LEDGER = os.path.join(REPO, "dropship", "_indexnow_gemeldet.tsv")
LAEUFE = os.path.join(REPO, "dropship", "_indexnow_laeufe.tsv")
MAX = int(os.environ.get("MAX", "10000"))
WIEDER_TAGE = int(os.environ.get("WIEDER_TAGE", "30"))
VORRANG_TAGS = ("kunden-liebling", "nachfrage-liebling", "hype-jetzt")
ENDPUNKT = "https://api.indexnow.org/indexnow"
ONLINESHOP = "gid://shopify/Publication/301970915713"


def ledger():
    d = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) == 2:
                d[f[0]] = f[1]
    return d


def alle(feld, knoten, query=None):
    """Alle Knoten einer Verbindung (Kollektionen, Produkte …) seitenweise."""
    out, nach = [], None
    while True:
        q = (f"query($a:String,$q:String){{{feld}(first:250,after:$a,query:$q){{pageInfo{{hasNextPage endCursor}} "
             f"nodes{{{knoten}}}}}}}")
        d = gql(q, {"a": nach, "q": query})[feld]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        nach = d["pageInfo"]["endCursor"]


def kandidaten():
    """(prio, url) aller öffentlichen Seiten. prio 0 = Kollektionen/Artikel/Seiten, 1 = Vorrang-Produkte, 2 = Rest."""
    k = [(0, f"https://{HOST}/")]
    for c in alle("collections", f'handle publishedOnPublication(publicationId:"{ONLINESHOP}")'):
        if c["publishedOnPublication"]:                  # unveröffentlicht = 404 für Besucher und Bing
            k.append((0, f"https://{HOST}/collections/{c['handle']}"))
    for a in alle("articles", "handle isPublished blog{handle}"):
        if a["isPublished"]:
            k.append((0, f"https://{HOST}/blogs/{a['blog']['handle']}/{a['handle']}"))
    for p in alle("pages", "handle isPublished"):
        if p["isPublished"]:
            k.append((0, f"https://{HOST}/pages/{p['handle']}"))
    for p in alle("products", "handle onlineStoreUrl tags", "status:active"):
        if not p.get("onlineStoreUrl"):
            continue                                     # nicht im Onlineshop → für Besucher 404
        prio = 1 if any(t in VORRANG_TAGS for t in p["tags"]) else 2
        k.append((prio, f"https://{HOST}/products/{p['handle']}"))
    return k


def melden(urls):
    body = {"host": HOST, "key": SCHLUESSEL, "keyLocation": f"https://{HOST}/{SCHLUESSEL}.txt", "urlList": urls}
    letzter = ""
    for a in range(4):
        try:
            r = urllib.request.Request(ENDPUNKT, data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json; charset=utf-8"})
            with urllib.request.urlopen(r, timeout=120) as resp:
                return resp.status, resp.read()[:200].decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            text = e.read()[:300].decode("utf-8", "replace")
            if e.code in (400, 403, 422):
                return e.code, text                      # fachlicher Fehler — Wiederholen ändert nichts
            letzter = f"HTTP {e.code}: {text}"
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(10 * (a + 1))
    raise RuntimeError("IndexNow ohne Antwort — " + letzter)


def protokoll(n, status, text):
    neu = not os.path.exists(LAEUFE)
    with open(LAEUFE, "a", encoding="utf-8") as f:
        if neu:
            f.write("zeit\tanzahl\thttp\tantwort\n")
        f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{n}\t{status}\t{text.strip()[:80]}\n")


def main():
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", flush=True)
    if "--probe" in sys.argv:
        s, t = melden([f"https://{HOST}/"])
        protokoll(1, s, t)
        print(f"FERTIG: Probe HTTP {s} {t[:80]}")
        sys.exit(0 if s in (200, 202) else 1)
    led = ledger()
    heute = dt.date.today()
    grenze = str(heute - dt.timedelta(days=WIEDER_TAGE))
    kand = kandidaten()
    faellig = sorted({(p, u) for p, u in kand if led.get(u, "0000") < grenze})
    urls = [u for _, u in faellig][:MAX]
    print(f"  {len(kand)} öffentliche Seiten, {len(faellig)} fällig, melde {len(urls)}", flush=True)
    if "--trocken" in sys.argv:
        print("FERTIG: trocken —", ", ".join(urls[:5]))
        return
    gemeldet = 0
    for i in range(0, len(urls), 10000):
        teil = urls[i:i + 10000]
        s, t = melden(teil)
        protokoll(len(teil), s, t)
        if s not in (200, 202):
            print(f"FEHLER: IndexNow HTTP {s} {t[:150]}", file=sys.stderr)
            raise SystemExit(f"FERTIG: abgebrochen bei HTTP {s} nach {gemeldet} gemeldeten Adressen")
        with open(LEDGER, "a", encoding="utf-8") as f:
            for u in teil:
                f.write(f"{u}\t{heute}\n")
        gemeldet += len(teil)
    rest = len(faellig) - gemeldet
    print(f"FERTIG: {gemeldet} Adressen an IndexNow gemeldet (HTTP {s if urls else '-'}) · Rückstand {rest}")


if __name__ == "__main__":
    main()
