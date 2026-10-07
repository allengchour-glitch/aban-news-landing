#!/usr/bin/env python3
"""Krypto-Pilot, Rechenkern (ohne Netz, testbar).

Regel (vorab festgelegt, aus futures.py die einzige, die den Zufallstest bestand):
  Richtung: Schlusskurs über dem 200-Tage-Schnitt → long, darunter → short (abschaltbar: nur long).
  Grösse:   Schwankungsziel — Hebel = min(MAX_HEBEL, ZIEL_VOL ÷ Jahresschwankung). Wilder Markt → kleinere Position.
  Lügendetektor: Jeden Tag wird gemessen, ob die Regel in den letzten 730 Tagen besser war als zeitversetzte
                 Kopien ihrer selbst (gleiche Positionen, falsches Timing). Schlägt sie weniger als SKILL_MIN davon,
                 oder lag sie im letzten Jahr mehr als EINBRUCH_MAX im Minus vom Hoch, geht der Pilot flach (0).
  Stop:     Abstand = STOP_SIGMA × Tages-Schwankung × Kurs (als Sicherung an der Börse gegen Crash-Tage).
Alle Werte nur aus abgeschlossenen Tagen; die Entscheidung von Tag i gilt ab Tag i+1.
"""
from __future__ import annotations

import math
import random

ZIEL_VOL = 0.40
MAX_HEBEL = 1.0
HEBEL_HART = 2.0          # nie mehr, egal was eingestellt ist
FENSTER = 730
SKILL_MIN = 0.60
EINBRUCH_MAX = -0.45
STOP_SIGMA = 4.0
GEBUEHR = 0.0005
FUNDING_8H = 0.0001


def sma(p, n):
    o, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            o[i] = s / n
    return o


def schwankung(p):
    """EWMA-Jahresschwankung je Tag (λ 0,94), None in den ersten 30 Tagen."""
    var, o = None, [None] * len(p)
    for i in range(1, len(p)):
        r = p[i] / p[i - 1] - 1
        var = r * r if var is None else 0.94 * var + 0.06 * r * r
        if i >= 30:
            o[i] = math.sqrt(var * 365)
    return o


def roh_hebel(p, short=True, max_hebel=MAX_HEBEL):
    """Ziel-Hebel je Tag OHNE Lügendetektor (positiv long, negativ short)."""
    m = min(abs(max_hebel), HEBEL_HART)
    s200, vol = sma(p, 200), schwankung(p)
    z = []
    for i in range(len(p)):
        if s200[i] is None or vol[i] is None:
            z.append(0.0)
            continue
        richtung = 1.0 if p[i] > s200[i] else (-1.0 if short else 0.0)
        z.append(richtung * min(m, ZIEL_VOL / vol[i]))
    return z


def tagesrenditen(z, p, a, b, funding=FUNDING_8H):
    """Vereinfachte Tagesrenditen der Regel (Gebühr auf Hebeländerung, Funding auf Position). Für den Detektor."""
    out = []
    for i in range(max(a, 1), b):
        h = z[i - 1]
        vor = z[i - 2] if i >= 2 else 0.0
        r = p[i] / p[i - 1] - 1
        out.append(h * r - abs(h - vor) * GEBUEHR - abs(h) * funding * 3 * (1 if h > 0 else -1))
    return out


def sharpe(x):
    if len(x) < 2:
        return 0.0
    m = sum(x) / len(x)
    sd = math.sqrt(sum((v - m) ** 2 for v in x) / (len(x) - 1))
    return m / sd * math.sqrt(365) if sd else 0.0


def einbruch(x):
    w, spitze, dd = 1.0, 1.0, 0.0
    for v in x:
        w *= 1 + v
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1)
    return dd


def detektor(z, p, i, n=100, seed=1):
    """Urteil am Schluss von Tag i, nur mit Daten bis i: (ok, skill, einbruch_1j)."""
    a = i - FENSTER + 1
    if a < 201:
        return True, None, None  # noch zu wenig Vergangenheit: Regel darf laufen (sonst nie Start)
    seg = z[a:i + 1]
    ziel = sharpe(tagesrenditen(z, p, a, i + 1))
    rnd, besser = random.Random(seed + i), 0
    for _ in range(n):
        k = rnd.randrange(30, len(seg) - 30)
        zz = z[:a] + seg[k:] + seg[:k] + z[i + 1:]
        if sharpe(tagesrenditen(zz, p, a, i + 1)) < ziel:
            besser += 1
    skill = besser / n
    dd = einbruch(tagesrenditen(z, p, max(1, i - 364), i + 1))
    return (skill >= SKILL_MIN and dd > EINBRUCH_MAX), skill, dd


def ziel_hebel(p, short=True, max_hebel=MAX_HEBEL, mit_detektor=True, detektor_alle=7):
    """Ziel-Hebel je Tag MIT Lügendetektor. Der Detektor wird alle `detektor_alle` Tage neu bewertet (Rechenzeit)."""
    z = roh_hebel(p, short, max_hebel)
    if not mit_detektor:
        return z, [None] * len(p)
    out, urteile, ok, letzt = [], [], True, None
    for i in range(len(p)):
        if i % detektor_alle == 0 or letzt is None:
            letzt = detektor(z, p, i)
            ok = letzt[0]
        urteile.append(letzt)
        out.append(z[i] if ok else 0.0)
    return out, urteile


def stop_kurs(p, richtung):
    """Stop-Kurs für die aktuelle Position aus der Tages-Schwankung (None ohne Position)."""
    vol = schwankung(p)[-1]
    if not richtung or vol is None:
        return None
    abstand = STOP_SIGMA * vol / math.sqrt(365) * p[-1]
    return p[-1] - abstand if richtung > 0 else p[-1] + abstand
