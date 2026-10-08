#!/usr/bin/env python3
"""Krypto-Pilot, Rechenkern (ohne Netz, testbar).

Regel (vorab festgelegt, aus futures.py die einzige, die den Zufallstest bestand):
  Richtung: Schlusskurs über dem Trend-Schnitt → long, darunter → short (abschaltbar: nur long).
            Bitcoin 150 Tage, Ethereum 200 Tage (pilot_pruefung.py: 150 war bei BTC auf allen getrennten Abschnitten
            besser, bei ETH nicht — darum je Coin der Wert, der die vorab festgelegte Regel bestand).
  Grösse:   Schwankungsziel — Hebel = min(MAX_HEBEL, ZIEL_VOL ÷ Jahresschwankung). Wilder Markt → kleinere Position.
  Lügendetektor: Jeden Tag wird gemessen, ob die Regel in den letzten 730 Tagen besser war als zeitversetzte
                 Kopien ihrer selbst (gleiche Positionen, falsches Timing). Schlägt sie weniger als SKILL_MIN davon,
                 oder lag sie im letzten Jahr mehr als EINBRUCH_MAX im Minus vom Hoch, gibt es eine WARNUNG.
                 Als Notbremse (flach gehen) kostete er im Test Rendite — darum handelt der Pilot live trotzdem.
  Stop:     Abstand = STOP_SIGMA × Tages-Schwankung × Kurs (als Sicherung an der Börse gegen Crash-Tage).
  MVRV-Bremse: Liegt der Kurs unter dem Einstandswert aller Coins (MVRV < 1, CoinMetrics, Stand Vortag), kein Short —
            die einzige von 13 freien Markt-Infos, die info_pruefung.py bestand (alle 4 Felder besser, Zufallsprobe 93 %).
Alle Werte nur aus abgeschlossenen Tagen; die Entscheidung von Tag i gilt ab Tag i+1.
"""
from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

ZIEL_VOL = 0.40
MAX_HEBEL = 1.0
HEBEL_HART = 2.0          # nie mehr, egal was eingestellt ist
FENSTER = 730
SKILL_MIN = 0.60
EINBRUCH_MAX = -0.45
STOP_SIGMA = 4.0
MVRV_TIEF = 1.0
# Risiko-Stufe (hebel_pruefung.py): 1 = Standard und im Test am besten (Rendite ÷ Einbruch). 1,5 und 2 = alles grösser
# (Schwankungsziel × Stufe, Deckel = Stufe): mehr Rendite, aber Einbrüche bis −51 % bzw. −67 %. Über 2: Konto im Test vernichtet.
STUFEN = (1.0, 1.5, 2.0)
EINSTELLUNGEN = Path(__file__).resolve().parents[3] / "data" / "krypto-einstellungen.json"
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


def risiko(env=None, datei=None):
    """→ {stufe, ziel_vol, max_hebel}. Quelle: KRYPTO_RISIKO, sonst die Cockpit-Einstellung (nur wenn env nicht vorgegeben
    oder eine Datei übergeben wird), sonst 1. Werte werden auf 1 / 1,5 / 2 gerundet — mehr gibt es nicht.
    Altes KRYPTO_MAX_HEBEL ohne Stufe: wirkt wie bisher nur als Deckel."""
    nur_env = env is not None and datei is None
    env = os.environ if env is None else env
    roh = env.get("KRYPTO_RISIKO")
    if not roh and not nur_env:
        try:
            roh = json.loads((datei or EINSTELLUNGEN).read_text(encoding="utf-8")).get("risiko")
        except (OSError, ValueError, AttributeError):
            roh = None
    try:
        s = float(roh) if roh not in (None, "") else None
    except (TypeError, ValueError):
        s = None
    if s is None or s <= 0:
        try:
            deckel = min(HEBEL_HART, max(0.0, float(env.get("KRYPTO_MAX_HEBEL") or "1")))
        except ValueError:
            deckel = 1.0
        return {"stufe": 1.0, "ziel_vol": ZIEL_VOL, "max_hebel": deckel}
    s = min(STUFEN, key=lambda x: abs(x - s))
    return {"stufe": s, "ziel_vol": ZIEL_VOL * s, "max_hebel": min(s, HEBEL_HART)}


def roh_hebel(p, short=True, max_hebel=MAX_HEBEL, n_sma=200, ziel_vol=ZIEL_VOL):
    """Ziel-Hebel je Tag OHNE Lügendetektor (positiv long, negativ short)."""
    m = min(abs(max_hebel), HEBEL_HART)
    s200, vol = sma(p, n_sma), schwankung(p)
    z = []
    for i in range(len(p)):
        if s200[i] is None or vol[i] is None:
            z.append(0.0)
            continue
        richtung = 1.0 if p[i] > s200[i] else (-1.0 if short else 0.0)
        z.append(richtung * min(m, ziel_vol / vol[i]))
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


def ziel_hebel(p, short=True, max_hebel=MAX_HEBEL, mit_detektor=True, detektor_alle=7, n_sma=200):
    """Ziel-Hebel je Tag MIT Lügendetektor. Der Detektor wird alle `detektor_alle` Tage neu bewertet (Rechenzeit)."""
    z = roh_hebel(p, short, max_hebel, n_sma)
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


def mvrv_bremse(hebel, mvrv):
    """Short → 0, wenn MVRV unter MVRV_TIEF liegt. Ohne MVRV-Wert (None) bleibt die Grundregel."""
    return 0.0 if hebel < 0 and mvrv is not None and mvrv < MVRV_TIEF else hebel
