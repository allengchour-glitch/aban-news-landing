#!/usr/bin/env python3
"""bewertungen_nachholen_liste.py — Produkte, deren importierte Bewertungen nur 4–5 Sterne zeigen (24.09.2026).

WARUM: Der Tagesstarter im Aufseher rief `cj_reviews_import.mjs` mit MIN_SCORE=4 auf, obwohl das Skript seit dem
23.08. absichtlich ALLE Sternstufen nimmt (Lehre: «nur ≥4★» ist eine Rosinenauswahl, UWG Art. 3). Gemessen am 24.09.:
10'976 Bewertungen, 9'870 × 5★, 1'068 × 4★, nur 38 × 1–3★ (0,35 %). Der Import quittiert ganze Produkte — die
ausgelassenen schlechteren Kommentare kämen nie nach. Diese Liste nennt die Produkte, die Bewertungen haben, aber
KEINE unter 4 Sternen; `NACHHOLEN=1 cj_reviews_import.mjs` holt dort nur die 1–3★-Kommentare (keine Doppelten).

Ausgabe: dropship/_bewertungen_nachholen.txt (Handles, meistbewertete zuerst) + Zählung der `verified`-Werte.
Nur lesen. Paginierung je rating (API klemmt page bei 100, per_page bei 100).
"""
import collections, json, os, sys, time, urllib.parse, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUS = os.path.join(REPO, "dropship", "_bewertungen_nachholen.txt")
env = {}
for l in open(os.environ.get("JUDGEME_ENV", "/tmp/judgeme.env")):
    l = l.strip().replace("export ", "")
    if "=" in l:
        k, v = l.split("=", 1); env[k] = v.strip("\"'")
BASIS = {"api_token": env["JUDGEME_PRIVATE_TOKEN"], "shop_domain": env.get("JUDGEME_SHOP_DOMAIN", "au3j0y-hq.myshopify.com")}


def hole(**q):
    url = "https://judge.me/api/v1/reviews?" + urllib.parse.urlencode({**BASIS, **q})
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "luxe"}), timeout=40))
        except Exception:
            time.sleep(3 * (i + 1))
    raise SystemExit("PAUSE: Judge.me antwortet nicht — keine Liste geschrieben")


anzahl = collections.Counter(); tief = set(); verified = collections.Counter(); gesehen = set()
for rating in (1, 2, 3, 4, 5):
    for seite in range(1, 101):
        d = hole(per_page=100, page=seite, rating=rating)
        rs = d.get("reviews") or []
        neu = [r for r in rs if r["id"] not in gesehen]
        for r in neu:
            gesehen.add(r["id"])
            if not r.get("published"):
                continue
            h = r.get("product_handle") or ""
            verified[str(r.get("verified"))] += 1
            if rating <= 3:
                tief.add(h)
            else:
                anzahl[h] += 1
        if len(rs) < 100 or not neu:
            break
liste = [h for h, _ in anzahl.most_common() if h and h not in tief]
open(AUS, "w").write("\n".join(liste) + "\n")
print(f"geprüft {len(gesehen)} Bewertungen · Produkte mit 4–5★: {len(anzahl)} · davon schon mit 1–3★: {len(tief & set(anzahl))}")
print(f"verified-Werte: {dict(verified)}")
print(f"FERTIG: {len(liste)} Produkte in {os.path.relpath(AUS, REPO)}")
