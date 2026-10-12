#!/usr/bin/env python3
"""Tests Funding-Ernte (ohne Netz).  python3 tools/trading/krypto_bot/test_carry.py [mutante.py]"""
import importlib.util, sys
from pathlib import Path
pfad = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("carry_pruefung.py")
spec = importlib.util.spec_from_file_location("cp", pfad); C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)
n_ok = n_f = 0
def ok(c, t):
    global n_ok, n_f
    print(("✅ " if c else "❌ ") + t); n_ok += c; n_f += not c

def fund(raten_pro_tag):
    """{Tag: [3 Raten]} → (Summe, Einzeln)"""
    return ({d: sum(v) for d, v in raten_pro_tag.items()}, dict(raten_pro_tag))
tage = [f"2022-01-{i:02d}" for i in range(1, 21)]
plus = fund({d: [0.0001] * 3 for d in tage})
# 1. Immer an, ohne Kosten: täglich 0.0003 Funding / 1.5 Kapital = 0.0002
r = C.simuliere({"BTC": plus}, ["BTC"], False, tage, kosten=0)
ok(all(abs(x - 0.0002) < 1e-12 for _, x in r), "Tagesertrag = Funding ÷ Kapitalfaktor")
# 2. Einstiegskosten am ersten Tag: 0.0015 / 1.5 = 0.001 abgezogen
r = C.simuliere({"BTC": plus}, ["BTC"], False, tage)
ok(abs(r[0][1] - (0.0002 - 0.001)) < 1e-12 and abs(r[1][1] - 0.0002) < 1e-12, "Kosten nur beim Wechsel")
# 3. Negatives Funding kostet den Short
minus = fund({d: [-0.0001] * 3 for d in tage})
r = C.simuliere({"BTC": minus}, ["BTC"], False, tage, kosten=0)
ok(all(x < 0 for _, x in r), "negatives Funding = Verlust")
# 4. Filter: erst nach 7 Tagen (21 Zahlungen) Daten offen, und nur bei positivem Schnitt
r = C.simuliere({"BTC": plus}, ["BTC"], True, tage, kosten=0)
ok(all(x == 0 for _, x in r[:7]) and r[7][1] > 0, "Filter wartet 7 Tage, dann offen")
r = C.simuliere({"BTC": minus}, ["BTC"], True, tage, kosten=0)
ok(all(x == 0 for _, x in r), "Filter bleibt bei negativem Funding draussen")
# 5. Kein Blick in die Zukunft: Tag 8 hat hohes Funding, Fenster davor negativ → Tag 8 bleibt flach
gemischt = {d: [-0.0001] * 3 for d in tage[:7]}
gemischt.update({d: [0.001] * 3 for d in tage[7:]})
r = C.simuliere({"BTC": fund(gemischt)}, ["BTC"], True, tage, kosten=0)
ok(r[7][1] == 0, "Entscheid nur mit Daten bis Vortag")
# 6. Anteil: zwei Coins, einer ohne Kontrakt (kein Tag) → nur halbes Kapital verdient
r = C.simuliere({"BTC": plus, "NEU": fund({})}, ["BTC", "NEU"], False, tage, kosten=0)
ok(abs(r[5][1] - 0.0001) < 1e-12, "fester Anteil je Coin, fehlender Kontrakt = Bargeld")
# 7. Kennzahlen: Einbruch und Jahresrendite
k = C.kennz([("a", 0.1), ("b", -0.5), ("c", 0.2)])
ok(abs(k["einbruch"] + 0.5) < 1e-12, f"Einbruch {k['einbruch']}")
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
