#!/usr/bin/env python3
"""werbetest_trichter.py — Werbung nicht an Klicks messen, sondern bis zum Kauf (10.10.2026).

ANLASS: Sidekick-Empfehlung «Erst danach gezielt Werbung testen … Miss nicht nur Klicks, sondern auch Warenkörbe, erreichte Checkouts
und Käufe.» Gemessen 10.10. (30 T, ShopifyQL, Gruppierung utm_campaign/utm_source):
    TikTok «lernen-okt26» (CHF 80, 01.–04.10.)   548 Sitzungen ·  8 Warenkorb · 6 Kasse · 0 Kauf
    ChatGPT (ohne Kampagne)                       112 Sitzungen ·  6 Warenkorb · 2 Kasse · 1 Kauf
    Facebook «autopilot»                           96 Sitzungen ·  0 · 0 · 0
Ein Werbetest ohne diese Zeile meldet nur «548 Klicks».

  python3 tools/werbetest_trichter.py                        alle Kampagnen der letzten 30 Tage (Trichter + Quoten)
  python3 tools/werbetest_trichter.py KAMPAGNE [TAGE]        eine Kampagne je Tag + Gewinnschwelle (BUDGET=CHF, MARGE=CHF je Kauf)
Die Kampagne muss in der Anzeige als utm_campaign stehen (z. B. …?utm_source=tiktok&utm_medium=paid&utm_campaign=sirene-test-nov).
Liest nur (shopifyqlQuery), schreibt nichts.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "automation"))
from seo_autopilot import gql  # noqa: E402

FELDER = "sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout"


def ql(q):
    t = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{columns{name} rows} parseErrors}}', {"q": q})["shopifyqlQuery"]
    if t.get("parseErrors"):
        sys.exit(f"ShopifyQL: {t['parseErrors']}")
    cols = [c["name"] for c in t["tableData"]["columns"]]
    return [dict(zip(cols, r)) if isinstance(r, list) else r for r in t["tableData"]["rows"]]


def quote(a, b):
    return f"{100 * int(a) / int(b):.1f} %" if int(b or 0) else "–"


def uebersicht(tage=30):
    rows = ql(f"FROM sessions SHOW {FELDER} GROUP BY utm_campaign, utm_source SINCE -{tage}d UNTIL today ORDER BY sessions DESC LIMIT 25")
    print(f"Trichter je Kampagne, letzte {tage} Tage\n{'Kampagne':24} {'Quelle':14} {'Sitz.':>6} {'Korb':>5} {'Kasse':>6} {'Kauf':>5}  Korb-%  Kauf-%")
    for r in rows:
        print(f"{(r.get('utm_campaign') or '(ohne)')[:24]:24} {(r.get('utm_source') or '(ohne)')[:14]:14} {r['sessions']:>6} "
              f"{r['sessions_with_cart_additions']:>5} {r['sessions_that_reached_checkout']:>6} {r['sessions_that_completed_checkout']:>5}  "
              f"{quote(r['sessions_with_cart_additions'], r['sessions']):>6}  {quote(r['sessions_that_completed_checkout'], r['sessions']):>6}")


def kampagne(name, tage=14):
    rows = ql(f"FROM sessions SHOW {FELDER} WHERE utm_campaign = '{name}' TIMESERIES day SINCE -{tage}d UNTIL today")
    summe = {k: 0 for k in ("sessions", "sessions_with_cart_additions", "sessions_that_reached_checkout", "sessions_that_completed_checkout")}
    print(f"Kampagne «{name}», letzte {tage} Tage\n{'Tag':12} {'Sitz.':>6} {'Korb':>5} {'Kasse':>6} {'Kauf':>5}")
    for r in rows:
        if not int(r["sessions"] or 0):
            continue
        for k in summe:
            summe[k] += int(r[k] or 0)
        print(f"{str(r.get('day'))[:10]:12} {r['sessions']:>6} {r['sessions_with_cart_additions']:>5} {r['sessions_that_reached_checkout']:>6} "
              f"{r['sessions_that_completed_checkout']:>5}")
    s = summe
    print(f"{'SUMME':12} {s['sessions']:>6} {s['sessions_with_cart_additions']:>5} {s['sessions_that_reached_checkout']:>6} "
          f"{s['sessions_that_completed_checkout']:>5}   Korb {quote(s['sessions_with_cart_additions'], s['sessions'])} · "
          f"Kasse {quote(s['sessions_that_reached_checkout'], s['sessions'])} · Kauf {quote(s['sessions_that_completed_checkout'], s['sessions'])}")
    budget, marge = float(os.environ.get("BUDGET", "0") or 0), float(os.environ.get("MARGE", "0") or 0)
    if budget:
        kaeufe = s["sessions_that_completed_checkout"]
        print(f"Budget CHF {budget:.0f} · Kosten je Kauf {'CHF %.0f' % (budget / kaeufe) if kaeufe else '∞ (0 Käufe)'}"
              + (f" · Gewinnschwelle CHF {marge:.0f} je Kauf → {'LOHNT' if kaeufe and budget / kaeufe <= marge else 'lohnt NICHT'}" if marge else ""))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        kampagne(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 14)
    else:
        uebersicht()
