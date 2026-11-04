#!/usr/bin/env python3
"""Tests für das Scalping-Labor (Papier) — ohne Netz, ohne Schlüssel, nur Wegwerf-Ordner und eine simulierte Börse:
python3 tools/trading/krypto_bot/test_scalping_labor.py

Kernstück: die Zustandsmaschine des Labors muss Handel für Handel dasselbe ergeben wie der Prüfstand (scalping_kern.band_abpraller), auch wenn man sie
an jeder beliebigen Stelle anhält und aus der Datei weiterlaufen lässt. Dazu: Nachholen mit falscher Börse, Urteil, Schalter, Sperre, Dateien,
und die Sicherheits-Invarianten (das Labor kann gar keinen Auftrag senden und liest keinen Schlüssel)."""
from __future__ import annotations

import ast
import inspect
import io
import json
import os
import random
import re
import sys
import tempfile
import time
from contextlib import redirect_stdout
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import scalping_kern as K  # noqa: E402
import scalping_labor as L  # noqa: E402

OK, FEHLER = 0, []
MIN = K.MINUTE
START = 1_790_000_000_000 - 1_790_000_000_000 % MIN          # eine Minutengrenze im Herbst 2026


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


# ───────────────────────── Testdaten: Kerzen mit Tick-Raster, Schwankungs-Häufung, Flaute, Ausreisser ─────────────────────────
def reihe(seed, n, tick=0.1, preis=50000.0, luecken=False, flaute=True):
    """[(t, o, h, l, c)] — deterministisch. Preise auf dem Tick-Raster (damit «genau auf der Schwelle» vorkommt), Phasen mit viel und wenig Bewegung,
    flache Strecken (σ = 0), Ausreisser-Kerzen mit langen Dochten (Stop in der Einstiegskerze), optional fehlende Minuten."""
    r = random.Random(seed)
    t, p, vol, rows = START, preis, 1.0, []

    def raster(x):
        return round(x / tick) * tick

    flach_bis = -1
    for i in range(n):
        vol = max(0.15, 0.985 * vol + 0.015 * r.expovariate(1.0) * 1.6)
        if flaute and i % 1500 == 700:
            flach_bis = i + 24
        if i <= flach_bis:
            o = c = h = l = p
        else:
            o = p
            c = raster(o * (1 + r.gauss(0, 0.00045 * vol)))
            docht_o, docht_u = abs(r.gauss(0, 0.00035 * vol)) * o, abs(r.gauss(0, 0.00035 * vol)) * o
            if r.random() < 0.012:                                  # Ausreisser: ein langer Docht
                if r.random() < 0.5:
                    docht_o *= 6
                else:
                    docht_u *= 6
            h, l = raster(max(o, c) + docht_o), raster(min(o, c) - docht_u)
            h, l = max(h, o, c), min(l, o, c)
        rows.append((t, o, h, l, c))
        p = c
        t += MIN * (2 if (luecken and r.random() < 0.01) else 1)
    return rows


def kern_reihe(rows):
    return K.kerzen([(t, o, h, l, c, 0.0, 0.0) for (t, o, h, l, c) in rows])


def maschine(rows, k, tick):
    b, tr = L.neues_band_buch(k), []
    for (t, o, h, l, c) in rows:
        tr += L.kerze(b, tick, t, o, h, l, c)
    return b, tr


# ───────────────────────── 1) Gleichheit mit dem Prüfstand ─────────────────────────
abdeckung = {"sofort": 0, "stop": 0, "ziel": 0, "zeit": 0}
gleich_alle, anzahl_alle, ungleich = True, 0, None
for seed, n, tick, preis, luecken in ((1, 9000, 0.1, 50000.0, False), (2, 9000, 0.01, 2300.0, False), (3, 6000, 0.1, 50000.0, True), (4, 6000, 0.01, 2300.0, True),
                                      (5, 5000, 0.1, 60000.0, False), (6, 5000, 0.01, 3100.0, False)):
    rows = reihe(seed, n, tick, preis, luecken)
    b1 = kern_reihe(rows)
    for k in L.STUFEN:
        ref = K.band_abpraller(b1, k, tick)
        _, mine = maschine(rows, k, tick)
        anzahl_alle += len(ref)
        if ref != mine:
            gleich_alle = False
            ungleich = ungleich or (seed, k, len(ref), len(mine))
        if not luecken:
            for tr in ref:
                d = tr[1] - tr[0]
                if d == 0:
                    abdeckung["sofort"] += 1
                elif tr[6] == "M":
                    abdeckung["ziel"] += 1
                elif d == (L.HALT + 1) * MIN:
                    abdeckung["zeit"] += 1
                else:
                    abdeckung["stop"] += 1
pruefe("Gleichheit: auf 6 Zufallsreihen (Raster, Flaute, Ausreisser, fehlende Minuten, BTC- und ETH-Tick) ergibt die Maschine für alle 4 Stufen Handel für Handel dasselbe wie der Prüfstand",
       gleich_alle, ungleich)
pruefe("Gleichheit: der Vergleich ist nicht leer (genug Handel)", anzahl_alle > 1500, anzahl_alle)
pruefe("Gleichheit: alle Ausgänge kommen vor (Stop in der Einstiegskerze, späterer Stop, Ziel, Zeit-Stop) — der Test deckt jeden Zweig ab", all(v >= 20 for v in abdeckung.values()), abdeckung)

# Randfälle: zu kurze Reihe, flache Reihe, genau n Kerzen, eine Kerze mehr
for n_k in (0, 1, 19, 20, 21, 22, 60):
    rows = reihe(7, n_k, 0.1, 50000.0)
    ref = K.band_abpraller(kern_reihe(rows), 2.0, 0.1) if rows else []
    _, mine = maschine(rows, 2.0, 0.1)
    pruefe(f"Randfall: Reihe mit {n_k} Kerzen gleich dem Prüfstand", ref == mine, (ref, mine))
flach = [(START + i * MIN, 100.0, 100.0, 100.0, 100.0) for i in range(300)]
pruefe("Randfall: lauter gleiche Kurse (σ = 0) → kein Handel, kein Absturz", maschine(flach, 2.0, 0.1)[1] == [] and K.band_abpraller(kern_reihe(flach), 2.0, 0.1) == [])

# ein einzelner Ausreisser nach ruhigen Kerzen: Maschine und Prüfstand müssen auch hier gleich sein
basis = [(START + i * MIN, 100.0 + (0.05 if i % 2 else -0.05), 100.1, 99.9, 100.0 + (0.05 if i % 2 else -0.05)) for i in range(30)]
tief = basis + [(START + 30 * MIN, 100.0, 100.0, 90.0, 95.0)]
_, tr_ = maschine(tief, 2.0, 0.1)
ref_ = K.band_abpraller(kern_reihe(tief), 2.0, 0.1)
pruefe("Ausreisser nach ruhigen Kerzen: Maschine und Prüfstand sind gleich", tr_ == ref_, (tr_, ref_))


# ───── Grenzfälle auf dem Raster (exakte Zahlen, Tick 0,5): Berühren füllt NICHT, Durchstossen füllt; ein Stop gilt schon beim Berühren; ein Ziel erst beim Durchstossen
WARM = [(START + i * MIN, c, c, c, c) for i, c in enumerate([100.0, 101.0] * 10)]       # zehnmal 100 und zehnmal 101: Mittel 100,5, σ genau 0,5
T20, T21, T22 = START + 20 * MIN, START + 21 * MIN, START + 22 * MIN


def grenz(name, folge, erwartet, k=2.0, tick=0.5):
    rows = WARM + [(START + (20 + i) * MIN, o, h, l, c) for i, (o, h, l, c) in enumerate(folge)]
    ref = K.band_abpraller(kern_reihe(rows), k, tick)
    _, mine = maschine(rows, k, tick)
    pruefe(f"Grenzfall {name}: Maschine == Prüfstand", mine == ref, (mine, ref))
    pruefe(f"Grenzfall {name}: das von Hand gerechnete Ergebnis", mine == erwartet, (mine, erwartet))


# k = 2 → Kauf-Limit bei 99,5 (füllt unter 99,0), Verkaufs-Limit bei 101,5 (füllt über 102,0); Kauf-Stop 98,5, Verkaufs-Stop 102,5; Ziel 100,5 (± Tick: 101,0 / 100,0)
# Nach dem Berühren folgt eine Kerze, die eine GEFÜLLTE Position sofort am Ziel schliessen würde: nur so unterscheidet sich «nicht gefüllt» von «gefüllt, noch offen»
grenz("Kauf: Berühren der Schwelle füllt nicht", [(100.0, 100.0, 99.0, 100.0), (100.0, 101.25, 100.0, 101.0)], [])
grenz("Kauf: Durchstossen füllt, der Stop wird in der Einstiegskerze schon beim Berühren ausgelöst", [(100.0, 100.0, 98.5, 99.0)], [(T20, T20, 1, 99.5, 98.5, "M", "T")])
grenz("Kauf: Stop wird in einer späteren Kerze beim Berühren ausgelöst", [(100.0, 100.0, 98.75, 99.0), (99.0, 99.0, 98.5, 98.75)], [(T20, T21, 1, 99.5, 98.5, "M", "T")])
grenz("Kauf: Kurslücke unter den Stop → Ausstieg zum schlechteren Eröffnungskurs", [(100.0, 100.0, 98.75, 99.0), (98.0, 98.25, 97.5, 98.0)], [(T20, T21, 1, 99.5, 98.0, "M", "T")])
grenz("Kauf: Ziel erst beim Durchstossen (Berühren von Mittel + Tick reicht nicht)", [(100.0, 100.0, 98.75, 99.0), (99.5, 101.0, 99.5, 100.0), (100.0, 101.25, 100.0, 101.0)], [(T20, T22, 1, 99.5, 100.5, "M", "M")])
grenz("Verkauf: Berühren der Schwelle füllt nicht", [(101.0, 102.0, 101.0, 101.5), (101.0, 101.0, 99.75, 100.0)], [])
grenz("Verkauf: Stop wird in einer späteren Kerze beim Berühren ausgelöst", [(101.0, 102.25, 101.0, 101.5), (101.5, 102.5, 101.0, 102.0)], [(T20, T21, -1, 101.5, 102.5, "M", "T")])
grenz("Verkauf: Ziel erst beim Durchstossen (Berühren von Mittel − Tick reicht nicht)", [(101.0, 102.25, 101.0, 101.5), (101.0, 101.0, 100.0, 100.5), (100.5, 100.5, 99.75, 100.0)], [(T20, T22, -1, 101.5, 100.5, "M", "M")])
grenz("Verkauf: Stop in der Einstiegskerze beim Berühren", [(101.0, 102.5, 101.0, 101.5)], [(T20, T20, -1, 101.5, 102.5, "M", "T")])
grenz("Verkauf: Einstiegskerze öffnet über dem Stop (Kurslücke)", [(103.0, 103.25, 102.75, 103.0)], [(T20, T20, -1, 101.5, 103.0, "M", "T")])
grenz("Verkauf: Kurslücke über den Stop in einer späteren Kerze", [(101.0, 102.25, 101.0, 101.5), (103.0, 103.25, 102.75, 103.0)], [(T20, T21, -1, 101.5, 103.0, "M", "T")])
grenz("Kauf: Einstiegskerze öffnet unter dem Stop (Kurslücke)", [(97.0, 97.5, 96.5, 97.0)], [(T20, T20, 1, 99.5, 97.0, "M", "T")])
grenz("Beide Seiten in einer Kerze, Gleichstand beim Abstand zur Eröffnung → der Kauf zuerst", [(100.5, 102.5, 98.5, 100.5)], [(T20, T20, 1, 99.5, 98.5, "M", "T")])

# das Buch an seinen Grenzen
b_g = L.neues_band_buch(2.0)
for dt, erwartet_nach in ((0, 0), (-1, 1), (1, 0)):
    b_g = L.neues_band_buch(2.0)
    L.buche(b_g, (START + dt, START + MIN, 1, 100.0, 100.5, "M", "M"), L.kosten_von("BTCUSDT"), START)
    pruefe(f"Buch: Handel mit Beginn {dt:+d} ms zum Startzeitpunkt zählt {'als nachgerechnet' if erwartet_nach else 'als live'}", b_g["n_nach"] == erwartet_nach, b_g["n_nach"])
b_g = L.neues_band_buch(2.0)
L.buche(b_g, (START, START + MIN, 1, 100.0, 100.0, "M", "M"), {"M": 0.0, "T": 0.0, "slip": 0.0}, 0)
pruefe("Buch: ein Handel mit Ergebnis genau null ist weder Treffer noch Verlust", b_g["wins"] == 0 and b_g["gew"] == 0 and b_g["verl"] == 0 and b_g["n"] == 1, b_g)
b_g = L.neues_band_buch(2.0)
kosten_b = L.kosten_von("BTCUSDT")
for i in range(L.LETZTE_MAX + 50):
    L.buche(b_g, (START + i * MIN, START + i * MIN + MIN, 1, 100.0, 100.0 + (i % 7) * 0.1, "M", "M"), kosten_b, 0)
pruefe(f"Buch: über {L.LETZTE_MAX} Handel bleiben genau die letzten {L.LETZTE_MAX} (der 51. bis zum 250.), die Summen zählen alle",
       len(b_g["letzte"]) == L.LETZTE_MAX and b_g["letzte"][0][0] == START + 50 * MIN and b_g["letzte"][-1][0] == START + 249 * MIN and b_g["n"] == L.LETZTE_MAX + 50, (len(b_g["letzte"]), b_g["n"]))
pruefe("Anzeige-Zahlen: _de rundet, setzt Komma und echtes Minus, «+» nur auf Wunsch, nie «−0,0»",
       L._de(-9.64) == "−9,6" and L._de(2.0) == "2,0" and L._de(5.26, 1, True) == "+5,3" and L._de(-0.04) == "0,0" and L._de(0, 0, True) == "0" and L._de(-0.04, 1, True) == "0,0" and L._de(1234.5, 0) in ("1234", "1235") and L._de(-7, 0) == "−7")
b_h = L.neues_band_buch(2.0)
b_h["tage"] = {"2026-10-01": [1, 1.0, 1.0, 1]}
pruefe("Hälften: bei nur einem Tag mit Handel gibt es keine zwei Hälften (None, None)", L._haelften(b_h) == (None, None))
b_h["tage"]["2026-10-02"] = [1, -2.0, -2.0, 0]
pruefe("Hälften: zwei Tage → je einer", L._haelften(b_h) == (1.0, -2.0))
b_h["tage"]["2026-10-03"] = [1, 3.0, 3.0, 1]
pruefe("Hälften: drei Tage → der Tag in der Mitte gehört zur zweiten Hälfte", L._haelften(b_h) == (1.0, 1.0))

# ───────────────────────── 2) Anhalten und aus der Datei weiterlaufen (Neustart an jeder Stelle) ─────────────────────────
rows = reihe(11, 700, 0.1, 50000.0, luecken=True)
b_durch, tr_durch = maschine(rows, 2.0, 0.1)
ok_neustart, erster_fehler = True, None
for schnitt in range(1, len(rows)):                                             # Anhalten nach JEDER Kerze, Buch als JSON speichern, laden, weiter
    b = L.neues_band_buch(2.0)
    tr = []
    for (t, o, h, l, c) in rows[:schnitt]:
        tr += L.kerze(b, 0.1, t, o, h, l, c)
    b = json.loads(json.dumps(b))
    for (t, o, h, l, c) in rows[schnitt:]:
        tr += L.kerze(b, 0.1, t, o, h, l, c)
    if tr != tr_durch or json.dumps(b, sort_keys=True) != json.dumps(b_durch, sort_keys=True):
        ok_neustart, erster_fehler = False, schnitt
        break
pruefe("Neustart: an JEDER Stelle angehalten und aus dem JSON fortgesetzt, ist Handel und Buch Bit für Bit gleich dem Durchlauf", ok_neustart, erster_fehler)
lang = reihe(12, 9500, 0.1, 50000.0)
b_l, tr_l = maschine(lang, 3.0, 0.1)
b2 = L.neues_band_buch(3.0)
tr2 = []
for teil in range(0, len(lang), 997):                                           # krumme Stücke über die 4096er Auffrischung hinweg
    for (t, o, h, l, c) in lang[teil:teil + 997]:
        tr2 += L.kerze(b2, 0.1, t, o, h, l, c)
    b2 = json.loads(json.dumps(b2))
pruefe("Neustart: auch über die Auffrischung der laufenden Summen (Kerze 4096, 8192) hinweg Bit für Bit gleich", tr2 == tr_l and b2["s1"] == b_l["s1"] and b2["s2"] == b_l["s2"] and b2["i"] == len(lang))

# ───────────────────────── 3) Kennzahlen == Prüfstand ─────────────────────────
for sym in L.MAERKTE:
    par = L.MAERKTE[sym]
    rows = reihe(21, 9000, par["tick"], 2300.0 if par["tick"] < 0.1 else 50000.0)
    for k in (2.0, 3.5):
        b = L.neues_band_buch(k)
        trades = []
        kosten = L.kosten_von(sym)
        live_ab = rows[4000][0]
        for (t, o, h, l, c) in rows:
            for tr in L.kerze(b, par["tick"], t, o, h, l, c):
                trades.append(tr)
                L.buche(b, tr, kosten, live_ab)
        ref = K.kennzahlen(trades, kosten)
        mine = L.kennzahlen(b)
        pruefe(f"Kennzahlen {sym} k={k}: genau gleich scalping_kern.kennzahlen", ref == mine, (ref, mine))
        pruefe(f"Buch {sym} k={k}: Tageswerte zählen alle Handel, die Netto-Summe stimmt", sum(z[0] for z in b["tage"].values()) == len(trades)
               and abs(sum(z[1] for z in b["tage"].values()) - b["sum_net"]) < 1e-9 and sum(z[3] for z in b["tage"].values()) == b["wins"], (b["n"], len(trades)))
        pruefe(f"Buch {sym} k={k}: nachgerechnet = Handel vor dem Startzeitpunkt", b["n_nach"] == sum(1 for tr in trades if tr[0] < live_ab), (b["n_nach"],))
        pruefe(f"Buch {sym} k={k}: nur die letzten {L.LETZTE_MAX} Einzelhandel bleiben, in Reihenfolge, mit Netto in bp",
               len(b["letzte"]) == min(len(trades), L.LETZTE_MAX) and [z[0] for z in b["letzte"]] == [tr[0] for tr in trades[-L.LETZTE_MAX:]]
               and abs(b["letzte"][-1][6] - round(1e4 * K.netto(trades[-1], kosten), 3)) < 1e-9)
leer = L.neues_band_buch(2.0)
pruefe("Kennzahlen: leeres Buch → nur n = 0", L.kennzahlen(leer) == {"n": 0})
b_t = L.neues_band_buch(2.0)
tr0 = (START, START + 5 * MIN, 1, 100.0, 100.5, "M", "M")
for i in range(L.TAGE_MAX + 5):
    L.buche(b_t, (tr0[0] + i * 86_400_000, tr0[1] + i * 86_400_000) + tr0[2:], L.kosten_von("BTCUSDT"), 0)
pruefe(f"Buch: Tageswerte werden auf die letzten {L.TAGE_MAX} Tage begrenzt, die ältesten fallen weg", len(b_t["tage"]) == L.TAGE_MAX and min(b_t["tage"]) == L._tag(START + 5 * 86_400_000 + 5 * MIN))


# ein Handel über Mitternacht zählt am Tag seines Endes
b_m = L.neues_band_buch(2.0)
tag0 = START - START % 86_400_000 + 86_400_000                                   # 00:00 UTC eines Tages
L.buche(b_m, (tag0 - 2 * MIN, tag0 + 3 * MIN, 1, 100.0, 100.5, "M", "M"), L.kosten_von("BTCUSDT"), 0)
pruefe("Buch: ein Handel über Mitternacht zählt am Tag seines Endes", list(b_m["tage"]) == [L._tag(tag0)] and L._tag(tag0 - 1) != L._tag(tag0), b_m["tage"])
pruefe("Schutz vor laufenden Kerzen: SICHER_MS mindestens 2 Sekunden", L.SICHER_MS >= 2000, L.SICHER_MS)

# ───────────────────────── 4) Kerzen holen mit simulierter Börse ─────────────────────────
class Boerse:
    """Binance-Spiegel aus Kerzenreihen: antwortet auf /api/v3/klines und /api/v3/time wie die echte Schnittstelle (inklusive der noch laufenden Kerze)."""

    def __init__(self, reihen, jetzt):
        self.reihen, self.jetzt, self.aufrufe = reihen, jetzt, []
        self.fehler_bei = None      # Nummer des Kerzen-Aufrufs, ab dem OSError kommt
        self.zeit_fehler = False
        self.nachbearbeiten = None

    def hole(self, pfad):
        self.aufrufe.append(pfad)
        if pfad.startswith("/api/v3/time"):
            if self.zeit_fehler:
                raise OSError("keine Zeit")
            return {"serverTime": self.jetzt}
        q = parse_qs(urlparse(pfad).query)
        n_kerzen = sum(1 for a in self.aufrufe if "klines" in a)
        if self.fehler_bei is not None and n_kerzen >= self.fehler_bei:
            raise OSError("Netz weg")
        sym, start, limit = q["symbol"][0], int(q["startTime"][0]), int(q["limit"][0])
        out = []
        for (t, o, h, l, c) in self.reihen[sym]:
            if t >= start and t <= self.jetzt:
                out.append([t, repr(o), repr(h), repr(l), repr(c), "1.5", t + 59_999, "100", 7, "0.5", "50", "0"])
                if len(out) >= limit:
                    break
        return self.nachbearbeiten(out) if self.nachbearbeiten else out


def serie(n, start=START):
    return [(start + i * MIN, 100.0, 100.5, 99.5, 100.0) for i in range(n)]


jetzt = START + 2600 * MIN + 30_000                      # 30 s nach Beginn der Minute 2600
r2500 = serie(2700)
bo = Boerse({"BTCUSDT": r2500}, jetzt)
kerz, hin = L.holen_kerzen("BTCUSDT", START, jetzt, bo.hole)
pruefe("holen: über mehrere Seiten, lückenlos, ohne die noch laufende Kerze (Minute 2600 beginnt 30 s vor jetzt)", [k[0] for k in kerz] == [START + i * MIN for i in range(2600)] and hin == "", (len(kerz), hin))
pruefe("holen: jede Seite beginnt dort, wo die vorige endete, mit limit = 1000", [parse_qs(urlparse(a).query)["startTime"][0] for a in bo.aufrufe] == [str(START), str(START + 1000 * MIN), str(START + 2000 * MIN)] and "limit=1000" in bo.aufrufe[0], bo.aufrufe)
# Grenze «abgeschlossen»: Schluss genau SICHER_MS vor jetzt zählt noch NICHT, eine Millisekunde früher schon
t_x = START + 10 * MIN
r_x = serie(11)
for schluss_vor, erwartet in ((L.SICHER_MS, 10), (L.SICHER_MS + 1, 11)):
    bo2 = Boerse({"BTCUSDT": r_x}, t_x + 59_999 + schluss_vor)
    kk, _ = L.holen_kerzen("BTCUSDT", START, t_x + 59_999 + schluss_vor, bo2.hole)
    pruefe(f"holen: Kerze mit Schluss {schluss_vor} ms vor jetzt → {erwartet} Kerzen", len(kk) == erwartet, len(kk))
kk, _ = L.holen_kerzen("BTCUSDT", START + 5 * MIN, START + 400 * MIN, Boerse({"BTCUSDT": serie(300)}, START + 400 * MIN).hole)
pruefe("holen: ab einer Startzeit mitten in der Reihe", kk[0][0] == START + 5 * MIN and len(kk) == 295, (kk[0][0] - START, len(kk)))
# genau 1000 Kerzen auf der ersten Seite, danach nichts mehr
bo3 = Boerse({"BTCUSDT": serie(1000)}, START + 5000 * MIN)
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 5000 * MIN, bo3.hole)
pruefe("holen: genau eine volle Seite, die nächste ist leer → 1000 Kerzen, zwei Abfragen", len(kk) == 1000 and len(bo3.aufrufe) == 2 and hin == "", (len(kk), len(bo3.aufrufe)))
# Seitenlimit
bo4 = Boerse({"BTCUSDT": serie(5000)}, START + 9000 * MIN)
kk, _ = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, bo4.hole, max_seiten=2)
pruefe("holen: höchstens max_seiten Seiten je Aufruf (2 × 1000), der nächste Lauf macht weiter", len(kk) == 2000 and len(bo4.aufrufe) == 2, (len(kk), len(bo4.aufrufe)))
# Netzfehler auf der zweiten Seite
bo5 = Boerse({"BTCUSDT": serie(3000)}, START + 9000 * MIN)
bo5.fehler_bei = 2
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, bo5.hole)
pruefe("holen: Netzfehler auf Seite 2 → die 1000 Kerzen von Seite 1 bleiben, Hinweis nennt den Fehler und den Rest", len(kk) == 1000 and "OSError" in hin and "nächste Lauf" in hin, (len(kk), hin))
bo5b = Boerse({"BTCUSDT": serie(10)}, START + 9000 * MIN)
bo5b.fehler_bei = 1
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, bo5b.hole)
pruefe("holen: Fehler schon bei der ersten Seite → leer mit Hinweis, kein Absturz", kk == [] and "BTC" in hin, hin)
# kaputte Antworten
boz = Boerse({"BTCUSDT": serie(50)}, START + 9000 * MIN)
boz.nachbearbeiten = lambda out: out[:10] + [["kaputt"], [None], out[10][:5]] + out[10:]
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, boz.hole)
pruefe("holen: kaputte Zeilen (Text, None, zu kurz) werden übersprungen, alle 50 Kerzen kommen lückenlos", [k[0] for k in kk] == [START + i * MIN for i in range(50)], (len(kk), hin))
pruefe("holen: kaputte Zeilen werden gezählt gemeldet", "3 unplausible" in hin, hin)
bod = Boerse({"BTCUSDT": serie(50)}, START + 9000 * MIN)
bod.nachbearbeiten = lambda out: [[START - MIN, "1", "2", "0.5", "1.5", "1", START - 1, "1", 1, "1", "1", "0"]] + out[:10] + [out[9], out[8]] + out[10:]
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, bod.hole)
pruefe("holen: eine Kerze vor dem Start, doppelte und rückwärtslaufende Zeilen werden übersprungen, die Zeitfolge bleibt streng steigend", [k[0] for k in kk] == [START + i * MIN for i in range(50)] and hin == "", (len(kk), hin))
boy = Boerse({"BTCUSDT": serie(30)}, START + 9000 * MIN)


def schlecht(out):
    out = [list(r) for r in out]
    out[3][2], out[3][3] = "99", "101"                   # Hoch kleiner als Tief
    out[5][1] = "0"                                      # Preis 0
    out[7][4] = "nan"                                    # nicht endlich
    out[9][4] = "150"                                    # Schluss über dem Hoch
    out[11][1] = "200"                                   # Eröffnung über dem Hoch
    return out


boy.nachbearbeiten = schlecht
kk, hin = L.holen_kerzen("BTCUSDT", START, START + 9000 * MIN, boy.hole)
pruefe("holen: unplausible Kerzen (Hoch < Tief, Preis 0, nan, Schluss über dem Hoch, Eröffnung über dem Hoch) fliegen raus: 25 von 30 bleiben", len(kk) == 25 and "5 unplausible" in hin, (len(kk), hin))
kk_nl, hin_nl = L.holen_kerzen("BTCUSDT", START, START + 99 * MIN, lambda p: {"code": -1})
pruefe("holen: eine Antwort, die keine Liste ist, → leer, ohne Hinweis, kein Absturz", kk_nl == [] and hin_nl == "", (kk_nl, hin_nl))
pruefe("server_zeit: Börsenzeit, bei Fehler die lokale Uhr", L.server_zeit(Boerse({}, 123456).hole) == 123456 and L.server_zeit(lambda p: (_ for _ in ()).throw(OSError("x")), lokal=777) == 777
       and L.server_zeit(lambda p: {"serverTime": "kaputt"}, lokal=888) == 888)
jetzt_lokal = L.server_zeit(lambda p: (_ for _ in ()).throw(OSError("x")))
pruefe("server_zeit: ohne Börsenzeit und ohne Vorgabe die Uhr des Rechners", abs(jetzt_lokal - time.time() * 1000) < 5000, jetzt_lokal)

# ───────────────────────── 5) Lauf: Nachholen, Fortsetzen, Pausen ─────────────────────────
def boerse_fuer(n_min, jetzt_extra=30_000, seeds=(31, 32)):
    reihen = {"BTCUSDT": reihe(seeds[0], n_min, 0.1, 50000.0), "ETHUSDT": reihe(seeds[1], n_min, 0.01, 2300.0)}
    return reihen, START + (n_min - 1) * MIN + jetzt_extra


def ohne_zeit(b):
    b = json.loads(json.dumps(b))
    b["letzter_lauf"] = None
    return json.dumps(b, sort_keys=True)


reihen, jetzt_ende = boerse_fuer(4200)
live = jetzt_ende - 700 * MIN                            # das Labor wird 700 Minuten vor dem Ende zum ersten Mal gestartet und rechnet 1500 Minuten zurück (800 davon «nachgerechnet»)
# (a) in einem Zug
b_a = L.neues_buch(live)
erg_a = L.lauf(b_a, Boerse(reihen, jetzt_ende).hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: erster Lauf rechnet 1500 Minuten zurück (daten_ab) und holt beide Märkte", b_a["daten_ab"] == L.rund_minute(jetzt_ende - 1500 * MIN) and erg_a["kerzen"] == {"BTCUSDT": 1500, "ETHUSDT": 1500}, erg_a)
pruefe("Lauf: weiter_ab zeigt auf die Kerze nach der letzten, alle 8 Bücher sind angelegt",
       all(m["weiter_ab"] == m["letzte_kerze"] + MIN for m in b_a["maerkte"].values()) and sum(len(m["buecher"]) for m in b_a["maerkte"].values()) == 8)
pruefe("Lauf: letzter_lauf nennt Kerzen und Trades", b_a["letzter_lauf"]["kerzen"] == 3000 and b_a["letzter_lauf"]["trades"] == sum(erg_a["trades"].values()) > 50, b_a["letzter_lauf"])
# (b) in vielen kleinen Schritten (jedes Mal erreicht «jetzt» eine spätere Minute): muss dasselbe Buch ergeben
b_b = L.neues_buch(live)
bo_b = Boerse(reihen, jetzt_ende)
for schritt, jetzt_s in enumerate(range(jetzt_ende - 1500 * MIN, jetzt_ende + 1, 137 * MIN)):
    bo_b.jetzt = jetzt_s
    L.lauf(b_b, bo_b.hole, jetzt_s, rueckrechnung_min=0)       # 0: der Startpunkt ist der erste «jetzt», gleich dem Startpunkt des Laufs in einem Zug
bo_b.jetzt = jetzt_ende
L.lauf(b_b, bo_b.hole, jetzt_ende, rueckrechnung_min=0)
pruefe("Lauf: in vielen Schritten (alle 137 Minuten) ergibt dasselbe Buch Bit für Bit wie in einem Zug", ohne_zeit(b_a) == ohne_zeit(b_b))
# (c) Kerzen NICHT doppelt: gleicher Lauf nochmals ohne neue Kerzen
vorher = ohne_zeit(b_a)
erg_c = L.lauf(b_a, Boerse(reihen, jetzt_ende).hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: nochmals ohne neue Kerzen → nichts doppelt gezählt", ohne_zeit(b_a) == vorher and erg_c["kerzen"] == {"BTCUSDT": 0, "ETHUSDT": 0} and not erg_c["trades"], erg_c)
# (d) Die Maschine im Lauf == der Prüfstand auf denselben Kerzen
for sym, tick in (("BTCUSDT", 0.1), ("ETHUSDT", 0.01)):
    kerz_sym = [r for r in reihen[sym] if b_a["daten_ab"] <= r[0] <= jetzt_ende]
    kerz_sym = [r for r in kerz_sym if r[0] + 59_999 < jetzt_ende - L.SICHER_MS]
    for k in L.STUFEN:
        ref = K.band_abpraller(kern_reihe(kerz_sym), k, tick)
        bk = b_a["maerkte"][sym]["buecher"][str(k)]
        pruefe(f"Lauf {sym} k={k}: Zahl der Handel gleich dem Prüfstand auf denselben Kerzen", bk["n"] == len(ref), (bk["n"], len(ref)))
        pruefe(f"Lauf {sym} k={k}: Kennzahlen mit den Kosten DIESES Marktes == Prüfstand", bool(ref) and L.kennzahlen(bk) == K.kennzahlen(ref, L.kosten_von(sym)), (L.kennzahlen(bk), K.kennzahlen(ref, L.kosten_von(sym))))
        pruefe(f"Lauf {sym} k={k}: «nachgerechnet» = Handel, die vor dem Start des Labors begannen", bk["n_nach"] == sum(1 for tr in ref if tr[0] < live) and 0 < bk["n_nach"] < bk["n"], (bk["n_nach"], bk["n"]))
# (e) Netzausfall mitten drin: später geht es genau dort weiter
b_e = L.neues_buch(live)
bo_e = Boerse(reihen, jetzt_ende)
bo_e.fehler_bei = 2
erg_e1 = L.lauf(b_e, bo_e.hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: Netz fällt aus → es wird mit dem Geholten weitergerechnet und gemeldet", erg_e1["hinweise"] and sum(erg_e1["kerzen"].values()) < 3000, erg_e1)
bo_e.fehler_bei = None
L.lauf(b_e, bo_e.hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: nach dem Ausfall holt der nächste Lauf alles nach — Buch Bit für Bit gleich einem Lauf ohne Ausfall", ohne_zeit(b_e) == ohne_zeit(b_a))
# (f) erster Lauf ohne Netz, später mit Netz
b_f = L.neues_buch(live)
bo_f = Boerse(reihen, jetzt_ende)
bo_f.fehler_bei = 1
L.lauf(b_f, bo_f.hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: erster Lauf ganz ohne Netz → nichts gerechnet, Startpunkt trotzdem festgehalten", all(m["weiter_ab"] == b_f["daten_ab"] for m in b_f["maerkte"].values()) and b_f["letzter_lauf"]["kerzen"] == 0, b_f["maerkte"])
bo_f.fehler_bei = None
L.lauf(b_f, bo_f.hole, jetzt_ende, rueckrechnung_min=1500)
pruefe("Lauf: danach mit Netz → dasselbe Buch wie ein Lauf ohne Ausfall", ohne_zeit(b_f) == ohne_zeit(b_a))
# (g) lange Pause: neu ansetzen, genau einmal zählen, auch wenn das Netz weiter fehlt
b_g = json.loads(json.dumps(b_a))
n_alt = {sym: b_g["maerkte"][sym]["buecher"]["2.0"]["n"] for sym in L.MAERKTE}
jetzt_spaet = jetzt_ende + (L.MAX_LUECKE_MIN + 100) * MIN
bo_g = Boerse(reihen, jetzt_spaet)
bo_g.fehler_bei = 1
L.lauf(b_g, bo_g.hole, jetzt_spaet, rueckrechnung_min=60)
L.lauf(b_g, bo_g.hole, jetzt_spaet + 5 * MIN, rueckrechnung_min=60)
pruefe("Pause über 30 Tage: Maschine neu angesetzt, die Lücke zählt EINMAL (auch bei weiter fehlendem Netz), die Summen bleiben",
       all(m["luecken"] == 1 for m in b_g["maerkte"].values()) and all(b_g["maerkte"][s]["buecher"]["2.0"]["n"] == n_alt[s] for s in L.MAERKTE)
       and all(b_g["maerkte"][s]["buecher"]["2.0"]["i"] == 0 and b_g["maerkte"][s]["buecher"]["2.0"]["pos"] is None for s in L.MAERKTE), [m["luecken"] for m in b_g["maerkte"].values()])
pruefe("Pause: der Hinweis nennt sie", any("Pause" in h for h in L.lauf(json.loads(json.dumps(b_a)), Boerse(reihen, jetzt_spaet).hole, jetzt_spaet, rueckrechnung_min=60)["hinweise"]))


# (h) ein Fehler MITTEN im Rechnen: die Datei bleibt, wie sie war; die Sperre wird frei; der Fehler kommt heraus (main macht rc 1 daraus)
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    nix = tmp / "nix"
    kw_h = dict(hole=Boerse(reihen, jetzt_ende).hole, datei=tmp / "b.json", env={}, aus_datei=nix, stop=nix, pause=nix, sperr_datei=tmp / "l", jetzt_ms=jetzt_ende)
    L.einmal(**dict(kw_h, jetzt_ms=jetzt_ende - 600 * MIN, hole=Boerse(reihen, jetzt_ende - 600 * MIN).hole))
    vorher_text = (tmp / "b.json").read_text(encoding="utf-8")
    orig_kerze, zaehler = L.kerze, [0]

    def kerze_mit_bug(*a, **k):
        zaehler[0] += 1
        if zaehler[0] > 100:
            raise ZeroDivisionError("Fehler im Rechnen")
        return orig_kerze(*a, **k)
    L.kerze = kerze_mit_bug
    try:
        L.einmal(**kw_h)
        ausgenommen = False
    except ZeroDivisionError:
        ausgenommen = True
    finally:
        L.kerze = orig_kerze
    pruefe("Absturz mitten im Rechnen: die Datei bleibt unverändert, die Sperre ist frei, der Fehler kommt heraus", ausgenommen and (tmp / "b.json").read_text(encoding="utf-8") == vorher_text and not (tmp / "l").exists())
    L.einmal(**kw_h)
    b_neu = L.lesen(tmp / "b.json")[0]
    b_ref = L.neues_buch(b_neu["live_ab"])
    bo_ref = Boerse(reihen, jetzt_ende - 600 * MIN)
    L.lauf(b_ref, bo_ref.hole, jetzt_ende - 600 * MIN)
    bo_ref.jetzt = jetzt_ende
    L.lauf(b_ref, bo_ref.hole, jetzt_ende)
    pruefe("Absturz mitten im Rechnen: der nächste Lauf rechnet dieselben Kerzen sauber nach (Buch gleich einem Lauf ohne Absturz)", ohne_zeit(b_neu) == ohne_zeit(b_ref))

# ───────────────────────── 6) Urteil (vorab festgelegt) ─────────────────────────
def buch_mit(n_btc, n_eth, netto_bp, tage_n, haelften=(1.0, 1.0), k=3.5, eth_netto=None, daten_tage=20.0):
    """Ein Buch mit gesetzten Summen (nur für das Urteil): Handel n, mittleres Netto in bp, Tageswerte so, dass die Hälften das Vorzeichen von `haelften` haben."""
    buch = L.neues_buch(START + int(daten_tage * 86_400_000))
    buch["daten_ab"] = START
    for sym, n, nb in (("BTCUSDT", n_btc, netto_bp), ("ETHUSDT", n_eth, netto_bp if eth_netto is None else eth_netto)):
        m = {"weiter_ab": START + int(daten_tage * 86_400_000) + MIN, "letzte_kerze": START + int(daten_tage * 86_400_000), "luecken": 0, "buecher": {}}
        for kk in L.STUFEN:
            b = L.neues_band_buch(kk)
            if kk == k:
                b["n"] = n
                b["sum_net"] = nb * 1e-4 * n
                b["sum_br"] = b["sum_net"]
                b["wins"] = n // 2
                for i in range(tage_n):
                    wert = (haelften[0] if i < tage_n // 2 else haelften[1])
                    b["tage"][f"2026-10-{i + 1:02d}"] = [1, wert, wert, 1]
            m["buecher"][str(kk)] = b
        buch["maerkte"][sym] = m
    return buch


u = L.urteil(buch_mit(300, 300, 1.5, 20))
pruefe("Urteil: ≥ 14 Tage, ≥ 200 Trades, ≥ +1 bp, beide Hälften positiv, BTC und ETH → bestanden (nur Kandidat)", u["urteil"] == "bestanden" and "nie Echtgeld" in u["text"], u)
pruefe("Urteil: eine Hälfte negativ → durchgefallen", L.urteil(buch_mit(300, 300, 1.5, 20, haelften=(1.0, -0.1)))["urteil"] == "durchgefallen")
pruefe("Urteil: erste Hälfte negativ → durchgefallen", L.urteil(buch_mit(300, 300, 1.5, 20, haelften=(-1.0, 1.0)))["urteil"] == "durchgefallen")
pruefe("Urteil: Netto unter +1 bp (0,99) → durchgefallen", L.urteil(buch_mit(300, 300, 0.99, 20))["urteil"] == "durchgefallen")
pruefe("Urteil: Netto genau +1 bp → bestanden", L.urteil(buch_mit(300, 300, 1.0, 20))["urteil"] == "bestanden", L.urteil(buch_mit(300, 300, 1.0, 20)))
pruefe("Urteil: ETH negativ, BTC gut → durchgefallen (beide Märkte nötig)", L.urteil(buch_mit(300, 300, 2.0, 20, eth_netto=-3.0))["urteil"] == "durchgefallen")
pruefe("Urteil: nur 199 Trades auf einem Markt → zu wenig Daten", L.urteil(buch_mit(300, 199, 2.0, 20))["urteil"] == "zu wenig Daten")
pruefe("Urteil: genau 200 Trades → zählt", L.urteil(buch_mit(200, 200, 2.0, 20))["urteil"] == "bestanden")
pruefe("Urteil: nur 13,9 Tage Daten → zu wenig Daten", L.urteil(buch_mit(300, 300, 2.0, 20, daten_tage=13.9))["urteil"] == "zu wenig Daten")
pruefe("Urteil: genau 14 Tage → zählt", L.urteil(buch_mit(300, 300, 2.0, 20, daten_tage=14.0))["urteil"] == "bestanden")
pruefe("Urteil: nur ein Tag mit Handel (keine zwei Hälften) → durchgefallen, nicht bestanden", L.urteil(buch_mit(300, 300, 2.0, 1))["urteil"] == "durchgefallen")
# dasselbe k auf beiden Märkten: k = 2,0 gut auf BTC, k = 3,5 gut auf ETH → nicht bestanden
mix = buch_mit(300, 300, 2.0, 20, k=2.0)
eth35 = buch_mit(300, 300, 2.0, 20, k=3.5)
mix["maerkte"]["ETHUSDT"] = eth35["maerkte"]["ETHUSDT"]
pruefe("Urteil: gut auf BTC mit k = 2,0 und auf ETH mit k = 3,5 ist NICHT bestanden (dasselbe k nötig)", L.urteil(mix)["urteil"] != "bestanden", L.urteil(mix))
pruefe("Urteil: genau 200 Trades auf beiden Märkten, aber +0,5 bp → durchgefallen (genug Daten)", L.urteil(buch_mit(200, 200, 0.5, 20))["urteil"] == "durchgefallen")
pruefe("Urteil: 199 Trades auf einem Markt, +0,5 bp → zu wenig Daten", L.urteil(buch_mit(199, 200, 0.5, 20))["urteil"] == "zu wenig Daten")
pruefe("Urteil: genau 14 Tage, aber +0,5 bp → durchgefallen (genug Daten)", L.urteil(buch_mit(300, 300, 0.5, 20, daten_tage=14.0))["urteil"] == "durchgefallen")
pruefe("Urteil: 13,9 Tage, +0,5 bp → zu wenig Daten", L.urteil(buch_mit(300, 300, 0.5, 20, daten_tage=13.9))["urteil"] == "zu wenig Daten")
pruefe("Urteil: leeres Buch → zu wenig Daten, ohne Absturz", L.urteil(L.neues_buch(START))["urteil"] == "zu wenig Daten")
pruefe("Urteil: das Ergebnis lässt sich als JSON speichern", json.loads(json.dumps(u))["urteil"] == "bestanden")

# ───────────────────────── 7) Schalter, Not-Aus, Pause, Sperre ─────────────────────────
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    nix = tmp / "gibt-es-nicht"
    pruefe("Schalter: Standard ist AN", L.einstellung({}, nix, nix, nix) == {"aus": False, "grund": ""})
    for wort in ("aus", "AUS", " off ", "0", "nein", "false"):
        pruefe(f"Schalter: KRYPTO_SCALP_LABOR={wort!r} schaltet aus", L.einstellung({"KRYPTO_SCALP_LABOR": wort}, nix, nix, nix)["aus"])
    pruefe("Schalter: andere Werte (an, 1) lassen es an", not L.einstellung({"KRYPTO_SCALP_LABOR": "an"}, nix, nix, nix)["aus"] and not L.einstellung({"KRYPTO_SCALP_LABOR": "1"}, nix, nix, nix)["aus"])
    aus_d = tmp / "aus.txt"
    aus_d.write_text("x")
    pruefe("Schalter: die Datei schaltet aus", L.einstellung({}, aus_d, nix, nix)["aus"] and "Datei" in L.einstellung({}, aus_d, nix, nix)["grund"])
    stop_d = tmp / "STOP"
    stop_d.write_text("x")
    pruefe("Not-Aus: Datei STOP schaltet aus", L.einstellung({}, nix, stop_d, nix)["aus"] and "Not-Aus" in L.einstellung({}, nix, stop_d, nix)["grund"])
    pruefe("Not-Aus: KI_BOT_STOP=1 schaltet aus, KI_BOT_STOP=0 nicht", L.einstellung({"KI_BOT_STOP": "1"}, nix, nix, nix)["aus"] and not L.einstellung({"KI_BOT_STOP": "0"}, nix, nix, nix)["aus"])
    pause_d = tmp / "PAUSE"
    pause_d.write_text("x")
    pruefe("Pause: Datei PAUSE schaltet aus", L.einstellung({}, nix, nix, pause_d)["aus"] and "Pause" in L.einstellung({}, nix, nix, pause_d)["grund"])

    # einmal(): aus → kein Abruf, keine Datei
    bo_s = Boerse({"BTCUSDT": serie(100), "ETHUSDT": serie(100)}, START + 90 * MIN)
    buchd = tmp / "buch.json"
    rc, text = L.einmal(hole=bo_s.hole, datei=buchd, env={"KRYPTO_SCALP_LABOR": "aus"}, aus_datei=nix, stop=nix, pause=nix, sperr_datei=tmp / "l")
    pruefe("einmal: aus → rc 0, kein Abruf bei der Börse, keine Datei, der Text sagt warum und «holt später nach»", rc == 0 and not bo_s.aufrufe and not buchd.exists() and "KRYPTO_SCALP_LABOR=aus" in text and "nach" in text, (rc, text))
    rc, text = L.einmal(hole=bo_s.hole, datei=buchd, env={}, aus_datei=nix, stop=stop_d, pause=nix, sperr_datei=tmp / "l")
    pruefe("einmal: Not-Aus → nichts gerechnet", rc == 0 and not bo_s.aufrufe and not buchd.exists())

    # Sperre
    sd = tmp / "sperre.lock"
    sd.write_text("1")
    rc, text = L.einmal(hole=bo_s.hole, datei=buchd, env={}, aus_datei=nix, stop=nix, pause=nix, sperr_datei=sd)
    pruefe("Sperre: ein anderer Lauf aktiv → übersprungen, rc 0, kein Abruf, die fremde Sperre bleibt", rc == 0 and not bo_s.aufrufe and sd.exists() and "übersprungen" in text, (rc, text))
    alt = time.time() - L.LOCK_ALT_S - 60
    os.utime(sd, (alt, alt))
    rc, text = L.einmal(hole=bo_s.hole, datei=buchd, env={}, aus_datei=nix, stop=nix, pause=nix, sperr_datei=sd, jetzt_ms=START + 90 * MIN)
    pruefe("Sperre: eine verwaiste (über 15 Minuten alte) wird übernommen und danach freigegeben", rc == 0 and bo_s.aufrufe and not sd.exists() and buchd.exists(), (rc, text))
    try:
        with L.sperre(sd):
            raise RuntimeError("Absturz im Lauf")
    except RuntimeError:
        pass
    pruefe("Sperre: auch nach einem Absturz im Lauf wird sie freigegeben", not sd.exists())
    with L.sperre(sd):
        try:
            with L.sperre(sd):
                zweite = True
        except L.Besetzt:
            zweite = False
    pruefe("Sperre: nicht zweimal gleichzeitig", zweite is False and not sd.exists())

# ───────────────────────── 8) Buch lesen und schreiben ─────────────────────────
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    pfad = tmp / "unter" / "buch.json"
    b0, h0 = L.lesen(pfad, START)
    pruefe("lesen: fehlt alles → neues Buch ohne Hinweis", h0 == "" and b0["maerkte"] == {} and b0["live_ab"] == START)
    L.lauf(b0, Boerse(reihen, jetzt_ende).hole, jetzt_ende, rueckrechnung_min=1500)
    L.schreiben(b0, pfad)
    b1, h1 = L.lesen(pfad)
    pruefe("schreiben/lesen: Bit für Bit gleich (auch Gleitkommazahlen)", h1 == "" and json.dumps(b1, sort_keys=True) == json.dumps(b0, sort_keys=True))
    pruefe("schreiben: legt den Ordner an, hinterlässt keine .tmp-Datei", not any(".tmp" in p.name for p in pfad.parent.iterdir()))
    L.schreiben(b0, pfad)
    pruefe("schreiben: beim zweiten Mal entsteht die Sicherungskopie", pfad.with_name("buch.json.bak").exists())
    pfad.write_text("{kaputt")
    b2, h2 = L.lesen(pfad)
    pruefe("lesen: kaputte Datei → Sicherungskopie mit Hinweis", "Sicherungskopie" in h2 and json.dumps(b2, sort_keys=True) == json.dumps(b0, sort_keys=True), h2)
    L.schreiben(b2, pfad)
    pruefe("schreiben: ein kaputtes Buch überschreibt nie die gute Sicherungskopie", L._lesen_datei(pfad.with_name("buch.json.bak")) is not None)
    pfad.write_text("{kaputt")
    pfad.with_name("buch.json.bak").write_text("auch kaputt")
    b3, h3 = L.lesen(pfad, START)
    pruefe("lesen: beide kaputt → altes beiseitegelegt (nie überschrieben), neues Buch, Hinweis", "unlesbar" in h3 and b3["maerkte"] == {} and any(".kaputt-" in p.name for p in pfad.parent.iterdir())
           and not pfad.exists(), [p.name for p in pfad.parent.iterdir()])
    # die Anzeige (Cockpit) fasst nie eine Datei an
    pfad.write_text("{kaputt")
    pfad.with_name("buch.json.bak").write_text("auch kaputt")
    vorher_namen = sorted(p.name for p in pfad.parent.iterdir())
    b4, h4 = L.lesen(pfad, START, beiseite=False)
    pruefe("lesen(beiseite=False): beide kaputt → neues Buch und Hinweis, aber keine Datei wird umbenannt oder angelegt", "unlesbar" in h4 and "nächsten Lauf" in h4 and b4["maerkte"] == {}
           and sorted(p.name for p in pfad.parent.iterdir()) == vorher_namen and pfad.read_text() == "{kaputt", (h4, vorher_namen))
    pruefe("lesen(beiseite=False): fehlende Dateien → neues Buch ohne Hinweis, nichts angelegt", L.lesen(tmp / "gibtsnicht" / "b.json", START, beiseite=False)[1] == "" and not (tmp / "gibtsnicht").exists())
    for schaden, name in ((lambda d: d.pop("version"), "Version fehlt"), (lambda d: d["maerkte"].update({"XRPUSDT": {"buecher": {}}}), "fremder Markt"),
                          (lambda d: d["maerkte"]["BTCUSDT"]["buecher"]["2.0"].pop("fenster"), "Feld fehlt"),
                          (lambda d: d["maerkte"]["BTCUSDT"]["buecher"]["2.0"].update({"k": 9.0}), "falsches k"),
                          (lambda d: d["maerkte"]["BTCUSDT"]["buecher"]["2.0"].update({"s1": float("nan")}), "NaN"),
                          (lambda d: d["maerkte"]["BTCUSDT"]["buecher"]["2.0"].update({"n": "5"}), "Zahl als Text"),
                          (lambda d: d["maerkte"]["BTCUSDT"].update({"weiter_ab": "morgen"}), "weiter_ab Text"),
                          (lambda d: d.update({"live_ab": True}), "live_ab Wahrheitswert")):
        d = json.loads(json.dumps(b0))
        schaden(d)
        try:
            L._buch_pruefen(d)
            ok = False
        except ValueError:
            ok = True
        pruefe(f"Buch prüfen: {name} → ValueError", ok)
    pruefe("Buch prüfen: ein heiles Buch besteht", L._buch_pruefen(json.loads(json.dumps(b0))) is not None)

# ───────────────────────── 9) Anzeige, Ampel, Cockpit-Daten, Handy-Text ─────────────────────────
b_voll = json.loads(json.dumps(b_a))
txt = L.status_text(b_voll)
pruefe("status_text: Kopf, 8 Zeilen, Urteil und Hinweis «Papier» stehen drin", txt.startswith("Scalping-Labor") and txt.count("\nBTC ") + txt.count("\nETH ") == 8 and "Urteil (vorab festgelegt)" in txt and "kein geld im spiel" in txt.lower(), txt)
pruefe("status_text: deutsche Zahlen (Komma, echtes Minus) und die Spalte Prüfstand", "−" in txt and "," in txt and "Prüfstand netto" in txt)
pruefe("status_text: Zum-Greifen-Zeile rechnet in USDT, Kursbewegung und Kosten ergeben die Summe", "Zum Greifen" in txt and "USDT" in txt and "NICHT der Verlust des Kontos" in txt)
z_viel = max(L.tabelle(b_voll), key=lambda z: z["n"])
br, ko = round(z_viel["brutto_bp"] * z_viel["n"] / 10), round(z_viel["kosten_bp"] * z_viel["n"] / 10)
pruefe("status_text: die USDT-Beispielzahlen stimmen mit der Tabelle", f"bleibt {L._de(br + ko, 0, True)} USDT" in txt, (br, ko))
pruefe("status_text: ohne Lauf → «Noch kein Lauf»", "Noch kein Lauf" in L.status_text(L.neues_buch(START)))
tz = L.tabelle(b_voll)
pruefe("tabelle: 8 Zeilen, Erwartung des Prüfstands je Zeile, Trades pro Tag des Prüfstands", len(tz) == 8 and all(z["erw_netto_bp"] < 0 and z["erw_je_tag"] > 20 for z in tz), tz[0])
pruefe("tabelle: jede Zeile trägt die Erwartung IHRES Marktes und ihrer Stufe", all(z["erw_netto_bp"] == L.ERWARTUNG[(sym, k)][1] and z["erw_brutto_bp"] == L.ERWARTUNG[(sym, k)][0]
       for z, (sym, k) in zip(tz, [(s_, k_) for s_ in L.MAERKTE for k_ in L.STUFEN])), tz)
pruefe("tabelle: Kosten je Trade = Netto − Brutto (negativ)", all(abs(z["kosten_bp"] - (z["netto_bp"] - z["brutto_bp"])) < 0.002 and z["kosten_bp"] < 0 for z in tz if z["n"]))
hz = L.zusammenfassung(b_voll)
pruefe("Handy-Text: kurz, «Papier», «Kein Geld im Spiel», Urteil, keine Anlageberatung", len(hz) < 700 and "Papier" in hz and "Kein Geld im Spiel" in hz and "Urteil:" in hz and "Anlageberatung" in hz, (len(hz), hz))
pruefe("Handy-Text: ohne Trades eine ehrliche Zeile", "Noch keine Trades" in L.zusammenfassung(L.neues_buch(START)))
pruefe("Handy-Text: enthält weder Schlüssel noch Pfade", not re.search(r"\bapi\b|secret|token|c:\\|/home/", hz.lower()), hz)
cd = L.cockpit_daten(b_voll)
pruefe("cockpit_daten: JSON-fähig, 8 Zeilen, Urteil, höchstens 20 letzte Handel, neueste zuerst", len(json.dumps(cd)) > 100 and len(cd["zeilen"]) == 8 and cd["urteil"]["urteil"] and 0 < len(cd["letzte_trades"]) <= 20
       and all(cd["letzte_trades"][i]["t_aus"] >= cd["letzte_trades"][i + 1]["t_aus"] for i in range(len(cd["letzte_trades"]) - 1)))
with tempfile.TemporaryDirectory() as tmp:
    nix = Path(tmp) / "nix"
    jetzt_a = jetzt_ende
    lauf_zeit = L._iso(jetzt_a)
    bb = json.loads(json.dumps(b_a))
    bb["letzter_lauf"] = {"zeit": lauf_zeit, "kerzen": 10, "trades": 1, "hinweise": []}
    pruefe("Ampel: aus per Schalter → grau (None), keine Warnung", L.ampel(bb, jetzt_a, {"KRYPTO_SCALP_LABOR": "aus"}, nix)[0] is None and L.ampel(bb, jetzt_a, {"KRYPTO_SCALP_LABOR": "aus"}, nix)[2] is False)
    pruefe("Ampel: noch kein Lauf → grau, keine Warnung", L.ampel(L.neues_buch(START), jetzt_a, {}, nix)[0] is None and L.ampel(L.neues_buch(START), jetzt_a, {}, nix)[2] is False)
    pruefe("Ampel: frischer Lauf ohne Hinweis → grün mit Urteil, keine Warnung", L.ampel(bb, jetzt_a + 3600_000, {}, nix) == (True, "Papier, zu wenig Daten", False), L.ampel(bb, jetzt_a + 3600_000, {}, nix))
    pruefe("Ampel: Lauf älter als 36 Stunden → rot, ohne Warnung-Flag", L.ampel(bb, jetzt_a + 37 * 3600_000, {}, nix)[0] is False and "37" in L.ampel(bb, jetzt_a + 37 * 3600_000, {}, nix)[1] and L.ampel(bb, jetzt_a + 37 * 3600_000, {}, nix)[2] is False)
    pruefe("Ampel: genau 36 Stunden noch grün", L.ampel(bb, jetzt_a + 36 * 3600_000, {}, nix)[0] is True)
    bb["letzter_lauf"]["hinweise"] = ["BTC: Kerzen nicht erreichbar (OSError)"]
    pruefe("Ampel: Hinweis im letzten Lauf (z. B. Netz weg, wird nachgeholt) → GELB (grau mit Warnung), nicht rot", L.ampel(bb, jetzt_a, {}, nix)[0] is None and L.ampel(bb, jetzt_a, {}, nix)[2] is True and "nicht erreichbar" in L.ampel(bb, jetzt_a, {}, nix)[1])
    bb["letzter_lauf"]["zeit"] = "kaputt"
    pruefe("Ampel: unlesbare Zeit → gelb, kein Absturz", L.ampel(bb, jetzt_a, {}, nix)[0] is None and L.ampel(bb, jetzt_a, {}, nix)[2] is True)

# ───────────────────────── 10) Handy-Meldung: einmal pro Tag, nur wenn zugestellt ─────────────────────────
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    nix = tmp / "nix"
    gesendet = []
    bo_p = Boerse(reihen, jetzt_ende)
    kw = dict(hole=bo_p.hole, datei=tmp / "b.json", env={}, aus_datei=nix, stop=nix, pause=nix, sperr_datei=tmp / "l", jetzt_ms=jetzt_ende)
    rc, text = L.einmal(push=True, sender=lambda t: gesendet.append(t) or True, **kw)
    pruefe("Push: am ersten Tag einmal gesendet, im Text steht es", len(gesendet) == 1 and "aufs Handy gesendet" in text and "Scalping-Labor" in gesendet[0], (gesendet, text))
    rc, text = L.einmal(push=True, sender=lambda t: gesendet.append(t) or True, **kw)
    pruefe("Push: am selben Tag nicht nochmals", len(gesendet) == 1 and "gesendet" not in text, text)
    kw2 = dict(kw, jetzt_ms=jetzt_ende + 86_400_000)
    kw2["hole"] = Boerse(reihen, jetzt_ende + 86_400_000).hole
    rc, text = L.einmal(push=True, sender=lambda t: gesendet.append(t) or True, **kw2)
    pruefe("Push: am nächsten Tag wieder", len(gesendet) == 2)
    versuche = []
    kw3 = dict(kw, datei=tmp / "c.json")
    rc, text = L.einmal(push=True, sender=lambda t: versuche.append(t) or False, **kw3)
    rc, text2 = L.einmal(push=True, sender=lambda t: versuche.append(t) or False, **kw3)
    pruefe("Push: nicht zugestellt (Sender gibt False) → am selben Tag nochmals versucht", len(versuche) == 2 and "gesendet" not in text)

    def wirft(t):
        raise ValueError("unknown url type: 'ntfy.sh/abc'")
    rc, text = L.einmal(push=True, sender=wirft, **dict(kw, datei=tmp / "d.json"))
    pruefe("Push: ein Sender, der eine Ausnahme wirft, bricht den Lauf nicht ab (rc 0, Buch geschrieben, Hinweis)", rc == 0 and (tmp / "d.json").exists() and "nicht gesendet" in text, (rc, text))
    rc, text = L.einmal(push=False, sender=lambda t: gesendet.append(t) or True, **dict(kw, datei=tmp / "e.json"))
    pruefe("Push: ohne --push wird nie gesendet", len(gesendet) == 2)
    # ein Buch-Problem steht im Lauf-Eintrag
    (tmp / "f.json").write_text("{kaputt")
    (tmp / "f.json.bak").write_text("{kaputt")
    rc, text = L.einmal(**dict(kw, datei=tmp / "f.json"))
    bf, _ = L.lesen(tmp / "f.json")
    pruefe("Buch kaputt: der Lauf rechnet mit neuem Buch weiter (rc 0), der Hinweis steht im Text und im Lauf-Eintrag (Cockpit-Ampel)", rc == 0 and "unlesbar" in text and any("unlesbar" in h for h in bf["letzter_lauf"]["hinweise"]), (rc, text))

# ───────────────────────── 11) Aufruf von der Kommandozeile ─────────────────────────
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    alt_buch, alt_sperr, alt_hole, alt_aus = L.BUCH, L.SPERR_DATEI, L.standard_hole, L.AUS_DATEI
    alt_stop, alt_pause = L.STOP, L.PAUSE
    alt_env = {k: os.environ.pop(k) for k in ("KRYPTO_SCALP_LABOR", "KI_BOT_STOP") if k in os.environ}
    try:
        L.BUCH, L.SPERR_DATEI, L.AUS_DATEI, L.STOP, L.PAUSE = tmp / "b.json", tmp / "l", tmp / "aus", tmp / "STOP", tmp / "PAUSE"
        bo_m = Boerse(reihen, jetzt_ende)
        L.standard_hole = lambda: bo_m.hole
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            rc_status = L.main(["--status"])
        pruefe("main --status ohne Buch: rc 0, «Noch kein Lauf», legt keine Datei an", rc_status == 0 and "Noch kein Lauf" in ausgabe.getvalue() and not L.BUCH.exists(), ausgabe.getvalue())
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            rc_einmal = L.main(["--einmal"])
        pruefe("main --einmal: rc 0, neue Kerzen und Handel gemeldet, Buch geschrieben", rc_einmal == 0 and "neue Kerzen" in ausgabe.getvalue() and L.BUCH.exists(), ausgabe.getvalue())
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            L.main([])
        pruefe("main ohne Argument: zeigt den Stand", "Urteil (vorab festgelegt)" in ausgabe.getvalue())
        orig_einmal = L.einmal
        L.einmal = lambda **kw: (_ for _ in ()).throw(KeyError("kaputt"))
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            rc_crash = L.main(["--einmal"])
        L.einmal = orig_einmal
        pruefe("main --einmal: ein Fehler im Labor → rc 1 mit Meldung (der Tagesbatch zählt es als Absturz, sonst läuft alles weiter)", rc_crash == 1 and "abgestürzt" in ausgabe.getvalue(), ausgabe.getvalue())
        # dauer(): zwei Runden, dazwischen eine Pause von mindestens 30 s
        pausen = []
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            rc_d = L.dauer(sekunden=5, hole=bo_m.hole, schlafen=pausen.append, max_runden=2, env={}, aus_datei=tmp / "nix", stop=tmp / "nix", pause=tmp / "nix", sperr_datei=tmp / "l2", datei=tmp / "d.json")
        pruefe("dauer: zwei Runden, dazwischen genau eine Pause, nie unter 30 Sekunden", pausen == [30] and ausgabe.getvalue().count("Scalping-Labor:") == 2, (pausen, ausgabe.getvalue()))
        (tmp / "STOP").write_text("x")
        pausen = []
        ausgabe = io.StringIO()
        with redirect_stdout(ausgabe):
            L.dauer(sekunden=60, hole=bo_m.hole, schlafen=pausen.append, max_runden=5, env={}, aus_datei=tmp / "nix", stop=tmp / "STOP", pause=tmp / "nix", sperr_datei=tmp / "l2", datei=tmp / "d.json")
        pruefe("dauer: Not-Aus beendet die Schleife nach der ersten Runde, ohne zu schlafen", pausen == [] and ausgabe.getvalue().count("Scalping-Labor") == 1, (pausen, ausgabe.getvalue()))
        (tmp / "STOP").unlink()

        def unterbrochen(s):
            raise KeyboardInterrupt
        with redirect_stdout(io.StringIO()):
            rc_k = L.dauer(sekunden=60, hole=bo_m.hole, schlafen=unterbrochen, max_runden=5, env={}, aus_datei=tmp / "nix", stop=tmp / "nix", pause=tmp / "nix", sperr_datei=tmp / "l2", datei=tmp / "d.json")
        pruefe("dauer: Strg+C beendet sauber (rc 0)", rc_k == 0)
    finally:
        L.BUCH, L.SPERR_DATEI, L.standard_hole, L.AUS_DATEI, L.STOP, L.PAUSE = alt_buch, alt_sperr, alt_hole, alt_aus, alt_stop, alt_pause
        L.einmal = orig_einmal if "orig_einmal" in dir() else L.einmal
        os.environ.update(alt_env)

# ───────────────────────── 12) Sicherheits-Invarianten: das Labor kann keine Aufträge senden ─────────────────────────
quelle = (HIER / "scalping_labor.py").read_text(encoding="utf-8")
baum = ast.parse(quelle)
importiert = set()
for knoten in ast.walk(baum):
    if isinstance(knoten, ast.Import):
        importiert |= {a.name.split(".")[0] for a in knoten.names}
    elif isinstance(knoten, ast.ImportFrom):
        importiert.add((knoten.module or "").split(".")[0])
erlaubt = {"__future__", "argparse", "json", "math", "os", "shutil", "sys", "time", "contextlib", "datetime", "pathlib", "scalping_kern", "binance_daten", "signale"}
pruefe("Sicherheit: das Labor importiert nur Erlaubtes (nie Broker, Pilot, Satellit, Sperre, Cockpit, urllib)", importiert <= erlaubt, sorted(importiert - erlaubt))
verboten = ("broker_futures", "broker_binance", "pilot", "satellit", "sperre", "cockpit", "ki_trader", "urllib", "requests", "http.client", "socket", "subprocess")
pruefe("Sicherheit: keiner der Order-/Netz-Module taucht in einer Import-Zeile auf", not any(v in importiert for v in verboten), importiert)
for wort in ("API_KEY", "API_SECRET", "SECRET", "X-MBX-APIKEY", "/fapi/", "/sapi/", "positionRisk", "newOrder", "algoOrder", "reduceOnly", "signature", "hmac", "TELEGRAM_BOT_TOKEN"):
    pruefe(f"Sicherheit: «{wort}» kommt im Quelltext nicht vor", wort not in quelle, wort)
pruefe("Sicherheit: keine Umgebungsvariable ausser KRYPTO_SCALP_LABOR und KI_BOT_STOP wird gelesen", {n.value for n in ast.walk(baum) if isinstance(n, ast.Constant) and isinstance(n.value, str)
       and n.value.isupper() and ("_" in n.value) and n.value.replace("_", "").isalnum() and n.value.startswith(("KRYPTO", "KI_", "BINANCE", "PILOT", "ANTHROPIC", "TELEGRAM", "ETH_"))} <= {"KRYPTO_SCALP_LABOR", "KI_BOT_STOP"})
pruefe("Sicherheit: kein Aufruf von Post/Delete/Put (die einzige Netz-Quelle ist binance_daten._hole, nur Lesen)", not any(w in quelle for w in ('"POST"', '"DELETE"', '"PUT"', "method=")))


# Einbau in den Tageslauf
bat = (HIER / "krypto-auto.bat").read_bytes().decode("utf-8")
workflow = HIER.parents[2] / ".github" / "workflows" / "krypto-paket.yml"                      # nur im Repo (CI), nicht in der Installation auf dem PC
pruefe("Einbau: krypto-auto.bat ruft das Labor mit --einmal --push auf", "call :schritt Scalping-Labor scalping_labor.py --einmal --push\r\n" in bat)
pruefe("Einbau: das Labor kommt NACH Pilot, Satellit und KI-Trader und VOR der Bilanz (ein Fehler hier hält nichts anderes auf)",
       bat.index("call :schritt Krypto-Pilot") < bat.index("call :schritt Satellit") < bat.index("call :schritt KI-Trader") < bat.index("call :schritt Scalping-Labor") < bat.index(":bilanz\r\nif defined FEHLER"))
pruefe("Einbau: Not-Aus und Pause springen über das Labor hinweg (die Sprünge stehen davor, ihre Marken dahinter)",
       bat.index("goto bilanz") < bat.index("call :schritt Scalping-Labor") < bat.index("\r\n:bilanz\r\n") and bat.index("goto ende") < bat.index("call :schritt Scalping-Labor") < bat.index("\r\n:ende\r\n"))
pruefe("Einbau: ein roter Papier-Test sperrt den Piloten nie (das Labor steht nicht in der Selbsttest-Schleife)", "test_scalping_labor" not in bat)
pruefe("Einbau: :schritt reicht das vierte Argument weiter (sonst bekäme das Labor kein --push)", "%PY% tools\\trading\\krypto_bot\\%2 %3 %4\r\n" in bat)
pruefe("Einbau: Windows-Zeilenenden in der ganzen Batch-Datei", bat.count("\n") == bat.count("\r\n"))
if workflow.exists():
    pruefe("Einbau: die Pipeline prüft das Labor vor dem Paketbau", "test_scalping_labor" in workflow.read_text(encoding="utf-8"))

# Die Vorgaben des Labors sind die des Prüfstands
try:
    import scalping_pruefung as SP
    pruefe("Prüfstand: Märkte (Tick, Schlupf) des Labors == scalping_pruefung.MAERKTE", L.MAERKTE == SP.MAERKTE, (L.MAERKTE, SP.MAERKTE))
    pruefe("Prüfstand: Gebühren des Labors == scalping_pruefung.GEBUEHR", L.GEBUEHR == SP.GEBUEHR, (L.GEBUEHR, SP.GEBUEHR))
except ImportError as ex:
    pruefe("Prüfstand importierbar", False, ex)
sig = inspect.signature(K.band_abpraller).parameters
pruefe("Prüfstand: n und halt der Band-Strategie == N_BAND, HALT des Labors", sig["n"].default == L.N_BAND and sig["halt"].default == L.HALT, (sig["n"].default, sig["halt"].default))
pruefe("Prüfstand: die Stufen k des Labors == die vier vorab festgelegten", L.STUFEN == (2.0, 2.5, 3.0, 3.5))
pruefe("Prüfstand: das Urteil ist wie vorab festgelegt (14 Tage, 200 Trades, +1 bp)", (L.URTEIL_TAGE_MIN, L.URTEIL_TRADES_MIN, L.URTEIL_NETTO_BP_MIN) == (14, 200, 1.0))
daten = HIER.parents[2] / "data" / "krypto-scalping-pruefung.json"
if daten.exists():
    d = json.loads(daten.read_text(encoding="utf-8"))
    stimmt = True
    for (sym, k), (br, ne, n) in L.ERWARTUNG.items():
        p = d["maerkte"][sym]["S1"]["varianten"][f"k={k}"]["pruef_info"]
        stimmt = stimmt and (p["brutto_bp"], p["netto_bp"], p["n"]) == (br, ne, n)
    pruefe("Prüfstand: ERWARTUNG des Labors == data/krypto-scalping-pruefung.json (ungesehene Daten 2024–2026)", stimmt)
    pruefe("Prüfstand: kein Verfahren war «handelbar»", d["handelbar"] == [])
    pruefe("Prüfstand: PRUEF_TAGE passt zum Prüfzeitraum 01.01.2024–30.09.2026", d["protokoll"]["pruefen"] == "2024-01-01 bis 2026-09-30" and L.PRUEF_TAGE == 366 + 365 + 273)

# ───────────────────────── 13) Tempo: kein quadratisches Verhalten ─────────────────────────
rows = reihe(41, 30000, 0.1, 50000.0)
t0 = time.time()
for k in L.STUFEN:
    maschine(rows, k, 0.1)
dauer_s = time.time() - t0
pruefe("Tempo: 30 000 Kerzen × 4 Stufen in unter 30 Sekunden (gemessen: %.1f s)" % dauer_s, dauer_s < 30, dauer_s)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
