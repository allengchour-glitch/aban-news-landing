#!/usr/bin/env python3
"""Tests Pilot-2.0-Planer (reine Rechnung).  python3 tools/trading/krypto_bot/test_pilot2_plan.py [mutante.py]"""
import importlib.util, random, sys
from pathlib import Path
pfad = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("pilot2_plan.py")
spec = importlib.util.spec_from_file_location("pp", pfad); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
n_ok = n_f = 0
def ok(c, t):
    global n_ok, n_f
    print(("✅ " if c else "❌ ") + t); n_ok += c; n_f += not c
R = {"spot_step": 1e-5, "perp_step": 1e-3, "spot_min": 5, "perp_min": 100}
B, K = 10000.0, 100000.0
nah = lambda a, b, tol=1e-4: abs(a - b) <= tol

# 1. Ziele: Netto-Richtung = z·B/Kurs und Kapitalbedarf = B (für viele z)
fehler = []
for z in [-1, -0.7, -0.3, 0, 0.2, 0.5, 1]:
    s, p, pf, rs, rp = P.ziele(z, B, K)
    if not nah((s + p) * K, z * B, 1e-6) or not nah(s * K + pf, B, 1e-6):
        fehler.append(z)
ok(not fehler, f"Netto-Richtung z·B und Kapital = B für alle z {fehler}")
# 2. Flach → voll long: nur Spot kaufen, kein Perp, kein Pfand
pl = P.plane("BTC", 1.0, B, K, 0.0, 0.0, R, max_auftrag=1e9)
ok(pl["schritte"] == [("spot", "BUY", 0.1, False)] and pl["pfand"] == 0, f"voll long = Spot-Kauf {pl['schritte']}")
# 3. Flach → voll short: nur Perp-Short, Pfand = B (+10 %)
pl = P.plane("BTC", -1.0, B, K, 0.0, 0.0, R, max_auftrag=1e9)
ok(pl["schritte"] == [("perp", "SELL", 0.1, False)] and nah(pl["pfand"], B * 1.1), f"voll short = Perp-Short {pl['schritte']}")
# 4. z = 0: Funding-Ernte, Spot und Short gleich gross (marktneutral)
pl = P.plane("BTC", 0.0, B, K, 0.0, 0.0, R, max_auftrag=1e9)
st = {(k, s): m for k, s, m, _ in pl["schritte"]}
ok(st[("spot", "BUY")] == st[("perp", "SELL")] == 0.05, f"Ernte GENAU marktneutral (gleiche Menge) {pl['schritte']}")
# 5. Wechsel long → short: zuerst verkaufen/verkleinern, dann vergrössern
pl = P.plane("BTC", -1.0, B, K, 0.1, 0.0, R, max_auftrag=1e9)
ok([x[:2] for x in pl["schritte"]] == [("spot", "SELL"), ("perp", "SELL")], f"Reihenfolge long→short {pl['schritte']}")
pl = P.plane("BTC", 1.0, B, K, 0.0, -0.1, R, max_auftrag=1e9)
ok([x[:2] for x in pl["schritte"]] == [("perp", "BUY"), ("spot", "BUY")] and pl["schritte"][0][3] is True, f"Reihenfolge short→long, reduceOnly {pl['schritte']}")
# 6. Im Band: keine Aufträge
s, p, *_ = P.ziele(0.8, B, K)
pl = P.plane("BTC", 0.9, B, K, s, p, R, max_auftrag=1e9)
ok(pl["schritte"] == [], "im Band (0,8 → 0,9) nichts tun")
# 7. Deckel je Auftrag
pl = P.plane("BTC", 1.0, B, K, 0.0, 0.0, R, max_auftrag=1000)
ok(pl["schritte"] == [("spot", "BUY", 0.01, False)], f"höchstens max_auftrag {pl['schritte']}")
# 8. Ernte zu klein für das Perp-Minimum → GAR KEINE Ernte (sonst ungesicherter Spot-Long)
pl = P.plane("ETH", 0.0, 100, 4000.0, 0.0, 0.0, R, max_auftrag=1e9)  # Ernte 0,012 ETH = 48 USDT < Perp-Minimum 100
ok(pl["schritte"] == [], f"zu kleine Ernte: weder Spot noch Perp {pl['schritte']}")
pl = P.plane("BTC", 0.5, 300, K, 0.0, 0.0, R, max_auftrag=1e9)
ok([x[:2] for x in pl["schritte"]] == [("spot", "BUY")] and abs(pl["schritte"][0][2] - 0.0015) < 1e-9, f"Richtung ja, zu kleine Ernte nein {pl['schritte']}")
# 9. Stops nur auf den Richtungsteil
pl = P.plane("BTC", 0.5, B, K, 0.0, 0.0, R, max_auftrag=1e9)
ok(nah(pl["stop_spot"], 0.05, 1e-5) and pl["stop_perp"] == 0, f"Stop long nur Richtung: {pl['stop_spot']}")
pl = P.plane("BTC", -0.5, B, K, 0.0, 0.0, R, max_auftrag=1e9)
ok(nah(pl["stop_perp"], 0.05, 1e-3) and pl["stop_spot"] == 0, f"Stop short nur Richtung: {pl['stop_perp']}")
# 10. Zufallsprobe: nach dem Plan (ohne Deckel) liegt der Bestand auf dem Ziel (±1 Schritt)
rnd = random.Random(3); fehler = 0
for _ in range(500):
    z = rnd.choice([-1, -0.6, -0.2, 0, 0.3, 0.7, 1]); s0 = rnd.choice([0, 0.03, 0.1]); p0 = rnd.choice([0, -0.04, -0.1])
    pl = P.plane("BTC", z, B, K, s0, p0, R, max_auftrag=1e9)
    s, p = s0, p0
    for k, seite, m, _ in pl["schritte"]:
        if k == "spot": s += m if seite == "BUY" else -m
        else: p += m if seite == "BUY" else -m
    zs, zp = pl["info"]["spot_ziel"], pl["info"]["perp_ziel"]
    if abs(s - zs) > 2e-5 + 1e-9 or abs(p - zp) > 2e-3 + 1e-9: fehler += 1
ok(fehler == 0, f"500 Zufallsfälle landen auf dem Ziel ({fehler} Abweichungen)")
# 11. Geld verschieben
ok(P.verschieben(5000, 1000, 1000, 8000, 0) == ("SPOT_ZU_FUTURES", 4000), "Pfand fehlt → aus Spot")
ok(P.verschieben(5000, 1000, 1000, 2000, 1500) == ("SPOT_ZU_FUTURES", 500), "nie mehr aus Spot, als frei ist")
ok(P.verschieben(0, 8000, 8000, 0, 5000) == ("FUTURES_ZU_SPOT", 5051.0), "Spot braucht Geld → aus Futures (+1 % Reserve)")
ok(P.verschieben(5000, 6000, 900, 0, 5000) == ("FUTURES_ZU_SPOT", 900), "nie mehr aus Futures, als abziehbar")
ok(P.verschieben(5000, 5000, 5000, 0, 0) is None, "nichts zu tun")
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
