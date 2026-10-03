#!/usr/bin/env python3
"""Helfen Gratis-Zusatzdaten dem Bot? Ehrlicher Test mit vorab festgelegten Regeln.

Gratis-Quellen (Yahoo Finance, ohne Schlüssel):
  ^VIX  Angstindex (erwartete Schwankung des S&P 500)
  ^TNX  Zins 10-jährige US-Staatsanleihe
  ^IRX  Zins 3-monatige US-Staatsanleihe  → Zinskurve = TNX − IRX (negativ = „invers“)

Die Regeln stehen VOR dem Test fest (keine Suche nach Parametern), damit kein Auswahl-Glück entsteht:
  VIX unter 30          investiert, solange die Angst nicht extrem ist
  VIX unter 50-Tage-Ø   investiert, solange die Angst sinkt
  Zinskurve positiv     investiert, ausser die Kurve ist invers
  Kombi                 VIX unter 30 UND Kurs über 200-Tage-Ø

Ehrlichkeit: Signal am Schlusskurs, gehandelt ab dem nächsten Tag, 0.1 % Kosten pro Wechsel.
Getrennt: Entwickeln 2000–2012, Test 2013–heute (zählt). Skill = Anteil von 200 zeitversetzten Kopien
derselben Regel (gleiche Investitionsquote und Wechsel), die sie im Sharpe schlägt.
Gegenprobe: eine Regel, die den morgigen Kurs kennt, muss nahe 100 % Skill haben.

Aufruf: python3 tools/trading/ki_bot/zusatzdaten.py [--offline]
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent))
import lern_bot as L  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "ki-bot-zusatzdaten.json"
KOSTEN = 0.001
GRENZE = "2013-01-01"


def ausrichten(reihen):
    """Nur Tage, an denen alle Reihen einen Wert haben (keine Lücken mit Zukunftswerten füllen)."""
    gemeinsam = sorted(set.intersection(*[set(dict(r)) for r in reihen]))
    return gemeinsam, [[dict(r)[t] for t in gemeinsam] for r in reihen]


def sma(x, n):
    o, s = [None] * len(x), 0.0
    for i, v in enumerate(x):
        s += v
        if i >= n:
            s -= x[i - n]
        if i >= n - 1:
            o[i] = s / n
    return o


def regeln(p, vix, tnx, irx):
    v50, p200 = sma(vix, 50), sma(p, 200)
    return {
        "VIX unter 30": [1 if v < 30 else 0 for v in vix],
        "VIX unter 50-Tage-Ø": [1 if m is not None and v < m else 0 for v, m in zip(vix, v50)],
        "Zinskurve positiv": [1 if t - i > 0 else 0 for t, i in zip(tnx, irx)],
        "VIX unter 30 + Kurs über 200-Tage-Ø": [1 if v < 30 and m is not None and x > m else 0 for v, x, m in zip(vix, p, p200)],
    }


def lauf(pos, r, a, b):
    """pos[i] = Entscheidung am Schluss von Tag i → zählt für die Rendite von Tag i+1."""
    o, vor = [], pos[a - 1] if a > 0 else 0
    for i in range(max(a, 1), b):
        q = pos[i - 1]
        o.append(q * r[i] - (KOSTEN if q != vor else 0.0))
        vor = q
    return o


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
    return {"cagr": w ** (252 / len(x)) - 1, "sharpe": m / sd * math.sqrt(252) if sd else 0.0, "einbruch": dd}


def skill(pos, r, a, b, n=200, seed=5):
    seg, rs = pos[a:b], r[a:b]
    ziel = kennz(lauf(seg, rs, 0, len(seg)))["sharpe"]
    rnd, besser = random.Random(seed), 0
    for _ in range(n):
        k = rnd.randrange(21, len(seg) - 21)  # zeitversetzt: gleiche Quote, gleiche Wechsel, falsches Timing
        z = seg[k:] + seg[:k]
        if kennz(lauf(z, rs, 0, len(z)))["sharpe"] < ziel:
            besser += 1
    return besser / n


def auswerten(offline=False):
    tage, (p, vix, tnx, irx) = ausrichten([L.kurse(s, offline) for s in ("^GSPC", "^VIX", "^TNX", "^IRX")])
    r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
    cut = next(i for i, t in enumerate(tage) if t >= GRENZE)
    n = len(p)
    alle = regeln(p, vix, tnx, irx)
    alle["Gegenprobe: kennt morgen"] = [1 if i + 1 < n and r[i + 1] > 0 else 0 for i in range(n)]
    halten = [1] * n
    erg = {"stand": tage[-1], "von": tage[0], "test_ab": tage[cut], "kosten": KOSTEN,
           "halten": {"entwickeln": kennz(lauf(halten, r, 0, cut)), "test": kennz(lauf(halten, r, cut, n))}, "regeln": {}}
    for name, pos in alle.items():
        erg["regeln"][name] = {
            "entwickeln": kennz(lauf(pos, r, 0, cut)), "test": kennz(lauf(pos, r, cut, n)),
            "quote_test": sum(pos[cut:]) / (n - cut), "skill_test": skill(pos, r, cut, n),
        }
    return erg


def bericht(erg):
    h = erg["halten"]["test"]
    print(f"S&P 500, Test {erg['test_ab'][:4]}–{erg['stand'][:4]} (zählt), Kosten {erg['kosten']*100:.1f} % pro Wechsel")
    print(f"{'Regel':40} {'pro Jahr':>9} {'Einbruch':>9} {'Sharpe':>7} {'investiert':>10} {'Skill':>6}")
    print(f"{'Kaufen und Halten':40} {h['cagr']*100:8.1f}% {h['einbruch']*100:8.0f}% {h['sharpe']:7.2f} {'100 %':>10} {'–':>6}")
    for name, v in erg["regeln"].items():
        t = v["test"]
        print(f"{name:40} {t['cagr']*100:8.1f}% {t['einbruch']*100:8.0f}% {t['sharpe']:7.2f} {v['quote_test']*100:9.0f}% {v['skill_test']*100:5.0f}%")


def main():
    erg = auswerten("--offline" in sys.argv)
    bericht(erg)
    g = erg["regeln"]["Gegenprobe: kennt morgen"]["skill_test"]
    if g < 0.95:
        print(f"Gegenprobe fehlgeschlagen ({g:.0%}) — Messung nicht vertrauenswürdig.")
        return 1
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
