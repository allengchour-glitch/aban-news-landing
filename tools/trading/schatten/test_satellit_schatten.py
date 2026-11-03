#!/usr/bin/env python3
"""Tests für das Satelliten-Schattenbuch — ohne Netz, nur Wegwerf-Ordner:
python3 tools/trading/schatten/test_satellit_schatten.py"""
from __future__ import annotations

import io
import json
import sys
import tempfile
from contextlib import redirect_stdout
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "krypto_bot"))
import alle_coins_pruefung as AC  # noqa: E402
import gewinner_pruefung as G  # noqa: E402
import satellit_kern as S  # noqa: E402
import satellit_schatten as SS  # noqa: E402
import satellit_testdaten as TS  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def ziel_tag(reihen):
    return max(r[-1][0] for r in reihen.values())


# ───────────────────────── Gleich dem getesteten Simulator ─────────────────────────
def vergleich(reihen, label):
    """Verbucht Tag für Tag ab einem Entscheidungstag und vergleicht jeden Wert mit gewinner_pruefung.simulieren. → (Tage, Logbuch, Plan)"""
    AC._CACHE.clear()
    G._UNI.clear()
    tage, preis, vol = G.vorbereiten(reihen)
    a = next(i for i in range(220, len(tage)) if i % 7 == 0)           # ein Entscheidungstag mit genug Geschichte
    b = len(tage) - 1
    i_liste = [i for i in range(0, len(tage), 7)]
    plaene = {
        "S1": {i: AC.ziele("trend_btc", "TOP10", 50, i, preis, vol) for i in i_liste if i >= a},
        "BTC150": {i: AC.ziele("btc_trend", "", 0, i, preis, vol) for i in i_liste if i >= a},
        "BTC": {i: AC.ziele("btc", "", 0, i, preis, vol) for i in i_liste if i >= a},
    }
    lb = {}
    SS.verbuchen(lb, reihen, tage[a])
    SS.verbuchen(lb, reihen, tage[b - 1])
    pruefe(f"{label}: Tage lückenlos von Start bis Ende", [z["tag"] for z in lb["tage"]] == tage[a:b], (len(lb["tage"]), b - a))
    for name, plan in plaene.items():
        soll = AC.simulieren(plan, tage, preis, a, b, 0.0015)
        ist = [z[name] / SS.START_KAPITAL for z in lb["tage"]]
        abw = max(abs(x - y) for x, y in zip(ist, soll))
        pruefe(f"{label}, Reihe {name}: jeder Tageswert gleich dem getesteten Simulator (grösste Abweichung {abw:.1e}, {len(soll)} Tage)", len(ist) == len(soll) and abw < 2e-6, abw)
    return tage, lb, a, b


reihen = TS.synthetisch(7)
tage, lb, a, b = vergleich(reihen, "Zufall 7")
pruefe("Reihe S1 hat tatsächlich gehandelt (der Vergleich beweist etwas)", lb["reihen"]["S1"]["handel"] > 3 and any(z["S1"] != SS.START_KAPITAL for z in lb["tage"]))
pruefe("Reihe S2: nie Bitcoin oder Ether, S1 dagegen schon irgendwann",
       not any(s in ("BTCUSDT", "ETHUSDT") for s in lb["reihen"]["S2"]["menge"]) and lb["reihen"]["S2"]["handel"] > 0)
reihen_absturz = TS.synthetisch(9, btc_absturz=True)
tage_a, lb_a, a_a, b_a = vergleich(reihen_absturz, "Bitcoin-Absturz")
pruefe("Bitcoin-Absturz: BTC150 (Filter) weicht von «Bitcoin halten» ab und verliert weniger — der Filter hat wirklich zugeschlagen",
       lb_a["tage"][-1]["BTC150"] != lb_a["tage"][-1]["BTC"] and lb_a["tage"][-1]["BTC150"] > lb_a["tage"][-1]["BTC"] and lb_a["reihen"]["BTC150"]["menge"] == {},
       (lb_a["tage"][-1]["BTC150"], lb_a["tage"][-1]["BTC"]))
pruefe("Bitcoin-Absturz: S1 und S2 stehen am Ende in USDT (Filter zu)", lb_a["reihen"]["S1"]["menge"] == {} and lb_a["reihen"]["S2"]["menge"] == {})

# Tag für Tag == ein Aufholen auf einmal
lb2 = {}
SS.verbuchen(lb2, reihen, tage[a])
for t in tage[a + 1:b]:
    SS.verbuchen(lb2, reihen, t)
pruefe("Tag für Tag verbucht ergibt dasselbe wie Aufholen auf einmal", lb2["tage"] == lb["tage"] and lb2["reihen"] == lb["reihen"])
pruefe("zweites Verbuchen desselben Tages tut nichts (idempotent)", SS.verbuchen(lb2, reihen, tage[b - 1]) == 0 and lb2["tage"] == lb["tage"])

# ───────────────────────── Start an einem Tag ohne Entscheidung ─────────────────────────
mitte = next(i for i in range(230, len(tage)) if i % 7 == 3)
lb3 = {}
SS.verbuchen(lb3, reihen, tage[mitte])
pruefe("Start mitten in der Woche: erster Tageswert ist das Startkapital (Wert vor dem Umschichten)", all(lb3["tage"][0][n] == SS.START_KAPITAL for n in SS.REIHEN), lb3["tage"][0])
pruefe("Start mitten in der Woche: es gilt die letzte Auswahl (Entscheidungstag davor)", lb3["reihen"]["S1"]["entschieden"] == tage[mitte - 3] and
       lb3["reihen"]["S1"]["ziele"] == S.entscheiden(reihen, tage[mitte - 3]), (lb3["reihen"]["S1"]["entschieden"], tage[mitte - 3]))
alle_summen = [SS.wert(r, SS.preise_am(reihen, tage[mitte])) for r in lb3["reihen"].values()]
pruefe("Start: nach dem Einkauf fehlen höchstens die Kosten (0,15 % des umgeschichteten Betrags)", all(SS.START_KAPITAL * (1 - 0.0015) - 1e-6 <= w <= SS.START_KAPITAL + 1e-6 for w in alle_summen), alle_summen)

# ───────────────────────── Umschichten ─────────────────────────
r = SS.neue_reihe("t")
SS.umschichten(r, {"AAA": 0.5, "BBB": 0.25}, {"AAA": 10.0, "BBB": 5.0})
pruefe("umschichten: Mengen aus Zielgewicht × Wert, Kosten 0,15 % auf den umgeschichteten Betrag, Rest bar",
       abs(r["menge"]["AAA"] - 5000 * (1 - 0.0015 * 0.75) / 10) < 1e-9 and abs(SS.wert(r, {"AAA": 10.0, "BBB": 5.0}) - 10000 * (1 - 0.0015 * 0.75)) < 1e-6, r)
w_vor = SS.wert(r, {"AAA": 10.0, "BBB": 5.0})
SS.umschichten(r, dict(r["ziele"]), {"AAA": 10.0, "BBB": 5.0})
pruefe("umschichten: unveränderte Gewichte kosten (fast) nichts", abs(SS.wert(r, {"AAA": 10.0, "BBB": 5.0}) - w_vor) < 1e-6)
SS.umschichten(r, {}, {"AAA": 10.0, "BBB": 5.0})
pruefe("umschichten: Ziel leer → alles verkauft, nur noch bar", r["menge"] == {} and r["bar"] > 9900, r)

# ───────────────────────── Lauf (main) ─────────────────────────
def holen_fest(extra=(), **kw):
    holen_fest.extras.append(list(extra))
    return {s: [(t, c, v_) for t, c, v_ in rr] for s, rr in reihen_kurz.items()}, []


holen_fest.extras = []
reihen_kurz = {s: [z for z in r if z[0] <= tage[mitte]] for s, r in reihen.items() if r}
with tempfile.TemporaryDirectory() as td:
    datei = Path(td) / "ss.json"
    puffer = io.StringIO()
    with redirect_stdout(puffer):
        rc = SS.main(["--lauf"], holen=holen_fest, datei=datei)
    stand = json.loads(datei.read_text(encoding="utf-8"))
    pruefe("main --lauf: Logbuch geschrieben, Rückgabewert 0, Bericht ausgegeben", rc == 0 and stand["start"] == tage[mitte] and "Satelliten-Schattenbuch" in puffer.getvalue())
    pruefe("main --lauf: kein Rest einer Zwischendatei", [p.name for p in Path(td).iterdir()] == ["ss.json"])
    puffer = io.StringIO()
    mtime = datei.stat().st_mtime_ns
    with redirect_stdout(puffer):
        rc = SS.main(["--lauf"], holen=holen_fest, datei=datei)
    pruefe("main --lauf zum zweiten Mal am selben Tag: nichts Neues, Datei unberührt", rc == 0 and datei.stat().st_mtime_ns == mtime and "Kein neuer Tag" in puffer.getvalue())
    pruefe("main: beim zweiten Lauf werden die gehaltenen Coins mitgeholt", holen_fest.extras[0] == [] and holen_fest.extras[1] == SS.gehaltene(stand), holen_fest.extras)

    def holen_kaputt(extra=(), **kw):
        raise OSError("Netz weg")
    datei2 = Path(td) / "leer.json"
    puffer = io.StringIO()
    with redirect_stdout(puffer):
        rc = SS.main(["--lauf"], holen=holen_kaputt, datei=datei2)
    pruefe("main: Netz weg → Rückgabewert 1, nichts geschrieben", rc == 1 and not datei2.exists() and "nicht erreichbar" in puffer.getvalue())

    def holen_ohne_btc(extra=(), **kw):
        return {"ETHUSDT": reihen_kurz["ETHUSDT"]}, []
    puffer = io.StringIO()
    with redirect_stdout(puffer):
        rc = SS.main(["--lauf"], holen=holen_ohne_btc, datei=datei2)
    pruefe("main: ohne Bitcoin-Kurse → Rückgabewert 1, nichts geschrieben", rc == 1 and not datei2.exists(), puffer.getvalue())
    puffer = io.StringIO()
    with redirect_stdout(puffer):
        rc = SS.main(["--bericht"], datei=datei)
    pruefe("main --bericht liest nur", rc == 0 and "Satelliten-Schattenbuch" in puffer.getvalue())
    puffer = io.StringIO()
    with redirect_stdout(puffer):
        SS.main([], datei=Path(td) / "gibtsnicht.json")
    pruefe("Bericht ohne Logbuch: sagt es", "Noch kein Stand" in puffer.getvalue())

# ───────────────────────── Fehlender Kurs eines gehaltenen Coins ─────────────────────────
lb4 = json.loads(json.dumps(lb))
gehalten = SS.gehaltene(lb4)
if gehalten:
    s_weg = gehalten[0]
    kurz = {s: r_ for s, r_ in reihen.items() if s != s_weg}
    lb4["tage"] = lb4["tage"][:5]
    lb4["letzter_stand"] = lb4["tage"][-1]["tag"]
    n = SS.verbuchen(lb4, kurz, tage[a + 6])
    pruefe("gehaltener Coin ohne frische Kurse: der letzte bekannte Kurs gilt, es wird weiter verbucht (2 Tage, alle Werte positiv)",
           n == 2 and all(isinstance(lb4["tage"][-1][x], float) and lb4["tage"][-1][x] > 0 for x in SS.REIHEN), (n, lb4["tage"][-1]))
else:
    pruefe("gehaltener Coin ohne frische Kurse (Test übersprungen: Reihe hält nichts)", True)

# ───────────────────────── Bericht ─────────────────────────
text = SS.bericht(lb)
pruefe("Bericht: alle vier Reihen mit Wert, Rendite und Einbruch; kein Apostroph hinter dem Prozentzeichen", all(n in text for n in SS.REIHEN) and "%'" not in text and "schlimmster Einbruch" in text, text)
pruefe("Bericht: unter 8 Wochen «kein Urteil»", "kein Urteil" in SS.bericht(lb3))
lang = json.loads(json.dumps(lb))
lang["tage"] = lang["tage"] * 2
pruefe("Bericht: ab 56 Tagen kein «kein Urteil» mehr, aber auch kein Beweis", "kein Urteil" not in SS.bericht(lang) and "noch kein Beweis" in SS.bericht(lang))
kz, nz = SS.kennzahlen({"tage": [{"S1": 10000.0}, {"S1": 9000.0}, {"S1": 9500.0}, {"S1": 9700.0}]})
pruefe("kennzahlen: bekannter Verlauf 10000 → 9000 → 9500 → 9700: Wert, Rendite −3 %, schlimmster Einbruch −10 %",
       nz == 4 and kz["S1"]["wert"] == 9700.0 and abs(kz["S1"]["rendite"] + 0.03) < 1e-12 and abs(kz["S1"]["einbruch"] + 0.10) < 1e-12, kz)
for n_tage, erwartet in ((30, "kein Urteil"), (55, "kein Urteil"), (56, "noch kein Beweis"), (80, "noch kein Beweis")):
    lb_n = json.loads(json.dumps(lb))
    lb_n["tage"] = (lb_n["tage"] * 3)[:n_tage]
    t_n = SS.bericht(lb_n)
    pruefe(f"Bericht bei {n_tage} Tagen: «{erwartet}»", erwartet in t_n and (("noch kein Beweis" in t_n) == (erwartet == "noch kein Beweis")), t_n[-120:])
k, n = SS.kennzahlen(lb)
pruefe("kennzahlen: Wert, Rendite und Einbruch je Reihe, Tagesanzahl", n == b - a and set(k) == set(SS.REIHEN) and all(v["einbruch"] <= 0 for v in k.values()))

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
