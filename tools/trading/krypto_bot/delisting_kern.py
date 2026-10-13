#!/usr/bin/env python3
"""Rechenkern für den Delisting-Prüfstand (delisting_pruefung.py) — reine Rechnung, kein Netz.

Reihe = {"t": [Startzeit ms], "o": [Eröffnung], "c": [Schluss]} aufsteigend, gleich lange Kerzen (1 Minute oder 1 Stunde).
Funding = [(Zeit ms, Rate), ...]; positive Rate = Long zahlt Short.
"""
from __future__ import annotations

import bisect
import re
import statistics

MINUTE, STUNDE, TAG = 60_000, 3_600_000, 86_400_000

# ── VORAB FESTGELEGT (13.10.2026, vor dem Laden der Kursdaten) ──
VERZOEGERUNGEN = (1, 5, 30)              # Reaktionszeit des Bots in Minuten nach der Veröffentlichung
HALTEN = {"1h": STUNDE, "24h": TAG, "72h": 3 * TAG, "6T": 6 * TAG}
KOSTEN_SHORT = 2 * (0.0005 + 0.002)      # Taker 0,05 % + Schlupf 0,2 % je Seite (dünner Markt im Absturz)
MAX_LUECKE = 10 * MINUTE                 # Einstiegskerze höchstens 10 Minuten nach dem Zielzeitpunkt, sonst kein Handel
PLACEBO_FENSTER = (180 * TAG, 7 * TAG)   # Zufallszeitpunkte 180 bis 7 Tage VOR der Ankündigung
PLACEBO_MIN_STUNDEN = 30 * 24            # mindestens 30 Tage Stundenkerzen im Fenster, sonst zählt das Ereignis nicht
PLACEBO_SAETZE = 200
MIN_EREIGNISSE = 30
SCHWELLE_ZUFALL = 0.95                   # strenger als sonst (0,90), weil 12 Varianten geprüft werden
SCHLIMMSTER_FALL = -0.50                 # kein einzelner Short schlechter als −50 %
HAELFTE_GRENZE_MS = 1719792000000        # 01.07.2024 00:00 UTC: Hälfte 1 = Ankündigungen davor, Hälfte 2 = ab dann
# Stablecoins und verpackte Coins: ihr Kurs hängt an etwas anderem, ein Delisting bewegt ihn kaum
AUSSCHLUSS = {"USDC", "BUSD", "TUSD", "USDP", "PAX", "DAI", "FDUSD", "SUSD", "UST", "USTC", "AEUR", "IDRT", "BIDR", "BKRW",
              "EUR", "GBP", "AUD", "VAI", "XUSD", "USD1", "EURI", "PAXG", "WBTC", "RENBTC", "WBETH"}

TITEL = re.compile(r"^\s*Binance Will Delist (.+?) on (\d{4}-\d{2}-\d{2})\s*$", re.I)
NICHT_SPOT = re.compile(r"perpetual|futures|margin|loan|option|pairs|alpha", re.I)


def ereignisse(artikel, ausschluss=AUSSCHLUSS):
    """Binance-Ankündigungen (Katalog 161) → [{coin, t0, delisting, titel}], eine Zeile je Coin.
    Nur «Binance Will Delist A, B and C on JJJJ-MM-TT» (Spot-Delisting), nicht Futures/Margin/Paare."""
    gesehen, out = set(), []
    for a in artikel:
        titel = (a.get("title") or "").strip()
        m = TITEL.match(titel)
        if not m or NICHT_SPOT.search(titel) or not a.get("releaseDate"):
            continue
        t0 = int(a["releaseDate"])
        for c in re.split(r",|\s+and\s+|\s*&\s*", m.group(1)):
            c = c.strip()
            if not re.fullmatch(r"[A-Z0-9]{1,15}", c) or c in ausschluss or (c, t0) in gesehen:
                continue
            gesehen.add((c, t0))
            out.append({"coin": c, "t0": t0, "delisting": m.group(2), "titel": titel})
    return sorted(out, key=lambda e: (e["t0"], e["coin"]))


def reihe(kerzen):
    """[(Start ms, Eröffnung, Schluss), ...] → Reihe (sortiert, doppelte Startzeiten: die letzte zählt)."""
    d = {int(t): (float(o), float(c)) for t, o, c in kerzen}
    ts = sorted(d)
    return {"t": ts, "o": [d[t][0] for t in ts], "c": [d[t][1] for t in ts]}


def kurs_vor(r, t, laenge=MINUTE):
    """Schluss der letzten Kerze, die bis zum Zeitpunkt t ganz abgeschlossen ist (oder None)."""
    i = bisect.bisect_right(r["t"], t - laenge) - 1
    return r["c"][i] if i >= 0 else None


def handel(r, ziel_ms, dauer_ms, laenge=MINUTE, max_luecke=MAX_LUECKE):
    """Einstieg zur Eröffnung der ersten Kerze, die frühestens bei ziel_ms beginnt (höchstens max_luecke später);
    Ausstieg zum Schluss der letzten Kerze, die vor Einstieg + Dauer beginnt. Endet der Handel vorher (Delisting,
    Abwicklung), zählt der letzte Kurs. → {t_ein, ein, t_aus, aus, vorzeitig} oder None."""
    i = bisect.bisect_left(r["t"], ziel_ms)
    if i >= len(r["t"]) or r["t"][i] - ziel_ms > max_luecke:
        return None
    t_ein = r["t"][i]
    j = bisect.bisect_left(r["t"], t_ein + dauer_ms) - 1
    if r["o"][i] <= 0 or r["c"][j] <= 0:
        return None
    return {"t_ein": t_ein, "ein": r["o"][i], "t_aus": r["t"][j] + laenge, "aus": r["c"][j],
            "vorzeitig": r["t"][j] + laenge < t_ein + dauer_ms - STUNDE}


def kurs_bei(r, t):
    """Letzter bekannter Kurs zum Zeitpunkt t (Schluss der letzten Kerze, die vor t beginnt)."""
    i = bisect.bisect_left(r["t"], t) - 1
    return r["c"][i] if i >= 0 else None


def funding_reihe(liste):
    """[(Zeit ms, Rate), ...] → {"t": [...], "r": [...]} sortiert (für schnelles Suchen)."""
    s = sorted((int(t), float(r)) for t, r in liste)
    return {"t": [t for t, _ in s], "r": [r for _, r in s]}


def short_netto(h, funding=None, r=None, kosten=KOSTEN_SHORT):
    """Netto-Rendite eines Shorts ohne Hebel: Kursgewinn + erhaltenes Funding − Kosten, höchstens −100 % (Liquidation).
    funding = funding_reihe(...); jede Abrechnung in (Einstieg, Ausstieg] zählt, gewichtet mit dem Kurs zu diesem
    Zeitpunkt (der Wert der Position ändert sich)."""
    f = 0.0
    if funding:
        a = bisect.bisect_right(funding["t"], h["t_ein"])
        b = bisect.bisect_right(funding["t"], h["t_aus"])
        for k in range(a, b):
            p = kurs_bei(r, funding["t"][k]) if r is not None else None
            f += funding["r"][k] * (p if p else h["ein"]) / h["ein"]
    return max(1 - h["aus"] / h["ein"] + f - kosten, -1.0)


def ersparnis(h):
    """Wer den Coin hält und beim Einstieg verkauft statt am Ende: gesparter Verlust (positiv = früh verkaufen war besser)."""
    return 1 - h["aus"] / h["ein"]


def zufallszeiten(rng, r_stunde, t0, n, fenster=PLACEBO_FENSTER, mindestens=PLACEBO_MIN_STUNDEN):
    """n zufällige Stunden-Startzeiten 180 bis 7 Tage vor t0, nur wo Stundenkerzen vorliegen (sonst None)."""
    a = bisect.bisect_left(r_stunde["t"], t0 - fenster[0])
    b = bisect.bisect_left(r_stunde["t"], t0 - fenster[1])
    if b - a < mindestens:
        return None
    return [r_stunde["t"][rng.randrange(a, b)] for _ in range(n)]


def zufallsprobe(mittel_strategie, placebo):
    """placebo: je Ereignis eine Liste mit gleich vielen Zufallswerten (Satz k = k-ter Wert jedes Ereignisses).
    → Anteil der Sätze, deren Mittel UNTER dem Mittel der Strategie liegt."""
    if not placebo or mittel_strategie is None:
        return None
    saetze = len(placebo[0])
    mittel = [statistics.fmean(p[k] for p in placebo) for k in range(saetze)]
    return sum(1 for m in mittel if m < mittel_strategie) / saetze


def kennzahlen(x):
    if not x:
        return {"n": 0, "mittel": None, "median": None, "anteil_plus": None, "schlimmster": None}
    return {"n": len(x), "mittel": statistics.fmean(x), "median": statistics.median(x),
            "anteil_plus": sum(1 for v in x if v > 0) / len(x), "schlimmster": min(x)}


def bewerten(werte, zeiten, placebo=None, grenze=HAELFTE_GRENZE_MS):
    """werte/zeiten/placebo je Ereignis in gleicher Reihenfolge → Kennzahlen + bestanden (Regeln im Protokoll)."""
    h1 = [w for w, t in zip(werte, zeiten) if t < grenze]
    h2 = [w for w, t in zip(werte, zeiten) if t >= grenze]
    erg = {"alle": kennzahlen(werte), "h1": kennzahlen(h1), "h2": kennzahlen(h2)}
    erg["zufall"] = zufallsprobe(erg["alle"]["mittel"], placebo)
    erg["placebo_mittel"] = statistics.fmean(statistics.fmean(p) for p in placebo) if placebo else None
    gruende = []
    if len(werte) < MIN_EREIGNISSE:
        gruende.append(f"nur {len(werte)} Ereignisse")
    for name, text in (("h1", "Hälfte 1"), ("h2", "Hälfte 2")):
        k = erg[name]
        if not k["n"] or k["mittel"] <= 0 or k["median"] <= 0:
            gruende.append(f"{text} nicht im Plus")
    if erg["zufall"] is None or erg["zufall"] < SCHWELLE_ZUFALL:
        gruende.append("Zufallsprobe")
    if werte and min(werte) < SCHLIMMSTER_FALL:
        gruende.append("Einzelfall schlechter als −50 %")
    erg["gruende"], erg["bestanden"] = gruende, not gruende
    return erg
