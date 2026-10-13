#!/usr/bin/env python3
"""Rechenkern für den Scalping-Prüfstand (scalping_pruefung.py): Indikatoren, Füll-Regeln, Strategien, Kennzahlen.

Alles kausal: Ein Signal am Schluss von Kerze i nutzt nur Kerzen ≤ i; ausgeführt wird frühestens in Kerze i+1.
Füll-Regeln (streng — im Zweifel zu Ungunsten der Strategie):
  • Limit (Maker): gefüllt nur, wenn der Kurs den Limitpreis um mindestens 1 Tick DURCHSTÖSST (Berühren reicht nicht),
    Füllung zum Limitpreis.
  • Stop (Taker): ausgelöst, wenn die Kerze den Stop erreicht; Füllung zum Stop oder zum schlechteren Eröffnungskurs
    (Kurslücke). Markt: Eröffnungs- bzw. Schlusskurs. Auf jede Taker-Füllung kommt Schlupf.
  • Erreicht eine Kerze Stop UND Ziel, gilt der Stop. In der Einstiegskerze zählt nur der Stop, nie das Ziel.
Rendite je Trade auf den Einsatz (1×, ohne Hebel): Richtung × (Aus/Ein − 1) − Gebühr Ein − Gebühr Aus × Aus/Ein − Funding.
Ein Trade ist (t_ein, t_aus, richtung, preis_ein, preis_aus, art_ein, art_aus) mit Preisen OHNE Schlupf und art "M"/"T".
"""
from __future__ import annotations

import math
import random
from array import array
from bisect import bisect_left, bisect_right
from collections import deque
from datetime import datetime, timedelta, timezone

MINUTE = 60_000
NAN = math.nan


# ───────────────────────── Kerzen ─────────────────────────
def kerzen(zeilen, p=MINUTE):
    """[(t_ms, o, h, l, c, v, taker_kauf_v)] → Spalten-Arrays (sortiert, ohne doppelte Zeiten)."""
    b = {"t": array("q"), "o": array("d"), "h": array("d"), "l": array("d"), "c": array("d"), "v": array("d"),
         "tb": array("d"), "p": p}
    for z in zeilen:
        for k, x in zip(("t", "o", "h", "l", "c", "v", "tb"), z):
            b[k].append(int(x) if k == "t" else float(x))
    return ordnen(b)


def ordnen(b):
    """Nach Zeit sortieren, doppelte Zeiten (erste behalten) entfernen. Schon sortierte Daten bleiben unverändert."""
    T = b["t"]
    if all(T[i] < T[i + 1] for i in range(len(T) - 1)):
        return b
    behalten, letzte = [], None
    for i in sorted(range(len(T)), key=lambda i: (T[i], i)):
        if T[i] != letzte:
            behalten.append(i)
            letzte = T[i]
    return {k: (array(v.typecode, (v[i] for i in behalten)) if isinstance(v, array) else v) for k, v in b.items()}


def buendeln(b, minuten):
    """1m-Kerzen → Kerzen zu `minuten` (nach der Uhr ausgerichtet). Fehlende Minuten verkürzen eine Kerze nur."""
    p = minuten * MINUTE
    out = {"t": array("q"), "o": array("d"), "h": array("d"), "l": array("d"), "c": array("d"), "v": array("d"),
           "tb": array("d"), "p": p}
    T, O, H, L, C, V, TB = b["t"], b["o"], b["h"], b["l"], b["c"], b["v"], b["tb"]
    n, i = len(T), 0
    while i < n:
        g = T[i] - T[i] % p
        hh, ll, vv, bb, j = H[i], L[i], 0.0, 0.0, i
        while j < n and T[j] - T[j] % p == g:
            hh = H[j] if H[j] > hh else hh
            ll = L[j] if L[j] < ll else ll
            vv += V[j]
            bb += TB[j]
            j += 1
        for k, x in zip(("t", "o", "h", "l", "c", "v", "tb"), (g, O[i], hh, ll, C[j - 1], vv, bb)):
            out[k].append(x)
        i = j
    return out


# ───────────────────────── Indikatoren (kausal: Wert bei i nutzt nur ≤ i) ─────────────────────────
def mittel_sd(x, n):
    """Gleitender Mittelwert und Standardabweichung der letzten n Werte bis und mit i (davor NaN)."""
    m, s = array("d", [NAN]) * len(x), array("d", [NAN]) * len(x)
    s1 = s2 = 0.0
    for i, v in enumerate(x):
        s1 += v
        s2 += v * v
        if i >= n:
            w = x[i - n]
            s1 -= w
            s2 -= w * w
        if i >= n - 1:
            if i % 4096 == 0:  # Rundungsfehler der laufenden Summen nie anwachsen lassen
                f = x[i - n + 1:i + 1]
                s1, s2 = sum(f), sum(q * q for q in f)
            mu = s1 / n
            m[i] = mu
            s[i] = math.sqrt(max(0.0, s2 / n - mu * mu))
    return m, s


def _rollend(x, n, groesser):
    out, d = array("d", [NAN]) * len(x), deque()
    for i, v in enumerate(x):
        while d and (x[d[-1]] <= v if groesser else x[d[-1]] >= v):
            d.pop()
        d.append(i)
        if d[0] <= i - n:
            d.popleft()
        if i >= n - 1:
            out[i] = x[d[0]]
    return out


def hoch_n(x, n):
    return _rollend(x, n, True)


def tief_n(x, n):
    return _rollend(x, n, False)


def ema(x, n):
    out, a, e = array("d", [NAN]) * len(x), 2.0 / (n + 1), None
    for i, v in enumerate(x):
        e = v if e is None else e + a * (v - e)
        if i >= n - 1:
            out[i] = e
    return out


def rsi(c, n=2):
    """RSI nach Wilder."""
    out, ag, al = array("d", [NAN]) * len(c), 0.0, 0.0
    for i in range(1, len(c)):
        d = c[i] - c[i - 1]
        g, v = (d, 0.0) if d > 0 else (0.0, -d)
        if i <= n:
            ag += g / n
            al += v / n
            if i < n:
                continue
        else:
            ag = (ag * (n - 1) + g) / n
            al = (al * (n - 1) + v) / n
        out[i] = 50.0 if ag == al == 0 else (100.0 if al == 0 else 100.0 - 100.0 / (1.0 + ag / al))
    return out


def atr(h, l, c, n=14):
    out, a = array("d", [NAN]) * len(c), 0.0
    for i in range(1, len(c)):
        tr = max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1]))
        if i <= n:
            a += tr / n
            if i < n:
                continue
        else:
            a = (a * (n - 1) + tr) / n
        out[i] = a
    return out


# ───────────────────────── Kosten, Funding, Rendite ─────────────────────────
def funding_reihe(paare):
    """[(t_ms, rate)] → (Zeiten auf die Minute gerundet, kumulierte Raten) für schnelle Summen."""
    t, kum = array("q"), array("d", [0.0])
    for z, r in sorted(paare):
        t.append(round(z / MINUTE) * MINUTE)
        kum.append(kum[-1] + r)
    return t, kum


def funding_summe(f, t_ein, t_aus):
    """Summe der Raten mit t_ein < Zeitpunkt ≤ t_aus (Position zu diesem Zeitpunkt offen)."""
    if not f:
        return 0.0
    t, kum = f
    return kum[bisect_right(t, t_aus)] - kum[bisect_right(t, t_ein)]


def brutto(tr):
    return tr[2] * (tr[4] / tr[3] - 1.0)


def netto(tr, kosten, f=None):
    t_ein, t_aus, s, a, b, art_ein, art_aus = tr
    ein = a * (1 + s * kosten["slip"]) if art_ein == "T" else a
    aus = b * (1 - s * kosten["slip"]) if art_aus == "T" else b
    q = aus / ein
    return s * (q - 1.0) - kosten[art_ein] - kosten[art_aus] * q - s * funding_summe(f, t_ein, t_aus)


# ───────────────────────── Strategien ─────────────────────────
def band_abpraller(b, k, tick, n=20, halt=30):
    """S1 Mean-Reversion: Limit an Mitte ± k·σ (gültig 1 Kerze), Ziel Mitte (Limit), Stop gleich weit jenseits, max. halt."""
    T, O, H, L, C, p = b["t"], b["o"], b["h"], b["l"], b["c"], b["p"]
    mitte, sd = mittel_sd(C, n)
    N, tr, i = len(C), [], n - 1
    while i < N - 1:
        s_ = sd[i]
        if not s_ > 0:
            i += 1
            continue
        m = mitte[i]
        unten, oben, j = m - k * s_, m + k * s_, i + 1
        kauf, verk = L[j] < unten - tick, H[j] > oben + tick
        if kauf and verk:  # beide in derselben Kerze: der näher an der Eröffnung zuerst
            if O[j] - unten <= oben - O[j]:
                verk = False
            else:
                kauf = False
        if not (kauf or verk):
            i += 1
            continue
        s = 1 if kauf else -1
        ein = unten if kauf else oben
        stop = ein - s * abs(ein - m)
        aus, x = None, j
        if (s == 1 and L[j] <= stop) or (s == -1 and H[j] >= stop):
            aus = (T[j], min(O[j], stop) if s == 1 else max(O[j], stop), "T")
        else:
            x = j + 1
            while x < N:
                if s == 1 and L[x] <= stop:
                    aus = (T[x], min(O[x], stop), "T")
                elif s == -1 and H[x] >= stop:
                    aus = (T[x], max(O[x], stop), "T")
                elif s == 1 and H[x] > m + tick:
                    aus = (T[x], m, "M")
                elif s == -1 and L[x] < m - tick:
                    aus = (T[x], m, "M")
                elif x - j >= halt:
                    aus = (T[x] + p, C[x], "T")
                if aus:
                    break
                x += 1
        if aus is None:
            break
        tr.append((T[j], aus[0], s, ein, aus[1], "M", aus[2]))
        i = x
    return tr


def ausbruch(b, n, tick, halt_faktor=3):
    """S2 Momentum: Stop-Einstieg über dem n-Hoch / unter dem n-Tief, nachgezogener Stop am (n/2)-Gegenextrem."""
    T, O, H, L, C, p = b["t"], b["o"], b["h"], b["l"], b["c"], b["p"]
    m = max(2, n // 2)
    hh, ll, hm, lm = hoch_n(H, n), tief_n(L, n), hoch_n(H, m), tief_n(L, m)
    N, tr, i = len(C), [], n - 1
    while i < N - 1:
        j = i + 1
        ks, vs = hh[i] + tick, ll[i] - tick
        hoch, tief = H[j] >= ks, L[j] <= vs
        if not (hoch or tief):
            i += 1
            continue
        if hoch and tief:  # beide Richtungen in einer Kerze: schlechtester Fall — Long rein, am Long-Stop raus
            tr.append((T[j], T[j], 1, max(O[j], ks), lm[i] - tick, "T", "T"))
            i = j
            continue
        s = 1 if hoch else -1
        ein = max(O[j], ks) if s == 1 else min(O[j], vs)
        stop = lm[i] - tick if s == 1 else hm[i] + tick
        if (s == 1 and L[j] <= stop) or (s == -1 and H[j] >= stop):  # nach dem Einstieg zurück bis zum Stop
            tr.append((T[j], T[j], s, ein, stop, "T", "T"))
            i = j
            continue
        aus, x = None, j + 1
        while x < N:
            if s == 1 and L[x] <= stop:
                aus = (T[x], min(O[x], stop))
            elif s == -1 and H[x] >= stop:
                aus = (T[x], max(O[x], stop))
            elif x - j >= halt_faktor * n:
                aus = (T[x] + p, C[x])
            if aus:
                break
            stop = max(stop, lm[x] - tick) if s == 1 else min(stop, hm[x] + tick)  # gilt ab Kerze x+1
            x += 1
        if aus is None:
            break
        tr.append((T[j], aus[0], s, ein, aus[1], "T", "T"))
        i = x
    return tr


def rsi2(b, tief, trend, rsi_aus=50.0, halt=12, atr_faktor=2.0):
    """S3 RSI(2)-Extrem (Connors) auf den übergebenen Kerzen: Einstieg zur nächsten Eröffnung, Ausstieg RSI über/unter 50,
    nach `halt` Kerzen oder am Stop (2 × ATR14)."""
    T, O, H, L, C, p = b["t"], b["o"], b["h"], b["l"], b["c"], b["p"]
    r, e, a = rsi(C, 2), ema(C, 200), atr(H, L, C, 14)
    N, tr, i = len(C), [], 200
    while i < N - 1:
        if r[i] != r[i] or a[i] != a[i]:
            i += 1
            continue
        s = 0
        if r[i] < tief and (not trend or C[i] > e[i]):
            s = 1
        elif r[i] > 100 - tief and (not trend or C[i] < e[i]):
            s = -1
        if not s:
            i += 1
            continue
        j = i + 1
        ein, stop, aus, x = O[j], O[j] - s * atr_faktor * a[i], None, j
        while x < N:
            if s == 1 and L[x] <= stop:
                aus = (T[x], min(O[x], stop))
            elif s == -1 and H[x] >= stop:
                aus = (T[x], max(O[x], stop))
            elif x - j + 1 >= halt:  # Zeitausstieg ist im Voraus bekannt → zum Schluss dieser Kerze
                aus = (T[x] + p, C[x])
            elif ((s == 1 and r[x] > rsi_aus) or (s == -1 and r[x] < rsi_aus)) and x + 1 < N:
                x += 1  # RSI ist erst am Schluss bekannt → ausgeführt zur NÄCHSTEN Eröffnung
                aus = (T[x], O[x])
            if aus:
                break
            x += 1
        if aus is None:
            break
        tr.append((T[j], aus[0], s, ein, aus[1], "T", "T"))
        i = x
    return tr


def fluss_folgen(b, m, halten, z_schwelle=3.0, fenster=1440):
    """S4 Order-Flow: Taker-Kauf-Überhang der letzten m Kerzen extrem (z > 3 gegenüber dem Vortag) → mitgehen, halten Kerzen."""
    T, O, C, V, TB, p = b["t"], b["o"], b["c"], b["v"], b["tb"], b["p"]
    N = len(C)
    imb, sv, sb = array("d", [0.0]) * N, 0.0, 0.0
    for i in range(N):
        sv += V[i]
        sb += TB[i]
        if i >= m:
            sv -= V[i - m]
            sb -= TB[i - m]
        imb[i] = (2 * sb - sv) / sv if sv > 1e-12 and i >= m - 1 else 0.0
    mu, sd = mittel_sd(imb, fenster)
    tr, i = [], fenster + m
    while i < N - halten:
        if not sd[i - 1] > 0:
            i += 1
            continue
        z = (imb[i] - mu[i - 1]) / sd[i - 1]
        s = 1 if z > z_schwelle else -1 if z < -z_schwelle else 0
        if not s:
            i += 1
            continue
        tr.append((T[i + 1], T[i + halten] + p, s, O[i + 1], C[i + halten], "T", "T"))
        i += halten
    return tr


def fluss_umkehr(b, faktor, halten, fluss_min=0.1, fenster=96):
    """S5 Umkehr nach fluss-getriebener Kerze (arXiv 2026): |Rendite| > faktor·σ, Taker-Fluss in dieselbe Richtung → dagegen."""
    T, O, C, V, TB, p = b["t"], b["o"], b["c"], b["v"], b["tb"], b["p"]
    N = len(C)
    r = array("d", [0.0]) * N
    for i in range(1, N):
        r[i] = C[i] / C[i - 1] - 1.0
    _, sd = mittel_sd(r, fenster)
    tr, i = [], fenster + 1
    while i < N - halten:
        f = (2 * TB[i] - V[i]) / V[i] if V[i] > 1e-12 else 0.0
        if sd[i - 1] > 0 and abs(r[i]) > faktor * sd[i - 1] and f * r[i] > 0 and abs(f) > fluss_min:
            s = -1 if r[i] > 0 else 1
            tr.append((T[i + 1], T[i + halten] + p, s, O[i + 1], C[i + halten], "T", "T"))
            i += halten
            continue
        i += 1
    return tr


def _index(T, t):
    i = bisect_left(T, t)
    return i if i < len(T) and T[i] == t else None


def _ny_utc_ms(tag, stunde, minute):
    """New-York-Ortszeit → UTC-ms (Sommerzeit: 2. So im März bis 1. So im November, 2 Uhr)."""
    j = tag.year
    maerz = datetime(j, 3, 8) + timedelta(days=(6 - datetime(j, 3, 8).weekday()) % 7)
    nov = datetime(j, 11, 1) + timedelta(days=(6 - datetime(j, 11, 1).weekday()) % 7)
    lokal = datetime(tag.year, tag.month, tag.day, stunde, minute)
    versatz = 4 if maerz.replace(hour=2) <= lokal < nov.replace(hour=2) else 5
    return int((lokal + timedelta(hours=versatz)).replace(tzinfo=timezone.utc).timestamp() * 1000)


def halbstunde(b, variante):
    """S6 Intraday-Momentum (Shen, Urquhart & Wang 2022): Rendite der ersten halben Stunde → Richtung der letzten.
    "utc": 00:00–00:30 → 23:30–24:00 UTC. "utc_stark": nur wenn |erste| > Median der 30 Vortage. "us": New York
    09:30–10:00 → 15:30–16:00 Ortszeit, Montag–Freitag."""
    T, O, C, p = b["t"], b["o"], b["c"], b["p"]
    tag = datetime.fromtimestamp(T[0] / 1000, timezone.utc).date()
    ende = datetime.fromtimestamp(T[-1] / 1000, timezone.utc).date()
    tr, verlauf = [], []
    while tag <= ende:
        if variante == "us":
            if tag.weekday() >= 5:
                tag += timedelta(days=1)
                continue
            a0, b0 = _ny_utc_ms(tag, 9, 30), _ny_utc_ms(tag, 15, 30)
        else:
            a0 = int(datetime(tag.year, tag.month, tag.day, tzinfo=timezone.utc).timestamp() * 1000)
            b0 = a0 + 23 * 3600_000 + 30 * MINUTE
        ia, iae, ib, ibe = _index(T, a0), _index(T, a0 + 29 * MINUTE), _index(T, b0), _index(T, b0 + 29 * MINUTE)
        tag += timedelta(days=1)
        if None in (ia, iae, ib, ibe):
            continue
        r1 = C[iae] / O[ia] - 1.0
        stark = len(verlauf) >= 30 and abs(r1) > sorted(verlauf[-30:])[15]
        verlauf.append(abs(r1))
        if r1 == 0 or (variante == "utc_stark" and not stark):
            continue
        s = 1 if r1 > 0 else -1
        tr.append((T[ib], T[ibe] + p, s, O[ib], C[ibe], "T", "T"))
    return tr


def stunden_muster(b, q, lern_ende):
    """S7 Tageszeit-Muster: aus den Stundenkerzen VOR lern_ende die q besten Stunden (long) und q schlechtesten (short)
    lernen, dann diese Stunden handeln (zusammenhängende Stunden gleicher Richtung = ein Trade)."""
    T, O, C, p = b["t"], b["o"], b["c"], b["p"]
    summe, anzahl = [0.0] * 24, [0] * 24
    for i in range(len(T)):
        if T[i] < lern_ende:
            st = (T[i] // 3600_000) % 24
            summe[st] += C[i] / O[i] - 1.0
            anzahl[st] += 1
    mittel = sorted(((summe[s] / anzahl[s] if anzahl[s] else 0.0), s) for s in range(24))
    lang = {s for m, s in mittel[-q:] if m > 0}
    kurz = {s for m, s in mittel[:q] if m < 0}
    tr, offen = [], None
    for i in range(len(T)):
        st = (T[i] // 3600_000) % 24
        s = 1 if st in lang else -1 if st in kurz else 0
        if offen and (s != offen[0] or T[i] != offen[3] + p):
            tr.append((T[offen[1]], offen[3] + p, offen[0], O[offen[1]], C[offen[2]], "T", "T"))
            offen = None
        if s:
            offen = (s, offen[1] if offen else i, i, T[i])
    if offen:
        tr.append((T[offen[1]], offen[3] + p, offen[0], O[offen[1]], C[offen[2]], "T", "T"))
    return tr, sorted(lang), sorted(kurz)


# ───────────────────────── Kennzahlen + Zufallsprobe ─────────────────────────
def kennzahlen(trades, kosten, f=None):
    n = len(trades)
    if not n:
        return {"n": 0}
    net = [netto(t, kosten, f) for t in trades]
    br = [brutto(t) for t in trades]
    gew = sum(x for x in net if x > 0)
    verl = -sum(x for x in net if x < 0)
    kum = hoechst = tiefst = 0.0
    for x in net:
        kum += x
        hoechst = max(hoechst, kum)
        tiefst = min(tiefst, kum - hoechst)
    return {"n": n, "treffer": round(sum(x > 0 for x in net) / n, 4), "brutto_bp": round(1e4 * sum(br) / n, 3),
            "netto_bp": round(1e4 * sum(net) / n, 3), "summe_pct": round(100 * sum(net), 2),
            "pf": round(gew / verl, 3) if verl > 0 else None, "einbruch_pct": round(100 * tiefst, 2),
            "dauer_min": round(sum(t[1] - t[0] for t in trades) / n / MINUTE, 1)}


def zufallsprobe(trades, b1, laeufe=200, seed=7):
    """Gleich viele Trades je Monat, gleiche Richtung und Haltedauer, aber zufälliger Zeitpunkt (Eröffnung → Schluss
    auf den Kerzen von b1; Haltedauer in deren Kerzenlänge). → Liste der Brutto-Summen der Zufallskopien."""
    T, O, C, p = b1["t"], b1["o"], b1["c"], b1.get("p", MINUTE)
    monat = {}
    for t in trades:
        d = datetime.fromtimestamp(t[0] / 1000, timezone.utc)
        monat.setdefault((d.year, d.month), []).append((t[2], max(1, round((t[1] - t[0]) / p))))
    bereiche = {}
    for (j, m) in monat:
        a = int(datetime(j, m, 1, tzinfo=timezone.utc).timestamp() * 1000)
        e = int(datetime(j + (m == 12), m % 12 + 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
        bereiche[(j, m)] = (bisect_left(T, a), bisect_left(T, e))
    rnd, out = random.Random(seed), []
    for _ in range(laeufe):
        summe = 0.0
        for key, liste in monat.items():
            lo, hi = bereiche[key]
            for s, d in liste:
                e = rnd.randrange(lo, max(lo + 1, hi - d))
                x = min(len(C) - 1, e + d - 1)
                summe += s * (C[x] / O[e] - 1.0)
        out.append(summe)
    return out
