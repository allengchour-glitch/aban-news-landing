#!/usr/bin/env python3
"""Mehr-Horizont-Trend gegen den Krypto-Pilot — gleiche Rechnung wie pilot_pruefung.py, nur ein anderes Signal.

    python3 tools/trading/krypto_bot/trend_pruefung.py

Idee aus der Forschung (Zeitreihen-Momentum, Moskowitz/Ooi/Pedersen 2012; Mehr-Horizont-Varianten für Krypto): statt EINES
Schnitts mehrere Zeiträume abstimmen lassen → weicheres Signal, weniger Hin und Her.
Varianten (VORAB festgelegt):
  E1 «4 Renditen»   Mittel aus Vorzeichen der Rendite über 20, 60, 120, 250 Tage (−1 … +1)
  E2 «4 Schnitte»   Mittel aus «Kurs über Schnitt» für 50, 100, 150, 200 Tage (−1 … +1)
Grösse wie live: Signal × min(1, 40 % ÷ Schwankung), Stop 3σ, Gebühr 0,05 %, Funding nur für Longs, Liquidation.
Vergleich: der Live-Pilot ohne MVRV-Bremse (BTC 150 + ETH 200, je zur Hälfte, täglich neu aufgeteilt).
Entscheidungsregel wie im Prüfstand: übernommen wird eine Variante nur, wenn ihr Verhältnis Rendite ÷ Einbruch (MAR) in
ALLEN Zeiträumen besser ist. Keine Anlageberatung.
"""
from __future__ import annotations

import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import pilot_pruefung as P  # noqa: E402

LAGS = (20, 60, 120, 250)
SCHNITTE = (50, 100, 150, 200)


def signal_renditen(c, lags=LAGS):
    out = []
    for i in range(len(c)):
        if i < max(lags):
            out.append(None)
            continue
        out.append(sum((1 if c[i] > c[i - L] else -1 if c[i] < c[i - L] else 0) for L in lags) / len(lags))
    return out


def signal_schnitte(c, ns=SCHNITTE):
    s = {n: P.sma(c, n) for n in ns}
    out = []
    for i in range(len(c)):
        if any(s[n][i] is None for n in ns):
            out.append(None)
            continue
        out.append(sum((1 if c[i] > s[n][i] else -1) for n in ns) / len(ns))
    return out


def hebel_aus_signal(sig, c, ziel_vol=0.40, max_hebel=1.0):
    v = P.vol(c)
    return [0.0 if (s is None or v[i] is None) else s * min(max_hebel, ziel_vol / v[i]) for i, s in enumerate(sig)]


def main():
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    zeiten = {"ab 2018": "2018-01-01", "ab 2020": "2020-01-01", "ab 2022": "2022-01-01", "ab 2024": "2024-01-01"}
    varianten = {
        "Pilot live (BTC150+ETH200)": (P.hebel(cb, 150), P.hebel(ce, 200)),
        "E1 4 Renditen": (hebel_aus_signal(signal_renditen(cb), cb), hebel_aus_signal(signal_renditen(ce), ce)),
        "E2 4 Schnitte": (hebel_aus_signal(signal_schnitte(cb), cb), hebel_aus_signal(signal_schnitte(ce), ce)),
    }
    print(f"Daten bis {tage[-1]} · Stop 3σ · Gebühr 0,05 % · Funding für Longs 0,01 %/8 h\n")
    print(f"{'Variante':30}" + "".join(f"{z:>24}" for z in zeiten))
    res = {}
    for name, (zb, ze) in varianten.items():
        zeile, res[name] = f"{name:30}", {}
        for zn, ab in zeiten.items():
            a = next(i for i, t in enumerate(tage) if t >= ab)
            kb, _ = P.lauf(zb, hb, lb, cb, a, len(tage), stop_k=3.0)
            ke, _ = P.lauf(ze, he, le, ce, a, len(tage), stop_k=3.0)
            k = P.kennz(P.mix_taeglich(kb, ke))
            res[name][zn] = k
            zeile += f"   {k['cagr'] * 100:+6.1f} % / {k['einbruch'] * 100:4.0f} % / {k['mar']:.2f}"
        print(zeile)
    print("\nje Feld: Rendite pro Jahr / schlimmster Einbruch / MAR")
    basis = res["Pilot live (BTC150+ETH200)"]
    for name in list(varianten)[1:]:
        besser = all(res[name][z]["mar"] > basis[z]["mar"] for z in zeiten)
        print(f"{name}: {'in ALLEN Zeiträumen besser → übernehmen' if besser else 'nicht in allen Zeiträumen besser → Pilot bleibt'}")
    return res


if __name__ == "__main__":
    main()
