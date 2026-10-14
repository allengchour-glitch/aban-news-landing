#!/usr/bin/env python3
"""Prüfstand «Max Profit» — welcher Hebel bringt auf Dauer das meiste Geld, ohne das Konto zu riskieren?

PROTOKOLL — VORAB FESTGELEGT (committet vor dem ersten Lauf mit echten Daten):
Ziel «Max Profit» heisst hier: das grösste VERMÖGENSWACHSTUM auf Dauer (geometrisch, Rendite pro Jahr), nicht der grösste
Erwartungswert — der wird mit Alles-auf-Hebel maximiert und endet im Ruin (hebel_pruefung.py: ab 5× Konto weg).
Signale wie der Live-Pilot, unverändert (keine neuen Regeln gesucht): Bitcoin Trend 150 + Ethereum Trend 200 (über dem Schnitt
long, darunter short), Schwankungsziel 40 % × L mit Deckel L (= jede Position L-fach), MVRV-Bremse (kein Short bei MVRV < 1),
Börsen-Stop 3 Tages-Schwankungen mit 0,1 % Schlupf, BTC/ETH täglich 50/50 neu aufgeteilt.
Modell: Perpetual-Futures, Gebühr 0,05 %, Liquidation über Tagestief/-hoch (Wartungsmarge 0,5 %), ECHTES Binance-Funding je
Tag (Longs zahlen, Shorts bekommen bzw. zahlen bei negativem Funding); vor Beginn der Funding-Daten zahlen Longs pauschal
0,01 % je 8 Stunden und Shorts bekommen nichts (vorsichtig).
Kandidaten:
  F-L     fester Hebel L ∈ {1; 1,25; 1,5; 1,75; 2; 2,5; 3}
  K-a     Kelly-Hebel, jedes Kalenderjahr neu: a × (μ ÷ σ²) der Tagesrenditen der 1×-Strategie AUS ALLEN TAGEN VOR DEM JAHR
          (a ∈ {¼, ½, ¾, 1}), begrenzt auf 0,5…3 — so sieht die Hebel-Wahl nie in die Zukunft
  P2      Pilot 2.0 mit 1× (Long über Spot, Short über Futures, freies Geld in der Funding-Ernte), Signale wie oben
Gezählt wird nur ausserhalb der Schätz-Stichprobe: ab 1.1.2020 (Kelly schätzt ab Mitte 2018). Zusätzlich «ab 2022» (Baisse +
Erholung) und «doppelte Kosten» (Gebühr 0,10 %, Schlupf 0,2 %, Funding für Longs × 1,5) ab 2020.
Risiko: 10'000 Zufallsjahre aus den echten Tagesrenditen ab 2020 (Blöcke à 20 Tage) → Wahrscheinlichkeit eines Einbruchs
tiefer als −60 % innert eines Jahres, schlechtestes 5-%-Jahr.
ENTSCHEIDUNGSREGEL (maxprofit_kern.entscheidung): bestanden hat ein Kandidat, wenn ALLES gilt
  1) nie liquidiert (kein Teilkonto, ab 2020), 2) P(Einbruch tiefer als −60 % in einem Zufallsjahr) ≤ 5 %,
  3) Rendite pro Jahr ab 2022 ≥ die von F-1 (1× live), 4) mit doppelten Kosten ab 2020 ≥ F-1 mit doppelten Kosten.
Empfehlung = bestandener Kandidat mit der höchsten Rendite pro Jahr ab 2020; liegt einer mit kleinerem mittlerem Hebel weniger
als 2 Prozentpunkte darunter, gilt der kleinere. Besteht ausser F-1 keiner, bleibt 1×. Ehrlich: 12 Kandidaten — die Auswahl
des besten schönt dessen Zahl etwas; darum zählen die Regeln 2–4 und nicht die Spitzenrendite allein.
Nicht abgebildet: Börsenausfall (FTX 2022), Spot/Future-Kursdifferenz, Teilfüllungen, Steuern. Keine Anlageberatung.

Aufruf: python3 -B tools/trading/krypto_bot/maxprofit_pruefung.py   → Tabelle + data/krypto-maxprofit-pruefung.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import maxprofit_kern as MK  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-maxprofit-pruefung.json"
FEST = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
KELLY = [0.25, 0.5, 0.75, 1.0]
HEBEL_MIN, HEBEL_MAX = 0.5, 3.0
SCHAETZ_AB, OOS_AB, BAISSE_AB = "2018-06-01", "2020-01-01", "2022-01-01"
FLAT_FUNDING = 0.0003  # 0,01 % je 8 Std. — vor Beginn der echten Funding-Daten (nur Longs zahlen)


def daten():
    """Kurse (Yahoo, Zwischenspeicher), MVRV-Bremse (CoinMetrics), echtes Funding (data.binance.vision) — auf gemeinsame Tage."""
    import carry_pruefung as C
    import info_pruefung as IP
    import pilot_pruefung as P
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    z1 = {}
    for coin, c, n in (("btc", cb, 150), ("eth", ce, 200)):
        z = P.hebel(c, n_sma=n, ziel_vol=0.40, max_hebel=1.0)
        z1[coin] = IP.filter_z(z, *IP.bremsen("mvrv_tief", IP.flaggen(coin, tage)))
    fund = {}
    for coin in ("BTC", "ETH"):
        roh, _ = C.tagesfunding(C.lade_funding(coin))
        fund[coin] = ([roh.get(t, FLAT_FUNDING) for t in tage], [roh.get(t, 0.0) for t in tage], min(roh))
    return {"tage": tage, "btc": (hb, lb, cb), "eth": (he, le, ce), "z1": z1, "fund": fund}


def idx(tage, ab):
    return next(i for i, t in enumerate(tage) if t >= ab)


def kurve(D, faktor, a, b, teuer=False):
    """Konto (BTC/ETH täglich 50/50) mit Ziel-Anteil faktor[i] × z1[i]; faktor = Liste je Tag. → (Werte, liquidiert)"""
    teile, liq = [], False
    for coin, sym in (("btc", "BTC"), ("eth", "ETH")):
        h, l, c = D[coin]
        z = [faktor[i] * x for i, x in enumerate(D["z1"][coin])]
        fl, fs, _ = D["fund"][sym]
        if teuer:
            fl = [x * 1.5 if x > 0 else x for x in fl]
        w, lq = MK.lauf_hebel(z, h, l, c, fl, fs, a, b, stop_k=3.0, gebuehr=MK.GEBUEHR * (2 if teuer else 1),
                              schlupf=MK.SCHLUPF * (2 if teuer else 1))
        teile.append(w + [0.0] * (b - max(a, 1) + 1 - len(w)))
        liq = liq or lq
    return MK.mix_taeglich(*teile), liq


def p2_kurve(D, a, b, teuer=False):
    """Pilot 2.0 mit 1× (pilot2_pruefung.lauf2, Modus P2) auf denselben Signalen (mit MVRV-Bremse)."""
    import carry_pruefung as C
    import pilot2_pruefung as P2
    import pilot_pruefung as P
    alt = (P.GEBUEHR, P.SCHLUPF, P2.SPOT_GEBUEHR, C.KOSTEN)
    try:
        if teuer:
            P.GEBUEHR, P.SCHLUPF, P2.SPOT_GEBUEHR, C.KOSTEN = alt[0] * 2, alt[1] * 2, alt[2] * 2, alt[3] * 2
        teile = []
        for coin, sym in (("btc", "BTC"), ("eth", "ETH")):
            h, l, c = D[coin]
            fl, fs, _ = D["fund"][sym]
            f = list(fs)  # echtes Funding (vor Datenbeginn 0)
            if teuer:
                f = [x * 1.5 if x > 0 else x for x in f]
            w = P2.lauf2(D["z1"][coin], h, l, c, f, a, b, modus="P2")
            teile.append(w + [0.0] * (b - max(a, 1) + 1 - len(w)))
        return MK.mix_taeglich(*teile), any(t[-1] == 0.0 for t in teile)
    finally:
        P.GEBUEHR, P.SCHLUPF, P2.SPOT_GEBUEHR, C.KOSTEN = alt


def faktoren(D, name, wf=None):
    n = len(D["tage"])
    if name.startswith("F-"):
        return [float(name[2:]) ] * n
    jahr_hebel = wf[name]
    return [jahr_hebel.get(int(t[:4]), jahr_hebel[min(jahr_hebel)]) for t in D["tage"]]


def auswerten(werte, liq, a_oos, tage, ab_2022):
    k = MK.kennzahlen(werte)
    k22 = MK.kennzahlen(werte[ab_2022 - a_oos:]) if ab_2022 > a_oos else k
    r = MK.renditen(werte)
    jahre = MK.bootstrap_jahre(r, n=10000, laenge=365, block=20, seed=1)
    return {"cagr_oos": k["cagr"], "einbruch_oos": k["einbruch"], "cagr_2022": k22["cagr"], "einbruch_2022": k22["einbruch"],
            "liquidiert": liq, "p_einbruch60": sum(1 for _, dd in jahre if dd < -0.60) / len(jahre),
            "p_minus50": sum(1 for x, _ in jahre if x < -0.50) / len(jahre),
            "jahr_median": MK.quantil([x for x, _ in jahre], 0.5), "jahr_5pct": MK.quantil([x for x, _ in jahre], 0.05)}


def main():
    D = daten()
    tage = D["tage"]
    a_s, a, b = idx(tage, SCHAETZ_AB), idx(tage, OOS_AB), len(tage)
    a22 = idx(tage, BAISSE_AB)
    # 1×-Strategie ab Mitte 2018: ihre Tagesrenditen sind die einzige Grundlage der Kelly-Schätzung (nur Tage VOR dem Jahr)
    w1, _ = kurve(D, [1.0] * len(tage), a_s, b)
    r1 = MK.renditen(w1)
    r_tage = tage[max(a_s, 1):b]  # Datum der Rendite r1[i]
    jahre = list(range(int(OOS_AB[:4]), int(tage[-1][:4]) + 1))
    wf = {f"K-{x:g}": MK.walk_forward(r_tage, r1, jahre, x, HEBEL_MIN, HEBEL_MAX) for x in KELLY}
    erg = {"stand": tage[-1], "protokoll": __doc__.split("PROTOKOLL")[1].split("Aufruf:")[0].strip(), "kelly_je_jahr": wf,
           "kandidaten": {}}
    namen = [f"F-{L:g}" for L in FEST] + list(wf) + ["P2"]
    for name in namen:
        if name == "P2":
            w, liq = p2_kurve(D, a, b)
            wt, _ = p2_kurve(D, a, b, teuer=True)
            hebel_schnitt = 1.0
        else:
            fk = faktoren(D, name, wf)
            w, liq = kurve(D, fk, a, b)
            wt, _ = kurve(D, fk, a, b, teuer=True)
            hebel_schnitt = sum(fk[a:b]) / (b - a)
        res = auswerten(w, liq, a, tage, a22)
        res["cagr_oos_teuer"] = MK.kennzahlen(wt)["cagr"]
        res["hebel_schnitt"] = hebel_schnitt
        erg["kandidaten"][name] = res
    empf, urteil = MK.entscheidung(erg["kandidaten"], "F-1")
    for name, (ok, gruende) in urteil.items():
        erg["kandidaten"][name]["bestanden"], erg["kandidaten"][name]["gruende"] = ok, gruende
    erg["empfehlung"] = empf
    # zur Einordnung (kein Kandidat): Bitcoin halten (Spot) ab 2020 und ab 2022
    _, _, cb = D["btc"]
    halten = [cb[i] / cb[a - 1] for i in range(a - 1, b)]
    h22 = [cb[i] / cb[a22 - 1] for i in range(a22 - 1, b)]
    erg["bitcoin_halten"] = {"ab_2020": MK.kennzahlen(halten), "ab_2022": MK.kennzahlen(h22)}
    zeigen(erg)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return erg


def zeigen(erg):
    print(f"Max-Profit-Prüfstand · Stand {erg['stand']} · ab 2020 ausserhalb der Schätz-Stichprobe\n")
    print(f"{'Kandidat':9}{'⌀Hebel':>7}{'ab 2020':>17}{'ab 2022':>17}{'teuer':>9}{'P(<−60%)':>10}{'5%-Jahr':>9}  Urteil")
    for name, k in erg["kandidaten"].items():
        print(f"{name:9}{k['hebel_schnitt']:7.2f}{k['cagr_oos'] * 100:9.1f} %/{k['einbruch_oos'] * 100:4.0f} %"
              f"{k['cagr_2022'] * 100:9.1f} %/{k['einbruch_2022'] * 100:4.0f} %{k['cagr_oos_teuer'] * 100:8.1f} %"
              f"{k['p_einbruch60'] * 100:9.1f} %{k['jahr_5pct'] * 100:8.0f} %  "
              + ("bestanden" if k.get("bestanden") else "nein: " + ", ".join(k.get("gruende", []))) + (" · LIQ" if k["liquidiert"] else ""))
    h = erg["bitcoin_halten"]
    print(f"\nzum Vergleich Bitcoin halten (Spot): ab 2020 {h['ab_2020']['cagr'] * 100:.1f} %/{h['ab_2020']['einbruch'] * 100:.0f} %, "
          f"ab 2022 {h['ab_2022']['cagr'] * 100:.1f} %/{h['ab_2022']['einbruch'] * 100:.0f} %")
    print("Kelly-Hebel je Jahr (nur aus den Vorjahren geschätzt): "
          + " · ".join(f"{n}: " + ", ".join(f"{j} {v:.2f}" for j, v in d.items()) for n, d in erg["kelly_je_jahr"].items()))
    print(f"\nEMPFEHLUNG nach der vorab festgelegten Regel: {erg['empfehlung']}")


if __name__ == "__main__":
    main()
