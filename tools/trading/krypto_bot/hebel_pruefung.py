#!/usr/bin/env python3
"""Prüfstand «mehr Hebel» für den Krypto-Pilot — was passiert bei 1,5×, 2×, 3×, 5×, 10×?

VORAB FESTGELEGT (vor dem ersten Rechenlauf):
Strategie wie live: BTC Trend 150 + ETH Trend 200 (je 50 %), Schwankungsziel, MVRV-Bremse, Börsen-Stop 4σ mit 0,1 % Schlupf,
Futures-Modell mit Gebühr 0,05 %, Funding 0,01 % je 8 h und Liquidation über Tagestief/-hoch (pilot_pruefung.lauf).
Zwei Arten, den Hebel zu erhöhen:
  A «nur Deckel höher»   Schwankungsziel bleibt 40 %, der Deckel steigt auf L (mehr Hebel nur in ruhigen Phasen)
  B «alles × L»           Schwankungsziel 40 % × L und Deckel L (jede Position L-mal so gross)
Ein höherer Hebel als heute (Deckel 2×) wird NUR erlaubt, wenn ALLES gilt:
  1) keine Liquidation in keinem Teilkonto, 2) schlimmster Einbruch nie tiefer als −50 %,
  3) Rendite ÷ Einbruch in jedem Abschnitt (2019–2021, 2022–heute) besser als mit 1×.
Aufruf: python3 tools/trading/krypto_bot/hebel_pruefung.py   → Tabelle + data/krypto-hebel-pruefung.json
        python3 tools/trading/krypto_bot/hebel_pruefung.py --minuten   → wie lange 2×–100× mit echten Minutenkursen überleben
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import info_pruefung as IP  # noqa: E402
import pilot_kern as K  # noqa: E402
import pilot_pruefung as P  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-hebel-pruefung.json"
HEBEL = [1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
ABSCHNITTE = [("2019-01-01", "2022-01-01"), ("2022-01-01", "9999")]


def lauf_mit_liq(z, h, l, c, a, b):
    w, _ = P.lauf(z, h, l, c, a, b, K.STOP_SIGMA)
    return w, (len(w) < b - max(a, 1) + 1 or w[-1] == 0.0)


def main():
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    brems = {"btc": IP.bremsen("mvrv_tief", IP.flaggen("btc", tage)), "eth": IP.bremsen("mvrv_tief", IP.flaggen("eth", tage))}
    fenster = []
    for von, bis in [("2019-01-01", "9999")] + ABSCHNITTE:
        a = next(i for i, t in enumerate(tage) if t >= von)
        b = next((i for i, t in enumerate(tage) if t >= bis), len(tage))
        fenster.append((f"{von[:4]}–{'heute' if bis == '9999' else str(int(bis[:4]) - 1)}", a, b))
    erg = {"stand": tage[-1], "regel": __doc__.split("Ein höherer")[1].split("Aufruf")[0].strip(), "varianten": {}}
    print(f"Pilot BTC 150 + ETH 200 + MVRV-Bremse + Stop 4σ, Futures-Modell, Stand {tage[-1]}\n")
    print(f"{'Variante':26}" + "".join(f"{n:>40}" for n, _, _ in fenster))
    for art in ("A", "B"):
        for L in HEBEL:
            if art == "A":
                zb = P.hebel(cb, n_sma=150, ziel_vol=0.40, max_hebel=L)
                ze = P.hebel(ce, n_sma=200, ziel_vol=0.40, max_hebel=L)
            else:
                zb = P.hebel(cb, n_sma=150, ziel_vol=0.40 * L, max_hebel=L)
                ze = P.hebel(ce, n_sma=200, ziel_vol=0.40 * L, max_hebel=L)
            zb, ze = IP.filter_z(zb, *brems["btc"]), IP.filter_z(ze, *brems["eth"])
            name = f"{art} {'Deckel' if art == 'A' else 'alles ×'} {L:g}×"
            zeile, res = f"{name:26}", {}
            for fname, a, b in fenster:
                wb, liq_b = lauf_mit_liq(zb, hb, lb, cb, a, b)
                we, liq_e = lauf_mit_liq(ze, he, le, ce, a, b)
                soll = b - max(a, 1) + 1  # nach einer Liquidation bleibt das Teilkonto bei 0
                wb, we = wb + [0.0] * (soll - len(wb)), we + [0.0] * (soll - len(we))
                mix = P.mix_taeglich(wb, we)  # täglich neu aufgeteilt, wie live
                k = P.kennz(mix)
                schnitt_hebel = sum(abs(x) for x in zb[a:b]) / max(1, b - a)
                res[fname] = {**k, "liquidiert": liq_b or liq_e, "liq_btc": liq_b, "liq_eth": liq_e, "mittlerer_hebel_btc": schnitt_hebel}
                zeile += (f"{k['cagr'] * 100:8.1f} %/J {k['einbruch'] * 100:5.0f} % MAR {k['mar']:5.2f}"
                          + (" LIQ" if liq_b or liq_e else "    "))
            erg["varianten"][name] = res
            print(zeile)
    basis = erg["varianten"]["A Deckel 1×"]
    print("\nUrteil nach der vorab festgelegten Regel:")
    for name, res in erg["varianten"].items():
        if name.endswith(" 1×"):
            continue
        felder = [res[f] for f, _, _ in fenster]
        mar_besser = all(res[f]["mar"] > basis[f]["mar"] for f, _, _ in fenster[1:])
        ok = all(not r["liquidiert"] and r["einbruch"] > -0.50 for r in felder) and mar_besser
        grund = [] if ok else [
            "liquidiert" if any(r["liquidiert"] for r in felder) else "",
            f"Einbruch bis {min(r['einbruch'] for r in felder) * 100:.0f} %" if any(r["einbruch"] <= -0.50 for r in felder) else "",
            "Rendite÷Einbruch nicht überall besser als 1×" if not mar_besser else ""]
        res["urteil"] = "erlaubt" if ok else "nein"
        print(f"  {name:26} {'ERLAUBT' if ok else 'nein'}  {' · '.join(x for x in grund if x)}")
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ueberleben(tage=30, versuche=3000, symbol="BTCUSDT"):
    """Wie lange überlebt eine Hebel-Position? Echte Minutenkerzen der letzten `tage` Tage (Binance, öffentlich), zufälliger
    Einstieg, Liquidation bei 1/Hebel − 0,4 % Wartungsmarge − 0,05 % Gebühr Gegenbewegung (Binance BTCUSDT, unterste Stufe)."""
    import random
    import statistics
    import time
    import urllib.request
    ende = int(time.time() * 1000)
    t, kerzen = ende - tage * 86400 * 1000, []
    while t < ende:
        url = f"https://data-api.binance.vision/api/v3/klines?symbol={symbol}&interval=1m&startTime={t}&limit=1000"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "aban-krypto"}), timeout=30) as r:
            k = json.load(r)
        if not k:
            break
        kerzen += k
        t = k[-1][0] + 60000
    o, h, l = ([float(x[i]) for x in kerzen] for i in (1, 2, 3))
    rnd, out = random.Random(1), {}
    print(f"{symbol}, {len(kerzen)} Minuten ({tage} Tage), {versuche} zufällige Einstiege je Zeile:")
    for hebel in (2, 5, 10, 20, 50, 100):
        schwelle = 1 / hebel - 0.004 - 0.0005
        for seite in ("long", "short"):
            dauern = []
            for _ in range(versuche):
                i = rnd.randrange(0, len(o) - 1)
                liq = o[i] * (1 - schwelle) if seite == "long" else o[i] * (1 + schwelle)
                for j in range(i, len(o)):
                    if (seite == "long" and l[j] <= liq) or (seite == "short" and h[j] >= liq):
                        dauern.append(j - i)
                        break
            med = statistics.median(dauern) if dauern else None
            out[f"{hebel}x_{seite}"] = {"schwelle": schwelle, "liquidiert": len(dauern) / versuche, "median_minuten": med}
            print(f"  {hebel:>4}× {seite:5} liquidiert bei {schwelle * 100:5.2f} % Gegenbewegung · {len(dauern) / versuche * 100:5.1f} % liquidiert"
                  + (f" · Median nach {med / 60:.1f} Std." if med is not None else ""))
    print("  (Einstiege spät im Zeitraum haben weniger Zeit — die Anteile sind eher zu tief als zu hoch.)")
    return out


if __name__ == "__main__":
    if "--minuten" in sys.argv:
        ueberleben()
    else:
        main()
