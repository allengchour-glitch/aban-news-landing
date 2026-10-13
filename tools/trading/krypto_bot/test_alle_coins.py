#!/usr/bin/env python3
"""Tests für den Prüfstand «Meme-Coins, Top 10 und alles» (alle_coins_pruefung.py), ohne Netz.
    python3 tools/trading/krypto_bot/test_alle_coins.py"""
import json
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import alle_coins_pruefung as A  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


T = 400
tage = [f"t{i}" for i in range(T)]


def reihe(start, schritt, ab=0):
    return [None] * ab + [start * (1 + schritt) ** k for k in range(T - ab)]


preis = {"BTCUSDT": reihe(100, 0.002), "ETHUSDT": reihe(50, -0.002), "DOGEUSDT": reihe(1, 0.004), "PEPEUSDT": reihe(1, 0.003, ab=200),
         "XYZUSDT": reihe(5, 0.001)}
for k in range(12):
    preis[f"K{k}USDT"] = reihe(10, 0.001 * (k % 3))
vol = {s: [20e6 if s != "XYZUSDT" else 1e6] * T for s in preis}
vol["BTCUSDT"] = [900e6] * T
vol["DOGEUSDT"] = [300e6] * T
i = 380
pruefe("MEME: nur Coins aus der Meme-Liste mit ≥ 90 Tagen Geschichte und genug Volumen", A.uni("MEME", i, preis, vol) == ["DOGEUSDT", "PEPEUSDT"],
       A.uni("MEME", i, preis, vol))
pruefe("MEME: ohne 90 Tage Geschichte noch nicht dabei", "PEPEUSDT" not in A.uni("MEME", 250, preis, vol))
pruefe("ALLE: dünne Märkte (< 5 Mio. Tagesvolumen) bleiben draussen, nach Liquidität sortiert",
       "XYZUSDT" not in A.uni("ALLE", i, preis, vol) and A.uni("ALLE", i, preis, vol)[:2] == ["BTCUSDT", "DOGEUSDT"])
pruefe("TOP10: höchstens 10 Coins", len(A.uni("TOP10", i, preis, vol)) == 10)
z = A.ziele("trend", "ALLE", 100, i, preis, vol)
pruefe("trend: nur Coins über ihrem 100-Tage-Schnitt (ETH fällt → nicht dabei), höchstens 10 Plätze à 10 %",
       "ETHUSDT" not in z and "BTCUSDT" in z and len(z) <= 10 and all(abs(w - 0.1) < 1e-12 for w in z.values()), z)
flach = {s: [None if x is None else 10.0 for x in p] for s, p in preis.items()}
pruefe("trend: genau auf dem Schnitt (nicht darüber) → nicht dabei", A.ziele("trend", "ALLE", 100, i, flach, vol) == {})
abw = dict(preis, BTCUSDT=reihe(100, -0.002))
A._CACHE.clear()
pruefe("trend_btc: Bitcoin unter seinem 150-Tage-Schnitt → alles in USDT", A.ziele("trend_btc", "ALLE", 100, i, abw, vol) == {}
       and A.ziele("trend", "ALLE", 100, i, abw, vol) != {})
A._CACHE.clear()
zukunft = {s: (p[:i + 1] + [x * 0.01 if x else x for x in p[i + 1:]]) for s, p in preis.items()}
pruefe("kein Blick in die Zukunft: Absturz NACH dem Entscheidungstag ändert die Auswahl nicht",
       A.ziele("trend", "ALLE", 100, i, preis, vol) == A.ziele("trend", "ALLE", 100, i, zukunft, vol))
A._CACHE.clear()
pruefe("halten: alle Coins des Universums gleich gewichtet", abs(sum(A.ziele("halten", "MEME", 100, i, preis, vol).values()) - 1) < 1e-12
       and len(A.ziele("halten", "MEME", 100, i, preis, vol)) == 2)
echt = {i: A.ziele("trend", "ALLE", 100, i, preis, vol), i + 7: {}}
zp = A.zufalls_plan(echt, [i, i + 7], "ALLE", preis, vol, random.Random(1))
pruefe("Zufallskopie: gleich viele Plätze, gleiches Gewicht, Coins aus demselben Universum, leere Wochen bleiben leer",
       len(zp[i]) == len(echt[i]) and set(zp[i].values()) == set(echt[i].values()) and set(zp[i]) <= set(A.uni("ALLE", i, preis, vol))
       and zp[i + 7] == {}, zp)
pruefe("Ergebnis-Datei: unendliche Werte werden null (gültiges JSON)", json.loads(json.dumps(A._endlich({"a": [math.inf, 1.0], "b": -math.inf})))
       == {"a": [None, 1.0], "b": None})
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
