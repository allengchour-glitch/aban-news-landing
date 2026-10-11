#!/usr/bin/env python3
"""Prüfstand für den Krypto-Pilot: Stop, Parameter-Robustheit und Ethereum — mit vorab festgelegter Entscheidungsregel.

Entscheidungsregel (VOR dem Rechnen festgelegt): Ein Standardwert wird nur geändert, wenn die Alternative in ALLEN
geprüften Zeiträumen ein besseres Verhältnis von Jahresrendite zu schlimmstem Einbruch hat (MAR = Rendite ÷ |Einbruch|).
Sonst bleibt der bisherige Wert — auch wenn eine Variante in einem Zeitraum glänzt.

Modell (Gebühr 0,05 %; ab 2020 echtes Binance-Funding und Stop/Liquidation auf dem Binance-Markpreis, davor Funding
0,01 % je 8 h nur für Longs und Yahoo-Hoch/Tief), zusätzlich:
  • Börsen-Stop wie live: jeden Tag neu, Abstand = k × Tages-Schwankung × Schlusskurs des Vortags; wird er im Tagesverlauf
    erreicht, endet die Position zum Stop-Kurs minus 0,45 % Schlupf (gemessen). Am nächsten Tag steigt der Pilot gemäss Signal wieder ein.
Aufruf: python3 tools/trading/krypto_bot/pilot_pruefung.py [--neu]
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-pilot-pruefung.json"
GEBUEHR, FUNDING, MARGE_MIN, BAND = 0.0005, 0.0001, 0.005, 0.25
# Stop-Schlupf: an 81 echten Stops seit 2019 gemessen (Markpreis löst aus, Perp-Schluss der Minute = Ausführung), Mittel 0,45 %
# (Median 0,16 %, 90 % ≤ 1,5 %). Bis 11.10.2026 pauschal 0,1 % — zu günstig (Profit-Prüfung 11.10.2026).
SCHLUPF = 0.0045


def ohlc(sym):
    datei = HIER.parent / "daten" / f"{sym}_hlc.json"  # eigenes Format (Tag, Hoch, Tief, Schluss) — futures.py nutzt *_ohlc.json
    gestern = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    try:
        veraltet = json.loads(datei.read_text())[-1][0] < gestern if datei.exists() else True
    except (ValueError, IndexError):
        veraltet = True
    if veraltet or "--neu" in sys.argv:  # sonst rechneten Backtest und Cockpit-Kurve für immer mit den Kursen vom ersten Lauf
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1=1410912000&period2={int(time.time())}&interval=1d"
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
                d = json.load(r)["chart"]["result"][0]
            q = d["indicators"]["quote"][0]
            rows = [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), hh, ll, cc)
                    for t, hh, ll, cc in zip(d["timestamp"], q["high"], q["low"], q["close"]) if None not in (hh, ll, cc)]
            heute = datetime.now(timezone.utc).date().isoformat()
            rows = [r for r in rows if r[0] < heute]  # laufender Tag zählt nicht
            datei.parent.mkdir(exist_ok=True)
            datei.write_text(json.dumps(rows))
        except Exception as ex:  # noqa: BLE001 — Netz weg: mit dem gespeicherten Stand weiterrechnen (falls vorhanden)
            if not datei.exists():
                raise
            print(f"{sym}: Kurse nicht aktualisiert ({type(ex).__name__}) — rechne mit dem gespeicherten Stand.")
    rows = json.loads(datei.read_text())
    return {r[0]: (r[1], r[2], r[3]) for r in rows}


def sma(p, n):
    o, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            o[i] = s / n
    return o


def vol(p):
    var, o = None, [None] * len(p)
    for i in range(1, len(p)):
        r = p[i] / p[i - 1] - 1
        var = r * r if var is None else 0.94 * var + 0.06 * r * r
        if i >= 30:
            o[i] = math.sqrt(var * 365)
    return o


def hebel(c, n_sma=200, ziel_vol=0.40, short=True, max_hebel=1.0):
    s, v = sma(c, n_sma), vol(c)
    z = []
    for i in range(len(c)):
        if s[i] is None or v[i] is None:
            z.append(0.0)
            continue
        r = 1.0 if c[i] > s[i] else (-1.0 if short else 0.0)
        z.append(r * min(max_hebel, ziel_vol / v[i]))
    return z


def lauf(z, h, l, c, a, b, stop_k=None, funding=None, stop_hl=None):
    """Kontowert-Verlauf (Start 1.0) von Tag a bis b. Gibt Liste der Tageswerte und Anzahl Stop-Auslösungen zurück.
    funding: echtes Binance-Funding je Tag (Liste wie c; positiv = Longs zahlen, Shorts erhalten). stop_hl: Binance-Markpreis
    (Hoch, Tief) je Tag — darauf lösen Stop und Liquidation live aus. Fehlt ein Tag (None), gilt das Ersatzmodell:
    Longs zahlen 0,01 % je 8 h, Shorts erhalten nichts, Stop/Liquidation über Yahoo-Hoch/Tief (glättet die Ausschläge)."""
    v = vol(c)
    E, N, werte, stops = 1.0, 0.0, [1.0], 0
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > BAND or (ist > 0) != (ziel > 0) or N == 0)):
            neu = ziel * E
            E -= abs(neu - N) * GEBUEHR
            N = neu
        if N != 0:
            ref = c[i - 1]
            hl = stop_hl[i] if stop_hl else None
            hoch, tief = hl if hl else (h[i], l[i])
            if stop_k and v[i - 1]:
                abstand = stop_k * v[i - 1] / math.sqrt(365) * ref
                stop = ref - abstand if N > 0 else ref + abstand
                if (N > 0 and tief <= stop) or (N < 0 and hoch >= stop):
                    aus = stop * (1 - SCHLUPF) if N > 0 else stop * (1 + SCHLUPF)
                    E += N * (aus / ref - 1) - abs(N) * GEBUEHR
                    N, stops = 0.0, stops + 1
                    werte.append(E)
                    continue
            extrem = tief if N > 0 else hoch
            if E + N * (extrem / ref - 1) <= MARGE_MIN * abs(N * extrem / ref):
                werte.append(0.0)
                return werte, stops
            f = funding[i] if funding else None
            # Echtes Funding: Longs zahlen es, Shorts erhalten es (negativ: umgekehrt). Ersatz ohne Daten (vor 2020): Longs
            # 0,01 % je 8 h, Shorts NICHTS — eine pauschale Gutschrift schönte die Tests früher um 2–4 Pp./J.
            E += N * (c[i] / ref - 1) - (N * f if f is not None else (abs(N) * FUNDING * 3 if N > 0 else 0.0))
            N *= c[i] / ref
        werte.append(E)
    return werte, stops


def mix_taeglich(*kurven, gewichte=None):
    """Konto, das jeden Tag neu auf die Märkte aufgeteilt wird — wie live, wo jede Position aus dem GESAMTEN Konto
    bemessen wird (Kapital × Anteil × Gewicht). Näherung über die Tagesrenditen der Teilkonten; ein liquidiertes
    Teilkonto bleibt danach flach (sein Anteil liegt als Bargeld da)."""
    g = gewichte or [1 / len(kurven)] * len(kurven)
    m = [1.0]
    for i in range(1, min(len(k) for k in kurven)):
        m.append(m[-1] * sum(gj * (k[i] / k[i - 1] if k[i - 1] > 0 else 1.0) for gj, k in zip(g, kurven)))
    return m


def kennz(werte):
    spitze, dd = werte[0], 0.0
    for w in werte:
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1 if spitze > 0 else -1)
    jahre = (len(werte) - 1) / 365
    cagr = (werte[-1] / werte[0]) ** (1 / jahre) - 1 if werte[-1] > 0 and jahre > 0 else -1.0
    return {"cagr": cagr, "einbruch": dd, "mar": cagr / abs(dd) if dd < 0 else float("inf")}


def boerse(tage, coins=("btc", "eth"), nur_speicher=False):
    """Echtes Binance-Funding und Markpreis-Hoch/Tief, ausgerichtet auf die Backtest-Tage: {coin: {funding, stop_hl}} —
    als **kwargs an lauf() geben. Ohne Netz/Daten {} → Ersatzmodell."""
    import binance_archiv as BA
    return {c: BA.fuer_tage(f"{c.upper()}USDT", tage, nur_speicher) for c in coins}


def ausrichten(daten):
    tage = sorted(set.intersection(*[set(d) for d in daten]))
    return tage, [([d[t][0] for t in tage], [d[t][1] for t in tage], [d[t][2] for t in tage]) for d in daten]


def main():
    btc, eth = ohlc("BTC-USD"), ohlc("ETH-USD")
    erg = {"stand": max(btc), "regel": "Änderung nur, wenn MAR in allen Zeiträumen besser", "tests": {}}
    tage_b = sorted(btc)
    h, l, c = [btc[t][0] for t in tage_b], [btc[t][1] for t in tage_b], [btc[t][2] for t in tage_b]
    bx_b = boerse(tage_b, ("btc",))["btc"]  # echtes Funding + Markpreis-Stops (ab 2020), davor Ersatzmodell
    zeiten = {"ab 2015": "2015-01-01", "ab 2018": "2018-01-01", "ab 2022": "2022-01-01"}

    def block(name, varianten, h, l, c, tage, zeiten):
        print(f"\n== {name}")
        print(f"{'Variante':28}" + "".join(f"{z:>26}" for z in zeiten))
        res = {}
        for vname, (z, stop_k) in varianten.items():
            zeile, res[vname] = f"{vname:28}", {}
            for zn, start in zeiten.items():
                a = next(i for i, t in enumerate(tage) if t >= start)
                w, n_stop = lauf(z, h, l, c, a, len(c), stop_k, **bx_b)
                k = kennz(w)
                res[vname][zn] = {**k, "stops": n_stop}
                zeile += f"{k['cagr'] * 100:8.1f}% {k['einbruch'] * 100:5.0f}% MAR {k['mar']:4.2f}"
            print(zeile)
        erg["tests"][name] = res
        return res

    import pilot_kern as K
    basis = hebel(c)
    block("1) Börsen-Stop (k × Tages-Schwankung) — nur BTC 200, alte Einzel-Regel", {
        "kein Stop": (basis, None), **{f"Stop {k}σ" + (" (live)" if k == K.STOP_SIGMA else ""): (basis, k) for k in (3, 4, 6, 8)}},
        h, l, c, tage_b, zeiten)
    block("2) Robustheit Trendlänge", {f"Schnitt {n} Tage": (hebel(c, n_sma=n), None) for n in (100, 150, 200, 250, 300)},
          h, l, c, tage_b, zeiten)
    block("3) Robustheit Schwankungsziel", {f"Ziel {int(v * 100)} %": (hebel(c, ziel_vol=v), None) for v in (0.30, 0.40, 0.50, 0.60)},
          h, l, c, tage_b, zeiten)

    # 1L/3L) Stop und Schwankungsziel auf der LIVE-Konfiguration: BTC 150 + ETH 200 + MVRV-Bremse, 50/50 täglich neu aufgeteilt.
    # (Die Blöcke 1–3 oben rechnen noch die alte Einzel-Regel BTC 200 — ihr Urteil gilt nicht automatisch für das Live-Konto.)
    try:
        import info_pruefung as IP
        tage_l, ((hb_l, lb_l, cb_l), (he_l, le_l, ce_l)) = ausrichten([btc, eth])
        bx_l = boerse(tage_l)
        brems = {coin: IP.bremsen("mvrv_tief", IP.flaggen(coin, tage_l)) for coin in ("btc", "eth")}

        def live(stop_k, ziel_vol, a, b):
            zb = IP.filter_z(K.roh_hebel(cb_l, n_sma=150, ziel_vol=ziel_vol), *brems["btc"])
            ze = IP.filter_z(K.roh_hebel(ce_l, n_sma=200, ziel_vol=ziel_vol), *brems["eth"])
            wb, _ = lauf(zb, hb_l, lb_l, cb_l, a, b, stop_k, **bx_l["btc"])
            we, _ = lauf(ze, he_l, le_l, ce_l, a, b, stop_k, **bx_l["eth"])
            return kennz(mix_taeglich(wb, we))

        felder = {"ab 2019": ("2019-01-01", "9999"), "2019–2021": ("2019-01-01", "2022-01-01"),
                  "2022–heute": ("2022-01-01", "9999")}

        def idx(von, bis):
            return (next(i for i, t in enumerate(tage_l) if t >= von), next((i for i, t in enumerate(tage_l) if t >= bis), len(tage_l)))

        for name, varianten, bisher in (
                ("1L) Börsen-Stop, Live-Konfiguration", {"kein Stop (nur Vergleich)": (None, K.ZIEL_VOL), **{
                    f"Stop {k:g}σ" + (" (live)" if k == K.STOP_SIGMA else ""): (k, K.ZIEL_VOL) for k in (3, 4, 6, 8)}},
                 f"Stop {K.STOP_SIGMA:g}σ (live)"),
                ("3L) Schwankungsziel, Live-Konfiguration", {f"Ziel {int(v * 100)} %" + (" (live)" if v == K.ZIEL_VOL else ""):
                                                             (K.STOP_SIGMA, v) for v in (0.30, 0.40, 0.50)}, "Ziel 40 % (live)")):
            print(f"\n== {name}")
            print(f"{'Variante':22}" + "".join(f"{f:>14}" for f in felder))
            res = {}
            for vname, (stop_k, zv) in varianten.items():
                res[vname] = {f: live(stop_k, zv, *idx(*bereich)) for f, bereich in felder.items()}
                print(f"{vname:22}" + "".join(f"     MAR {res[vname][f]['mar']:5.2f}" for f in felder))
            # «kein Stop» ist nur Vergleichszeile: der Börsen-Stop bleibt als Crash-Sicherung (Ausfall, PC aus, Liquidation)
            besser = [v for v in res if v != bisher and "nur Vergleich" not in v
                      and all(res[v][f]["mar"] > res[bisher][f]["mar"] for f in felder)]
            urteil = (f"ÄNDERN auf {besser[0]} (in allen {len(felder)} Feldern besser)" if len(besser) == 1 else
                      f"mehrere Alternativen überall besser: {', '.join(besser)} — nicht eindeutig" if besser else "bleibt")
            print(f"  Regel (vorab: nur ändern, wenn in ALLEN Feldern besser): {urteil}")
            res["urteil"] = urteil
            erg["tests"][name] = res
    except Exception as ex:  # noqa: BLE001 — ohne MVRV-Daten (Netz) diesen Teil auslassen
        print(f"\n(Live-Konfiguration nicht geprüft: {type(ex).__name__}: {ex})")

    # 2b) Trendlänge 150 gegen 200 auf GETRENNTEN Abschnitten (keine Überlappung → kein Mehrfachzählen derselben Jahre)
    tage, ((hb, lb, cb), (he, le, ce)) = ausrichten([btc, eth])
    bx = boerse(tage)
    abschnitte = [("2015-01-01", "2018-01-01"), ("2018-01-01", "2022-01-01"), ("2022-01-01", "9999")]
    print("\n== 2b) Trendlänge 150 vs. 200 auf getrennten Abschnitten (MAR)")
    res = {}
    for coin, (hh, ll, cc, tt, xx) in {"BTC": (h, l, c, tage_b, bx_b), "ETH": (he, le, ce, tage, bx["eth"])}.items():
        res[coin] = {}
        for von, bis in abschnitte:
            if von < tt[0]:
                continue
            a = next(i for i, t in enumerate(tt) if t >= von)
            b = next((i for i, t in enumerate(tt) if t >= bis), len(cc))
            zeile = {n: kennz(lauf(hebel(cc, n_sma=n), hh, ll, cc, a, b, **xx)[0]) for n in (150, 200)}
            res[coin][f"{von[:4]}–{bis[:4] if bis != '9999' else 'heute'}"] = zeile
            print(f"  {coin} {von[:4]}–{bis[:4] if bis != '9999' else 'heute':5}  150: {zeile[150]['cagr'] * 100:6.1f} %/J MAR {zeile[150]['mar']:5.2f}"
                  f"  |  200: {zeile[200]['cagr'] * 100:6.1f} %/J MAR {zeile[200]['mar']:5.2f}")
    erg["tests"]["2b) Trendlänge getrennte Abschnitte"] = res

    # 4) Ethereum dazu: je 50 %, jeden Tag neu aufgeteilt (wie live), gleiche Regel je Coin
    zeiten2 = {"ab 2019": "2019-01-01", "ab 2022": "2022-01-01"}
    print("\n== 4) Bitcoin allein vs. Bitcoin + Ethereum (je 50 %)")
    res = {}
    for zn, start in zeiten2.items():
        a = next(i for i, t in enumerate(tage) if t >= start)
        wb, _ = lauf(hebel(cb), hb, lb, cb, a, len(cb), **bx["btc"])
        we, _ = lauf(hebel(ce), he, le, ce, a, len(ce), **bx["eth"])
        mix = mix_taeglich(wb, we)
        kb, km = kennz(wb), kennz(mix)
        res[zn] = {"btc": kb, "btc_eth": km}
        print(f"  {zn}: BTC allein {kb['cagr'] * 100:6.1f}% Einbruch {kb['einbruch'] * 100:4.0f}% MAR {kb['mar']:.2f} | "
              f"BTC+ETH {km['cagr'] * 100:6.1f}% Einbruch {km['einbruch'] * 100:4.0f}% MAR {km['mar']:.2f}")
    erg["tests"]["4) Bitcoin + Ethereum"] = res
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
