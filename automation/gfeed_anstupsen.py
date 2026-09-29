#!/usr/bin/env python3
"""gfeed_anstupsen.py — Google «Product page unavailable» per harmlosem Produkt-Update neu einreichen (29.09.2026).

GEMESSEN (A/B-Versuch `gfeed_nachpruefen.py`, Start 29.09. 05:17 UTC, Google-Vollscan 16:45 UTC):
  A (tagsAdd, löst products/update aus → App «Google & YouTube» reicht neu ein): 93/128 noch blockiert = 35 frei (27 %)
  B (Kontrolle, unverändert):                                                   126/128 noch blockiert = 2 frei (1,6 %)
Die Meldung ist bei kaufbaren Seiten also meist ein alter Befund; ein Update holt die Seite zurück. Danach wurde B nachgezogen.

REGEL: Jedes AKTIVE Produkt mit der Google-Meldung «Product page unavailable» (Stand aus google_feedback_wache.py) bekommt
höchstens alle TAGE (7) einen Tag `gfeed-anstupsen-JJMMTT`; ältere `gfeed-…`-Tags desselben Produkts fallen weg (Tag-
Chirurgie nur über tagsAdd/tagsRemove, nie productUpdate(tags:)). Ledger dropship/_gfeed_anstupsen.tsv (Handle, Datum).
Täglich im Aufseher (ohne Variablen = scharf; DRY=1 zeigt nur).
"""
import datetime as dt, json, os, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
LEDGER = os.path.join(REPO, "dropship/_gfeed_anstupsen.tsv")
KLASSE = "Product page unavailable"
TAGE = int(os.environ.get("TAGE", "7"))
SCHARF = os.environ.get("DRY") != "1"


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    grund = ""
    for a in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
            if d.get("data") is not None and not d.get("errors"):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                if ts and ts.get("currentlyAvailable", 1000) < 400:      # Eimer-Etikette
                    time.sleep(3)
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:120]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:120]
        time.sleep(3 + 3 * a)
    print(f"gql: letzter Grund: {grund}", file=sys.stderr)
    raise RuntimeError(f"Shopify antwortet nicht ({grund}) — Lauf abgebrochen, nichts quittiert")


def main():
    heute = dt.datetime.now(dt.timezone.utc)
    stand = json.load(open(STAND))
    handles = stand["handles"].get(KLASSE, [])
    zuletzt = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER, encoding="utf-8"):
            h, _, d = l.rstrip("\n").partition("\t")
            if h and d:
                zuletzt[h] = d
    faellig = [h for h in handles if not zuletzt.get(h) or
               (heute - dt.datetime.fromisoformat(zuletzt[h].replace("Z", "+00:00"))).days >= TAGE]
    print(f"START {heute:%Y-%m-%dT%H:%MZ}: {KLASSE} {len(handles)} (Google-Stand {stand['stand']}) · fällig {len(faellig)} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}")
    tag = f"gfeed-anstupsen-{heute:%y%m%d}"
    ok = aus = 0
    for i in range(0, len(faellig), 25):
        teil = faellig[i:i + 25]
        d = gql("query($q:String){products(first:25,query:$q){nodes{id handle status tags}}}",
                {"q": " OR ".join(f'handle:"{h}"' for h in teil)})
        for n in d["products"]["nodes"]:
            if n["handle"] not in teil:
                continue
            if n["status"] != "ACTIVE":
                aus += 1
                continue
            alt = [t for t in n["tags"] if t.startswith("gfeed-") and t != tag]
            if not SCHARF:
                ok += 1
                continue
            if alt:
                gql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}", {"id": n["id"], "t": alt})
            r = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": n["id"], "t": [tag]})
            if r["tagsAdd"]["userErrors"]:
                print(f"  Fehler {n['handle']}: {r['tagsAdd']['userErrors'][0]['message']}")
                continue
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{n['handle']}\t{heute:%Y-%m-%dT%H:%MZ}\n")
            ok += 1
    print(f"FERTIG: {ok} {'angestupst' if SCHARF else 'würden angestupst'} · {aus} nicht aktiv übersprungen")


if __name__ == "__main__":
    main()
