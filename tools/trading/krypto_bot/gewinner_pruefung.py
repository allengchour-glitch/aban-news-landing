#!/usr/bin/env python3
"""Prüfstand «Top-Krypto traden, Gewinnern folgen» — ehrlich, mit toten Coins.

VORAB FESTGELEGT (vor dem ersten Rechenlauf, nicht nachträglich angepasst):

Daten: Tageskerzen ALLER USDT-Paare von Binance seit 2017, auch abgemeldete (LUNA, FTT …), ohne Stablecoins, Gold- und
Hebel-Token (binance_daten.py). Fehlt ein Coin länger als 5 Tage (Abmeldung, Neulistung unter gleichem Namen), endet sein
Kursverlauf dort; danach zählt er als neuer Coin. Ein gehaltener Coin, der verschwindet, wird zum letzten Kurs verkauft.

Auswahl jeden 7. Tag (Schlusskurs), gehandelt ab dem nächsten Tag, nur mit Daten bis zum Auswahltag:
  Universum  die 20 Coins mit dem höchsten Handelsvolumen der letzten 30 Tage, die mindestens 90 Tage Kurse haben
  G1 «Gewinner folgen»            die 3 mit der höchsten 30-Tage-Rendite, je 1/3, immer investiert
  G2 «Gewinner mit Trendfilter»   wie G1, aber nur Coins mit 30-Tage-Rendite > 0 und Kurs über dem 50-Tage-Schnitt;
                                  freie Plätze bleiben in USDT; liegt Bitcoin unter seinem 150-Tage-Schnitt: alles in USDT
  G3 «Gewinner 90 Tage»           wie G2, aber die 5 mit der höchsten 90-Tage-Rendite, je 1/5
Vergleich: Bitcoin halten · Top 20 gleich verteilt (wöchentlich ausgeglichen) · Bitcoin mit Trend 150 (sonst USDT).
Kosten: 0,1 % Gebühr + 0,05 % Schlupf auf jeden umgeschichteten Betrag. Kein Hebel, kein Short.

Brauchbar ist eine Gewinner-Strategie NUR, wenn BEIDES gilt:
  1) Rendite ÷ schlimmster Einbruch ist besser als bei Bitcoin halten — in beiden Abschnitten (02/2018–2021, 2022–heute).
  2) Zufallsprobe: Sie schlägt mindestens 90 % von 200 Kopien, die statt der Gewinner zufällige Coins aus demselben
     Universum nehmen (gleich viele Plätze, gleiche Filter-Wochen) — gemessen ab 02/2018. Sonst steckt der Erfolg nicht im
     «Gewinner wählen», sondern nur im Krypto-Markt selbst.
Aufruf: python3 tools/trading/krypto_bot/gewinner_pruefung.py   → Tabelle + data/krypto-gewinner-pruefung.json
"""
from __future__ import annotations

import json
import math
import random
import sys
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import binance_daten as BD  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-gewinner-pruefung.json"
KOSTEN = 0.0015
START = "2018-02-01"
ABSCHNITTE = [("2018-02-01", "2022-01-01"), ("2022-01-01", "9999")]
KOPIEN, SKILL_MIN = 200, 0.90
LUECKE = 5


def segmente(reihen):
    """Kursverläufe an Lücken > LUECKE Tage trennen (Neulistung unter altem Namen = neuer Coin)."""
    out = {}
    for sym, r in reihen.items():
        teil, n = [], 1
        for z in r:
            if teil and (date.fromisoformat(z[0]) - date.fromisoformat(teil[-1][0])).days > LUECKE:
                out[f"{sym}#{n}" if n > 1 else sym] = teil
                teil, n = [], n + 1
            teil.append(z)
        if teil:
            out[f"{sym}#{n}" if n > 1 else sym] = teil
    return out


def vorbereiten(reihen):
    """→ (tage, preis{sym: [..]}, volumen{sym: [..]}) auf einem gemeinsamen Tagesraster; None ausserhalb der Handelszeit."""
    alle_tage = sorted({z[0] for r in reihen.values() for z in r})
    tage = []
    d = date.fromisoformat(alle_tage[0])
    while d.isoformat() <= alle_tage[-1]:
        tage.append(d.isoformat())
        d += timedelta(days=1)
    ix = {t: i for i, t in enumerate(tage)}
    preis, vol = {}, {}
    for sym, r in reihen.items():
        p, v = [None] * len(tage), [0.0] * len(tage)
        for t, c, q in r:
            p[ix[t]], v[ix[t]] = c, q
        a, b = ix[r[0][0]], ix[r[-1][0]]
        for i in range(a + 1, b + 1):  # einzelne fehlende Tage innerhalb der Handelszeit: letzter Kurs gilt
            if p[i] is None:
                p[i] = p[i - 1]
        preis[sym], vol[sym] = p, v
    return tage, preis, vol


def auswahl_tage(tage):
    a = tage.index(START)
    return list(range(a, len(tage) - 1, 7))


_UNI = {}


def universum(i, preis, vol, n=20):
    """Top n nach 30-Tage-Volumen am Tag i, nur Coins mit ≥ 90 Tagen Kurs bis i und Kurs am Tag i."""
    if (i, n, id(preis)) in _UNI:
        return _UNI[(i, n, id(preis))]
    kand = []
    for sym, p in preis.items():
        if p[i] is None or i < 90 or p[i - 90] is None:
            continue
        kand.append((sum(vol[sym][i - 29:i + 1]), sym))
    _UNI[(i, n, id(preis))] = [s for _, s in sorted(kand, reverse=True)[:n]]
    return _UNI[(i, n, id(preis))]


def rendite(p, i, n):
    return p[i] / p[i - n] - 1 if i >= n and p[i - n] else None


def schnitt(p, i, n):
    w = p[i - n + 1:i + 1]
    return sum(w) / n if i >= n - 1 and None not in w else None


def ziele(strategie, i, preis, vol, btc="BTCUSDT"):
    """Zielgewichte {sym: Anteil} am Auswahltag i (Rest = USDT) und Anzahl Plätze."""
    uni = universum(i, preis, vol)
    if strategie == "top20":
        return {s: 1 / len(uni) for s in uni}, len(uni)
    if strategie == "btc":
        return {btc: 1.0}, 1
    if strategie == "btc_trend":
        s150 = schnitt(preis[btc], i, 150)
        return ({btc: 1.0} if s150 and preis[btc][i] > s150 else {}), 1
    n_tage, plaetze, filter_an = {"G1": (30, 3, False), "G2": (30, 3, True), "G3": (90, 5, True)}[strategie]
    if filter_an:
        s150 = schnitt(preis[btc], i, 150)
        if not s150 or preis[btc][i] < s150:
            return {}, plaetze
    kand = []
    for s in uni:
        r = rendite(preis[s], i, n_tage)
        if r is None:
            continue
        if filter_an and (r <= 0 or not schnitt(preis[s], i, 50) or preis[s][i] <= schnitt(preis[s], i, 50)):
            continue
        kand.append((r, s))
    gew = [s for _, s in sorted(kand, reverse=True)[:plaetze]]
    return {s: 1 / plaetze for s in gew}, plaetze


def simulieren(plan, tage, preis, a, b):
    """plan: {Auswahltag i: Zielgewichte}. Kontowert täglich von a bis b (Start 1.0). Am Starttag gilt die letzte Auswahl."""
    menge, bar, werte = {}, 1.0, []
    vorher = max((j for j in plan if j <= a), default=None)
    for i in range(a, b):
        wert = bar + sum(m * (preis[s][i] if preis[s][i] is not None else 0.0) for s, m in menge.items())
        # Verschwundene Coins zum letzten Kurs verkaufen
        for s in [s for s in menge if preis[s][i] is None]:
            bar += menge.pop(s) * next(p for p in reversed(preis[s][:i]) if p is not None)
            wert = bar + sum(m * preis[x][i] for x, m in menge.items())
        werte.append(wert)
        if i in plan or (i == a and vorher is not None):
            ziel = plan[i] if i in plan else plan[vorher]
            umsatz = 0.0
            neu = {}
            for s in set(menge) | set(ziel):
                alt_wert = menge.get(s, 0.0) * preis[s][i]
                soll = ziel.get(s, 0.0) * wert
                umsatz += abs(soll - alt_wert)
                if soll > 0:
                    neu[s] = soll / preis[s][i]
            kosten = umsatz * KOSTEN
            faktor = (wert - kosten) / wert if wert > 0 else 0
            menge = {s: m * faktor for s, m in neu.items()}
            bar = (wert - sum(ziel.values()) * wert) * faktor
    return werte


def kennz(w):
    spitze, dd = w[0], 0.0
    for x in w:
        spitze = max(spitze, x)
        dd = min(dd, x / spitze - 1)
    jahre = (len(w) - 1) / 365
    cagr = (w[-1] / w[0]) ** (1 / jahre) - 1 if w[-1] > 0 and jahre > 0 else -1.0
    return {"cagr": cagr, "einbruch": dd, "mar": cagr / abs(dd) if dd < 0 else float("inf"), "ende": w[-1] / w[0]}


def zufalls_plan(echt, i_liste, preis, vol, rnd):
    """Gleich viele besetzte Plätze wie die echte Strategie in jeder Woche, aber zufällige Coins aus dem Universum."""
    plan = {}
    for i in i_liste:
        z = echt[i]
        k = len(z)
        if k == 0:
            plan[i] = {}
            continue
        uni = universum(i, preis, vol)
        anteil = next(iter(z.values()))
        plan[i] = {s: anteil for s in rnd.sample(uni, min(k, len(uni)))}
    return plan


def main():
    roh = BD.alle()
    basen = {s[:-4] for s in roh}
    # Hebel-Token sicher erkennen: XXXUP/XXXDOWN nur, wenn XXX selbst gehandelt wird
    roh = {s: r for s, r in roh.items() if not any(s[:-4].endswith(x) and s[:-4][:-len(x)] in basen for x in ("UP", "DOWN", "BULL", "BEAR"))}
    reihen = segmente(roh)
    tage, preis, vol = vorbereiten(reihen)
    print(f"{len(reihen)} Kursverläufe (davon {sum(1 for s in reihen if '#' in s)} Neulistungen), {tage[0]} bis {tage[-1]}")
    i_liste = auswahl_tage(tage)
    plaene = {name: {i: ziele(name, i, preis, vol)[0] for i in i_liste} for name in ("G1", "G2", "G3", "btc", "top20", "btc_trend")}
    namen = {"G1": "G1 Gewinner folgen (Top 3, 30 T.)", "G2": "G2 Gewinner + Trendfilter", "G3": "G3 Gewinner 90 T. + Filter",
             "btc": "Bitcoin halten", "top20": "Top 20 gleich verteilt", "btc_trend": "Bitcoin mit Trend 150"}
    fenster = []
    for von, bis in ABSCHNITTE:
        a = tage.index(von)
        b = tage.index(bis) if bis in tage else len(tage)
        fenster.append((f"{von[:4]}–{'heute' if bis == '9999' else str(int(bis[:4]) - 1)}", a, b))
    a0 = tage.index(START)
    erg = {"stand": tage[-1], "regel": __doc__.split("Brauchbar")[1].split("Aufruf")[0].strip(), "strategien": {}}
    print(f"\n{'Strategie':36}" + "".join(f"{n:>34}" for n, _, _ in fenster) + f"{'ab 02/2018':>30}")
    for key, name in namen.items():
        zeile, res = f"{name:36}", {}
        for fname, a, b in fenster:
            k = kennz(simulieren(plaene[key], tage, preis, a, b))
            res[fname] = k
            zeile += f"{k['cagr'] * 100:9.1f} %/J {k['einbruch'] * 100:5.0f} % MAR {k['mar']:5.2f}"
        k = kennz(simulieren(plaene[key], tage, preis, a0, len(tage)))
        res["gesamt"] = k
        zeile += f"   ×{k['ende']:7.2f} MAR {k['mar']:5.2f}"
        erg["strategien"][key] = {"name": name, **res}
        print(zeile)
    print("\nZufallsprobe (200 Kopien mit zufälligen Coins statt Gewinnern, gleiche Plätze und Filter-Wochen):")
    rnd = random.Random(11)
    btc = erg["strategien"]["btc"]
    for key in ("G1", "G2", "G3"):
        echt = erg["strategien"][key]["gesamt"]["mar"]
        besser = sum(echt > kennz(simulieren(zufalls_plan(plaene[key], i_liste, preis, vol, rnd), tage, preis, a0, len(tage)))["mar"]
                     for _ in range(KOPIEN))
        skill = besser / KOPIEN
        schlaegt_btc = all(erg["strategien"][key][f]["mar"] > btc[f]["mar"] for f, _, _ in fenster)
        urteil = "BRAUCHBAR" if skill >= SKILL_MIN and schlaegt_btc else "nein"
        erg["strategien"][key].update({"zufall": skill, "schlaegt_btc_alle_abschnitte": schlaegt_btc, "urteil": urteil})
        print(f"  {namen[key]:36} schlägt {skill * 100:3.0f} % der Zufallskopien · besser als Bitcoin halten in allen Abschnitten: "
              f"{'ja' if schlaegt_btc else 'nein'} → {urteil}")
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1, default=lambda x: None if isinstance(x, float) and math.isinf(x) else x) + "\n",
                       encoding="utf-8")


if __name__ == "__main__":
    main()
