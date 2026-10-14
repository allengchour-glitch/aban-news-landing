#!/usr/bin/env python3
"""Rechenkern des Max-Profit-Prüfstands (maxprofit_pruefung.py) — reine Funktionen, ohne Netz, getestet in test_maxprofit.py.

  lauf_hebel        Futures-Konto wie pilot_pruefung.lauf (Band, Börsen-Stop, Liquidation über Tagestief/-hoch), aber mit
                    Funding je Tag getrennt für Longs (zahlen f_long) und Shorts (bekommen f_short; negativ = zahlen)
  lauf_p2           Pilot 2.0 mit Hebel L (maxprofit_p2_pruefung.py): Long zuerst über Spot, Rest über Futures-Long; Short über
                    Futures; Pfand je Futures-Position = Volumen ÷ L; freies Geld in der Funding-Ernte
  kelly_hebel       Wachstums-optimaler Hebel einer Tagesrenditen-Reihe: μ / σ² (Kelly für eine skalierte Strategie)
  walk_forward      Hebel je Kalenderjahr — NUR aus den Tagen VOR dem Jahr geschätzt (keine Zukunftsdaten)
  bootstrap_jahre   Zufallsjahre aus echten Tagesrenditen (Blöcke, damit Serien wie Crashs zusammen bleiben)
  kennzahlen        Rendite pro Jahr, schlimmster Einbruch, Rendite ÷ Einbruch
  entscheidung      die VORAB festgelegte Regel (Kopf von maxprofit_pruefung.py)
Keine Anlageberatung."""
from __future__ import annotations

import math
import random

GEBUEHR, SCHLUPF, MARGE_MIN, BAND = 0.0005, 0.001, 0.005, 0.25
SPOT_GEBUEHR, PARK_KOSTEN, KAPITAL_FAKTOR = 0.001, 0.0015, 1.5  # wie pilot2_pruefung / carry_pruefung (Funding-Ernte)


def vol(p):
    """Schwankung pro Jahr (EWMA λ 0,94 der Tagesrenditen, ab Tag 30) — wie pilot_pruefung.vol."""
    var, o = None, [None] * len(p)
    for i in range(1, len(p)):
        r = p[i] / p[i - 1] - 1
        var = r * r if var is None else 0.94 * var + 0.06 * r * r
        if i >= 30:
            o[i] = math.sqrt(var * 365)
    return o


def lauf_hebel(z, h, l, c, f_long, f_short, a, b, stop_k=3.0, gebuehr=GEBUEHR, schlupf=SCHLUPF):
    """Kontowert-Verlauf (Start 1.0) von Tag a bis b: Ziel-Anteil z[i-1] (Vorzeichen = Richtung, Betrag = Hebel), Handel
    am Folgetag, Band 25 %, Börsen-Stop stop_k Tages-Schwankungen vom Vortags-Schluss (Schlupf), Liquidation, sobald das
    Konto über das Tagesextrem unter die Wartungsmarge fällt (dann 0 und Ende). Funding je Tag: Long zahlt f_long[i] × Volumen,
    Short bekommt f_short[i] × Volumen (negativ: zahlt). → (Werte, liquidiert)"""
    v = vol(c)
    E, N, werte = 1.0, 0.0, [1.0]
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > BAND or (ist > 0) != (ziel > 0) or N == 0)):
            neu = ziel * E
            E -= abs(neu - N) * gebuehr
            N = neu
        if N != 0:
            ref = c[i - 1]
            if stop_k and v[i - 1]:
                abstand = stop_k * v[i - 1] / math.sqrt(365) * ref
                stop = ref - abstand if N > 0 else ref + abstand
                if (N > 0 and l[i] <= stop) or (N < 0 and h[i] >= stop):
                    aus = stop * (1 - schlupf) if N > 0 else stop * (1 + schlupf)
                    E += N * (aus / ref - 1) - abs(N) * gebuehr
                    N = 0.0
                    werte.append(max(E, 0.0))
                    if E <= 0:
                        return werte, True
                    continue
            extrem = l[i] if N > 0 else h[i]
            if E + N * (extrem / ref - 1) <= MARGE_MIN * abs(N * extrem / ref):
                werte.append(0.0)
                return werte, True
            E += N * (c[i] / ref - 1) - (N * f_long[i] if N > 0 else N * f_short[i])
            N *= c[i] / ref
        werte.append(E)
    return werte, False


def lauf_p2(z, h, l, c, f_long, f_short, a, b, L=1.0, stop_k=3.0, gebuehr=GEBUEHR, spot_gebuehr=SPOT_GEBUEHR,
            schlupf=SCHLUPF, park_kosten=PARK_KOSTEN, kapital_faktor=KAPITAL_FAKTOR, info=None):
    """Pilot 2.0 mit Hebel L — Kontowert-Verlauf (Start 1.0) von Tag a bis b. z[i-1] = Ziel-Anteil (schon L-fach, Vorzeichen =
    Richtung); Handel am Folgetag, Band 25 %, Börsen-Stop stop_k Tages-Schwankungen (Schlupf) wie lauf_hebel.
      Long:  zuerst über Spot S (Gebühr spot_gebuehr, kein Funding); über Futures-Long P nur, soweit das Pfand nicht reicht
             (zahlt f_long). Short: über Futures P < 0 (bekommt f_short; negativ = zahlt).
      Pfand: jede Futures-Position braucht Volumen ÷ L im Futures-Konto (bei 1× 100 % wie live); Spot-Coins zählen NICHT als Pfand.
             → S ≤ (E' − N/L) ÷ (1 − 1/L), E' = Konto minus die höchstmöglichen Kosten dieses Umbaus (Gebühren + Auflösen der
             Ernte) — so reicht das Pfand auch NACH den Kosten; bis 1× Ziel (und bei L = 1): S = N, ganz über Spot.
      Ernte: freies Geld E − S − |P|/L liegt in der Funding-Ernte (Volumen = frei ÷ kapital_faktor, Kosten park_kosten auf jede
             Änderung — die trägt die Ernte selbst —, Einnahme f_short je Tag).
      Liquidation: nur der Futures-Teil — wenn das Futures-Konto (E − S − Ernte-Kapital) über das Tagesextrem unter die
             Wartungsmarge fällt; gilt vorsichtig als Konto 0 und Ende.
    Korrektur nach dem ersten Lauf mit echten Daten: vorher bekam der Spot beim Umbau ALLES ausser dem Pfand, und Gebühren wie
    Ernte-Kosten gingen danach vom Futures-Konto ab — bei einem winzigen Futures-Long fiel es so unter null, und das Modell
    meldete «liquidiert» (BTC, 6.3.2025, 1,75× teuer), obwohl sich der Kurs kaum bewegte.
    info (dict, optional): summiert je Tag die Anteile am Konto: spot, perp_long, perp_short, park, tage.
    Bei L = 1 und gebuehr = spot_gebuehr rechnet das genau wie pilot2_pruefung.lauf2(modus="P2"); sonst kostet ein Wechsel
    Long ↔ Short je Teil die richtige Gebühr (lauf2 rechnet dort alles zur Spot-Gebühr). → (Werte, liquidiert)"""
    v = vol(c)
    D = 1.0 / L
    E, S, P, park, K, werte = 1.0, 0.0, 0.0, 0.0, 0.0, [1.0]
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        N = S + P
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > BAND or (ist > 0) != (ziel > 0) or N == 0)):
            neu = ziel * E
            if neu <= 0:
                s_neu = 0.0
            elif D >= 1 or neu <= E:  # bis 1× ganz über Spot (kein Futures-Teil, kein Pfand)
                s_neu = min(neu, E)
            else:  # Pfand muss auch nach den Kosten reichen: höchstmögliche Gebühren + ganze Ernte auflösen abziehen
                netto = E - (abs(neu) + abs(S) + abs(P)) * max(gebuehr, spot_gebuehr) - park * park_kosten
                s_neu = max(0.0, min(neu, (netto - neu * D) / (1 - D)))
            p_neu = neu - s_neu
            E -= abs(s_neu - S) * spot_gebuehr + abs(p_neu - P) * gebuehr
            S, P = s_neu, p_neu
        frei = max(0.0, E - S - abs(P) * D)
        soll = frei / kapital_faktor
        kosten = abs(soll - park) * park_kosten
        E -= kosten
        K = max(0.0, frei - kosten)  # Ernte-Kapital — trägt ihre Kosten selbst (reicht es nicht: den Rest das Futures-Konto)
        park = soll
        E += park * f_short[i]
        if info is not None and E > 0:
            for k_, x in (("spot", S), ("perp_long", max(P, 0.0)), ("perp_short", max(-P, 0.0)), ("park", park), ("tage", E)):
                info[k_] = info.get(k_, 0.0) + x / E
        if S != 0 or P != 0:
            ref = c[i - 1]
            N = S + P
            if stop_k and v[i - 1]:
                abstand = stop_k * v[i - 1] / math.sqrt(365) * ref
                stop = ref - abstand if N > 0 else ref + abstand
                if (N > 0 and l[i] <= stop) or (N < 0 and h[i] >= stop):
                    aus = stop * (1 - schlupf) if N > 0 else stop * (1 + schlupf)
                    E += N * (aus / ref - 1) - abs(S) * spot_gebuehr - abs(P) * gebuehr
                    S = P = 0.0
                    werte.append(max(E, 0.0))
                    if E <= 0:
                        return werte, True
                    continue
            if P != 0:
                extrem = l[i] if P > 0 else h[i]
                konto_f = E - S - K  # Futures-Konto inkl. offenem Gewinn — ohne Spot-Coins und Ernte
                if konto_f + P * (extrem / ref - 1) <= MARGE_MIN * abs(P * extrem / ref):
                    werte.append(0.0)
                    return werte, True
            E += N * (c[i] / ref - 1) - (P * f_long[i] if P > 0 else P * f_short[i])
            S *= c[i] / ref
            P *= c[i] / ref
        werte.append(E)
    return werte, False


def mix_taeglich(*kurven, gewichte=None):
    """Konto, das jeden Tag neu auf die Teilkonten aufgeteilt wird (wie live) — wie pilot_pruefung.mix_taeglich."""
    g = gewichte or [1 / len(kurven)] * len(kurven)
    m = [1.0]
    for i in range(1, min(len(k) for k in kurven)):
        m.append(m[-1] * sum(gj * (k[i] / k[i - 1] if k[i - 1] > 0 else 1.0) for gj, k in zip(g, kurven)))
    return m


def renditen(werte):
    """Tagesrenditen einer Kontokurve (ein Teilkonto bei 0 bleibt flach)."""
    return [(werte[i] / werte[i - 1] - 1) if werte[i - 1] > 0 else 0.0 for i in range(1, len(werte))]


def kennzahlen(werte, tage_pro_jahr=365):
    spitze, dd = werte[0], 0.0
    for w in werte:
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1 if spitze > 0 else -1.0)
    jahre = (len(werte) - 1) / tage_pro_jahr
    cagr = (werte[-1] / werte[0]) ** (1 / jahre) - 1 if werte[-1] > 0 and jahre > 0 else -1.0
    return {"cagr": cagr, "einbruch": dd, "mar": cagr / abs(dd) if dd < 0 else float("inf")}


def kelly_hebel(r):
    """Wachstums-optimaler Hebel für eine Strategie mit Tagesrenditen r (die Strategie L-fach skaliert): Wachstum pro Tag
    ≈ L·μ − L²·σ²/2 → Optimum L* = μ / σ². μ ≤ 0 → 0 (dann gar nicht handeln)."""
    n = len(r)
    if n < 2:
        return 0.0
    mu = sum(r) / n
    var = sum((x - mu) ** 2 for x in r) / (n - 1)
    if var <= 0 or mu <= 0:
        return 0.0
    return mu / var


def walk_forward(tage, r, jahre, anteil, hebel_min, hebel_max, ab=0):
    """Hebel je Kalenderjahr: Kelly aus ALLEN Tagesrenditen r[ab:i] VOR dem 1. Januar des Jahres, mal `anteil`
    (¼, ½ … Kelly), begrenzt auf [hebel_min, hebel_max]. tage[i] ist das Datum von r[i]. → {Jahr: Hebel}"""
    out = {}
    for j in jahre:
        bis = next((i for i, t in enumerate(tage) if t >= f"{j}-01-01"), len(tage))
        roh = kelly_hebel(r[ab:bis]) * anteil
        out[j] = min(hebel_max, max(hebel_min, roh))
    return out


def bootstrap_jahre(r, n=10000, laenge=365, block=20, seed=1):
    """n Zufallsjahre aus den Tagesrenditen r: Blöcke von `block` aufeinanderfolgenden Tagen (zufälliger Start, im Kreis),
    aneinandergereiht bis `laenge` Tage. → Liste (Jahresrendite, schlimmster Einbruch im Jahr)."""
    rnd = random.Random(seed)
    m, out = len(r), []
    for _ in range(n):
        w, spitze, dd, tag = 1.0, 1.0, 0.0, 0
        while tag < laenge:
            s = rnd.randrange(m)
            for k in range(min(block, laenge - tag)):
                w *= 1 + r[(s + k) % m]
                if w <= 0:
                    w = 0.0
                spitze = max(spitze, w)
                dd = min(dd, w / spitze - 1 if spitze > 0 else -1.0)
            tag += block
        out.append((w - 1, dd))
    return out


def quantil(xs, q):
    s = sorted(xs)
    if not s:
        return float("nan")
    k = (len(s) - 1) * q
    lo, hi = math.floor(k), math.ceil(k)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def entscheidung(kandidaten, basis, schwelle_pp=0.02):
    """Die VORAB festgelegte Regel (maxprofit_pruefung.py, Kopf). kandidaten: {Name: Ergebnis} mit den Feldern
    liquidiert, p_einbruch60, cagr_oos, cagr_2022, cagr_oos_teuer, hebel_schnitt; basis: Name der 1×-Variante.
    Bestanden hat ein Kandidat, wenn ALLES gilt:
      1) nie liquidiert, 2) P(Einbruch tiefer als −60 % innert eines Zufallsjahres) ≤ 5 %,
      3) Rendite pro Jahr ab 2022 ≥ die der 1×-Variante, 4) mit doppelten Kosten ab 2020 ≥ die der 1×-Variante (ebenfalls teuer).
    Empfehlung = bestandener Kandidat mit der höchsten Rendite pro Jahr ab 2020 (ausserhalb der Schätz-Stichprobe); liegt ein
    bestandener Kandidat mit kleinerem mittlerem Hebel weniger als 2 Prozentpunkte darunter, wird der kleinere genommen.
    Besteht keiner (ausser der Basis), bleibt 1×. → (Empfehlung, {Name: (bestanden, Gründe)})"""
    b = kandidaten[basis]
    urteil = {}
    for name, k in kandidaten.items():
        gruende = []
        if k["liquidiert"]:
            gruende.append("liquidiert")
        if k["p_einbruch60"] > 0.05:
            gruende.append(f"P(Einbruch < −60 %) {k['p_einbruch60'] * 100:.1f} %")
        if k["cagr_2022"] < b["cagr_2022"]:
            gruende.append("ab 2022 schlechter als 1×")
        if k["cagr_oos_teuer"] < b["cagr_oos_teuer"]:
            gruende.append("mit doppelten Kosten schlechter als 1×")
        urteil[name] = (not gruende, gruende)
    ok = [n for n, (b_, _) in urteil.items() if b_]
    if not ok:
        return basis, urteil
    beste = max(ok, key=lambda n: kandidaten[n]["cagr_oos"])
    nah = [n for n in ok if kandidaten[beste]["cagr_oos"] - kandidaten[n]["cagr_oos"] < schwelle_pp]
    return min(nah, key=lambda n: (kandidaten[n]["hebel_schnitt"], -kandidaten[n]["cagr_oos"])), urteil
