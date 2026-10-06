#!/usr/bin/env python3
"""KI-Bot-Kern: Experten-Komitee + lernender Gewichter (Hedge) + Online-Logit + Risikosteuerung.

Kausal bis ins Detail: Jeder Wert an Tag i nutzt nur Kurse bis einschliesslich Tag i. Die Position,
die am Schlusskurs von Tag i entsteht, trägt erst die Rendite von Tag i+1. Kein Hebel, kein Short:
die Investitionsquote liegt immer zwischen 0 (Cash) und 1 (voll investiert).

Bausteine
  1. Experten: feste Lehrbuch-Regeln (die neun Stile aus stil_labor.py, Indikator-Regeln wie im
     Backtest-Labor), dazu „Halten", „Cash" und ein lernender Experte (Online-Logit).
  2. Gewichter (Hedge, „Prediction with Expert Advice"): Jeder Experte bekommt täglich seine Rendite
     nach Kosten gutgeschrieben, ältere Tage verblassen (Vergessensfaktor). Das Gewicht ist
     exp(eta * Punktestand). Die Investitionsquote ist der gewichtete Durchschnitt der Experten.
  3. Online-Logit: logistische Regression auf 13 Merkmalen, die nach jedem Tag mit dem echten
     Ergebnis (Kurs gestiegen ja/nein) einen Lernschritt macht. Sie ist ein Experte unter vielen —
     der Gewichter entscheidet, wie viel er ihr glaubt.
  4. Risiko: Volatilitäts-Ziel (keine Position grösser, als die Schwankung erlaubt), Verlust-Bremse
     (ab 20 % unter dem Höchststand halbiert, ab 10 % wieder normal), Umschicht-Band gegen Kosten.

Die Parameter sind VOR jedem Test festgelegt (PARAMETER unten) und werden nicht auf die Daten
optimiert. Die Empfindlichkeit wird im Bericht nur gezeigt, nicht zur Auswahl benutzt.
"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import stil_labor as SL  # noqa: E402  (neun Stile, identisch zum Backtest-Labor)

PARAMETER = {
    "eta": 10.0,          # Lernstärke des Gewichters
    "vergessen": 0.995,   # Punktestand verblasst pro Tag (Halbwertszeit rund 140 Handelstage)
    "logit_lernrate": 0.01,
    "logit_l2": 0.001,
    "logit_rein": 0.52,   # Online-Logit kauft ab dieser Wahrscheinlichkeit für „steigt morgen"
    "logit_raus": 0.48,   # und verkauft darunter (Hysterese gegen Hin und Her)
    "vol_ziel": 0.15,     # höchstens 15 % Jahresschwankung im Depot
    "vol_lambda": 0.94,   # Gewicht der Varianz-Schätzung (RiskMetrics)
    "bremse_ab": -0.20,   # Verlust-Bremse ab 20 % unter dem Höchststand
    "bremse_bis": -0.10,  # Bremse löst sich wieder ab 10 % unter dem Höchststand
    "bremse_faktor": 0.5,
    "band": 0.10,         # erst umschichten, wenn sich die Zielquote um mindestens 10 Prozentpunkte ändert
    "aufwaermen": 260,    # so viele Tage nur lernen, nicht bewerten
}
KOSTEN = 0.001            # 0.1 % pro voller Umschichtung (wie Stil-Labor und Backtest-Labor)


# ───────────── Indikatoren (kausal) ─────────────
def sma(p, n):
    return SL.sma(p, n)


def ema(p, n):
    out, a, s, v = [None] * len(p), 2 / (n + 1), 0.0, None
    for i, x in enumerate(p):
        if v is None:
            s += x
            if i == n - 1:
                v = s / n
                out[i] = v
        else:
            v = a * x + (1 - a) * v
            out[i] = v
    return out


def rsi(p, n=14):
    """RSI nach Wilder (identisch zur Engine im Backtest-Labor)."""
    out, g, l = [None] * len(p), 0.0, 0.0
    for i in range(1, len(p)):
        ch = p[i] - p[i - 1]
        up, dn = max(ch, 0.0), max(-ch, 0.0)
        if i <= n:
            g += up / n
            l += dn / n
            if i < n:
                continue
        else:
            g = (g * (n - 1) + up) / n
            l = (l * (n - 1) + dn) / n
        out[i] = 100.0 if l == 0 else 100 - 100 / (1 + g / l)
    return out


def bollinger(p, n=20, k=2.0):
    mid = sma(p, n)
    up, lo = [None] * len(p), [None] * len(p)
    for i in range(len(p)):
        if mid[i] is None:
            continue
        q = sum((p[j] - mid[i]) ** 2 for j in range(i - n + 1, i + 1)) / n
        sd = math.sqrt(q)
        up[i], lo[i] = mid[i] + k * sd, mid[i] - k * sd
    return mid, up, lo


def stoch(p, n=14):
    out = [None] * len(p)
    for i in range(n - 1, len(p)):
        fenster = p[i - n + 1:i + 1]
        hi, lo = max(fenster), min(fenster)
        out[i] = 50.0 if hi == lo else 100 * (p[i] - lo) / (hi - lo)
    return out


def macd(p, f=12, s=26, sig=9):
    a, b = ema(p, f), ema(p, s)
    m = [a[i] - b[i] if a[i] is not None and b[i] is not None else None for i in range(len(p))]
    # Signallinie: EMA über die gültigen MACD-Werte
    sigl, alpha, v, s_, c = [None] * len(p), 2 / (sig + 1), None, 0.0, 0
    for i, x in enumerate(m):
        if x is None:
            continue
        if v is None:
            s_ += x
            c += 1
            if c == sig:
                v = s_ / sig
                sigl[i] = v
        else:
            v = alpha * x + (1 - alpha) * v
            sigl[i] = v
    return m, sigl


def fib_niveau(p, n, r):
    """Fibonacci-Retracement: Hoch/Tief der letzten n Tage OHNE heute, Niveau = Hoch − (Hoch − Tief) · r."""
    out = [None] * len(p)
    for i in range(n, len(p)):
        fenster = p[i - n:i]
        hi, lo = max(fenster), min(fenster)
        out[i] = hi - (hi - lo) * r
    return out


def zustand(n, rein, raus):
    """Zustandsautomat: rein[i]/raus[i] → Position 0/1."""
    pos, out = 0, []
    for i in range(n):
        if pos == 0 and rein[i]:
            pos = 1
        elif pos == 1 and raus[i]:
            pos = 0
        out.append(pos)
    return out


# ───────────── Experten ─────────────
def experten(p, d, r):
    """Alle festen Experten als Positionsreihen (0/1)."""
    n = len(p)
    ex = {}
    for name, _regel, f in SL.STILE:
        ex[name] = f(p, d, r)
    mid, up, lo = bollinger(p, 20, 2.0)
    ex["Bollinger 20/2"] = zustand(n, [lo[i] is not None and p[i] < lo[i] for i in range(n)],
                                   [mid[i] is not None and p[i] > mid[i] for i in range(n)])
    st = stoch(p, 14)
    ex["Stochastik 14"] = zustand(n, [st[i] is not None and st[i] < 20 for i in range(n)],
                                  [st[i] is not None and st[i] > 80 for i in range(n)])
    rs = rsi(p, 14)
    ex["RSI 14 30/70"] = zustand(n, [rs[i] is not None and rs[i] < 30 for i in range(n)],
                                 [rs[i] is not None and rs[i] > 70 for i in range(n)])
    m, s = macd(p)
    ex["MACD 12/26/9"] = [1 if m[i] is not None and s[i] is not None and m[i] > s[i] else 0 for i in range(n)]
    e12, e26 = ema(p, 12), ema(p, 26)
    ex["EMA 12/26"] = [1 if e12[i] is not None and e26[i] is not None and e12[i] > e26[i] else 0 for i in range(n)]
    f618, f236, s200 = fib_niveau(p, 55, 0.618), fib_niveau(p, 55, 0.236), sma(p, 200)
    trend_ok = [s200[i] is not None and p[i] > s200[i] for i in range(n)]
    ex["Goldener Schnitt 61,8"] = zustand(n, [f618[i] is not None and p[i] < f618[i] and trend_ok[i] for i in range(n)],
                                         [(f236[i] is not None and p[i] > f236[i]) or not trend_ok[i] for i in range(n)])
    ex["Halten"] = [1] * n
    ex["Cash"] = [0] * n
    return ex


# ───────────── Merkmale für den Online-Logit ─────────────
MERKMALE = ["rendite_1", "rendite_5", "rendite_20", "rendite_60", "rendite_120", "abstand_sma50", "abstand_sma200",
            "rsi14", "bollinger_b", "stoch14", "macd_hist", "vol20", "vol_verhaeltnis"]


def merkmale(p, r):
    n = len(p)
    s50, s200 = sma(p, 50), sma(p, 200)
    rs, st = rsi(p, 14), stoch(p, 14)
    mid, up, lo = bollinger(p, 20, 2.0)
    m, sg = macd(p)
    out = [None] * n
    for i in range(n):
        if i < 260 or s200[i] is None or m[i] is None or sg[i] is None or up[i] is None:
            continue
        v20 = math.sqrt(sum(x * x for x in r[i - 19:i + 1]) / 20)
        v250 = math.sqrt(sum(x * x for x in r[i - 249:i + 1]) / 250)
        breite = up[i] - lo[i]
        out[i] = [
            r[i], p[i] / p[i - 5] - 1, p[i] / p[i - 20] - 1, p[i] / p[i - 60] - 1, p[i] / p[i - 120] - 1,
            p[i] / s50[i] - 1, p[i] / s200[i] - 1, rs[i] / 100 - 0.5,
            ((p[i] - lo[i]) / breite - 0.5) if breite > 0 else 0.0, st[i] / 100 - 0.5,
            (m[i] - sg[i]) / p[i], v20 * math.sqrt(252), (v20 / v250 - 1) if v250 > 0 else 0.0,
        ]
    return out


class Standardisierer:
    """Laufender Mittelwert und Varianz (Welford) — nur mit bisher gesehenen Werten."""

    def __init__(self, k):
        self.n, self.m, self.s = 0, [0.0] * k, [0.0] * k

    def lerne(self, x):
        self.n += 1
        for j, v in enumerate(x):
            d = v - self.m[j]
            self.m[j] += d / self.n
            self.s[j] += d * (v - self.m[j])

    def z(self, x):
        if self.n < 2:
            return [0.0] * len(x)
        return [max(-5.0, min(5.0, (v - self.m[j]) / (math.sqrt(self.s[j] / (self.n - 1)) or 1.0))) for j, v in enumerate(x)]


def sigmoid(t):
    if t >= 0:
        return 1 / (1 + math.exp(-t))
    e = math.exp(t)
    return e / (1 + e)


# ───────────── Der Bot ─────────────
def simuliere(p, d, r, kosten=KOSTEN, par=None, mit_logit=True, mit_lernen=True, mit_risiko=True,
              extra_experten=None, nur_experten=None):
    """Lässt den Bot Tag für Tag über die Kursreihe laufen.

    Rückgabe: dict mit quote (Investitionsquote je Tag, gilt ab dem Folgetag), rendite (Tagesrendite
    des Bots nach Kosten), gewichte_letzt, p_auf (Logit-Wahrscheinlichkeit), erklaerung je Tag (knapp).
    mit_lernen=False → alle Experten gleich gewichtet (Komitee ohne KI, für den Vergleich).
    nur_experten=[...] → nur diese Experten (z. B. ["Halten"] für „Halten + Risiko").
    """
    par = dict(PARAMETER, **(par or {}))
    n = len(p)
    ex = experten(p, d, r)
    if extra_experten:
        ex.update(extra_experten)
    if nur_experten is not None:
        ex = {k: ex[k] for k in nur_experten}
    namen = list(ex.keys())

    # Online-Logit als lernender Experte
    p_auf = [None] * n
    if mit_logit and nur_experten is None:
        mm = merkmale(p, r)
        std = Standardisierer(len(MERKMALE))
        w, b = [0.0] * len(MERKMALE), 0.0
        pos, pos_logit, z_gestern = 0, [0] * n, None
        for i in range(n):
            if z_gestern is not None:  # Lernschritt mit dem heute bekannten Ergebnis von gestern
                y = 1.0 if r[i] > 0 else 0.0
                q = sigmoid(sum(a * c for a, c in zip(w, z_gestern)) + b)
                g = y - q
                lr = par["logit_lernrate"]
                w = [a + lr * (g * c - par["logit_l2"] * a) for a, c in zip(w, z_gestern)]
                b += lr * g
                z_gestern = None
            if mm[i] is not None:
                std.lerne(mm[i])
                z = std.z(mm[i])
                q = sigmoid(sum(a * c for a, c in zip(w, z)) + b)
                p_auf[i] = q
                if pos == 0 and q > par["logit_rein"]:
                    pos = 1
                elif pos == 1 and q < par["logit_raus"]:
                    pos = 0
                z_gestern = z
            pos_logit[i] = pos
        ex["KI-Logit"] = pos_logit
        namen.append("KI-Logit")

    punkte = {k: 0.0 for k in namen}
    quote = [0.0] * n
    rendite = [0.0] * n
    var = None
    depot, hoch, bremse = 1.0, 1.0, False
    erklaerung = [None] * n
    gewichte = {k: 1 / len(namen) for k in namen}
    for i in range(n):
        if i >= 1:
            # 1) Ergebnis von heute für den Bot (Position von gestern Abend)
            q_alt = quote[i - 1]
            q_vor = quote[i - 2] if i >= 2 else 0.0
            x = q_alt * r[i] - kosten * abs(q_alt - q_vor)
            rendite[i] = x
            depot *= 1 + x
            hoch = max(hoch, depot)
            # 2) Experten-Punkte: Rendite nach eigenen Kosten, ältere Tage verblassen
            for k in namen:
                pa = ex[k][i - 1]
                pv = ex[k][i - 2] if i >= 2 else 0
                gain = pa * r[i] - (kosten if pa != pv else 0.0)
                punkte[k] = par["vergessen"] * punkte[k] + par["eta"] * gain
            # 3) Varianz-Schätzung für das Volatilitäts-Ziel
            var = r[i] ** 2 if var is None else par["vol_lambda"] * var + (1 - par["vol_lambda"]) * r[i] ** 2
        # Gewichte
        if mit_lernen:
            top = max(punkte.values())
            roh = {k: math.exp(v - top) for k, v in punkte.items()}
            summe = sum(roh.values())
            gewichte = {k: v / summe for k, v in roh.items()}
        ziel = sum(gewichte[k] * ex[k][i] for k in namen)
        # Risiko
        skal, vol = 1.0, None
        if mit_risiko and var is not None and i >= 20:
            vol = math.sqrt(var * 252)
            skal = min(1.0, par["vol_ziel"] / vol) if vol > 0 else 1.0
            dd = depot / hoch - 1
            if not bremse and dd <= par["bremse_ab"]:
                bremse = True
            elif bremse and dd >= par["bremse_bis"]:
                bremse = False
            if bremse:
                skal *= par["bremse_faktor"]
        ziel = max(0.0, min(1.0, ziel * skal))
        alt = quote[i - 1] if i >= 1 else 0.0
        quote[i] = ziel if abs(ziel - alt) >= par["band"] or ziel in (0.0, 1.0) and abs(ziel - alt) > 1e-9 else alt
        erklaerung[i] = (gewichte, p_auf[i], vol, bremse)
    return {"quote": quote, "rendite": rendite, "namen": namen, "experten": ex, "p_auf": p_auf,
            "erklaerung": erklaerung, "gewichte_letzt": gewichte}


# ───────────── Kennzahlen und Zufalls-Vergleich ─────────────
def kennzahlen(x):
    n = len(x)
    if n < 2:
        return {}
    w, sp, dd = 1.0, 1.0, 0.0
    for v in x:
        w *= 1 + v
        sp = max(sp, w)
        dd = min(dd, w / sp - 1)
    m = sum(x) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in x) / (n - 1))
    return {"cagr": (w ** (252 / n) - 1) if w > 0 else -1.0, "vol": sd * math.sqrt(252),
            "sharpe": (m / sd * math.sqrt(252)) if sd else 0.0, "einbruch": dd, "endwert": w}


def tagesrenditen(quote, r, a, b, kosten=KOSTEN):
    out = []
    for i in range(max(a, 1), b):
        q_alt = quote[i - 1]
        q_vor = quote[i - 2] if i >= 2 else 0.0
        out.append(q_alt * r[i] - kosten * abs(q_alt - q_vor))
    return out


def skill_verschiebung(quote, r, a, b, kosten=KOSTEN, n=200, seed=42):
    """Zeit-Verschiebungs-Test: dieselbe Quoten-Reihe, um zufällige Abstände verschoben, gegen dieselben
    Renditen. Erhält Verteilung, Umschichtungen und Gedächtnis der Quote — zerstört nur das Timing.
    Skill = Anteil der Verschiebungen mit schlechterer Sharpe. 50 % = kein Können."""
    seg = quote[a:b]
    L = len(seg)
    if L < 600:
        return None
    ziel = kennzahlen(tagesrenditen(quote, r, a, b, kosten))["sharpe"]
    rnd = random.Random(seed)
    besser = 0
    for _ in range(n):
        k = rnd.randint(252, L - 252)
        verschoben = seg[k:] + seg[:k]
        q = quote[:a] + verschoben + quote[b:]
        if kennzahlen(tagesrenditen(q, r, a, b, kosten))["sharpe"] < ziel:
            besser += 1
    return besser / n
