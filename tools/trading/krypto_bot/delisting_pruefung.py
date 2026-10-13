#!/usr/bin/env python3
"""Prüfstand «Binance kündigt ein Delisting an»: Lässt sich die klarste Krypto-News nach der Veröffentlichung noch handeln?

Frage: Wenn Binance schreibt «Binance Will Delist A, B on …», stürzen diese Coins ab. Ist der Absturz schon vorbei, bis ein
Bot die Nachricht gelesen hat (1, 5 oder 30 Minuten), oder fällt der Kurs danach weiter, sodass ein Short Geld verdient?

PROTOKOLL — VORAB FESTGELEGT (13.10.2026, bevor ein einziger Kurs geladen wurde; Zahlen in delisting_kern.py):
  Ereignisse  Alle Spot-Delistings im Binance-Katalog 161 («Binance Will Delist … on JJJJ-MM-TT»), veröffentlicht vom
              01.01.2022 bis 20.09.2026; ein Ereignis je Coin. Nicht dabei: Futures-, Margin-, Paar-Delistings,
              Stablecoins und verpackte Coins. t0 = Veröffentlichungszeit laut Binance (releaseDate).
  Kurse       Spot: 1-Minuten-Kerzen XUSDT (öffentliche Binance-API, auch abgemeldete Paare). Short: USDⓈ-M-Perpetual XUSDT
              (sonst 1000XUSDT), 1-Minuten-Kerzen und Funding aus den Binance-Archiven (data.binance.vision).
  Handel      Einstieg zur Eröffnung der ersten 1-Minuten-Kerze, die frühestens d Minuten nach t0 beginnt (d = 1, 5, 30;
              höchstens 10 Minuten später, sonst kein Handel). Ausstieg nach 1 h, 24 h, 72 h oder 6 Tagen zum Schluss der
              letzten Kerze davor; endet der Handel früher (Delisting, Abwicklung), zählt der letzte Kurs.
  Short (B)   ohne Hebel: Kursgewinn + erhaltenes/bezahltes Funding (mit dem Kurs zur Abrechnung gewichtet) − Kosten
              (Taker 0,05 % + Schlupf 0,2 % je Seite), höchstens −100 %.
  Halter (A)  nur zur Info: Was spart, wer den Coin hält und sofort verkauft statt nach h? (ohne Kosten)
  Zufall      Je Ereignis 200 Zufallszeitpunkte (volle Stunden) 180 bis 7 Tage VOR der Ankündigung, derselbe Coin, dieselbe
              Haltedauer, Stundenkerzen, gleiche Kosten und gleiches Funding. Ereignisse ohne 30 Tage Stundenkerzen in diesem
              Fenster zählen nicht. Satz k = je Ereignis der k-te Zufallszeitpunkt.
  Bestanden   je Variante (3 Reaktionszeiten × 4 Haltedauern = 12) nur, wenn ALLES gilt:
              1) mindestens 30 Ereignisse
              2) Mittel UND Median netto im Plus — in BEIDEN Hälften (Ankündigungen vor / ab 01.07.2024)
              3) Zufallsprobe: Mittel besser als bei ≥ 95 % der 200 Zufallssätze (strenger als sonst, weil 12 Varianten)
              4) kein einzelner Short schlechter als −50 %
  Folge       Besteht keine Variante: kein Delisting-Short, der News-Wächter bleibt reiner Melder. Besteht eine: erst
              Schatten-Betrieb (ohne Geld) über mehrere Delistings, dann neu entscheiden.

Aufruf: python3 tools/trading/krypto_bot/delisting_pruefung.py   (lädt und rechnet; Zwischenspeicher tools/trading/daten/delisting/)
        python3 tools/trading/krypto_bot/delisting_pruefung.py --bericht   (Tabelle aus data/krypto-delisting-pruefung.json)
"""
from __future__ import annotations

import io
import json
import random
import statistics
import sys
import time
import urllib.error
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import delisting_kern as K  # noqa: E402

CACHE = HIER.parent / "daten" / "delisting"
AUSGABE = HIER.parents[2] / "data" / "krypto-delisting-pruefung.json"
CMS = "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=161&pageNo={n}&pageSize=50"
SPOT = "https://data-api.binance.vision/api/v3/klines?symbol={s}&interval={i}&startTime={a}&endTime={b}&limit=1000"
FUT_1M = "https://data.binance.vision/data/futures/um/daily/klines/{s}/1m/{s}-1m-{d}.zip"
FUT_1H = "https://data.binance.vision/data/futures/um/monthly/klines/{s}/1h/{s}-1h-{m}.zip"
FUNDING = "https://data.binance.vision/data/futures/um/monthly/fundingRate/{s}/{s}-fundingRate-{m}.zip"
VON_MS = 1640995200000   # 01.01.2022 00:00 UTC
BIS_MS = 1790380800000   # 20.09.2026 00:00 UTC (6 Tage + Funding-Monatsarchiv September vollständig)
SEED = 20261013
UA = {"User-Agent": "Mozilla/5.0 (aban-delisting-pruefung)"}


def _get(url, roh=False, versuche=5):
    """GET mit Wiederholungen; 400/404 (kein Paar, kein Archiv) → None."""
    for v in range(versuche):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                daten = r.read()
            return daten if roh else json.loads(daten)
        except urllib.error.HTTPError as ex:
            if ex.code in (400, 404):
                return None
            if v == versuche - 1:
                raise
        except (urllib.error.URLError, OSError, ValueError):
            if v == versuche - 1:
                raise
        time.sleep(2 ** v)
    return None


def cms_artikel():
    datei = CACHE / "cms161.json"
    if datei.exists():
        return json.loads(datei.read_text())
    alle = []
    for n in range(1, 40):
        d = _get(CMS.format(n=n)) or {}
        kat = (d.get("data") or {}).get("catalogs") or []
        arts = kat[0].get("articles") if kat else []
        if not arts:
            break
        alle += arts
    CACHE.mkdir(parents=True, exist_ok=True)
    datei.write_text(json.dumps(alle))
    return alle


def _zwischen(datei, laden):
    """Zwischenspeicher: JSON-Datei; None (kein Paar/Archiv) wird als null gespeichert und nicht neu geladen."""
    if datei.exists():
        return json.loads(datei.read_text())
    wert = laden()
    datei.parent.mkdir(parents=True, exist_ok=True)
    teil = datei.with_suffix(".teil")
    teil.write_text(json.dumps(wert))
    teil.replace(datei)
    return wert


def spot(sym, intervall, von, bis):
    """Spot-Kerzen [(Start, Eröffnung, Schluss)] über die öffentliche API (auch abgemeldete Paare) → Reihe oder None."""
    def laden():
        roh, a = [], von
        while a < bis:
            d = _get(SPOT.format(s=sym, i=intervall, a=a, b=bis - 1))
            if d is None:
                return None
            roh += [[k[0], k[1], k[4]] for k in d]
            if len(d) < 1000:
                break
            a = d[-1][0] + 1
        return roh
    roh = _zwischen(CACHE / "spot" / f"{sym}-{intervall}-{von}-{bis}.json", laden)
    return K.reihe(roh) if roh else None


def _csv_zip(url):
    """Binance-Archiv (ZIP mit einer CSV) → Zeilen als Listen (ohne Kopfzeile) oder None (gibt es nicht)."""
    roh = _get(url, roh=True)
    if roh is None:
        return None
    with zipfile.ZipFile(io.BytesIO(roh)) as z:
        text = z.read(z.namelist()[0]).decode()
    return [x.split(",") for x in text.splitlines() if x and x[0].isdigit()]


def _ms(t):
    t = int(t)
    return t // 1000 if t > 10 ** 14 else t  # neuere Archive teils in Mikrosekunden


def tage(von, bis):
    d, ende = datetime.fromtimestamp(von / 1000, timezone.utc).date(), datetime.fromtimestamp((bis - 1) / 1000, timezone.utc).date()
    while d <= ende:
        yield d.isoformat()
        d += timedelta(days=1)


def monate(von, bis):
    d = datetime.fromtimestamp(von / 1000, timezone.utc).date().replace(day=1)
    ende = datetime.fromtimestamp((bis - 1) / 1000, timezone.utc).date()
    while d <= ende:
        yield d.strftime("%Y-%m")
        d = (d + timedelta(days=32)).replace(day=1)


def fut_1m(sym, von, bis):
    kerzen = []
    for tag in tage(von, bis):
        z = _zwischen(CACHE / "fut1m" / f"{sym}-1m-{tag}.json",
                      lambda tag=tag: [[_ms(x[0]), float(x[1]), float(x[4])] for x in (_csv_zip(FUT_1M.format(s=sym, d=tag)) or [])] or None)
        kerzen += [k for k in (z or []) if von <= k[0] < bis]
    return K.reihe(kerzen) if kerzen else None


def fut_1h(sym, von, bis):
    kerzen = []
    for m in monate(von, bis):
        z = _zwischen(CACHE / "fut1h" / f"{sym}-1h-{m}.json",
                      lambda m=m: [[_ms(x[0]), float(x[1]), float(x[4])] for x in (_csv_zip(FUT_1H.format(s=sym, m=m)) or [])] or None)
        kerzen += [k for k in (z or []) if von <= k[0] < bis]
    return K.reihe(kerzen) if kerzen else None


def funding(sym, von, bis):
    out = []
    for m in monate(von, bis):
        z = _zwischen(CACHE / "funding" / f"{sym}-{m}.json",
                      lambda m=m: [[_ms(x[0]), float(x[-1])] for x in (_csv_zip(FUNDING.format(s=sym, m=m)) or [])] or None)
        out += [(t, r) for t, r in (z or []) if von <= t < bis]
    return sorted(out)


def daten(e):
    """Alle Kurse eines Ereignisses: Spot 1m (Ereignis), Spot 1h (Zufall), Perpetual 1m/1h + Funding (falls es ihn gab)."""
    t0 = e["t0"]
    ev_von, ev_bis = t0 - 30 * K.MINUTE, t0 + 6 * K.TAG + 2 * K.STUNDE
    zf_von = t0 - K.PLACEBO_FENSTER[0] - K.TAG
    d = {"s1m": spot(e["coin"] + "USDT", "1m", ev_von, ev_bis), "s1h": spot(e["coin"] + "USDT", "1h", zf_von, t0),
         "perp": None, "f1m": None, "f1h": None, "fund": None}
    for sym in (e["coin"] + "USDT", "1000" + e["coin"] + "USDT"):
        f1m = fut_1m(sym, ev_von, ev_bis)
        if f1m and f1m["t"][-1] >= t0:
            d.update(perp=sym, f1m=f1m, f1h=fut_1h(sym, zf_von, t0), fund=K.funding_reihe(funding(sym, zf_von, ev_bis)))
            break
    return d


def auswerten(evs, alle_daten, seed=SEED):
    """Rechnet A (Halter) und B (Short) für alle 12 Varianten. Zufallszeitpunkte je Ereignis einmal, für alle Varianten gleich."""
    rng = random.Random(seed)
    zz = []
    for e, d in zip(evs, alle_daten):
        za = K.zufallszeiten(rng, d["s1h"], e["t0"], K.PLACEBO_SAETZE) if d["s1h"] else None
        zb = K.zufallszeiten(rng, d["f1h"], e["t0"], K.PLACEBO_SAETZE) if d["f1h"] else None
        zz.append((za, zb))
    erg = {"A_halter": {}, "B_short": {}, "schon_weg": {}}
    for dly in K.VERZOEGERUNGEN:
        weg = []
        for e, d in zip(evs, alle_daten):
            if d["s1m"]:
                h = K.handel(d["s1m"], e["t0"] + dly * K.MINUTE, K.MINUTE)
                p0 = K.kurs_vor(d["s1m"], e["t0"])
                if h and p0:
                    weg.append(h["ein"] / p0 - 1)
        erg["schon_weg"][f"{dly}min"] = {"n": len(weg), "median": statistics.median(weg) if weg else None,
                                         "mittel": statistics.fmean(weg) if weg else None}
        for hn, dauer in K.HALTEN.items():
            for art, reihe_ev, reihe_zf, zi in (("A_halter", "s1m", "s1h", 0), ("B_short", "f1m", "f1h", 1)):
                werte, zeiten, placebo, einzel = [], [], [], []
                for e, d, z in zip(evs, alle_daten, zz):
                    if not d[reihe_ev] or not z[zi]:
                        continue
                    h = K.handel(d[reihe_ev], e["t0"] + dly * K.MINUTE, dauer)
                    if not h:
                        continue
                    if art == "A_halter":
                        w = K.ersparnis(h)
                        pz = [K.ersparnis(x) for x in (K.handel(d[reihe_zf], t, dauer, K.STUNDE, 0) for t in z[zi]) if x]
                    else:
                        w = K.short_netto(h, d["fund"], d[reihe_ev])
                        pz = [K.short_netto(x, d["fund"], d[reihe_zf]) for x in
                              (K.handel(d[reihe_zf], t, dauer, K.STUNDE, 0) for t in z[zi]) if x]
                    if len(pz) != K.PLACEBO_SAETZE:
                        continue
                    werte.append(w)
                    zeiten.append(e["t0"])
                    placebo.append(pz)
                    einzel.append({"coin": e["coin"], "t0": e["t0"], "wert": round(w, 5), "vorzeitig": h["vorzeitig"]})
                v = K.bewerten(werte, zeiten, placebo)
                v["einzeln"] = einzel
                erg[art][f"{dly}min/{hn}"] = v
    return erg


def pruefung():
    evs = [e for e in K.ereignisse(cms_artikel()) if VON_MS <= e["t0"] < BIS_MS]
    print(f"{len(evs)} Ereignisse (Coins) aus {len({e['t0'] for e in evs})} Ankündigungen — lade Kurse …", flush=True)
    with ThreadPoolExecutor(8) as ex:
        alle_daten = list(ex.map(daten, evs))
    erg = auswerten(evs, alle_daten)
    erg["stand"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    erg["protokoll"] = {"verzoegerungen_min": list(K.VERZOEGERUNGEN), "halten": list(K.HALTEN), "kosten_short": K.KOSTEN_SHORT,
                        "zufall_schwelle": K.SCHWELLE_ZUFALL, "zufall_saetze": K.PLACEBO_SAETZE, "min_ereignisse": K.MIN_EREIGNISSE,
                        "haelfte_grenze": "2024-07-01", "schlimmster_fall": K.SCHLIMMSTER_FALL}
    erg["ereignisse"] = [{"coin": e["coin"], "t0": datetime.fromtimestamp(e["t0"] / 1000, timezone.utc).isoformat(timespec="minutes"),
                          "delisting": e["delisting"], "spot": d["s1m"] is not None, "perp": d["perp"]}
                         for e, d in zip(evs, alle_daten)]
    AUSGABE.parent.mkdir(exist_ok=True)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1))
    return erg


def _p(x, vz=True):
    return "–" if x is None else (f"{x * 100:+.1f} %" if vz else f"{x * 100:.0f} %").replace(".", ",").replace("-", "−")


def bericht_md(erg):
    zeilen = ["| Reaktion / Halten | Shorts | Mittel netto | Median | im Plus | Hälfte 1 / 2 (Mittel) | Zufall: Mittel | "
              "Zufallsprobe | schlimmster | bestanden |", "|---|---|---|---|---|---|---|---|---|---|"]
    for name, v in erg["B_short"].items():
        a = v["alle"]
        zeilen.append(f"| {name.replace('min', ' Min.')} | {a['n']} | {_p(a['mittel'])} | {_p(a['median'])} | "
                      f"{_p(a['anteil_plus'], False)} | {_p(v['h1']['mittel'])} / {_p(v['h2']['mittel'])} | {_p(v['placebo_mittel'])} | "
                      f"{_p(v['zufall'], False)} | {_p(a['schlimmster'])} | {'✅' if v['bestanden'] else '❌'} |")
    return "\n".join(zeilen)


def bericht(erg):
    n_ev = len(erg["ereignisse"])
    print(f"Stand {erg['stand']}: {n_ev} Ereignisse, Spot-Daten {sum(e['spot'] for e in erg['ereignisse'])}, "
          f"Perpetual {sum(1 for e in erg['ereignisse'] if e['perp'])}")
    for k, v in erg["schon_weg"].items():
        print(f"Schon weg nach {k}: Median {_p(v['median'])} (n={v['n']})")
    print("\nB) Short über den Perpetual (netto):")
    print(bericht_md(erg))
    print("\nA) Halter verkauft sofort statt nach h (gesparter Verlust, ohne Kosten):")
    for name, v in erg["A_halter"].items():
        a = v["alle"]
        print(f"  {name:10s} n={a['n']:3d} Mittel {_p(a['mittel'])} Median {_p(a['median'])} · Zufall {_p(v['placebo_mittel'])} "
              f"· Zufallsprobe {_p(v['zufall'], False)}")
    bestanden = [k for k, v in erg["B_short"].items() if v["bestanden"]]
    print(f"\nBestanden (Short): {', '.join(bestanden) if bestanden else 'keine Variante'}. Keine Anlageberatung.")


def main():
    if "--bericht" in sys.argv:
        bericht(json.loads(AUSGABE.read_text()))
        return 0
    bericht(pruefung())
    return 0


if __name__ == "__main__":
    sys.exit(main())
