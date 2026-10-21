#!/usr/bin/env python3
"""indexnow_melden.py — meldet luxestyle.ch-Seiten per IndexNow an Bing (und damit ChatGPT, Copilot, DuckDuckGo) (02.10.2026).

ANLASS (Betreiber «ich sehe viele werbungen … mache das beste draus, programmiere tools selber»): beworben werden
Shopify-Apps wie «IndexNow Kit: for Bing ChatGPT». GEMESSEN 02.10.: von den letzten 4 echten Bestellungen kamen
2 über ChatGPT (#1021, #1018 — beide direkt auf der Produktseite, utm_source=chatgpt.com). ChatGPT brachte
in 90 T nur 23 Sitzungen (Juli 2, Aug 7, Sept 16), Google 539 Sitzungen und 5 Käufe. ChatGPT-Suche, Copilot und
DuckDuckGo lesen den Bing-Index, und Shopify meldet Änderungen dort nicht selbst (kein natives IndexNow).

Schlüssel: dropship/_indexnow_key.txt (öffentlich per Protokoll, kein Geheimnis). Er liegt als Datei im Shopify-CDN,
`luxestyle.ch/<key>.txt` leitet per URL-Redirect dorthin (gemessen: 301 → Inhalt = Schlüssel).

  Je Lauf höchstens MAX (10'000) Adressen. Reihenfolge (automation/indexnow_netz.py `auswahl`, seit 21.10.2026):
  nie gemeldete zuerst (Neuware: jüngstes createdAt vorn), dann Prio (Kollektionen/Artikel/Seiten vor Vorrang-Produkten
  kunden-liebling/nachfrage-liebling/hype-jetzt vor dem Rest), dann ältestes Ledger-Datum. Vorher `sorted((prio, url))` = Alphabet:
  ab 02.11., wenn ~50'000 Adressen wieder fällig werden, hätte MAX Neuware «z…» abgeschnitten.
  Wiederholfrist: Kollektionen/Artikel/Seiten WIEDER_TAGE (30), Produkte WIEDER_TAGE_PRODUKT (90) — IndexNow will nur Neues/Geändertes.
  Entfernte Adressen (nicht mehr öffentlich) werden einmal gemeldet (Ledger «entfernt-JJJJ-MM-TT»).
  Ledger dropship/_indexnow_gemeldet.tsv (url, datum) · Protokoll dropship/_indexnow_laeufe.tsv (zeit, n, http) ·
  Stand dropship/_indexnow_stand.json (Ampel «INDEXNOW»). Takt 6 h im Aufseher (fixer_keepalive.sh).
  HTTP 200/202 = angenommen (202 = Schlüssel wird noch geprüft); 403 = Schlüssel ungültig → Abbruch, laut.
  python3 automation/indexnow_melden.py [--trocken] [--probe]   (--probe meldet nur die Startseite)
"""
import datetime as dt, json, os, sys, time, urllib.error, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql
from indexnow_netz import auswahl, entfernte, stand_schreiben, ENTFERNT, WIEDER_SEITE, WIEDER_PRODUKT

HOST = "luxestyle.ch"
SCHLUESSEL = open(os.path.join(REPO, "dropship", "_indexnow_key.txt")).read().strip()
LEDGER = os.path.join(REPO, "dropship", "_indexnow_gemeldet.tsv")
LAEUFE = os.path.join(REPO, "dropship", "_indexnow_laeufe.tsv")
MAX = int(os.environ.get("MAX", "10000"))
WIEDER_TAGE = int(os.environ.get("WIEDER_TAGE", str(WIEDER_SEITE)))
WIEDER_TAGE_PRODUKT = int(os.environ.get("WIEDER_TAGE_PRODUKT", str(WIEDER_PRODUKT)))
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
    """(prio, url, art, createdAt) aller öffentlichen Seiten. prio 0 = Kollektionen/Artikel/Seiten, 1 = Vorrang-Produkte, 2 = Rest;
    art 'p' = Produkt, 's' = sonst; createdAt nur bei Produkten."""
    k = [(0, f"https://{HOST}/", "s", "")]
    for c in alle("collections", f'handle publishedOnPublication(publicationId:"{ONLINESHOP}")'):
        if c["publishedOnPublication"]:                  # unveröffentlicht = 404 für Besucher und Bing
            k.append((0, f"https://{HOST}/collections/{c['handle']}", "s", ""))
    for a in alle("articles", "handle isPublished blog{handle}"):
        if a["isPublished"]:
            k.append((0, f"https://{HOST}/blogs/{a['blog']['handle']}/{a['handle']}", "s", ""))
    for p in alle("pages", "handle isPublished"):
        if p["isPublished"]:
            k.append((0, f"https://{HOST}/pages/{p['handle']}", "s", ""))
    for p in alle("products", "handle onlineStoreUrl tags createdAt", "status:active"):
        if not p.get("onlineStoreUrl"):
            continue                                     # nicht im Onlineshop → für Besucher 404
        prio = 1 if any(t in VORRANG_TAGS for t in p["tags"]) else 2
        k.append((prio, f"https://{HOST}/products/{p['handle']}", "p", p.get("createdAt") or ""))
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
    kand = kandidaten()
    urls, n_faellig, n_nie = auswahl(kand, led, heute, MAX, WIEDER_TAGE, WIEDER_TAGE_PRODUKT)
    tot = entfernte([u for _, u, _, _ in kand], led) if "--ohne-entfernt" not in sys.argv else []
    print(f"  {len(kand)} öffentliche Seiten, {n_faellig} fällig (davon {n_nie} nie gemeldet), melde {len(urls)} · "
          f"{len(tot)} entfernte Adressen", flush=True)
    if "--trocken" in sys.argv:
        print("FERTIG: trocken —", ", ".join(urls[:5]), "· entfernt:", ", ".join(tot[:3]))
        return
    gemeldet = 0
    s = None
    for i in range(0, len(urls), 10000):
        teil = urls[i:i + 10000]
        s, t = melden(teil)
        protokoll(len(teil), s, t)
        if s not in (200, 202):
            print(f"FEHLER: IndexNow HTTP {s} {t[:150]}", file=sys.stderr)
            stand_schreiben(http=s, fehler=f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}")
            raise SystemExit(f"Error: IndexNow abgebrochen bei HTTP {s} nach {gemeldet} gemeldeten Adressen")
        with open(LEDGER, "a", encoding="utf-8") as f:
            for u in teil:
                f.write(f"{u}\t{heute}\n")
        gemeldet += len(teil)
    # entfernte Adressen: einmal melden (404/410 für Bing), dann Marke — kommt die Seite zurück, gilt sie wieder als neu
    abgemeldet = 0
    if tot:
        s2, t2 = melden(tot)
        protokoll(len(tot), s2, "entfernt " + t2)
        if s2 in (200, 202):
            with open(LEDGER, "a", encoding="utf-8") as f:
                for u in tot:
                    f.write(f"{u}\t{ENTFERNT}{heute}\n")
            abgemeldet = len(tot)
            s = s2
        else:
            print(f"  Hinweis: Entfernt-Meldung HTTP {s2} {t2[:100]} — beim nächsten Lauf erneut", flush=True)
    rest = n_faellig - gemeldet
    stand_schreiben(fertig=f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", http=s if s is not None else 200, gemeldet=gemeldet,
                    entfernt=abgemeldet, nie_rest=max(0, n_nie - gemeldet), rueckstand=rest, seiten=len(kand))
    print(f"FERTIG: {gemeldet} Adressen an IndexNow gemeldet, {abgemeldet} entfernte (HTTP {s if s is not None else '-'}) · Rückstand {rest}")


if __name__ == "__main__":
    main()
