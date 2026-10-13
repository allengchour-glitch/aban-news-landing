#!/usr/bin/env python3
"""Belastungstest Pilot 2.0 — hält der Vorsprung, und wie schlimm kann ein Jahr werden?

    python3 tools/trading/krypto_bot/pilot2_robust.py

Prüfungen (VORAB festgelegt), alle mit echten Binance-Fundingraten, gezählt ab 2022 (ungesehen):
  1. Kosten doppelt     Futures 0,10 %, Spot 0,20 %, Funding-Ernte 0,30 % je Wechsel
  2. Parkplatz halbiert  die Funding-Ernte verdient nur die Hälfte (z. B. weil Funding weiter sinkt)
  3. Nachbar-Parameter  Trend BTC 120/150/180/200 × ETH 150/200/250 × Schwankungsziel 30/40/50 % (36 Kombinationen)
  4. Jedes Startdatum    12-Monats-Fenster, monatlich verschoben ab 2020: wie oft ist P2 besser, wie oft im Minus?
  5. Zufallspfade        5000 Jahre aus 20-Tage-Blöcken der echten P2-Tagesrenditen (2020–2026) gezogen
Bestanden, wenn: 1–3 P2 ≥ P0 (MAR) in mindestens 80 % der Fälle; 4 P2 ≥ P0 in mindestens 70 % der Fenster.
Keine Anlageberatung. Vergangenheit ist keine Garantie.
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import carry_pruefung as C  # noqa: E402
import pilot2_pruefung as Q  # noqa: E402
import pilot_pruefung as P  # noqa: E402


def daten():
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    fb, _ = C.tagesfunding(C.lade_funding("BTC"))
    fe, _ = C.tagesfunding(C.lade_funding("ETH"))
    letzter = min(max(fb), max(fe))
    ende = next((i for i, t in enumerate(tage) if t > letzter), len(tage))
    return tage, (hb, lb, cb, [fb.get(t, 0.0) for t in tage]), (he, le, ce, [fe.get(t, 0.0) for t in tage]), ende


def kurve(b, e, a, ende, modus, n_b=150, n_e=200, zv=0.40):
    zb = P.hebel(b[2], n_b, zv)
    ze = P.hebel(e[2], n_e, zv)
    return P.mix_taeglich(Q.lauf2(zb, b[0], b[1], b[2], b[3], a, ende, modus),
                          Q.lauf2(ze, e[0], e[1], e[2], e[3], a, ende, modus))


def mit_kosten(faktor, f):
    alt = (P.GEBUEHR, Q.SPOT_GEBUEHR, C.KOSTEN)
    P.GEBUEHR, Q.SPOT_GEBUEHR, C.KOSTEN = alt[0] * faktor, alt[1] * faktor, alt[2] * faktor
    try:
        return f()
    finally:
        P.GEBUEHR, Q.SPOT_GEBUEHR, C.KOSTEN = alt


def main():
    tage, b, e, ende = daten()
    a22 = next(i for i, t in enumerate(tage) if t >= "2022-01-01")
    a20 = next(i for i, t in enumerate(tage) if t >= "2020-01-01")
    print(f"Daten bis {tage[ende - 1]}\n")
    ok_alle = True

    # 1. Kosten doppelt
    k0 = mit_kosten(2, lambda: P.kennz(kurve(b, e, a22, ende, "P0")))
    k2 = mit_kosten(2, lambda: P.kennz(kurve(b, e, a22, ende, "P2")))
    ok = k2["mar"] >= k0["mar"]
    ok_alle &= ok
    print(f"1 Kosten doppelt     P0 {k0['cagr'] * 100:+.1f} %/{k0['einbruch'] * 100:.0f} %  P2 {k2['cagr'] * 100:+.1f} %/{k2['einbruch'] * 100:.0f} %  → {'bestanden' if ok else 'NICHT bestanden'}")

    # 2. Parkplatz verdient nur halb (Funding für den Parkplatz halbiert, Longs/Shorts unverändert)
    alt = C.KAPITAL_FAKTOR
    C.KAPITAL_FAKTOR = alt * 2  # gleiche Wirkung: halber Ertrag pro Kapital
    try:
        k2h = P.kennz(kurve(b, e, a22, ende, "P2"))
    finally:
        C.KAPITAL_FAKTOR = alt
    k0n = P.kennz(kurve(b, e, a22, ende, "P0"))
    ok = k2h["mar"] >= k0n["mar"]
    ok_alle &= ok
    print(f"2 Parkplatz halbiert  P0 {k0n['cagr'] * 100:+.1f} %  P2 {k2h['cagr'] * 100:+.1f} %/{k2h['einbruch'] * 100:.0f} %  → {'bestanden' if ok else 'NICHT bestanden'}")

    # 3. Nachbar-Parameter
    besser, n = 0, 0
    schlechteste = None
    for nb in (120, 150, 180, 200):
        for ne in (150, 200, 250):
            for zv in (0.30, 0.40, 0.50):
                x0 = P.kennz(kurve(b, e, a22, ende, "P0", nb, ne, zv))
                x2 = P.kennz(kurve(b, e, a22, ende, "P2", nb, ne, zv))
                n += 1
                besser += x2["mar"] >= x0["mar"]
                d = x2["cagr"] - x0["cagr"]
                if schlechteste is None or d < schlechteste[0]:
                    schlechteste = (d, nb, ne, zv)
    ok = besser / n >= 0.8
    ok_alle &= ok
    print(f"3 Nachbar-Parameter  P2 besser in {besser}/{n} Kombinationen; kleinster Vorsprung {schlechteste[0] * 100:+.1f} Pp. "
          f"(BTC {schlechteste[1]}, ETH {schlechteste[2]}, Ziel {schlechteste[3]:.0%})  → {'bestanden' if ok else 'NICHT bestanden'}")

    # 4. Jedes Startdatum, 12-Monats-Fenster
    starts = [i for i in range(a20, ende - 365) if tage[i][8:10] == "01"]
    besser, minus, renditen = 0, 0, []
    for s in starts:
        w0 = kurve(b, e, s, s + 365, "P0")
        w2 = kurve(b, e, s, s + 365, "P2")
        r0, r2 = w0[-1] - 1, w2[-1] - 1
        besser += r2 >= r0
        minus += r2 < 0
        renditen.append((r2, tage[s]))
    renditen.sort()
    ok = besser / len(starts) >= 0.7
    ok_alle &= ok
    median = renditen[len(renditen) // 2][0]
    print(f"4 Jedes Startdatum   {len(starts)} Fenster: P2 ≥ P0 in {besser} ({besser / len(starts):.0%}); P2 im Minus nach 12 Monaten: {minus} "
          f"({minus / len(starts):.0%}); schlechtestes {renditen[0][0] * 100:+.0f} % (Start {renditen[0][1]}), Median {median * 100:+.0f} %, "
          f"bestes {renditen[-1][0] * 100:+.0f} %  → {'bestanden' if ok else 'NICHT bestanden'}")

    # 5. Zufallspfade aus 20-Tage-Blöcken
    w = kurve(b, e, a20, ende, "P2")
    r = [w[i] / w[i - 1] - 1 for i in range(1, len(w))]
    rnd = random.Random(7)
    jahre, einbrueche = [], []
    for _ in range(5000):
        x, hoch, dd = 1.0, 1.0, 0.0
        for _block in range(365 // 20 + 1):  # 19 Blöcke à 20 Tage ≈ 1 Jahr (380 Tage)
            s = rnd.randrange(0, len(r) - 20)
            for v in r[s:s + 20]:
                x *= 1 + v
                hoch = max(hoch, x)
                dd = min(dd, x / hoch - 1)
        jahre.append(x - 1)
        einbrueche.append(dd)
    jahre.sort()
    einbrueche.sort()
    q = lambda l, p: l[int(p * (len(l) - 1))]  # noqa: E731
    print(f"5 Zufallspfade       Jahr im Minus: {sum(j < 0 for j in jahre) / len(jahre):.0%} · "
          f"schlechteste 5 %: {q(jahre, 0.05) * 100:+.0f} % · Median {q(jahre, 0.5) * 100:+.0f} % · "
          f"Einbruch im Jahr: typisch {q(einbrueche, 0.5) * 100:.0f} %, schlechteste 5 % {q(einbrueche, 0.05) * 100:.0f} %")
    print(f"\nGesamt: {'ALLE Prüfungen bestanden' if ok_alle else 'mindestens eine Prüfung NICHT bestanden'}. Keine Anlageberatung.")
    return ok_alle


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
