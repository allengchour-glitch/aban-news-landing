#!/usr/bin/env python3
"""Tests des Max-Profit-Rechenkerns (maxprofit_kern.py) — ohne Netz, mit erfundenen Kursen.
    python3 -B tools/trading/krypto_bot/test_maxprofit.py"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import maxprofit_kern as MK  # noqa: E402
import pilot_pruefung as P  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


def kurse(n=900, seed=3, mu=0.0008, sigma=0.03):
    rnd = random.Random(seed)
    c, h, l = [100.0], [101.0], [99.0]
    for _ in range(n - 1):
        x = c[-1] * math.exp(rnd.gauss(mu, sigma))
        spanne = abs(rnd.gauss(0, sigma * 0.6))
        c.append(x)
        h.append(x * (1 + spanne))
        l.append(x * (1 - spanne))
    return h, l, c


# 1) gleiches Modell wie der bewährte pilot_pruefung.lauf (Longs zahlen pauschal 0,01 % je 8 Std., Shorts bekommen nichts)
h, l, c = kurse()
z = P.hebel(c, n_sma=150, ziel_vol=0.40, max_hebel=1.0)
alt, _ = P.lauf(z, h, l, c, 200, len(c), stop_k=3.0)
neu, liq = MK.lauf_hebel(z, h, l, c, [0.0003] * len(c), [0.0] * len(c), 200, len(c), stop_k=3.0)
pruefe("lauf_hebel = pilot_pruefung.lauf bei pauschalem Funding (gleiches Modell)",
       len(alt) == len(neu) and max(abs(x - y) for x, y in zip(alt, neu)) < 1e-12 and not liq, (len(alt), len(neu), alt[-1], neu[-1]))
z2 = [2 * x for x in z]
alt2, _ = P.lauf(z2, h, l, c, 200, len(c), stop_k=3.0)
neu2, _ = MK.lauf_hebel(z2, h, l, c, [0.0003] * len(c), [0.0] * len(c), 200, len(c), stop_k=3.0)
pruefe("… auch mit Hebel 2", max(abs(x - y) for x, y in zip(alt2, neu2)) < 1e-12, (alt2[-1], neu2[-1]))

# 2) Funding wirkt richtig herum: Short bekommt positives Funding, Long zahlt
h, l, c = [100.0] * 60, [100.0] * 60, [100.0] * 60  # Kurs steht still: nur Funding bewegt das Konto
w_s, _ = MK.lauf_hebel([-1.0] * 60, h, l, c, [0.001] * 60, [0.001] * 60, 1, 60, stop_k=0)
w_l, _ = MK.lauf_hebel([1.0] * 60, h, l, c, [0.001] * 60, [0.001] * 60, 1, 60, stop_k=0)
pruefe("Funding: Short verdient positives Funding, Long zahlt es", w_s[-1] > 1.0 > w_l[-1], (w_s[-1], w_l[-1]))
w_neg, _ = MK.lauf_hebel([-1.0] * 60, h, l, c, [0.0] * 60, [-0.001] * 60, 1, 60, stop_k=0)
pruefe("… negatives Funding kostet den Short", w_neg[-1] < 1.0, w_neg[-1])

# 3) Liquidation: 3× Long, ein Tag −40 % im Tagestief → Konto weg
c = [100.0] * 40 + [100.0] * 5
h = list(c)
l = list(c)
l[42] = 60.0
w, liq = MK.lauf_hebel([3.0] * 45, h, l, c, [0.0] * 45, [0.0] * 45, 1, 45, stop_k=0)
pruefe("3× Long, Tagestief −40 % → liquidiert, Konto 0", liq and w[-1] == 0.0, (liq, w[-3:]))
w, liq = MK.lauf_hebel([1.0] * 45, h, l, c, [0.0] * 45, [0.0] * 45, 1, 45, stop_k=0)
pruefe("… mit 1× nicht liquidiert", not liq and w[-1] > 0.5, (liq, w[-1]))

# 4) Kelly: bei normalverteilten Tagesrenditen liegt μ/σ² beim Wachstums-Maximum
rnd = random.Random(7)
r = [rnd.gauss(0.001, 0.02) for _ in range(200000)]
L_star = MK.kelly_hebel(r)


def wachstum(L):
    return sum(math.log(1 + L * x) for x in r) / len(r)


gitter = [x / 10 for x in range(5, 61)]
L_best = max(gitter, key=wachstum)
# Standardfehler des geschätzten μ: 0,02/√200000 ≈ 0,000045 → Kelly ±0,11 — Toleranz 0,3 (gut 2,5 Standardfehler)
pruefe("Kelly μ/σ² ≈ 2,5 bei μ 0,1 %/Tag, σ 2 %/Tag", abs(L_star - 2.5) < 0.3, L_star)
pruefe("Gegenprobe: das echte Wachstums-Maximum liegt beim Kelly-Hebel (±0,3)", abs(L_best - L_star) <= 0.3, (L_best, L_star))
pruefe("… doppelter Kelly wächst kaum noch (≤ 15 % des Maximums)", wachstum(2 * L_star) < 0.15 * wachstum(L_star),
       (wachstum(2 * L_star), wachstum(L_star)))
pruefe("Kelly ohne Vorteil (μ ≤ 0) → 0", MK.kelly_hebel([-0.001, 0.001, -0.002, 0.0005]) == 0.0)

# 5) Walk-Forward sieht nie in die Zukunft
tage = [f"{2018 + i // 365}-{(i % 365) // 31 + 1:02d}-{(i % 365) % 28 + 1:02d}" for i in range(365 * 4)]
tage = sorted(tage)
r = [rnd.gauss(0.001, 0.02) for _ in tage]
wf = MK.walk_forward(tage, r, [2020, 2021], 0.5, 0.5, 3.0)
r2 = list(r)
start_2020 = next(i for i, t in enumerate(tage) if t >= "2020-01-01")
for i in range(start_2020, len(r2)):
    r2[i] = 0.5  # absurde Zukunft
wf2 = MK.walk_forward(tage, r2, [2020], 0.5, 0.5, 3.0)
pruefe("Walk-Forward: Hebel 2020 hängt nicht von Renditen ab 2020 ab", wf[2020] == wf2[2020], (wf, wf2))
r3 = list(r)
r3[10] = 0.5
pruefe("… wohl aber von den Renditen davor", MK.walk_forward(tage, r3, [2020], 0.5, 0.5, 3.0)[2020] != wf[2020])
pruefe("… begrenzt auf [min, max]", MK.walk_forward(tage, [0.01] * len(tage), [2020], 1.0, 0.5, 3.0)[2020] == 3.0
       and MK.walk_forward(tage, [-0.001] * len(tage), [2020], 1.0, 0.5, 3.0)[2020] == 0.5)

# 6) Bootstrap: reproduzierbar und richtig gerechnet
konst = [0.001] * 500
jahre = MK.bootstrap_jahre(konst, n=50, laenge=365, block=20, seed=1)
pruefe("Bootstrap: konstante Rendite → jedes Jahr 1,001^365 − 1, kein Einbruch",
       all(abs(x - (1.001 ** 365 - 1)) < 1e-9 and dd == 0.0 for x, dd in jahre), jahre[:2])
a = MK.bootstrap_jahre(r, n=30, seed=5)
b = MK.bootstrap_jahre(r, n=30, seed=5)
pruefe("Bootstrap reproduzierbar mit gleichem Seed", a == b)
crash = [0.0] * 100 + [-0.1] * 20
jahre = MK.bootstrap_jahre(crash, n=200, laenge=365, block=20, seed=2)
pruefe("Bootstrap: Blöcke behalten Crash-Serien (Einbruch bis −88 % möglich)", min(dd for _, dd in jahre) < -0.85,
       min(dd for _, dd in jahre))

# 7) Kennzahlen
k = MK.kennzahlen([1.0, 2.0, 1.0, 1.5], tage_pro_jahr=3)
pruefe("Kennzahlen: Rendite pro Jahr und schlimmster Einbruch", abs(k["cagr"] - 0.5) < 1e-12 and abs(k["einbruch"] + 0.5) < 1e-12, k)
pruefe("mix_taeglich = pilot_pruefung.mix_taeglich",
       MK.mix_taeglich([1, 1.1, 1.0], [1, 0.9, 0.95]) == P.mix_taeglich([1, 1.1, 1.0], [1, 0.9, 0.95]))

# 8) Entscheidungsregel (wie im Protokoll)


def kand(cagr, c22, teuer, p60=0.01, liq=False, hebel=1.0):
    return {"cagr_oos": cagr, "cagr_2022": c22, "cagr_oos_teuer": teuer, "p_einbruch60": p60, "liquidiert": liq,
            "hebel_schnitt": hebel}


basis = kand(0.30, 0.25, 0.27)
K = {"F-1": basis, "F-2": kand(0.50, 0.30, 0.42, hebel=2.0), "F-3": kand(0.70, 0.40, 0.55, p60=0.12, hebel=3.0),
     "F-4": kand(0.90, 0.50, 0.70, liq=True, hebel=4.0)}
empf, u = MK.entscheidung(K, "F-1")
pruefe("Regel: höchste Rendite unter den bestandenen; zu riskant/liquidiert fällt raus",
       empf == "F-2" and not u["F-3"][0] and not u["F-4"][0] and u["F-2"][0], (empf, u))
K["F-1.5"] = kand(0.49, 0.29, 0.41, hebel=1.5)
pruefe("Regel: weniger als 2 Pp. Unterschied → der kleinere Hebel", MK.entscheidung(K, "F-1")[0] == "F-1.5")
K2 = {"F-1": basis, "F-2": kand(0.50, 0.20, 0.42, hebel=2.0), "F-1.5": kand(0.45, 0.30, 0.20, hebel=1.5)}
empf, u = MK.entscheidung(K2, "F-1")
pruefe("Regel: ab 2022 schlechter oder mit doppelten Kosten schlechter → nein; keiner besteht → 1×",
       empf == "F-1" and not u["F-2"][0] and not u["F-1.5"][0], (empf, u))

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
