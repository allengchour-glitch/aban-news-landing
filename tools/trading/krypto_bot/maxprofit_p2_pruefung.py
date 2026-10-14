#!/usr/bin/env python3
"""Prüfstand «Max Profit 2» — Pilot 2.0 mit Hebel: bringt mehr als 1× auf Dauer mehr Geld, ohne das Konto zu riskieren?

PROTOKOLL — VORAB FESTGELEGT (committet vor dem ersten Lauf mit echten Daten):
Anlass: Der erste Max-Profit-Prüfstand (maxprofit_pruefung.py) empfahl für den Live-Pilot (alles über Futures) 1,75×; Pilot 2.0
mit 1× war dort effizienter (mehr Rendite je Einbruch). Offen blieb: Was bringt Pilot 2.0 MIT Hebel?
Signale wie dort, unverändert: Bitcoin Trend 150 + Ethereum Trend 200, Schwankungsziel 40 % × L mit Deckel L, MVRV-Bremse,
Börsen-Stop 3 Tages-Schwankungen mit 0,1 % Schlupf, BTC/ETH täglich 50/50 neu aufgeteilt.
Modell «Pilot 2.0 mit Hebel L» (maxprofit_kern.lauf_p2):
  Long:  zuerst über Spot (Gebühr 0,10 %, kein Funding); über einen Futures-Long nur der Teil, für den das Pfand sonst nicht
         reicht (zahlt echtes Funding; vor Beginn der Funding-Daten pauschal 0,01 % je 8 Stunden).
  Short: über Futures (bekommt Funding bzw. zahlt es, wenn es negativ ist).
  Pfand: jede Futures-Position hat Volumen ÷ L als Pfand im Futures-Konto (bei 1× 100 % wie live). Spot-Coins zählen NICHT als
         Pfand. Der Futures-Teil verträgt so eine Gegenbewegung von 1/L, bevor er liquidiert wird (2×: 50 %), also so viel wie
         F-L bei vollem Ziel. Bei Teil-Ziel liegt seine Liquidation näher als bei F-L, weil dort das ganze Konto trägt.
         Folge: bis 1× Ziel läuft der Long ganz über Spot, darüber teils über Futures.
  Ernte: freies Geld (Konto − Spot − Pfand) liegt in der Funding-Ernte (Spot + Short desselben Coins, 1,5× Kapital je Volumen,
         0,15 % Kosten auf jede Änderung).
  Liquidation des Futures-Teils über Tagestief/-hoch, Wartungsmarge 0,5 % → gilt vorsichtig als Konto 0 («liquidiert»).
  Ein Wechsel Long ↔ Short kostet je Teil die eigene Gebühr (pilot2_pruefung.lauf2 rechnete dort alles zur Spot-Gebühr;
  darum liegt P2-1 hier leicht über «P2» des ersten Prüfstands).
Kandidaten: P2-L mit L ∈ {1; 1,25; 1,5; 1,75; 2}. Nur feste Hebel, weil wenige Kandidaten die Zahl des besten wenig schönen.
Gezählt wird ab 1.1.2020, zusätzlich ab 2022 (Baisse + Erholung) und mit «doppelten Kosten» ab 2020: alle Gebühren, Schlupf und
Ernte-Kosten × 2, Funding der Futures-Longs × 1,5. Die Funding-EINNAHMEN (Shorts, Ernte) werden dabei nicht erhöht.
Risiko wie dort: 10'000 Zufallsjahre aus den echten Tagesrenditen ab 2020 (Blöcke à 20 Tage).
ENTSCHEIDUNGSREGEL (maxprofit_kern.entscheidung, Basis P2-1): bestanden hat ein Kandidat, wenn ALLES gilt
  1) nie liquidiert, 2) P(Einbruch tiefer als −60 % in einem Zufallsjahr) ≤ 5 %, 3) Rendite pro Jahr ab 2022 ≥ die von P2-1,
  4) mit doppelten Kosten ab 2020 ≥ P2-1 (ebenfalls doppelte Kosten).
Empfehlung = bestandener Kandidat mit der höchsten Rendite pro Jahr ab 2020. Liegt einer mit kleinerem Hebel weniger als
2 Prozentpunkte darunter, gilt der kleinere. Besteht ausser P2-1 keiner, bleibt 1×.
Zum Vergleich (kein Kriterium): F-1 und F-1,75 (Empfehlung des ersten Prüfstands), mit denselben Daten neu gerechnet.
Wichtig: Pilot 2.0 ist gesperrt (FREIGEGEBEN = False) und kann heute nur 1×. Ein Hebel wäre ein Umbau des Live-Codes
(Futures-Long-Teil, Pfand-Regel) mit eigenen Prüfungen. Dieser Prüfstand sagt nur, ob sich das lohnen WÜRDE.
Nicht abgebildet:
  - Börsenausfall (FTX 2022), Spot/Future-Kursdifferenz.
  - Kurslücken über den Stop hinaus (Ausführung zum Stop-Kurs + Schlupf).
  - Verrechnung von Futures-Long und Ernte-Short im selben Paar. Das ist vorsichtig gerechnet: getrennt heisst mehr Gebühren und
    mehr Pfand.
Keine Anlageberatung.

Aufruf: python3 -B tools/trading/krypto_bot/maxprofit_p2_pruefung.py   → Tabelle + data/krypto-maxprofit-p2-pruefung.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import maxprofit_kern as MK  # noqa: E402
import maxprofit_pruefung as MP  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-maxprofit-p2-pruefung.json"
HEBEL = [1.0, 1.25, 1.5, 1.75, 2.0]
VERGLEICH = [1.0, 1.75]


def p2l_kurve(D, L, a, b, teuer=False, info=None):
    """Pilot 2.0 mit Hebel L (BTC/ETH täglich 50/50) auf den Signalen L × z1. → (Werte, liquidiert)"""
    k = 2 if teuer else 1
    teile, liq = [], False
    for coin, sym in (("btc", "BTC"), ("eth", "ETH")):
        h, l, c = D[coin]
        z = [L * x for x in D["z1"][coin]]
        fl, fs, _ = D["fund"][sym]
        if teuer:
            fl = [x * 1.5 if x > 0 else x for x in fl]  # nur was Futures-Longs ZAHLEN; Einnahmen (fs) bleiben
        w, lq = MK.lauf_p2(z, h, l, c, fl, fs, a, b, L=L, stop_k=3.0, gebuehr=MK.GEBUEHR * k, spot_gebuehr=MK.SPOT_GEBUEHR * k,
                           schlupf=MK.SCHLUPF * k, park_kosten=MK.PARK_KOSTEN * k, info=info)
        teile.append(w + [0.0] * (b - max(a, 1) + 1 - len(w)))
        liq = liq or lq
    return MK.mix_taeglich(*teile), liq


def main():
    D = MP.daten()
    tage = D["tage"]
    a, b = MP.idx(tage, MP.OOS_AB), len(tage)
    a22 = MP.idx(tage, MP.BAISSE_AB)
    erg = {"stand": tage[-1], "protokoll": __doc__.split("PROTOKOLL")[1].split("Aufruf:")[0].strip(), "kandidaten": {},
           "vergleich": {}}
    for L in HEBEL:
        info = {}
        w, liq = p2l_kurve(D, L, a, b, info=info)
        wt, _ = p2l_kurve(D, L, a, b, teuer=True)
        res = MP.auswerten(w, liq, a, tage, a22)
        res["cagr_oos_teuer"] = MK.kennzahlen(wt)["cagr"]
        res["hebel_schnitt"] = L
        n = info.get("tage", 0.0) or 1.0
        res["anteile"] = {k_: info.get(k_, 0.0) / n for k_ in ("spot", "perp_long", "perp_short", "park")}
        erg["kandidaten"][f"P2-{L:g}"] = res
    empf, urteil = MK.entscheidung(erg["kandidaten"], "P2-1")
    for name, (ok, gruende) in urteil.items():
        erg["kandidaten"][name]["bestanden"], erg["kandidaten"][name]["gruende"] = ok, gruende
    erg["empfehlung"] = empf
    for L in VERGLEICH:  # erster Prüfstand (alles über Futures), gleiche Daten — kein Kriterium
        w, liq = MP.kurve(D, [L] * len(tage), a, b)
        wt, _ = MP.kurve(D, [L] * len(tage), a, b, teuer=True)
        res = MP.auswerten(w, liq, a, tage, a22)
        res["cagr_oos_teuer"] = MK.kennzahlen(wt)["cagr"]
        erg["vergleich"][f"F-{L:g}"] = res
    w, liq = MP.p2_kurve(D, a, b)  # «P2» genau wie im ersten Prüfstand (Gebühr beim Wechsel Long ↔ Short ganz zur Spot-Gebühr)
    erg["vergleich"]["P2 (erster Prüfstand)"] = MP.auswerten(w, liq, a, tage, a22)
    zeigen(erg)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return erg


def zeigen(erg):
    print(f"Max-Profit-Prüfstand 2 (Pilot 2.0 mit Hebel) · Stand {erg['stand']} · ab 2020\n")
    print(f"{'Kandidat':22}{'ab 2020':>17}{'ab 2022':>17}{'teuer':>9}{'P(<−60%)':>10}{'5%-Jahr':>9}  Urteil")
    for name, k in list(erg["kandidaten"].items()) + list(erg["vergleich"].items()):
        teuer = f"{k['cagr_oos_teuer'] * 100:8.1f} %" if "cagr_oos_teuer" in k else f"{'–':>10}"
        urteil = ("bestanden" if k.get("bestanden") else "nein: " + ", ".join(k.get("gruende", []))) if "bestanden" in k else "Vergleich"
        print(f"{name:22}{k['cagr_oos'] * 100:9.1f} %/{k['einbruch_oos'] * 100:4.0f} %{k['cagr_2022'] * 100:9.1f} %/"
              f"{k['einbruch_2022'] * 100:4.0f} %{teuer}{k['p_einbruch60'] * 100:9.1f} %{k['jahr_5pct'] * 100:8.0f} %  "
              + urteil + (" · LIQ" if k["liquidiert"] else ""))
    print("\nAnteile am Konto im Schnitt (Spot / Futures-Long / Futures-Short / Ernte-Volumen):")
    for name, k in erg["kandidaten"].items():
        a_ = k["anteile"]
        print(f"  {name:8} {a_['spot']:.2f} / {a_['perp_long']:.2f} / {a_['perp_short']:.2f} / {a_['park']:.2f}")
    print(f"\nEMPFEHLUNG nach der vorab festgelegten Regel: {erg['empfehlung']}")


if __name__ == "__main__":
    main()
