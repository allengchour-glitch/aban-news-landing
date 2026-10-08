#!/usr/bin/env python3
"""Tests für den Gewinner-Prüfstand (ohne Netz): python3 tools/trading/krypto_bot/test_gewinner.py"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import gewinner_pruefung as G  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def tag(i):
    return (date(2020, 1, 1) + timedelta(days=i)).isoformat()


# ── Lücken: Neulistung unter altem Namen ist ein neuer Coin ──
r = {"LUNAUSDT": [[tag(0), 10, 1], [tag(1), 11, 1], [tag(20), 5, 1], [tag(21), 6, 1]], "BTCUSDT": [[tag(0), 1, 1], [tag(3), 1, 1]]}
seg = G.segmente(r)
pruefe("Lücke > 5 Tage trennt den Verlauf", set(seg) == {"LUNAUSDT", "LUNAUSDT#2", "BTCUSDT"} and seg["LUNAUSDT#2"][0][1] == 5, seg.keys())
tage, preis, vol = G.vorbereiten({"A": [[tag(0), 1.0, 5], [tag(2), 2.0, 5]], "B": [[tag(1), 3.0, 1], [tag(2), 3.0, 1]]})
pruefe("Raster: fehlender Tag mit letztem Kurs, vor Beginn None", preis["A"] == [1.0, 1.0, 2.0] and preis["B"] == [None, 3.0, 3.0], preis)

# ── synthetischer Markt: 30 Coins, 300 Tage ──
N = 300
tage = [tag(i) for i in range(N)]
preis, vol = {}, {}
for k in range(30):
    s = f"C{k:02d}USDT"
    preis[s] = [100 * (1 + 0.001 * k) ** i for i in range(N)]   # höhere Nummer = stärkerer Trend
    vol[s] = [1000.0 - k] * N                                   # Volumen-Rang fix: C00 grösstes Volumen
preis["BTCUSDT"] = [100 * 1.002 ** i for i in range(N)]
vol["BTCUSDT"] = [5000.0] * N
preis["NEUUSDT"] = [None] * 250 + [1.0] * 50   # erst seit 50 Tagen gelistet
vol["NEUUSDT"] = [0.0] * 250 + [99999.0] * 50
G._UNI.clear()
uni = G.universum(200, preis, vol)
pruefe("Universum: Top 20 nach Volumen, nur mit 90 Tagen Geschichte", len(uni) == 20 and uni[0] == "BTCUSDT" and "NEUUSDT" not in G.universum(299, preis, vol)
       and "C18USDT" in uni and "C19USDT" not in uni, uni)  # Bitcoin belegt selbst einen der 20 Plätze
z1, n1 = G.ziele("G1", 200, preis, vol)
pruefe("G1: die 3 stärksten im Universum, je 1/3", n1 == 3 and set(z1) == {"C18USDT", "C17USDT", "C16USDT"} and abs(sum(z1.values()) - 1) < 1e-12, z1)
# Kausalität: Kurse NACH dem Auswahltag ändern die Auswahl nicht
p2 = {s: list(v) for s, v in preis.items()}
for i in range(201, N):
    p2["C00USDT"][i] = p2["C00USDT"][i] * 50
G._UNI.clear()
pruefe("Auswahl sieht keine Zukunft", G.ziele("G1", 200, p2, vol)[0] == z1)
# G2: Bitcoin unter dem 150-Tage-Schnitt → alles in USDT
p3 = {s: list(v) for s, v in preis.items()}
p3["BTCUSDT"] = [100 * 1.002 ** i if i < 180 else 100 * 1.002 ** 180 * 0.995 ** (i - 180) for i in range(N)]
G._UNI.clear()
pruefe("G2: Bitcoin unter Trend → USDT", G.ziele("G2", 260, p3, vol)[0] == {})
# G2: Coins mit fallendem Kurs fliegen raus, Plätze bleiben leer
p4 = {s: list(v) for s, v in preis.items()}
for s in list(p4):
    if s not in ("BTCUSDT", "C18USDT") and p4[s][0] is not None:
        p4[s] = [100 * 0.999 ** i for i in range(N)]
G._UNI.clear()
z4, _ = G.ziele("G2", 200, p4, vol)
pruefe("G2: nur Coins im Aufwärtstrend, freie Plätze in USDT", set(z4) == {"BTCUSDT", "C18USDT"} and abs(sum(z4.values()) - 2 / 3) < 1e-12, z4)

# ── Simulation ──
tt = [tag(i) for i in range(5)]
pp = {"X": [1.0, 2.0, 2.0, 4.0, 4.0], "T": [1.0, 1.0, None, None, None]}
w = G.simulieren({0: {"X": 1.0}}, tt, pp, 0, 5)
pruefe("Kauf am Tag 0, Verdopplung zählt ab Tag 1, Kosten einmal", abs(w[1] - 2 * (1 - G.KOSTEN)) < 1e-12 and abs(w[3] - 4 * (1 - G.KOSTEN)) < 1e-12, w)
w2 = G.simulieren({0: {"T": 0.5}}, tt, pp, 0, 5)
pruefe("verschwundener Coin wird zum letzten Kurs verkauft", abs(w2[-1] - (1 - 0.5 * G.KOSTEN)) < 1e-12, w2)
w3 = G.simulieren({0: {"X": 1.0}, 2: {}}, tt, pp, 0, 5)
pruefe("Verkauf in USDT: danach kein Kursrisiko", abs(w3[3] - w3[4]) < 1e-12 and abs(w3[3] - 2 * (1 - G.KOSTEN) ** 2) < 1e-9, w3)
w4 = G.simulieren({0: {"X": 1.0}}, tt, pp, 2, 5)
pruefe("Abschnitt ab Tag 2: letzte Auswahl gilt sofort", abs(w4[1] - 2 * (1 - G.KOSTEN)) < 1e-12, w4)
k = G.kennz([1.0, 2.0, 1.0, 1.5])
pruefe("Kennzahlen: Einbruch −50 %", abs(k["einbruch"] + 0.5) < 1e-12 and k["ende"] == 1.5)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
