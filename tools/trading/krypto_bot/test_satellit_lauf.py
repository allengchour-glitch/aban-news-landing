#!/usr/bin/env python3
"""Tests für den Satelliten-Lauf (satellit.py): simulierte Börse, Wegwerf-Ordner, kein Netz, keine Schlüssel.
python3 tools/trading/krypto_bot/test_satellit_lauf.py"""
from __future__ import annotations

import contextlib
import io
import json
import math
import subprocess
import sys
import tempfile
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import broker_futures as BF  # noqa: E402
import satellit as SAT  # noqa: E402
import satellit_kern as S  # noqa: E402
import sperre  # noqa: E402
from satellit_testdaten import synthetisch  # noqa: E402

OK, FEHLER = 0, []
LAUT = False          # True: die Ausgaben von broker_futures zeigen (zum Suchen)


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


# ───────────────────────── Wegwerf-Umgebung: nie die echten Dateien des PCs ─────────────────────────
TMP = tempfile.TemporaryDirectory()
T = Path(TMP.name)
BUCH, AUS, PAUSE_D, STOP_D = T / "buch.json", T / "aus.txt", T / "PAUSE", T / "STOP"
BF.STOP_DATEI, SAT.PAUSE, SAT.BUCH, SAT.AUS_DATEI = STOP_D, PAUSE_D, BUCH, AUS
sperre.ORDNER = T / "sperre"
ENV = {"BINANCE_FUTURES_API_KEY": "k", "BINANCE_FUTURES_API_SECRET": "s", "KI_BOT_ANTEIL": "0.5"}
SLOT = 5000.0 * 0.2 / 10          # Konto 5000 × Satelliten-Anteil 20 % ÷ 10 Plätze = 100 USDT je Coin

ALLE = synthetisch(7)
START = date(2018, 2, 1)
T0 = (START + timedelta(days=7 * 50)).isoformat()            # Entscheidungstage (Abstand 7 Tage vom 01.02.2018)
T1 = (date.fromisoformat(T0) + timedelta(days=7)).isoformat()
T2 = (date.fromisoformat(T1) + timedelta(days=7)).isoformat()


def plus(t, n):
    return (date.fromisoformat(t) + timedelta(days=n)).isoformat()


def bis(reihen, tag):
    return {s: [z for z in r if z[0] <= tag] for s, r in reihen.items() if any(z[0] <= tag for z in r)}


pruefe("Testdaten: T0, T1, T2 sind Entscheidungstage und liegen in den Daten", all(S.entscheidungstag(t) for t in (T0, T1, T2)) and T2 <= ALLE["BTCUSDT"][-1][0], (T0, T1, T2))


class Boerse:
    """Simulierte Futures-Börse: Konto, Positionen, Marktaufträge, Stops. Spricht dieselben Aufrufe wie broker_futures.Futures."""

    def __init__(self, spots, tausender=(), kapital=5000.0):
        self.spot_von, self.mult, self.faktor = {}, {}, {}
        self.preise, self.pos, self.stops = {}, {}, {}
        for spot in spots:
            f = "1000" + spot if spot in tausender else spot
            self.spot_von[f], self.mult[f], self.faktor[f] = spot, (1000.0 if spot in tausender else 1.0), 1.0
            self.preise[f], self.pos[f], self.stops[f] = 1.0, 0.0, []
        self.kapital, self.hedge = kapital, False
        self.nach_auftrag = None             # Aufruf nach jedem ausgeführten Auftrag (z. B. ein Absturz mitten im Lauf)
        self.fest = {}                       # Symbol → fester Marktpreis (überstimmt die Kursdaten)
        self.log, self.einrichten_log = [], []
        self.auftrag_fehler, self.vertraege_fehler, self.position_fehler_ab, self.n_position = {}, None, {}, {}
        self.n_stop = 0

    # --- Hilfen der Tests
    def markiere(self, reihen):
        for f, spot in self.spot_von.items():
            if spot in reihen:
                self.preise[f] = reihen[spot][-1][1] * self.mult[f] * self.faktor[f]
            if f in self.fest:
                self.preise[f] = self.fest[f]

    def auftraege(self, symbol=None, seite=None, nur_aufbau=False):
        return [x for x in self.log if x[0] == "auftrag" and (symbol is None or x[1] == symbol) and (seite is None or x[2] == seite) and not (nur_aufbau and x[4])]

    def stop_ausloesen(self, f):
        self.pos[f], self.stops[f] = 0.0, []

    # --- Aufrufe wie bei broker_futures.Futures
    def _req(self, methode, pfad, params=None, signiert=False, basis=None):
        if pfad == "/fapi/v1/exchangeInfo":
            if self.vertraege_fehler:
                raise self.vertraege_fehler
            return {"symbols": [{"symbol": f, "status": "TRADING", "contractType": "PERPETUAL", "quoteAsset": "USDT"} for f in self.preise]}
        raise AssertionError(f"unerwarteter Aufruf {pfad}")

    def _zeit(self):
        return int(time.time() * 1000)

    def hedge_modus(self):
        return self.hedge

    def konto(self):
        return {"totalWalletBalance": str(self.kapital), "totalUnrealizedProfit": "0"}

    def position(self, symbol):
        self.n_position[symbol] = self.n_position.get(symbol, 0) + 1
        if symbol in self.position_fehler_ab and self.n_position[symbol] >= self.position_fehler_ab[symbol]:
            raise OSError("Verbindung weg")
        return self.pos.get(symbol, 0.0)

    def markpreis(self, symbol):
        return (self.preise[symbol], 0.0)

    def regeln(self, symbol):
        if symbol not in self.preise:
            raise StopIteration
        return {"step": 0.001, "min_qty": 0.001, "tick": 0.0001, "min_notional": 5.0, "status": "TRADING"}

    def einrichten(self, symbol, hebel):
        self.einrichten_log.append((symbol, hebel))

    def auftrag(self, symbol, seite, menge, reduce_only):
        if symbol in self.auftrag_fehler:
            raise self.auftrag_fehler[symbol]
        v = self.pos.get(symbol, 0.0)
        d = menge if seite == "BUY" else -menge
        if reduce_only and (v == 0 or (v > 0) == (d > 0)):
            raise BF.BinanceFehler("/fapi/v1/order", 400, "ReduceOnly Order is rejected", None, None)
        if reduce_only and abs(d) > abs(v):
            d = -v
        self.pos[symbol] = round(v + d, 8)
        self.log.append(("auftrag", symbol, seite, menge, reduce_only))
        if self.nach_auftrag:
            self.nach_auftrag()
        return {"orderId": len(self.log), "status": "FILLED"}

    def offene_stops(self, symbol):
        return list(self.stops[symbol])

    def stops_loeschen(self, symbol):
        self.stops[symbol] = []

    def stop(self, symbol, seite, preis):
        self.n_stop += 1
        self.stops[symbol].append({"algoId": self.n_stop, "side": seite, "stopPrice": float(preis)})
        return {"algoId": self.n_stop}


class Entscheidung:
    """Ersetzt satellit_kern.entscheiden durch feste Ziele je Entscheidungstag (so lassen sich Sonderfälle genau nachstellen)."""

    def __init__(self, ziele_je_tag):
        self.z = ziele_je_tag

    def __enter__(self):
        self.alt = S.entscheiden

        def stub(reihen, tag, nur_alt=False):
            assert nur_alt is True, "der Satellit muss ohne Bitcoin und Ether entscheiden"
            assert tag in self.z, f"unerwarteter Entscheidungstag {tag}"
            return dict(self.z[tag])
        S.entscheiden = stub
        return self

    def __exit__(self, *a):
        S.entscheiden = self.alt


def frisch():
    for p in (BUCH, BUCH.with_name(BUCH.name + ".bak"), STOP_D, PAUSE_D, AUS):
        p.unlink(missing_ok=True)


def buch():
    return SAT.lesen(BUCH)[0]


def fahre(b, tag, daten=None, heute=None, **kw):
    """Ein Lauf mit Kursen bis `tag` (letzter abgeschlossener Tag); die Börse bekommt dazu passende Marktpreise. → (rc, Zeilen, Pushes, Protokoll)"""
    daten = ALLE if daten is None else daten
    reihen = bis(daten, tag)
    b.markiere(reihen)
    pushes, prot = [], []
    args = dict(env=dict(ENV), holen=lambda extra=(): (reihen, []), client=b, protokolliere=prot.append, buch_datei=BUCH, push=pushes.append,
                aus_datei=AUS, pause_datei=PAUSE_D, heute=heute or plus(tag, 1))
    args.update(kw)
    ziel = sys.stdout if LAUT else io.StringIO()
    with contextlib.redirect_stdout(ziel):
        rc, zeilen = SAT.lauf(**args)
    return rc, zeilen, pushes, prot


def alle_spots(reihen=None):
    return sorted((reihen or ALLE).keys())


def erwarteter_stop(reihen, spot, mark, tag, tick=0.0001):
    p, _ = S.raster(reihen[spot], tag)
    anteil = S.stopp_anteil(p, S.RUECK - 1)
    return round(round(mark * (1 - anteil) / tick) * tick, 8), anteil


Z0 = {"SOLUSDT": 0.1, "ADAUSDT": 0.1, "LINKUSDT": 0.1}
Z1 = {"SOLUSDT": 0.1, "LINKUSDT": 0.1, "DOGEUSDT": 0.1}

# ───────────────────────── Kleinteile ─────────────────────────
e = SAT.einstellung({}, AUS)
pruefe("Einstellung: Standard ist an, 20 % des Kontos", not e["aus"] and e["anteil"] == 0.2 and e["grund"] == "", e)
pruefe("Einstellung: KRYPTO_SATELLIT=aus (auch AUS, off, 0, nein, false) schaltet aus", all(SAT.einstellung({"KRYPTO_SATELLIT": w}, AUS)["aus"] for w in ("aus", "AUS", " off ", "0", "nein", "false")))
pruefe("Einstellung: andere Werte (an, ja, leer, 1) lassen den Satelliten an", not any(SAT.einstellung({"KRYPTO_SATELLIT": w}, AUS)["aus"] for w in ("an", "ja", "", "1")))
AUS.write_text("aus")
pruefe("Einstellung: die Datei data/krypto-satellit-aus.txt schaltet aus", SAT.einstellung({}, AUS)["aus"] and "krypto-satellit-aus.txt" in SAT.einstellung({}, AUS)["grund"])
AUS.unlink()
pruefe("Einstellung: Anteil 0,25 und 0.25 gehen, zu gross → 0.3, Unsinn/nan/inf → 0.2",
       SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "0,25"}, AUS)["anteil"] == 0.25 and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "0.25"}, AUS)["anteil"] == 0.25
       and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "0.9"}, AUS)["anteil"] == 0.3 and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "viel"}, AUS)["anteil"] == 0.2
       and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "nan"}, AUS)["anteil"] == 0.2 and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "inf"}, AUS)["anteil"] == 0.2)
pruefe("Einstellung: Anteil 0 oder negativ schaltet aus", SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "0"}, AUS)["aus"] and SAT.einstellung({"KRYPTO_SATELLIT_ANTEIL": "-0.1"}, AUS)["aus"])
pruefe("abbilden: gleiches Symbol, Tausender-Verträge, kein Vertrag, kein USDT-Paar; das einfache Symbol gewinnt",
       SAT.abbilden("SOLUSDT", {"SOLUSDT"}) == "SOLUSDT" and SAT.abbilden("PEPEUSDT", {"1000PEPEUSDT"}) == "1000PEPEUSDT"
       and SAT.abbilden("MOGUSDT", {"1000000MOGUSDT"}) == "1000000MOGUSDT" and SAT.abbilden("XYZUSDT", {"SOLUSDT"}) is None
       and SAT.abbilden("SOLBUSD", {"SOLUSDT"}) is None and SAT.abbilden("PEPEUSDT", {"PEPEUSDT", "1000PEPEUSDT"}) == "PEPEUSDT")
pruefe("gewicht_je_platz: Konto × 0,5 × Gewicht = Konto × 0,2 ÷ 10", abs(SAT.gewicht_je_platz({"anteil": 0.5}, 0.2) - 0.04) < 1e-12 and abs(5000 * 0.5 * SAT.gewicht_je_platz({"anteil": 0.5}, 0.2) - SLOT) < 1e-9)
pruefe("naechster_entscheidungstag: heute selbst, wenn er einer ist; sonst der nächste (Donnerstage)",
       SAT.naechster_entscheidungstag("2026-11-03") == "2026-11-05" and SAT.naechster_entscheidungstag("2026-11-05") == "2026-11-05"
       and SAT.naechster_entscheidungstag("2026-11-06") == "2026-11-12" and S.entscheidungstag(SAT.naechster_entscheidungstag("2027-03-14")))
b_vt = Boerse(["AAAUSDT", "BBBUSDT"])
b_vt._req = lambda m, p, params=None, signiert=False, basis=None: {"symbols": [
    {"symbol": "AAAUSDT", "status": "TRADING", "contractType": "PERPETUAL", "quoteAsset": "USDT"},
    {"symbol": "BBBUSDT", "status": "BREAK", "contractType": "PERPETUAL", "quoteAsset": "USDT"},
    {"symbol": "CCCUSDT_250627", "status": "TRADING", "contractType": "CURRENT_QUARTER", "quoteAsset": "USDT"},
    {"symbol": "DDDBUSD", "status": "TRADING", "contractType": "PERPETUAL", "quoteAsset": "BUSD"}]}
pruefe("futures_verfuegbar: nur unbefristete USDT-Verträge im Status TRADING", SAT.futures_verfuegbar(b_vt) == {"AAAUSDT"})

# ───────────────────────── Sperren: was der Satellit NIE tut ─────────────────────────
frisch()
b = Boerse(alle_spots())
rc, z, pu, _ = fahre(b, T0, env=dict(ENV, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ))
pruefe("Echtgeld: der Satellit macht nie etwas (keine Börsen-Aufrufe, kein Buch, kein Push)", rc == 0 and "nur im Testnetz" in z[0] and not b.log and not BUCH.exists() and not pu, (rc, z))
rc, z, pu, _ = fahre(b, T0, env={})
pruefe("ohne Schlüssel: nichts zu tun, keine Aufrufe", rc == 0 and "keine Futures-Schlüssel" in z[0] and not b.log and not BUCH.exists(), (rc, z))
rc, z, pu, _ = fahre(b, T0, env=dict(ENV, BINANCE_FUTURES_URL="https://example.com"))
pruefe("fremde Börsen-Adresse (BINANCE_FUTURES_URL): Warnung, keine Aufrufe", rc == 3 and "BINANCE_FUTURES_URL" in z[0] and not b.log, (rc, z))
rc, z, pu, _ = fahre(b, T0, env=dict(ENV, KI_BOT_ANTEIL="0"))
pruefe("KI_BOT_ANTEIL=0: nichts gehandelt (ohne Positionen rc 0)", rc == 0 and "KI_BOT_ANTEIL ist 0" in z[0] and not b.log, (rc, z))
PAUSE_D.write_text("pause")
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0)
pruefe("Pause: der Satellit tut NICHTS (keine Kurse, keine Aufträge, kein Buch) — wie der Pilot", rc == 0 and "Pause" in z[0] and not b.log and not BUCH.exists() and not pu, (rc, z, b.log))
PAUSE_D.unlink()

# ───────────────────────── Ganzer Ablauf mit der echten Regel (satellit_kern) ─────────────────────────
echt = None
for seed in (7, 11, 23, 5, 3, 13, 17, 19, 29, 31):
    reihen_s = synthetisch(seed)
    for n in range(30, 59):
        t = (START + timedelta(days=7 * n)).isoformat()
        zz = S.entscheiden(bis(reihen_s, t), t, nur_alt=True)
        if len(zz) >= 3:
            echt = (seed, reihen_s, t, zz)
            break
    if echt:
        break
pruefe("Testdaten: es gibt einen Entscheidungstag mit mindestens 3 Alt-Käufen", echt is not None)
if echt:
    seed, R, TR, ZR = echt
    frisch()
    b = Boerse(alle_spots(R))
    rc, z, pu, prot = fahre(b, TR, daten=R)
    ziel_f = sorted(ZR)
    kaeufe = b.auftraege(seite="BUY")
    pruefe("echte Regel: gekauft werden genau die Ziel-Coins, nie Bitcoin oder Ether", sorted(x[1] for x in kaeufe) == ziel_f and not b.auftraege("BTCUSDT") and not b.auftraege("ETHUSDT"), (ziel_f, kaeufe))
    pruefe("echte Regel: jeder Kauf rund 100 USDT (Konto 5000 × 20 % ÷ 10), nicht nur-verkleinern",
           all(SLOT - 0.001 * b.preise[x[1]] - 1e-6 <= x[3] * b.preise[x[1]] <= SLOT + 1e-6 and not x[4] for x in kaeufe), [(x[1], x[3] * b.preise[x[1]]) for x in kaeufe])
    pruefe("echte Regel: Hebel auf der Börse wird eingerichtet (1×)", sorted(s for s, h in b.einrichten_log) == ziel_f and all(h == 1.0 for s, h in b.einrichten_log), b.einrichten_log)
    stops_ok = True
    for f in ziel_f:
        soll, anteil = erwarteter_stop(R, f, b.preise[f], TR)
        st = b.stops[f]
        stops_ok = stops_ok and len(st) == 1 and abs(st[0]["stopPrice"] - soll) < 1e-6 and 0.04 <= anteil <= 0.35 and st[0]["side"] == "SELL"
    pruefe("echte Regel: je Coin genau ein Börsen-Stop, 3 Tages-Schwankungen unter dem Kurs (4 % bis 35 %)", stops_ok, {f: b.stops[f] for f in ziel_f})
    bu = buch()
    pruefe("echte Regel: Buch hat Ziele, Entscheidungstag, Positionen = Börse, «bekannt» nur noch die Positionen",
           bu["entschieden"] == TR and bu["ziele"] == ZR and sorted(bu["positionen"]) == ziel_f and all(abs(bu["positionen"][f]["menge"] - b.pos[f]) < 1e-9 for f in ziel_f)
           and sorted(bu["bekannt"]) == ziel_f and bu["letzter_lauf"]["ok"] is True, bu)
    pruefe("echte Regel: ein Handy-Bericht mit allen Coins und «Keine Anlageberatung», rc 0",
           rc == 0 and len(pu) == 1 and all(SAT.kurz(f) in pu[0] for f in ziel_f) and "Keine Anlageberatung" in pu[0] and "Spielgeld" in pu[0], (rc, pu))
    pruefe("echte Regel: das Auftragsprotokoll der Börse-Schicht bekommt je Coin einen Eintrag", sorted(p.get("symbol") for p in prot) == ziel_f, [p.get("symbol") for p in prot])
    n_auftr = len(b.auftraege())
    rc2, z2, pu2, _ = fahre(b, TR, daten=R)
    pruefe("zweiter Lauf am selben Tag: keine neuen Aufträge, kein neuer Handy-Bericht, Stops je Coin weiter genau einer",
           rc2 == 0 and len(b.auftraege()) == n_auftr and len(pu2) == 0 and all(len(b.stops[f]) == 1 for f in ziel_f), (rc2, z2, len(b.auftraege()), n_auftr))

    # Zwischen den Entscheidungstagen: KEINE Aufträge, nur der Stop wird nachgeführt (kein Nachkaufen in Verlierer, kein Abschneiden von Gewinnern)
    sieger, verlierer = ziel_f[0], ziel_f[-1]
    stop_vorher = {f: b.stops[f][0]["stopPrice"] for f in ziel_f}
    b.fest[sieger], b.fest[verlierer] = b.preise[sieger] * 1.4, b.preise[verlierer] * 0.8
    n_auftr = len(b.auftraege())
    rc3, z3, pu3, _ = fahre(b, plus(TR, 1), daten=R)
    pruefe("Haltetag: trotz +40 % und −20 % KEIN Auftrag (nicht kürzen, nicht nachkaufen)", rc3 == 0 and len(b.auftraege()) == n_auftr, (rc3, z3, b.log[-3:]))
    pruefe("Haltetag: Stop des Gewinners steigt mit dem Kurs, Stop des Verlierers wird NICHT ratschenartig gehalten (folgt dem Kurs wie beim Piloten)",
           b.stops[sieger][0]["stopPrice"] > stop_vorher[sieger] * 1.2 and b.stops[verlierer][0]["stopPrice"] < stop_vorher[verlierer] * 0.9, (stop_vorher, {f: b.stops[f] for f in (sieger, verlierer)}))
    pruefe("Haltetag: Positionen unverändert im Buch, kein Handy-Bericht", all(abs(buch()["positionen"][f]["menge"] - b.pos[f]) < 1e-9 for f in ziel_f) and not pu3, pu3)
    # Stop ausgelöst
    b.fest.clear()
    b.stop_ausloesen(verlierer)
    rc4, z4, pu4, _ = fahre(b, plus(TR, 2), daten=R)
    bu = buch()
    pruefe("Stop ausgelöst: Position fliegt aus dem Buch, Coin steht bei «ausgestoppt», Meldung aufs Handy, rc 0",
           verlierer not in bu["positionen"] and verlierer in bu["ausgestoppt"] and any("Position ist weg" in x for x in z4) and len(pu4) == 1 and rc4 == 0, (z4, bu["ausgestoppt"]))
    n_auftr = len(b.auftraege())
    rc5, z5, pu5, _ = fahre(b, plus(TR, 3), daten=R)
    pruefe("nach dem Stop: der Coin wird bis zum nächsten Entscheidungstag NICHT wieder gekauft (kein Hin und Her)", len(b.auftraege()) == n_auftr and verlierer not in buch()["positionen"] and not pu5, (z5, b.log[-2:]))

# ───────────────────────── Ein ganzer Wochenzyklus mit festen Zielen (Sonderfälle genau nachgestellt) ─────────────────────────
frisch()
RADA = dict(ALLE)
RADA["ADAUSDT"] = [(t_, c_ / 1000.0, v_) for t_, c_, v_ in ALLE["ADAUSDT"]]    # ein «billiger» Coin: sein Vertrag heisst 1000ADAUSDT und kostet 1000× so viel wie ein Coin
b = Boerse(alle_spots(), tausender=("ADAUSDT",))        # ADA heisst im Testnetz 1000ADAUSDT (Kurs ×1000)
with Entscheidung({T0: Z0, T1: Z1, T2: {}}):
    rc, z, pu, _ = fahre(b, T0, daten=RADA)
    kaeufe = {x[1]: x for x in b.auftraege(seite="BUY")}
    pruefe("Zyklus T0: gekauft SOL, LINK und der Tausender-Vertrag 1000ADAUSDT (nicht ADAUSDT)", sorted(kaeufe) == ["1000ADAUSDT", "LINKUSDT", "SOLUSDT"] and rc == 0, (sorted(kaeufe), z))
    pruefe("Zyklus T0: auch der Tausender-Vertrag bekommt rund 100 USDT und seinen Stop", abs(kaeufe["1000ADAUSDT"][3] * b.preise["1000ADAUSDT"] - SLOT) < 0.001 * b.preise["1000ADAUSDT"] + 1e-6 and len(b.stops["1000ADAUSDT"]) == 1, (kaeufe["1000ADAUSDT"], b.stops["1000ADAUSDT"]))
    menge_ada, menge_link = b.pos["1000ADAUSDT"], b.pos["LINKUSDT"]
    b.fest["SOLUSDT"] = b.preise["SOLUSDT"] * 1.3        # SOL ist 30 % gestiegen: weicht am Entscheidungstag über das Band (25 %) → wird auf gleiches Gewicht gekürzt
    n0 = len(b.log)
    rc, z, pu, _ = fahre(b, T1, daten=RADA)
    neu = [x for x in b.log[n0:] if x[0] == "auftrag"]
    pruefe("Zyklus T1: ADA (nicht mehr im Ziel) wird ganz geschlossen — nur verkleinern, Stop weg, Position 0",
           ("auftrag", "1000ADAUSDT", "SELL", menge_ada, True) in neu and b.pos["1000ADAUSDT"] == 0 and b.stops["1000ADAUSDT"] == [], (neu, b.pos["1000ADAUSDT"]))
    pruefe("Zyklus T1: DOGE (neu im Ziel) wird gekauft, LINK (unverändert) nicht angefasst", any(x[1] == "DOGEUSDT" and x[2] == "BUY" and not x[4] for x in neu) and not any(x[1] == "LINKUSDT" for x in neu), neu)
    pruefe("Zyklus T1: SOL (+30 %) wird zurück auf gleiches Gewicht gekürzt (reduceOnly SELL), nicht verdoppelt", any(x[1] == "SOLUSDT" and x[2] == "SELL" and x[4] for x in neu), neu)
    reihenfolge = [x[1] for x in neu]
    pruefe("Zyklus T1: erst schliessen, dann aufbauen (Sicherheit zuerst, Margin frei)", reihenfolge.index("1000ADAUSDT") < reihenfolge.index("DOGEUSDT"), reihenfolge)
    bu = buch()
    pruefe("Zyklus T1: Buch = Ziele von T1, Positionen = SOL, LINK, DOGE", bu["entschieden"] == T1 and sorted(bu["positionen"]) == ["DOGEUSDT", "LINKUSDT", "SOLUSDT"] and bu["ziele"] == Z1, bu)
    pruefe("Zyklus T1: ein Handy-Bericht mit der Entscheidung", len(pu) == 1 and "Entscheidung vom " + T1 in pu[0], pu)
    b.fest.clear()
    n0 = len(b.log)
    rc, z, pu, _ = fahre(b, T2, daten=RADA)
    neu = [x for x in b.log[n0:] if x[0] == "auftrag"]
    pruefe("Zyklus T2: Bitcoin-Filter zu (keine Ziele) → alle drei Positionen werden geschlossen", sorted(x[1] for x in neu if x[4]) == ["DOGEUSDT", "LINKUSDT", "SOLUSDT"] and all(b.pos[f] == 0 and b.stops[f] == [] for f in ("DOGEUSDT", "LINKUSDT", "SOLUSDT")), neu)
    bu = buch()
    pruefe("Zyklus T2: Buch leer (keine Positionen, «bekannt» leer), Entscheidung gemerkt, Meldung «nichts kaufen»", bu["positionen"] == {} and bu["bekannt"] == [] and bu["ziele"] == {} and bu["entschieden"] == T2
           and any("nichts kaufen" in x for x in z), (bu, z))

# Stop ausgelöst, Coin bleibt im Ziel: am nächsten Entscheidungstag wird er wieder gekauft (die Sperre gilt nur bis dahin)
frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0, T1: Z0}):
    fahre(b, T0)
    b.stop_ausloesen("SOLUSDT")
    fahre(b, plus(T0, 1))
    n_vorher = len(b.auftraege("SOLUSDT", "BUY"))
    fahre(b, plus(T0, 3))
    pruefe("Stop-Aus: bis zum nächsten Entscheidungstag kein neuer SOL-Kauf", len(b.auftraege("SOLUSDT", "BUY")) == n_vorher and "SOLUSDT" in buch()["ausgestoppt"])
    rc, z, pu, _ = fahre(b, T1)
    pruefe("Stop-Aus: am nächsten Entscheidungstag (SOL weiter im Ziel) wird SOL wieder gekauft, die Sperre ist aufgehoben",
           len(b.auftraege("SOLUSDT", "BUY")) == n_vorher + 1 and "SOLUSDT" in buch()["positionen"] and buch()["ausgestoppt"] == {} and b.pos["SOLUSDT"] > 0, (b.auftraege("SOLUSDT"), buch()["ausgestoppt"]))

# ───────────────────────── Sonderfälle am Konto ─────────────────────────
frisch()
b = Boerse(alle_spots())
b.pos["DOGEUSDT"] = 5.0                                  # eine FREMDE Position (nicht vom Satelliten): nie anfassen
with Entscheidung({T0: {"SOLUSDT": 0.1, "DOGEUSDT": 0.1}}):
    rc, z, pu, _ = fahre(b, T0)
pruefe("fremde Position im Ziel-Symbol: nicht angefasst (kein Auftrag, kein Stop), gemeldet; SOL wird normal gekauft",
       not b.auftraege("DOGEUSDT") and b.pos["DOGEUSDT"] == 5.0 and b.stops["DOGEUSDT"] == [] and any("fremde Position" in x for x in z) and b.auftraege("SOLUSDT", "BUY"), (z, b.log))
pruefe("fremde Position: steht weder im Buch noch bei «bekannt» (der Not-Aus fasst sie nicht an)", "DOGEUSDT" not in buch()["positionen"] and "DOGEUSDT" not in buch()["bekannt"] and "DOGEUSDT" not in SAT.offene_symbole(BUCH, ENV), buch())

frisch()
b = Boerse(alle_spots())
b.markiere(bis(ALLE, T0))
verwaist = round(SLOT / b.preise["DOGEUSDT"], 3)
b.pos["DOGEUSDT"] = verwaist                              # ein Satelliten-Kauf, dessen Eintrag im Buch fehlt (Absturz nach dem Auftrag)
SAT.schreiben({**SAT.neues_buch(), "entschieden": T0, "ziele": {"DOGEUSDT": 0.1}, "bekannt": ["DOGEUSDT"]}, BUCH)
with Entscheidung({T0: {"DOGEUSDT": 0.1}}):
    rc, z, pu, _ = fahre(b, plus(T0, 1))
pruefe("verwaiste Position (im Buch nur bei «bekannt»): wird übernommen, bekommt ihren Stop, kein Doppelkauf", not b.auftraege("DOGEUSDT") and len(b.stops["DOGEUSDT"]) == 1 and "DOGEUSDT" in buch()["positionen"]
       and abs(buch()["positionen"]["DOGEUSDT"]["menge"] - verwaist) < 1e-9, (z, buch()))

frisch()
b = Boerse([s for s in alle_spots() if s != "DOGEUSDT"])      # DOGE hat im Testnetz keinen Vertrag
with Entscheidung({T0: {"SOLUSDT": 0.1, "DOGEUSDT": 0.1}}):
    rc, z, pu, _ = fahre(b, T0)
pruefe("Coin ohne Vertrag im Testnetz: übersprungen und gemeldet, die anderen laufen", b.auftraege("SOLUSDT", "BUY") and not b.auftraege("DOGEUSDT") and any("DOGE" in x and "keinen Vertrag" in x for x in z) and rc == 0, (rc, z))

frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: {"BTCUSDT": 0.1, "ETHUSDT": 0.1, "SOLUSDT": 0.1}}):                  # kann der Kern nie liefern; wäre es doch so: BTC/ETH gehören dem Piloten
    rc, z, pu, _ = fahre(b, T0)
pruefe("Bitcoin und Ether werden vom Satelliten nie gehandelt, selbst wenn sie im Ziel stünden", not b.auftraege("BTCUSDT") and not b.auftraege("ETHUSDT") and b.auftraege("SOLUSDT", "BUY"), b.log)

# ───────────────────────── Fehler und Netz ─────────────────────────
frisch()
b = Boerse(alle_spots())
b.auftrag_fehler["ADAUSDT"] = BF.BinanceFehler("/fapi/v1/order", 400, "/fapi/v1/order: Binance-Code -2019 Margin is insufficient", None, None)
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0)
    pruefe("ein Auftrag scheitert (Margin): die anderen Coins werden trotzdem gekauft, rc 3 (Warnung), Fehlergrund in der Meldung",
           rc == 3 and b.auftraege("SOLUSDT", "BUY") and b.auftraege("LINKUSDT", "BUY") and not b.auftraege("ADAUSDT") and any("ADA" in x and "✗" in x and "-2019" in x for x in z)
           and len(pu) == 1 and "⚠️" in pu[0], (rc, z))
    bu = buch()
    pruefe("gescheiterter Kauf: nicht im Buch, nicht bei «bekannt»; letzter Lauf mit Warnung vermerkt", "ADAUSDT" not in bu["positionen"] and "ADAUSDT" not in bu["bekannt"] and bu["letzter_lauf"]["ok"] is False, bu)
    del b.auftrag_fehler["ADAUSDT"]
    rc, z, pu, _ = fahre(b, plus(T0, 1))
    pruefe("am Haltetag wird der gescheiterte Einstieg wiederholt und klappt (rc 0)", rc == 0 and b.auftraege("ADAUSDT", "BUY") and "ADAUSDT" in buch()["positionen"], (rc, z))

frisch()
b = Boerse(alle_spots())
b.position_fehler_ab["SOLUSDT"] = 3                       # Antwort nach dem Auftrag verloren: die dritte Positionsabfrage (nach dem Kauf) scheitert
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0)
    bu = buch()
    pruefe("Position nach dem Auftrag unlesbar: Warnung, NICHT im Buch geraten, aber «bekannt» (der Not-Aus schliesst sie mit)", rc == 3 and "SOLUSDT" not in bu["positionen"] and "SOLUSDT" in bu["bekannt"]
           and "SOLUSDT" in SAT.offene_symbole(BUCH, ENV) and b.pos["SOLUSDT"] > 0, (rc, z, bu))
    b.position_fehler_ab.clear()
    n_sol = len(b.auftraege("SOLUSDT"))
    rc, z, pu, _ = fahre(b, plus(T0, 1))
    pruefe("am nächsten Lauf wird SOL übernommen, kein zweiter Kauf", len(b.auftraege("SOLUSDT")) == n_sol and "SOLUSDT" in buch()["positionen"] and rc == 0, (rc, z))

frisch()
b = Boerse(alle_spots())
n_netz = []
rc, z, pu, _ = fahre(b, T0, holen=lambda extra=(): n_netz.append(1) or (_ for _ in ()).throw(OSError("Netz weg")))
pruefe("Kurse nicht erreichbar (erster Lauf): Warnung, keine Aufträge, kein Eintrag erfunden", rc == 3 and not b.auftraege() and any("Kurse nicht erreichbar" in x for x in z) and buch()["positionen"] == {} and len(pu) == 1, (rc, z))

frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0}):
    fahre(b, T0)
    stop_alt = {f: b.stops[f][0]["stopPrice"] for f in ("SOLUSDT", "LINKUSDT")}
    b.fest["SOLUSDT"] = b.preise["SOLUSDT"] * 1.5
    n0 = len(b.auftraege())
    rc, z, pu, _ = fahre(b, plus(T0, 1), holen=lambda extra=(): (_ for _ in ()).throw(OSError("Netz weg")))
    pruefe("Kurse nicht erreichbar an einem Haltetag: keine Aufträge, Positionen bleiben, Stop wird mit dem gemerkten Abstand weiter nachgeführt, rc 3",
           rc == 3 and len(b.auftraege()) == n0 and len(buch()["positionen"]) == 3 and b.stops["SOLUSDT"][0]["stopPrice"] > stop_alt["SOLUSDT"] * 1.3, (rc, z, b.stops["SOLUSDT"]))

frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0, holen=lambda extra=(): (bis(ALLE, T0), [f"X{i}USDT" for i in range(40)]))
    pruefe("zu viele fehlende Kurse (Netz schwach): keine neue Entscheidung auf unvollständigen Daten", rc == 3 and not b.auftraege() and buch()["entschieden"] is None and any("keine neue Entscheidung" in x for x in z), (rc, z))
    rc, z, pu, _ = fahre(b, T0, heute=plus(T0, 6))
    pruefe("veraltete Bitcoin-Kurse (6 Tage alt): keine neue Entscheidung, Warnung", rc == 3 and not b.auftraege() and any("Tage alt" in x for x in z), (rc, z))
    rc, z, pu, _ = fahre(b, T0, holen=lambda extra=(): ({s: r for s, r in bis(ALLE, T0).items() if s != "BTCUSDT"}, []))
    pruefe("ohne Bitcoin-Kurse: keine Entscheidung, Warnung", rc == 3 and not b.auftraege() and any("Bitcoin" in x for x in z), (rc, z))

frisch()
b = Boerse(alle_spots())
b.vertraege_fehler = OSError("exchangeInfo weg")
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0)
    pruefe("Vertragsliste nicht lesbar: heute keine neuen Käufe, Warnung — aber die Entscheidung ist gemerkt", rc == 3 and not b.auftraege() and buch()["entschieden"] == T0 and any("Vertragsliste" in x for x in z), (rc, z))
    b.vertraege_fehler = None
    rc, z, pu, _ = fahre(b, plus(T0, 1))
    pruefe("am nächsten Lauf (Liste wieder da) werden die Einstiege nachgeholt", rc == 0 and len(b.auftraege(seite="BUY")) == 3, (rc, z))
    b.vertraege_fehler = OSError("wieder weg")
    n0 = len(b.auftraege())
    rc, z, pu, _ = fahre(b, plus(T0, 2))
    pruefe("Vertragsliste weg, Positionen offen: sie werden weiter gepflegt (Stop), nichts verkauft", len(b.auftraege()) == n0 and len(buch()["positionen"]) == 3 and all(len(b.stops[f]) == 1 for f in Z0), (rc, z))

# Absturz mitten im Lauf (Strom weg nach dem ersten Auftrag, vor dem Buch): das Symbol steht schon bei «bekannt», der nächste Lauf übernimmt es
frisch()
b = Boerse(alle_spots())
b.nach_auftrag = lambda: (_ for _ in ()).throw(SystemExit("Strom weg"))
try:
    with Entscheidung({T0: Z0}):
        fahre(b, T0)
    abgestuerzt = False
except SystemExit:
    abgestuerzt = True
bu = buch()
pruefe("Absturz nach dem ersten Auftrag (vor dem Buch): alle Kauf-Symbole stehen schon bei «bekannt», Not-Aus und der nächste Lauf finden sie",
       abgestuerzt and set(Z0) <= set(bu["bekannt"]) and bu["positionen"] == {} and sorted(SAT.offene_symbole(BUCH, ENV)) == sorted(Z0) and bu["entschieden"] == T0, bu)
b.nach_auftrag = None
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, plus(T0, 1))
pruefe("…der nächste Lauf übernimmt den schon gekauften Coin (kein Doppelkauf) und kauft die anderen",
       len(b.auftraege("ADAUSDT", "BUY")) == 1 and len(buch()["positionen"]) == 3 and rc == 0, (rc, z, b.auftraege()))

# Lauf-Sperre verloren (Ruhezustand, Stillstand): der Lauf bricht ab, kein Weitermachen mit veraltetem Plan
frisch()
b = Boerse(alle_spots())
b.auftrag_fehler["ADAUSDT"] = sperre.SperreVerloren("Die Sperre krypto-lauf.lock gehört inzwischen einem anderen Lauf")
try:
    with Entscheidung({T0: Z0}):
        fahre(b, T0)
    weitergelaufen = True
except sperre.SperreVerloren:
    weitergelaufen = False
pruefe("Lauf-Sperre verloren: der Lauf bricht ab, die weiteren Coins werden NICHT mehr gekauft", not weitergelaufen and not b.auftraege("LINKUSDT") and not b.auftraege("SOLUSDT"), b.log)

# Stop ausgelöst und SOFORT der Entscheidungstag (kein Haltetag dazwischen): frischer Einstieg statt des alten Eintrags
frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0, T1: Z0}):
    fahre(b, T0)
    b.stop_ausloesen("SOLUSDT")
    n_sol = len(b.auftraege("SOLUSDT", "BUY"))
    rc, z, pu, _ = fahre(b, T1)
    pos_neu = buch()["positionen"].get("SOLUSDT") or {}
    pruefe("Stop ausgelöst, direkt danach der Entscheidungstag: frischer Einstieg (neuer Kauf, «seit» = neuer Tag), nicht der alte Eintrag",
           len(b.auftraege("SOLUSDT", "BUY")) == n_sol + 1 and pos_neu.get("seit") == T1 and b.pos["SOLUSDT"] > 0, (pos_neu, b.auftraege("SOLUSDT")))

# Selbsttest-Sperre und Buch-Schreibfehler: «nichts Neues kaufen», Schliessen geht weiter
frisch()
b = Boerse(alle_spots())
aufrufe = []
with Entscheidung({T0: Z0, T1: Z1}):
    rc, z, pu, _ = fahre(b, T0, gate=lambda: aufrufe.append(1) or (False, "test_satellit.py: 1 fehlgeschlagen"))
    pruefe("Selbsttest durchgefallen: keine neuen Käufe, Warnung mit Grund, rc 3, Entscheidung trotzdem gemerkt", rc == 3 and not b.auftraege() and aufrufe == [1] and any("Selbsttest durchgefallen" in x and "1 fehlgeschlagen" in x for x in z), (rc, z))
    rc, z, pu, _ = fahre(b, plus(T0, 1), gate=lambda: (True, "ok"))
    pruefe("Selbsttest wieder in Ordnung: die Einstiege werden am nächsten Lauf nachgeholt", rc == 0 and len(b.auftraege(seite="BUY")) == 3, (rc, z))
    aufrufe.clear()
    rc, z, pu, _ = fahre(b, plus(T0, 2), gate=lambda: aufrufe.append(1) or (True, "ok"))
    pruefe("Haltetag ohne etwas aufzubauen: der Selbsttest läuft nicht (Zeit sparen)", aufrufe == [], aufrufe)
    n_ada = len(b.auftraege("ADAUSDT"))
    rc, z, pu, _ = fahre(b, T1, gate=lambda: (False, "kaputt"))
    pruefe("Selbsttest durchgefallen am Entscheidungstag: ADA wird trotzdem geschlossen, DOGE NICHT gekauft",
           len(b.auftraege("ADAUSDT")) == n_ada + 1 and b.pos["ADAUSDT"] == 0 and not b.auftraege("DOGEUSDT") and rc == 3, (rc, z))

frisch()
b = Boerse(alle_spots())
alt_schreiben, zaehler = SAT.schreiben, {"n": 0}


def schreiben_kaputt(buch_, datei=None):
    zaehler["n"] += 1
    if zaehler["n"] == 1:
        raise OSError("Platte voll")
    return alt_schreiben(buch_, datei)


SAT.schreiben = schreiben_kaputt
try:
    with Entscheidung({T0: Z0}):
        rc, z, pu, _ = fahre(b, T0)
finally:
    SAT.schreiben = alt_schreiben
pruefe("Buch nicht schreibbar (vor den Käufen): keine neuen Käufe, Warnung", rc == 3 and not b.auftraege() and any("nicht schreibbar" in x for x in z), (rc, z))

# ───────────────────────── Ausschalter, Not-Aus, Pause ─────────────────────────
def mit_positionen():
    frisch()
    b_ = Boerse(alle_spots())
    with Entscheidung({T0: Z0}):
        fahre(b_, T0)
    return b_


def kein_netz(extra=()):
    raise AssertionError("Kurse dürfen hier nicht geholt werden")


for name, kw in (("KRYPTO_SATELLIT=aus", {"env": dict(ENV, KRYPTO_SATELLIT="aus")}), ("Datei krypto-satellit-aus.txt", {}), ("KRYPTO_SATELLIT_ANTEIL=0", {"env": dict(ENV, KRYPTO_SATELLIT_ANTEIL="0")})):
    b = mit_positionen()
    if not kw:
        AUS.write_text("aus")
    rc, z, pu, _ = fahre(b, plus(T0, 1), holen=kein_netz, **kw)
    AUS.unlink(missing_ok=True)
    pruefe(f"Ausschalter ({name}): alle Positionen werden geschlossen (nur verkleinern), Stops weg, keine Kurse geholt, Buch leer",
           rc == 0 and all(b.pos[f] == 0 and b.stops[f] == [] for f in Z0) and len(b.auftraege(nur_aufbau=True)) == 3 and sum(1 for x in b.log[-3:] if x[4]) == 3
           and buch()["positionen"] == {} and buch()["bekannt"] == [], (rc, z, b.pos))
    n0 = len(b.auftraege())
    if not kw:
        AUS.write_text("aus")
    rc, z, pu, _ = fahre(b, plus(T0, 2), holen=kein_netz, **kw)
    AUS.unlink(missing_ok=True)
    pruefe(f"Ausschalter ({name}): am Folgetag nichts mehr zu tun, keine neuen Aufträge, kein Handy-Bericht", len(b.auftraege()) == n0 and not pu and rc == 0, (rc, z))
    b = mit_positionen()
    rc, z, pu, _ = fahre(b, plus(T0, 3))                  # wieder angeschaltet: der Satellit steigt (Ziele noch im Buch) wieder ein
    pruefe(f"wieder angeschaltet ({name}): die Einstiege laufen weiter wie vorher", rc == 0 and len(buch()["positionen"]) == 3, (rc, z))

b = mit_positionen()
rc, z, pu, _ = fahre(b, plus(T0, 1), env=dict(ENV, KI_BOT_STOP="1"), holen=kein_netz)
pruefe("Not-Aus (KI_BOT_STOP=1): alles zu, keine Kurse geholt, meldet «Not-Aus aktiv»", rc == 0 and all(b.pos[f] == 0 and b.stops[f] == [] for f in Z0) and any("Not-Aus aktiv" in x for x in z) and buch()["positionen"] == {}, (rc, z))
b = mit_positionen()
STOP_D.write_text("stop")
PAUSE_D.write_text("pause")
rc, z, pu, _ = fahre(b, plus(T0, 1), holen=kein_netz)
STOP_D.unlink()
PAUSE_D.unlink()
pruefe("Not-Aus (Datei STOP) hat Vorrang vor der Pause: der Satellit schliesst trotzdem alles", rc == 0 and all(b.pos[f] == 0 for f in Z0) and len(buch()["positionen"]) == 0, (rc, z))
b = mit_positionen()
SAT.schreiben({**buch(), "bekannt": ["SOLUSDT", "ADAUSDT", "LINKUSDT", "DOGEUSDT"]}, BUCH)
b.pos["DOGEUSDT"] = 3.0                                    # ein Auftrag, dessen Eintrag im Buch fehlt
rc, z, pu, _ = fahre(b, plus(T0, 1), env=dict(ENV, KI_BOT_STOP="1"), holen=kein_netz)
pruefe("Not-Aus schliesst auch Symbole, die nur bei «bekannt» stehen (Eintrag im Buch fehlt)", b.pos["DOGEUSDT"] == 0 and all(b.pos[f] == 0 for f in Z0), (b.pos, z))
b = mit_positionen()
PAUSE_D.write_text("pause")
n0 = len(b.log)
rc, z, pu, _ = fahre(b, plus(T0, 1), env=dict(ENV, KRYPTO_SATELLIT="aus"), holen=kein_netz)
PAUSE_D.unlink()
pruefe("Pause + ausgeschaltet: der Satellit tut nichts (die Positionen bleiben mit ihrem Börsen-Stop)", len(b.log) == n0 and all(b.pos[f] > 0 and len(b.stops[f]) == 1 for f in Z0), (rc, z))

# Probelauf: nichts senden, nichts merken
b = mit_positionen()
buch_vorher = BUCH.read_bytes()
b.fest["SOLUSDT"] = b.preise["SOLUSDT"] * 1.3
n0 = len(b.log)
rc, z, pu, prot = fahre(b, plus(T0, 1), trocken=True)
pruefe("Probelauf (trocken): keine Aufträge, Stops unverändert, Buch unverändert, kein Handy-Bericht", len(b.log) == n0 and BUCH.read_bytes() == buch_vorher and not pu and all(len(b.stops[f]) == 1 for f in Z0), (rc, z))
frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0}):
    rc, z, pu, _ = fahre(b, T0, trocken=True)
pruefe("Probelauf am Entscheidungstag: nichts gekauft, kein Buch angelegt", not b.auftraege() and not BUCH.exists() and not pu, (rc, z))

# ───────────────────────── Das Buch ─────────────────────────
frisch()
pruefe("kein Buch: leeres Buch ohne Hinweis", SAT.lesen(BUCH) == (SAT.neues_buch(), ""))
b = Boerse(alle_spots())
with Entscheidung({T0: Z0}):
    fahre(b, T0)
    fahre(b, plus(T0, 1))                                  # zweites Schreiben: jetzt gibt es eine Sicherungskopie
bak = BUCH.with_name(BUCH.name + ".bak")
pruefe("Buch: bei jedem Schreiben entsteht eine Sicherungskopie des vorigen heilen Buches", bak.exists() and SAT.lesen(bak)[1] == "")
BUCH.write_text('{"ziele": {"SOLUSDT": ')                  # Strom weg beim Schreiben
bu, hinweis = SAT.lesen(BUCH)
pruefe("kaputtes Buch: die Sicherungskopie wird gelesen, mit Hinweis", sorted(bu["positionen"]) == ["ADAUSDT", "LINKUSDT", "SOLUSDT"] and "Sicherungskopie" in hinweis, (bu, hinweis))
SAT.schreiben(bu, BUCH)
pruefe("…und ein kaputtes Buch überschreibt NIE die gute Kopie (beim Schreiben wird nur ein heiles Buch zur Kopie)", SAT.lesen(bak)[1] == "" and SAT.lesen(BUCH)[1] == "")
BUCH.write_text("kaputt")
bak.write_text("auch kaputt")
roh_vorher = (BUCH.read_bytes(), bak.read_bytes())
b2 = Boerse(alle_spots())
rc, z, pu, _ = fahre(b2, plus(T0, 2))
pruefe("beide Dateien kaputt: der Satellit handelt NICHT (er kennt seine Positionen nicht), rc 3, Handy-Warnung, die Dateien bleiben unberührt",
       rc == 3 and not b2.log and len(pu) == 1 and "unlesbar" in pu[0] and (BUCH.read_bytes(), bak.read_bytes()) == roh_vorher, (rc, z, pu))
try:
    SAT.offene_symbole(BUCH, ENV)
    nicht_lesbar = False
except ValueError:
    nicht_lesbar = True
pruefe("offene_symbole bei unlesbarem Buch: Fehler (der Not-Aus meldet «bitte im Konto prüfen» statt «alles zu»)", nicht_lesbar)
for kaputt_buch in ({"positionen": []}, {"positionen": {"SOLUSDT": {"menge": "viel"}}}, {"ziele": {"SOLUSDT": 5}}, {"entschieden": "gestern"}, {"bekannt": "SOL"}, [1, 2], {"ausgestoppt": []}):
    BUCH.write_text(json.dumps(kaputt_buch))
    bak.unlink(missing_ok=True)
    pruefe(f"Buch mit falscher Gestalt wird abgelehnt: {str(kaputt_buch)[:50]}", SAT.lesen(BUCH)[1].startswith(SAT.UNLESBAR))
frisch()
pruefe("offene_symbole ohne Buch: leere Liste, kein Fehler", SAT.offene_symbole(BUCH, ENV) == [])
SAT.schreiben({**SAT.neues_buch(), "positionen": {"SOLUSDT": {"spot": "SOLUSDT", "menge": 1.0}, "BTCUSDT": {"spot": "BTCUSDT", "menge": 0.1}}, "bekannt": ["ADAUSDT", "SOLUSDT"]}, BUCH)
pruefe("offene_symbole: Positionen plus «bekannt», sortiert, nie Bitcoin/Ether", SAT.offene_symbole(BUCH, ENV) == ["ADAUSDT", "SOLUSDT"], SAT.offene_symbole(BUCH, ENV))
pruefe("offene_symbole mit echtem Geld: nichts (das Buch stammt aus dem Testnetz)", SAT.offene_symbole(BUCH, dict(ENV, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ)) == [])

# ───────────────────────── Anzeige: Status und Ampel ─────────────────────────
frisch()
b = Boerse(alle_spots())
with Entscheidung({T0: Z0}):
    fahre(b, T0)
st = SAT.status_text(BUCH, heute=plus(T0, 2), env={})
pruefe("status_text: Schalter, Ziele, Positionen mit Stop, nächster Entscheidungstag mit Wochentag", "an, Anteil 20 %" in st and "SOL" in st and "ADA" in st and "Stop" in st and f"Do {T1}" in st and "Letzter Lauf" in st, st)
pruefe("status_text: ausgeschaltet", "AUS (KRYPTO_SATELLIT=aus)" in SAT.status_text(BUCH, heute=T0, env={"KRYPTO_SATELLIT": "aus"}))
jetzt = datetime.now(timezone.utc)
a = SAT.ampel(dict(ENV), BUCH, jetzt)
pruefe("ampel: frischer Lauf ohne Warnung = grün mit Positionen und Zielen", a[0] is True and a[2] is False and "3 Position(en)" in a[1] and "SOL" in a[1], a)
a = SAT.ampel(dict(ENV), BUCH, jetzt + timedelta(days=4))
pruefe("ampel: seit 4 Tagen kein Lauf = grau mit Warnung", a[0] is None and a[2] is True and "4 Tagen" in a[1], a)
a = SAT.ampel(dict(ENV, KRYPTO_SATELLIT="aus"), BUCH, jetzt)
pruefe("ampel: ausgeschaltet = grau, nennt offene Positionen («der nächste Lauf schliesst sie»)", a[0] is None and a[2] is False and "aus (KRYPTO_SATELLIT=aus)" in a[1] and "schliesst" in a[1], a)
a = SAT.ampel(dict(ENV, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ), BUCH, jetzt)
pruefe("ampel: mit echtem Geld = grau «nur Testnetz»", a[0] is None and "nur Testnetz" in a[1], a)
bu = buch()
bu["letzter_lauf"]["ok"], bu["letzter_lauf"]["hinweise"] = False, ["⚠️ Satellit ADA: aufbauen: BUY 0.1 ✗ HTTP 400: -2019"]
SAT.schreiben(bu, BUCH)
a = SAT.ampel(dict(ENV), BUCH, jetzt)
pruefe("ampel: letzter Lauf mit Warnung = grau mit Warnung und dem Grund", a[0] is None and a[2] is True and "-2019" in a[1], a)
frisch()
a = SAT.ampel(dict(ENV), BUCH, jetzt)
pruefe("ampel: noch nie gelaufen = grau ohne Alarm", a[0] is None and a[2] is False and "noch nicht gelaufen" in a[1], a)
BUCH.write_text("kaputt")
a = SAT.ampel(dict(ENV), BUCH, jetzt)
pruefe("ampel: unlesbares Buch = rot", a[0] is False, a)
frisch()

# ───────────────────────── Aufruf: main, Kurse vorab, Selbsttest ─────────────────────────
class SperreAttrappe:
    """Ersetzt das Modul sperre in satellit.py: lauf_sperre wirft «besetzt»."""
    ALT_NACH_TOT = sperre.ALT_NACH_TOT
    Besetzt = sperre.Besetzt
    SperreVerloren = sperre.SperreVerloren

    @staticmethod
    @contextlib.contextmanager
    def lauf_sperre(**kw):
        raise sperre.Besetzt("Ein anderer Lauf handelt gerade (seit 3 s).")
        yield


alt_lauf, alt_vorab, alt_push = SAT.lauf, SAT.kurse_vorab, SAT._push
gesehen = {}
gesendet = []
SAT._push = gesendet.append
SAT.kurse_vorab = lambda *a, **k: "HOLEN-ATTRAPPE"


def lauf_spion(**kw):
    gesehen.update(kw)
    gesehen["sperre_da"] = (sperre.ORDNER / "krypto-lauf.lock").exists()
    return 0, ["Satellit: Spion"]


SAT.lauf = lauf_spion
try:
    with contextlib.redirect_stdout(io.StringIO()):
        rc = SAT.main(["--lauf"])
    pruefe("main --lauf: ruft lauf() mit den vorab geholten Kursen und dem Selbsttest auf, hält dabei die Lauf-Sperre und gibt sie wieder frei",
           rc == 0 and gesehen["holen"] == "HOLEN-ATTRAPPE" and gesehen["gate"] is SAT.selbsttest and gesehen["trocken"] is False and gesehen["sperre_da"] is True
           and not (sperre.ORDNER / "krypto-lauf.lock").exists(), (rc, gesehen))
    gesehen.clear()
    with contextlib.redirect_stdout(io.StringIO()):
        rc = SAT.main(["--lauf", "--trocken"])
    pruefe("main --lauf --trocken: ohne Selbsttest (er sendet ohnehin nichts)", rc == 0 and gesehen["gate"] is None and gesehen["trocken"] is True, gesehen)
    with contextlib.redirect_stdout(io.StringIO()) as ausgabe:
        rc = SAT.main(["--status"])
    pruefe("main --status: nur Anzeige, lauf() wird nicht gerufen", rc == 0 and "Satellit (Testnetz-Zusatz" in ausgabe.getvalue(), ausgabe.getvalue()[:80])
    SAT.sperre = SperreAttrappe
    gesendet.clear()
    with contextlib.redirect_stdout(io.StringIO()) as ausgabe:
        rc = SAT.main(["--lauf"])
    pruefe("main: Lauf-Sperre belegt → rc 3, Meldung «handelt heute nicht», Handy-Warnung (nie still)", rc == 3 and "handelt heute nicht" in ausgabe.getvalue() and len(gesendet) == 1 and "NICHT gehandelt" in gesendet[0], (rc, gesendet))
    gesendet.clear()
    with contextlib.redirect_stdout(io.StringIO()):
        rc = SAT.main(["--lauf", "--trocken"])
    pruefe("main --trocken bei belegter Sperre: einfach abgewiesen (rc 0, kein Handy-Bericht)", rc == 0 and not gesendet, (rc, gesendet))
finally:
    SAT.lauf, SAT.kurse_vorab, SAT._push, SAT.sperre = alt_lauf, alt_vorab, alt_push, sperre

alt_standard, aufrufe_k = SAT.holen_standard, []
SAT.holen_standard = lambda extra=(): aufrufe_k.append(list(extra)) or ({"BTCUSDT": [("2026-11-02", 1.0, 1.0)]}, [])
try:
    frisch()
    pruefe("kurse_vorab: bleibt holen_standard (nichts vorab), wenn der Lauf keine Kurse braucht — ausgeschaltet, Not-Aus, Echtgeld, ohne Schlüssel, Pause",
           SAT.kurse_vorab(dict(ENV, KRYPTO_SATELLIT="aus"), BUCH, AUS, PAUSE_D) is SAT.holen_standard and SAT.kurse_vorab(dict(ENV, KI_BOT_STOP="1"), BUCH, AUS, PAUSE_D) is SAT.holen_standard
           and SAT.kurse_vorab(dict(ENV, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ), BUCH, AUS, PAUSE_D) is SAT.holen_standard
           and SAT.kurse_vorab({}, BUCH, AUS, PAUSE_D) is SAT.holen_standard and aufrufe_k == [])
    PAUSE_D.write_text("p")
    pruefe("kurse_vorab: bei Pause nichts holen", SAT.kurse_vorab(dict(ENV), BUCH, AUS, PAUSE_D) is SAT.holen_standard and aufrufe_k == [])
    PAUSE_D.unlink()
    SAT.schreiben({**SAT.neues_buch(), "positionen": {"SOLUSDT": {"spot": "SOLUSDT", "menge": 1.0}}}, BUCH)
    h = SAT.kurse_vorab(dict(ENV), BUCH, AUS, PAUSE_D)
    pruefe("kurse_vorab: sonst EINMAL holen (auch die Coins der Positionen) und das Ergebnis weitergeben", aufrufe_k == [["SOLUSDT"]] and h(extra=["egal"]) == ({"BTCUSDT": [("2026-11-02", 1.0, 1.0)]}, []) and len(aufrufe_k) == 1, aufrufe_k)
    SAT.holen_standard = lambda extra=(): (_ for _ in ()).throw(OSError("Netz weg"))
    h = SAT.kurse_vorab(dict(ENV), BUCH, AUS, PAUSE_D)
    try:
        h()
        weitergegeben = False
    except OSError:
        weitergegeben = True
    pruefe("kurse_vorab: ein Netzfehler beim Holen wird an lauf() weitergegeben (dort: Warnung statt Absturz)", weitergegeben)
finally:
    SAT.holen_standard = alt_standard
    frisch()

# Selbsttest: eigene Prozesse mit Wegwerf-Tests
alt_hier, alt_root = SAT.HIER, SAT.ROOT
with tempfile.TemporaryDirectory() as td:
    SAT.HIER, SAT.ROOT = Path(td), Path(td)
    (Path(td) / "gut.py").write_text("import sys\nsys.exit(0)\n")
    (Path(td) / "schlecht.py").write_text("print('3 bestanden, 2 fehlgeschlagen')\nimport sys\nsys.exit(1)\n")
    (Path(td) / "haengt.py").write_text("import time\ntime.sleep(30)\n")
    try:
        pruefe("selbsttest: alle bestehen → (True, ok)", SAT.selbsttest(10, ("gut.py", "gut.py")) == (True, "ok"))
        ok_s, text_s = SAT.selbsttest(10, ("gut.py", "schlecht.py"))
        pruefe("selbsttest: ein Test fällt durch → (False, Name und letzte Zeile)", ok_s is False and "schlecht.py" in text_s and "2 fehlgeschlagen" in text_s, text_s)
        ok_s, text_s = SAT.selbsttest(1, ("haengt.py",))
        pruefe("selbsttest: hängt ein Test → nach der Frist (False, «länger als»)", ok_s is False and "länger als 1 Sekunden" in text_s, text_s)
        ok_s, text_s = SAT.selbsttest(10, ("gibt-es-nicht.py",))
        pruefe("selbsttest: fehlende Testdatei → (False, «fehlt»)", ok_s is False and "fehlt" in text_s, text_s)
    finally:
        SAT.HIER, SAT.ROOT = alt_hier, alt_root
pruefe("selbsttest: die echten Testdateien des Satelliten sind da", all((HIER / n).is_file() for n in SAT.TESTS), SAT.TESTS)

# ───────────────────────── Einbau: Not-Aus des Piloten, Cockpit, Batch-Datei, CI ─────────────────────────
import pilot as PI  # noqa: E402
import pilot2_live as P2L  # noqa: E402

frisch()
SAT.schreiben({**SAT.neues_buch(), "positionen": {"SOLUSDT": {"spot": "SOLUSDT", "menge": 1.0}}, "bekannt": ["SOLUSDT", "DOGEUSDT"]}, BUCH)
aufrufe_na = []


def _zu(e_, symbol, gewicht):
    aufrufe_na.append(symbol)
    e_["broker"] = {"position": 0.0, "hinweis": "", "modus": "testnetz"}
    return [{"seite": "SELL", "menge": 0.1, "id": 5}]


p2_alt = P2L.BESTAND
P2L.BESTAND = T / "gibt-es-nicht.json"
try:
    zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-11-03", env=dict(ENV))
    pruefe("Not-Aus des Piloten schliesst auch die Satelliten-Symbole (Positionen und «bekannt»), nach BTC und ETH, mit eigener Zeile",
           zu and "BTCUSDT" in aufrufe_na and "ETHUSDT" in aufrufe_na and "DOGEUSDT" in aufrufe_na and "SOLUSDT" in aufrufe_na
           and aufrufe_na.index("SOLUSDT") > aufrufe_na.index("ETHUSDT") and any(x.startswith("✅ Satellit SOLUSDT") for x in zeilen_na), (aufrufe_na, zeilen_na))
    aufrufe_na.clear()
    zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-11-03", env=dict(ENV, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ))
    pruefe("Not-Aus mit echtem Geld: die Satelliten-Symbole (Testnetz-Buch) werden NICHT angefasst", "SOLUSDT" not in aufrufe_na and "DOGEUSDT" not in aufrufe_na, aufrufe_na)
    aufrufe_na.clear()
    BUCH.write_text("kaputt")
    BUCH.with_name(BUCH.name + ".bak").unlink(missing_ok=True)
    zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-11-03", env=dict(ENV))
    pruefe("Not-Aus bei unlesbarem Satelliten-Buch: nie «alles zu», sondern Warnung «bitte im Binance-Konto prüfen», BTC/ETH werden trotzdem geschlossen",
           not zu and any("Satelliten-Buch nicht lesbar" in x for x in zeilen_na) and "BTCUSDT" in aufrufe_na and "ETHUSDT" in aufrufe_na, (zu, zeilen_na))
finally:
    P2L.BESTAND = p2_alt
    frisch()

import cockpit as C  # noqa: E402

SAT.schreiben({**SAT.neues_buch(), "positionen": {"SOLUSDT": {"spot": "SOLUSDT", "menge": 1.0}}, "letzter_lauf": {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": True, "auftraege": 1, "hinweise": []}}, BUCH)
g_mit = {x["name"]: x for x in C.gesundheit(dict(ENV), {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
g_ohne = {x["name"]: x for x in C.gesundheit({}, {"entscheide": []}, {}, datetime.now(timezone.utc).date())}
pruefe("Cockpit: mit Futures-Schlüsseln zeigt die Gesundheit «Satellit (Testnetz-Zusatz)»; ohne Schlüssel nicht (kein Lärm)",
       "Satellit (Testnetz-Zusatz)" in g_mit and g_mit["Satellit (Testnetz-Zusatz)"]["ok"] is True and "Satellit (Testnetz-Zusatz)" not in g_ohne, g_mit.get("Satellit (Testnetz-Zusatz)"))
frisch()

bat = (HIER / "krypto-auto.bat").read_bytes()
txt = bat.decode("utf-8")
pruefe("krypto-auto.bat: Windows-Zeilenenden bleiben (sonst springt «goto» falsch)", bat.count(b"\n") == bat.count(b"\r\n") > 10)
i_p, i_s, i_e = txt.index("if defined PILOTLAUF ("), txt.index("call :schritt Satellit satellit.py --lauf"), txt.index(") else (", txt.index("if defined PILOTLAUF ("))
pruefe("krypto-auto.bat: der Satellit läuft im Pilot-Block, einmal, nach dem Piloten und seiner Nachkontrolle", txt.count("call :schritt Satellit satellit.py --lauf") == 1 and i_p < i_s < i_e
       and txt.index("call :schritt Krypto-Pilot pilot.py --lauf") < i_s and txt.index("Pilot-2.0-Nachkontrolle pilot.py --nachkontrolle", i_p) < i_s, txt[i_p:i_e])
na_block = txt[txt.index("if defined NOTAUS ("):txt.index("if exist \"tools\\trading\\ki_bot\\PAUSE\"")]
pruefe("krypto-auto.bat: der Not-Aus-Zweig ruft den Satelliten NICHT einzeln (pilot.py --lauf schliesst ihn über schliessen_alle)", "satellit.py" not in na_block and "Pilot-Not-Aus pilot.py --lauf" in na_block)
gate_zeile = next(z for z in txt.splitlines() if z.startswith("for %%T in (test_pilot"))
pruefe("krypto-auto.bat: der Selbsttest vor dem Handeln hängt NICHT an den Satelliten-Tests (der Pilot darf nie an ihnen scheitern)", "satellit" not in gate_zeile, gate_zeile)
ci_datei = HIER.parents[2] / ".github" / "workflows" / "krypto-paket.yml"
if ci_datei.is_file():                                     # nur im Repository: auf dem PC liegt nur tools/trading
    pruefe("CI (krypto-paket.yml): beide Satelliten-Tests laufen im Paketbau", "test_satellit test_satellit_lauf" in ci_datei.read_text(encoding="utf-8"))
pruefe("keine Geheimnisse in der Datei satellit.py (kein Schlüssel-Muster)", "shpat_" not in (HIER / "satellit.py").read_text(encoding="utf-8") and "-----BEGIN" not in (HIER / "satellit.py").read_text(encoding="utf-8"))

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
