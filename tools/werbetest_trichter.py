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
  python3 tools/werbetest_trichter.py --wache                Testprodukte aus dropship/_werbetest_aktiv.json: fremde Landeseiten,
                                                             Google-Meldung [CH], seit Teststart geschrieben (13.10.2026, Test A)
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


def wache(w=None):
    """13.10.2026 (Werbetest A «geschenke-test», 13 Produkte): Was die Ampel bisher nur für EIN `handle` prüfte, für alle
    `handles` der Steuerdatei: (1) Sitzungen der Kampagne auf FREMDEN Produkten (Produktgruppe offen, Fehler vom 10.10.),
    (2) Google-Meldung «… Shopping ads … [CH]» je Testprodukt (Werbe-Kontingent, Sirène/Aurora 12.10.), (3) Testprodukte mit
    `updatedAt` nach Teststart — jeder Schreibvorgang ist ein neuer Zug ums Kontingent (Sperre dropship/_werbetest_sperre.txt).
    Gibt ein dict zurück; `zeile(d)` macht daraus die Ampel-Zeile. Liest nur."""
    import json, datetime as dt
    if w is None:
        w = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dropship", "_werbetest_aktiv.json"),
                           encoding="utf-8"))
    handles = list(w.get("handles") or ([w["handle"]] if w.get("handle") else []))
    start = min(dt.date.fromisoformat(w["start"]), dt.date.today())
    fremd = 0
    for z in ql(f"FROM sessions SHOW sessions GROUP BY landing_page_path WHERE utm_campaign = '{w['kampagne']}' "
                f"SINCE {start.isoformat()} UNTIL today"):
        pfad = z.get("landing_page_path") or ""
        if not any(h in pfad for h in handles):
            fremd += int(z.get("sessions") or 0)
    sperre, geschrieben, fehlt = [], [], []
    for h in handles:
        p = gql('query($h:String!){productByHandle(handle:$h){title status updatedAt feedback{details{messages{message}}}}}',
                {"h": h}).get("productByHandle")
        if not p:
            fehlt.append(h); continue
        kurz = p["title"][:28]
        if p["status"] != "ACTIVE":
            fehlt.append(f"{kurz} ({p['status']})")
        for det in ((p.get("feedback") or {}).get("details") or []):
            for m in det.get("messages") or []:
                if "Shopping ads" in m["message"].replace("_", " ") and "[CH]" in m["message"]:
                    sperre.append(kurz); break
        if (p.get("updatedAt") or "")[:10] >= w["start"]:
            geschrieben.append(f"{kurz} {p['updatedAt'][5:16]}")
    return {"kampagne": w["kampagne"], "produkte": len(handles), "fremd": fremd, "sperre": sorted(set(sperre)),
            "geschrieben": geschrieben, "fehlt": fehlt}


def zeile(d):
    teile = [f"Testprodukte {d['produkte'] - len(d['fehlt'])}/{d['produkte']} aktiv"]
    if d["fehlt"]:
        teile.append("⚠️ fehlt/nicht aktiv: " + "; ".join(d["fehlt"][:4]))
    if d["fremd"]:
        teile.append(f"⚠️ {d['fremd']} Sitz. auf FREMDEN Produkten → Produktgruppe «Alles andere» ausschliessen")
    if d["sperre"]:
        teile.append(f"⛔ {len(d['sperre'])} bei Google nicht bewerbbar [CH] ({'; '.join(d['sperre'][:3])}) → NICHT per Schreiben reparieren")
    if d["geschrieben"]:
        teile.append(f"⚠️ {len(d['geschrieben'])} seit Teststart geschrieben ({'; '.join(d['geschrieben'][:3])}) → Schreiber suchen, Sperre prüfen")
    return f"WERBETEST {d['kampagne']} Produkte: " + " · ".join(teile)


if __name__ == "__main__":
    if "--wache" in sys.argv:
        print(zeile(wache()))
        sys.exit(0)
    if len(sys.argv) > 1:
        kampagne(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 14)
    else:
        uebersicht()
