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
# 9. Gesundheit der Messreihen (Backlog 6): fehlende, doppelte, veraltete Tage, ausgefallenes Labor, fehlende Satelliten-Kurse.
#    Alles mit FESTEM «Jetzt» (JETZT): nichts hängt von der echten Uhr ab (ein Test, der es tut, fällt irgendwann still um).
from datetime import datetime, timedelta, timezone
JETZT = datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc)
def tg(*zahlen): return [f"2026-11-{z:02d}" for z in zahlen]
ok(W.reihe_pruefen("Pilot", tg(1, 2, 3, 4)) == [], "Reihe: lückenlos = keine Befunde")
ok(W.reihe_pruefen("Pilot", []) == [] and W.reihe_pruefen("Pilot", tg(5)) == [], "Reihe: leer oder ein einziger Tag = keine Befunde")
ok(W.reihe_pruefen("Pilot", tg(1, 2, 4)) == ["Pilot: 1 Tag fehlt (2026-11-03)"], "Reihe: ein fehlender Tag, genau benannt (Einzahl)")
ok(W.reihe_pruefen("Pilot", tg(1, 5)) == ["Pilot: 3 Tage fehlen (2026-11-02, 2026-11-03, 2026-11-04)"], "Reihe: drei fehlende Tage, alle benannt (Mehrzahl)")
ok(W.reihe_pruefen("Pilot", tg(1, 7)) == ["Pilot: 5 Tage fehlen (2026-11-02, 2026-11-03, 2026-11-04, 2026-11-05, 2026-11-06)"], "Reihe: genau fünf fehlende Tage stehen ohne «…»")
ok(W.reihe_pruefen("Pilot", tg(1, 8)) == ["Pilot: 6 Tage fehlen (2026-11-02, 2026-11-03, 2026-11-04, 2026-11-05, 2026-11-06, …)"], "Reihe: ab sechs fehlenden Tagen nur fünf benannt, dann «…»")
ok(W.reihe_pruefen("Pilot", ["2026-10-31", "2026-11-02"]) == ["Pilot: 1 Tag fehlt (2026-11-01)"], "Reihe: Lücke über den Monatswechsel")
ok(W.reihe_pruefen("Pilot", tg(1, 2, 2, 3)) == ["Pilot: Tag doppelt eingetragen (2026-11-02)"], "Reihe: doppelter Tag, sonst nichts")
ok(W.reihe_pruefen("Pilot", tg(1, 3, 2, 4)) == ["Pilot: Einträge nicht nach Datum geordnet"], "Reihe: durcheinander, aber vollständig = nur die Reihenfolge, KEINE erfundene Lücke")
ok(W.reihe_pruefen("Pilot", ["2026-11-01", None, "kaputt", 12345, "2026-11-02"]) == ["Pilot: 3 Einträge ohne lesbares Datum"], "Reihe: unlesbare Einträge werden gezählt (Mehrzahl)")
ok(W.reihe_pruefen("Pilot", ["2026-11-01", None, "2026-11-02"]) == ["Pilot: 1 Eintrag ohne lesbares Datum"], "Reihe: ein unlesbarer Eintrag (Einzahl)")
ok(W.reihe_pruefen("Pilot", tg(3, 1, 1, 5)) == ["Pilot: 2 Tage fehlen (2026-11-02, 2026-11-04)", "Pilot: Tag doppelt eingetragen (2026-11-01)", "Pilot: Einträge nicht nach Datum geordnet"], "Reihe: alle drei Befunde zugleich, in fester Reihenfolge")
ok(W.reihe_pruefen("Satellit", ["2026-11-03T04:00:00Z", "2026-11-04T04:00:00Z"]) == [], "Reihe: auch Zeitstempel mit Uhrzeit zählen als Tag")
H = JETZT.date()
ok(W.alter_pruefen("Pilot", tg(7), H) == [], "Alter: gestern = in Ordnung")
ok(W.alter_pruefen("Pilot", tg(6), H) == [], "Alter: genau zwei Tage (MAX_ALTER_TAGE) = noch in Ordnung")
a3 = W.alter_pruefen("Pilot", tg(5), H)
ok(len(a3) == 1 and "letzter Eintrag vom 2026-11-05, 3 Tage her" in a3[0], "Alter: drei Tage = Befund mit Tag und Alter")
ok(W.alter_pruefen("Pilot", tg(7, 1), H) == [], "Alter: massgebend ist der jüngste Tag, nicht der letzte Eintrag in der Liste")
ok(W.alter_pruefen("Pilot", [], H) == [] and W.alter_pruefen("Pilot", [None, "x"], H) == [], "Alter: ohne lesbaren Tag keine Aussage (das meldet die Reihenprüfung)")
def lauf(stunden, **kw): return {"letzter_lauf": {"zeit": (JETZT - timedelta(hours=stunden)).isoformat(), "hinweise": [], **kw}}
ok(W.labor_pruefen(lauf(47), JETZT) == [] and W.labor_pruefen(lauf(48), JETZT) == [], "Labor: bis genau 48 Stunden = in Ordnung")
l49 = W.labor_pruefen(lauf(49), JETZT)
ok(len(l49) == 1 and "letzter Lauf vor 49 Stunden (2026-11-06 11:00 UTC)" in l49[0], "Labor: 49 Stunden = Befund mit Alter und Zeitpunkt")
ok(W.labor_pruefen({"letzter_lauf": {"zeit": "2026-11-08T11:22:57Z", "hinweise": []}}, JETZT) == [], "Labor: Zeitstempel mit «Z» wird gelesen")
ok(W.labor_pruefen({"letzter_lauf": {"zeit": "2026-11-08T11:22:57", "hinweise": []}}, JETZT) == [], "Labor: Zeitstempel ohne Zeitzone gilt als UTC")
ok(len(W.labor_pruefen({"letzter_lauf": {"zeit": "2026-11-06T12:00:00+02:00"}}, JETZT)) == 1 and W.labor_pruefen({"letzter_lauf": {"zeit": "2026-11-06T09:00:00-05:00"}}, JETZT) == [],
   "Labor: Zeitzone wird nach UTC umgerechnet (12:00+02:00 = 10:00 UTC = 50 Stunden her; 09:00-05:00 = 14:00 UTC = 46 Stunden her)")
lz = W.labor_pruefen({"letzter_lauf": {"zeit": "2026-11-06T04:00:00-05:00"}}, JETZT)
ok(len(lz) == 1 and "vor 51 Stunden (2026-11-06 09:00 UTC)" in lz[0], "Labor: die Ausgabe nennt die Zeit in UTC, nicht in der Ortszeit des Eintrags (04:00-05:00 = 09:00 UTC)")
ok(W.labor_pruefen({"letzter_lauf": {"zeit": "gestern"}}, JETZT) == ["Labor: Zeitstempel des letzten Laufs fehlt oder ist unlesbar"]
   and W.labor_pruefen({"letzter_lauf": {}}, JETZT) == ["Labor: Zeitstempel des letzten Laufs fehlt oder ist unlesbar"], "Labor: fehlender oder unlesbarer Zeitstempel wird gemeldet")
ok(W.labor_pruefen({}, JETZT) == [] and W.labor_pruefen(None, JETZT) == [] and W.labor_pruefen({"letzter_lauf": None}, JETZT) == [], "Labor: noch nie gelaufen = keine Aussage")
ok(W.labor_pruefen(lauf(1, hinweise=["a", "b", "c", "d"]), JETZT) == ["Labor-Hinweis: a", "Labor-Hinweis: b", "Labor-Hinweis: c"], "Labor: höchstens drei eigene Hinweise")
ok(W.labor_pruefen(lauf(1, hinweise="kaputt"), JETZT) == [] and W.labor_pruefen(lauf(1, hinweise=None), JETZT) == [], "Labor: Hinweise, die keine Liste sind, werden ignoriert")
ok(W.labor_pruefen(lauf(-5), JETZT) == [], "Labor: ein Lauf «in der Zukunft» (falsche Uhr) ist kein Ausfall")
ok(W.satellit_pruefen({"fehlende_coins": []}) == [] and W.satellit_pruefen(None) == [] and W.satellit_pruefen({}) == [] and W.satellit_pruefen({"fehlende_coins": "x"}) == [], "Satellit: nichts fehlt (oder kein Buch) = keine Befunde")
ok(W.satellit_pruefen({"fehlende_coins": ["PEPEUSDT"]}) == ["Satellit: für 1 Coin fehlten die Kurse (PEPEUSDT)"], "Satellit: ein Coin ohne Kurs (Einzahl)")
ok(W.satellit_pruefen({"fehlende_coins": [f"C{i}USDT" for i in range(7)]}) == ["Satellit: für 7 Coins fehlten die Kurse (C0USDT, C1USDT, C2USDT, C3USDT, C4USDT, …)"], "Satellit: sieben Coins, fünf benannt, dann «…»")
lbg = {"tage": [tag(s, 10000, 100, 10) for s in tg(4, 5, 6, 7)], "tage_p2": [tag(s, 10000, 100, 10) for s in tg(4, 5, 6, 7)]}
sbg = {"tage": [{"tag": s} for s in tg(5, 6, 7)], "fehlende_coins": []}
g1 = "\n".join(W.gesundheit_abschnitt(lbg, sbg, lauf(20), JETZT))
ok("### Gesundheit der Messreihen" in g1 and "Alle Messreihen lückenlos und aktuell: Pilot 4 Tage bis 2026-11-07; Pilot 2.0 4 Tage bis 2026-11-07; Satellit 3 Tage bis 2026-11-07; Labor zuletzt 2026-11-07 16:00 UTC." in g1,
   "Abschnitt: alles in Ordnung = ein Satz mit Tagen, Stand und Laborzeit")
ok("Auffälligkeiten" not in g1, "Abschnitt: in Ordnung heisst keine «Auffälligkeiten»")
lbk = {"tage": [tag(s, 1, 1, 1) for s in tg(1, 2, 4)], "tage_p2": lbg["tage_p2"]}
g2 = "\n".join(W.gesundheit_abschnitt(lbk, sbg, lauf(60), JETZT))
ok("Auffälligkeiten" in g2 and "- Pilot: 1 Tag fehlt (2026-11-03)" in g2 and "- Pilot: letzter Eintrag vom 2026-11-04, 4 Tage her" in g2 and "- Labor: letzter Lauf vor 60 Stunden" in g2 and "lückenlos und aktuell" not in g2,
   "Abschnitt: Lücke, veralteter Pilot und ausgefallenes Labor stehen als Liste da")
ok("- Pilot 2.0" not in g2 and "- Satellit" not in g2, "Abschnitt: nur die auffälligen Reihen werden genannt")
ok("verzerren Rendite und Einbruch" in g2, "Abschnitt: sagt, dass fehlende Tage die Kennzahlen verzerren")
g3 = "\n".join(W.gesundheit_abschnitt(lbg, {"tage": [{"tag": s} for s in tg(5, 7)], "fehlende_coins": ["XUSDT"]}, None, JETZT))
ok("- Satellit: 1 Tag fehlt (2026-11-06)" in g3 and "- Satellit: für 1 Coin fehlten die Kurse (XUSDT)" in g3, "Abschnitt: Satellit-Lücke und fehlende Kurse")
ok(W.gesundheit_abschnitt(lbg, sbg, lauf(20), datetime(2026, 11, 8, 12, 0)) == W.gesundheit_abschnitt(lbg, sbg, lauf(20), JETZT), "Abschnitt: ein «Jetzt» ohne Zeitzone gilt als UTC")
ok(W.gesundheit_abschnitt({}, None, None, JETZT)[-1] == "Keine Messreihe zum Prüfen.", "Abschnitt: ohne jede Reihe ein ehrlicher Satz statt eines leeren «Alles in Ordnung»")
ok("ß" not in g1 + g2 + g3, "Abschnitt: Schweizer Schreibweise (kein ß)")
for kaputt in (None, {}, {"tage": "kein"}, {"tage": [1, 2, None]}, {"tage": [{"stand": "x"}]}, {"tage": 5, "tage_p2": {"a": 1}}, {"tage": [[], {}]}):
    gk = W.gesundheit_abschnitt(kaputt, kaputt, kaputt, JETZT)
    ok(isinstance(gk, list) and "### Gesundheit der Messreihen" in gk, f"Abschnitt: kaputtes Buch {kaputt!r} = kein Absturz")
# ... und sie sagen dabei das Richtige (nicht einfach «Prüfung nicht möglich»)
ok("\n".join(W.gesundheit_abschnitt({"tage": "kein"}, None, None, JETZT)).endswith("Keine Messreihe zum Prüfen."), "kaputt: «tage» ist keine Liste = keine Reihe zum Prüfen")
ok("- Pilot: 3 Einträge ohne lesbares Datum" in W.gesundheit_abschnitt({"tage": [1, 2, None]}, None, None, JETZT), "kaputt: Einträge, die keine Objekte sind, werden als «ohne lesbares Datum» gezählt")
ok("- Pilot: 1 Eintrag ohne lesbares Datum" in W.gesundheit_abschnitt({"tage": [{"stand": "x"}]}, None, None, JETZT), "kaputt: ein Eintrag mit unlesbarem Datum")
class Boese(dict):
    def get(self, *a, **k): raise RuntimeError("Buch zerbrochen")
ok(W.gesundheit_abschnitt(Boese(), None, None, JETZT)[-1] == "Prüfung nicht möglich: die Daten sind unlesbar.", "kaputt: wirft das Buch selbst einen Fehler, sagt der Abschnitt es ehrlich statt abzustürzen")
stand_g, md_g = W.abschnitt(lbg, sbg, None, JETZT)
ok(stand_g == "2026-11-07" and "### Gesundheit der Messreihen" in md_g, "abschnitt: der Gesundheits-Abschnitt hängt am Bericht")
ok("Satelliten-Experiment" in md_g and md_g.index("Satelliten-Experiment") < md_g.index("Gesundheit der Messreihen"), "abschnitt: Gesundheit steht nach dem Satelliten")
md_l = W.abschnitt(lb, sb, lab0, JETZT)[1]
ok(md_l.index("Scalping-Labor") < md_l.index("Gesundheit der Messreihen"), "abschnitt: Gesundheit steht nach dem Labor, ganz am Schluss")
ok(W.abschnitt({"tage": [tag("2026-10-11", 10000, 100, 10)]}, jetzt=JETZT) == ("", "Noch zu wenig Tage im Schattenkonto für einen Bericht."), "abschnitt: zu wenig Tage bleibt unverändert, auch mit «Jetzt»")
with tempfile.TemporaryDirectory() as d:
    f = Path(d) / "b.md"
    ok(W.schreiben(lbg, f, sb=sbg, jetzt=JETZT) == "geschrieben" and "Alle Messreihen lückenlos und aktuell" in f.read_text(encoding="utf-8"), "schreiben: reicht «Jetzt» durch, der Abschnitt landet in der Datei")
# «Jetzt» wirkt wirklich (ein Jahr später: dieselben Daten sind veraltet). Ohne diese Probe würde ein vergessenes Durchreichen erst auffallen, wenn die echte Uhr genug weiterläuft.
SPAET = datetime(2027, 6, 1, 12, 0, tzinfo=timezone.utc)
ok("Pilot: letzter Eintrag vom 2026-11-07" in W.abschnitt(lbg, sbg, None, SPAET)[1] and "lückenlos und aktuell" not in W.abschnitt(lbg, sbg, None, SPAET)[1], "abschnitt: das übergebene «Jetzt» entscheidet über die Frische (nicht die echte Uhr)")
with tempfile.TemporaryDirectory() as d:
    f = Path(d) / "b.md"
    W.schreiben(lbg, f, sb=sbg, jetzt=SPAET)
    ok("Tage her" in f.read_text(encoding="utf-8") and "lückenlos und aktuell" not in f.read_text(encoding="utf-8"), "schreiben: das übergebene «Jetzt» kommt bis in die Datei")
print(f"\n{ok_n} bestanden, {fail} fehlgeschlagen"); sys.exit(1 if fail else 0)
