#!/usr/bin/env python3
"""google_neuimport.py — neue Ware sofort mit Google-Kategorie und Geschlecht (01.10.2026, Betreiber «google rangliste cj sachen pushen»).

GEMESSEN 01.10. (die 25 neuesten aktiven CJ-Produkte, erster Tag nach der Grind-Pause): 13/25 OHNE google_product_category,
Kleidung ohne `gender`, alle mit Platzhalter-Typ «Trend-Produkt». Die Nachläufer (google_kategorie_fein, kategorie_wache,
gender_aus_titel) laufen täglich — neue Ware stand also bis zu 24 h ohne Kategorie im einzigen Kanal mit Verkäufen.
Dieser Lauf schliesst die Lücke stündlich nur für NEUE Produkte (created_at der letzten STUNDEN):
  * google_product_category nur, wenn LEER — Pfad aus google_kategorie_fein.ziel_leer() (dieselben Regeln + Taxonomie-Prüfung);
    kein Pfad → nichts geraten, der Tagesläufer versucht es später erneut.
  * gender nur für Apparel-Pfade und nur, wenn leer: Damen/Frauen → female, Herren/Männer → male, beides oder «unisex» → unisex.
  * NACHTRAG 01.10.: Die Importer publizieren in ALLE sechs Kanäle — auch Kostüme (gemessen: «Aufblasbares Halloween-Kostüm»
    stand im Google-Kanal), obwohl Kostüme wegen Merchant-Sperr-Risiko bewusst draussen bleiben. Trifft google_kanal_luecke.grund()
    zu, nimmt dieser Lauf das Produkt aus dem Google-Kanal (nur dort) und vergibt KEINE Kategorie.
Rücklesen aus der metafieldsSet-Antwort, Ledger dropship/_google_neuimport.tsv.
  python3 automation/google_neuimport.py            # Trockenlauf
  SCHARF=1 STUNDEN=6 python3 automation/google_neuimport.py
"""
import json, os, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import google_kategorie_fein as gkf
from google_kanal_luecke import grund as google_risiko   # EINE Regel für «darf nicht zu Google» (Kostüm, Erotik, Tabak, Klinge …)
from eimer_etikette import nachlauf
GOOGLE_PUB = "gid://shopify/Publication/302872297857"

TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
SCHARF = os.environ.get("SCHARF") == "1"
STUNDEN = float(os.environ.get("STUNDEN", "6"))
LEDGER = os.path.join(os.path.dirname(HIER), "dropship", "_google_neuimport.tsv")
NS = "mm-google-shopping"


def gql(q, v=None):
    letzter = ""
    for versuch in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            nachlauf(j)
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


def geschlecht(titel):
    t = titel.lower()
    w = bool(re.search(r"\b(damen|frauen|frau|ladies|women)\b", t))
    m = bool(re.search(r"\b(herren|männer|maenner|mann|men)\b", t))
    if re.search(r"\bunisex\b", t) or (w and m):
        return "unisex"
    return "female" if w else ("male" if m else None)


def main():
    seit = (datetime.now(timezone.utc) - timedelta(hours=STUNDEN)).strftime("%Y-%m-%dT%H:%M:%SZ")
    tax = gkf.taxonomie()
    prod, c = [], None
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id title productType tags g:publishedOnPublication(publicationId:"%s") gk:metafield(namespace:"%s",key:"google_product_category"){value} '
                'ge:metafield(namespace:"%s",key:"gender"){value}}}}' % (GOOGLE_PUB, NS, NS),
                {"c": c, "q": f"created_at:>='{seit}' AND status:active"})["products"]
        prod += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    plan, raus = [], []
    offen = 0
    for p in prod:
        r = google_risiko(p["title"], p["tags"])
        if r:
            if p["g"]:
                raus.append((p, r))
            continue                      # Risiko-Ware: keine Google-Kategorie, nicht in den Kanal
        mf = []
        pfad = (p["gk"] or {}).get("value")
        if not pfad:
            z, _ = gkf.ziel_leer(p["title"], p["tags"], p["productType"] or "")
            if z and z in tax:
                pfad = z
                mf.append({"ownerId": p["id"], "namespace": NS, "key": "google_product_category",
                           "type": "single_line_text_field", "value": z})
            else:
                offen += 1
        if pfad and pfad.startswith("Apparel & Accessories") and not (p["ge"] or {}).get("value"):
            g = geschlecht(p["title"])
            if g:
                mf.append({"ownerId": p["id"], "namespace": NS, "key": "gender", "type": "single_line_text_field", "value": g})
        if mf:
            plan.append((p, mf))
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(prod)} neue aktive seit {seit} · zu setzen {len(plan)} · aus Google {len(raus)} · "
          f"ohne Pfad {offen} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    for p, r in raus:
        print(f"   ⛔ aus Google: {p['title'][:50]} — {r}", flush=True)
    for p, mf in plan[:8]:
        print("  ", p["title"][:50], "→", "; ".join(f"{m['key']}={m['value'][:45]}" for m in mf), flush=True)
    if not SCHARF:
        return 0
    ok = fehl = 0
    led = open(LEDGER, "a", encoding="utf-8")
    for p, r in raus:
        gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',
            {"id": p["id"], "p": [{"publicationId": GOOGLE_PUB}]})
        z = gql('query($id:ID!){product(id:$id){g:publishedOnPublication(publicationId:"%s")}}' % GOOGLE_PUB, {"id": p["id"]})
        if z["product"]["g"]:
            fehl += 1; print(f"  ⚠️ {p['title'][:40]}: noch im Google-Kanal", file=sys.stderr)
        else:
            ok += 1; led.write(f"{p['id']}\tgoogle-raus\t{r}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
    alle = [m for _, mf in plan for m in mf]
    for i in range(0, len(alle), 25):
        teil = alle[i:i + 25]
        r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} key value} userErrors{message}}}',
                {"m": teil})["metafieldsSet"]
        gesetzt = {((x["owner"] or {}).get("id"), x["key"]): x["value"] for x in r["metafields"] or []}
        for m in teil:
            if gesetzt.get((m["ownerId"], m["key"])) == m["value"]:
                ok += 1
                led.write(f"{m['ownerId']}\t{m['key']}\t{m['value']}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
            else:
                fehl += 1
        if r["userErrors"]:
            print("  Fehler:", r["userErrors"][0]["message"], file=sys.stderr)
    led.flush()
    print(f"FERTIG: {ok} Felder gesetzt (zurückgelesen), {fehl} Fehler, {offen} ohne Pfad (Tagesläufer)", flush=True)
    return 0 if not fehl else 3


if __name__ == "__main__":
    sys.exit(main())
