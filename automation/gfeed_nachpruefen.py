#!/usr/bin/env python3
"""gfeed_nachpruefen.py — Versuch: holt ein harmloser Produkt-Update «Product page unavailable» aus Google zurück?

Anlass 29.09.2026 (Betreiber «jeden tag ein verkauf machen» → «nur gratis»): Die Google-Gratis-Einträge sind der einzige
Kanal mit Verkäufen. 256 aktive, im Onlineshop publizierte Produkte tragen die Google-Meldung «Product page unavailable».
GEMESSEN: 40/40 Stichproben sind laut Storefront kaufbar, die Seiten antworten mit HTTP 200 — was Googles Crawler sah,
ist von hier nicht messbar (unsere IP bekommt teils die Bot-Prüfung 429). Vermutung (BEHAUPTUNG): alte Meldung aus einer
Zeit, in der die Seite nicht erreichbar war; ein Produkt-Update lässt die App «Google & YouTube» neu einreichen.

Versuch mit Kontrollgruppe statt Massen-Eingriff:
  A (jede zweite Zeile der Liste) → tagsAdd «gfeed-nachpruefen-2909» (ändert nichts Sichtbares, löst products/update aus)
  B (die anderen)                 → unverändert
Auswertung, sobald google_feedback_wache.py einen neuen Vollscan geschrieben hat (Stand > Versuchsstart):
  python3 automation/gfeed_nachpruefen.py --auswerten   → «A: x/128 noch blockiert · B: y/128 noch blockiert»

  python3 automation/gfeed_nachpruefen.py              → Trockenlauf
  SCHARF=1 python3 automation/gfeed_nachpruefen.py     → Tags setzen (nur Gruppe A), Plan nach dropship/_gfeed_nachpruefen_2909.json
"""
import json, os, sys, time, urllib.request, datetime as dt

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
PLAN = os.path.join(REPO, "dropship/_gfeed_nachpruefen_2909.json")
KLASSE = "Product page unavailable"
TAG = "gfeed-nachpruefen-2909"


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    for a in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
            if d.get("data") is not None and not d.get("errors"):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                if ts and ts.get("currentlyAvailable", 1000) < 400:      # Eimer-Etikette: andere Schreiber nicht aushungern
                    time.sleep(3)
                return d["data"]
        except Exception:
            pass
        time.sleep(3 + 3 * a)
    raise RuntimeError("Shopify antwortet nicht")


def auswerten():
    plan = json.load(open(PLAN))
    stand = json.load(open(STAND))
    if stand["stand"] <= plan["start"]:
        if "--laut" in sys.argv:
            print(f"AUSWERTUNG: noch kein neuer Google-Vollscan (Stand {stand['stand']} ≤ Versuchsstart {plan['start']})")
        return
    noch = set(stand["handles"].get(KLASSE, []))
    a = sum(1 for h in plan["A"] if h in noch); b = sum(1 for h in plan["B"] if h in noch)
    print(f"AUSWERTUNG ({stand['stand']}): A (Tag) {a}/{len(plan['A'])} noch blockiert · B (Kontrolle) {b}/{len(plan['B'])} noch blockiert")


def main():
    if "--auswerten" in sys.argv:
        return auswerten()
    handles = json.load(open(STAND))["handles"][KLASSE]
    A, B = handles[0::2], handles[1::2]
    print(f"{KLASSE}: {len(handles)} → A {len(A)} (Tag) · B {len(B)} (Kontrolle)")
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — nichts geschrieben"); return
    if os.path.exists(PLAN):
        print("Plan existiert schon — Versuch läuft, nicht doppelt starten"); return
    start = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    ok = fehl = 0
    for i in range(0, len(A), 25):
        teil = A[i:i + 25]
        d = gql("query($q:String){products(first:25,query:$q){nodes{id handle}}}", {"q": " OR ".join(f'handle:"{h}"' for h in teil)})
        for n in d["products"]["nodes"]:
            if n["handle"] not in teil:
                continue
            r = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": n["id"], "t": [TAG]})
            if r["tagsAdd"]["userErrors"]:
                fehl += 1
            else:
                ok += 1
    json.dump({"start": start, "klasse": KLASSE, "tag": TAG, "A": A, "B": B, "getaggt": ok, "fehler": fehl}, open(PLAN, "w"), indent=1)
    print(f"FERTIG: {ok} getaggt, {fehl} Fehler · Plan {PLAN}")


if __name__ == "__main__":
    main()
