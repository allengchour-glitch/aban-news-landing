#!/usr/bin/env python3
"""Ehrlicher Krypto-Strategietest — welche Regel taugt nach Kosten überhaupt?

Vorab festgelegt (keine Parametersuche): sechs Strategien auf zehn grossen Coins (Tageskurse Yahoo, 365 Tage/Jahr).
  Bitcoin halten · Alle gleich verteilt (monatlich ausgleichen) · Trend 200 (je Coin nur über dem 200-Tage-Schnitt)
  Momentum-Rotation (monatlich die 3 stärksten der letzten 90 Tage, nur wenn im Plus) · Bitcoin mit Schwankungsziel 40 %
  KI-Komitee (das Modell aus ki_bot/kern.py, je Coin, gleich verteilt)
Ehrlichkeit: Entscheidung am Tagesschluss, wirksam ab dem nächsten Tag; 0,25 % Kosten auf jeden Umsatz (Alpaca, Krypto).
Entwickeln bis 31.12.2021, Test ab 1.1.2022 (zählt). Skill = Anteil von 200 zeitversetzten Kopien derselben Positionen,
die die Strategie im Sharpe schlägt (gleiche Quote und Umschichtung, falsches Timing). Gegenprobe: „kennt morgen“ ≈ 100 %.
Achtung Überlebens-Verzerrung: Die zehn Coins sind die, die es heute noch gibt — alle Ergebnisse sind dadurch eher geschönt.

Aufruf: python3 tools/trading/krypto_bot/analyse.py [--offline]
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import lern_bot as L  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-bot-analyse.json"
COINS = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "LTC-USD", "DOGE-USD", "LINK-USD", "AVAX-USD", "BCH-USD", "DOT-USD"]
KOSTEN = 0.0025
TAGE = 365
GRENZE = "2022-01-01"
MIN_HISTORIE = 200
OHNE_TIMING = ("Bitcoin halten", "Alle gleich verteilt")  # Skill misst Timing — hier gibt es keins


def lade(offline):
    reihen = {c: dict(L.kurse(c, offline)) for c in COINS}
    tage = sorted(set().union(*[set(r) for r in reihen.values()]))
    tage = [t for t in tage if "BTC-USD" in reihen and t in reihen["BTC-USD"]]
    preise = {c: [reihen[c].get(t) for t in tage] for c in COINS}
    return tage, preise


def renditen(p):
    return [0.0] + [(p[i] / p[i - 1] - 1) if (p[i] and p[i - 1]) else 0.0 for i in range(1, len(p))]


def sma(p, n):
    o, s, k = [None] * len(p), 0.0, 0
    for i, x in enumerate(p):
        if x is None:
            s, k = 0.0, 0
            continue
        s += x
        k += 1
        if k > n:
            s -= p[i - n]
            k = n
        if k == n:
            o[i] = s / n
    return o


def verfuegbar(p, i):
    """Coin gilt ab MIN_HISTORIE Handelstagen als handelbar (kein Blick auf spätere Kurse)."""
    return i >= MIN_HISTORIE and all(p[j] for j in range(i - MIN_HISTORIE, i + 1))


def strategien(tage, P):
    n = len(tage)
    R = {c: renditen(P[c]) for c in COINS}
    s200 = {c: sma(P[c], 200) for c in COINS}
    W = {}
    W["Bitcoin halten"] = [{"BTC-USD": 1.0} for _ in range(n)]

    gleich, monat, aktuell = [], None, {}
    for i in range(n):
        m = tage[i][:7]
        if m != monat:
            mit = [c for c in COINS if verfuegbar(P[c], i)]  # neues Objekt = Ausgleich
            aktuell = {c: 1 / len(mit) for c in mit} if mit else {}
            monat = m
        gleich.append(aktuell)  # dasselbe Objekt bis zum nächsten Ausgleichstag
    W["Alle gleich verteilt"] = gleich

    trend = []
    for i in range(n):
        mit = [c for c in COINS if verfuegbar(P[c], i)]
        trend.append({c: 1 / len(mit) for c in mit if s200[c][i] and P[c][i] > s200[c][i]} if mit else {})
    W["Trend 200"] = trend

    rot, monat, aktuell = [], None, {}
    for i in range(n):
        m = tage[i][:7]
        if m != monat and i >= 90:
            mit = [c for c in COINS if verfuegbar(P[c], i) and P[c][i - 90]]
            mom = sorted(((P[c][i] / P[c][i - 90] - 1, c) for c in mit), reverse=True)[:3]
            top = [c for r, c in mom if r > 0]
            aktuell = {c: 1 / 3 for c in top}
            monat = m
        rot.append(aktuell)
    W["Momentum-Rotation"] = rot

    vt, var = [], None
    for i in range(n):
        x = R["BTC-USD"][i]
        var = x * x if var is None else 0.94 * var + 0.06 * x * x
        vol = math.sqrt(var * TAGE) if var else 1.0
        vt.append({"BTC-USD": min(1.0, 0.40 / vol) if i > 30 else 0.0})
    W["Bitcoin, Schwankungsziel 40 %"] = vt
    band, cur = [], None
    for i in range(n):  # nur umschichten, wenn das Ziel um mehr als 10 Prozentpunkte abweicht
        q = vt[i]["BTC-USD"]
        if cur is None or abs(q - cur["BTC-USD"]) > 0.10:
            cur = {"BTC-USD": q}
        band.append(cur)
    W["Bitcoin, Schwankungsziel 40 % + Band"] = band

    try:
        import kern as K
        quoten = {}
        for c in COINS:
            idx = [i for i in range(n) if P[c][i]]
            if len(idx) < 400:
                continue
            p = [P[c][i] for i in idx]
            sim = K.simuliere(p, [tage[i] for i in idx], renditen(p))
            q = [0.0] * n
            for k, i in enumerate(idx):
                q[i] = sim["quote"][k]
            quoten[c] = q
        ki = []
        for i in range(n):
            mit = [c for c in quoten if verfuegbar(P[c], i)]
            ki.append({c: quoten[c][i] / len(mit) for c in mit} if mit else {})
        W["KI-Komitee"] = ki
    except ImportError:
        pass

    morgen = []
    for i in range(n):
        mit = [c for c in COINS if verfuegbar(P[c], i) and i + 1 < n]
        gut = [c for c in mit if R[c][i + 1] > 0]
        morgen.append({c: 1 / len(gut) for c in gut} if gut else {})
    W["Gegenprobe: kennt morgen"] = morgen
    for name in W:  # tägliche Strategien: gleiches Ziel wie gestern = kein Handel (Gewichte laufen frei)
        if name in ("Alle gleich verteilt", "Momentum-Rotation", "Bitcoin, Schwankungsziel 40 % + Band"):
            continue
        w = W[name]
        for i in range(1, n):
            if w[i] == w[i - 1]:
                w[i] = w[i - 1]
    return W, R


def lauf(W, R, a, b):
    """Tagesrenditen: Gewichte vom Vortagesschluss × heutige Rendite, minus Kosten auf den Umsatz."""
    # Zwischen zwei Zieländerungen laufen die Gewichte mit den Kursen frei (kein Gratis-Ausgleich);
    # ändert sich das Ziel, wird darauf umgeschichtet und der Umsatz kostet KOSTEN.
    out, ist, ziel_vor = [], {}, None
    for i in range(max(a, 1), b):
        ziel = W[i - 1]
        if ziel is not ziel_vor:  # neues Ziel-Objekt = Handelstag
            umsatz = sum(abs(ziel.get(c, 0) - ist.get(c, 0)) for c in set(ziel) | set(ist))
            ist, ziel_vor = dict(ziel), ziel
        else:
            umsatz = 0.0
        r = sum(g * R[c][i] for c, g in ist.items())
        out.append(r - umsatz * KOSTEN)
        wert = 1 + r
        ist = {c: g * (1 + R[c][i]) / wert for c, g in ist.items()} if wert > 0 else {}
    return out


def kennz(x):
    if not x:
        return {"cagr": 0.0, "sharpe": 0.0, "einbruch": 0.0}
    w, spitze, dd = 1.0, 1.0, 0.0
    for v in x:
        w *= 1 + v
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1)
    m = sum(x) / len(x)
    sd = math.sqrt(sum((v - m) ** 2 for v in x) / max(len(x) - 1, 1))
    return {"cagr": w ** (TAGE / len(x)) - 1 if w > 0 else -1.0, "sharpe": m / sd * math.sqrt(TAGE) if sd else 0.0, "einbruch": dd}


def skill(W, R, a, b, n=200, seed=3):
    seg = W[a:b]
    ziel = kennz(lauf(W, R, a, b))["sharpe"]
    rnd, besser = random.Random(seed), 0
    for _ in range(n):
        k = rnd.randrange(30, len(seg) - 30)
        z = W[:a] + seg[k:] + seg[:k]
        if kennz(lauf(z, R, a, b))["sharpe"] < ziel:
            besser += 1
    return besser / n


def auswerten(offline=False):
    tage, P = lade(offline)
    W, R = strategien(tage, P)
    cut = next(i for i, t in enumerate(tage) if t >= GRENZE)
    erg = {"stand": tage[-1], "test_ab": tage[cut], "kosten": KOSTEN, "coins": COINS, "strategien": {}}
    for name, w in W.items():
        umsatz = sum(sum(abs(w[i].get(c, 0) - w[i - 1].get(c, 0)) for c in set(w[i]) | set(w[i - 1])) for i in range(cut, len(tage)) if w[i] is not w[i - 1])
        erg["strategien"][name] = {"entwickeln": kennz(lauf(w, R, 1, cut)), "test": kennz(lauf(w, R, cut, len(tage))),
                                   "umschichtung_jahr": umsatz / ((len(tage) - cut) / TAGE),
                                   "quote_test": sum(sum(w[i].values()) for i in range(cut, len(tage))) / (len(tage) - cut),
                                   "skill_test": None if name in OHNE_TIMING else skill(w, R, cut, len(tage))}
    return erg


def bericht(erg):
    print(f"Krypto, Test {erg['test_ab']} bis {erg['stand']} (zählt), Kosten {erg['kosten'] * 100:.2f} % je Umsatz")
    print(f"{'Strategie':34} {'pro Jahr':>9} {'Einbruch':>9} {'Sharpe':>7} {'investiert':>10} {'Umsatz/J':>9} {'Skill':>6} | {'Entw. p.J.':>10}")
    for name, v in erg["strategien"].items():
        t, e = v["test"], v["entwickeln"]
        print(f"{name:34} {t['cagr'] * 100:8.1f}% {t['einbruch'] * 100:8.0f}% {t['sharpe']:7.2f} {v['quote_test'] * 100:9.0f}% "
              f"{v['umschichtung_jahr']:8.1f}x {'–' if v['skill_test'] is None else format(v['skill_test'] * 100, '5.0f') + '%':>6} | {e['cagr'] * 100:9.1f}%")


def main():
    erg = auswerten("--offline" in sys.argv)
    bericht(erg)
    if erg["strategien"]["Gegenprobe: kennt morgen"]["skill_test"] < 0.95:
        print("Gegenprobe fehlgeschlagen — Messung nicht vertrauenswürdig.")
        return 1
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
