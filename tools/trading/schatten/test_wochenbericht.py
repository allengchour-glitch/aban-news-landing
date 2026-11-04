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
# 8. Satelliten-Experiment (Top-10-Regel) im Bericht
def sat(n, **reihen):
    tage_ = [{"tag": f"2026-11-{k + 1:02d}", **{key: w[k] for key, w in reihen.items()}} for k in range(n)]
    return {"start": "2026-11-01", "tage": tage_, "reihen": {"S1": {"menge": {"SOLUSDT": 1.0, "ADAUSDT": 2.0}}, "S2": {"menge": {}}}}
sb = sat(3, S1=[10000, 9500, 9000], S2=[10000, 10000, 10100], BTC150=[10000, 10200, 10100], BTC=[10000, 9800, 9600])
sa = W.satellit_abschnitt(sb)
txt = "\n".join(sa)
ok(sa and "### Satelliten-Experiment (Top-10-Regel, Spielgeld), 3 Tage seit 2026-11-01" in txt, "Satellit: Überschrift mit Tagen und Start")
ok("| Top-10-Regel wie getestet | −10,0 % | −10,0 % |" in txt and "| Satellit (ohne Bitcoin und Ether) | +1,0 % | +0,0 % |" in txt, "Satellit: Tabellenzeilen mit Rendite und Einbruch")
ok("| Bitcoin gehalten (Vergleich) | −4,0 % | −4,0 % |" in txt and "Bitcoin mit Trend 150 (Vergleich)" in txt, "Satellit: beide Vergleichsreihen")
ok("Gehalten: S1: ADA, SOL; S2: nur USDT." in txt, "Satellit: gehaltene Coins ohne USDT-Endung, leere Reihe = nur USDT")
ok("bestand ihren Test am 13.10.2026 nicht" in txt and "Unter 8 Wochen ist das kein Urteil." in txt, "Satellit: ehrlicher Hinweis auf den nicht bestandenen Test und «kein Urteil»")
ok("Auch nach 8 Wochen noch kein Beweis." in "\n".join(W.satellit_abschnitt(sat(60, S1=[10000] * 60, S2=[10000] * 60))), "Satellit: ab 56 Tagen «noch kein Beweis»")
ok(W.satellit_abschnitt(None) == [] and W.satellit_abschnitt({}) == [] and W.satellit_abschnitt(sat(1, S1=[10000])) == [], "Satellit: ohne zweiten Tag kein Abschnitt")
ok("| Bitcoin gehalten" not in "\n".join(W.satellit_abschnitt(sat(3, S1=[1, 1, 1], S2=[1, 1, 1]))), "Satellit: fehlende Reihen werden übersprungen")
ok("Satelliten-Experiment" in W.abschnitt(lb, sb)[1] and "Satelliten-Experiment" not in W.abschnitt(lb)[1], "abschnitt: mit Satelliten-Buch ein Zusatz, ohne nicht (alte Aufrufe unverändert)")
for n_t, wort in ((30, "Unter 8 Wochen ist das kein Urteil."), (55, "Unter 8 Wochen ist das kein Urteil."), (56, "Auch nach 8 Wochen noch kein Beweis.")):
    ok(wort in "\n".join(W.satellit_abschnitt(sat(n_t, S1=[10000] * n_t, S2=[10000] * n_t))), f"Satellit: bei {n_t} Tagen «{wort}»")
with tempfile.TemporaryDirectory() as d:
    f = Path(d) / "b.md"
    W.schreiben(lb, f, sb=sb)
    ok("Satelliten-Experiment" in f.read_text(encoding="utf-8"), "schreiben: der Zusatz landet in der Berichtsdatei")
# 9. Scalping-Labor (Papier) im Bericht
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "krypto_bot"))
import scalping_kern as K
import scalping_labor as SL
T0 = int(datetime(2026, 11, 2, tzinfo=timezone.utc).timestamp() * 1000)
def labor(trades_btc, trades_eth, tage=1.0, kosten_null=False):
    buch = SL.neues_buch(T0 + int(tage * 86_400_000))
    buch["daten_ab"] = T0
    buch["start"] = "2026-11-03T00:00:00+00:00"
    for sym, k, trades in (("BTCUSDT", 2.0, trades_btc), ("ETHUSDT", 3.5, trades_eth)):
        m = {"weiter_ab": T0 + int(tage * 86_400_000) + 60_000, "letzte_kerze": T0 + int(tage * 86_400_000), "luecken": 0, "buecher": {str(kk): SL.neues_band_buch(kk) for kk in SL.STUFEN}}
        kosten = {"M": 0.0, "T": 0.0, "slip": 0.0} if kosten_null else SL.kosten_von(sym)
        for tr in trades:
            SL.buche(m["buecher"][str(k)], tr, kosten, 0)
        buch["maerkte"][sym] = m
    return buch
def handel(i, ein, aus, art="M", s=1):
    return (T0 + i * 60_000, T0 + i * 60_000 + 60_000, s, ein, aus, "M", art)
gewinn, verlust = (100.0, 100.1), (100.0, 99.8)
lab0 = labor([handel(0, *gewinn), handel(1, *gewinn), handel(2, *gewinn), handel(3, *verlust)], [handel(0, *gewinn), handel(1, *gewinn)], kosten_null=True)
la = W.labor_abschnitt(lab0)
lt = "\n".join(la)
ok(la and "### Scalping-Labor (Papier, echte Kurse, mit Gebühren), 1,0 Tage seit 2026-11-02" in lt, "Labor: Überschrift mit Tagen und Beginn der Daten (nicht dem Startdatum des Buchs)")
ok("| BTC | 2,0 | 4 | 75 % | +2,5 bp | +2,5 bp | −9,6 bp | +0,1 % |" in lt, "Labor: BTC-Zeile mit exakten Zahlen und der Erwartung des Prüfstands")
ok("| ETH | 3,5 | 2 | 100 % | +10,0 bp | +10,0 bp | −7,5 bp | +0,2 % |" in lt, "Labor: ETH-Zeile mit der Erwartung der eigenen Stufe")
ok(lt.count("\n| BTC |") + lt.count("\n| ETH |") == 2, "Labor: Bücher ohne Handel haben keine Zeile")
ok("Urteil (vorab festgelegt): zu wenig Daten" in lt and "Papier, kein Geld im Spiel" in lt and "alle sieben Scalping-Verfahren" in lt, "Labor: Urteil und ehrlicher Hinweis stehen drin")
ok(W.labor_abschnitt(None) == [] and W.labor_abschnitt({}) == [] and W.labor_abschnitt({"maerkte": {}}) == [] and W.labor_abschnitt(labor([], [])) == [], "Labor: ohne Buch oder ohne Handel kein Abschnitt")
ok(W.labor_abschnitt({"maerkte": {"BTCUSDT": "kaputt"}}) == [] and W.labor_abschnitt({"maerkte": {"BTCUSDT": {"buecher": 5}}}) == [], "Labor: ein kaputtes Buch verhindert den Bericht nicht (leerer Abschnitt statt Absturz)")
# Kosten je Trade: gewichtetes Mittel über alle Handel mit den echten Kosten, mit dem Prüfstand (K) gegengerechnet
tr_b = [handel(0, *gewinn), handel(1, *gewinn), handel(2, *verlust), handel(3, 100.0, 100.3, "T")]
tr_e = [handel(0, *gewinn, art="T"), handel(1, *verlust)]
lab1 = labor(tr_b, tr_e)
erwartet = sum(1e4 * (K.brutto(x) - K.netto(x, SL.kosten_von("BTCUSDT"))) for x in tr_b) + sum(1e4 * (K.brutto(x) - K.netto(x, SL.kosten_von("ETHUSDT"))) for x in tr_e)
erwartet /= len(tr_b) + len(tr_e)
ok(f"im Mittel {SL._de(erwartet)} bp" in "\n".join(W.labor_abschnitt(lab1)), f"Labor: Kosten je Trade = gewichtetes Mittel über alle Handel ({SL._de(erwartet)} bp)")
# Einhängen: nach dem Satelliten, nur mit Buch; alte Aufrufe unverändert
mit_alles = W.abschnitt(lb, sb, lab0)[1]
ok("Scalping-Labor" in mit_alles and mit_alles.index("Satelliten-Experiment") < mit_alles.index("Scalping-Labor"), "abschnitt: das Labor steht nach dem Satelliten")
ok("Scalping-Labor" not in W.abschnitt(lb)[1] and "Scalping-Labor" not in W.abschnitt(lb, sb)[1], "abschnitt: ohne Labor-Buch kein Zusatz (alte Aufrufe unverändert)")
with tempfile.TemporaryDirectory() as d:
    f = Path(d) / "b.md"
    W.schreiben(lb, f, sb=sb, lab=lab0)
    ok("Scalping-Labor (Papier" in f.read_text(encoding="utf-8"), "schreiben: das Labor landet in der Berichtsdatei")
ok(W.LABOR.name == "krypto-scalping-labor.json" and W.LABOR.parent.name == "data", "Pfad: das Buch, das der Cloud-Job und der PC schreiben")
print(f"\n{ok_n} bestanden, {fail} fehlgeschlagen"); sys.exit(1 if fail else 0)
