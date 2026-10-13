#!/usr/bin/env python3
"""Rechenkern für den Copy-Trading-Prüfstand (copytrading_pruefung.py) — reine Rechnung, kein Netz.

Eingaben sind die öffentlichen Angaben der Binance-Copy-Trading-Seite je Leadtrader («Portfolio»):
  liste:   roi (%), pnl, mdd (%), copierPnl (Summe der heutigen Kopierer, USDT), winRate, sharpRatio, aum
  detail:  startTime (ms, Beginn als Leadtrader), closeLeadCount (früher geschlossene Portfolios), status, tag (z. B.
           HIGH_LEVERAGE), currentCopyCount/maxCopyCount, profitSharingRate (%), description
  leistung je Zeitraum (30D/90D/180D): roi, mdd, copierPnl, winOrders, totalOrder
  kurve:   tägliche kumulierte ROI-Werte (%) der letzten 180 Tage
  positionen: geschlossene Positionen mit closingPnl (USDT) und leverage
"""
from __future__ import annotations

import math

TAG_MS = 86_400_000

# ── VORAB FESTGELEGTER Filter «kopierbar» (13.10.2026, vor dem Laden der Daten) ──
MIN_TAGE = 180            # mindestens ein halbes Jahr als Leadtrader
MAX_NEUSTARTS = 0         # nie ein Portfolio geschlossen und neu angefangen (versteckt frühere Totalverluste)
MAX_MDD = 25.0            # schlimmster Einbruch (180 Tage) höchstens 25 %
MAX_VERLUST_FAKTOR = 10.0  # grösster Einzelverlust höchstens 10 × durchschnittlicher Gewinn (sonst Martingale-Muster)
MIN_POSITIONEN = 30       # sonst zu wenig Geschichte für das Verlust-Muster
VERBOTENE_TAGS = {"HIGH_LEVERAGE"}  # Binance-Kennzeichen für mehr als 20× Hebel


def tage_aktiv(detail, jetzt_ms):
    st = detail.get("startTime")
    return (jetzt_ms - int(st)) / TAG_MS if st else 0.0


def verlust_muster(positionen):
    """Geschlossene Positionen → {n, treffer, mittel_gewinn, mittel_verlust, groesster_verlust, faktor}.
    faktor = grösster Einzelverlust ÷ durchschnittlicher Gewinn (hohe Trefferquote + seltene riesige Verluste = Martingale)."""
    pnl = [float(p.get("closingPnl") or 0) for p in positionen]
    gew = [x for x in pnl if x > 0]
    verl = [x for x in pnl if x < 0]
    mg = sum(gew) / len(gew) if gew else 0.0
    gv = -min(verl) if verl else 0.0
    return {"n": len(pnl), "treffer": round(len(gew) / len(pnl), 4) if pnl else None,
            "mittel_gewinn": round(mg, 4), "mittel_verlust": round(-sum(verl) / len(verl), 4) if verl else 0.0,
            "groesster_verlust": round(gv, 4), "faktor": round(gv / mg, 2) if mg > 0 else (math.inf if gv > 0 else 0.0),
            "max_hebel": max((float(p.get("leverage") or 0) for p in positionen), default=0.0)}


def pruefe_kandidat(t, jetzt_ms):
    """t: {detail, leistung: {30D,90D,180D}, muster}. → (bestanden, [Gründe dagegen])."""
    d, l, gruende = t.get("detail") or {}, t.get("leistung") or {}, []
    if tage_aktiv(d, jetzt_ms) < MIN_TAGE:
        gruende.append(f"erst {tage_aktiv(d, jetzt_ms):.0f} Tage Leadtrader")
    if int(d.get("closeLeadCount") or 0) > MAX_NEUSTARTS:
        gruende.append(f"{d.get('closeLeadCount')} frühere Portfolios geschlossen (Neustart)")
    if d.get("status") != "ACTIVE":
        gruende.append(f"Status {d.get('status')}")
    for zr in ("30D", "90D", "180D"):
        roi = (l.get(zr) or {}).get("roi")
        if roi is None or float(roi) <= 0:
            gruende.append(f"ROI {zr} nicht im Plus")
    mdd = (l.get("180D") or {}).get("mdd")
    if mdd is None or float(mdd) > MAX_MDD:
        gruende.append(f"Einbruch {mdd} % > {MAX_MDD:g} %")
    if float(d.get("copierPnl") or 0) <= 0:
        gruende.append("Kopierer insgesamt im Minus")
    if VERBOTENE_TAGS & set(d.get("tag") or []):
        gruende.append("hoher Hebel (> 20×)")
    m = t.get("muster")
    if m is None or m["n"] < MIN_POSITIONEN:
        gruende.append("zu wenig geschlossene Positionen")
    elif m["faktor"] > MAX_VERLUST_FAKTOR:
        gruende.append(f"grösster Verlust = {m['faktor']:g} × Durchschnittsgewinn (Martingale-Muster)")
    return not gruende, gruende


def rang_korrelation(a, b):
    """Spearman-Rangkorrelation (ohne Bindungs-Korrektur ausser Mittelrängen)."""
    def raenge(x):
        ordnung = sorted(range(len(x)), key=lambda i: x[i])
        r = [0.0] * len(x)
        i = 0
        while i < len(x):
            j = i
            while j + 1 < len(x) and x[ordnung[j + 1]] == x[ordnung[i]]:
                j += 1
            for k in range(i, j + 1):
                r[ordnung[k]] = (i + j) / 2 + 1
            i = j + 1
        return r
    if len(a) < 3:
        return None
    ra, rb = raenge(a), raenge(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    kov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va, vb = sum((x - ma) ** 2 for x in ra), sum((y - mb) ** 2 for y in rb)
    return kov / math.sqrt(va * vb) if va > 0 and vb > 0 else None


def haelften(kurve):
    """Kumulierte ROI-Kurve (%) → (Rendite erste Hälfte, Rendite zweite Hälfte), je als Faktor-Rendite in %.
    Nur Kurven mit mindestens 120 Tagen Daten; ROI als Kapitalfaktor (1 + ROI/100) verkettet."""
    werte = [float(x["value"]) for x in kurve if x.get("value") is not None]
    # führende Nullen = noch nicht aktiv
    while werte and werte[0] == 0:
        werte.pop(0)
    if len(werte) < 120:
        return None
    m = len(werte) // 2
    f0, fm, fe = 1.0, 1 + werte[m - 1] / 100, 1 + werte[-1] / 100
    if fm <= 0:
        return None
    return (100 * (fm / f0 - 1), 100 * (fe / fm - 1))


def kopierer_bilanz(liste, n):
    """Top-n einer Rangliste → Summe der Kopierer-Gewinne und Anteil der Trader, deren Kopierer im Minus sind."""
    top = liste[:n]
    if not top:
        return {"n": 0}
    summe = sum(float(x.get("copierPnl") or 0) for x in top)
    minus = sum(1 for x in top if float(x.get("copierPnl") or 0) < 0)
    return {"n": len(top), "kopierer_summe": round(summe, 2), "anteil_kopierer_minus": round(minus / len(top), 4),
            "median_roi": round(sorted(float(x.get("roi") or 0) for x in top)[len(top) // 2], 2)}
