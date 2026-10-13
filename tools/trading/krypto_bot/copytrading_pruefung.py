#!/usr/bin/env python3
"""Copy-Trading-Prüfstand (Binance) — lohnt es sich, «die Besten» zu kopieren?

VORAB FESTGELEGT am 13.10.2026, bevor die Daten geladen wurden (der Git-Verlauf belegt die Reihenfolge):

Daten: die öffentliche Binance-Copy-Trading-Seite (Leadtrader-Ranglisten, Details, Leistung, ROI-Kurve, Positionsverlauf).
Ranglisten (je Top 150): ROI 30 Tage, ROI 90 Tage, ROI 180 Tage, Gewinn 90 Tage, Kopierer-Gewinn 90 Tage.

Fragen:
  F1 Verdienen die KOPIERER der Rangliste-Besten Geld? (Summe copierPnl und Anteil der Trader mit Kopierern im Minus,
     je Top 10 / 30 / 150 der Ranglisten.)
  F2 Hält ein guter Rang? Für jeden Trader mit ≥ 120 Tagen ROI-Kurve: Rendite der ersten Hälfte gegen die zweite Hälfte
     (Rangkorrelation; Top-10-% der ersten Hälfte gegen den Rest). ACHTUNG: Binance zeigt nur noch aktive Portfolios —
     wer pleite ging, fehlt. Das schönt das Ergebnis; ein schlechtes Ergebnis hier ist darum besonders aussagekräftig.
  F3 Neustarts: Wie viele der Besten haben schon Portfolios geschlossen und neu angefangen (closeLeadCount)?
  F4 Filter «kopierbar» (Schwellen in copytrading_kern.py): ≥ 180 Tage, nie neu gestartet, ROI 30/90/180 Tage im Plus,
     Einbruch ≤ 25 %, Kopierer insgesamt im Plus, kein Hebel > 20×, grösster Einzelverlust ≤ 10 × Durchschnittsgewinn
     (≥ 30 geschlossene Positionen).
  F5 Vorwärts-Test (ab heute, ohne Rückschau-Fehler): die Kandidaten aus F4 und zum Vergleich die naiven Top 10 (ROI 90
     Tage, ROI 30 Tage) werden mit Datum gespeichert. Nach 30 Tagen zählt ihre 30-Tage-ROI = was Kopieren seither gebracht
     hätte (ohne Kopier-Verluste durch Verzögerung und Gewinnbeteiligung — die echte Kopie ist schlechter). Geschlossene
     Portfolios zählen als «weg».
Keine Anlageberatung: Das Ergebnis sagt, was die Daten zeigen — nicht, was morgen passiert.

Aufruf: python3 tools/trading/krypto_bot/copytrading_pruefung.py              → Prüfung + data/copytrading-pruefung.json
        python3 tools/trading/krypto_bot/copytrading_pruefung.py --auswerten  → Vorwärts-Test: fällige Einträge auswerten
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import copytrading_kern as K  # noqa: E402

BASIS = "https://www.binance.com/bapi/futures/v1"
AUSGABE = HIER.parents[2] / "data" / "copytrading-pruefung.json"
SCHATTEN = HIER.parents[2] / "data" / "copytrading-schatten.json"
CACHE = HIER.parent / "daten" / "copytrading"
RANGLISTEN = [("30D", "ROI"), ("90D", "ROI"), ("180D", "ROI"), ("90D", "PNL"), ("90D", "COPIER_PNL")]
TOP, SEITE, PAUSE_S = 150, 30, 0.12
VORWAERTS_TAGE = 30


def _http(methode, pfad, daten=None, versuche=4):
    for v in range(versuche):
        try:
            req = urllib.request.Request(BASIS + pfad, method=methode, data=json.dumps(daten).encode() if daten is not None else None,
                                         headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "clienttype": "web"})
            with urllib.request.urlopen(req, timeout=30) as r:
                antwort = json.loads(r.read().decode())
            time.sleep(PAUSE_S)
            if antwort.get("code") not in ("000000", None):
                raise ValueError(f"Binance-Code {antwort.get('code')}: {antwort.get('message')}")
            return antwort.get("data")
        except (urllib.error.URLError, OSError, ValueError):
            if v == versuche - 1:
                raise
            time.sleep(2 ** v)


def rangliste(zeitraum, art, n=TOP):
    out = []
    for seite in range(1, n // SEITE + 1):
        d = _http("POST", "/friendly/future/copy-trade/home-page/query-list",
                  {"pageNumber": seite, "pageSize": SEITE, "timeRange": zeitraum, "dataType": art, "favoriteOnly": False,
                   "hideFull": False, "nickname": "", "order": "DESC", "portfolioType": "PUBLIC"}) or {}
        out += d.get("list") or []
        if len(d.get("list") or []) < SEITE:
            break
    return out


def detail(pid):
    return _http("GET", f"/friendly/future/copy-trade/lead-portfolio/detail?portfolioId={pid}") or {}


def leistung(pid, zeitraum):
    return _http("GET", f"/public/future/copy-trade/lead-portfolio/performance?portfolioId={pid}&timeRange={zeitraum}") or {}


def kurve(pid):
    return _http("GET", f"/public/future/copy-trade/lead-portfolio/chart-data?dataType=ROI&portfolioId={pid}&timeRange=180D") or []


def positionen(pid, hoechstens=300):
    out, seite = [], 1
    while len(out) < hoechstens:
        d = _http("POST", "/friendly/future/copy-trade/lead-portfolio/position-history",
                  {"pageNumber": seite, "pageSize": 50, "portfolioId": pid, "sort": "OPENING"}) or {}
        teil = d.get("list") or []
        out += teil
        if len(teil) < 50:
            break
        seite += 1
    return out[:hoechstens]


def pruefung():
    jetzt = int(time.time() * 1000)
    listen = {f"{a}_{z}": rangliste(z, a) for z, a in RANGLISTEN}
    print("Ranglisten:", {k: len(v) for k, v in listen.items()}, flush=True)
    ids = list(dict.fromkeys(str(x["leadPortfolioId"]) for v in listen.values() for x in v))
    trader = {}
    for i, pid in enumerate(ids, 1):
        trader[pid] = {"detail": detail(pid), "leistung": {"180D": leistung(pid, "180D")}, "kurve": kurve(pid)}
        if i % 50 == 0:
            print(f"  {i}/{len(ids)} Leadtrader geladen", flush=True)
    # Vorauswahl ohne teure Abfragen, dann 30D/90D + Positionen nur für die Übrigen
    for pid, t in trader.items():
        d, l180 = t["detail"], t["leistung"]["180D"]
        if (K.tage_aktiv(d, jetzt) >= K.MIN_TAGE and int(d.get("closeLeadCount") or 0) <= K.MAX_NEUSTARTS
                and float(d.get("copierPnl") or 0) > 0 and float(l180.get("roi") or 0) > 0 and float(l180.get("mdd") or 999) <= K.MAX_MDD
                and not (K.VERBOTENE_TAGS & set(d.get("tag") or []))):
            t["leistung"]["30D"], t["leistung"]["90D"] = leistung(pid, "30D"), leistung(pid, "90D")
            t["muster"] = K.verlust_muster(positionen(pid))
    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / f"rohdaten-{datetime.now(timezone.utc).date().isoformat()}.json").write_text(json.dumps({"listen": listen, "trader": trader}))

    # F1 Kopierer-Bilanz der Ranglisten
    f1 = {name: {n: K.kopierer_bilanz(v, n) for n in (10, 30, TOP)} for name, v in listen.items()}
    # F2 Hält der Rang? (nur überlebende Portfolios)
    paare = [(pid, h) for pid, t in trader.items() if (h := K.haelften(t["kurve"] or []))]
    erste, zweite = [h[0] for _, h in paare], [h[1] for _, h in paare]
    grenze = sorted(erste)[int(len(erste) * 0.9)] if erste else None
    top10 = [h[1] for _, h in paare if grenze is not None and h[0] >= grenze]
    rest = [h[1] for _, h in paare if grenze is not None and h[0] < grenze]
    med = lambda x: sorted(x)[len(x) // 2] if x else None  # noqa: E731
    f2 = {"trader": len(paare), "rangkorrelation": K.rang_korrelation(erste, zweite),
          "top10_median_zweite_haelfte": med(top10), "rest_median_zweite_haelfte": med(rest),
          "top10_anteil_zweite_haelfte_minus": round(sum(1 for x in top10 if x < 0) / len(top10), 4) if top10 else None}
    # F3 Neustarts
    f3 = {name: round(sum(1 for x in v[:TOP] if int(trader[str(x["leadPortfolioId"])]["detail"].get("closeLeadCount") or 0) > 0)
                      / max(1, len(v[:TOP])), 4) for name, v in listen.items()}
    # F4 Kandidaten
    kandidaten, durchgefallen = [], {}
    for pid, t in trader.items():
        ok, gruende = K.pruefe_kandidat(t, jetzt)
        if ok:
            d, l = t["detail"], t["leistung"]
            kandidaten.append({"id": pid, "name": d.get("nickname"), "tage": round(K.tage_aktiv(d, jetzt)),
                               "roi30": l["30D"].get("roi"), "roi90": l["90D"].get("roi"), "roi180": l["180D"].get("roi"),
                               "mdd180": l["180D"].get("mdd"), "kopierer_pnl": float(d.get("copierPnl") or 0),
                               "gewinnbeteiligung": d.get("profitSharingRate"), "muster": t["muster"],
                               "plaetze_frei": int(d.get("maxCopyCount") or 0) - int(d.get("currentCopyCount") or 0)})
        for g in gruende:
            durchgefallen[g.split(" (")[0].split(" =")[0]] = durchgefallen.get(g.split(" (")[0].split(" =")[0], 0) + 1
    kandidaten.sort(key=lambda k: -float(k["roi180"] or 0))
    erg = {"stand": datetime.now(timezone.utc).isoformat(timespec="seconds"), "leadtrader": len(trader),
           "f1_kopierer": f1, "f2_rang_haelt": f2, "f3_neustarts": f3, "f4_kandidaten": kandidaten,
           "f4_gruende": dict(sorted(durchgefallen.items(), key=lambda x: -x[1]))}
    AUSGABE.parent.mkdir(exist_ok=True)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1))
    vorwaerts_speichern(listen, kandidaten, trader)
    return erg


def vorwaerts_speichern(listen, kandidaten, trader):
    """F5: heutige Auswahl mit Datum festhalten (nur einmal pro Tag)."""
    heute = datetime.now(timezone.utc).date().isoformat()
    alt = json.loads(SCHATTEN.read_text()) if SCHATTEN.exists() else {"eintraege": []}
    if any(e["datum"] == heute for e in alt["eintraege"]):
        return
    gruppen = {"kandidaten": [k["id"] for k in kandidaten],
               "naiv_roi90": [str(x["leadPortfolioId"]) for x in listen["ROI_90D"][:10]],
               "naiv_roi30": [str(x["leadPortfolioId"]) for x in listen["ROI_30D"][:10]]}
    for gruppe, ids in gruppen.items():
        for pid in ids:
            alt["eintraege"].append({"datum": heute, "gruppe": gruppe, "id": pid,
                                     "name": trader.get(pid, {}).get("detail", {}).get("nickname"), "ergebnis": None})
    SCHATTEN.write_text(json.dumps(alt, ensure_ascii=False, indent=1))


def auswerten(jetzt=None):
    """F5: Einträge, die ≥ 30 Tage alt sind, mit der dann gültigen 30-Tage-ROI abschliessen."""
    if not SCHATTEN.exists():
        return {}
    alt = json.loads(SCHATTEN.read_text())
    jetzt = jetzt or datetime.now(timezone.utc)
    for e in alt["eintraege"]:
        if e["ergebnis"] is not None:
            continue
        if (jetzt.date() - datetime.fromisoformat(e["datum"]).date()).days < VORWAERTS_TAGE:
            continue
        d = detail(e["id"])
        if d.get("status") != "ACTIVE":
            e["ergebnis"] = {"status": d.get("status") or "unbekannt", "roi30": None}
        else:
            e["ergebnis"] = {"status": "ACTIVE", "roi30": leistung(e["id"], "30D").get("roi")}
    SCHATTEN.write_text(json.dumps(alt, ensure_ascii=False, indent=1))
    return zusammenfassung(alt)


def zusammenfassung(alt):
    out = {}
    for e in alt["eintraege"]:
        if e["ergebnis"] is None:
            continue
        g = out.setdefault(e["gruppe"], {"n": 0, "weg": 0, "roi": []})
        g["n"] += 1
        if e["ergebnis"]["status"] != "ACTIVE":
            g["weg"] += 1
        elif e["ergebnis"]["roi30"] is not None:
            g["roi"].append(float(e["ergebnis"]["roi30"]))
    for g in out.values():
        r = sorted(g.pop("roi"))
        g["median_roi30"] = r[len(r) // 2] if r else None
        g["anteil_minus"] = round(sum(1 for x in r if x < 0) / len(r), 3) if r else None
    return out


def main():
    if "--auswerten" in sys.argv:
        print(json.dumps(auswerten(), ensure_ascii=False, indent=1))
        return 0
    erg = pruefung()
    print(json.dumps({k: v for k, v in erg.items() if k != "f4_kandidaten"}, ensure_ascii=False, indent=1))
    print(f"\nKandidaten «kopierbar»: {len(erg['f4_kandidaten'])}")
    for k in erg["f4_kandidaten"][:20]:
        print(f"  {k['name']}: {k['tage']} Tage, ROI 30/90/180 = {k['roi30']:.1f}/{k['roi90']:.1f}/{k['roi180']:.1f} %, "
              f"Einbruch {k['mdd180']:.1f} %, Kopierer {k['kopierer_pnl']:+,.0f} USDT, Gewinnbeteiligung {k['gewinnbeteiligung']} %")
    return 0


if __name__ == "__main__":
    sys.exit(main())
