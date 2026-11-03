#!/usr/bin/env python3
"""Tests für den Satelliten (Kern, Datenabruf, Lauf) — ohne Netz, ohne Schlüssel, nur Wegwerf-Ordner:
python3 tools/trading/krypto_bot/test_satellit.py"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import alle_coins_pruefung as AC  # noqa: E402
import gewinner_pruefung as G  # noqa: E402
import satellit_daten as D  # noqa: E402
import satellit_kern as S  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


from satellit_testdaten import synthetisch  # noqa: E402


# ───────────────────────── Kern gegen die getestete Regel ─────────────────────────
def gegen_test(reihen, label, ab=200):
    AC._CACHE.clear()          # die Zwischenspeicher des getesteten Codes hängen an id(preis): nach dem Freigeben eines Datensatzes kann ein neuer dieselbe id bekommen
    G._UNI.clear()
    tage, preis, vol = G.vorbereiten(reihen)
    gleich = schlecht = nichtleer = 0
    erstes = None
    for i in range(ab, len(tage) - 1):
        hist = AC.ziele("trend_btc", "TOP10", 50, i, preis, vol)
        neu = S.entscheiden(reihen, tage[i])
        gleich += hist == neu
        if hist != neu:
            schlecht += 1
            erstes = erstes or (tage[i], hist, neu)
        nichtleer += bool(hist)
    pruefe(f"Kern == getestete Regel an jedem Tag ({label}: {gleich} Tage, davon {nichtleer} mit Käufen)", schlecht == 0 and nichtleer > 20, erstes)
    return tage


for seed in (7, 11, 23):
    tage = gegen_test(synthetisch(seed), f"Zufall {seed}")
gegen_test(synthetisch(5, gleiche_volumen=True), "alle Volumen gleich (Gleichstand-Regel)")
gegen_test(synthetisch(9, btc_absturz=True), "Bitcoin bricht ein (Filter geht zu)")
pruefe("Entscheidungstage: Abstand zum 01.02.2018 durch 7 teilbar", all(S.entscheidungstag(tage[i]) == (i % 7 == 0) for i in range(len(tage))) and not S.entscheidungstag("2018-01-25"))
pruefe("letzter_entscheidungstag: am Entscheidungstag er selbst, sonst der jüngste davor",
       S.letzter_entscheidungstag("2018-02-08") == "2018-02-08" and S.letzter_entscheidungstag("2018-02-14") == "2018-02-08" and S.letzter_entscheidungstag("2018-02-15") == "2018-02-15")
try:
    S.letzter_entscheidungstag("2018-01-31")
    vor_start = False
except ValueError:
    vor_start = True
pruefe("letzter_entscheidungstag: vor dem Start der Regel Fehler", vor_start)

# ───────────────────────── Raster, Schnitt, Universum ─────────────────────────
reihe = [("2026-01-01", 1.0, 10.0), ("2026-01-02", 2.0, 20.0), ("2026-01-05", 5.0, 50.0), ("2026-01-06", 6.0, 60.0)]
p, v = S.raster(reihe, "2026-01-06", rueck=8)
pruefe("raster: vor der Listung None und Volumen 0, Lücke (03./04.01.) trägt den letzten Kurs mit Volumen 0, der letzte Wert gehört zum Tag",
       p == [None, None, 1.0, 2.0, 2.0, 2.0, 5.0, 6.0] and v == [0.0, 0.0, 10.0, 20.0, 0.0, 0.0, 50.0, 60.0], (p, v))
p, v = S.raster(reihe, "2026-01-06", rueck=6)
pruefe("raster: Fenster ab der Listung", p == [1.0, 2.0, 2.0, 2.0, 5.0, 6.0] and v == [10.0, 20.0, 0.0, 0.0, 50.0, 60.0], (p, v))
p, v = S.raster(reihe, "2026-01-08", rueck=5)
pruefe("raster: nach dem letzten Datenpunkt None (Coin vom Markt genommen), der Anfang kommt vom Kurs vor dem Fenster", p == [2.0, 5.0, 6.0, None, None], p)
p, v = S.raster([("2025-12-20", 9.0, 90.0)] + reihe, "2026-01-02", rueck=4)
pruefe("raster: ein Kurs VOR dem Fenster füllt den Anfang (Coin lief schon)", p == [9.0, 9.0, 1.0, 2.0], p)
pruefe("schnitt: Mittel, None bei zu wenig Geschichte oder fehlendem Kurs", S.schnitt([1, 2, 3, 4], 3, 4) == 2.5 and S.schnitt([1, 2, 3, 4], 2, 4) is None and S.schnitt([1, None, 3, 4], 3, 3) is None)
daten = {"AAAUSDT": ([1.0] * 100, [5.0] * 100), "BBBUSDT": ([1.0] * 100, [5.0] * 100), "CCCUSDT": ([None] * 20 + [1.0] * 80, [9.0] * 100), "DDDUSDT": ([1.0] * 100, [7.0] * 100)}
pruefe("universum: nach 30-Tage-Volumen, Coins ohne 90 Tage Geschichte fehlen, Gleichstand wie im Test (Symbol absteigend)",
       S.universum(daten, 99) == ["DDDUSDT", "BBBUSDT", "AAAUSDT"], S.universum(daten, 99))
pruefe("universum: höchstens n", len(S.universum({f"X{k:02d}USDT": ([1.0] * 100, [float(k)] * 100) for k in range(30)}, 99)) == S.TOP_N)

# ───────────────────────── Ziele ─────────────────────────
def welt(btc_ueber, coins):
    """daten-Dict mit Bitcoin (über oder unter seinem 150-Schnitt) und Coins {Symbol: (Kurs_heute_über_Schnitt?, Volumen)}."""
    n = S.RUECK
    btc = [100.0] * (n - 1) + [120.0 if btc_ueber else 80.0]
    d = {S.BTC: (btc, [1e9] * n)}
    for sym, (ueber, vol) in coins.items():
        d[sym] = ([100.0] * (n - 1) + [120.0 if ueber else 80.0], [vol] * n)
    return d


i = S.RUECK - 1
coins = {f"C{k:02d}USDT": (True, 1e8 - k) for k in range(12)}
z = S.ziele(welt(True, coins), i)
pruefe("ziele: Bitcoin über seinem 150-Tage-Schnitt → die Trend-Coins der Top 10, je 10 %", len(z) <= 10 and all(abs(w - 0.1) < 1e-12 for w in z.values()) and len(z) >= 9, z)
pruefe("ziele: Bitcoin unter dem Schnitt → alles USDT", S.ziele(welt(False, coins), i) == {})
pruefe("ziele: ein Coin unter seinem 50-Tage-Schnitt fällt heraus", "C00USDT" not in S.ziele(welt(True, {**coins, "C00USDT": (False, 1e9)}), i))
steigend_btc = ([100.0] * (S.RUECK - 1) + [120.0], [1e9] * S.RUECK)
pruefe("ziele: Kurs GENAU auf dem 50-Tage-Schnitt zählt nicht als Trend (streng grösser), knapp darüber schon (Bitcoin selbst steht hier auch im Universum: nur_alt)",
       S.ziele({S.BTC: steigend_btc, "FLATUSDT": ([100.0] * S.RUECK, [1e8] * S.RUECK)}, i, nur_alt=True) == {}
       and "UPUSDT" in S.ziele({S.BTC: steigend_btc, "UPUSDT": ([100.0] * (S.RUECK - 1) + [101.0], [1e8] * S.RUECK)}, i, nur_alt=True))
pruefe("ziele: Bitcoin GENAU auf seinem 150-Tage-Schnitt → Filter bleibt zu (streng grösser)", S.ziele({S.BTC: ([100.0] * S.RUECK, [1e9] * S.RUECK), "UPUSDT": ([100.0] * (S.RUECK - 1) + [101.0], [1e8] * S.RUECK)}, i) == {})
alle = S.ziele(welt(True, {"ETHUSDT": (True, 5e9), **coins}), i)
alt = S.ziele(welt(True, {"ETHUSDT": (True, 5e9), **coins}), i, nur_alt=True)
pruefe("ziele nur_alt: Bitcoin und Ether fallen heraus, der Rest bleibt, Gewichte unverändert", "ETHUSDT" in alle and not ({"BTCUSDT", "ETHUSDT"} & set(alt)) and all(alt[s] == alle[s] for s in alt))
try:
    S.ziele({"ETHUSDT": ([1.0] * S.RUECK, [1.0] * S.RUECK)}, i)
    ohne_btc = False
except KeyError:
    ohne_btc = True
pruefe("ziele: ohne Bitcoin-Kurse keine Entscheidung (Fehler)", ohne_btc)

# ───────────────────────── Stop-Abstand ─────────────────────────
ruhig = [100.0 * (1 + 0.001 * ((-1) ** k)) for k in range(120)]
wild = [100.0 * (1 + 0.20 * ((-1) ** k)) for k in range(120)]
pruefe("stopp_anteil: ruhiger Coin → Untergrenze 4 %, wilder → Obergrenze 35 %", S.stopp_anteil(ruhig, 119) == S.STOP_MIN and S.stopp_anteil(wild, 119) == S.STOP_MAX, (S.stopp_anteil(ruhig, 119), S.stopp_anteil(wild, 119)))
pruefe("stopp_anteil: zu wenig Kursgeschichte → 15 % (die Zahl selbst, nicht die Konstante)", S.stopp_anteil([None] * 100 + [1.0] * 10, 109) == 0.15 and S.STOP_STANDARD == 0.15)
mittel = [100.0 * (1 + 0.03 * ((-1) ** k)) for k in range(120)]
pruefe("stopp_anteil: mittlerer Coin liegt zwischen den Grenzen", S.STOP_MIN < S.stopp_anteil(mittel, 119) < S.STOP_MAX, S.stopp_anteil(mittel, 119))

# ───────────────────────── Datenabruf ─────────────────────────
tickers = [{"symbol": "牛来USDT", "quoteVolume": "9e9"}, {"symbol": "BTCUSDT", "quoteVolume": "5e9"}, {"symbol": "ABCUSDT", "quoteVolume": "4e9"},
           {"symbol": "USDCUSDT", "quoteVolume": "9e9"}, {"symbol": "ETHUPUSDT", "quoteVolume": "3e9"}, {"symbol": "ABCBTC", "quoteVolume": "9e9"},
           {"symbol": "XYZUSDT", "quoteVolume": "kaputt"}, {"symbol": "DEFUSDT", "quoteVolume": "1e9"}, {"symbol": "PAXGUSDT", "quoteVolume": "8e9"}]
k = D.kandidaten(hole=lambda pfad: tickers, anzahl=3)
pruefe("kandidaten: nach Volumen, ohne Stablecoins, Hebel-Token, Sonderzeichen, Nicht-USDT und Unlesbares; BTC und ETH immer dabei", k == ["BTCUSDT", "ABCUSDT", "DEFUSDT", "ETHUSDT"], k)
pruefe("kandidaten: eine unerwartete Antwort (kein Array) ergibt nur BTC und ETH", D.kandidaten(hole=lambda pfad: {"fehler": 1}) == ["BTCUSDT", "ETHUSDT"])
def ms(tag):
    return int((date.fromisoformat(tag) - date(1970, 1, 1)).days * 86400 * 1000)
roh = [[ms("2026-11-01"), "1", "2", "0.5", "1.5", "10", 0, "15.5", 5, "5", "7", "0"], [ms("2026-11-02"), "1", "2", "0.5", "1.6", "10", 0, "16.5", 5, "5", "7", "0"],
       [ms("2026-11-03"), "1", "2", "0.5", "1.7", "10", 0, "17.5", 5, "5", "7", "0"], ["kaputt"], [None]]
kz = D.kerzen("ABCUSDT", hole=lambda pfad: roh, heute="2026-11-03")
pruefe("kerzen: abgeschlossene Tage mit Schlusskurs und Quote-Volumen, der laufende Tag und Kaputtes fehlen", kz == [("2026-11-01", 1.5, 15.5), ("2026-11-02", 1.6, 16.5)], kz)
pfade = []
D.kerzen("ABCUSDT", hole=lambda pfad: pfade.append(pfad) or [], heute="2026-11-03")
pruefe("kerzen: fragt Tageskerzen des richtigen Paars", "symbol=ABCUSDT" in pfade[0] and "interval=1d" in pfade[0], pfade)


def hole_mit_fehlern(pfad):
    if "symbol=KAPUTTUSDT" in pfad:
        raise OSError("weg")
    if "symbol=LEERUSDT" in pfad:
        return []
    return [[ms("2026-11-01"), "1", "2", "0.5", "1.5", "10", 0, "15.5", 5, "5", "7", "0"]]


reihen, fehlt = D.alle_reihen(["ZZZUSDT", "KAPUTTUSDT", "LEERUSDT", "BTCUSDT"], hole=hole_mit_fehlern, heute="2026-11-03", pause=0)
pruefe("alle_reihen: Coins ohne Kerzen oder mit Fehler stehen in der Fehlt-Liste, die anderen sind da", sorted(reihen) == ["BTCUSDT", "ZZZUSDT"] and sorted(fehlt) == ["KAPUTTUSDT", "LEERUSDT"], (sorted(reihen), fehlt))
uhr = iter([0.0, 1.0, 2.0, 999.0, 999.0, 999.0, 999.0, 999.0])
reihen, fehlt = D.alle_reihen(["AAAUSDT", "BBBUSDT", "CCCUSDT", "BTCUSDT"], hole=hole_mit_fehlern, heute="2026-11-03", pause=0, frist_s=10, jetzt=lambda: next(uhr))
pruefe("alle_reihen: nach Ablauf der Frist wird nichts mehr geholt, Bitcoin kam zuerst dran", "BTCUSDT" in reihen and len(fehlt) >= 1, (sorted(reihen), fehlt))
pruefe("letzter_tag: jüngster Tag der Bitcoin-Kerzen, ohne Bitcoin None", D.letzter_tag({"BTCUSDT": [("2026-11-01", 1, 1), ("2026-11-02", 2, 2)]}) == "2026-11-02" and D.letzter_tag({}) is None)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
