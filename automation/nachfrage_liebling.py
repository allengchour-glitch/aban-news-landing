#!/usr/bin/env python3
"""nachfrage_liebling.py — Was Leute in den Warenkorb legen, wird öfter gezeigt (29.09.2026).

Betreiber: «verbessere irgendwie das leute es kaufen». GEMESSEN (ShopifyQL, 90 T, nur Menschen, Landeseite = Produkt):
Abendkleid «Sirène» 143 Sitzungen · 9 Warenkörbe · 7 an der Kasse — der mit Abstand stärkste Nachfrage-Beleg im Shop,
stand aber in KEINER Social-Vorrangliste (dort nur «kunden-liebling» = schon gekauft, Saison, CH-Lager).

REGEL: Aktive, im Onlineshop sichtbare Produkte, deren Seite in den letzten TAGE (90) Tagen mindestens MIN_WK (2)
Warenkorb-Sitzungen ODER mindestens 1 Kassen-Sitzung hatte, tragen den Tag `nachfrage-liebling`; wer die Schwelle nicht
mehr erreicht, verliert ihn. `social_saison_vorrang.py` zieht den Tag direkt nach `kunden-liebling` vor (Bild, Reel,
Metricool). Keine Kadenz- oder Sperränderung. Täglich im Aufseher (ohne Variablen = scharf; DRY=1 zeigt nur).
Nur tagsAdd/tagsRemove (nie productUpdate(tags:)). Bericht: dropship/NACHFRAGE-LIEBLING.md.
"""
import datetime as dt, json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ohne_lieferantenref_guard import gueltige_ref  # nur Ware mit belegter Bezugsquelle pushen (#1008-Klasse)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
TAG = "nachfrage-liebling"
TAGE = int(os.environ.get("TAGE", "90"))
MIN_WK = int(os.environ.get("MIN_WK", "2"))
SCHARF = os.environ.get("DRY") != "1"
BERICHT = os.path.join(REPO, "dropship/NACHFRAGE-LIEBLING.md")


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    grund = ""
    for a in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=90))
            if d.get("data") is not None and not d.get("errors"):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                if ts and ts.get("currentlyAvailable", 1000) < 400:      # Eimer-Etikette
                    time.sleep(3)
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:160]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:160]
        time.sleep(3 + 3 * a)
    print(f"gql: letzter Grund: {grund}", file=sys.stderr)
    raise RuntimeError(f"Shopify antwortet nicht ({grund}) — Lauf abgebrochen, nichts quittiert")


def main():
    jetzt = dt.datetime.now(dt.timezone.utc)
    print(f"START {jetzt:%Y-%m-%dT%H:%MZ}: {TAG} · {TAGE} T · ≥{MIN_WK} Warenkorb oder ≥1 Kasse · {'SCHARF' if SCHARF else 'TROCKEN'}")
    q = (f"FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout GROUP BY landing_page_path "
         f"WHERE human_or_bot_session = 'human' AND landing_page_type = 'Product' SINCE -{TAGE}d UNTIL today "
         f"ORDER BY sessions_with_cart_additions DESC LIMIT 500")
    t = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})["shopifyqlQuery"]
    if t.get("parseErrors"):
        raise RuntimeError(f"ShopifyQL: {str(t['parseErrors'])[:200]}")
    rows = (t.get("tableData") or {}).get("rows") or []
    kandidaten = {}
    for r in rows:
        p = r.get("landing_page_path") or ""
        if not p.startswith("/products/"):
            continue
        wk, ka = int(r.get("sessions_with_cart_additions") or 0), int(r.get("sessions_that_reached_checkout") or 0)
        if wk >= MIN_WK or ka >= 1:
            kandidaten[p.split("/products/")[1].split("?")[0]] = (int(r.get("sessions") or 0), wk, ka)
    print(f"Landeseiten gelesen: {len(rows)} · Nachfrage-Kandidaten: {len(kandidaten)}")
    if not rows:
        print("⚠️ 0 Zeilen aus ShopifyQL — nichts geändert (Messfehler ≠ keine Nachfrage)")
        return
    soll, zeilen = {}, []
    for h, (s, wk, ka) in sorted(kandidaten.items(), key=lambda x: (-x[1][1], -x[1][0])):
        p = gql('query($h:String!){productByHandle(handle:$h){id title status onlineStoreUrl tags variants(first:20){nodes{sku}}}}', {"h": h})["productByHandle"]
        quelle = bool(p) and (any(gueltige_ref(v["sku"]) for v in p["variants"]["nodes"]) or any("printful" in t.lower() or t.startswith("pod-") for t in p["tags"]))
        ok = bool(p and p["status"] == "ACTIVE" and p["onlineStoreUrl"] and quelle)
        grund = '✅ Tag' if ok else ('— ' + (p['status'] if p and p['status'] != 'ACTIVE' else ('keine Bezugsquelle' if p else 'fehlt')))
        zeilen.append(f"| {h[:60]} | {s} | {wk} | {ka} | {grund} |")
        if ok:
            soll[p["id"]] = p["title"]
    ist = {}
    c = None
    while True:
        r = gql('query($q:String!,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id title}}}',
                {"q": f"tag:{TAG}", "c": c})["products"]
        ist.update({n["id"]: n["title"] for n in r["nodes"]})
        if not r["pageInfo"]["hasNextPage"]:
            break
        c = r["pageInfo"]["endCursor"]
    dazu = [i for i in soll if i not in ist]
    weg = [i for i in ist if i not in soll]
    for i in dazu:
        print(f"  + {soll[i][:60]}")
        if SCHARF:
            e = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": i, "t": [TAG]})["tagsAdd"]["userErrors"]
            if e:
                print("    Fehler:", e[0]["message"])
    for i in weg:
        print(f"  − {ist[i][:60]}")
        if SCHARF:
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}', {"id": i, "t": [TAG]})
    if SCHARF:
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write(f"# Nachfrage-Lieblinge (automatisch, {jetzt:%Y-%m-%d %H:%M} UTC)\n\n"
                    f"> `automation/nachfrage_liebling.py`: Produktseiten mit ≥{MIN_WK} Warenkorb- oder ≥1 Kassen-Sitzung "
                    f"({TAGE} T, nur Menschen) → Tag `{TAG}` → Vorrang in allen Social-Queues (nach `kunden-liebling`).\n\n"
                    "| Handle | Sitzungen | Warenkorb | Kasse | Status |\n|---|---:|---:|---:|---|\n" + "\n".join(zeilen) + "\n")
    print(f"FERTIG: {len(soll)} mit Tag · +{len(dazu)} · −{len(weg)}" + ("" if SCHARF else " (TROCKEN)"))


if __name__ == "__main__":
    main()
