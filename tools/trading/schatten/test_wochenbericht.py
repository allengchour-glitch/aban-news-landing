#!/usr/bin/env python3
"""Tests Wochenbericht Schattenkonto (ohne Netz).  python3 tools/trading/schatten/test_wochenbericht.py [mutante.py]"""
import importlib.util, sys, tempfile
from pathlib import Path
pfad = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("wochenbericht.py")
spec = importlib.util.spec_from_file_location("wb", pfad); W = importlib.util.module_from_spec(spec); spec.loader.exec_module(W)
ok_n = fail = 0
def ok(c, t):
    global ok_n, fail
    print(("✅ " if c else "❌ ") + t); ok_n += c; fail += not c
def tag(stand, kap, btc, eth, hb=1.0, he=1.0):
    return {"stand": stand, "kapital": kap, "rendite": 0.0, "maerkte": {"BTC": {"kurs": btc, "hebel": hb}, "ETH": {"kurs": eth, "hebel": he}}}
# 1. Einbruch = schlimmster Rückgang vom bisherigen Hoch
ok(abs(W.einbruch([100, 120, 90, 110]) + 0.25) < 1e-12, "Einbruch: 120 → 90 = −25 %")
ok(W.einbruch([100, 110, 120]) == 0.0, "Einbruch: nur Anstieg = 0")
# 2. Zeilen: Pilot, Halten, 50/50 (BTC +10 %, ETH −10 % → 50/50 genau 0)
lb = {"tage": [tag("2026-10-11", 10000, 100, 10), tag("2026-10-18", 9500, 105, 9.5), tag("2026-11-01", 9300, 110, 9)],
      "tage_p2": [tag("2026-10-11", 10000, 100, 10), tag("2026-11-01", 9800, 110, 9)]}
z = {n: (r, e) for n, r, e in W.zeilen(lb)}
ok(abs(z["Pilot (alles Futures)"][0] + 0.07) < 1e-12 and abs(z["Pilot (alles Futures)"][1] + 0.07) < 1e-12, f"Pilot −7 %, Einbruch −7 %: {z['Pilot (alles Futures)']}")
ok(abs(z["Pilot 2.0 (Spot-Long + Parkplatz)"][0] + 0.02) < 1e-12, "Pilot 2.0 −2 %")
ok(abs(z["Bitcoin gehalten"][0] - 0.10) < 1e-12 and abs(z["Ethereum gehalten"][0] + 0.10) < 1e-12, "BTC +10 %, ETH −10 %")
ok(abs(z["50/50 BTC und ETH gehalten"][0]) < 1e-12, f"50/50 genau 0: {z['50/50 BTC und ETH gehalten']}")
# 3. Abschnitt: Stand, Tage, Zahlen mit Minus-Zeichen, kurze Zeit = kein Urteil
stand, md = W.abschnitt(lb)
ok(stand == "2026-11-01" and "## Stand 2026-11-01: 21 Tage seit 2026-10-11" in md, "Kopf: Stand und Tage")
ok("| Pilot (alles Futures) | −7,0 % | −7,0 % |" in md, "Tabellenzeile mit Unicode-Minus und Komma")
ok("zu kurz für ein Urteil" in md and "3.0 Wochen" in md, "nach 3 Wochen: ausdrücklich kein Urteil")
ok("Pilot gegen 50/50 gehalten: −7,0 Prozentpunkte." in md, "Abstand zu 50/50")
ok("BTC +1.00×, ETH +1.00×" in md, "aktuelle Position")
# 4. Lange Laufzeit: keine «zu kurz»-Aussage, aber der Hinweis auf eine Marktphase
lang = {"tage": [tag("2026-01-01", 10000, 100, 10), tag("2026-03-15", 11000, 120, 12)]}
md2 = W.abschnitt(lang)[1]
ok("zu kurz" not in md2 and "Marktphase" in md2, "ab 8 Wochen: Mindestdauer, aber nur eine Marktphase")
# 5. Zu wenig Tage
ok(W.abschnitt({"tage": [tag("2026-10-11", 10000, 100, 10)]}) == ("", "Noch zu wenig Tage im Schattenkonto für einen Bericht."), "ein Tag: kein Bericht")
ok(W.abschnitt({})[0] == "", "leeres Logbuch: kein Bericht")
# 6. Schreiben ist idempotent je Stand, neuer Stand hängt an, Kopf nur einmal
with tempfile.TemporaryDirectory() as d:
    f = Path(d) / "docs" / "KRYPTO-WOCHENBERICHT.md"
    ok(W.schreiben(lb, f) == "geschrieben" and f.exists(), "erstes Schreiben legt Datei (und Ordner) an")
    ok(W.schreiben(lb, f) == "schon drin", "gleicher Stand: nichts doppelt")
    lb["tage"].append(tag("2026-11-08", 9400, 111, 9.1))
    ok(W.schreiben(lb, f) == "geschrieben", "neuer Stand wird angehängt")
    t = f.read_text(encoding="utf-8")
    ok(t.count("# Krypto-Wochenbericht") == 1 and t.count("## Stand ") == 2, "Kopf einmal, zwei Abschnitte")
    ok(W.schreiben({"tage": []}, f) == "zu wenig Tage", "ohne Daten wird nichts geschrieben")
# 7. Kaputtes Logbuch → leer statt Absturz
with tempfile.TemporaryDirectory() as d:
    k = Path(d) / "kaputt.json"; k.write_text("{nicht json", encoding="utf-8")
    ok(W.lies(k) == {} and W.lies(Path(d) / "gibtsnicht.json") == {}, "kaputte oder fehlende Datei = leeres Logbuch")
print(f"\n{ok_n} bestanden, {fail} fehlgeschlagen"); sys.exit(1 if fail else 0)
