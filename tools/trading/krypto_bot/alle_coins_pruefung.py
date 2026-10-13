#!/usr/bin/env python3
"""Prüfstand «Meme-Coins, Top 10 und alles traden» — die Trend-Regel des Piloten auf JEDEN Coin, ehrlich mit toten Coins.

VORAB FESTGELEGT am 13.10.2026, bevor gerechnet wurde (der Git-Verlauf belegt die Reihenfolge):

Daten: Tageskerzen ALLER USDT-Paare von Binance seit 2017, auch abgemeldete (LUNA, FTT …), ohne Stablecoins, Gold-,
Hebel- und verpackte Token (binance_daten.py, Lücken > 5 Tage = neuer Coin, verschwundene Coins zum letzten Kurs verkauft —
alles wie in gewinner_pruefung.py).
Jeden 7. Tag entschieden (Schlusskurs), gehandelt ab dem nächsten Tag, nur mit Daten bis zum Entscheidungstag.
Universen (am Entscheidungstag, je mit ≥ 90 Tagen Kursgeschichte):
  TOP10  die 10 Coins mit dem höchsten 30-Tage-Volumen (Binance-Volumen als Mass für «Top 10»)
  MEME   Coins aus der Meme-Liste unten mit ≥ 5 Mio. USDT Tagesvolumen (30-Tage-Schnitt)
  ALLE   alle Coins mit ≥ 5 Mio. USDT Tagesvolumen (30-Tage-Schnitt)
Strategien je Universum:
  halten       alle Coins des Universums gleich gewichtet (wöchentlich ausgeglichen)
  trend        nur Coins über ihrem N-Tage-Schnitt, höchstens 10 Plätze à 10 % (bei mehr Kandidaten: die liquidesten),
               freie Plätze in USDT
  trend_btc    wie trend, aber alles in USDT, solange Bitcoin unter seinem 150-Tage-Schnitt liegt
  N wird NUR im Lernzeitraum 02/2018–12/2021 gewählt (50 / 100 / 150, bestes Verhältnis Rendite ÷ Einbruch) — für TOP10
  und ALLE; MEME übernimmt das N von ALLE (vor 2022 gab es kaum Meme-Coins).
Vergleich: Bitcoin mit Trend 150 (der Kern des Piloten) und Bitcoin halten.
Kosten je umgeschichtetem Betrag: TOP10 0,1 % Gebühr + 0,05 % Schlupf; MEME und ALLE 0,1 % + 0,2 % (dünnere Märkte).
Bestanden (je Universum und Strategie, im Prüfzeitraum ab 2022) nur, wenn ALLES gilt:
  1) Rendite ÷ schlimmster Einbruch besser als «Bitcoin mit Trend 150» — in BEIDEN Hälften (2022–2023 und 2024–heute)
  2) schlimmster Einbruch nicht tiefer als −50 %
  3) Zufallsprobe: schlägt ≥ 90 % von 200 Kopien, die statt der Trend-Coins zufällige Coins aus demselben Universum nehmen
     (gleiche Anzahl Plätze, gleiche Wochen) — sonst steckt der Erfolg nicht in der Regel, sondern im Markt.
Aufruf: python3 tools/trading/krypto_bot/alle_coins_pruefung.py   → Tabelle + data/krypto-alle-coins-pruefung.json
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import gewinner_pruefung as G  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-alle-coins-pruefung.json"
MEME = {"DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "MEME", "BOME", "NEIRO", "TURBO", "PEOPLE", "PNUT", "ACT", "TRUMP",
        "1MBABYDOGE", "DOGS", "PENGU", "1000CHEEMS", "1000CAT", "1000SATS", "MUBARAK", "TST", "BANANAS31", "BROCCOLI714", "NOT",
        "BABYDOGE", "MOODENG", "GOAT", "POPCAT", "BRETT", "FARTCOIN", "SPX", "MEW", "SLERF", "MYRO", "WEN", "ELON", "AKITA",
        "KISHU", "SAMO", "BABY", "LADYS", "AIDOGE", "COQ", "CAT", "SNEK", "SUNDOG", "HIPPO", "CHILLGUY", "PONKE", "MOG"}
LERN = ("2018-02-01", "2022-01-01")
HAELFTEN = [("2022-01-01", "2024-01-01"), ("2024-01-01", "9999")]
PRUEF_START = "2022-01-01"
PLAETZE, MIN_VOL_TAG, MAX_EINBRUCH = 10, 5_000_000.0, -0.50
N_WAHL = (50, 100, 150)
KOSTEN = {"TOP10": 0.0015, "MEME": 0.003, "ALLE": 0.003}
KOPIEN, SKILL_MIN = 200, 0.90
_CACHE = {}


def basis(sym):
    return sym.split("#")[0][:-4]


def uni(name, i, preis, vol):
    """Universum am Tag i (nur Daten bis i)."""
    key = (name, i, id(preis))
    if key in _CACHE:
        return _CACHE[key]
    if name == "TOP10":
        out = G.universum(i, preis, vol, n=10)
    else:
        out = []
        for sym, p in preis.items():
            if p[i] is None or i < 90 or p[i - 90] is None:
                continue
            if name == "MEME" and basis(sym) not in MEME:
                continue
            v30 = sum(vol[sym][i - 29:i + 1]) / 30
            if v30 >= MIN_VOL_TAG:
                out.append((v30, sym))
        out = [s for _, s in sorted(out, reverse=True)]
    _CACHE[key] = out
    return out


def ziele(strategie, universum_name, n, i, preis, vol, btc="BTCUSDT"):
    """Zielgewichte {sym: Anteil} am Entscheidungstag i (Rest = USDT)."""
    if strategie == "btc":
        return {btc: 1.0}
    if strategie == "btc_trend":
        s = G.schnitt(preis[btc], i, 150)
        return {btc: 1.0} if s and preis[btc][i] > s else {}
    u = uni(universum_name, i, preis, vol)
    if strategie == "halten":
        return {s: 1 / len(u) for s in u} if u else {}
    if strategie == "trend_btc":
        s = G.schnitt(preis[btc], i, 150)
        if not s or preis[btc][i] <= s:
            return {}
    kand = [s for s in u if (m := G.schnitt(preis[s], i, n)) and preis[s][i] > m]  # u ist nach Liquidität sortiert
    return {s: 1 / PLAETZE for s in kand[:PLAETZE]}


def zufalls_plan(echt, i_liste, universum_name, preis, vol, rnd):
    """Gleich viele Plätze wie die echte Strategie in jeder Woche, aber zufällige Coins aus demselben Universum."""
    plan = {}
    for i in i_liste:
        z = echt[i]
        if not z:
            plan[i] = {}
            continue
        u = uni(universum_name, i, preis, vol)
        anteil = next(iter(z.values()))
        plan[i] = {s: anteil for s in rnd.sample(u, min(len(z), len(u)))}
    return plan


def simulieren(plan, tage, preis, a, b, kosten):
    alt = G.KOSTEN
    G.KOSTEN = kosten
    try:
        return G.simulieren(plan, tage, preis, a, b)
    finally:
        G.KOSTEN = alt


def fenster(tage, von, bis):
    a = tage.index(von) if von in tage else 0
    b = tage.index(bis) if bis in tage else len(tage)
    return a, b


def bewerten(plan_echt, plan_ref, tage, preis, kosten):
    """→ {haelften: [...], gesamt, besser_als_ref_beide, einbruch_ok}"""
    out = {"haelften": []}
    besser = True
    for von, bis in HAELFTEN:
        a, b = fenster(tage, von, bis)
        k, kr = G.kennz(simulieren(plan_echt, tage, preis, a, b, kosten)), G.kennz(simulieren(plan_ref, tage, preis, a, b, 0.0015))
        out["haelften"].append({"von": von, "strategie": k, "btc_trend": kr})
        besser = besser and k["mar"] > kr["mar"]
    a, b = fenster(tage, PRUEF_START, "9999")
    out["gesamt"] = G.kennz(simulieren(plan_echt, tage, preis, a, b, kosten))
    out["besser_als_btc_trend_beide"] = besser
    out["einbruch_ok"] = out["gesamt"]["einbruch"] >= MAX_EINBRUCH
    return out


def _endlich(x):
    """Unendliche Werte (kein Einbruch → MAR ∞) als null speichern — «Infinity» wäre kein gültiges JSON."""
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: _endlich(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_endlich(v) for v in x]
    return x


def main():
    roh = G.BD.alle()
    basen = {s[:-4] for s in roh}
    roh = {s: r for s, r in roh.items() if not any(s[:-4].endswith(x) and s[:-4][:-len(x)] in basen for x in ("UP", "DOWN", "BULL", "BEAR"))}
    reihen = G.segmente(roh)
    tage, preis, vol = G.vorbereiten(reihen)
    memes = sorted({basis(s) for s in reihen if basis(s) in MEME})
    print(f"{len(reihen)} Kursverläufe, {tage[0]} bis {tage[-1]}; Meme-Coins mit Binance-Daten: {len(memes)} ({', '.join(memes)})")
    i_liste = list(range(tage.index(LERN[0]), len(tage) - 1, 7))
    ref = {i: ziele("btc_trend", "", 0, i, preis, vol) for i in i_liste}
    erg = {"stand": tage[-1], "memes": memes, "regel": __doc__.split("Bestanden")[1].split("Aufruf")[0].strip(), "universen": {}}
    # N je Universum im Lernzeitraum wählen
    n_wahl = {}
    for name in ("TOP10", "ALLE"):
        a, b = fenster(tage, *LERN)
        mar = {}
        for n in N_WAHL:
            plan = {i: ziele("trend", name, n, i, preis, vol) for i in i_liste}
            mar[n] = G.kennz(simulieren(plan, tage, preis, a, b, KOSTEN[name]))["mar"]
        n_wahl[name] = max(mar, key=lambda x: mar[x] if not math.isinf(mar[x]) else -1)
        print(f"  {name}: Lernzeitraum MAR je N {({k: round(v, 2) for k, v in mar.items()})} → N = {n_wahl[name]}")
    n_wahl["MEME"] = n_wahl["ALLE"]
    rnd = random.Random(13)
    a0, b0 = fenster(tage, PRUEF_START, "9999")
    print(f"\n{'Universum / Strategie':28}{'2022–2023':>26}{'2024–heute':>26}{'ab 2022':>26}  Zufall  Urteil")
    for name in ("TOP10", "MEME", "ALLE"):
        erg["universen"][name] = {"n": n_wahl[name]}
        for strat in ("halten", "trend", "trend_btc"):
            plan = {i: ziele(strat, name, n_wahl[name], i, preis, vol) for i in i_liste}
            r = bewerten(plan, ref, tage, preis, KOSTEN[name])
            skill = None
            if strat != "halten":
                echt = r["gesamt"]["mar"]
                besser = sum(echt > G.kennz(simulieren(zufalls_plan(plan, i_liste, name, preis, vol, rnd), tage, preis, a0, b0, KOSTEN[name]))["mar"]
                             for _ in range(KOPIEN))
                skill = besser / KOPIEN
            r["zufall"] = skill
            r["bestanden"] = bool(r["besser_als_btc_trend_beide"] and r["einbruch_ok"] and skill is not None and skill >= SKILL_MIN)
            erg["universen"][name][strat] = r
            h = r["haelften"]
            print(f"{name + ' ' + strat:28}" + "".join(f"{x['strategie']['cagr'] * 100:8.1f} %/J {x['strategie']['einbruch'] * 100:5.0f} % MAR {x['strategie']['mar']:5.2f}"
                                                     for x in h)
                  + f"{r['gesamt']['cagr'] * 100:8.1f} %/J {r['gesamt']['einbruch'] * 100:5.0f} % ×{r['gesamt']['ende']:5.2f}"
                  + f"  {'–' if skill is None else f'{skill * 100:3.0f} %'}   {'✅' if r['bestanden'] else '❌'}", flush=True)
    for key, name in (("btc_trend", "Bitcoin mit Trend 150"), ("btc", "Bitcoin halten")):
        plan = {i: ziele(key, "", 0, i, preis, vol) for i in i_liste}
        res = [G.kennz(simulieren(plan, tage, preis, *fenster(tage, v, b), 0.0015)) for v, b in HAELFTEN]
        ges = G.kennz(simulieren(plan, tage, preis, a0, b0, 0.0015))
        erg[key] = {"haelften": res, "gesamt": ges}
        print(f"{name:28}" + "".join(f"{k['cagr'] * 100:8.1f} %/J {k['einbruch'] * 100:5.0f} % MAR {k['mar']:5.2f}" for k in res)
              + f"{ges['cagr'] * 100:8.1f} %/J {ges['einbruch'] * 100:5.0f} % ×{ges['ende']:5.2f}")
    AUSGABE.write_text(json.dumps(_endlich(erg), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\nBestanden: {[f'{u} {s}' for u, d in erg['universen'].items() for s, r in d.items() if isinstance(r, dict) and r.get('bestanden')] or 'keine'}")


if __name__ == "__main__":
    main()
