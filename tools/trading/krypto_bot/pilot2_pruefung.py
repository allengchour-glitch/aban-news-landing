#!/usr/bin/env python3
"""Pilot 2.0 — gleiche Signale, klügere Ausführung — mit ECHTEN Binance-Fundingraten geprüft.

    python3 tools/trading/krypto_bot/pilot2_pruefung.py

Der Live-Pilot handelt Long UND Short über Perpetual-Futures. Longs zahlen dort Funding (2020–2026 im Schnitt rund
10 % pro Jahr bei BTC). Weil der Pilot höchstens 1× Hebel nutzt, geht ein Long genauso gut über Spot — ohne Funding.
Varianten (VORAB festgelegt, Signale identisch: BTC 150 / ETH 200 Tage, Schwankungsziel 40 %, Stop 3σ):
  P0 «live»          alles über Futures, ECHTES Funding (Longs zahlen, Shorts bekommen positives / zahlen negatives)
  P1 «Spot-Long»     Long über Spot (Gebühr 0,10 %, kein Funding), Short über Futures mit echtem Funding
  P2 «+ Parkplatz»   wie P1, freies Geld (Konto minus Position) liegt in der Funding-Ernte desselben Coins
                     (Spot + Short, 1,5× Kapital je Volumen, Kosten 0,15 % auf jede Änderung des geparkten Betrags)
Entscheidungsregel: übernommen wird nur, was in ALLEN Zeiträumen (ab 2020/2022/2024) ein besseres MAR hat als P0.
Nicht abgebildet: Spot/Future-Kursdifferenz, Börsenausfall. Keine Anlageberatung.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import carry_pruefung as C  # noqa: E402
import pilot_pruefung as P  # noqa: E402

SPOT_GEBUEHR = 0.001


def lauf2(z, h, l, c, f, a, b, modus="P0", stop_k=3.0):
    """Wie pilot_pruefung.lauf, aber mit Tages-Funding f[i] (Summe der Raten) und Ausführungsmodus."""
    v = P.vol(c)
    E, N, park, werte = 1.0, 0.0, 0.0, [1.0]
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > P.BAND or (ist > 0) != (ziel > 0) or N == 0)):
            neu = ziel * E
            geb = SPOT_GEBUEHR if (modus != "P0" and (neu > 0 or N > 0)) else P.GEBUEHR
            E -= abs(neu - N) * geb
            N = neu
        if modus == "P2":  # Parkplatz nachführen: freies Kapital / 1,5 als Volumen in der Funding-Ernte
            soll = max(0.0, E - abs(N)) / C.KAPITAL_FAKTOR
            E -= abs(soll - park) * C.KOSTEN
            park = soll
            E += park * f[i]
        if N != 0:
            ref = c[i - 1]
            if stop_k and v[i - 1]:
                abstand = stop_k * v[i - 1] / math.sqrt(365) * ref
                stop = ref - abstand if N > 0 else ref + abstand
                if (N > 0 and l[i] <= stop) or (N < 0 and h[i] >= stop):
                    aus = stop * (1 - P.SCHLUPF) if N > 0 else stop * (1 + P.SCHLUPF)
                    geb = SPOT_GEBUEHR if (modus != "P0" and N > 0) else P.GEBUEHR
                    E += N * (aus / ref - 1) - abs(N) * geb
                    N = 0.0
                    werte.append(E)
                    continue
            if not (modus != "P0" and N > 0):  # Futures-Position: Liquidation möglich
                extrem = l[i] if N > 0 else h[i]
                if E + N * (extrem / ref - 1) <= P.MARGE_MIN * abs(N * extrem / ref):
                    werte.append(0.0)
                    return werte
            funding = 0.0 if (modus != "P0" and N > 0) else -N * f[i]  # Long zahlt f, Short bekommt f (negativ: umgekehrt)
            E += N * (c[i] / ref - 1) + funding
            N *= c[i] / ref
        werte.append(E)
    return werte


def main():
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    fb, _ = C.tagesfunding(C.lade_funding("BTC"))
    fe, _ = C.tagesfunding(C.lade_funding("ETH"))
    f_b = [fb.get(t, 0.0) for t in tage]
    f_e = [fe.get(t, 0.0) for t in tage]
    zb, ze = P.hebel(cb, 150), P.hebel(ce, 200)
    letzter = max(max(fb), max(fe))
    ende = next((i for i, t in enumerate(tage) if t > letzter), len(tage))
    zeiten = {"ab 2020": "2020-01-01", "ab 2022": "2022-01-01", "ab 2024": "2024-01-01"}
    print(f"Echtes Funding bis {letzter} · Stop 3σ · Futures 0,05 % · Spot 0,10 %\n")
    print(f"{'Variante':26}" + "".join(f"{z:>24}" for z in zeiten))
    res = {}
    for modus, name in (("P0", "P0 live (alles Futures)"), ("P1", "P1 Spot-Long"), ("P2", "P2 + Parkplatz")):
        zeile, res[modus] = f"{name:26}", {}
        for zn, ab in zeiten.items():
            a = next(i for i, t in enumerate(tage) if t >= ab)
            k = P.kennz(P.mix_taeglich(lauf2(zb, hb, lb, cb, f_b, a, ende, modus), lauf2(ze, he, le, ce, f_e, a, ende, modus)))
            res[modus][zn] = k
            zeile += f"   {k['cagr'] * 100:+6.1f} % / {k['einbruch'] * 100:4.0f} % / {k['mar']:.2f}"
        print(zeile)
    print("\nje Feld: Rendite pro Jahr / schlimmster Einbruch / MAR")
    for m in ("P1", "P2"):
        besser = all(res[m][z]["mar"] > res["P0"][z]["mar"] for z in zeiten)
        print(f"{m}: {'in ALLEN Zeiträumen besser → übernehmen' if besser else 'nicht in allen Zeiträumen besser'}")
    return res


if __name__ == "__main__":
    main()
