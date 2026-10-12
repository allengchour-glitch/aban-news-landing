#!/usr/bin/env python3
"""webseite_bilanz.py — Bilanz des 12-Tage-Plans «Webseite pimpen» (Tag 12, 12.10.2026).

ANLASS: Plan dropship/WEBSEITE-12-TAGE-PLAN.md, Tag 12 «Auswertung: Sitzungen, Warenkörbe, Käufe vorher/nachher».
  VORHER   = 19.–30.09. (12 Tage vor dem Plan)
  NACHHER  = 01.10. bis heute (Plan-Zeitraum)
  7 T      = gleiches Fenster wie die Ausgangsmessung vom 01.10. (115 menschliche Sitzungen, Startseite 46,
             29 meistbesuchte Produktseiten davon 2 mit Bewertungen)
Nur Menschen (human_or_bot_session = 'human'). Liest nur (ShopifyQL + GraphQL), schreibt nichts.
Käufe = Bestellungen ohne Testbestellung und ohne Storno/Erstattung; eigene Testkäufe über
EIGENE_KUNDEN_IDS (Komma-Liste der Kundennummern, nur in der Umgebung, nie im Repo) herausrechnen.

  python3 tools/webseite_bilanz.py
"""
import os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HIER), "automation"))
sys.path.insert(0, HIER)
from seo_autopilot import gql  # noqa: E402
from werbetest_trichter import ql, FELDER  # noqa: E402

FENSTER = {
    "vorher 19.–30.09.": "SINCE 2026-09-19 UNTIL 2026-09-30",
    "nachher 01.10.–heute": "SINCE 2026-10-01 UNTIL today",
    "7 T (wie 01.10.)": "SINCE -7d UNTIL today",
}
ZAEHLER = ("sessions", "sessions_with_cart_additions", "sessions_that_reached_checkout", "sessions_that_completed_checkout")
EIGENE = {x.strip() for x in os.environ.get("EIGENE_KUNDEN_IDS", "").split(",") if x.strip()}

Q_ORDERS = """query($c:String,$q:String!){orders(first:100, after:$c, query:$q, sortKey:CREATED_AT){
  pageInfo{hasNextPage endCursor}
  edges{node{name createdAt test cancelledAt displayFinancialStatus
    currentTotalPriceSet{shopMoney{amount currencyCode}} customer{id numberOfOrders}}}}}"""

Q_REVIEWS = """query($h:String!){productByHandle(handle:$h){status metafield(namespace:"reviews", key:"rating_count"){value}}}"""


def zaehle(fenster, rows=None):
    """Summe der Trichter-Zähler für ein Zeitfenster (menschliche Sitzungen)."""
    rows = rows or ql(f"FROM sessions SHOW {FELDER} WHERE human_or_bot_session = 'human' {fenster}")
    return {k: sum(int(r.get(k) or 0) for r in rows) for k in ZAEHLER}


def startseite(fenster):
    rows = ql(f"FROM sessions SHOW sessions GROUP BY landing_page_type WHERE human_or_bot_session = 'human' {fenster}")
    return sum(int(r.get("sessions") or 0) for r in rows if r.get("landing_page_type") == "Homepage")


def bestellungen(seit="2026-09-19"):
    """Alle Bestellungen seit dem Stichtag, paginiert. Gibt Liste von Dicts zurück."""
    out, cursor = [], None
    while True:
        d = gql(Q_ORDERS, {"c": cursor, "q": f"created_at:>={seit}"})["orders"]
        out += [e["node"] for e in d["edges"]]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cursor = d["pageInfo"]["endCursor"]


def kaeufe(bestell_liste, von, bis):
    """Käufe im Fenster [von, bis] (Datum YYYY-MM-DD, UTC) — Test, Storno, Erstattung und eigene Kunden raus."""
    n = erstattet = eigen = 0
    summe = 0.0
    for b in bestell_liste:
        tag = b["createdAt"][:10]
        if not (von <= tag <= bis):
            continue
        if b.get("test") or b.get("cancelledAt"):
            continue
        if str(b["customer"]["id"]).rsplit("/", 1)[-1] in EIGENE:
            eigen += 1
            continue
        if b["displayFinancialStatus"] in ("REFUNDED", "VOIDED"):
            erstattet += 1
            continue
        n += 1
        summe += float(b["currentTotalPriceSet"]["shopMoney"]["amount"] or 0)
    return n, erstattet, eigen, summe


def top_produkte(tage=7, n=29):
    rows = ql(f"FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session = 'human' "
              f"AND landing_page_type = 'Product' SINCE -{tage}d UNTIL today ORDER BY sessions DESC LIMIT {n}")
    handles = []
    for r in rows:
        p = r.get("landing_page_path") or ""
        if "/products/" in p:
            handles.append((p.split("/products/")[1].split("?")[0], int(r.get("sessions") or 0)))
    mit = 0
    for h, _ in handles:
        p = gql(Q_REVIEWS, {"h": h})["productByHandle"]
        if p and (p.get("metafield") or {}).get("value") not in (None, "", "0"):
            mit += 1
    return len(handles), mit


def main():
    print("1) Trichter menschlicher Sitzungen je Zeitfenster")
    print(f"   {'Fenster':22} {'Sitz.':>6} {'Korb':>5} {'Kasse':>6} {'Kauf':>5}  Korb-%  Kasse-%  Kauf-%  Startseite")
    for name, fenster in FENSTER.items():
        z = zaehle(fenster)
        s = z["sessions"] or 0
        q = lambda k: f"{100 * z[k] / s:5.1f} %" if s else "    –"
        print(f"   {name:22} {s:>6} {z['sessions_with_cart_additions']:>5} {z['sessions_that_reached_checkout']:>6} "
              f"{z['sessions_that_completed_checkout']:>5}  {q('sessions_with_cart_additions')}  "
              f"{q('sessions_that_reached_checkout')}  {q('sessions_that_completed_checkout')}  {startseite(fenster):>6}")
        # 12.10.2026: Wellen automatischer Produktaufrufe (Shopify zählt sie als Mensch) getrennt ausweisen —
        # Regel und Messung in tools/botwellen.py. Wellen haben per Regel 0 Warenkörbe → nur der Nenner sinkt.
        try:
            from botwellen import wellen
            w, in_w, _ = wellen(fenster)
        except SystemExit:
            w, in_w = [], 0
        if in_w:
            s2 = s - in_w
            q2 = lambda k: f"{100 * z[k] / s2:5.1f} %" if s2 else "    –"
            print(f"   {'  ohne Bot-Wellen':22} {s2:>6} {z['sessions_with_cart_additions']:>5} "
                  f"{z['sessions_that_reached_checkout']:>6} {z['sessions_that_completed_checkout']:>5}  "
                  f"{q2('sessions_with_cart_additions')}  {q2('sessions_that_reached_checkout')}  "
                  f"{q2('sessions_that_completed_checkout')}  ({len(w)} Wellen-Stunden, −{in_w})")

    print("\n2) Bestellungen (ohne Test/Storno; Erstattung und eigene Kunden getrennt)")
    alle = bestellungen()
    for name, von, bis in (("vorher 19.–30.09.", "2026-09-19", "2026-09-30"),
                           ("nachher 01.10.–12.10.", "2026-10-01", "2026-10-12")):
        n, erst, eigen, summe = kaeufe(alle, von, bis)
        print(f"   {name:22} Käufe {n:>3} · CHF {summe:,.2f} · erstattet {erst} · eigene {eigen}".replace(",", "'"))

    print("\n3) Bewertungen auf den 29 meistbesuchten Produktseiten (7 T)")
    n_top, mit = top_produkte()
    print(f"   Seiten geprüft {n_top} · mit Bewertung {mit}  (Ausgangsmessung 01.10.: 29 · 2)")


if __name__ == "__main__":
    main()
