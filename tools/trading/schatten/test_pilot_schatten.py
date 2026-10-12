#!/usr/bin/env python3
"""Tests Schattenbuch Krypto-Pilot (ohne Netz).  python3 tools/trading/schatten/test_pilot_schatten.py [mutante.py]"""
import importlib.util, sys
from pathlib import Path
pfad = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("pilot_schatten.py")
spec = importlib.util.spec_from_file_location("ps", pfad); S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
ok_n = fail = 0
def ok(c, t):
    global ok_n, fail
    print(("✅ " if c else "❌ ") + t); ok_n += c; fail += not c
E = lambda m, s, k, h: {"markt": m, "stand": s, "kurs": k, "hebel": h}
# 1. Start: Kapital 10 000, keine Rendite
lb = {}
ok(S.verbuchen(lb, [E("BTC", "2026-10-10", 100, 1.0), E("ETH", "2026-10-10", 10, -0.5)], 0, 0) and lb["tage"][0]["kapital"] == 10000, "Start 10 000")
# 2. Gleicher Stand nochmals → nichts
ok(not S.verbuchen(lb, [E("BTC", "2026-10-10", 120, 1.0), E("ETH", "2026-10-10", 10, -0.5)], 0, 0) and len(lb["tage"]) == 1, "idempotent")
# 3. Ohne Kosten: BTC +10 % mit 1×, ETH +10 % mit −0.5× (je Anteil 0.5) → 0.05 − 0.025 = +2.5 %
S.verbuchen(lb, [E("BTC", "2026-10-11", 110, 1.0), E("ETH", "2026-10-11", 11, -0.5)], 0, 0)
ok(abs(lb["tage"][-1]["kapital"] - 10250) < 0.01, f"Long gewinnt, Short verliert: {lb['tage'][-1]['kapital']}")
# 4. Rendite zählt mit dem ALTEN Hebel (Hebelwechsel heute wirkt erst morgen): BTC flach → 0 % trotz neuem Hebel 2×
k = lb["tage"][-1]["kapital"]
S.verbuchen(lb, [E("BTC", "2026-10-12", 110, 2.0), E("ETH", "2026-10-12", 11, -0.5)], 0, 0)
ok(abs(lb["tage"][-1]["kapital"] - k) < 0.01, "Hebelwechsel ohne Kursänderung: 0")
# 4b. Kurs steigt UND Hebel wechselt am selben Tag: Rendite mit dem GESTRIGEN Hebel (2×, Anteil 0.5): +10 % → +10 %
k = lb["tage"][-1]["kapital"]
S.verbuchen(lb, [E("BTC", "2026-10-13", 121, 0.0), E("ETH", "2026-10-13", 11, -0.5)], 0, 0)
ok(abs(lb["tage"][-1]["kapital"] / k - 1.10) < 1e-6, f"Rendite mit gestrigem Hebel: {lb['tage'][-1]['kapital'] / k:.4f}")
# 5. Gebühr auf Hebeländerung: Δ1.0 bei Anteil 0.5 und 0.05 % → −0.025 %
lb2 = {}
S.verbuchen(lb2, [E("BTC", "2026-01-01", 100, 0.0)], 0.0005, 0)
S.verbuchen(lb2, [E("BTC", "2026-01-02", 100, 1.0)], 0.0005, 0)
ok(abs(lb2["tage"][-1]["kapital"] - 10000 * (1 - 0.0005)) < 0.01, f"Gebühr: {lb2['tage'][-1]['kapital']}")
# 6. Funding über 2 Tage für Long 1×: 0.0001 × 3 × 2
S.verbuchen(lb2, [E("BTC", "2026-01-04", 100, 1.0)], 0, 0.0001)
ok(abs(lb2["tage"][-1]["rendite"] + 0.0006) < 1e-9, f"Funding 2 Tage: {lb2['tage'][-1]['rendite']}")
# 7. Bericht nennt Bitcoin-Vergleich und Einbruch
b = S.bericht(lb)
ok("Bitcoin halten" in b and "+21.0 %" in b and "Einbruch" in b, "Bericht mit Vergleich")
# 8. Älterer Stand wird nicht verbucht
ok(not S.verbuchen(lb, [E("BTC", "2026-10-01", 50, 1.0), E("ETH", "2026-10-01", 5, 1.0)], 0, 0), "älterer Stand ignoriert")
# 9. Echtes Funding (P0): Long 1× zahlt f, ohne Kursänderung → −f × Anteil (1 Markt = ganzes Kapital)
lb3 = {}
S.verbuchen(lb3, [E("BTC", "2026-01-01", 100, 1.0)], 0, 0, funding={"BTC": 0.001})
S.verbuchen(lb3, [E("BTC", "2026-01-02", 100, 1.0)], 0, 0, funding={"BTC": 0.001})
ok(abs(lb3["tage"][-1]["rendite"] + 0.001) < 1e-12, f"P0 Long zahlt echtes Funding: {lb3['tage'][-1]['rendite']}")
# 10. P2: Long über Spot zahlt KEIN Funding; Short bekommt Funding; halber Hebel parkt die andere Hälfte (÷1.5)
lb4 = {}
S.verbuchen(lb4, [E("BTC", "2026-01-01", 100, 1.0)], 0, 0, schluessel="tage_p2", modus="P2")
S.verbuchen(lb4, [E("BTC", "2026-01-02", 100, 1.0)], 0, 0, funding={"BTC": 0.001}, schluessel="tage_p2", modus="P2")
ok(lb4["tage_p2"][-1]["rendite"] == 0, "P2 Spot-Long ohne Funding")
lb5 = {}
S.verbuchen(lb5, [E("BTC", "2026-01-01", 100, -0.5)], 0, 0, schluessel="tage_p2", modus="P2")
S.verbuchen(lb5, [E("BTC", "2026-01-02", 100, -0.5)], 0, 0, funding={"BTC": 0.003}, schluessel="tage_p2", modus="P2")
soll = 0.5 * 0.003 + 0.5 / 1.5 * 0.003
ok(abs(lb5["tage_p2"][-1]["rendite"] - soll) < 1e-12, f"P2 Short + Parkplatz kassieren Funding: {lb5['tage_p2'][-1]['rendite']} (soll {soll})")
# 11. P2-Gebühr: Einstieg Long 0→1 kostet Spot 0,10 % + Parkplatz-Abbau 1/1.5 × 0,15 %
lb6 = {}
S.verbuchen(lb6, [E("BTC", "2026-01-01", 100, 0.0)], 0.0005, 0, schluessel="tage_p2", modus="P2")
S.verbuchen(lb6, [E("BTC", "2026-01-02", 100, 1.0)], 0.0005, 0, funding={"BTC": 0.0}, schluessel="tage_p2", modus="P2")
soll = -(0.001 + 1 / 1.5 * 0.0015)
ok(abs(lb6["tage_p2"][-1]["rendite"] - soll) < 1e-12, f"P2 Gebühren: {lb6['tage_p2'][-1]['rendite']} (soll {soll:.6f})")
# 12. Fehlt echtes Funding → Schätzung 0,01 %/8 h × Tage
lb7 = {}
S.verbuchen(lb7, [E("BTC", "2026-01-01", 100, 1.0)], 0, 0.0001)
S.verbuchen(lb7, [E("BTC", "2026-01-03", 100, 1.0)], 0, 0.0001, funding={})
ok(abs(lb7["tage"][-1]["rendite"] + 0.0006) < 1e-12, "Schätzung, wenn Funding fehlt")
print(f"\n{ok_n} bestanden, {fail} fehlgeschlagen"); sys.exit(1 if fail else 0)
