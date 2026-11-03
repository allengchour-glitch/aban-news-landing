#!/usr/bin/env python3
"""Satellit, Rechenkern (ohne Netz, ohne Dateien, testbar): «Top 10 nach Volumen, Trend je Coin, Bitcoin-Filter».

Das ist EXAKT die Regel, die alle_coins_pruefung.py am 13.10.2026 vorab festgelegt und gemessen hat («TOP10 trend_btc», Trend 50 Tage):
  • Entscheidung jeden 7. Tag (Phase wie im Test: ab 2018-02-01), nur mit abgeschlossenen Tagen bis zum Entscheidungstag;
  • ist Bitcoin nicht über seinem 150-Tage-Schnitt: alles in USDT (kein Coin);
  • sonst: die 10 Coins mit dem höchsten 30-Tage-Volumen (nur Coins mit mindestens 90 Tagen Kursgeschichte), davon die, deren
    Schlusskurs über ihrem 50-Tage-Schnitt liegt, höchstens 10 Plätze à 10 % des Satelliten-Anteils, der Rest bleibt USDT.
ERGEBNIS DES TESTS (data/krypto-alle-coins-pruefung.json): bestand NICHT — ab 2022 rund +18 % pro Jahr bei −38 % schlimmstem
Einbruch, Bitcoin mit Trend 150 allein +28 % bei −28 %. Darum läuft die Regel nur als Experiment: im Schattenkonto auf GitHub und mit
einem kleinen Anteil im TESTNETZ (Spielgeld), nie mit echtem Geld.

Der Satellit handelt KEIN Bitcoin und KEIN Ether (`nur_alt`): beide gehören dem Piloten, und auf einem Futures-Konto im Einweg-Modus gibt
es je Symbol nur EINE Position — der Pilot würde die Satelliten-Position beim Angleichen wieder wegrechnen. Das ist eine Abweichung vom
getesteten Universum (dort waren BTC und ETH Teil der Top 10) und steht überall dabei.
"""
from __future__ import annotations

import math
from datetime import date, timedelta

START = "2018-02-01"         # Phase der Entscheidungstage (wie alle_coins_pruefung.py / gewinner_pruefung.py)
BTC = "BTCUSDT"
AUSSCHLUSS_ALT = frozenset({"BTCUSDT", "ETHUSDT"})
N_TREND = 50                 # vom Test im Lernzeitraum 2018–2021 für TOP10 gewählt
N_BTC = 150
TOP_N = 10
PLAETZE = 10
MIN_HISTORIE = 90            # Tage Kursgeschichte, damit ein Coin ins Universum darf
RUECK = 200                  # so viele Tage reicht das Raster zurück (150 für den Bitcoin-Schnitt + Reserve)
STOP_MIN, STOP_MAX, STOP_STANDARD = 0.04, 0.35, 0.15


def tage_seit_start(tag):
    return (date.fromisoformat(tag) - date.fromisoformat(START)).days


def entscheidungstag(tag):
    """Ist `tag` (JJJJ-MM-TT, abgeschlossener Tag) einer der Entscheidungstage? (Abstand zum 01.02.2018 durch 7 teilbar)"""
    n = tage_seit_start(tag)
    return n >= 0 and n % 7 == 0


def letzter_entscheidungstag(tag):
    """Der jüngste Entscheidungstag am oder vor `tag` (gilt, bis der nächste kommt)."""
    n = tage_seit_start(tag)
    if n < 0:
        raise ValueError("vor dem Start der Regel")
    return (date.fromisoformat(tag) - timedelta(days=n % 7)).isoformat()


def raster(reihe, tag, rueck=RUECK):
    """reihe: [(Tag, Schlusskurs, Quote-Volumen), …] aufsteigend → (Kurse, Volumen), je `rueck` Werte, der letzte gehört zu `tag`.
    Wie gewinner_pruefung.vorbereiten: ausserhalb der Handelszeit None bzw. 0,0; einzelne fehlende Tage innerhalb der Handelszeit
    übernehmen den letzten Kurs (Volumen 0). Ein Coin ohne Wert am Tag `tag` bleibt dort None (er ist dann nicht im Universum)."""
    ende = date.fromisoformat(tag)
    start = ende - timedelta(days=rueck - 1)
    nach_tag = {z[0]: (z[1], z[2]) for z in reihe}
    vor = [z for z in reihe if z[0] < start.isoformat()]
    letzter_tag = max(nach_tag) if nach_tag else None
    p, v = [None] * rueck, [0.0] * rueck
    laufend = vor[-1][1] if vor else None
    for k in range(rueck):
        t = (start + timedelta(days=k)).isoformat()
        if t in nach_tag:
            laufend = nach_tag[t][0]
            p[k], v[k] = nach_tag[t]
        elif laufend is not None and letzter_tag is not None and t <= letzter_tag:
            p[k] = laufend           # Lücke innerhalb der Handelszeit: letzter Kurs gilt, Volumen bleibt 0,0
    return p, v


def schnitt(p, i, n):
    """Mittel der letzten n Schlusskurse bis Index i; None, wenn zu wenig Geschichte oder ein Kurs fehlt."""
    if i < n - 1:
        return None
    w = p[i - n + 1:i + 1]
    return sum(w) / n if None not in w else None


def universum(daten, i, n=TOP_N):
    """Top n nach 30-Tage-Volumen am Index i (nur Coins mit Kurs heute und vor 90 Tagen). Gleichstand: wie sorted(..., reverse=True) im Test."""
    kand = []
    for sym, (p, v) in daten.items():
        if i < MIN_HISTORIE or p[i] is None or p[i - MIN_HISTORIE] is None:
            continue
        kand.append((sum(v[i - 29:i + 1]), sym))
    return [s for _, s in sorted(kand, reverse=True)[:n]]


def ziele(daten, i, nur_alt=False, n_trend=N_TREND):
    """Zielgewichte {Symbol: Anteil} am Index i (Rest = USDT). daten: {Symbol: (Kurse, Volumen)} auf demselben Raster.
    nur_alt: Bitcoin und Ether herausnehmen (der Satellit handelt sie nicht)."""
    if BTC not in daten:
        raise KeyError("Bitcoin-Kurse fehlen — ohne den Bitcoin-Filter wird nicht entschieden")
    p_btc = daten[BTC][0]
    s = schnitt(p_btc, i, N_BTC)
    if not s or p_btc[i] is None or p_btc[i] <= s:
        return {}
    kand = []
    for sym in universum(daten, i):
        m = schnitt(daten[sym][0], i, n_trend)
        if m and daten[sym][0][i] > m:
            kand.append(sym)
    out = {sym: 1 / PLAETZE for sym in kand[:PLAETZE]}
    if nur_alt:
        out = {sym: w for sym, w in out.items() if sym not in AUSSCHLUSS_ALT}
    return out


def entscheiden(reihen, tag, nur_alt=False):
    """Bequemer Einstieg: reihen {Symbol: [(Tag, Schluss, Vol), …]} → Zielgewichte am Entscheidungstag `tag`."""
    daten = {sym: raster(r, tag) for sym, r in reihen.items() if r}
    return ziele(daten, RUECK - 1, nur_alt=nur_alt)


def stopp_anteil(p, i):
    """Abstand des Börsen-Stops als Anteil des Kurses: 3 Tages-Schwankungen (wie der Pilot, pilot_kern.STOP_SIGMA), begrenzt auf
    4 % bis 35 %. Zu wenig Kursgeschichte → 15 %."""
    import pilot_kern as K
    reihe = [x for x in p[max(0, i - 89):i + 1] if x is not None]
    if len(reihe) < 35:
        return STOP_STANDARD
    vol = K.schwankung(reihe)[-1]
    if not vol:
        return STOP_STANDARD
    return min(STOP_MAX, max(STOP_MIN, K.STOP_SIGMA * vol / math.sqrt(365)))
