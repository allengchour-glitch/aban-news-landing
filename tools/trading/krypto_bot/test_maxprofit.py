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
# ein Block = die ganze Reihe (nur im Kreis gedreht): jedes Jahr ergibt genau das Produkt — ohne Blöcke (einzeln gezogen) nicht
dreh = MK.bootstrap_jahre([0.1, -0.5, 0.2], n=40, laenge=3, block=3, seed=4)
pruefe("Bootstrap zieht ganze Blöcke (Reihenfolge bleibt im Block)", all(abs(x - (1.1 * 0.5 * 1.2 - 1)) < 1e-12 for x, _ in dreh),
       sorted(set(round(x, 4) for x, _ in dreh)))
crash = [0.0] * 100 + [-0.1] * 20
jahre = MK.bootstrap_jahre(crash, n=200, laenge=365, block=20, seed=2)
pruefe("Bootstrap: Blöcke behalten Crash-Serien (Einbruch bis −88 % möglich)", min(dd for _, dd in jahre) < -0.85,
       min(dd for _, dd in jahre))

# 7) Kennzahlen
k = MK.kennzahlen([1.0, 2.0, 1.0, 1.5], tage_pro_jahr=6)  # ein halbes Jahr: +50 % → pro Jahr 1,5² − 1 = +125 %
pruefe("Kennzahlen: Rendite pro Jahr und schlimmster Einbruch", abs(k["cagr"] - 1.25) < 1e-12 and abs(k["einbruch"] + 0.5) < 1e-12, k)
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

# 9) Prüfstand selbst (erfundene Kurse): doppelte Kosten können ein Ergebnis NIE verbessern — auch nicht bei Pilot 2.0, wo
#    Funding Einnahme ist (der erste echte Lauf rechnete dort die Funding-Einnahme × 1,5 und war «teuer» fast gleich gut)
import maxprofit_pruefung as MP  # noqa: E402


def fake_daten(seed=11, n=1200):
    rnd = random.Random(seed)
    tage = [f"{2019 + i // 365}-{(i % 365) // 31 + 1:02d}-{(i % 365) % 28 + 1:02d}" for i in range(n)]
    tage = sorted(set(tage))
    out = {"tage": tage, "z1": {}, "fund": {}}
    for coin, nn in (("btc", 150), ("eth", 200)):
        hh, ll, cc = kurse(len(tage), seed=seed + nn, mu=0.001, sigma=0.03)
        out[coin] = (hh, ll, cc)
        out["z1"][coin] = P.hebel(cc, n_sma=nn, ziel_vol=0.40, max_hebel=1.0)
    for sym in ("BTC", "ETH"):
        f = [abs(rnd.gauss(0.0003, 0.0002)) for _ in tage]
        out["fund"][sym] = (f, list(f), 0.0)
    return out


D = fake_daten()
a, b = 300, len(D["tage"])
w, _ = MP.kurve(D, [1.5] * b, a, b)
wt, _ = MP.kurve(D, [1.5] * b, a, b, teuer=True)
pruefe("Prüfstand: doppelte Kosten verschlechtern den Futures-Pilot", wt[-1] < w[-1], (w[-1], wt[-1]))
D_g = fake_daten(seed=13)  # glatte Kurse ohne Funding: kein Stop löst aus → «teuer» unterscheidet sich NUR in der Gebühr
for coin, nn in (("btc", 150), ("eth", 200)):
    cc = [100 + 30 * math.sin(2 * math.pi * i / 400) for i in range(len(D_g["tage"]))]
    D_g[coin] = (list(cc), list(cc), cc)
    D_g["z1"][coin] = P.hebel(cc, n_sma=nn, ziel_vol=0.40, max_hebel=1.0)
for sym in ("BTC", "ETH"):
    D_g["fund"][sym] = ([0.0] * len(D_g["tage"]), [0.0] * len(D_g["tage"]), 0.0)
wg, _ = MP.kurve(D_g, [1.0] * b, a, b)
wgt, _ = MP.kurve(D_g, [1.0] * b, a, b, teuer=True)
pruefe("… auch nur durch die doppelte Gebühr (ohne Funding und Stops)", wgt[-1] < wg[-1] - 1e-9, (wg[-1], wgt[-1]))
D_f = fake_daten(seed=12)
for sym in ("BTC", "ETH"):  # hohes Funding (0,2 %/Tag): bei P2 ist das Einnahme — würde sie × 1,5 gerechnet, wäre «teuer» besser
    D_f["fund"][sym] = ([0.002] * len(D_f["tage"]), [0.002] * len(D_f["tage"]), 0.0)
p2, _ = MP.p2_kurve(D_f, a, b)
p2t, _ = MP.p2_kurve(D_f, a, b, teuer=True)
pruefe("Prüfstand: doppelte Kosten verschlechtern auch Pilot 2.0 (Funding-Einnahme nicht × 1,5)", p2t[-1] < p2[-1], (p2[-1], p2t[-1]))
import pilot_pruefung as _P  # noqa: E402
import pilot2_pruefung as _P2  # noqa: E402
import carry_pruefung as _C  # noqa: E402
pruefe("… und stellt die Kosten danach wieder her", (_P.GEBUEHR, _P.SCHLUPF, _P2.SPOT_GEBUEHR, _C.KOSTEN) == (0.0005, 0.001, 0.001, 0.0015),
       (_P.GEBUEHR, _P.SCHLUPF, _P2.SPOT_GEBUEHR, _C.KOSTEN))

# 10) Pilot 2.0 mit Hebel (lauf_p2): bei 1× und gleicher Gebühr genau das bewährte pilot2_pruefung.lauf2 (Modus P2)
h, l, c = kurse(n=900, seed=5)
z = P.hebel(c, n_sma=150, ziel_vol=0.40, max_hebel=1.0)
rnd = random.Random(7)
f = [rnd.gauss(0.0002, 0.0004) for _ in c]  # auch negatives Funding
alt_spot = _P2.SPOT_GEBUEHR
try:
    _P2.SPOT_GEBUEHR = _P.GEBUEHR  # lauf2 rechnet einen Wechsel Long ↔ Short ganz zur Spot-Gebühr → gleich setzen
    alt = _P2.lauf2(z, h, l, c, f, 200, len(c), modus="P2")
finally:
    _P2.SPOT_GEBUEHR = alt_spot
neu, liq = MK.lauf_p2(z, h, l, c, [0.05] * len(c), f, 200, len(c), L=1.0, gebuehr=MK.GEBUEHR, spot_gebuehr=MK.GEBUEHR)
pruefe("lauf_p2 bei 1× = pilot2_pruefung.lauf2 (P2) bei gleicher Gebühr — Futures-Long-Funding (5 %/Tag!) zahlt bei 1× nie",
       len(alt) == len(neu) and max(abs(x - y) for x, y in zip(alt, neu)) < 1e-12 and not liq, (len(alt), len(neu), alt[-1], neu[-1]))
pruefe("Konstanten wie Funding-Ernte und Pilot 2.0", (MK.SPOT_GEBUEHR, MK.PARK_KOSTEN, MK.KAPITAL_FAKTOR) ==
       (_P2.SPOT_GEBUEHR, _C.KOSTEN, _C.KAPITAL_FAKTOR), (MK.SPOT_GEBUEHR, MK.PARK_KOSTEN, MK.KAPITAL_FAKTOR))
# mit echten Gebühren: beim Wechsel Long ↔ Short kostet jeder Teil seine eigene Gebühr (lauf2: alles zur Spot-Gebühr)
for z0, z1_, teil in ((0.5, -0.5, "Long → Short: der neue Short"), (-0.5, 0.5, "Short → Long: der alte Short")):
    n = 4
    cc = [100.0] * n
    zz = [z0, z1_, z1_, z1_]
    l2 = _P2.lauf2(zz, cc, cc, cc, [0.0] * n, 1, n, modus="P2", stop_k=0)
    p2_, _ = MK.lauf_p2(zz, cc, cc, cc, [0.0] * n, [0.0] * n, 1, n, L=1.0, stop_k=0)
    short = 0.5 * (l2[1] if z0 > 0 else 1.0)  # Volumen des Shorts, der beim Wechsel geöffnet bzw. geschlossen wird
    erwartet = (MK.SPOT_GEBUEHR - MK.GEBUEHR) * short
    pruefe(f"Wechsel {teil} kostet nur die Futures-Gebühr (Unterschied zu lauf2 = 0,05 % × {short:.4f})",
           abs((p2_[2] - l2[2]) - erwartet) < 1e-6 and abs(p2_[1] - l2[1]) < 1e-15, (p2_[2] - l2[2], erwartet))
for vz, art in ((1, "nur Long"), (-1, "nur Short")):  # ohne Wechsel rechnen beide auch mit echten Gebühren gleich (inkl. Stops)
    zz = [vz * abs(x) for x in z]
    l2 = _P2.lauf2(zz, h, l, c, f, 200, len(c), modus="P2")
    p2_, _ = MK.lauf_p2(zz, h, l, c, [0.05] * len(c), f, 200, len(c), L=1.0)
    pruefe(f"{art} (ohne Wechsel): mit echten Gebühren, Stops und Ernte genau wie lauf2",
           max(abs(x - y) for x, y in zip(l2, p2_)) < 1e-12, (l2[-1], p2_[-1]))
alt = _P2.lauf2(z, h, l, c, f, 200, len(c), modus="P2")
neu, _ = MK.lauf_p2(z, h, l, c, [0.0] * len(c), f, 200, len(c), L=1.0)
wechsel = sum(1 for i in range(200, len(c) - 1) if z[i - 1] * z[i] < 0)
pruefe(f"… über 700 Tage mit {wechsel} Wechseln: P2-1 am Ende vor lauf2 (genauere Gebühr)", wechsel > 0 and neu[-1] > alt[-1] * 1.001,
       (wechsel, neu[-1] / alt[-1]))


def erster_tag(ziel, L, f_long=0.0, f_short=0.0, tage=2, l_tief=None, stop_k=0):
    """Kurs steht bei 100; ziel gilt ab Tag 1. → (Werte, liquidiert, Anteile am ersten Handelstag)"""
    n = tage + 1
    cc, hh, ll = [100.0] * n, [100.0] * n, [100.0] * n
    if l_tief:
        ll[2] = l_tief
    info = {}
    w, lq = MK.lauf_p2([ziel] * n, hh, ll, cc, [f_long] * n, [f_short] * n, 1, n, L=L, stop_k=stop_k, info=info)
    return w, lq, info


def nahe(x, y, tol=0.005):
    return abs(x - y) < tol


# 11) Pfand-Regel am ersten Tag (Anteile am Konto): bis 1× ganz über Spot, darüber teils über Futures
_, _, i1 = erster_tag(2.0, 2.0, tage=1)
pruefe("2× Ziel bei 2×: alles über Futures-Long, keine Ernte (Pfand = ganzes Konto)",
       nahe(i1["spot"], 0) and nahe(i1["perp_long"], 2.0) and nahe(i1["park"], 0), i1)
_, _, i1 = erster_tag(1.0, 2.0, tage=1)
pruefe("1× Ziel bei 2×: ganz über Spot, kein Futures-Long", nahe(i1["spot"], 1.0) and nahe(i1["perp_long"], 0) and nahe(i1["park"], 0), i1)
_, _, i1 = erster_tag(1.5, 2.0, tage=1)
pruefe("1,5× Ziel bei 2×: Spot 0,5 + Futures-Long 1,0 (Pfand 0,5 = 1,0 ÷ 2), keine Ernte",
       nahe(i1["spot"], 0.5) and nahe(i1["perp_long"], 1.0) and nahe(i1["park"], 0), i1)
_, _, i1 = erster_tag(0.6, 1.5, tage=1)
pruefe("0,6× Ziel bei 1,5×: ganz Spot, Rest (0,4) als Ernte-Volumen 0,4 ÷ 1,5",
       nahe(i1["spot"], 0.6) and nahe(i1["perp_long"], 0) and nahe(i1["park"], 0.4 / 1.5), i1)
_, _, i1 = erster_tag(-1.0, 2.0, tage=1)
pruefe("Short 1× bei 2×: Pfand 0,5 → Ernte 0,5 ÷ 1,5", nahe(i1["perp_short"], 1.0) and nahe(i1["park"], 0.5 / 1.5), i1)
_, _, i1 = erster_tag(-1.0, 1.0, tage=1)
pruefe("Short 1× bei 1×: Pfand 100 % wie live → keine Ernte", nahe(i1["perp_short"], 1.0) and nahe(i1["park"], 0), i1)

# 12) Funding: Spot-Long zahlt keins, Futures-Long zahlt, die Ernte bekommt
w, _, _ = erster_tag(1.0, 2.0, f_long=0.01, tage=20)
pruefe("Long über Spot zahlt kein Funding (auch bei 1 %/Tag)", abs(w[-1] - w[1]) < 1e-12, (w[1], w[-1]))
w, _, _ = erster_tag(2.0, 2.0, f_long=0.001, tage=20)
pruefe("Futures-Long zahlt Funding (2 × 0,1 % je Tag)", nahe(w[-1] / w[1], (1 - 0.002) ** 19, 1e-3), (w[1], w[-1]))
w, _, _ = erster_tag(0.0, 2.0, f_short=0.001, tage=20)
pruefe("ohne Position: ganzes Konto in der Ernte, sie bekommt Funding", w[-1] > w[1] > 0.99, (w[1], w[-1]))
w_s, _, _ = erster_tag(-1.0, 2.0, f_short=0.001, tage=20)
w_l, _, _ = erster_tag(1.0, 2.0, f_short=0.001, tage=20)
pruefe("Short bekommt Funding auf Position + Ernte, Spot-Long nur nichts", w_s[-1] > w_s[1] and abs(w_l[-1] - w_l[1]) < 1e-12,
       (w_s[-1], w_l[-1]))

# 13) Liquidation: nur der Futures-Teil — Spot-Coins tragen kein Pfand
_, lq, _ = erster_tag(1.5, 2.0, tage=3, l_tief=50.0)
pruefe("Spot 0,5 + Futures-Long 1,0 (Pfand 0,5), Tagestief −50 % → Futures-Teil liquidiert", lq)
_, lq, _ = erster_tag(1.5, 2.0, tage=3, l_tief=60.0)
pruefe("… Tagestief −40 % → noch nicht liquidiert", not lq)
w, lq, _ = erster_tag(1.0, 1.0, tage=3, l_tief=40.0)
pruefe("nur Spot (1×), Tagestief −60 % → nie liquidiert, Konto nach Erholung zurück", not lq and nahe(w[-1], w[1], 1e-9), (lq, w))
_, lq, _ = erster_tag(1.5, 2.0, tage=3, l_tief=50.0, stop_k=3.0)
w_f, lq_f = MK.lauf_hebel([1.5] * 4, [100.0] * 4, [100.0, 100.0, 50.0, 100.0], [100.0] * 4, [0.0] * 4, [0.0] * 4, 1, 4, stop_k=0)
pruefe("Vergleich F-1,5 (ganzes Konto als Pfand) übersteht −50 % — der Futures-Teil von P2 nicht (Pfand-Regel ehrlich)",
       not lq_f and lq, (lq_f, lq))

# 13b) Korrektur nach dem ersten Lauf: Bei festem Kurs darf NIE liquidiert werden. Vorher reservierte der Umbau das Pfand vor den
#      Kosten — Short mit grosser Ernte → Long knapp über 1× (winziger Futures-Long): Gebühren + Ernte-Auflösung drückten das
#      Futures-Konto unter null → «liquidiert» (echt: BTC 6.3.2025 bei 1,75× mit doppelten Kosten)
n = 7
cc = [100.0] * n
w, lq = MK.lauf_p2([-1.0, -1.0, -1.0, 1.002, 1.002, 1.002, 1.002], cc, cc, cc, [0.0] * n, [0.0] * n, 1, n, L=1.75, stop_k=0,
                   gebuehr=0.001, spot_gebuehr=0.002, park_kosten=0.003)
pruefe("Short mit Ernte → Long 1,002× bei 1,75× (doppelte Kosten), Kurs fest → nicht liquidiert", not lq and w[-1] > 0.99, (lq, w))
w, lq = MK.lauf_p2([-1.0, -1.0, -1.0, 1.0001, 1.0001, 1.0001, 1.0001], cc, cc, cc, [0.0] * n, [0.0] * n, 1, n, L=1.75, stop_k=0,
                   park_kosten=0.02)
pruefe("… Long 1,0001× mit hohen Ernte-Kosten (2 %): die Reserve deckt auch das Auflösen der Ernte → nicht liquidiert", not lq,
       (lq, w))
rnd = random.Random(31)
falsch = []
for versuch in range(300):
    L = rnd.choice([1.25, 1.5, 1.75, 2.0, 3.0])
    k = rnd.choice([1, 2, 5])
    n = 40
    zz = [round(rnd.uniform(-1, 1) * L, 3) if rnd.random() < 0.5 else 0.0 for _ in range(n)]
    cc = [100.0] * n
    fl = [rnd.uniform(0, 0.003) for _ in range(n)]
    w, lq = MK.lauf_p2(zz, cc, cc, cc, fl, fl, 1, n, L=L, stop_k=0, gebuehr=MK.GEBUEHR * k, spot_gebuehr=MK.SPOT_GEBUEHR * k,
                       park_kosten=MK.PARK_KOSTEN * k)
    if lq:
        falsch.append((versuch, L, k))
pruefe("300 Zufallsfolgen von Zielen (1,25–3×, Kosten × 1/2/5, Funding bis 0,3 %/Tag), Kurs fest → nie liquidiert", not falsch,
       falsch[:5])

# 14) Prüfstand selbst: P2-1 nie schlechter als «P2» des ersten Prüfstands (gleiches Funding, nur genauere Gebühr beim Wechsel),
#     doppelte Kosten verschlechtern jeden Hebel (Funding-Einnahme nicht × 1,5)
import maxprofit_p2_pruefung as MP2  # noqa: E402

D = fake_daten(seed=21)
a, b = 300, len(D["tage"])
w_neu, _ = MP2.p2l_kurve(D, 1.0, a, b)
w_alt, _ = MP.p2_kurve(D, a, b)
pruefe("P2-1 ≥ «P2» des ersten Prüfstands (gleiche Daten)", w_neu[-1] >= w_alt[-1] - 1e-12 and len(w_neu) == len(w_alt),
       (w_neu[-1], w_alt[-1]))
D_f = fake_daten(seed=22)
for sym in ("BTC", "ETH"):
    D_f["fund"][sym] = ([0.002] * len(D_f["tage"]), [0.002] * len(D_f["tage"]), 0.0)
ok = []
for L in MP2.HEBEL:
    w, _ = MP2.p2l_kurve(D_f, L, a, b)
    wt, _ = MP2.p2l_kurve(D_f, L, a, b, teuer=True)
    ok.append((L, wt[-1] < w[-1], w[-1], wt[-1]))
pruefe("doppelte Kosten verschlechtern Pilot 2.0 bei jedem Hebel (auch bei hohem Funding)", all(x[1] for x in ok), ok)
# «teuer» heisst genau: Gebühren, Schlupf, Ernte-Kosten × 2, Funding der Futures-Longs × 1,5, Funding-Einnahmen unverändert
teile = []
for coin, sym in (("btc", "BTC"), ("eth", "ETH")):
    hh, ll, cc = D_f[coin]
    fl, fs, _ = D_f["fund"][sym]
    w, _ = MK.lauf_p2([1.5 * x for x in D_f["z1"][coin]], hh, ll, cc, [x * 1.5 for x in fl], fs, a, b, L=1.5, gebuehr=0.001,
                      spot_gebuehr=0.002, schlupf=0.002, park_kosten=0.003)
    teile.append(w)
soll_t = MK.mix_taeglich(*teile)
ist_t, _ = MP2.p2l_kurve(D_f, 1.5, a, b, teuer=True)
pruefe("«teuer» = genau doppelte Gebühren/Schlupf/Ernte-Kosten, Futures-Long-Funding × 1,5, Einnahmen gleich",
       max(abs(x - y) for x, y in zip(soll_t, ist_t)) < 1e-12, (soll_t[-1], ist_t[-1]))
# der Hebel kommt im Modell an: Kurs fest, Ziel 0,75 je Coin → bei 2× Ziel 1,5 = Spot 0,5 + Futures-Long 1,0
D_k = fake_daten(seed=23)
for coin in ("btc", "eth"):
    cc = [100.0] * len(D_k["tage"])
    D_k[coin] = (list(cc), list(cc), cc)
    D_k["z1"][coin] = [0.75] * len(cc)
for sym in ("BTC", "ETH"):  # ohne Funding: sonst zehrt es am Konto, und die Anteile wandern bis zum nächsten Nachkauf
    D_k["fund"][sym] = ([0.0] * len(D_k["tage"]), [0.0] * len(D_k["tage"]), 0.0)
info = {}
MP2.p2l_kurve(D_k, 2.0, a, b, info=info)
nt = info["tage"]
pruefe("Prüfstand gibt den Hebel ans Modell: Ziel 0,75 × 2 → Spot 0,5 + Futures-Long 1,0 (Pfand ÷ 2)",
       nahe(info["spot"] / nt, 0.5, 0.01) and nahe(info["perp_long"] / nt, 1.0, 0.01), {k: v / nt for k, v in info.items()})
info = {}
MP2.p2l_kurve(D, 2.0, a, b, info=info)
pruefe("bei 2× läuft ein Teil des Longs über Futures (Signale bis 2× Ziel)", info.get("perp_long", 0) > 0 and info.get("spot", 0) > 0,
       info)

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
